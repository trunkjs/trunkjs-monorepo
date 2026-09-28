import type { RouteTarget } from './router';
import { buildPath } from './route-tools';

export type AuxiliaryRouteParams = Record<string, string | number>;

export interface AuxiliaryRouteOptions {
  name: string;
  outlet: string;
  path: string;
  components: CustomElementConstructor | readonly CustomElementConstructor[];
  meta?: Record<string, unknown>;
  presentation?: string;
  closeTo?: RouteTarget;
}

export interface AuxiliaryRouteMatch {
  readonly route: AuxiliaryRoute;
  readonly name: string;
  readonly outlet: string;
  readonly path: string;
  readonly params: Readonly<Record<string, string>>;
  readonly meta: Readonly<Record<string, unknown>>;
  readonly components: readonly CustomElementConstructor[];
}

/**
 * Definition for a route that is rendered in a named outlet while the primary
 * route stays active. Auxiliary routes are serialized inside parentheses, e.g.
 * `/projects/42(sidebar:files/17//modal:share)`.
 */
export class AuxiliaryRoute {
  readonly name: string;
  readonly outlet: string;
  readonly path: string;
  readonly presentation?: string;
  readonly closeTo?: RouteTarget;
  readonly components: readonly CustomElementConstructor[];
  readonly meta: Readonly<Record<string, unknown>>;

  constructor(options: AuxiliaryRouteOptions) {
    this.name = options.name;
    this.outlet = options.outlet;
    this.path = options.path.replace(/^\/+|\/+$/g, '');
    this.components = Array.isArray(options.components) ? [...options.components] : [options.components];
    this.meta = options.meta ?? {};
    this.presentation = options.presentation;
    this.closeTo = options.closeTo;
  }

  build(params: AuxiliaryRouteParams = {}): string {
    return buildPath(this.path, params, this.name);
  }

  serialize(params: AuxiliaryRouteParams = {}): string {
    return `${encodeURIComponent(this.outlet)}:${this.build(params)}`;
  }

  match(path: string): AuxiliaryRouteMatch | null {
    const names: string[] = [];
    const expression = this.path
      .split('/')
      .map((part) => {
        if (part.startsWith(':')) {
          names.push(part.slice(1));
          return '([^/]+)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    const match = new RegExp(`^${expression}/?$`).exec(path.replace(/^\/+|\/+$/g, ''));
    if (!match) return null;

    return {
      route: this,
      name: this.name,
      outlet: this.outlet,
      path: path.replace(/^\/+|\/+$/g, ''),
      params: Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1] ?? '')])),
      meta: this.meta,
      components: this.components,
    };
  }

  static parseUrlPath(pathname: string): { primaryPath: string; segments: ReadonlyMap<string, string> } {
    const match = /^(.*?)(?:\((.*)\))?$/.exec(pathname);
    const primaryPath = match?.[1] || '/';
    const body = match?.[2];
    const segments = new Map<string, string>();

    if (!body) return { primaryPath, segments };

    for (const part of body.split('//')) {
      const separator = part.indexOf(':');
      if (separator <= 0) throw new URIError(`Invalid auxiliary route segment: ${part}`);
      const outlet = decodeURIComponent(part.slice(0, separator));
      const path = part.slice(separator + 1);
      if (!path) throw new URIError(`Missing auxiliary route path for outlet ${outlet}`);
      segments.set(outlet, path);
    }

    return { primaryPath, segments };
  }

  static composeUrlPath(primaryPath: string, segments: Iterable<string>): string {
    const serialized = [...segments].filter(Boolean);
    return serialized.length ? `${primaryPath}(${serialized.join('//')})` : primaryPath;
  }
}
