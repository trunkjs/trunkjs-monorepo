import { describe, expect, it } from 'vitest';

import { viteDemoViewer } from './index';

describe('viteDemoViewer', () => {
  it('returns package name', () => {
    expect(viteDemoViewer()).toBe('vite-demo-viewer');
  });
});
