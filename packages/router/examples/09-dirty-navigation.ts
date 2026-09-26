import { Router, RouteDirtyEvent, route, setDefaultRouter, withRouter } from '@trunkjs/router';

// Independent of the other examples. Load this as the entry module after the body exists.
// The confirmation UI is application-owned; without setDirtyConfirmation,
// the Router uses window.confirm for dirty events.
const dialog = document.createElement('dialog');
dialog.innerHTML = `
  <p>Discard unsaved changes?</p>
  <form method="dialog">
    <button value="stay">Keep editing</button>
    <button value="leave">Leave page</button>
  </form>
`;
document.body.append(dialog);

function confirmLeave(): Promise<boolean> {
  return new Promise((resolve) => {
    dialog.returnValue = 'stay'; // Escape and closing without a choice keep the editor.
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'leave'), { once: true });
    dialog.showModal();
  });
}

@route({ name: 'editor', path: '/edit' })
class EditorPage extends withRouter(HTMLElement) {
  #events?: AbortController;

  override connectedCallback() {
    super.connectedCallback();
    this.innerHTML = `
      <label>Page title <input type="text" value="Draft"></label>
      <button type="button">Save</button>
      <a href="/done">Open finished page</a>
    `;
    this.#events = new AbortController();
    const signal = this.#events.signal;

    this.querySelector('input')!.addEventListener('input', () => {
      this.dispatchEvent(new RouteDirtyEvent(true)); // The link stays a normal anchor.
    }, { signal });

    // A real save plugin emits this only after persistence succeeds.
    this.addEventListener('editor-saved', () => {
      this.dispatchEvent(new RouteDirtyEvent(false));
    }, { signal });
    this.querySelector('button')!.addEventListener('click', () => {
      // Demo of a completed save. Replace this with the application's save operation.
      this.dispatchEvent(new Event('editor-saved'));
    }, { signal });

  }

  override disconnectedCallback() {
    this.#events?.abort();
    super.disconnectedCallback();
  }
}
customElements.define('example-dirty-editor', EditorPage);

@route({ name: 'done', path: '/done' })
class DonePage extends HTMLElement {
  connectedCallback() { this.textContent = 'Finished page'; }
}
customElements.define('example-dirty-done', DonePage);

const router = new Router([EditorPage, DonePage]);
setDefaultRouter(router);
router.setDirtyConfirmation(confirmLeave); // Configure once for every route.
const outlet = document.createElement('router-content');
document.body.append(outlet);
router.start();
if (!router.current) await router.replace({ name: 'editor' });

// Type a new title, then click "Open finished page": the dialog opens. "Keep
// editing" leaves /edit and the input intact; "Leave page" shows /done.
// After "Save" (the editor-saved event), the same link navigates without a dialog.
// Query changes, navigate()/replace(), and Back/Forward use the same dirty state.
// The Router clears it after a committed navigation; a canceled one remains dirty.
