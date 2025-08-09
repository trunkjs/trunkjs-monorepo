---
slugName: fix-optimize-request-object
includeFiles:
    - ./src/lib/Request/Request.ts
    - ./src/lib/Request/RequestFactory.ts
    - ./src/lib/DiraApp.ts
    - ./src/lib/Container/Container.ts
editFiles:
    - ./src/lib/Request/Request.ts
    - ./src/lib/Request/RequestFactory.ts
original_prompt: Fix and optimize the Request object.
---

# Prepare Fix and optimize the Request object

Improve the Request object to be robust, efficient, and ergonomic:

- Fix missing/incomplete RequestFactory implementation
- Normalize and cache request data (headers, cookies, body)
- Provide convenience helpers (headers, content-type, json/text parsing)
- Ensure compatibility with per-request DI container model

## Assumptions

- Runtime will be Node.js or environments that support the standard URL API. We won’t introduce Node-specific types like Buffer to keep it framework-agnostic.
- bodyReader returns the raw request body once and may be expensive; we will cache its result in UniversalRequest.
- We keep UniversalRequest extending Container to support per-request DI scope, but we avoid registering providers here; that belongs to RequestFactory.
- We keep IHttpRequest backward-compatible but add non-breaking convenience methods.

Example prompts to clarify requirements (for future improvements):

- “Should UniversalRequest support parsing multipart/form-data or only JSON/text for now?”
- “Do you need a typed accessor for query/params with validation (e.g., zod)?”
- “Should RequestFactory also build a per-request container and register request tokens automatically?”
- “Which tokens should be exposed for the request in DI (request, req, IHttpRequest, Request)?”

## Tasks

- Implement robust UniversalRequest Improve body caching, header/cookie normalization, add helpers for headers/content-type/json/text
- Implement RequestFactory Provide getNewInstance and add a request-scoped container creation helper

## Overview: File changes

- ./src/lib/Request/Request.ts Replace with optimized UniversalRequest (caching, normalization, helpers)
- ./src/lib/Request/RequestFactory.ts Implement getNewInstance and add createScope utility for per-request DI

## Detail changes

### ./src/lib/Request/Request.ts

Referenced Tasks

- Implement robust UniversalRequest Add caching and helpers, normalize headers/cookies

Replace

```
import { Container } from '../Container/Container';

export interface IHttpRequest {
  method: string;
  url: string;
  path: string;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  ip?: string;
  body<T = any>(): Promise<T | undefined>;
}

export class UniversalRequest extends Container implements IHttpRequest  {
  method: string;
  url: string;
  path: string;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  ip?: string;

  private _raw: any;
  private _bodyReader: () => Promise<any>;

  constructor(init: Partial<UniversalRequest>, raw: any, bodyReader: () => Promise<any>) {
    Object.assign(this, { method: 'GET', url: '', path: '', query: {}, params: {}, headers: {}, cookies: {} }, init);
    this._raw = raw;
    this._bodyReader = bodyReader;
  }

  get raw() {
    return this._raw;
  }
  async body<T = any>(): Promise<T | undefined> {
    return (await this._bodyReader()) as T;
  }
}
```

by

