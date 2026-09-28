import { scopeDefine } from '@trunkjs/prolit';
import { customElement } from 'lit/decorators.js';
import { ProlitDialogElement } from '@trunkjs/prolit/dialog';
import { route } from '@trunkjs/router';
import './07-dialogs.css';

@route({ name: 'dialog-user', path: '/examples/dialogs/users/:id', presentation: 'dialog', closeTo: '/examples/dialogs' })
@route({ name: 'partial-user', path: 'users/:id', outlet: 'modal', auxiliary: true, presentation: 'dialog' })
@customElement('example-user-dialog')
export class ExampleUserDialog extends ProlitDialogElement<{ id: string }, string> {
  protected override scope = scopeDefine({
    // language=HTML
    $tpl: `
      <label>Name <input .value="name" @input="name = $event.currentTarget.value"></label>
      <p>Editing user {{ id }}</p>
      <button @click="$fn.save()" ?disabled="!name.trim()">Save</button>
      <button @click="$fn.cancel()">Cancel</button>
    `,

    id: '42', name: 'Ada',
    $fn: {
      save: (): void => this.submit(this.scope.name.trim()),
      cancel: (): void => this.abort(),
    },
  });

  protected override dialogOptions = { title: 'Edit user', size: 'md' as const, closeOnBackdrop: true };

  protected override onInput(input: { id: string }): void {
    this.scope.id = input.id;
    this.scope.name = input.id === '42' ? 'Ada' : 'Linus';
  }
}

@route({ name: 'dialog-home', path: '/examples/dialogs' })
@customElement('example-dialog-home')
export class DialogHome extends HTMLElement {
  connectedCallback(): void {
    this.innerHTML = '<label>Background draft <input placeholder="Stays intact with a partial route"></label>';
  }
}
