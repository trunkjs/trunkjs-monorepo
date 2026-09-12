/**
 * API DESIGN ONLY: load one user -> edit isolated draft -> save -> typed result.
 * Existing NteDialogComponent owns the dialog. NEW: resource/action, $event,
 * scope lifecycle on any Lit host, and corrected TemplateResult return type.
 * Usage: await UserEditDialog.show({ userId: '42' }). See proposal § 6.
 */
import { NteDialogComponent, type NteDialogComponentOptions, type NteDialogComponentResult } from '@nextrap/nte-dialog-component';
import type { PropertyValues } from 'lit';
import { prolit_html, scopeDefine, scopeResource, scopeAction } from '@trunkjs/prolit';
import { userApi, type User, type UserDraft, type UserEditInput } from './user-api';

export class UserEditDialog extends NteDialogComponent<UserEditInput, User> {
  public scope = scopeDefine({
    $this: this,
    draft: null as UserDraft | null,
    closing: false,
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'email', label: 'E-Mail', type: 'email' },
    ] satisfies { name: keyof UserDraft; label: string; type: string }[],
    user: scopeResource({
      load: ({ signal }, userId: string) => userApi.get(userId, { signal }),
      retainData: false,
      errorMessage: 'Benutzer konnte nicht geladen werden.',
    }),
    $fn: {
      load: async (): Promise<void> => {
        if (this.scope.draft !== null || this.scope.closing) return;
        const result = await this.scope.user.reload(this.input.userId);
        if (result.status === 'success') {
          this.scope.draft = { name: result.data.name, email: result.data.email };
        }
      },
      change: (name: keyof UserDraft, event: Event): void => {
        if (this.scope.draft === null || this.scope.$fn.save.pending || this.scope.closing) return;
        const input = event.currentTarget as HTMLInputElement;
        this.scope.draft = { ...this.scope.draft, [name]: input.value };
      },
      save: scopeAction({
        run: async (): Promise<void> => {
          if (this.scope.draft === null || this.scope.user.pending || this.scope.closing) return;
          const saved = await userApi.save(this.input.userId, { ...this.scope.draft });
          if (!this.isConnected) return; // External removal cannot undo a server write.
          this.scope.closing = true; // Persist succeeded; keep controls locked until removal.
          this.submit(saved);
        },
        errorMessage: 'Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten.',
      }),
      cancel: (): void => {
        if (this.scope.$fn.save.pending || this.scope.closing) return;
        this.scope.closing = true; // Cancel also starts an asynchronous close.
        this.abort();
      },
    },
    $tpl: prolit_html`
      <p *if="user.pending" role="status">Benutzer wird geladen …</p>
      <p *if="user.error" role="alert">{{ user.error.message }}</p>
      <button *if="user.error" type="button" @click="$fn.load()" ?disabled="user.pending">Erneut laden</button>
      <p *if="$fn.save.error" role="alert">{{ $fn.save.error.message }}</p>
      <form *if="draft !== null" @submit="$event.preventDefault(); $fn.save()">
        <fieldset ?disabled="$fn.save.pending || closing">
          <legend>Benutzerdaten</legend>
          <label *for="field of fields; field.name">
            <span>{{ field.label }}</span>
            <input name="{{ field.name }}" type="{{ field.type }}" required
              .value="draft[field.name]" @input="$fn.change(field.name, $event)">
          </label>
          <button type="submit">Speichern</button>
        </fieldset>
      </form>
      <p *if="$fn.save.pending" role="status">Wird gespeichert …</p>
      <button type="button" @click="$fn.cancel()" ?disabled="$fn.save.pending || closing">Abbrechen</button>
    `,
  });

  protected override dialogOptions: NteDialogComponentOptions = { dialogClass: ['size-lg', 'with-shadow'] };

  constructor() {
    super();
    // Every user-dismiss path uses the same synchronous cancel guard.
    // Capture runs before Nextrap's target handler, also before the next render.
    this.addEventListener('dismiss', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.scope.$fn.cancel();
    }, true);
  }

  override open(input: UserEditInput): Promise<NteDialogComponentResult<User>> {
    const result = super.open(input);
    void this.scope.$fn.load(); // Opening, not rendering, starts the read.
    return result;
  }
  protected override renderTitle() { return 'Benutzer bearbeiten'; }
  protected override renderDialog() { return this.scope.$tpl.render(); }
  protected override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    this.dialogOptions = {
      dialogClass: ['size-lg', 'with-shadow'],
      dismiss: this.scope.$fn.save.pending || this.scope.closing ? false : {},
    };
  }
}
customElements.define('app-user-edit-dialog', UserEditDialog);
