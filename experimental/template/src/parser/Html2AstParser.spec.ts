import { describe, expect, it } from 'vitest';
import * as Mod from './Html2AstParser';

function createParser() {
  const Ctor = (Mod as any).default ?? (Mod as any).Html2AstParser ?? (Mod as any);
  if (typeof Ctor !== 'function') {
    throw new Error('Html2AstParser is not exported. Please export the class from src/parser/Html2AstParser.ts');
  }
  return new Ctor();
}

describe('Html2AstParser', () => {
  it('parses mixed content, including doctype, PI, comments, stray "<", inline elements and void elements', () => {
    const parser = createParser();
    const html =
      "<!DOCTYPE html><?xml version='1.0'?><div><span>Hello</span><!--c--></div>text < 5 <b>bold</b><img src='x'><input disabled>";
    const nodes = parser.parse(html);

    // 0: Declaration (doctype)
    expect(nodes[0]).toMatchObject({ type: 'other', textContent: '!DOCTYPE html' });

    // 1: Processing instruction
    expect(nodes[1]).toMatchObject({ type: 'other', textContent: "?xml version='1.0'" });

    // 2: <div> with <span>Hello</span> and <!--c-->
    expect(nodes[2]).toMatchObject({ type: 'element', tagName: 'div', isVoid: false });
    const divChildren = (nodes[2] as any).children;
    expect(Array.isArray(divChildren)).toBe(true);
    expect(divChildren.length).toBe(2);
    // <span>Hello</span>
    expect(divChildren[0]).toMatchObject({ type: 'element', tagName: 'span', isVoid: false });
    expect(divChildren[0].children[0]).toMatchObject({ type: 'text', textContent: 'Hello' });
    // <!--c-->
    expect(divChildren[1]).toMatchObject({ type: 'other', textContent: 'c' });

    // 3: Text node with stray '<' that is not a tag start
    expect(nodes[3]).toMatchObject({ type: 'text', textContent: 'text < 5 ' });

    // 4: <b>bold</b>
    expect(nodes[4]).toMatchObject({ type: 'element', tagName: 'b', isVoid: false });
    expect(nodes[4].children[0]).toMatchObject({ type: 'text', textContent: 'bold' });

    // 5: <img src='x'> (void element by tag name)
    expect(nodes[5]).toMatchObject({ type: 'element', tagName: 'img', isVoid: true });
    expect(nodes[5].children).toEqual([]);
    expect(nodes[5].attributes).toEqual([{ name: 'src', value: 'x' }]);

    // 6: <input disabled> (boolean attribute without value)
    expect(nodes[6]).toMatchObject({ type: 'element', tagName: 'input', isVoid: true });
    const inputAttrs = (nodes[6] as any).attributes;
    expect(inputAttrs.find((a: any) => a.name === 'disabled')).toBeTruthy();
    expect(inputAttrs.find((a: any) => a.name === 'disabled')!.value).toBeUndefined();
  });

  it('supports repeated attributes and self-closing non-void elements', () => {
    const parser = createParser();
    const html = "<a rel='1' rel=2></a><div/>";
    const nodes = parser.parse(html);

    // <a rel='1' rel=2></a>
    expect(nodes[0]).toMatchObject({ type: 'element', tagName: 'a', isVoid: false });
    expect(nodes[0].attributes).toEqual([
      { name: 'rel', value: '1' },
      { name: 'rel', value: '2' },
    ]);
    expect(nodes[0].children).toEqual([]);

    // <div/> should be treated as void because of self-closing syntax
    expect(nodes[1]).toMatchObject({ type: 'element', tagName: 'div', isVoid: true });
    expect(nodes[1].children).toEqual([]);
  });

  it('throws on mismatched closing tags', () => {
    const parser = createParser();
    const html = '<div><span></div>';
    expect(() => parser.parse(html)).toThrow(/Mismatched closing tag/);
  });

  it('throws on unclosed tags at end of input', () => {
    const parser = createParser();
    const html = '<p>';
    expect(() => parser.parse(html)).toThrow(/Unclosed tag <p>/);
  });
});
