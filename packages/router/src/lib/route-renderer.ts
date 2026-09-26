import type { RouteContext } from './router';

export interface RouteRenderContext {
  readonly route: RouteContext;
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  /** Removes the current auxiliary route or replaces a primary route with closeTo. */
  close(): void;
  /** Reports asynchronous presentation failures on the owning router-content. */
  error(error: unknown): void;
}

export interface RouteView {
  update(context: RouteRenderContext): void;
  dispose(): void;
}

export type RouteRenderer = (component: CustomElementConstructor, context: RouteRenderContext) => RouteView;
