// 01 Benutzer laden und auswählen. Eigenständiger Ablauf mit dem Kontext aus README.
const target = document.createElement('section');
document.body.append(target);

const scope = scopeDefine({
  selectedName: '',
  users: scopeResource({
    load: ({ signal }) => userApi.list({ signal }),
    errorMessage: 'Benutzer konnten nicht geladen werden.',
  }),
  $fn: {
    select: (user: User): void => { scope.selectedName = user.name; },
    reload: (): void => { void scope.users.reload(); },
  },
  $tpl: prolit_html`
    <button type="button" @click="$fn.reload()" ?disabled="users.pending">Neu laden</button>
    <p *if="users.pending" role="status">Lädt …</p>
    <p *if="users.error" role="alert">{{ users.error.message }}</p>
    <ul>
      <li *for="user of users.data ?? []; user.id">
        <button type="button" @click="$fn.select(user)">{{ user.name }}</button>
      </li>
    </ul>
    <p *if="users.data?.length === 0 && !users.pending && !users.error">Keine Benutzer.</p>
    <p *if="selectedName" role="status">Ausgewählt: {{ selectedName }}</p>
  `,
});

const part = render(prolit(scope), target); // Bindet genau diesen Light-DOM-Einfügepunkt.
const result = await scope.users.reload(); // Erst nach Montage starten.
if (result.status === 'success') {
  console.log(result.data.map(user => user.name)); // Beispieldaten: ['Ada', 'Linus'].
}
// Klick auf Ada: scope.selectedName === 'Ada', Anzeige „Ausgewählt: Ada“.
// error wird im Template angezeigt; cancelled startet keinen Folgeschritt.
// part gehört diesem Ablauf; die passende Freigabe steht in Beispiel 02.
