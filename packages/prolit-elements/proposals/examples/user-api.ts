/** API sketch only. Service implementations are intentionally omitted. */
export interface User {
  id: string;
  name: string;
  email: string;
}

export type UserDraft = Pick<User, 'name' | 'email'>;
export interface UserEditInput { userId: string }

// Application-owned service boundary, not a proposed Prolit export.
export declare const userApi: {
  list(options?: { signal?: AbortSignal }): Promise<User[]>;
  get(id: string): Promise<User>;
  save(id: string, draft: UserDraft): Promise<User>;
};
