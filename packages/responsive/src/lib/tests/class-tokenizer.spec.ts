import { describe, expect, it } from 'vitest';
import {
  getClassNamesFromToken,
  getClassTokenErrors,
  splitClassToken,
  splitResponsiveClassNames,
} from '../class-tokenizer';

describe('class-tokenizer', () => {
  it('keeps the regular split behaviour for tokens without brackets', () => {
    expect(splitClassToken('md:card.shadow', ':')).toEqual(['md', 'card.shadow']);
    expect(splitResponsiveClassNames('card.shadow')).toEqual(['card', 'shadow']);
  });

  it('does not split breakpoint delimiters inside arbitrary values', () => {
    expect(splitClassToken('md:grid-template-columns-[minmax(0,1fr):2fr]', ':')).toEqual([
      'md',
      'grid-template-columns-[minmax(0,1fr):2fr]',
    ]);
  });

  it('does not split decimal points inside arbitrary values', () => {
    expect(splitResponsiveClassNames('text-size-[1.25rem].shadow')).toEqual(['text-size-[1.25rem]', 'shadow']);
  });

  it('extracts utility classes from short and chained responsive syntax', () => {
    expect(getClassNamesFromToken('md:width-[50%]')).toEqual(['width-[50%]']);
    expect(getClassNamesFromToken('width-[100%]:md:width-[50%]:xl:text-size-[22px]')).toEqual([
      'width-[100%]',
      'width-[50%]',
      'text-size-[22px]',
    ]);
  });

  it('honours escaped brackets', () => {
    expect(splitClassToken('md:width-[var(--size\\])]:xl:width-[50%]', ':')).toEqual([
      'md',
      'width-[var(--size\\])]',
      'xl',
      'width-[50%]',
    ]);
  });

  describe('malformed brackets', () => {
    it.each([
      ['width-[100%', [{ code: 'unclosed-opening-bracket', index: 6 }]],
      ['width-100%]', [{ code: 'unexpected-closing-bracket', index: 10 }]],
      [']width-[100%]', [{ code: 'unexpected-closing-bracket', index: 0 }]],
      [
        'width-]100%[',
        [
          { code: 'unexpected-closing-bracket', index: 6 },
          { code: 'unclosed-opening-bracket', index: 11 },
        ],
      ],
      ['width-[]', [{ code: 'empty-bracket-value', index: 6 }]],
      ['width-[100%]]', [{ code: 'unexpected-closing-bracket', index: 12 }]],
      ['width-[100%]\\', [{ code: 'dangling-escape', index: 12 }]],
    ])('reports errors for %s', (token, expected) => {
      expect(getClassTokenErrors(token)).toMatchObject(expected);
    });

    it('identifies the fragments caused by whitespace inside a bracket value', () => {
      const fragments = 'width-[calc(100% - 2rem)]'.split(/\s+/);

      expect(getClassTokenErrors(fragments[0])).toMatchObject([{ code: 'unclosed-opening-bracket', index: 6 }]);
      expect(getClassTokenErrors(fragments[1])).toEqual([]);
      expect(getClassTokenErrors(fragments[2])).toMatchObject([{ code: 'unexpected-closing-bracket', index: 5 }]);
    });

    it('accepts nested and escaped square brackets', () => {
      expect(getClassTokenErrors('grid-template-columns-[[main]_1fr_[content]_2fr]')).toEqual([]);
      expect(getClassTokenErrors('width-[var(--size\\])]')).toEqual([]);
    });
  });
});
