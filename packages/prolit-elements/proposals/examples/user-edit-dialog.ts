// 03 Eigene User-Dialogkomponente auf der vorhandenen Nextrap-Basis.
// Separater Ablauf; verwendet denselben userApi-Dienst wie 01.
class UserEditDialog extends NteDialogComponent<UserEditInput, User> {
  public readonly contentScope = scopeDefine({
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
        if (this.contentScope.draft !== null || this.contentScope.closing) return;
        const result = await this.contentScope.user.reload(this.input.userId);
        if (result.status === 'success') {
          this.contentScope.draft = { name: result.data.name, email: result.data.email };
        }
      },
      change: (name: keyof UserDraft, event: Event): void => {
        if (this.contentScope.draft === null || this.contentScope.$fn.save.pending || this.contentScope.closing) return;
        const input = event.currentTarget as HTMLInputElement;
        this.contentScope.draft = { ...this.contentScope.draft, [name]: input.value };
      },
      save: scopeAction({
        run: async (): Promise<void> => {
          if (this.contentScope.draft === null || this.contentScope.user.pending || this.contentScope.closing) return;
          const saved = await userApi.save(this.input.userId, { ...this.contentScope.draft });
          if (!this.isConnected) return; // External removal cannot undo a server write.
          this.contentScope.closing = true; // Persist succeeded; keep controls locked until removal.
          this.submit(saved);
        },
        errorMessage: 'Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten.',
      }),
      cancel: (): void => {
        if (this.contentScope.$fn.save.pending || this.contentScope.closing) return;
        this.contentScope.closing = true; // Cancel also starts an asynchronous close.
        this.abort();
      },
    },
    $hooks: { $connect: (): void => { void this.contentScope.$fn.load(); } },
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

  constructor() {
    super();
    // Every user-dismiss path uses the same synchronous cancel guard.
    // Capture runs before Nextrap's target handler, also before the next render.
    this.addEventListener('dismiss', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.contentScope.$fn.cancel();
    }, true);
  }

  // show(input) setzt input synchron vor dem ersten Rendern.
  // Der Mount-Hook des Scopes startet danach den Read; kein Request in renderDialog.
  protected override renderTitle() { return 'Benutzer bearbeiten'; }
  protected override renderDialog() {
    return html`${prolit(this.contentScope)}`;
  }
}
customElements.define('app-user-edit-dialog', UserEditDialog);

const result = await UserEditDialog.show({ userId: '42' });
if (result.submitted) {
  console.log(result.data.name); // Nach Bearbeiten/Speichern: 'Ada Lovelace'.
}
// Abbrechen: { submitted: false }. Ein Save-Fehler bleibt im offenen Dialog sichtbar.
