import type { ApiRoute, RouteTable } from '../src';

/** Example output of a future PHP/Fore-Schema code generator. */
export interface User {
  /** Original PHP type: App\\Dto\\UserDto::$id */
  id: number;
  /** Original PHP type: App\\Dto\\UserDto::$name */
  name: string;
}

export interface SaveUser {
  /** Original PHP type: App\\Dto\\SaveUserDto::$name */
  name: string;
}

export type GeneratedApi = {
  User: {
    /** PHP callback: App\\Action\\User\\Get */
    Get: ApiRoute<
      { tenantId?: string; userId?: string },
      { include?: string[] },
      never,
      User,
      'GET'
    >;

    /** PHP callback: App\\Action\\User\\Item */
    Item: ApiRoute<
      { tenantId?: string; userId?: string },
      { notify?: boolean },
      SaveUser,
      User,
      'GET' | 'POST' | 'PATCH'
    >;
  };
};

/** Tiny runtime table generated next to the compile-time types. */
export const generatedRoutes = {
  'User.Get': ['GET', '/api/{tenantId}/users/{userId}'],
  'User.Item': [['GET', 'POST', 'PATCH'], '/api/{tenantId}/users/{userId}'],
} as const satisfies RouteTable;
