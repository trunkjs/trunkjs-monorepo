# Creating Demo Files

## Location and basic definition

Use the package's `demo` directory and the `.demo.ts` suffix:

```text
packages/button/demo/default.demo.ts
packages/button/demo/disabled.demo.ts
```

Import the definition helper from the browser package:

```ts
import { defineDemo } from '@trunkjs/demo-viewer';

export default defineDemo({
  title: 'Default button',
  description: 'The button in its default interactive state.',
  html: '<button type="button">Continue</button>',
});
```

Useful metadata:

- `title?: string` controls the displayed demo label.
- `description?: string` explains the state or interaction.
- `group?: string` groups related demos.
- `tags?: string[]` adds searchable or classifying metadata.
- `filename?: string` overrides the automatically assigned source path; normally omit it.

## HTML files

Use Vite's raw import when substantial markup belongs in a separate file:

```ts
import { defineDemo } from '@trunkjs/demo-viewer';
import html from './default.html?raw';

export default defineDemo({
  title: 'Default button',
  html,
});
```

Keep small, readable markup directly in the definition. Extract it when a separate HTML file makes the demo easier to understand or reuse.

## Markdown

Use `markdown` instead of `html` for formatted explanatory content:

```ts
import { defineDemo } from '@trunkjs/demo-viewer';

export default defineDemo({
  title: 'Typography sample',
  markdown: `# Heading

Paragraph text with a [link](https://example.com).

- First item
- Second item`,
});
```

The viewer renders Markdown through `@trunkjs/ast-markdown`.

## Wrapper HTML

Use `wrapper_html` when the demo content requires a structural context. Include exactly one `{{content}}` placeholder:

```ts
export default defineDemo({
  title: 'Article context',
  wrapper_html: '<article class="article">{{content}}</article>',
  markdown: '## Article heading\n\nArticle content.',
});
```

## Imperative render functions

Use `render(root)` when the demo needs DOM construction, state, or event listeners that are clearer in TypeScript than serialized HTML:

```ts
import { defineDemo } from '@trunkjs/demo-viewer';

export default defineDemo({
  title: 'Counter',
  render(root) {
    let count = 0;
    const output = document.createElement('output');
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = 'Increment';

    const update = () => {
      output.value = String(count);
    };

    button.addEventListener('click', () => {
      count += 1;
      update();
    });

    update();
    root.append(output, button);
  },
});
```

An existing named `render(root)` export is supported for compatibility, but prefer a default `defineDemo(...)` definition when metadata is useful.

## CSS behavior

When `css` is omitted, the viewer injects its default style.

Use `null` for a completely unstyled demo:

```ts
export default defineDemo({
  css: null,
  html: '<button>Browser styles only</button>',
});
```

Use an inline stylesheet when styles should be inserted into the demo:

```ts
import style from './default.scss?inline';

export default defineDemo({
  css: ['default', style],
  html: '<button class="button">Continue</button>',
});
```

Use a URL when the demo should load a generated stylesheet asset:

```ts
import styleUrl from './default.scss?url';

export default defineDemo({
  css: styleUrl,
  html: '<button class="button">Continue</button>',
});
```

If custom CSS is supplied, include `'default'` in the array only when the viewer's default style is also wanted.
