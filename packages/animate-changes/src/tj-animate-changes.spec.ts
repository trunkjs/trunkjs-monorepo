import { describe, expect, it } from 'vitest';
import { AutoAnimateContainer } from './index';

describe('standalone animation element', () => {
  it('registers its existing tag independently of Prolit', () => {
    expect(customElements.get('tj-animate-changes')).toBe(AutoAnimateContainer);
    expect(customElements.get('prolit-scope')).toBeUndefined();
    const element = document.createElement('tj-animate-changes') as AutoAnimateContainer;
    element.setAttribute('duration', '120');
    expect(element.duration).toBe(120);
  });
});
