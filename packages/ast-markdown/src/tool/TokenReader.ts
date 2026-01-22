export type TokenReaderValue = {
  value_str: string;
  value_number: number | null;
  quoted: boolean;
  column: number;
};

export type ReadUntilPeekResult = {
  value: string;
  // False if eof reached
  peek: string | false;
};

/**
 * TokenReader provides utilities to read tokens like words, expressions, and quoted strings from a line input.
 *
 * @example
 * const tr = new TokenReader('foo bar', 1);
 * const word = tr.readWord(); // 'foo'
 */
export class TokenReader {
  private _line: string;
  private _index = 0;
  private lineNumber: number;

  get __debugInfo(): any {
    return {
      rest: this._line.substring(this.index),
    };
  }

  public get index(): number {
    return this._index;
  }

  public set index(value: number) {
    this._index = value;
  }

  public get line(): string {
    return this._line;
  }

  /**
   * Creates a TokenReader instance.
   *
   * @param input - The input string to tokenize.
   * @param lineNumber - The line number for error reporting (default 1).
   *
   * @example
   * const reader = new TokenReader('some text here', 5);
   */
  constructor(input: string, lineNumber = 1) {
    this._line = input;
    this.lineNumber = lineNumber;
  }

  protected isWhitespace(ch: string | null): boolean {
    return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '\f' || ch === '\v' || ch === null;
  }

  /**
   * Reads all whitespace characters until a non-whitespace character is encountered.
   *
   * @param multiline
   */
  public readWhiteSpace(multiline = true): string {
    let buf = '';
    while (!this.isEOF()) {
      let nextChar = this.peek(1);

      if (nextChar === '\n' && !multiline) {
        break;
      }
      buf += this.readChar();
    }
    return buf;
  }

  /**
   * Checks if the reading position has reached the end of the line.
   *
   * @returns true if at end of input, false otherwise.
   *
   * @example
   * reader.isEOF(); // false
   */
  public isEOF(): boolean {
    return this._index >= this._line.length;
  }

  public more(): boolean {
    return this._index < this._line.length;
  }

  /**
   * Reads a value from the input, which can be a string or number.
   * Handles quoted strings and numbers.
   *
   */
  public readValue(stopChar: string | RegExp = ';'): TokenReaderValue | null {
    this.skipWhitespace();
    if (this.isEOF()) return null;

    const ret: TokenReaderValue = {
      value_str: '',
      value_number: null,
      quoted: false,
      column: this._index,
    };

    // Read quoted string
    const quote = this.peekChar();
    if (quote === '"' || quote === "'") {
      this.readChar(); // consume the quote
      ret.value_str = this.readEscapedString(quote);
      ret.quoted = true;
      let next = this.peekChar();
      if (this.isNextChar(quote)) {
        this.readChar(); // consume the closing quote
      } else {
        throw new Error(this.failmsg(`Unterminated string starting at index ${this._index}`));
      }
      return ret;
    }

    // Read unquoted string or number
    const raw = this.readUntil(stopChar);
    ret.value_str = raw;

    // detect numeric values (support +/- , integer & float)
    const num = Number(raw);
    if (!Number.isNaN(num) && raw.trim() !== '') {
      ret.value_number = num;
    }

    return ret;
  }

  /**
   * Peeks at the next character without advancing the position.
   *
   * @returns The next character or null if at EOF.
   *
   * @example
   * reader.peekChar(); // 'a'
   */
  public peekChar(length = 1): string | null {
    if (this.isEOF()) return null;
    return this._line.substr(this._index, length);
  }

  /**
   * Peeks at the next n characters without advancing the position.
   * @param length
   * @param offset
   */
  public peek(length = 1, offset = 0): string | null {
    if (this.isEOF()) return null;
    return this._line.substring(this._index + offset, this._index + offset + length);
  }

  /**
   * Reads and advances one character.
   *
   * @returns The next character or null if at EOF.
   *
   * @example
   * reader.readChar(); // 'a'
   */
  public readChar(): string | null {
    if (this.isEOF()) return null;
    return this._line[this._index++];
  }

