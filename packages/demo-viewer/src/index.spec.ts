import { describe, expect, it } from 'vitest';

import { demoViewer } from './index';

describe('demoViewer', () => {
  it('returns package name', () => {
    expect(demoViewer()).toBe('demo-viewer');
  });
});
