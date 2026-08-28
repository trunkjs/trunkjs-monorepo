# ast-markdown

Small markdown parser that converts markdown into an AST and renders it to HTML.

## Example

```ts
import { MarkdownDocument } from '@trunkjs/ast-markdown';

const doc = new MarkdownDocument();
doc.markdown = '# Hello\n\nThis is a [link](/test)';

const html = doc.getHTML();
console.log(html.innerHTML);
// <h1 id="hello">Hello</h1>...
```

## Building

Run `nx build ast-markdown` to build the library.

## Running unit tests

Run `nx test ast-markdown` to execute the unit tests via [Vitest](https://vitest.dev/).
