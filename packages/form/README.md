# @trunkjs/form

`@trunkjs/form` bietet `<tj-form>` für registrierte AJAX-Form-Callbacks. Der dynamische Datenzugriff kommt aus
`@trunkjs/browser-utils` und wird vom Element direkt weitergereicht.

## FormDataAccessor

Der Accessor funktioniert mit jedem DOM-Container. Berücksichtigt werden aktuelle Nachfahren mit einem nicht leeren
`name` und einer `value`-Property.

```ts
import { FormDataAccessor } from '@trunkjs/browser-utils';

const accessor = new FormDataAccessor(document.querySelector('#profile')!);

accessor.data = { name: 'Erika', topics: ['docs'] };
console.log(accessor.data);
console.log(accessor.formData);

accessor.entries.forEach(({ name, value, element }) => {
  console.log(name, value, element);
});
```

`entries` wird bei jedem Zugriff neu aus dem DOM aufgebaut. Jeder Eintrag enthält das originale Element und eine
dynamische `value`-Property, die direkt vom Element liest oder darauf schreibt. Damit bleiben auch später ergänzte
Controls sichtbar.

`name[]` ergibt in `data` einen Arraywert unter dem Namen ohne `[]`. Radio- und Checkbox-Gruppen werden gruppiert.
`formData` behält die Namen aus dem Markup bei und lässt deaktivierte oder nicht ausgewählte Controls aus.

## tj-form

```html
<tj-form controller="contact-api">
  <input name="name" />
  <input name="topics[]" value="docs" type="checkbox" />
  <input name="topics[]" value="support" type="checkbox" />
  <button type="submit">Senden</button>
</tj-form>
```

```ts
import { registerFormController } from '@trunkjs/form';

registerFormController('contact-api', {
  async onLoad({ form }) {
    form.data = await loadDraft();
  },
  onValidate({ form }) {
    return form.checkValidity();
  },
  async onSubmit({ form }) {
    await fetch('/api/contact', { method: 'POST', body: form.formData });
  },
});
```

Die Registry speichert Callbacks und optionale Fetch-Defaults, keine Formularwerte. Eine Registrierung darf vor oder
nach dem Verbinden des Elements stattfinden. Verfügbare Hooks sind `onInit`, `onLoad`, `onValidate`, `onSubmit`,
`onSuccess` und `onError`.

Ohne `onSubmit` sendet `<tj-form>` per `fetch`, wenn ein `action`-Attribut oder eine Controller-Action gesetzt ist.
`GET` und `HEAD` werden als Query-Parameter gesendet, andere Methoden mit `form.formData` als Body.

## Daten und Elemente

```ts
const form = document.querySelector('tj-form')!;

form.data = { name: 'Max', topics: ['docs'] };
console.log(form.data);
console.log(form.formData);

form.entries.forEach(({ element }) => {
  element.toggleAttribute('validated', true);
});
```

Die API enthält bewusst keine zusätzlichen Remote-, Validierungs- oder Gruppen-Wrapper. Zustände wie `disabled`,
`invalid` oder `validated` werden bei Bedarf direkt über die Elemente gesetzt.

Native Formularsteuerung bleibt über `form.form`, `requestSubmit()`, `reset()`, `checkValidity()` und
`reportValidity()` verfügbar.

## Demo lokal starten

```bash
cd packages/form
npx vite
```

Der Demo-Viewer ist anschließend unter `/__tdemo` verfügbar.
