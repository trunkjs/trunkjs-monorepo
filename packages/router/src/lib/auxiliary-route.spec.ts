import { describe, expect, it } from 'vitest';
import { AuxiliaryRoute } from './auxiliary-route';

class Sidebar extends HTMLElement {}

describe('AuxiliaryRoute', () => {
  const route = new AuxiliaryRoute({ name: 'project-file', outlet: 'sidebar', path: 'files/:fileId', components: Sidebar });

  it('builds and serializes parameters', () => {
    expect(route.build({ fileId: 17 })).toBe('files/17');
    expect(route.serialize({ fileId: 17 })).toBe('sidebar:files/17');
  });

  it('matches and extracts parameters', () => {
    expect(route.match('files/17')?.params).toEqual({ fileId: '17' });
  });

  it('parses parenthesized auxiliary segments', () => {
    const parsed = AuxiliaryRoute.parseUrlPath('/projects/42(sidebar:files/17//modal:share)');
    expect(parsed.primaryPath).toBe('/projects/42');
    expect(Object.fromEntries(parsed.segments)).toEqual({ sidebar: 'files/17', modal: 'share' });
  });

  it('composes parenthesized auxiliary segments', () => {
    expect(AuxiliaryRoute.composeUrlPath('/projects/42', ['sidebar:files/17', 'modal:share']))
      .toBe('/projects/42(sidebar:files/17//modal:share)');
  });
});
