import { AstHtmlElement } from './ast-type';

/**
 * Parses HTML strings into the AST format. Does not use DOM parser to allow repeated attributes.
 */
export class Html2AstParser {
  parse(html: string): AstHtmlElement[] {
    const scanner = new Scanner(html);
    const parser = new Parser(scanner);
    return parser.parseDocument();
  }
}

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
  // historical/less common
  'command',
  'keygen',
  'menuitem',
]);

class Parser {
  constructor(private s: Scanner) {}

  parseDocument(): AstHtmlElement[] {
    return this.parseNodes();
  }

  private parseNodes(expected?: { tag: string; line: number; col: number }): AstHtmlElement[] {
    const nodes: AstHtmlElement[] = [];
    while (!this.s.eof()) {
      // Handle closing tag for current context
      if (this.s.startsWith('</')) {
        const { line, col } = this.s.position();
        const closing = this.parseClosingTag();
        if (!expected) {
          this.s.throwError(`Unexpected closing tag </${closing}>`, line, col);
        }
        if (closing.toLowerCase() !== expected.tag.toLowerCase()) {
          this.s.throwError(
            `Mismatched closing tag: expected </${expected.tag}>, found </${closing}> (opened at line ${expected.line}, col ${expected.col})`,
            line,
            col,
          );
        }
        // Proper closing tag for this scope
        return nodes;
      }

      // Text or tag
      if (this.s.peek() === '<') {
        if (this.s.startsWith('<!--')) {
          nodes.push(this.parseComment());
          continue;
        } else if (this.s.startsWith('<!')) {
          nodes.push(this.parseDeclaration());
          continue;
        } else if (this.s.startsWith('<?')) {
          nodes.push(this.parseProcessingInstruction());
          continue;
        } else if (this.isTagStart()) {
          nodes.push(this.parseElement());
          continue;
        } else {
          // It's a stray '<' that is not starting a tag; treat it as text
          nodes.push(this.parseText());
          continue;
        }
      } else {
        nodes.push(this.parseText());
        continue;
      }
    }

    if (expected) {
      // EOF reached but we expected a closing tag
      this.s.throwError(
        `Unclosed tag <${expected.tag}> (opened at line ${expected.line}, col ${expected.col}) before end of input`,
        this.s.line,
        this.s.col,
      );
    }

    return nodes;
  }

  private isTagStart(): boolean {
    // After '<', a valid tag starts with letter (a-z), or '/' (handled elsewhere), or '!' (declaration), or '?'
    const c1 = this.s.peek(0);
    const c2 = this.s.peek(1);
    if (c1 !== '<') return false;
    if (!c2) return false;
    if (c2 === '/' || c2 === '!' || c2 === '?') return true;
    return isAlpha(c2);
  }

  private parseText(): AstHtmlElement {
    let text = '';
    const start = this.s.position();
    while (!this.s.eof()) {
      const ch = this.s.peek();
      if (ch === '<') {
        // If it looks like a tag, stop. Otherwise consume '<' as text.
        if (
          this.s.startsWith('<!--') ||
          this.s.startsWith('</') ||
          this.s.startsWith('<!') ||
          this.s.startsWith('<?')
        ) {
          break;
        }
        const c2 = this.s.peek(1);
        if (c2 && isAlpha(c2)) {
          break;
        }
        // Not a valid tag start, consume '<'
        text += this.s.next()!;
        continue;
      }
      text += this.s.next()!;
    }
    return {
      type: 'text',
      textContent: text,
    };
  }

  private parseComment(): AstHtmlElement {
    const start = this.s.position();
    this.s.consumeExpected('<!--');
    const content = this.s.readUntilSequence('-->', () =>
      this.s.throwError('Unterminated comment. Expected -->', start.line, start.col),
    );
    this.s.consumeExpected('-->');
    return {
      type: 'other',
      textContent: content,
    };
  }

  private parseDeclaration(): AstHtmlElement {
    const start = this.s.position();
    this.s.consumeExpected('<!');
    // Doctype, CDATA, or other declaration - read until '>'
    const content = this.s.readUntilChar('>', () =>
      this.s.throwError('Unterminated declaration. Expected >', start.line, start.col),
    );
    this.s.consumeExpected('>');
    return {
      type: 'other',
      textContent: `!${content}`,
    };
  }

  private parseProcessingInstruction(): AstHtmlElement {
    const start = this.s.position();
    this.s.consumeExpected('<?');
    const content = this.s.readUntilSequence('?>', () =>
      this.s.throwError('Unterminated processing instruction. Expected ?>', start.line, start.col),
    );
    this.s.consumeExpected('?>');
    return {
      type: 'other',
      textContent: `?${content}`,
    };
  }

  private parseClosingTag(): string {
    const start = this.s.position();
    this.s.consumeExpected('</');
    this.s.skipWhitespace();
    const name = this.readTagName();
    if (!name) {
      this.s.throwError('Invalid closing tag name', start.line, start.col);
    }
    this.s.skipWhitespace();
    if (this.s.peek() !== '>') {
      const pos = this.s.position();
      this.s.throwError(`Expected '>' after closing tag </${name}>`, pos.line, pos.col);
    }
    this.s.next(); // '>'
    return name!;
  }

