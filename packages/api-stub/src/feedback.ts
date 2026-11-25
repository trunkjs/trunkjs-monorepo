import type {
  ApiConfig, ApiErrorEvent, ApiMiddlewareContext, FeedbackDetails, FeedbackEvent,
  FeedbackEndEvent, FeedbackOption, RequestInput,
} from './types';

let sequence = 0;
export const sharedFailure = Symbol('shared request failure');
const reported = new WeakMap<object, Set<NonNullable<ApiConfig['onError']>>>();

export function mergeFeedback(base?: FeedbackOption, additional?: FeedbackOption): FeedbackOption | undefined {
  if (additional === undefined) return base;
  if (additional === false) return false;
  const details = (value: FeedbackOption | undefined): FeedbackDetails =>
    typeof value === 'string' ? { key: value } : value || {};
  return { ...details(base), ...details(additional) };
}

function notify<T>(callback: ((event: T) => void | Promise<void>) | undefined, event: T): void {
  if (!callback) return;
  // Presentation must not delay a request or replace its result/error.
  try {
    void Promise.resolve(callback(event)).catch(error => console.error('[TrunkJS API] Feedback callback failed', error));
  } catch (error) {
    console.error('[TrunkJS API] Feedback callback failed', error);
  }
}

function report(config: ApiConfig, input: RequestInput, event: ApiErrorEvent): void {
  const handler = config.onError;
  if (!handler || (input.reportError ?? config.reportError) === false) return;
  const failure = event.context.getMetadata<{ error: unknown }>(sharedFailure);
  if (failure && Object.is(failure.error, event.error)) {
    const handlers = reported.get(failure) ?? new Set();
    if (handlers.has(handler)) return;
    handlers.add(handler);
    reported.set(failure, handlers);
  }
  notify(handler, event);
}

export async function withFeedback<T>(
  config: ApiConfig, input: RequestInput, context: ApiMiddlewareContext, execute: () => Promise<T>,
): Promise<T> {
  const option = mergeFeedback(config.feedback, input.feedback);
  const feedback = typeof option === 'string' ? { key: option } : option ?? {};
  const event: FeedbackEvent = {
    id: 'request-' + ++sequence,
    key: feedback === false ? undefined : feedback.key,
    name: feedback === false ? undefined : feedback.name,
    feedback,
    context,
  };
  const visible = feedback !== false;
  if (visible) notify(config.onFeedbackStart, event);
  let end: FeedbackEndEvent;
  try {
    const data = await execute();
    end = { ...event, status: 'success', data, response: context.response };
    return data;
  } catch (error) {
    context.error = error;
    const signal = context.init.signal;
    const aborted = (signal?.aborted && Object.is(signal.reason, error))
      || (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError');
    end = { ...event, status: aborted ? 'aborted' : 'error', error, response: context.response };
    throw error;
  } finally {
    if (visible) notify(config.onFeedbackEnd, end!);
    if (end!.status === 'error') report(config, input, { ...end!, status: 'error' });
  }
}
