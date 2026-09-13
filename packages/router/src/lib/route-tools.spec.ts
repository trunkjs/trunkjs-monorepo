import { describe, expect, it } from 'vitest';
import { buildPath, compilePath, queryString, sameRecord } from './route-tools';

describe('route tools', () => {
  it('compiles and matches route parameters', () => {
    const { names, regex } = compilePath('/projects/:projectId');
    expect(names).toEqual(['projectId']);
    expect(regex.exec('/projects/42')?.[1]).toBe('42');
  });

  it('builds paths with encoded parameters', () => {
    expect(buildPath('/projects/:projectId', { projectId: 'hello world' }, 'project'))
      .toBe('/projects/hello%20world');
  });

  it('replaces whole parameter segments and preserves auxiliary delimiters as data', () => {
    expect(buildPath('/:id/:id2/:id', { id: 'a(b)', id2: 'folder/file' }))
      .toBe('/a%28b%29/folder%2Ffile/a%28b%29');
    expect(() => buildPath('/:id', {})).toThrow('Missing route parameter id');
    for (const id of ['', '.', '..']) expect(() => buildPath('/:id', { id })).toThrow('Invalid route parameter id');
  });

  it('serializes query values independently from auxiliary routes', () => {
    expect(queryString({ sort: 'date', page: 2, hidden: undefined })).toBe('?sort=date&page=2');
  });

  it('compares route parameter records', () => {
    expect(sameRecord({ id: '1' }, { id: '1' })).toBe(true);
    expect(sameRecord({ id: '1' }, { id: '2' })).toBe(false);
  });
});
