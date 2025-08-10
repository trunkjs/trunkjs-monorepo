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
export class Req extends Container implements IHttpRequest {
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

  constructor(init: Partial<Req>, raw: any, bodyReader: () => Promise<any>) {
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
    merged.headers = Req.normalizeHeaders(merged.headers || {});
    merged.cookies = Req.normalizeCookies(merged.cookies || {});

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

  private static normalizeHeaders(headers: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === 'string') {
        out[k.toLowerCase()] = v;
      }
    }
    return out;
  }

  private static normalizeCookies(cookies: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(cookies)) {
      if (typeof v === 'string') {
        out[k] = v;
      }
    }
    return out;
  }
}
