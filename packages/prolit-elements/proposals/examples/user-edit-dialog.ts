/**
 * Shared dialog for both table variants. API sketch, not an executable demo.
 * Uses the EXISTING NteDialogComponent lifecycle and public show/submit/abort API.
 * NEW in Prolit: event-local $event and correct TemplateResult return type.
 * Usage: await UserEditDialog.show({ userId: '42' }). See proposal § 6.
 */
import { NteDialogComponent, type NteDialogComponentOptions, type NteDialogComponentResult } from '@nextrap/nte-dialog-component';
import type { PropertyValues } from 'lit';
import { prolit_html, scopeDefine } from '@trunkjs/prolit';
import { userApi, type User, type UserDraft, type UserEditInput } from './user-api';

export class UserEditDialog extends NteDialogComponent<UserEditInput, User> {
  public scope = scopeDefine({
    $this: this,
    userId: '',
    draft: { name: '', email: '' } as UserDraft,
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'email', label: 'E-Mail', type: 'email' },
    ] satisfies { name: keyof UserDraft; label: string; type: string }[],
    loading: true,
    loaded: false,
    saving: false,
    error: '',
    $fn: {
      load: async (): Promise<void> => {
        this.scope.loading = true;
        this.scope.loaded = false;
        this.scope.error = '';
        try {
          const user = await userApi.get(this.scope.userId);
          // Separate draft: cancel must not change the table's user object.
          this.scope.draft = { name: user.name, email: user.email };
          this.scope.loaded = true;
        } catch {
          this.scope.error = 'Benutzer konnte nicht geladen werden.';
        } finally {
          this.scope.loading = false;
        }
      },
      change: (name: keyof UserDraft, event: Event): void => {
        const input = event.currentTarget as HTMLInputElement;
        // Root replacement works with today's shallow scope proxy.
        this.scope.draft = { ...this.scope.draft, [name]: input.value };
      },
      save: async (): Promise<void> => {
        if (this.scope.saving || !this.scope.loaded) return;
        this.scope.saving = true;
        this.scope.error = '';
        try {
          const saved = await userApi.save(this.scope.userId, { ...this.scope.draft });
          this.submit(saved);
        } catch {
          this.scope.error = 'Speichern fehlgeschlagen. Bitte erneut versuchen.';
          this.scope.saving = false;
        }
      },
      cancel: (): void => this.abort(),
    },
    $tpl: prolit_html`
      <p *if="loading" role="status">Benutzer wird geladen …</p>
      <p *if="error" role="alert">{{ error }}</p>
      <button *if="error" type="button" @click="$fn.load()" ?disabled="loading || saving">Neu laden</button>
      <form @submit="$event.preventDefault(); $fn.save()">
        <fieldset ?disabled="!loaded || saving">
          <legend>Benutzerdaten</legend>
          <label *for="field of fields; field.name">
            <span>{{ field.label }}</span>
            <input name="{{ field.name }}" type="{{ field.type }}" required
              .value="draft[field.name]" @input="$fn.change(field.name, $event)">
          </label>
          <button type="submit">Speichern</button>
        </fieldset>
        <button type="button" @click="$fn.cancel()" ?disabled="saving">Abbrechen</button>
      </form>
    `,
  });

  protected override dialogOptions: NteDialogComponentOptions = { dialogClass: ['size-lg', 'with-shadow'] };

  override open(input: UserEditInput): Promise<NteDialogComponentResult<User>> {
    this.scope.userId = input.userId;
    // Loading starts at the explicit open boundary; never inside renderDialog().
    void this.scope.$fn.load();
    return super.open(input);
  }

  protected override renderTitle() { return 'Benutzer bearbeiten'; }

  protected override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    // While saving, all dismissal paths must be disabled, not just our button.
    this.dialogOptions = {
      dialogClass: ['size-lg', 'with-shadow'],
      dismiss: this.scope.saving ? false : {},
    };
  }

  protected override renderDialog() { return this.scope.$tpl.render(); }
}

customElements.define('app-user-edit-dialog', UserEditDialog);
