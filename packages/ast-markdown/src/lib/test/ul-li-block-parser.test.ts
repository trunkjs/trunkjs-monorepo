import { describe, it, expect } from 'vitest';
import { ulLiBlockParser } from '../ul-li-block-parser';
import {InlineMarkdownElement} from "../parse-inline-markdown";
import {MarkdownBlockElement} from "../types";

/**
 * Convenience helper – creates a MarkdownBlockElement with the bare minimum
 * fields required by ulLiBlockParser while allowing custom raw-content.
 */
function mdListBlock(content_raw: string): MarkdownBlockElement {
    return {
        type: 'list',
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
 * Returns the plain text contained in a list-item (ignoring formatting).
 * Assumes that the first child element is of type 'text'.
 */
function textOf(item: InlineMarkdownElement): string {
    const first = (item.content as InlineMarkdownElement[])[0];
    return (first?.content as string) ?? '';
}

/**
 * Helper – casts `.content` of a list element back to InlineMarkdownElement[].
 */
function itemsOf(list: InlineMarkdownElement): InlineMarkdownElement[] {
    return list.content as InlineMarkdownElement[];
}

describe('ulLiBlockParser – edge-cases', () => {
    it('parses a simple unordered list with “-”', () => {
        const block = mdListBlock(`- item 1
- item 2`);
        const roots = ulLiBlockParser(block);

        expect(roots.length).toBe(1);
        expect(roots[0].type).toBe('u-list');
        expect(itemsOf(roots[0]).length).toBe(2);
        expect(itemsOf(roots[0])[0].type).toBe('list-item');
        expect(textOf(itemsOf(roots[0])[0])).toBe('item 1');
    });

    it('supports “*” and “+” unordered markers', () => {
        const block = mdListBlock(`* star 1
* star 2

+ plus 1
+ plus 2`);
        const roots = ulLiBlockParser(block);

        // Expect two separate root lists
        expect(roots.length).toBe(2);

        expect(roots[0].type).toBe('u-list');
        expect(textOf(itemsOf(roots[0])[0])).toBe('star 1');

        expect(roots[1].type).toBe('u-list');
        expect(textOf(itemsOf(roots[1])[0])).toBe('plus 1');
    });

    it('parses an ordered list', () => {
        const block = mdListBlock(`1. first
2. second
3. third`);
        const roots = ulLiBlockParser(block);

        expect(roots.length).toBe(1);
        const ol = roots[0];
        expect(ol.type).toBe('o-list');
        expect(itemsOf(ol).length).toBe(3);
        expect(textOf(itemsOf(ol)[2])).toBe('third');
    });

    it('creates nested lists based on 2-space indentation', () => {
        const block = mdListBlock(`- parent
  - child level 1
    - child level 2`);
        const roots = ulLiBlockParser(block);

        const parentItem = itemsOf(roots[0])[0];
        const nestedLvl1 = (parentItem.content as InlineMarkdownElement[])[1];
        expect(nestedLvl1.type).toBe('u-list');

        const lvl1Item = itemsOf(nestedLvl1)[0];
        const nestedLvl2 = (lvl1Item.content as InlineMarkdownElement[])[1];
        expect(nestedLvl2.type).toBe('u-list');
        expect(textOf(itemsOf(nestedLvl2)[0])).toBe('child level 2');
    });

    it('handles tab (\t) indentation (tab = 4 spaces)', () => {
        const block = mdListBlock(`- parent
\t- child`);
        const roots = ulLiBlockParser(block);

        const parentItem = itemsOf(roots[0])[0];
        const nested = (parentItem.content as InlineMarkdownElement[])[1];
        expect(nested.type).toBe('u-list');
        expect(textOf(itemsOf(nested)[0])).toBe('child');
    });

    it('allows mixing ordered list inside unordered parent', () => {
        const block = mdListBlock(`- unordered
  1. ordered child`);
        const roots = ulLiBlockParser(block);

        const parentItem = itemsOf(roots[0])[0];
        const childList = (parentItem.content as InlineMarkdownElement[])[1];
        expect(childList.type).toBe('o-list');
        expect(textOf(itemsOf(childList)[0])).toBe('ordered child');
    });

    it('supports plain text continuation lines inside list-items', () => {
        const block = mdListBlock(`- first line
  continued line`);
        const roots = ulLiBlockParser(block);

        const item = itemsOf(roots[0])[0];
        const children = item.content as InlineMarkdownElement[];
        expect(children.length).toBe(2);
        expect(children[1].type).toBe('text');
        expect(children[1].content).toBe('continued line');
    });

    it('properly resets depth when coming back to lower indentation', () => {
        const block = mdListBlock(`- A
  - B
- C`);
        const roots = ulLiBlockParser(block);

        const rootItems = itemsOf(roots[0]);
        expect(rootItems.length).toBe(2);
        expect(textOf(rootItems[0])).toBe('A');
        expect(textOf(rootItems[1])).toBe('C');
    });

    it('returns an empty array for a list block with only blank lines', () => {
        const block = mdListBlock('\n  \n');
        const roots = ulLiBlockParser(block);
        expect(roots).toEqual([]);
    });
});