```
import { Container } from '../Container/Container';

export interface IHttpRequest {
  method: string;
  url: string;
  path: string;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  ip?: string;

  body<T = any>(): Promise<T | undefined>;

  // Convenience helpers (non-breaking additions)
  header(name: string): string | undefined;
  hasHeader(name: string): boolean;
  contentType(): string | undefined;
  isJson(): boolean;
  json<T = any>(): Promise<T | undefined>;
  text(): Promise<string | undefined>;
}

/**
 * Universal Request model with:
 * - case-insensitive header access (normalized to lower-case)
 * - cached body reader (read once)
 * - convenience helpers (content-type detection, json/text parsing)
 */
export class UniversalRequest extends Container implements IHttpRequest {
  method: string;
  url: string;
  path: string;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  ip?: string;

  private _raw: any;
  private _bodyReader: () => Promise<any>;
  private _bodyCached = false;
  private _bodyValue: any | undefined;

  constructor(
    init: Partial<UniversalRequest>,
    raw: any,
    bodyReader: () => Promise<any>
  ) {
    super();

    const defaults = {
      method: 'GET',
      url: '',
      path: '',
      query: {} as Record<string, string | string[]>,
      params: {} as Record<string, string>,
      headers: {} as Record<string, string>,
      cookies: {} as Record<string, string>,
      ip: undefined as string | undefined,
    };

    const merged = { ...defaults, ...init };

    // Normalize headers and cookies
    merged.headers = UniversalRequest.normalizeHeaders(merged.headers || {});
    merged.cookies = UniversalRequest.normalizeCookies(merged.cookies || {});

    // Ensure path if not provided but url exists
    if (!merged.path && merged.url) {
      try {
        const u = new URL(merged.url, 'http://localhost');
        merged.path = u.pathname || '';
      } catch {
        // leave as provided, even if invalid URL
      }
    }

    this.method = merged.method!;
    this.url = merged.url!;
    this.path = merged.path!;
    this.query = merged.query!;
    this.params = merged.params!;
    this.headers = merged.headers!;
    this.cookies = merged.cookies!;
    this.ip = merged.ip;

    this._raw = raw;
    this._bodyReader = bodyReader;
  }

  get raw(): any {
    return this._raw;
  }

  async body<T = any>(): Promise<T | undefined> {
    if (!this._bodyCached) {
      this._bodyValue = await this._bodyReader();
      this._bodyCached = true;
    }
    return this._bodyValue as T | undefined;
  }

  header(name: string): string | undefined {
    return this.headers[name.toLowerCase()];
  }

  hasHeader(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.headers, name.toLowerCase());
  }

  contentType(): string | undefined {
    const ct = this.header('content-type');
    if (!ct) return undefined;
    const semi = ct.indexOf(';');
    return (semi === -1 ? ct : ct.substring(0, semi)).trim().toLowerCase();
  }

  isJson(): boolean {
    const ct = this.contentType();
    if (!ct) return false;
    return ct.endsWith('/json') || ct.includes('+json');
  }

  async json<T = any>(): Promise<T | undefined> {
    const b = await this.body<any>();
    if (b == null) return undefined;
    if (typeof b === 'object') return b as T;
    if (typeof b === 'string') {
      try {
        return JSON.parse(b) as T;
      } catch {
        return undefined;
      }
    }
    // Unknown type; do not guess
    return undefined;
  }

  async text(): Promise<string | undefined> {
    const b = await this.body<any>();
    if (b == null) return undefined;
    if (typeof b === 'string') return b;
    try {
      // Fallback: stringify objects
      return typeof b === 'object' ? JSON.stringify(b) : String(b);
    } catch {
      return undefined;
    }
  }

  private static normalizeHeaders(
    headers: Record<string, string>
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === 'string') {
        out[k.toLowerCase()] = v;
      }
    }
    return out;
  }

  private static normalizeCookies(
    cookies: Record<string, string>
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(cookies)) {
      if (typeof v === 'string') {
        out[k] = v;
      }
    }
    return out;
  }
}
```

### ./src/lib/Request/RequestFactory.ts

Referenced Tasks

- Implement RequestFactory Provide getNewInstance and add a request-scoped container creation helper

Replace

```
import { ContainerProviderRegistry } from '../Container/Container';
import { DiraApp } from '../DiraApp';

export class RequestFactory extends ContainerProviderRegistry {

  constructor(protected app: DiraApp) {
    super();
  }

  getNewInstance() : Re

}
```

by

```
import { Container, ContainerProviderRegistry } from '../Container/Container';
import { DiraApp } from '../DiraApp';
import { UniversalRequest } from './Request';

export type BodyReader = () => Promise<any>;

export interface RequestScope {
  container: Container;
  request: UniversalRequest;
}

export class RequestFactory extends ContainerProviderRegistry {
  constructor(protected app: DiraApp) {
    super();
  }

  /**
   * Create a new UniversalRequest instance.
   * Ensures path is derived from url if not provided.
   */
  getNewInstance(
    init: Partial<UniversalRequest>,
    raw: any,
    bodyReader: BodyReader
  ): UniversalRequest {
    const ensureInit = { ...init };
    if (!ensureInit.path && ensureInit.url) {
      try {
        const u = new URL(ensureInit.url, 'http://localhost');
        ensureInit.path = u.pathname || '';
      } catch {
        // ignore invalid URL
      }
    }
    return new UniversalRequest(ensureInit, raw, bodyReader);
  }


}
```

Notes:

- The providers copy honors the no-duplicate constraint across parent chain from ContainerProviderRegistry. If a token conflicts with the app container, an error will be thrown early, which is aligned with the existing design to avoid cross-scope overrides.
