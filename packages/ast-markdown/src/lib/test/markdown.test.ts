import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MarkdownDocument } from '../markdown';

function domEqual(a: Node | null, b: Node | null): boolean {
  if (!a || !b) return a === b;

  const meaningfulChildren = (n: Node): Node[] =>
    Array.from(n.childNodes).filter((c) => !(c.nodeType === Node.TEXT_NODE && (c.textContent ?? '').trim() === ''));

  if (a.nodeType !== b.nodeType) return false;

  if (a.nodeType === Node.ELEMENT_NODE && b.nodeType === Node.ELEMENT_NODE) {
    const elA = a as HTMLElement;
    const elB = b as HTMLElement;

    if (elA.tagName.toLowerCase() !== elB.tagName.toLowerCase()) return false;

    const attrsA = elA.getAttributeNames().sort();
    const attrsB = elB.getAttributeNames().sort();
    if (attrsA.length !== attrsB.length) return false;

    for (let i = 0; i < attrsA.length; i++) {
      if (attrsA[i] !== attrsB[i]) return false;
      if ((elA.getAttribute(attrsA[i]) ?? '') !== (elB.getAttribute(attrsB[i]) ?? '')) return false;
    }

    const childrenA = meaningfulChildren(elA);
    const childrenB = meaningfulChildren(elB);
    if (childrenA.length !== childrenB.length) return false;

    for (let i = 0; i < childrenA.length; i++) {
      if (!domEqual(childrenA[i], childrenB[i])) return false;
    }
    return true;
  }

  if (a.nodeType === Node.TEXT_NODE && b.nodeType === Node.TEXT_NODE) {
    return (a.textContent ?? '').trim() === (b.textContent ?? '').trim();
  }

  return (a.textContent ?? '') === (b.textContent ?? '');
}

describe('MarkdownDocument – fixture rendering', () => {
  const fixtureDir = path.resolve(process.cwd(), 'src/lib/test/fixture');
  const mdInput = fs.readFileSync(path.join(fixtureDir, 'demo-input.md'), 'utf-8');
  const expectedHtml = fs.readFileSync(path.join(fixtureDir, 'demo-jekyll-out.html'), 'utf-8');

  it('renders the demo fixture like the expected Jekyll output', () => {
    const mdDoc = new MarkdownDocument();
    mdDoc.markdown = mdInput;

    const produced = mdDoc.getHTML();
    const expectedWrapper = document.createElement('div');
    expectedWrapper.innerHTML = expectedHtml;

    expect(domEqual(produced, expectedWrapper)).toBe(true);
  });
});
