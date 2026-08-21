import type { AuxiliaryRouteMatch } from './auxiliary-route';
import type {
  NormalizedRouteDefinition,
  RouteChangeSet,
  RouteComponent,
  RouteContext,
  RouteDefinition,
  RouteOutletComponents,
  RouteOutletName,
  RouteQuery,
} from './router';

export function compilePath(path: string) {
  const names: string[] = [];
  const escaped = path
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        names.push(part.slice(1));
        return '([^/]+)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { names, regex: new RegExp(`^${escaped}/?$`) };
}

export function buildPath(path: string, params: Record<string, string | number> = {}, label = path): string {
  let result = path;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, encodeURIComponent(String(value)));
  }
  if (/:[^/]+/.test(result)) throw new Error(`Missing route parameter for ${label}`);
  return result;
}

export function queryString(query?: RouteQuery): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}

function asComponents(value?: RouteOutletComponents): RouteComponent[] {
  if (!value) return [];
  return Array.isArray(value) ? [...value] : [value as RouteComponent];
}

export function normalizeRoute(definition: RouteDefinition): NormalizedRouteDefinition {
  const outlets: Record<RouteOutletName, RouteComponent[]> = {};
  for (const [name, components] of Object.entries(definition.outlets ?? {})) outlets[name] = asComponents(components);

  const outlet = definition.outlet ?? 'default';
  if (definition.components?.length) outlets[outlet] = [...(outlets[outlet] ?? []), ...definition.components];

  return {
    ...definition,
    navigation: definition.navigation ?? 'spa',
    meta: definition.meta ?? {},
    components: outlets.default ?? [],
    outlets,
  };
}

export function sameRecord(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const entries = Object.entries(a);
  return entries.length === Object.keys(b).length && entries.every(([key, value]) => b[key] === value);
}

export function sameAuxiliaryRoute(a?: AuxiliaryRouteMatch, b?: AuxiliaryRouteMatch): boolean {
  if (!a || !b) return a === b;
  return a.route === b.route && sameRecord(a.params, b.params);
}

export function getChangedOutlets(previousRoute: RouteContext | null, route: RouteContext): Set<RouteOutletName> {
  const names = new Set([...Object.keys(previousRoute?.outlets ?? {}), ...Object.keys(route.outlets)]);
  const changed = new Set<RouteOutletName>();
  for (const name of names) {
    if (!sameAuxiliaryRoute(previousRoute?.outlets[name], route.outlets[name])) changed.add(name);
  }
  return changed;
}

export function getRouteChangeSet(previousRoute: RouteContext | null, route: RouteContext): RouteChangeSet {
  return {
    primary: !previousRoute
      || previousRoute.name !== route.name
      || previousRoute.definition !== route.definition
      || !sameRecord(previousRoute.params, route.params),
    outlets: getChangedOutlets(previousRoute, route),
    query: previousRoute?.query.toString() !== route.query.toString(),
    hash: previousRoute?.hash !== route.hash,
  };
}
