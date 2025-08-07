import { describe, it, expect } from 'vitest';
import { MarkdownDocument } from '../markdown';
import fs from 'fs';
import path from 'path';

/**
 * Recursively compares two DOM nodes for structural equality.
 * – Ignores purely whitespace text-nodes.
 * – Compares tag-names (case-insensitive) and all attributes.
 * – Compares text-node content trimmed.
 */
function domEqual(a: Node | null, b: Node | null): boolean {
    if (!a || !b) return a === b;

    // Helper – filter out whitespace-only text nodes
    const meaningfulChildren = (n: Node): Node[] =>
        Array.from(n.childNodes).filter(
            (c) => !(c.nodeType === Node.TEXT_NODE && (c.textContent ?? '').trim() === '')
        );

    // Compare node types
    if (a.nodeType !== b.nodeType) return false;

    // Element nodes
    if (a.nodeType === Node.ELEMENT_NODE && b.nodeType === Node.ELEMENT_NODE) {
        const elA = a as HTMLElement;
        const elB = b as HTMLElement;

        // Tag name
        if (elA.tagName.toLowerCase() !== elB.tagName.toLowerCase()) return false;

        // Attributes
        const attrsA = elA.getAttributeNames().sort();
        const attrsB = elB.getAttributeNames().sort();
        if (attrsA.length !== attrsB.length) return false;
        for (let i = 0; i < attrsA.length; i++) {
            if (attrsA[i] !== attrsB[i]) return false;
            if ((elA.getAttribute(attrsA[i]) ?? '') !== (elB.getAttribute(attrsB[i]) ?? ''))
                return false;
        }

        // Children
        const childrenA = meaningfulChildren(elA);
        const childrenB = meaningfulChildren(elB);
        if (childrenA.length !== childrenB.length) return false;
        for (let i = 0; i < childrenA.length; i++) {
            if (!domEqual(childrenA[i], childrenB[i])) return false;
        }
        return true;
    }

    // Text nodes
    if (a.nodeType === Node.TEXT_NODE && b.nodeType === Node.TEXT_NODE) {
        return (a.textContent ?? '').trim() === (b.textContent ?? '').trim();
    }

    // Other node types (comment etc.) – fall back to string compare
    return (a.textContent ?? '') === (b.textContent ?? '');
}

describe('MarkdownDocument – end-to-end rendering', () => {
    const fixtureDir = path.resolve(__dirname, 'fixture');
    const mdInput = fs.readFileSync(
        path.join(fixtureDir, 'demo-input.md'),
        'utf-8'
    );
    const expectedHtml = fs.readFileSync(
        path.join(fixtureDir, 'demo-jekyll-out.html'),
        'utf-8'
    );

    it('produces a DOM structure equivalent to the Jekyll reference output', () => {
        const mdDoc = new MarkdownDocument();
        mdDoc.markdown = mdInput;

        // Actual result
        const producedContainer = mdDoc.getHTML(); // <div>…</div>

        // Expected result wrapped in a container <div>
        const expectedWrapper = document.createElement('div');
        expectedWrapper.innerHTML = expectedHtml;

        const expectedContainer = expectedWrapper.innerHTML;
        const producedContainerString = producedContainer.innerHTML;

        expect(producedContainerString).toBe(expectedContainer);
        expect(domEqual(producedContainer, expectedWrapper)).toBe(true);
    });
});
