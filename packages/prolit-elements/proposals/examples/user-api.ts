/** Application service contracts only; no backend implementation. */
export interface User { id: string; name: string; email: string }
export type UserDraft = Pick<User, 'name' | 'email'>;
export interface UserEditInput { userId: string }
export interface RequestOptions { signal: AbortSignal }

export declare const userApi: {
  list(options: RequestOptions): Promise<User[]>;
  search(query: string, options: RequestOptions): Promise<User[]>;
  get(id: string, options: RequestOptions): Promise<User>;
  save(id: string, draft: UserDraft): Promise<User>;
  // Subscribe owns its transport; returned function releases it synchronously.
  subscribeCount(next: (count: number) => void, fail: (cause: unknown) => void): () => void;
};
