import { afterEach, describe, expect, it } from 'vitest';
import './tj-demo-renderer';
import { getDemoCodeSnippet, TjDemoRenderer } from './tj-demo-renderer';

describe('TjDemoRenderer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders demo.markdown via ast-markdown', async () => {
    const renderer = document.createElement('tj-demo-renderer') as TjDemoRenderer;
    document.body.append(renderer);

    await renderer.showDemo({
      markdown: '# Hallo\n\nEin [Link](/demo).',
    });

    expect(renderer.querySelector('h1')?.textContent).toBe('Hallo');
    expect(renderer.querySelector('h1')?.id).toBe('hallo');
    expect(renderer.querySelector('a')?.getAttribute('href')).toBe('/demo');
  });

  it('uses rendered markdown inside wrapper_html', async () => {
    const renderer = document.createElement('tj-demo-renderer') as TjDemoRenderer;
    document.body.append(renderer);

    await renderer.showDemo({
      markdown: '## Inhalt',
      wrapper_html: '<section class="wrapper">{{content}}</section>',
    });

    const wrapper = renderer.querySelector('.wrapper');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector('h2')?.textContent).toBe('Inhalt');
  });

  it('injects the default stylesheet when css is undefined', async () => {
    const renderer = document.createElement('tj-demo-renderer') as TjDemoRenderer;
    document.body.append(renderer);

    await renderer.showDemo({
      html: '<h1>Hallo</h1>',
    });

    expect(renderer.firstElementChild?.tagName).toBe('STYLE');
    expect(renderer.querySelector('.tj-demo-renderer-content')).not.toBeNull();
  });

  it('injects the default stylesheet when css is set to default', async () => {
    const renderer = document.createElement('tj-demo-renderer') as TjDemoRenderer;
    document.body.append(renderer);

    await renderer.showDemo({
      css: 'default',
      html: '<p>Hallo</p>',
    });

    expect(renderer.firstElementChild?.tagName).toBe('STYLE');
    expect(renderer.querySelector('.tj-demo-renderer-content')).not.toBeNull();
  });

  it('prioritizes raw HTML, Markdown, render snippets, and full source', () => {
    expect(getDemoCodeSnippet({ html: '<p>Hello</p>', source: 'full' })?.language).toBe('html');
    expect(getDemoCodeSnippet({ markdown: '# Hello', source: 'full' })?.code).toBe('# Hello');
    expect(getDemoCodeSnippet({ sourceInfo: { example: { code: 'root.append(button);', language: 'js' } }, source: 'full' })?.code)
      .toBe('root.append(button);');
    expect(getDemoCodeSnippet({ source: 'export default {}' })?.label).toBe('Full source');
  });

  it('preserves controls assigned to the renderer controls slot', async () => {
    const renderer = document.createElement('tj-demo-renderer') as TjDemoRenderer;
    const controls = document.createElement('div');
    controls.slot = 'controls';
    controls.textContent = 'Controls';
    renderer.append(controls);
    document.body.append(renderer);

    await renderer.showDemo({ html: '<p>Demo</p>' });

    expect(renderer.querySelector('[slot="controls"]')).toBe(controls);
    expect(renderer.querySelector('.tj-demo-renderer-content')?.textContent).toBe('Demo');
  });
});
