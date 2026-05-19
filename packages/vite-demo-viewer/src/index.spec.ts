import { describe, expect, it } from 'vitest';

import { defineDemo, tjDemoViewerPlugin } from './index';

describe('viteDemoViewer', () => {
  it('exports the plugin factory', () => {
    expect(typeof tjDemoViewerPlugin).toBe('function');
  });

  it('exports defineDemo for backwards compatibility', () => {
    const demo = { title: 'Demo' };

    expect(defineDemo(demo)).toBe(demo);
  });
});
