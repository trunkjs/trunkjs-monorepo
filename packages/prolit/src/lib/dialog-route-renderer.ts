import { ProlitDialogElement } from './ProlitDialogElement';
import type { DialogOpenOptions } from './dialog-renderer';

/** Structural contract: no runtime dependency on @trunkjs/router. */
export interface DialogRouteContext {
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  close(): void;
  error(error: unknown): void;
}

/** Register with router.setRenderer('dialog', createDialogRouteRenderer()). */
export function createDialogRouteRenderer(options: DialogOpenOptions = {}, input = (context: DialogRouteContext): unknown => context.params) {
  return (Component: CustomElementConstructor, context: DialogRouteContext) => {
    const instance = new Component();
    if (!(instance instanceof ProlitDialogElement)) throw new Error('Dialog routes require ProlitDialogElement.');
    // Route metadata erases component generics; map/validate route input at this boundary.
    const element = instance as unknown as ProlitDialogElement<unknown, unknown>;
    let active = true;
    let current = context;
    const key = (value: DialogRouteContext) => JSON.stringify([value.params, value.query.toString()]);
    let previousKey = key(context);
    void element.open(input(context), options).then(() => {
      if (active) current.close();
    }, (error: unknown) => {
      if (active) { current.error(error); current.close(); }
    });
    return {
      update(next: DialogRouteContext): void {
        current = next;
        const nextKey = key(next);
        if (nextKey !== previousKey) {
          element.setInput(input(next));
          previousKey = nextKey;
        }
      },
      dispose(): void {
        active = false;
        element.abort();
      },
    };
  };
}
