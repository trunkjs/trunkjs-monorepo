import { describe, expect, it, vi } from 'vitest';

vi.mock('@trunkjs/browser-utils', () => {
  const breakpoints = {
    xs: { minWidth: 0 },
    sm: { minWidth: 576 },
    md: { minWidth: 768 },
    lg: { minWidth: 992 },
    xl: { minWidth: 1200 },
    xxl: { minWidth: 1400 },
  };
  return { breakpoints };
});

import { adjustElementStyle } from '../style-adjust-manager';

describe('style-adjust-manager', () => {
  it('creates baseline (style-xs) from original inline styles for observed properties and applies by breakpoint', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'color: black; padding: 4px; margin: 1px');
    el.setAttribute('style-sm', 'color: blue');
    el.setAttribute('style-md', 'padding: 8px');

    // Initial call at xs width (0) -> baseline gets created from original styles for observed props (color, padding)
    adjustElementStyle(el, 0);

    // style-xs should be created with only observed properties (no margin)
    expect(el.getAttribute('style-xs')).toBe('color: black; padding: 4px');

    // Applied styles at xs should reflect baseline
    expect(el.style.getPropertyValue('color')).toBe('black');
    expect(el.style.getPropertyValue('padding')).toBe('4px');
    // margin is not observed and should remain as originally set (not touched)
    expect(el.style.getPropertyValue('margin')).toBe('1px');

    // Move to sm (>=576): color overridden, padding stays from baseline
    adjustElementStyle(el, 600);
    expect(el.style.getPropertyValue('color')).toBe('blue');
    expect(el.style.getPropertyValue('padding')).toBe('4px');
    // margin still present
    expect(el.style.getPropertyValue('margin')).toBe('1px');

    // Move to md (>=768): padding overridden, color stays from sm
    adjustElementStyle(el, 800);
    expect(el.style.getPropertyValue('color')).toBe('blue');
    expect(el.style.getPropertyValue('padding')).toBe('8px');
    // margin still present
    expect(el.style.getPropertyValue('margin')).toBe('1px');
  });

  it('applies !important priorities correctly', () => {
    const el = document.createElement('div');
    el.setAttribute('style-md', 'margin: 1px !important');

    adjustElementStyle(el, 800); // >= md
    expect(el.style.getPropertyValue('margin')).toBe('1px');
    expect(el.style.getPropertyPriority('margin')).toBe('important');
  });

  it('removes non-matching observed properties when they do not apply at the current width', () => {
    const el = document.createElement('div');
    // No original opacity in style attribute
    el.setAttribute('style-lg', 'opacity: 0.5');

    // First at xl/lg width -> opacity applied
    adjustElementStyle(el, 1200);
    expect(el.style.getPropertyValue('opacity')).toBe('0.5');

    // Now at sm width (< lg) -> opacity should be removed (no baseline for it)
    adjustElementStyle(el, 600);
    expect(el.style.getPropertyValue('opacity')).toBe('');
    // No baseline since original had no observed properties for xs
    expect(el.getAttribute('style-xs')).toBeNull();
  });

  it('does nothing when no responsive style-* attributes exist', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'color: black');

    adjustElementStyle(el, 800);
    expect(el.getAttribute('style')).toBe('color: black');
    expect(el.getAttribute('style-xs')).toBeNull();
  });

  it('honors existing style-xs attribute without recalculating baseline', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'background-color: green');
    el.setAttribute('style-xs', 'background-color: yellow');
    el.setAttribute('style-sm', 'background-color: blue');

    // At xs -> should use provided style-xs, not recompute from original
    adjustElementStyle(el, 0);
    expect(el.getAttribute('style-xs')).toBe('background-color: yellow');
    expect(el.style.getPropertyValue('background-color')).toBe('yellow');

    // At sm -> override with style-sm
    adjustElementStyle(el, 600);
    expect(el.style.getPropertyValue('background-color')).toBe('blue');
  });
});
