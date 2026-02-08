import { describe, expect, it } from 'vitest';
import { local_storage, session_storage } from '../storage';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  } as Storage;
}

describe('storage proxy', () => {
  it('reads initial value, persists on first read, and updates on set', () => {
    const originalWindow = (globalThis as any).window;
    try {
      const w = {
        localStorage: createMemoryStorage(),
        sessionStorage: createMemoryStorage(),
      };
      (globalThis as any).window = w;

      const store = session_storage('abcd', { key1: 'value1', key2: 'value2' });

      // first read should return initial value
      expect(store.key1).toBe('value1');
      // and also persist it
      expect(w.sessionStorage.getItem('abcd')).toBe(JSON.stringify({ key1: 'value1', key2: 'value2' }));

      store.key1 = 'new value';
      expect(store.key1).toBe('new value');
      expect(w.sessionStorage.getItem('abcd')).toBe(JSON.stringify({ key1: 'new value', key2: 'value2' }));
    } finally {
      if (originalWindow === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = originalWindow;
    }
  });

  it('ignores unknown keys from storage data and survives invalid JSON', () => {
    const originalWindow = (globalThis as any).window;
    try {
      const w = {
        localStorage: createMemoryStorage(),
        sessionStorage: createMemoryStorage(),
      };
      (globalThis as any).window = w;

      w.localStorage.setItem('k', '{not json');
      const s1 = local_storage('k', { a: 1, b: 2 });
      expect(s1.a).toBe(1);
      expect(s1.b).toBe(2);

      w.localStorage.setItem('k2', JSON.stringify({ a: 5, b: 6, c: 7 }));
      const s2 = local_storage('k2', { a: 1, b: 2 });
      expect(s2.a).toBe(5);
      expect(s2.b).toBe(6);
      expect((s2 as any).c).toBeUndefined();

      // Object.keys / spread should behave predictably
      expect(Object.keys(s2).sort()).toEqual(['a', 'b']);
      expect({ ...s2 }).toEqual({ a: 5, b: 6 });
    } finally {
      if (originalWindow === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = originalWindow;
    }
  });

  it('works in SSR (no window) as an in-memory proxy seeded with initialValue', () => {
    const originalWindow = (globalThis as any).window;
    try {
      delete (globalThis as any).window;

      const store = local_storage('x', { hello: 'world' });
      expect(store.hello).toBe('world');
      store.hello = 'changed';
      expect(store.hello).toBe('changed');
    } finally {
      if (originalWindow !== undefined) (globalThis as any).window = originalWindow;
    }
  });
});
