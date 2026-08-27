export type ClassTokenErrorCode =
  | 'unexpected-closing-bracket'
  | 'unclosed-opening-bracket'
  | 'empty-bracket-value'
  | 'dangling-escape';

export interface ClassTokenError {
  code: ClassTokenErrorCode;
  index: number;
  message: string;
}

export interface ClassTokenizationResult {
  parts: string[];
  errors: ClassTokenError[];
}

/**
 * Tokenize a responsive class without treating delimiters inside square
 * brackets as syntax. Regular class tokens stay on the native split fast path.
 */
export function tokenizeClassToken(value: string, delimiter: ':' | '.'): ClassTokenizationResult {
  if (!value.includes('[') && !value.includes(']')) {
    return { parts: value.split(delimiter), errors: [] };
  }

  const parts: string[] = [];
  const errors: ClassTokenError[] = [];
  const openingBrackets: number[] = [];
  let start = 0;
  let escaped = false;

  for (let index = 0; index < value.length; index++) {
    const char = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '[') {
      openingBrackets.push(index);
      continue;
    }
    if (char === ']') {
      const openingIndex = openingBrackets.pop();
      if (openingIndex === undefined) {
        errors.push({
          code: 'unexpected-closing-bracket',
          index,
          message: `Unexpected closing square bracket at index ${index}.`,
        });
      } else if (index === openingIndex + 1) {
        errors.push({
          code: 'empty-bracket-value',
          index: openingIndex,
          message: `Empty square-bracket value at index ${openingIndex}.`,
        });
      }
      continue;
    }
    if (char === delimiter && openingBrackets.length === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }

  if (escaped) {
    errors.push({
      code: 'dangling-escape',
      index: value.length - 1,
      message: `Dangling escape character at index ${value.length - 1}.`,
    });
  }
  for (const index of openingBrackets) {
    errors.push({
      code: 'unclosed-opening-bracket',
      index,
      message: `Opening square bracket at index ${index} is not closed. Use underscores instead of whitespace inside arbitrary values.`,
    });
  }

  parts.push(value.slice(start));
  return { parts, errors };
}

export function splitClassToken(value: string, delimiter: ':' | '.'): string[] {
  return tokenizeClassToken(value, delimiter).parts;
}

export function getClassTokenErrors(value: string): ClassTokenError[] {
  return tokenizeClassToken(value, ':').errors;
}

export function splitResponsiveClassNames(value: string): string[] {
  return splitClassToken(value, '.').filter(Boolean);
}

/**
 * Return the actual class names contained in a normal, short responsive or
 * chained responsive token.
 */
export function getClassNamesFromToken(token: string): string[] {
  const segments = splitClassToken(token, ':');

  if (segments.length === 1) {
    return splitResponsiveClassNames(segments[0]);
  }
  if (segments.length === 2) {
    return splitResponsiveClassNames(segments[1]);
  }

  const classNames: string[] = [];
  for (let index = 0; index < segments.length; index += 2) {
    classNames.push(...splitResponsiveClassNames(segments[index]));
  }
  return classNames;
}
