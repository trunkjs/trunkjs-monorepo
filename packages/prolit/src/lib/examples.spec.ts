import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExampleTodoList } from '../../examples/01-light-dom-list';
import { ExampleApiUsers } from '../../examples/02-api-users';
import { ExampleUserPage } from '../../examples/03-router-users';
import { ExampleEventPanel } from '../../examples/04-event-bindings';
import { ExampleTemplateSyntax } from '../../examples/05-template-syntax';
import { ExampleEmbeddedCounter } from '../../examples/06-shadow-dom';
import { Router, setDefaultRouter } from '@trunkjs/router';

afterEach(() => {
  document.body.replaceChildren();
  history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('published ProlitElement examples', () => {
  it('reads a reflected attribute and handles light-DOM input, list and click updates', async () => {
    const list = new ExampleTodoList();
    list.setAttribute('heading', 'Today');
    document.body.append(list);
    await list.updateComplete;
    await vi.waitFor(() => expect(list.querySelector('h2')?.textContent).toBe('Today'));
    expect(list.shadowRoot).toBeNull();
    const input = list.querySelector('input')!;
    input.value = 'Write docs';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => expect(list.querySelector('button')?.hasAttribute('disabled')).toBe(false));
    list.querySelector('button')!.click();
    await vi.waitFor(() => expect(list.querySelectorAll('li')).toHaveLength(2));
    expect(list.querySelectorAll('li')[1].textContent).toContain('Write docs');
  });

  it('keeps state separate between two element instances', async () => {
    const first = new ExampleTodoList();
    const second = new ExampleTodoList();
    document.body.append(first, second);
    await Promise.all([first.updateComplete, second.updateComplete]);
    const input = first.querySelector('input')!;
    input.value = 'Only in the first list';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => expect(first.querySelector('button')!.disabled).toBe(false));
    first.querySelector('button')!.click();
    await vi.waitFor(() => expect(first.querySelectorAll('li')).toHaveLength(2));
    expect(second.querySelectorAll('li')).toHaveLength(1);
    expect(second.querySelector('input')!.value).toBe('');
  });

  it('reads and writes through the documented API contract', async () => {
    const users = [{ id: '42', name: 'Ada' }];
    const fetchMock = vi.fn(async (_input: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        const draft = JSON.parse(options.body as string) as { name: string };
        const user = { id: '7', name: draft.name };
        users.push(user);
        return { ok: true, json: async () => user } as Response;
      }
      return { ok: true, json: async () => [...users] } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    const panel = new ExampleApiUsers();
    document.body.append(panel);
    await vi.waitFor(() => expect(panel.querySelectorAll('li')).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/users?q=', expect.objectContaining({
      method: 'GET', signal: expect.any(AbortSignal),
    }));
    const search = panel.querySelector('input')!;
    search.value = 'Ada & Linus';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/users?q=Ada+%26+Linus', expect.objectContaining({
      method: 'GET', signal: expect.any(AbortSignal),
    })));
    const name = panel.querySelector('input[required]')!;
    (name as HTMLInputElement).value = 'Linus';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    panel.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(panel.querySelectorAll('li')).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledWith('/api/users', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ name: 'Linus' }),
    }));
    const post = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!;
    expect(new Headers(post[1]?.headers).get('content-type')).toBe('application/json');
  });

  it('renders a decorated route and navigates through a light-DOM link', async () => {
    const router = new Router([ExampleUserPage]);
    setDefaultRouter(router);
    document.body.innerHTML = '<router-content></router-content>';
    router.start();
    router.replace({ name: 'example-user', params: { id: 42 } });
    try {
      await vi.waitFor(() => expect(document.querySelector('example-user-page h1')?.textContent).toBe('Ada'));
      const link = document.querySelector<HTMLAnchorElement>('example-user-page a[href="/users/7?tab=profile"]')!;
      link.click();
      await vi.waitFor(() => expect(document.querySelector('example-user-page h1')?.textContent).toBe('Linus'));
      expect(router.current?.params['id']).toBe('7');
    } finally {
      router.stop();
    }
  });

  it('binds custom targets and permanently removes a temporary registration', async () => {
    const panel = new ExampleEventPanel();
    document.body.append(panel);
    await panel.updateComplete;
    panel.bus.dispatchEvent(new Event('example:ping'));
    document.dispatchEvent(new CustomEvent('example:note', { detail: { message: 'News' } }));
    const off = panel.listenTemporarily();
    panel.dispatchEvent(new Event('example:temporary'));
    off();
    panel.dispatchEvent(new Event('example:temporary'));
    const messages = () => Array.from(panel.querySelectorAll('li'), (li) => li.textContent);
    await vi.waitFor(() => expect(messages()).toEqual(['bus ping', 'News', 'temporary']));
    panel.remove();
    document.dispatchEvent(new CustomEvent('example:note', { detail: { message: 'Ignored' } }));
    document.body.append(panel);
    await panel.updateComplete;
    document.dispatchEvent(new CustomEvent('example:note', { detail: { message: 'Reconnected' } }));
    await vi.waitFor(() => expect(messages()).toEqual(['bus ping', 'News', 'temporary', 'Reconnected']));
  });

  it('renders structural and attribute directives from the syntax example', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const panel = new ExampleTemplateSyntax();
    document.body.append(panel);
    await panel.updateComplete;
    expect(panel.querySelectorAll('ul li')).toHaveLength(2);
    expect(panel.querySelector('section')?.getAttribute('title')).toBe('About Template options');
    panel.querySelector<HTMLButtonElement>('button')!.click();
    await vi.waitFor(() => expect(panel.querySelectorAll('ul li')).toHaveLength(0));
  });

  it('opts into shadow DOM with imported CSS, a named slot and lifecycle-aware events', async () => {
    const widget = new ExampleEmbeddedCounter();
    widget.innerHTML = '<span slot="heading">External widget</span>';
    document.body.append(widget);
    await widget.updateComplete;
    const root = widget.shadowRoot!;
    expect(root).not.toBeNull();
    expect(widget.querySelector('button')).toBeNull();
    expect(root.querySelector('style')?.textContent).toContain('#303030');
    expect(root.querySelector('slot')!.assignedElements()[0].textContent).toBe('External widget');
    root.querySelector('button')!.click();
    await vi.waitFor(() => expect(root.querySelector('button')!.textContent).toBe('Clicks: 1'));
    expect(root.querySelector('p')!.textContent).toContain('1');
    widget.remove();
    root.querySelector('section')!.dispatchEvent(new Event('click', { bubbles: true }));
    document.body.append(widget);
    await widget.updateComplete;
    root.querySelector('section')!.dispatchEvent(new Event('click', { bubbles: true }));
    await vi.waitFor(() => expect(root.querySelector('p')!.textContent).toContain('2'));
  });
});
