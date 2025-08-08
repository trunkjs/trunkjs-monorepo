export interface ErrorLocation {
  file?: string;
  line?: number;
  column?: number;
}

export function getErrorLocation(
  err: Error & {
    lineNumber?: number;
    columnNumber?: number;
    fileName?: string;
    sourceURL?: string;
    line?: number;
    column?: number;
  },
): ErrorLocation {
  // Firefox
  if (typeof err.lineNumber === 'number') {
    return {
      file: err.fileName || err.sourceURL,
      line: err.lineNumber,
      column: err.columnNumber ?? undefined,
    };
  }
  // Safari
  if (typeof err.line === 'number') {
    return {
      file: err.sourceURL,
      line: err.line,
      column: err.column,
    };
  }

  const stack = String(err.stack || err.message || '');
  const lines = stack.split('\n');

  const re = /(.*?)(?:\(|@)?(.*?):(\d+):(\d+)\)?$/;

  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      return { file: m[2], line: +m[3], column: +m[4] };
    }
  }
  return { file: err.fileName || err.sourceURL };
}
