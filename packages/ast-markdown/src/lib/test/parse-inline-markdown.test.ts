import { describe, it, expect } from 'vitest';
import { parse_inline_markdown } from '../parse-inline-markdown';

/**
 * Minimal replica of the public shape returned by parse_inline_markdown
 * needed solely for typing inside the test-file.
 */
type InlineMarkdownElement = {
    type: 'text' | 'link' | 'image' | 'whitespace' | 'html' | null;
    content?: string | InlineMarkdownElement[];
};

/**
 * Helper – flattens InlineMarkdownElement[] back into a plain HTML string.
 * NOTE: Only implements the subset of element-types we need for the tests.
 */
function toHtml(elements: InlineMarkdownElement[]): string {
    let out = '';
    for (const el of elements) {
        switch (el.type) {
            case 'text':
                out += el.content as string;
                break;
            case 'html':
                out += `<${el.content}>`;
                break;
            case 'link':
                out += '<a>';
                out += toHtml(el.content as InlineMarkdownElement[]);
                out += '</a>';
                break;
            case 'image':
                out += '<img>';
                break;
            default:
                break;
        }
    }
    return out;
}

describe('parse_inline_markdown – edge-cases', () => {
    it('formats emphasis / strong / code / strikethrough like kramdown', () => {
        const md =
            'Start **bold** and *em* and __strong__ and _emph_ and `code` and ~~del~~<br>';
        const ast = parse_inline_markdown(md);

        // first node is the formatted text
        expect(ast[0].type).toBe('text');
        expect(ast[0].content).toBe("Start <strong>bold</strong> and <em>em</em> and <strong>strong</strong> and <em>emph</em> and <code>code</code> and <del>del</del><br>");
    });


    it('parses links that contain formatting & HTML in their label', () => {
        const md =
            '[**bold** <span>html</span> text](https://example.com)<br>';
        const ast = parse_inline_markdown(md);

        const link = ast[0];
        expect(link.type).toBe('link');

        const inner = link.content as InlineMarkdownElement[];
        const htmlInside = toHtml(inner);
        expect(htmlInside).toBe(
            '<strong>bold</strong> <span>html</span> text'
        );
    });

    it('parses kramdown for links', () => {
        const md =
            '[text](https://example.com){: .class1}<br>';
        const ast = parse_inline_markdown(md);

        const link = ast[0];
        expect(link.kramdown).toStrictEqual([
            {
                "value": "class1",
                "valueType": "class",
            },
        ]);

    });

    it('parses images with kramdown', () => {
        const md =
            '![text](image.png){: .class1}';
        const ast = parse_inline_markdown(md);

        const img = ast[0];
        expect(img.type).toBe('image');
        expect(img.kramdown).toStrictEqual([
            {
                "value": "class1",
                "valueType": "class",
            },
        ]);
    });
    it('parses images with empty alt text', () => {
        const md =
            '![](image.png)';
        const ast = parse_inline_markdown(md);

        const img = ast[0];
        expect(img.type).toBe('image');

    });
    it('supports an image nested inside a link', () => {
        const md =
            '[![Alt Text](image.png)](https://example.com)<br>';
        const ast = parse_inline_markdown(md);

        const link = ast[0];
        expect(link.type).toBe('link');

        const inner = link.content as InlineMarkdownElement[];
        expect(inner[0].type).toBe('image');
        expect(inner[0].content).toEqual([{type: "text", content: 'Alt Text'}]);
    });

    it('handles multi-line strong emphasis', () => {
        const md = '**Hello\nWorld**<br>';
        const ast = parse_inline_markdown(md);

        const txt = ast[0].content as string;
        expect(txt).toBe('<strong>Hello\nWorld</strong><br>');
    });
});
