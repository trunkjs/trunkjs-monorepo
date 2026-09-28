import { Router, setDefaultRouter } from '@trunkjs/router';
import { configureProlitDialogs, createDialogRouteRenderer, createSimpleDialogRenderer } from '@trunkjs/prolit-elements';
import './01-light-dom-list';
import './02-api-users';
import { ExampleUserPage } from './03-router-users';
import './04-event-bindings';
import './05-template-syntax';
import './06-shadow-dom';
import { DialogHome, ExampleUserDialog } from './07-dialogs';

// Gallery-only setup; the numbered modules define the components.
const target = document.querySelector<HTMLElement>('#app')!;
const example = location.pathname.startsWith('/examples/dialogs') ? '07' : new URLSearchParams(location.search).get('example');
switch (example) {
  case '07': {
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
    break;
  }
  case '03': {
    const router = new Router([ExampleUserPage]);
    setDefaultRouter(router);
    target.innerHTML = '<router-content></router-content>';
    router.start();
    if (!router.current) router.replace({ name: 'example-user', params: { id: 42 } });
    break;
  }
  case '02': target.innerHTML = '<example-api-users></example-api-users>'; break;
  case '04': target.innerHTML = '<example-event-panel></example-event-panel>'; break;
  case '05': target.innerHTML = '<example-template-syntax></example-template-syntax>'; break;
  case '06':
    target.innerHTML = '<example-embedded-counter><span slot="heading">External widget</span></example-embedded-counter>';
    break;
  default: target.innerHTML = '<example-todo-list heading="Today"></example-todo-list>';
}
