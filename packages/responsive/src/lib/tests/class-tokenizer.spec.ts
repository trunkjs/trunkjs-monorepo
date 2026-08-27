import { describe, expect, it } from 'vitest';
import { getClassNamesFromToken, splitClassToken, splitResponsiveClassNames } from '../class-tokenizer';

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
});
