import { describe, expect, it, vi } from 'vitest';
import {
  isValidCssLayerName,
  parseArbitraryUtilityClass,
  registerElementArbitraryUtilities,
} from '../arbitrary-utility-manager';

describe('arbitrary-utility-manager', () => {
  it('maps supported utilities and aliases to CSS declarations', () => {
    expect(parseArbitraryUtilityClass('width-[100%]')).toEqual({
      className: 'width-[100%]',
      property: 'width',
      value: '100%',
    });
    expect(parseArbitraryUtilityClass('text-size-[calc(1rem_+_2px)]')).toEqual({
      className: 'text-size-[calc(1rem_+_2px)]',
      property: 'font-size',
      value: 'calc(1rem + 2px)',
    });
  });

  it('rejects unsupported or unsafe declarations', () => {
    expect(parseArbitraryUtilityClass('background-[red]')).toBeNull();
    expect(parseArbitraryUtilityClass('width-[10px;color:red]')).toBeNull();
    expect(parseArbitraryUtilityClass('width-[url(example.test)]')).toBeNull();
  });

  it('validates optional CSS layer names', () => {
    expect(isValidCssLayerName('trunkjs.utilities')).toBe(true);
    expect(isValidCssLayerName('responsive-utilities')).toBe(true);
    expect(isValidCssLayerName('invalid layer')).toBe(false);
  });

  it('creates and deduplicates on-the-fly rules inside the configured layer', () => {
    const layer = 'test.utilities';
    const element = document.createElement('div');
    const logger = { warn: vi.fn() };
    element.className = 'width-[100%] md:text-size-[1.25rem]';

    expect(registerElementArbitraryUtilities(element, layer, logger)).toBe(2);
    expect(registerElementArbitraryUtilities(element, layer, logger)).toBe(0);

    const style = document.head.querySelector<HTMLStyleElement>(
      `style[data-trunkjs-responsive-utilities][data-layer="${layer}"]`,
    );
    expect(style?.textContent).toContain('@layer test.utilities');
    expect(style?.textContent).toContain('[class~="width-[100%]"] { width: 100%; }');
    expect(style?.textContent).toContain('[class~="text-size-[1.25rem]"] { font-size: 1.25rem; }');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('fails closed for an invalid layer name', () => {
    const element = document.createElement('div');
    const logger = { warn: vi.fn() };
    element.className = 'width-[100%]';

    expect(registerElementArbitraryUtilities(element, 'invalid layer', logger)).toBe(0);
    expect(logger.warn).toHaveBeenCalledOnce();
  });
});
