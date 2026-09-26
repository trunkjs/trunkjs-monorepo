import { prolit_html as html, scopeDefine } from '@trunkjs/prolit';
import { configureProlitDialogs, createDialogRouteRenderer, createSimpleDialogRenderer, ProlitDialogElement } from '@trunkjs/prolit-elements';
import { Router, route, setDefaultRouter } from '@trunkjs/router';
import { css } from 'lit';

const template = html`
  <label>Name <input .value="name" @input="name = $event.currentTarget.value"></label>
  <p>Editing user {{ id }}</p>
  <button @click="$fn.save()" ?disabled="!name.trim()">Save</button>
  <button @click="$fn.cancel()">Cancel</button>
`;

@route({ name: 'dialog-user', path: '/examples/dialogs/users/:id', presentation: 'dialog', closeTo: '/examples/dialogs' })
@route({ name: 'partial-user', path: 'users/:id', outlet: 'modal', auxiliary: true, presentation: 'dialog' })
export class ExampleUserDialog extends ProlitDialogElement<{ id: string }, string> {
  static override styles = css`
    :host { display: block; font: 16px/1.5 system-ui; }
    input, button { font: inherit; padding: 6px 10px; border: 1px solid #777;
      border-radius: 4px; color: #eee; background: #444; }
    button { cursor: pointer; margin-right: 8px; }
    button:disabled { opacity: .5; }
  `;
  protected override dialogOptions = { title: 'Edit user', size: 'md' as const, closeOnBackdrop: true };
  override scope = scopeDefine({
    id: '42', name: 'Ada',
    $fn: {
      save: (): void => this.submit(this.scope.name.trim()),
      cancel: (): void => this.abort(),
    },
    $tpl: template,
  });

  protected override onInput(input: { id: string }): void {
    this.scope.id = input.id;
    this.scope.name = input.id === '42' ? 'Ada' : 'Linus';
  }
}
customElements.define('example-user-dialog', ExampleUserDialog);

@route({ name: 'dialog-home', path: '/examples/dialogs' })
class DialogHome extends HTMLElement {
  connectedCallback(): void {
    this.innerHTML = '<label>Background draft <input placeholder="Stays intact with a partial route"></label>';
  }
}
customElements.define('example-dialog-home', DialogHome);

export function startDialogExample(target: HTMLElement): Router {
  configureProlitDialogs({ renderer: createSimpleDialogRenderer() });
  const router = new Router([DialogHome, ExampleUserDialog]);
  router.setRenderer('dialog', createDialogRouteRenderer());
  setDefaultRouter(router);
  target.innerHTML = `
    <nav>
      <a href="/examples/dialogs">Home</a>
      <a href="/examples/dialogs/users/42">Normal dialog route</a>
      <a href="/examples/dialogs(modal:users/42)">Partial dialog route</a>
      <a href="/examples/dialogs(modal:users/7)">Change partial-route user</a>
    </nav>
    <p><button data-open>Open programmatically</button>
      <label>Size <select data-size><option>sm</option><option selected>md</option><option>lg</option><option>fullscreen</option></select></label></p>
    <output></output>
    <router-content></router-content><router-content name="modal"></router-content>
    <h2>The same component inline</h2><example-user-dialog></example-user-dialog>`;
  target.querySelector('[data-open]')!.addEventListener('click', async () => {
    const size = target.querySelector<HTMLSelectElement>('[data-size]')!.value as 'sm' | 'md' | 'lg' | 'fullscreen';
    const result = await ExampleUserDialog.show({ id: '42' }, { size });
    target.querySelector('output')!.textContent = result.submitted ? `Saved: ${result.data}` : 'Cancelled';
  });
  target.querySelector('example-user-dialog')!.addEventListener('prolit-dialog-result', (event) => {
    const result = (event as CustomEvent<{ submitted: boolean; data?: string }>).detail;
    target.querySelector('output')!.textContent = result.submitted ? `Inline saved: ${result.data}` : 'Inline cancelled';
  });
  router.start();
  if (!router.current) router.replace('/examples/dialogs');
  return router;
}
