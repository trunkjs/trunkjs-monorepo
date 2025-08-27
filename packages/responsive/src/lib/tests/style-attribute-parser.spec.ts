import { describe, expect, it } from 'vitest';
import {
  getStyleEntryAsString,
  getSTyleEntryValueAsString,
  parseStyleAttribute,
  StyleDeclarationError,
  StyleParseError,
  type StyleEntry,
} from '../style-attribute-parser';

function toMap(entries: StyleEntry[]) {
  const map: Record<
    string,
    {
      value: string;
      priority?: 'important';
    }
  > = {};
  for (const [prop, value, priority] of entries) {
    map[prop] = { value, priority };
  }
  return map;
}

describe('style-attribute-parser', () => {
  describe('parseStyleAttribute - basic', () => {
    it('parses simple declarations', () => {
      const input = 'color: red; background-color: blue;';
      const res = parseStyleAttribute(input);
      const map = toMap(res);
      expect(map['color']).toEqual({ value: 'red', priority: undefined });
      expect(map['background-color']).toEqual({ value: 'blue', priority: undefined });
    });

    it('handles missing trailing semicolon and extra whitespace', () => {
      const input = '  color:red ;  background :  blue  ';
      const res = parseStyleAttribute(input);
      const map = toMap(res);
      expect(map['color']).toEqual({ value: 'red', priority: undefined });
      expect(map['background']).toEqual({ value: 'blue', priority: undefined });
    });

    it('extracts !important regardless of casing and spacing', () => {
      const res1 = parseStyleAttribute('margin: 1px !important;');
      const res2 = parseStyleAttribute('padding: 2px    !IMPORTANT  ');
      const map1 = toMap(res1);
      const map2 = toMap(res2);
      expect(map1['margin']).toEqual({ value: '1px', priority: 'important' });
      expect(map2['padding']).toEqual({ value: '2px', priority: 'important' });
    });

    it('skips empty or malformed chunks in non-strict mode', () => {
      const input = ';; ; color red ; width:100px;;';
      const res = parseStyleAttribute(input);
      const map = toMap(res);
      expect(map['width']).toEqual({ value: '100px', priority: undefined });
      expect(map['color']).toBeUndefined(); // missing colon, skipped
    });
  });

  describe('parseStyleAttribute - complex values', () => {
    it('does not split on semicolons inside quotes or parentheses', () => {
      const input = 'background-image: url(\'x;y)z\'); color: red; content: "a;b";';
      const res = parseStyleAttribute(input);
      const map = toMap(res);
      expect(map['background-image']).toEqual({ value: "url('x;y)z')", priority: undefined });
      expect(map['color']).toEqual({ value: 'red', priority: undefined });
      expect(map['content']).toEqual({ value: '"a;b"', priority: undefined });
    });

    it('does not split the declaration on colons inside quotes or parentheses', () => {
      const input = "content: 'a:b'; thing: func(1:2);";
      const res = parseStyleAttribute(input);
      const map = toMap(res);
      expect(map['content']).toEqual({ value: "'a:b'", priority: undefined });
      expect(map['thing']).toEqual({ value: 'func(1:2)', priority: undefined });
    });

    it('supports legacy filter-like values with colons before parentheses', () => {
      const input = 'filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=50);';
      const res = parseStyleAttribute(input);
      const map = toMap(res);
      expect(map['filter']).toEqual({
        value: 'progid:DXImageTransform.Microsoft.Alpha(Opacity=50)',
        priority: undefined,
      });
    });
  });

  describe('parseStyleAttribute - strict vs non-strict error handling', () => {
    it('non-strict: keeps data and does not throw on unmatched closing parenthesis', () => {
      const input = 'color: red); width:100px';
      const res = parseStyleAttribute(input);
      const map = toMap(res);
      expect(map['color']).toEqual({ value: 'red)', priority: undefined });
      expect(map['width']).toEqual({ value: '100px', priority: undefined });
    });

    it('strict: throws on unmatched closing parenthesis in the input', () => {
      const input = 'color: red)';
      expect(() => parseStyleAttribute(input, { strict: true })).toThrowError(StyleParseError);
      expect(() => parseStyleAttribute(input, { strict: true })).toThrowError(/Unmatched closing parenthesis \)/);
    });

    it('non-strict: does not throw on unclosed quote and still returns entry', () => {
      const input = "content: 'abc";
      const res = parseStyleAttribute(input);
      const map = toMap(res);
      expect(map['content']).toEqual({ value: "'abc", priority: undefined });
    });

    it('strict: throws on unclosed quote', () => {
      const input = "content: 'abc";
      expect(() => parseStyleAttribute(input, { strict: true })).toThrowError(StyleParseError);
      expect(() => parseStyleAttribute(input, { strict: true })).toThrowError(/Unclosed quote/);
    });

    it('non-strict: skips declaration without colon', () => {
      const input = 'color red; height: 20px';
      const res = parseStyleAttribute(input);
      const map = toMap(res);
      expect(map['height']).toEqual({ value: '20px', priority: undefined });
      expect(map['color']).toBeUndefined();
    });

    it('strict: throws on declaration without colon', () => {
      const input = 'color red; height: 20px';
      expect(() => parseStyleAttribute(input, { strict: true })).toThrowError(StyleDeclarationError);
      expect(() => parseStyleAttribute(input, { strict: true })).toThrowError(/Missing colon/);
    });
  });

  describe('getStyleEntryAsString', () => {
    it('formats single entry', () => {
      const entry: StyleEntry = ['color', 'red'];
      expect(getStyleEntryAsString(entry)).toBe('color: red');
    });

    it('formats single entry with priority', () => {
      const entry: StyleEntry = ['margin', '1px', 'important'];
      expect(getStyleEntryAsString(entry)).toBe('margin: 1px !important');
    });

    it('joins arrays of entries with semicolons', () => {
      const entries: StyleEntry[] = [
        ['color', 'red'],
        ['margin', '1px', 'important'],
      ];
      expect(getStyleEntryAsString(entries)).toBe('color: red; margin: 1px !important');
    });
  });

  describe('getSTyleEntryValueAsString', () => {
    it('returns value for single entry', () => {
      const entry: StyleEntry = ['color', 'red'];
      expect(getSTyleEntryValueAsString(entry)).toBe('red');
    });

    it('joins values for arrays of entries', () => {
      const entries: StyleEntry = ['color', 'red', 'important'];
      expect(getSTyleEntryValueAsString(entries)).toBe('red !important');
    });
  });
});
