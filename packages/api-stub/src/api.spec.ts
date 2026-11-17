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

  it('uses the independent API base URL from metadata by default', () => {
    vi.stubGlobal('document', {
      querySelector: (selector: string) => selector === 'meta[name="api-base-url"]' ? { content: 'https://api.example.test/v1' } : null,
    });

    expect(createApi<TestApi>(routes).Test.Get.url()).toBe('https://api.example.test/v1/api/test');
  });

  it('falls back to the application base path', () => {
    vi.stubGlobal('document', {
      querySelector: (selector: string) => selector === 'meta[name="app-base-path"]' ? { content: '/wurst/' } : null,
    });

    expect(createApi<TestApi>(routes).Test.Get.url()).toBe('/wurst/api/test');
  });

  it('allows an explicit base URL to override metadata', () => {
    vi.stubGlobal('document', {
      querySelector: () => ({ content: '/wurst' }),
    });

    expect(createApi<TestApi>(routes, { baseUrl: 'https://other-api.example.test' }).Test.Get.url())
      .toBe('https://other-api.example.test/api/test');
  });
});
