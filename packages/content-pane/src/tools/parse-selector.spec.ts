import { describe, expect, it } from 'vitest';

// Import parseSelector from sibling file
// @ts-ignore
import { parseSelector } from './parse-selector.ts';

describe('parseSelector', () => {
  it('parses tag only', () => {
    const result = parseSelector('div');
    expect(result.tag).toBe('div');
    expect(result.id).toBe(null);
    expect(result.classes).toEqual([]);
    expect(result.attrs).toEqual([]);
    expect(result.length).toBe(3);
  });

  it('parses class only, inferred tag', () => {
    const result = parseSelector('.foo');
    expect(result.tag).toBe('div');
    expect(result.id).toBe(null);
    expect(result.classes).toEqual(['foo']);
    expect(result.attrs).toEqual([]);
    expect(result.length).toBe(4);
  });

  it('parses id only, inferred tag', () => {
    const result = parseSelector('#hello');
    expect(result.tag).toBe('div');
    expect(result.id).toBe('hello');
    expect(result.classes).toEqual([]);
    expect(result.attrs).toEqual([]);
    expect(result.length).toBe(6);
  });

  it('parses tag, id, and classes', () => {
    const result = parseSelector('section#main.content.more:foo');
    expect(result.tag).toBe('section');
    expect(result.id).toBe('main');
    expect(result.classes).toEqual(['content', 'more:foo']);
    expect(result.attrs).toEqual([]);
    // 'section'#main'.content'.more:foo' are all contiguous, so length is 22
    expect(result.length).toBe(29);
  });

  it('parses multiple classes with - and :', () => {
    const result = parseSelector('.foo-bar.baz:qux');
    expect(result.tag).toBe('div');
    expect(result.classes).toEqual(['foo-bar', 'baz:qux']);
    expect(result.id).toBe(null);
    expect(result.attrs).toEqual([]);
    expect(result.length).toBe(16);
  });

  it('parses attribute (no value)', () => {
    const result = parseSelector('[data-test]');
    expect(result.tag).toBe('div');
    expect(result.id).toBe(null);
    expect(result.classes).toEqual([]);
    expect(result.attrs).toEqual([{ name: 'data-test', value: undefined }]);
    expect(result.length).toBe(11);
  });

  it('parses attribute with value', () => {
    const result = parseSelector('[checked=true]');
    expect(result.attrs).toEqual([{ name: 'checked', value: 'true' }]);
    expect(result.tag).toBe('div');
    expect(result.classes).toEqual([]);
    expect(result.id).toBe(null);
    expect(result.length).toBe(14);
  });

  it('parses attribute with quoted value', () => {
    const result1 = parseSelector("[title='A B']");
    expect(result1.attrs).toEqual([{ name: 'title', value: 'A B' }]);
    const result2 = parseSelector('[x="y-z"]');
    expect(result2.attrs).toEqual([{ name: 'x', value: 'y-z' }]);
  });

  it('parses tag, id, class, and attribute together', () => {
    const result = parseSelector('div#id1.foo1[checked][a=b]');
    expect(result.tag).toBe('div');
    expect(result.id).toBe('id1');
    expect(result.classes).toEqual(['foo1']);
    expect(result.attrs).toEqual([
      { name: 'checked', value: undefined },
      { name: 'a', value: 'b' },
    ]);
    expect(result.length).toBe(26);
  });

  it('stops at first non-selector char', () => {
    const result = parseSelector('span.foo bar.baz');
    expect(result.tag).toBe('span');
    expect(result.classes).toEqual(['foo']);
    expect(result.length).toBe(8); // 'span.foo' only
    // The rest is not matched
  });

  it('returns correct length of prefix', () => {
    const result = parseSelector('div#foo.bar[hello="world"]:baz lorem ipsum');
    // Only the initial selector prefix is parsed
    // 'div' (3) + '#foo' (4) + '.bar' (4) + '[hello="world"]' (15) + ':baz' (not matched as a pseudosel, only in .class)
    // So .baz is actually a class, and is included if dot is there; here it's ':baz', so not matched unless as class - need to check
    // But in regex, only .baz would be matched as class, not :baz. So length is up to [hello="world"]
    // Let's check by code, but being careful
    // Input: 'div#foo.bar[hello="world"]:baz lorem ipsum'
    // 'div' (3), '#foo' (4), '.bar' (4), '[hello="world"]' (15), ':baz' not matched. So length = 3+4+4+15=26
    expect(result.length).toBe(26);
    expect(result.tag).toBe('div');
    expect(result.id).toBe('foo');
    expect(result.classes).toEqual(['bar']);
    expect(result.attrs).toEqual([{ name: 'hello', value: 'world' }]);
  });

  it('throws error for attributes when not allowed', () => {
    expect(() => parseSelector('div[attr]', { allowAttributes: false })).toThrow(/Attributes not allowed/);
  });

  it('handles selector with dash, colon in class', () => {
    const result = parseSelector('aside.-xl:weird');
    expect(result.tag).toBe('aside');
    expect(result.classes).toEqual(['-xl:weird']);
    expect(result.length).toBe(15);
  });

  it('handles empty string', () => {
    const result = parseSelector('');
    expect(result.tag).toBe('div');
    expect(result.id).toBe(null);
    expect(result.classes).toEqual([]);
    expect(result.attrs).toEqual([]);
    expect(result.length).toBe(0);
  });

  it('ignores trailing whitespace', () => {
    const result = parseSelector('span.foo   ');
    expect(result.tag).toBe('span');
    expect(result.classes).toEqual(['foo']);
    expect(result.length).toBe(8);
  });

  it('handles unusual but valid tag name', () => {
    const result = parseSelector('custom-element');
    expect(result.tag).toBe('custom-element');
    expect(result.id).toBe(null);
    expect(result.length).toBe(14);
  });

  // Additional rest/gap/fragment edge case tests

  it('ignores gaps and stops at whitespace or non-selector', () => {
    // Whitespace after selector
    const result = parseSelector('div.foo   bar#baz');
    expect(result.tag).toBe('div');
    expect(result.classes).toEqual(['foo']);
    expect(result.length).toBe(7); // 'div.foo'
  });

  it('ignores brackets in attribute values if quoted', () => {
    const result = parseSelector('div[attr="[abc]"]');
    expect(result.attrs).toEqual([{ name: 'attr', value: '[abc]' }]);
    expect(result.length).toBe(17);
  });

  it('does not parse after comma, >, +, ~ or open paren', () => {
    expect(parseSelector('div.foo,span').length).toBe(7); // stops at ','
    expect(parseSelector('div#id1>span').length).toBe(7); // stops at '>'
    expect(parseSelector('div.bar+span').length).toBe(7);
    expect(parseSelector('span.baz~div').length).toBe(8);
    expect(parseSelector('div.class1(').length).toBe(10); // stops before '('
  });

  it('parses multiple consecutive classes', () => {
    const result = parseSelector('a.b.c.d');
    expect(result.tag).toBe('a');
    expect(result.classes).toEqual(['b', 'c', 'd']);
    expect(result.rest).toBe('');
    expect(result.length).toBe(7);
  });

  it('handles class with colon (pseudo-like)', () => {
    const result = parseSelector('button:active');
    // In this parser, ':active' is not matched as a class unless it's '.active'!
    expect(result.tag).toBe('button');
    expect(result.id).toBe(null);
    expect(result.classes).toEqual([]);
    expect(result.length).toBe(6); // only 'button'
    // If .:active, then would match as class 'active'
  });
});
