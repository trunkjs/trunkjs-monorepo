import { InlineMarkdownElement } from './parse-inline-markdown';
import { KramdownElement } from './parse-kramdown';

export type MarkdownBlockElement = {
  type:
    | 'paragraph'
    | 'heading'
    | 'hr'
    | 'list'
    | 'code'
    | 'quote'
    | 'link'
    | 'image'
    | 'table'
    | 'html'
    | 'whitespace'
    | 'comment'
    | null;
  heading_level?: number;
  pre_whitespace?: string;
  post_whitespace?: string;
  kramdown?: null | KramdownElement[];

  /**
   * @internal Only used for debugging purposes
   */
  content_raw?: string;
  start_line?: number;
  children?: InlineMarkdownElement[];
};
