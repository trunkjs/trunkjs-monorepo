import { ProlitDialogElement } from './ProlitDialogElement';
import type { DialogOpenOptions } from './dialog-renderer';

/** Structural contract: no runtime dependency on @trunkjs/router. */
export interface DialogRouteContext {
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  close(): Promise<boolean>;
  error(error: unknown): void;
}

/** Register with router.setRenderer('dialog', createDialogRouteRenderer()). */
export function createDialogRouteRenderer(
  options: DialogOpenOptions = {},
  input = (context: DialogRouteContext): unknown => context.params,
  inputKey = (value: unknown): string => JSON.stringify(value),
) {
  return (Component: CustomElementConstructor, context: DialogRouteContext) => {
    const instance = new Component();
    if (!(instance instanceof ProlitDialogElement)) throw new Error('Dialog routes require ProlitDialogElement.');
    // Route metadata erases component generics; map/validate route input at this boundary.
    const element = instance as unknown as ProlitDialogElement<unknown, unknown>;
    let active = true;
    let current = context;
    let previousKey = inputKey(input(context));
    element.setBeforeClose(() => active ? current.close() : true);
    void element.open(input(context), options).catch((error: unknown) => {
      if (active) current.error(error);
    });
    return {
      update(next: DialogRouteContext): void {
        current = next;
        const nextInput = input(next);
        const nextKey = inputKey(nextInput);
        if (nextKey !== previousKey) {
          element.setInput(nextInput);
          previousKey = nextKey;
        }
      },
      dispose(): void {
        active = false;
        element.disposePresentation();
      },
    };
  };
}
