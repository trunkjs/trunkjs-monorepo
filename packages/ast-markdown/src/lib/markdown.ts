import { astToHtml } from './ast-to-html';
import { parse_markdown_blocks } from './parse-markdown-blocks';
import { MarkdownBlockElement } from './types';

export class MarkdownDocument {
  private _ast: MarkdownBlockElement[] = [];

  set markdown(value: string) {
    this._ast = parse_markdown_blocks(value);
  }

  public getHTML(): HTMLDivElement {
    return astToHtml(this._ast);
  }
}
