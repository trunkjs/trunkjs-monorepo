import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountTodoList } from '../../examples/01-light-dom-list';
import { mountApiUsers } from '../../examples/02-api-users';
import { startRouterExample } from '../../examples/03-router-users';
import { mountEventPanel } from '../../examples/04-event-bindings';
import { mountTemplateSyntax } from '../../examples/05-template-syntax';

afterEach(() => {
  document.body.replaceChildren();
  history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('published ProlitElement examples', () => {
  it('reads a reflected attribute and handles light-DOM input, list and click updates', async () => {
    const list = mountTodoList(document.body);
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
    const panel = mountApiUsers(document.body);
    await vi.waitFor(() => expect(panel.shadowRoot?.querySelectorAll('li')).toHaveLength(1));
    const name = panel.shadowRoot!.querySelector('input[required]')!;
    (name as HTMLInputElement).value = 'Linus';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    panel.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(panel.shadowRoot?.querySelectorAll('li')).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledWith('/api/users', expect.objectContaining({ method: 'POST' }));
  });

  it('renders a decorated route and navigates through a light-DOM link', async () => {
    const router = startRouterExample(document.body);
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
    const panel = mountEventPanel(document.body);
    await panel.updateComplete;
    panel.bus.dispatchEvent(new Event('example:ping'));
    document.dispatchEvent(new CustomEvent('example:note', { detail: { message: 'News' } }));
    const off = panel.listenTemporarily();
    panel.dispatchEvent(new Event('example:temporary'));
    off();
    panel.dispatchEvent(new Event('example:temporary'));
    expect(panel.state.messages).toEqual(['bus ping', 'News', 'temporary']);
    panel.remove();
    document.dispatchEvent(new CustomEvent('example:note', { detail: { message: 'Ignored' } }));
    expect(panel.state.messages).toHaveLength(3);
  });

  it('renders structural and attribute directives from the syntax example', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const panel = mountTemplateSyntax(document.body);
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelectorAll('ul li')).toHaveLength(2);
    expect(panel.shadowRoot?.querySelector('section')?.getAttribute('title')).toBe('About Template options');
    panel.state.visible = false;
    await vi.waitFor(() => expect(panel.shadowRoot?.querySelectorAll('ul li')).toHaveLength(0));
  });
});
