export class SyntaxTesterError extends Error {
  #code: string;
  get code(): string {
    return this.#code;
  }
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SyntaxTesterError';
    this.#code = code;
  }
}

/**
 *
 * @throws SyntaxTesterError
 * @param code
 * @param options
 */
export function isValidSyntax(code: string): void {
  try {
    // Use eval to test the syntax of the code
    new Function(code);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SyntaxTesterError(`Syntax error: ${error.message}`, code);
    } else {
      throw new SyntaxTesterError(String(error), code);
    }
  }
}
