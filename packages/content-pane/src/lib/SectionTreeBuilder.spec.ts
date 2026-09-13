// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isSectionTreeElement, SectionTreeBuilder } from './SectionTreeBuilder';

function arrange(html: string) {
  const root = document.createElement('div');
  root.innerHTML = html;
  new SectionTreeBuilder(root).arrange(Array.from(root.childNodes));
  return root;
}

describe('SectionTreeBuilder', () => {
  it('infers nesting from heading levels', () => {
    const root = arrange('<h2>Products</h2><h3>A</h3><h3>B</h3>');
    const outer = root.children[0] as HTMLElement;
    expect(outer.tagName).toBe('SECTION');
    expect(Array.from(outer.children).map((el) => el.tagName)).toEqual(['H2', 'SECTION', 'SECTION']);
    expect((outer.children[1] as HTMLElement).querySelector('h3')?.textContent).toBe('A');
    expect((outer.children[2] as HTMLElement).querySelector('h3')?.textContent).toBe('B');
  });

  it('uses explicit heading i as the fixed index for a following implicit HR wrapper', () => {
    const root = arrange('<h2 layout="3;div">Products</h2><hr layout="div"><h4>A</h4>');
    const outer = root.children[0] as HTMLElement;
    const hrSection = outer.children[1] as HTMLElement;
    expect(isSectionTreeElement(outer)).toBe(true);
    expect(isSectionTreeElement(hrSection)).toBe(true);
    expect((outer as any).__IT.i).toBe(30);
    expect((hrSection as any).__IT.i).toBe(35);
    expect((hrSection.children[1] as any).__IT.i).toBe(40);
  });

  it('creates implicit HR layout at last fixed i + 0.5', () => {
    const root = arrange('<h2>Products</h2><hr layout="div"><h3>A</h3>');
    const hrSection = root.querySelector('section > section') as any;
    expect(hrSection.__IT.i).toBe(25);
    expect((hrSection.querySelector('section') as any).__IT.i).toBe(30);
  });

  it('closes an explicitly opened layout level with /i', () => {
    const root = arrange('<hr layout="1;div"><h2>Inside</h2><hr layout="/1;"><h2>Outside</h2>');
    expect(root.children).toHaveLength(2);
    expect(root.children[0].textContent).toContain('Inside');
    expect(root.children[0].textContent).not.toContain('Outside');
    expect(root.children[1].textContent).toBe('Outside');
    expect(root.querySelector('hr[layout^="/"]')).toBeNull();
  });

  it('closes the current layout level with /;', () => {
    const root = arrange('<hr layout="1;div"><h2>Inside</h2><hr layout="/;"><p>Outside</p>');
    expect(root.children).toHaveLength(2);
    expect(root.children[0].textContent).toContain('Inside');
    expect(root.children[1].tagName).toBe('P');
    expect(root.children[1].textContent).toBe('Outside');
  });

  it('reuses an existing level with =i', () => {
    const root = arrange('<h2>One</h2><h3>A</h3><h3 layout="=3;">B</h3>');
    const h3Section = root.querySelector('section > section') as HTMLElement;
    expect(h3Section.querySelectorAll('h3')).toHaveLength(2);
    expect(h3Section.textContent).toBe('AB');
    expect(h3Section.querySelector('h3[layout]')).toBeNull();
  });

  it('skips section creation with !', () => {
    const root = arrange('<h2>One</h2><h3 layout="!;">Inline</h3>');
    const outer = root.children[0] as HTMLElement;
    expect(outer.querySelectorAll(':scope > section')).toHaveLength(0);
    expect(outer.querySelector(':scope > h3')?.textContent).toBe('Inline');
    expect(outer.querySelector(':scope > h3')?.hasAttribute('layout')).toBe(false);
  });

  it('keeps +i and -i as legacy aliases', () => {
    const appendRoot = arrange('<h2>One</h2><h3>A</h3><h3 layout="+3;">B</h3>');
    expect(appendRoot.querySelector('section > section')?.querySelectorAll('h3')).toHaveLength(2);

    const skipRoot = arrange('<h2>One</h2><h3 layout="-3;">Inline</h3>');
    expect(skipRoot.querySelector('section')?.querySelectorAll(':scope > h3')).toHaveLength(1);
  });

  it('throws a clear error when =i has no existing target section', () => {
    expect(() => arrange('<h2>One</h2><h4 layout="=4;">No target</h4>')).toThrow(/no existing section/i);
  });
});
