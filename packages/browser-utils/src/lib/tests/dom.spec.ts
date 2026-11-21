// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { dom } from '../dom';

// Prüft, dass Lit-Bindings beim einmaligen Überführen ins DOM erhalten bleiben.
describe('dom', () => {
  it('returns a fragment and inserts interpolated strings as text', () => {
    const text = '<img src=x onerror=alert(1)>';
    const fragment = dom`<span>${text}</span><strong>Ende</strong>`;
    expect(fragment).toBeInstanceOf(DocumentFragment);
    expect(fragment.querySelector('span')?.textContent).toBe(text);
    expect(fragment.querySelector('img')).toBeNull();
    expect(fragment.children).toHaveLength(2);
  });

  it('preserves attributes, properties and listeners after insertion', () => {
    const clicked = vi.fn();
    const fragment = dom`<button type="button" aria-label=${'Bearbeiten'} @click=${clicked}>Bearbeiten</button><input .value=${'Entwurf'} ?required=${true}>`;
    const container = document.createElement('div');
    container.append(fragment);
    expect(fragment.childNodes).toHaveLength(0);
    const button = container.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Bearbeiten');
    button.click();
    expect(clicked).toHaveBeenCalledOnce();
    expect(container.querySelector('input')?.value).toBe('Entwurf');
    expect(container.querySelector('input')?.required).toBe(true);
  });

  it('creates independent content for each invocation', () => {
    // Dieselbe Template-Stelle darf keine bereits eingefügten Nodes wiederverwenden.
    const create = (text: string) => dom`<span>${text}</span>`;
    const first = create('Erste');
    const second = create('Zweite');
    expect(first.querySelector('span')).not.toBe(second.querySelector('span'));
    expect(first.textContent).toBe('Erste');
    expect(second.textContent).toBe('Zweite');
  });
});
