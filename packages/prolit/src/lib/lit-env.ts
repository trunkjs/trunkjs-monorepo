import { html, type TemplateResult } from 'lit-html';
import { repeat, RepeatDirectiveFn } from 'lit-html/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { when } from 'lit/directives/when.js';
import { diagnose, getRuntime } from './scope-runtime';

export type LitEnv = {
  html: any;
  repeat: RepeatDirectiveFn;
  when: any;
  styleMap: any;
  classMap: any;
  catchError: typeof catchError;
  handleEvent: (fn: () => unknown, expression: string) => void;
  evaluate: typeof eval;
  originalCode?: string;
  originalTemplateString?: string;
};
export type ProlitGeneratedRendererFn = (scope: any, $$__litEnv: LitEnv) => TemplateResult;

export class ProlitExpressionError extends Error {
  constructor(
    cause: unknown,
    public readonly expression: string,
    message: string,
  ) {
    super(message, { cause });
  }
}

function extractErrorLineFromStack(stack: string): { line: number; column: number } {
  const m = stack.split('\n')[0]?.match(/:(\d+):(\d+)$/);
  return { line: m ? +m[1] : -1, column: m ? +m[2] : -1 };
}

const catchError = ($$__litEnv: LitEnv, fn: any, throwError = false, originalStmt = '<undefined>') => {
  try {
    return fn();
  } catch (e: any) {
    if (throwError && e instanceof ProlitExpressionError) throw e;
    let { line, column } = extractErrorLineFromStack(e?.stack ?? '');
    let originalCode = String($$__litEnv?.originalCode ?? '');

    let isHtml = false;
    if ($$__litEnv?.originalTemplateString) {
      line -= 2; // Adjust line number for template strings (remove function and first line
      originalCode = $$__litEnv.originalTemplateString;
      isHtml = true;
    }

    const lines = originalCode.split('\n');

    const idx = Math.min(Math.max(line - 1, 0), lines.length - 1);
    const errLine = lines[idx] ?? '';

    const caretPos = Math.min(Math.max((column || 1) - 1, 0), errLine.length);
    let caret = ' '.repeat(caretPos + String(line).length) + '^^^^';
    if (isHtml) {
      caret = '^'.repeat(String(errLine).length);
    }
    // Inject caret line into numbered code
    const numberedWithCaret = lines
      .map((l, i) => {
        if (i === idx) {
          return `${i + 1}: ${l}\n ${caret}`;
        }
        return `${i + 1}: ${l}`;
      })
      .join('\n');

    const msg =
      `Error while rendering \`${originalStmt}\`: ${e}\n` +
      `Line ${line}, Column ${caretPos + 1}:\n\n` +
      `${line}:${errLine}\n${caret}\n\n` +
      `Compiled Template:\n${numberedWithCaret}` +
      '\n';

    if (!throwError) {
      console.warn('Caught error via *catch: ' + msg);
    } else {
      throw new ProlitExpressionError(e, originalStmt, msg);
    }
    return String(e);
  }
};

/**
 * Return the LitEnv to add as paramter 2 to the generated Function
 *
 */
export function litEnv(fn: ProlitGeneratedRendererFn, origTemplateString: string, scope?: object): LitEnv {
  return {
    html,
    repeat,
    when,
    styleMap,
    classMap,
    catchError,
    evaluate: eval,
    handleEvent(fn, expression) {
      const report = (cause: unknown) => diagnose(getRuntime(scope), cause, 'event', expression);
      try {
        void Promise.resolve(fn()).catch(report);
      } catch (cause) {
        report(cause);
      }
    },
    originalCode: fn.toString(),
    originalTemplateString: origTemplateString,
  };
}
