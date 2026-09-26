# ProlitElement in NTE modal and offcanvas

This integration belongs in an application that installs `@trunkjs/prolit`, `@trunkjs/prolit-elements`, `@nextrap/nte-dialog-component` and their peer dependencies; the second variant also needs `@nextrap/nte-offcanvas`. It is a copyable application module, not a TrunkJS package dependency. The modal API is implemented in [`NteDialogComponent`](https://github.com/nextrap/nextrap-monorepo/blob/main/nextrap-elements/nte-dialog-component/src/lib/nte-dialog-component.ts).

## 06 — Edit a name in a typed modal

`NteDialogComponent` owns the wrapper, dismissal and `show()` result. The nested `ProlitElement` owns the Prolit scope and rendering. Both bases extend a Lit element, so one class cannot extend both. This composition needs no modal change.

```ts
import { NteDialogComponent } from '@nextrap/nte-dialog-component';
import { prolit_html as html, scopeDefine } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import { html as litHtml } from 'lit';

const editorTemplate = html`
  <label>Name <input .value="name" @input="name = $event.currentTarget.value"></label>
  <button @click="$fn.save()" ?disabled="!name.trim()">Save</button>
`;

class NameEditor extends ProlitElement {
  override scope = scopeDefine({
    name: 'Ada',
    $fn: {
      save: () => this.dispatchEvent(new CustomEvent<string>('name-save', {
        detail: this.scope.name.trim(), bubbles: true, composed: true,
      })),
    },
    $tpl: editorTemplate,
  });

  protected override createRenderRoot() { return this; }
}
customElements.define('prolit-name-editor', NameEditor);

class NameDialog extends NteDialogComponent<void, string> {
  protected override dialogOptions = { dismiss: { backdrop: 'cancel' as const } };

  protected override renderDialog() {
    return litHtml`
      <prolit-name-editor
        @name-save=${(event: CustomEvent<string>) => this.submit(event.detail)}
      ></prolit-name-editor>
    `;
  }
}
customElements.define('prolit-name-dialog', NameDialog);

const result = await NameDialog.show();
if (result.submitted) console.log(result.data); // e.g. 'Ada Lovelace'
```

Typing changes `scope.name` through Prolit's `@input` binding. Save dispatches a composed custom event from the editor; the dialog calls `submit(name)`. Close-button, Escape or the configured `cancel` backdrop returns `{ submitted: false }`. Without that option, the default backdrop action is `shake` and keeps the modal open. After the result, `show()` removes the dialog host; disconnecting the child also disconnects its Prolit scope and any `on()` listeners. No extra cleanup or second render override is needed. `createRenderRoot()` puts the editor's content in light DOM for application CSS; omit it if the editor should use its default shadow root. Import the dialog's Sass mixins in the consuming theme for visual styling.

## The same editor in an offcanvas

`NteOffcanvas` accepts an `HTMLElement` as programmatic `content`; its `open()` and `close()` resolve after transitions. Reuse `NameEditor` from above in the same application module:

```ts
import { NteOffcanvas } from '@nextrap/nte-offcanvas';

const editor = new NameEditor();
const panel = new NteOffcanvas({ content: editor });
await panel.open(); // Attaches the panel to document.body when necessary.

// When the application is done with the panel:
await panel.close();
panel.remove();
```

The offcanvas owns its frame; the editor still owns its Prolit rendering. Unlike `NameDialog.show()`, `open()` signals that the panel is open, not a typed user result, and the caller owns removal, including after user dismissal. The current offcanvas broadcasts close events on `window` with an internal ID, so an application that needs automatic per-instance cleanup on every dismissal may benefit from a public instance-level `closed` event or completion API. That is a separate Nextrap API improvement, not required for the modal example.
