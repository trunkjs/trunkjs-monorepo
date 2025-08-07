import { describe, it, expect } from 'vitest';
import { astToHtml } from '../ast-to-html';
import { MarkdownBlockElement } from '../types';
import { InlineMarkdownElement } from '../parse-inline-markdown';

/**
 * – returns a fullyinitialised MarkdownBlockElement with sane defaults * Individual tests can override any field via `partial`.
 */
function mdBlock(
    partial: Partial<MarkdownBlockElement> & Pick<MarkdownBlockElement, 'type' | 'content_raw'>
): MarkdownBlockElement {
    return {

        pre_whitespace: '',
        post_whitespace: '',
        kramdown: null,
        start_line: 0,
        children: [],
        heading_level: (partial as any).heading_level,
        // spread at the end so explicit overrides win
        ...partial
    } as MarkdownBlockElement;
}

/** Helper – creates a simple inline “text” node */
const txt = (s: string): InlineMarkdownElement => ({ type: 'text', content: s });

describe('astToHtml – edge-cases', () => {
    it('returns an empty fragment for empty input', () => {
        const frag = astToHtml([]);
        expect(frag.childElementCount).toBe(0);
    });

    it('renders heading block with correct level & content', () => {
        const frag = astToHtml([
            mdBlock({
                type: 'heading',
                heading_level: 3,
                content_raw: '',
                children: [txt('Heading Content')]
            })
        ]);

        const el = frag.children[0] as HTMLElement;
        expect(el.tagName).toBe('H3');
        expect(el.textContent).toBe('Heading Content');
    });

    it('renders list block inside a <ul>', () => {
        const listRoot: InlineMarkdownElement = {
            type: 'u-list',
            content: [
                { type: 'list-item', content: [txt('Item 1')] },
                { type: 'list-item', content: [txt('Item 2')] }
            ]
        };

        const frag = astToHtml([
            mdBlock({
                type: 'list',
                content_raw: '',
                children: [listRoot]
            })
        ]);

        const ul = frag.querySelector('ul')!;
        expect(ul).not.toBeNull();
        expect(ul.children.length).toBe(2);
        expect(ul.children[0].textContent).toBe('Item 1');
        expect(ul.children[1].textContent).toBe('Item 2');
    });

    it('renders code block inside <pre>', () => {
        const code = 'console.log("hi");';
        const frag = astToHtml([
            mdBlock({
                type: 'code',
                children: [{ type: 'text', content: code, lang: 'js' }],
            })
        ]);

        const pre = frag.querySelector('pre')!;
        expect(pre).not.toBeNull();
        expect(pre.textContent).toBe(code);
    });

    it('renders quote block inside <blockquote>', () => {
        const frag = astToHtml([
            mdBlock({
                type: 'quote',
                content_raw: '',
                children: [txt('Block quote')]
            })
        ]);

        const blockquote = frag.querySelector('blockquote')!;
        expect(blockquote).not.toBeNull();
        expect(blockquote.textContent).toBe('Block quote');
    });

    it('injects bare HTML from "html" block directly (multiple root nodes)', () => {
        const raw = '<div id="foo"></div><span class="bar">baz</span>';
        const frag = astToHtml([
            mdBlock({
                type: 'html',
                children: [{ type: 'html', content: raw }],
            })
        ]);

        expect(frag.querySelector('#foo')).not.toBeNull();
        expect(frag.querySelector('.bar')?.textContent).toBe('baz');
        // should be two direct children
        expect(frag.children.length).toBe(2);
        expect(frag.children[0].tagName).toBe('DIV');
        expect(frag.children[1].tagName).toBe('SPAN');
    });

    it('renders paragraph block inside <p>', () => {
        const txtContent = 'Plain paragraph';
        const frag = astToHtml([
            mdBlock({
                type: 'paragraph',
                content_raw: '',
                children: [txt(txtContent)]
            })
        ]);

        const p = frag.querySelector('p')!;
        expect(p).not.toBeNull();
        expect(p.textContent).toBe(txtContent);
    });

    it('falls back to <p> for unknown / unexpected block types', () => {
        const frag = astToHtml([
            mdBlock({
                type: 'whitespace',
                content_raw: '',
                children: [txt('ignored?')]
            })
        ]);

        const p = frag.querySelector('p')!;
        expect(p).not.toBeNull();
        expect(p.textContent).toBe('ignored?');
    });

    it('keeps the original order of blocks', () => {
        const listRoot: InlineMarkdownElement = {
            type: 'u-list',
            content: [{ type: 'list-item', content: [txt('C')] }]
        };

        const frag = astToHtml([
            mdBlock({ type: 'heading', heading_level: 2, content_raw: '', children: [txt('A')] }),
            mdBlock({ type: 'paragraph', content_raw: '', children: [txt('B')] }),
            mdBlock({ type: 'list', content_raw: '', children: [listRoot] })
        ]);

        const tags = Array.from(frag.children).map(el => el.tagName);
        expect(tags).toEqual(['H2', 'P', 'UL']);
    });


});