  /**
   * Reads characters until a specified stop character is encountered or EOF.
   * Will not read the stop character.
   *
   * @param stopChar
   * @param includePeek - If true, includes the peek character in the result.
   */
  public readUntil(stopChar: string | RegExp, includePeek = false): string {
    let buf = '';
    while (!this.isEOF()) {
      const ch = this.readChar();
      const nextChar = this.peekChar();
      buf += ch;
      if (typeof stopChar === 'string' && nextChar === stopChar) break;
      if (stopChar instanceof RegExp && stopChar.test(nextChar ?? '')) break;
    }
    if (includePeek && !this.isEOF()) {
      buf += this.readChar();
    }
    return buf;
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  public readUntilPeekRegex(
    peek: string | string[] | RegExp,
    includePeek = false,
  ): { content: string; match: string | null } {
    let regex: RegExp;
    let input = this._line.substring(this._index);

    let result = '';
    if (peek instanceof RegExp) {
      regex = new RegExp(peek.source, peek.flags.includes('s') ? peek.flags : peek.flags + 's');
    } else {
      const pattern = Array.isArray(peek)
        ? peek.map((str) => this.escapeRegExp(str)).join('|')
        : this.escapeRegExp(peek);
      regex = new RegExp(pattern, 's');
    }

    const match = input.match(regex);
    if (!match || match.index === undefined) {
      this.index += input.length;
      return { content: input, match: null };
    }
    result = input.slice(0, match.index);
    this._index += match.index;
    if (includePeek) {
      result += match[0];
      this._index += match[0].length;
    }
    return {
      content: result,
      match: match[0],
    };
  }

  /**
   * Skips any whitespace characters (spaces, tabs, newlines).
   *
   * @example
   * reader.skipWhitespace();
   */
  public skipWhitespace(): void {
    while (!this.isEOF() && /\s/.test(this._line[this._index])) {
      this._index++;
    }
  }

  /**
   * Reads until one of the words (also multiple chars) are reached. Will not read the peek word.
   *
   * @param stopPeek
   * @param multiline
   */
  public readUntilPeek(stopPeek: string[], multiline = true): ReadUntilPeekResult {
    let buf = '';
    while (!this.isEOF()) {
      for (const peekWord of stopPeek) {
        if (this.peek(peekWord.length) === peekWord) {
          return {
            value: buf,
            peek: peekWord,
          };
        }
      }
      const ch = this.readChar();
      if (ch === '\n' && !multiline) {
        break;
      }
      buf += ch;
    }

    return {
      value: buf,
      peek: false,
    };
  }

  /**
   * Reads a word consisting of alphanumeric or underscore characters.
   * Stops at whitespace or non-word boundaries.
   *
   * @returns The word string, or null if none found.
   *
   * @example
   * const word = reader.readWord(); // 'hello' or null
   */
  public readWord(wordRegex = /\w/): string | null {
    this.skipWhitespace();
    if (this.isEOF()) return null;

    let word = '';
    while (!this.isEOF() && wordRegex.test(this._line[this._index])) {
      word += this._line[this._index++];
    }
    return word;
  }

  /**
   * Attempts to read one of the expected expressions.
   * Only accepted expressions will advance the pointer.
   *
   * @param expectedExpressions - List of accepted expressions.
   * @returns Matching expression string or null if none found.
   *
   * @example
   * const expr = reader.readExpression(['>=', '<=', '==']);
   */
  public readExpression(expectedExpressions: string[] = []): string | null {
    this.skipWhitespace();
    if (this.isEOF()) return null;
    const start = this._index;
    let expression: string | null = null;
    for (let curExpression of expectedExpressions) {
      if (this._line.startsWith(curExpression, this._index)) {
        expression = curExpression;
        this._index += expression.length;
        break;
      }
    }
    return expression;
  }

  /**
   * Reads a quoted string, handling escape sequences like \" or \\.
   * Throws an error if the string is unterminated.
   *
   * @param untilChar - The character that closes the quoted string (e.g., '"').
   * @returns The unescaped string content.
   *
   * @throws Error if unterminated string encountered.
   *
   * @example
   * const str = reader.readEscapedString('"'); // returns parsed string inside quotes
   */
  public readEscapedString(untilChar: string): string {
    let escaped = false;
    let str = '';
    while (!this.isEOF()) {
      if (this.peekChar() === untilChar && !escaped) break;
      const ch = this.readChar();

      if (ch === '\\' && !escaped) {
        escaped = true;
        continue;
      }
      str += ch;
      escaped = false;
    }

    if (escaped) {
      throw new Error(this.failmsg(`Unterminated string starting at index ${this._index}`));
    }
    return str;
  }

  /**
   * Generates a formatted fail message with line and column information.
   *
   * @param msg - Error message.
   * @returns Formatted message.
   *
   * @example
   * throw new Error(reader.failmsg('Unexpected character'));
   */
  public failmsg(msg: string): string {
    return `Line ${this.lineNumber}, Col ${this._index + 1}: ${msg}`;
  }

  /**
   * Checks if the next character matches a given character.
   *
   * @param ch - Character to match.
   * @returns true if matches, false otherwise.
   *
   * @example
   * if (reader.isNextChar(')')) { ... }
   */
  public isNextChar(ch: string): boolean {
    return this.peekChar() === ch;
  }

  /**
   * Saves the current reading index.
   *
   * @returns Current index value.
   *
   * @example
   * const saved = reader.saveIndex();
   */
  public saveIndex(): number {
    return this._index;
  }

  /**
   * Restores a previously saved index.
   *
   * @param saved - An index value previously returned by saveIndex().
   *
   * @example
   * reader.restoreIndex(saved);
   */
  public restoreIndex(saved: number): void {
    this._index = saved;
  }
}
