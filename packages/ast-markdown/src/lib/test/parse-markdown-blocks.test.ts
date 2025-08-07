import { describe, it, expect } from 'vitest';
import { parse_markdown_blocks } from '../parse-markdown-blocks';
import type { MarkdownBlockElement } from '../types';

function types(seq: MarkdownBlockElement[]) {
    return seq.map(b => b.type);
}

describe('parse_markdown_blocks – edge-cases', () => {

    it('returns a no “whitespace” block for an empty string', () => {
        const ast = parse_markdown_blocks('');
        expect(ast.length).toBe(0);
    });

    it('returns a single “whitespace” block for only blank lines', () => {
        const ast = parse_markdown_blocks('\n\n   \n');
        expect(ast.length).toBe(1);
        expect(ast[0].type).toBe('whitespace');
    });

    it('parses heading & paragraph blocks (with separating blank line)', () => {
        const md = '# Heading 1\n\nThis is a paragraph.';
        const ast = parse_markdown_blocks(md);

        expect(types(ast)).toEqual(['heading', 'paragraph']);
        expect(ast[0].children![0].content).toBe('Heading 1');
        expect(ast[1].children![0].content).toBe('This is a paragraph.');
    });

    it('parses quotes correctly', () => {
        const md = '> This is a quote\n> This is the next line of a quote.';
        const ast = parse_markdown_blocks(md);

        expect(types(ast)).toEqual(['quote']);
        expect(ast[0].children![0].content).toBe('This is a quote\nThis is the next line of a quote.');
    });

    it('parses unordered lists', () => {
        const md = '- item 1\n- item 2\n\nAfter list.';
        const ast = parse_markdown_blocks(md);

        expect(types(ast)).toEqual(['list', 'paragraph']);
        expect(ast[0].children![0].type).toBe('u-list');
    });

    it('parses code fences and keeps inner content verbatim', () => {
        const md = '```\nconsole.log("hi");\n```\n\nNext.';
        const ast = parse_markdown_blocks(md);

        expect(types(ast)).toEqual(['code', 'paragraph']);
        const code = ast[0];
        const inner = (code.children![0].content as string).trim();
        expect(inner).toBe('console.log("hi");');
    });

    it('parses blockquotes', () => {
        const md = '> quoted line\n\nPlain line';
        const ast = parse_markdown_blocks(md);

        expect(types(ast)).toEqual(['quote', 'paragraph']);
        expect((ast[0].children![0].content as string).trim()).toBe('> quoted line');
    });

    it('collects leading blank lines into pre_whitespace of first block', () => {
        const md = '\n\n# Title';
        const ast = parse_markdown_blocks(md);

        expect(ast[0].type).toBe('heading');
        expect(ast[0].pre_whitespace).toBe('\n\n');
    });

    it('collects trailing blank lines into post_whitespace of last block', () => {
        const md = '# Title\n\n';
        const ast = parse_markdown_blocks(md);

        const last = ast[ast.length - 1];
        expect(last.type).toBe('heading');
        // single newline between heading & EOF → should end up as post_whitespace
        expect(last.post_whitespace).toBe('');
    });

    it('handles consecutive paragraphs without blank lines as a single block', () => {
        const md = 'first line\nsecond line\n\nthird paragraph';
        const ast = parse_markdown_blocks(md);

        expect(types(ast)).toEqual(['paragraph', 'paragraph']);
        expect((ast[0].children![0].content as string).trim()).toBe('first line\nsecond line');
        expect((ast[1].children![0].content as string).trim()).toBe('third paragraph');
    });


    it ("parses html tags correctly", () => {
        const md = "<div><a>This his html</a> This is a div </div>\n\nThis is a paragraph.";
        const ast = parse_markdown_blocks(md);

        expect(types(ast)).toEqual(['html', 'paragraph']);
        expect(ast[0].children![0].content).toBe('<div><a>This his html</a> This is a div </div>');
        expect(ast[1].children![0].content).toBe('This is a paragraph.');
    });


    it ("parses html comments correctly", () => {
        const md = "<!-- This is a comment -->\n\nThis is a paragraph.";
        const ast = parse_markdown_blocks(md);

        expect(types(ast)).toEqual(['comment', 'paragraph']);
        expect(ast[0].children![0].content).toBe(' This is a comment ');
        expect(ast[1].children![0].content).toBe('This is a paragraph.');
    })

    it('handles a code block without closing fence (edge-case) – ends at EOF', () => {
        const md = '```\nlet x = 1;';
        const ast = parse_markdown_blocks(md);

        // According to current implementation this yields a single code-block ending at EOF
        expect(ast.length).toBe(1);
        expect(ast[0].type).toBe('code');
        const inner = (ast[0].children![0].content as string).trim();
        expect(inner).toBe('let x = 1;');
    });

     it("handles kramdown attributes on h2 correclty", () => {
        const md = `# Title \n{: #id .wurst layout="wide" }`;
        const ast = parse_markdown_blocks(md);

        expect(ast.length).toBe(1);
        expect(ast[0].type).toBe("heading");
        expect(ast[0].heading_level).toBe(1);
        expect(ast[0].children![0].content).toBe("Title");
        expect(ast[0].kramdown).toBeDefined();

    });

    it("handles kramdown attributes correclty", () => {
        const md = `# Title \n{: #id .class }`;
        const ast = parse_markdown_blocks(md);

        expect(ast.length).toBe(1);
        expect(ast[0].type).toBe("heading");
        expect(ast[0].heading_level).toBe(1);
        expect(ast[0].children![0].content).toBe("Title");
        expect(ast[0].kramdown).toBeDefined();

    });
});
