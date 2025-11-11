import { PeekType, TokenReader2 } from '../tool/TokenReader2';
import { parse_inline_markdown } from './parse-inline-markdown';
import { parse_kramdown } from './parse-kramdown';
import { tableBlockParser } from './table-block-parser';
import { MarkdownBlockElement } from './types';
import { ulLiBlockParser } from './ul-li-block-parser';

function readBlocks(input: string): string[] {
  const tr = new TokenReader2(input);
  let blocks: string[] = [];
  let firstblock = true;
  while (tr.hasMore()) {
    let ret = tr.readUntil(/\n\n(```|<!--|\S)/m, PeekType.Peek);
    blocks.push((firstblock ? '\n\n' : '') + ret.content);
    firstblock = false;
    switch (ret.match) {
      case '\n\n```':
        let curData = tr.read(5);
        curData += tr.readUntil('```', PeekType.Include).content;
        blocks.push(curData);
        break;
      case '\n\n<!--':
        blocks.push(tr.readUntil('-->', PeekType.Include).content);
        break;
      default:
        tr.read(2);
        break;
    }
  }
  return blocks;
}

export function parse_markdown_blocks(input: string): MarkdownBlockElement[] {
  let document: MarkdownBlockElement[] = [];

  let blocks = readBlocks(input);

  let pre_whitespace = '';

  for (let curBlock of blocks) {
    if (curBlock === '') {
      continue;
    }
    if (curBlock.trim() === '') {
      pre_whitespace += curBlock;
      continue;
    }
    const tr = new TokenReader2(curBlock);

    const block: MarkdownBlockElement = {
      type: null,
      pre_whitespace: pre_whitespace + tr.readWhiteSpace(),
      content_raw: tr.rest,
      post_whitespace: '',
    };
    pre_whitespace = '';

    let content = tr.rest;
    const contentArr = content.split('\n');

    if (contentArr[contentArr.length - 1].startsWith('{:')) {
      block.kramdown = parse_kramdown(contentArr.pop() as string).elements;
      content = contentArr.join('\n');
    }
    const peekResult = tr.peek(['<!--', '```', '---', '#', '-', '*', '+', '|', '<', '>']);
    switch (peekResult) {
      case '<!--':
        block.type = 'comment';
        content = content.substring(4, content.length - 3);
        block.children = [{ type: 'text', content }];
        break;
      case '---':
        block.type = 'hr';
        break;
      case '```':
        block.type = 'code';
        let lang = contentArr[0].substring(3).trim();
        contentArr.shift();
        if (contentArr[contentArr.length - 1].endsWith('```')) {
          contentArr.pop();
        }

        block.children = [{ type: 'text', content: contentArr.join('\n'), lang }];
        break;
      case '#':
        block.type = 'heading';
        block.heading_level = content.split(' ')[0].length;
        block.children = parse_inline_markdown(content.substring(block.heading_level).trim());
        break;
      case '-':
      case '*':
      case '+':
        block.type = 'list';
        block.children = ulLiBlockParser(block);
        break;
      case '|':
        block.type = 'table';
        block.children = tableBlockParser(block);
        break;
      case '<':
        block.type = 'html';
        block.children = [{ type: 'html', content: content }];
        break;
      case '>':
        block.type = 'quote';
        // Remove trailing ">" from every line
        content = content
          .split('\n')
          .map((line) => line.replace(/^>\s*/, ''))
          .join('\n');
        block.children = parse_inline_markdown(content);
        break;
      default:
        block.type = 'paragraph';
        block.children = parse_inline_markdown(content);
    }

    document.push(block);
  }

  if (pre_whitespace !== '') {
    document.push({ type: 'whitespace', pre_whitespace: pre_whitespace });
  }
  return document;
}
