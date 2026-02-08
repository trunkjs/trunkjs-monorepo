type StorageBackend = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

type JsonRecord = Record<string, unknown>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeParse<T>(raw: string | null): T | undefined {
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function safeStringify(value: unknown): string {
  // JSON.stringify kann undefined liefern – wir wollen immer einen String persistieren.
  const s = JSON.stringify(value);
  return s === undefined ? 'null' : s;
}

function normalizeWithInitial<T extends JsonRecord>(parsed: unknown, initialValue: T): T {
  // Wir mergen nur bekannte Keys – das hält die Typen stabil.
  const out: Record<string, unknown> = { ...initialValue };
  if (isObject(parsed)) {
    for (const k of Object.keys(initialValue)) {
      if (k in parsed) out[k] = (parsed as Record<string, unknown>)[k];
    }
  }
  return out as T;
}

class StorageProxy<T extends JsonRecord> {
  private cache?: T;

  constructor(
    private readonly backend: StorageBackend | undefined,
    private readonly storageKey: string,
    private readonly initialValue: T,
  ) {}

  private read(): T {
    if (this.cache) return this.cache;

    const parsed = this.backend ? safeParse<unknown>(this.backend.getItem(this.storageKey)) : undefined;
    const normalized = normalizeWithInitial(parsed, this.initialValue);

    // first read: wenn noch nichts da ist, initialValue persistieren (best effort)
    if (this.backend) {
      const existing = this.backend.getItem(this.storageKey);
      if (existing == null) {
        try {
          this.backend.setItem(this.storageKey, safeStringify(normalized));
        } catch {
          // ignore quota/security errors
        }
      }
    }

    this.cache = normalized;
    return normalized;
  }

  private write(next: T): void {
    this.cache = next;
    if (!this.backend) return;
    try {
      this.backend.setItem(this.storageKey, safeStringify(next));
    } catch {
      // ignore quota/security errors
    }
  }

  asProxy(): T {
    const handler: ProxyHandler<object> = {
      get: (_target, prop) => {
        if (typeof prop === 'symbol') {
          // sehr defensiv – verhindert, dass runtimes/inspect Probleme machen
          if (prop === Symbol.toStringTag) return 'Storage';
          return undefined;
        }

        const data = this.read();

        // JSON/Spread/Console
        if (prop === 'toJSON') return () => ({ ...data });

        return (data as Record<string, unknown>)[prop];
      },

      set: (_target, prop, value) => {
        if (typeof prop !== 'string') return false;
        const data = this.read();
        const next = { ...(data as Record<string, unknown>) } as Record<string, unknown>;
        next[prop] = value;
        this.write(next as T);
        return true;
      },

      deleteProperty: (_target, prop) => {
        if (typeof prop !== 'string') return false;
        const data = this.read();
        if (!(prop in data)) return true;
        const next = { ...(data as Record<string, unknown>) } as Record<string, unknown>;
        delete next[prop];
        this.write(next as T);
        return true;
      },

      has: (_target, prop) => {
        if (typeof prop !== 'string') return false;
        const data = this.read();
        return prop in data;
      },

      ownKeys: () => {
        const data = this.read();
        return Reflect.ownKeys(data);
      },

      getOwnPropertyDescriptor: (_target, prop) => {
        if (typeof prop !== 'string') return undefined;
        const data = this.read();
        if (!(prop in data)) return undefined;
        return {
          enumerable: true,
          configurable: true,
          writable: true,
          value: (data as Record<string, unknown>)[prop],
        };
      },
    };

    // target ist egal, wir leiten alles in handler um.
    return new Proxy({}, handler) as unknown as T;
  }
}

function getBackend(kind: 'session' | 'local'): StorageBackend | undefined {
  // Node/SSR: kein window
  const w = (globalThis as unknown as { window?: Window }).window;
  const storage = kind === 'session' ? w?.sessionStorage : w?.localStorage;
  return storage ?? undefined;
}

export function session_storage<T extends JsonRecord>(storageKey: string, initialValue: T): T {
  return new StorageProxy<T>(getBackend('session'), storageKey, initialValue).asProxy();
}

export function local_storage<T extends JsonRecord>(storageKey: string, initialValue: T): T {
  return new StorageProxy<T>(getBackend('local'), storageKey, initialValue).asProxy();
}

// Beispiel (wird in Library-Quellcode normalerweise nicht mit ausgeliefert)
// const sstore = session_storage("abcd", {
//   key1: "value1",
//   key2: "value2",
// })
// console.log(sstore.key1) // "value1"
// sstore.key1 = "new value"
