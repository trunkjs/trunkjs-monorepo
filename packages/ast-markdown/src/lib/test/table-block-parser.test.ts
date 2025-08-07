import { describe, it, expect } from 'vitest';
import { tableBlockParser } from '../table-block-parser';
import type { InlineMarkdownElement } from '../parse-inline-markdown';
import type { MarkdownBlockElement } from '../types';

/**
 * Helper – creates a bare-minimum MarkdownBlockElement of type "table"
 * so that we can feed arbitrary raw-content into tableBlockParser.
 */
function mdTableBlock(content_raw: string): MarkdownBlockElement {
    return {
        type: 'table',
        heading_level: undefined,
        pre_whitespace: '',
        post_whitespace: '',
        kramdown: null,
        content_raw,
        start_line: 0,
        children: [],
    } as unknown as MarkdownBlockElement;
}

/**
 * Extracts the (first) text-node string contained inside a table-cell.
 * For the purposes of these unit-tests this is sufficient because the
 * parser currently returns simple “text” nodes for plain strings or
 * html-formatted strings when inline formatting is present.
 */
function cellText(cell: InlineMarkdownElement): string {
    const first = (cell.content as InlineMarkdownElement[])[0];
    return (first?.content as string) ?? '';
}

/**
 * Convenience alias – casts `.content` back to an InlineMarkdownElement[].
 */
const elems = (el: InlineMarkdownElement): InlineMarkdownElement[] =>
    el.content as InlineMarkdownElement[];

describe('tableBlockParser – edge-cases', () => {
    it('parses header & body rows separated by --- divider', () => {
        const block = mdTableBlock(`
| Col 1 | Col 2 |
|-------|-------|
|  A    |  B    |
|  C    |  D    |
`);

        const ast = tableBlockParser(block);

        expect(ast.length).toBe(2);

        const head = ast[0];
        const body = ast[1];

        expect(head.type).toBe('table-head');
        expect(body.type).toBe('table-body');

        const headCells = elems(head);
        expect(headCells.length).toBe(2);
        expect(cellText(headCells[0])).toBe('Col 1');
        expect(cellText(headCells[1])).toBe('Col 2');

        const bodyCells = elems(body);
        expect(bodyCells.length).toBe(4);
        expect(bodyCells.map(cellText)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('handles tables without an explicit header (no divider line)', () => {
        const block = mdTableBlock(`
Foo | Bar
Baz | Qux
`);

        const ast = tableBlockParser(block);

        expect(ast.length).toBe(1);
        expect(ast[0].type).toBe('table-body');

        const cells = elems(ast[0]);
        expect(cells.length).toBe(4);
        expect(cells.map(cellText)).toEqual(['Foo', 'Bar', 'Baz', 'Qux']);
    });

    it('trims optional leading / trailing pipes', () => {
        const block = mdTableBlock(`
| X | Y |
|---|---|
|1|2|
`);

        const ast = tableBlockParser(block);

        const headCells = elems(ast[0]);
        const bodyCells = elems(ast[1]);

        expect(cellText(headCells[0])).toBe('X');
        expect(cellText(headCells[1])).toBe('Y');
        expect(cellText(bodyCells[0])).toBe('1');
        expect(cellText(bodyCells[1])).toBe('2');
    });

    it('parses inline markdown inside cells', () => {
        const block = mdTableBlock(`
**Bold** | _Em_
---------|-----
`);

        const ast = tableBlockParser(block);
        const firstCell = elems(ast[0])[0]; // table-head → first cell

        // parse_inline_markdown wraps **Bold** into <strong>Bold</strong>
        expect(cellText(firstCell)).toBe('<strong>Bold</strong>');
    });

    it('returns empty array for a table block that only contains blank lines', () => {
        const block = mdTableBlock('\n   \n');
        const ast = tableBlockParser(block);
        expect(ast).toEqual([]);
    });
});