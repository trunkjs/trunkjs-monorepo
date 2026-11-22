import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApi } from './api';
import type { ApiRoute, RouteTable } from './types';

type TestApi = {
  Test: {
    Get: ApiRoute<Record<string, never>, Record<string, never>, never, string, 'GET'>;
  };
};

const routes = {
  'Test.Get': ['GET', '/api/test'],
} as const satisfies RouteTable;

describe('createApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ignores legacy API and application base metadata', () => {
    vi.stubGlobal('document', {
      querySelector: (selector: string) =>
        ['meta[name="api-base-url"]', 'meta[name="api-base-path"]', 'meta[name="app-base-path"]'].includes(selector)
          ? { content: '/legacy/' } : null,
    });

    expect(createApi<TestApi>(routes).Test.Get.url()).toBe('/api/test');
  });

  it.each(['/wurst', '/wurst/'])('uses the application URL prefix %s', (prefix) => {
    vi.stubGlobal('document', {
      querySelector: (selector: string) => selector === 'meta[name="app-url-prefix"]' ? { content: prefix } : null,
    });

    expect(createApi<TestApi>(routes).Test.Get.url()).toBe('/wurst/api/test');
  });

  it.each(['', '/'])('uses root-relative URLs for an empty or root prefix', (prefix) => {
    vi.stubGlobal('document', {
      querySelector: (selector: string) => selector === 'meta[name="app-url-prefix"]' ? { content: prefix } : null,
    });

    expect(createApi<TestApi>(routes).Test.Get.url()).toBe('/api/test');
  });

  it('allows an explicit base URL to override metadata', () => {
    vi.stubGlobal('document', {
      querySelector: () => ({ content: '/wurst' }),
    });

    expect(createApi<TestApi>(routes, { baseUrl: 'https://other-api.example.test' }).Test.Get.url())
      .toBe('https://other-api.example.test/api/test');
  });
});
