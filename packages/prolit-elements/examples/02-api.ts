import { createApi, type ApiRoute } from '@trunkjs/api-stub';

export interface User {
  id: string;
  name: string;
}

// Minimal example contract. In an application, use its generated API types and routes.
type Routes = {
  Users: {
    List: ApiRoute<Record<string, never>, { q: string }, never, User[], 'GET'>;
    Create: ApiRoute<Record<string, never>, Record<string, never>, { name: string }, User, 'POST'>;
  };
};

export const API = createApi<Routes>({
  'Users.List': ['GET', '/api/users'],
  'Users.Create': ['POST', '/api/users'],
});