  private parseElement(): AstHtmlElement {
    const openPos = this.s.position();
    this.s.consumeExpected('<');
    const tagName = this.readTagName();
    if (!tagName) {
      this.s.throwError('Invalid tag name after "<"', openPos.line, openPos.col);
    }
    const attributes: Array<{ name: string; value?: string }> = [];
    let selfClosing = false;

    while (!this.s.eof()) {
      this.s.skipWhitespace();
      if (this.s.startsWith('/>')) {
        selfClosing = true;
        this.s.consumeExpected('/>');
        break;
      }
      const ch = this.s.peek();
      if (ch === '>') {
        this.s.next();
        break;
      }
      if (ch === null) {
        this.s.throwError('Unexpected end of input inside start tag', openPos.line, openPos.col);
      }

      // Parse attribute
      const attr = this.parseAttribute();
      attributes.push(attr);
    }

    const tagLower = tagName!.toLowerCase();
    const isVoid = selfClosing || VOID_ELEMENTS.has(tagLower);

    if (isVoid) {
      return {
        type: 'element',
        tagName: tagName!,
        attributes,
        children: [],
        isVoid: true,
      };
    }

    // Parse children until matching closing tag
    const children = this.parseNodes({ tag: tagName!, line: openPos.line, col: openPos.col });
    return {
      type: 'element',
      tagName: tagName!,
      attributes,
      children,
      isVoid: false,
    };
  }

  private parseAttribute(): { name: string; value?: string } {
    const start = this.s.position();
    const name = this.readAttributeName();
    if (!name) {
      this.s.throwError('Invalid attribute name', start.line, start.col);
    }

    this.s.skipWhitespace();

    let value: string | undefined;
    if (this.s.peek() === '=') {
      this.s.next();
      this.s.skipWhitespace();
      const ch = this.s.peek();
      if (ch === '"' || ch === "'") {
        this.s.next();
        const quote = ch;
        const v = this.s.readUntilChar(quote, () =>
          this.s.throwError(`Unterminated quoted attribute value for "${name}"`, start.line, start.col),
        );
        this.s.consumeExpected(quote);
        value = v;
      } else {
        // Unquoted value: read until whitespace or '>' or '/>'
        let v = '';
        while (!this.s.eof()) {
          const c = this.s.peek();
          if (c === null) break;
          if (isSpace(c) || c === '>' || (c === '/' && this.s.peek(1) === '>')) break;
          v += this.s.next();
        }
        value = v;
      }
    }

    return { name: name!, value };
  }

  private readTagName(): string | null {
    let name = '';
    const c = this.s.peek();
    if (!c || !isAlpha(c)) return null;
    name += this.s.next();
    while (!this.s.eof()) {
      const ch = this.s.peek();
      if (!ch || !isNameChar(ch)) break;
      name += this.s.next();
    }
    return name;
  }

  private readAttributeName(): string | null {
    let name = '';
    const c = this.s.peek();
    if (!c || !isAttrNameStart(c)) return null;
    name += this.s.next();
    while (!this.s.eof()) {
      const ch = this.s.peek();
      if (!ch || !isAttrNameChar(ch)) break;
      name += this.s.next();
    }
    return name;
  }
}

class Scanner {
  private pos = 0;
  public line = 1;
  public col = 1;

  constructor(private input: string) {}

  eof(): boolean {
    return this.pos >= this.input.length;
  }

  peek(ahead = 0): string | null {
    const i = this.pos + ahead;
    if (i < 0 || i >= this.input.length) return null;
    return this.input[i];
  }

  next(): string | null {
    if (this.eof()) return null;
    const ch = this.input[this.pos++];
    if (ch === '\n') {
      this.line += 1;
      this.col = 1;
    } else if (ch === '\r') {
      // Normalize CRLF -> treat \r as part of newline but do not double-count
      if (this.peek() === '\n') {
        // Will be counted by \n
      } else {
        this.line += 1;
        this.col = 1;
      }
    } else {
      this.col += 1;
    }
    return ch;
  }

  startsWith(s: string): boolean {
    return this.input.startsWith(s, this.pos);
  }

  consumeExpected(s: string) {
    if (!this.startsWith(s)) {
      const { line, col } = this.position();
      this.throwError(`Expected "${s}"`, line, col);
    }
    for (let i = 0; i < s.length; i++) this.next();
  }

  readUntilSequence(seq: string, onEof?: () => never): string {
    let out = '';
    while (!this.eof()) {
      if (this.startsWith(seq)) break;
      const ch = this.next();
      if (ch === null) break;
      out += ch;
    }
    if (this.eof() && !this.startsWith(seq) && onEof) onEof();
    return out;
  }

  readUntilChar(char: string, onEof?: () => never): string {
    let out = '';
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === char) break;
      const n = this.next();
      if (n === null) break;
      out += n;
    }
    if (this.eof() && onEof) onEof();
    return out;
  }

  skipWhitespace() {
    while (!this.eof()) {
      const ch = this.peek();
      if (!ch || !isSpace(ch)) break;
      this.next();
    }
  }

  position() {
    return { index: this.pos, line: this.line, col: this.col };
  }

  throwError(message: string, line = this.line, col = this.col): never {
    // Get line from line and column
    const lineContent = this.input.split('\n')[line - 1] || '';
    throw new Error(`[Html2AstParser] ${message} at line ${line}, column ${col}: \n'${lineContent}'`);
  }
}

function isAlpha(ch: string): boolean {
  return /[A-Za-z]/.test(ch);
}

function isNameChar(ch: string): boolean {
  // tag name characters: letters, digits, hyphen, underscore, colon, period
  return /[A-Za-z0-9\-\_\:\.]/.test(ch);
}

function isAttrNameStart(ch: string): boolean {
  return /[A-Za-z_:*@?.]/.test(ch);
}

function isAttrNameChar(ch: string): boolean {
  return /[A-Za-z0-9_:\-.]/.test(ch);
}

function isSpace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f';
}
