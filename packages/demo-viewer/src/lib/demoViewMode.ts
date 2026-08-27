export type TDemoViewMode = 'default' | 'fullscreen' | 'source';

const VIEW_QUERY_PARAMETER = 'view';

export function readDemoViewMode(search: string): TDemoViewMode {
  const value = new URLSearchParams(search).get(VIEW_QUERY_PARAMETER);

  return value === 'fullscreen' || value === 'source' ? value : 'default';
}

export function getDemoViewHref(href: string, mode: TDemoViewMode): string {
  const url = new URL(href);

  if (mode === 'default') {
    url.searchParams.delete(VIEW_QUERY_PARAMETER);
  } else {
    url.searchParams.set(VIEW_QUERY_PARAMETER, mode);
  }

  return url.href;
}
