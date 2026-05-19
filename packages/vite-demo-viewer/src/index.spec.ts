import { describe, expect, it } from 'vitest';

import { tjDemoViewerPlugin } from './index';

describe('viteDemoViewer', () => {
  it('exports the plugin factory', () => {
    expect(typeof tjDemoViewerPlugin).toBe('function');
  });
});
