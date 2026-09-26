import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { prolit_html, scopeDefine } from '@trunkjs/prolit';
import { ProlitDialogElement } from './ProlitDialogElement';
import { configureProlitDialogs, type DialogRenderer, type DialogResult } from './dialog-renderer';
import { createSimpleDialogRenderer } from './simple-dialog-renderer';
import { createDialogRouteRenderer } from './dialog-route-renderer';
import { Router, route, setDefaultRouter } from '@trunkjs/router';
import { ExampleUserDialog } from '../../examples/07-dialogs';

class NameDialog extends ProlitDialogElement<{ id: string }, string> {
  override scope = scopeDefine({ name: '', $tpl: prolit_html`<p>{{ name }}</p>` });
  protected override onInput(input: { id: string }): void { this.scope.name = input.id; }
}
customElements.define('test-prolit-name-dialog', NameDialog);
class VoidDialog extends ProlitDialogElement {}
customElements.define('test-prolit-void-dialog', VoidDialog);

let mounted: HTMLElement | undefined;
let dismiss: (() => void) | undefined;
const close = vi.fn(() => mounted?.remove());
const renderer: DialogRenderer = {
  mount(content, _options, onDismiss) {
    mounted = content;
    dismiss = onDismiss;
    document.body.append(content);
    return { close };
  },
};

beforeEach(() => { configureProlitDialogs({ renderer }); close.mockClear(); });
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); history.replaceState({}, '', '/'); });

describe('ProlitDialogElement', () => {
  it('infers required input and result types', () => {
    expectTypeOf(NameDialog.show).toBeFunction();
    // Checked by Vitest typecheck, never executed.
    if (false) {
      // @ts-expect-error non-void input is required
      NameDialog.show();
      // @ts-expect-error result type is string
      new NameDialog().submit(1);
      expectTypeOf(NameDialog.show({ id: '42' })).toEqualTypeOf<Promise<DialogResult<string>>>();
      expectTypeOf(VoidDialog.show()).toEqualTypeOf<Promise<DialogResult<void>>>();
      expectTypeOf(ExampleUserDialog.show({ id: '42' })).toEqualTypeOf<Promise<DialogResult<string>>>();
      new VoidDialog().submit();
    }
  });

  it('sets input before connecting and settles once after cleanup', async () => {
    const result = NameDialog.show({ id: '42' });
    const element = mounted as NameDialog;
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toContain('42');
    element.submit('Ada');
    element.abort();
    await expect(result).resolves.toEqual({ submitted: true, data: 'Ada' });
    expect(close).toHaveBeenCalledOnce();
    expect(element.isConnected).toBe(false);
  });

  it('emits inline results without removing the element', () => {
    const element = new NameDialog();
    const listener = vi.fn();
    element.addEventListener('prolit-dialog-result', listener);
    document.body.append(element);
    element.submit('Ada');
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ submitted: true, data: 'Ada' });
    expect(element.isConnected).toBe(true);
  });

  it('cancels external removal and supports reopening a detached instance', async () => {
    const element = new NameDialog();
    const first = element.open({ id: '42' });
    expect(element.open({ id: '7' })).toBe(first);
    element.remove();
    await expect(first).resolves.toEqual({ submitted: false });
    const second = element.open({ id: '7' });
    dismiss!();
    await expect(second).resolves.toEqual({ submitted: false });
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('handles synchronous renderer dismissal and mount failures', async () => {
    const element = new NameDialog();
    const result = element.open({ id: '42' }, { renderer: {
      mount(content, _options, cancel) { document.body.append(content); cancel(); return { close }; },
    } });
    await expect(result).resolves.toEqual({ submitted: false });
    await expect(element.open({ id: '42' }, { renderer: {
      mount() { throw new Error('mount failed'); },
    } })).rejects.toThrow('mount failed');
  });

  it('renders dimensions, title and close control and restores scroll state', async () => {
    // jsdom has no native modal implementation; exercise our lifecycle around that boundary.
    const showDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
    const closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function () { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function () { this.open = false; } });
    document.body.style.overflow = 'scroll';
    const result = NameDialog.show({ id: '42' }, {
      renderer: createSimpleDialogRenderer(), width: 720, height: '50vh', title: 'Edit',
    });
    const host = document.querySelector('[data-prolit-dialog]')!;
    const dialog = host.shadowRoot!.querySelector('dialog')!;
    expect(dialog.style.width).toBe('720px');
    expect(dialog.style.height).toBe('50vh');
    expect(dialog.getAttribute('aria-label')).toBe('Edit');
    expect(document.body.style.overflow).toBe('hidden');
    host.shadowRoot!.querySelector('button')!.click();
    await expect(result).resolves.toEqual({ submitted: false });
    expect(host.isConnected).toBe(false);
    expect(document.body.style.overflow).toBe('scroll');
    document.body.style.overflow = '';
    if (showDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showDescriptor);
    else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
    if (closeDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeDescriptor);
    else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  });
});

@route({ name: 'routed-name', path: '/edit/:id', presentation: 'dialog', closeTo: '/' })
@route({ name: 'partial-name', path: 'edit/:id', auxiliary: true, outlet: 'modal', presentation: 'dialog' })
class RoutedDialog extends NameDialog {}
customElements.define('test-routed-prolit-dialog', RoutedDialog);

describe('Prolit dialog routes', () => {
  it('retains the background and dialog on parameter changes, and closes only the auxiliary URL', async () => {
    const router = new Router([{ path: '/' }, RoutedDialog]);
    router.setRenderer('dialog', createDialogRouteRenderer());
    setDefaultRouter(router);
    document.body.innerHTML = '<router-content></router-content><router-content name="modal"></router-content>';
    router.navigate('/?tab=one');
    router.navigateOutlet('modal', { name: 'partial-name', params: { id: '42' } });
    const element = mounted as RoutedDialog;
    router.navigateOutlet('modal', { name: 'partial-name', params: { id: '7' } });
    expect(mounted).toBe(element);
    expect(element.scope.name).toBe('7');
    element.submit('Linus');
    await vi.waitFor(() => expect(router.current?.url.pathname).toBe('/'));
    expect(router.current?.query.get('tab')).toBe('one');
    expect(element.isConnected).toBe(false);
  });

  it('opens a direct primary URL and returns to closeTo without history.back', async () => {
    history.replaceState({}, '', '/edit/42');
    const router = new Router([{ path: '/' }, RoutedDialog]);
    router.setRenderer('dialog', createDialogRouteRenderer());
    setDefaultRouter(router);
    document.body.innerHTML = '<router-content></router-content>';
    router.start();
    try {
      expect((mounted as RoutedDialog).scope.name).toBe('42');
      dismiss!();
      await vi.waitFor(() => expect(router.current?.path).toBe('/'));
    } finally { router.stop(); }
  });

  it('disposes on popstate without navigating back into the old route', async () => {
    const router = new Router([{ path: '/' }, RoutedDialog]);
    router.setRenderer('dialog', createDialogRouteRenderer());
    setDefaultRouter(router);
    document.body.innerHTML = '<router-content></router-content>';
    router.start();
    try {
      router.navigate('/edit/42');
      const element = mounted!;
      history.replaceState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      await vi.waitFor(() => expect(element.isConnected).toBe(false));
      expect(router.current?.path).toBe('/');
    } finally { router.stop(); }
  });
});
