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

  it('serializes query values independently from auxiliary routes', () => {
    expect(queryString({ sort: 'date', page: 2, hidden: undefined })).toBe('?sort=date&page=2');
  });

  it('compares route parameter records', () => {
    expect(sameRecord({ id: '1' }, { id: '1' })).toBe(true);
    expect(sameRecord({ id: '1' }, { id: '2' })).toBe(false);
  });
});
