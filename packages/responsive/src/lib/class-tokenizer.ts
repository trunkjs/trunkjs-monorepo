/**
 * Split a responsive class token without treating delimiters inside square
 * brackets as syntax. Regular class tokens stay on the native split fast path.
 */
export function splitClassToken(value: string, delimiter: ':' | '.'): string[] {
  if (!value.includes('[')) {
    return value.split(delimiter);
  }

  const parts: string[] = [];
  let start = 0;
  let bracketDepth = 0;
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
      bracketDepth++;
      continue;
    }
    if (char === ']' && bracketDepth > 0) {
      bracketDepth--;
      continue;
    }
    if (char === delimiter && bracketDepth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(value.slice(start));
  return parts;
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
