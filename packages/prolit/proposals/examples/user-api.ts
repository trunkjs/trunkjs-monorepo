// Gemeinsamer Anwendungskontext: userApi kommt aus der Service-Schicht der App.
// Hier nur deren Vertrag; Transport/Backend sind kein Bestandteil von Prolit.
export interface User { id: string; name: string; email: string }
export type UserDraft = Pick<User, 'name' | 'email'>;
export interface UserEditInput { userId: string }
export interface RequestOptions { signal: AbortSignal }

export declare const userApi: {
  list(options: RequestOptions): Promise<User[]>;
  search(query: string, options: RequestOptions): Promise<User[]>;
  get(id: string, options: RequestOptions): Promise<User>;
  save(id: string, draft: UserDraft): Promise<User>;
  subscribeCount(next: (count: number) => void, fail: (cause: unknown) => void): () => void;
};
// Erwartete Beispieldaten: 42 = Ada, ada@example.test; 84 = Linus, linus@example.test.
// save('42', {name: 'Ada Lovelace', ...}) liefert den gespeicherten User mit derselben ID.
