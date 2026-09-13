export type TDemoOptions = {
  /** Glob patterns relative to `root`. */
  include?: string[];
  /** Glob patterns excluded from the demo scan. */
  exclude?: string[];
  /** Include demos matching at least one of these tags. Empty includes all tags. */
  includeTags?: string[];
  /** Exclude demos matching any of these tags. Exclusion takes precedence. */
  excludeTags?: string[];
  /** Demo scan root, relative to the Vite root unless absolute. */
  root?: string;
  /** Route used by the development server. */
  route?: string;
  /** Title used by the generated viewer HTML. */
  title?: string;
  /** Enable the standalone static viewer when running `vite build`. */
  build?: boolean;
};

export type TResolvedDemoOptions = {
  include: string[];
  exclude: string[];
  includeTags: string[];
  excludeTags: string[];
  route: string;
  title: string;
  build: boolean;
};

export function resolveDemoOptions(options: TDemoOptions): TResolvedDemoOptions {
  return {
    include: options.include ?? ['**/*.demo.ts'],
    exclude: options.exclude ?? ['**/node_modules/**', '**/dist/**'],
    includeTags: options.includeTags ?? [],
    excludeTags: options.excludeTags ?? [],
    route: normalizeRoute(options.route ?? '/__tdemo'),
    title: options.title ?? 'TDemo Viewer',
    build: options.build ?? false,
  };
}

function normalizeRoute(route: string): string {
  const withLeadingSlash = route.startsWith('/') ? route : `/${route}`;

  if (withLeadingSlash === '/') {
    return withLeadingSlash;
  }

  return withLeadingSlash.replace(/\/+$/, '');
}
