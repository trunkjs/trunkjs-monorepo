# @trunkjs/form

`@trunkjs/form` stellt mit `<tj-form>` einen AJAX-fähigen Formular-Container bereit. Das Element kapselt intern ein echtes HTML-`form`, damit native Submit-, Validierungs- und Form-Associated-Verhalten erhalten bleiben.

## Verwendung

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
  args: { endpointName: 'contact' },
  async onLoad({ form }) {
    form.data = await loadDraft();
  },
  onValidate({ form }) {
    return form.checkValidity();
  },
  async onSubmit({ formData, form, args }) {
    await fetch('/api/contact', { method: 'POST', body: formData });
    form.remote.get('*')!.disabled = true;
    console.log(args);
  },
  async onError({ context, phase }) {
    if (phase === 'submit') await saveDraft(context.data);
  },
});
```

Die Registry speichert Controller und Connectoren, keine Formularwerte. Sie kann beim Laden eines TypeScript-Moduls registriert werden, unabhängig davon, ob `<tj-form>` bereits definiert oder verbunden ist. Das Element beobachtet seinen Registry-Schlüssel; deshalb funktioniert auch die umgekehrte Ladereihenfolge.

Verfügbare Hooks sind `onInit`, `onLoad`, `onValidate`, `onSubmit`, `onSuccess` und `onError`. Daten werden in `onLoad` explizit über `form.data`, `form.map` oder `form.formData` geladen. `onValidate` kann mit `false` abbrechen. `onError` erhält zusätzlich die fehlgeschlagene Phase (`init`, `load`, `validate`, `submit` oder `success`).

Ohne `onSubmit` sendet `<tj-form>` die Daten per `fetch`, wenn ein `action`-Attribut gesetzt ist. `GET` und `HEAD` werden als Query-Parameter gesendet, andere Methoden mit `FormData` als Body.

## Datenzugriff

```ts
const form = document.querySelector('tj-form')!;

form.data = { name: 'Erika', topics: ['docs'] };
form.value = form.data;
form.map = new Map([['name', 'Max']]);
form.formData = new FormData();

console.log(form.data);      // Record<string, unknown>
console.log(form.map);       // Map<string, unknown>
console.log(form.formData);  // FormData
```

Namen mit `[]` werden in `data` und `map` ohne Suffix als Array ausgegeben. Native Radio-Gruppen liefern den ausgewählten Wert. Mehrere Checkboxen mit demselben Namen liefern die Werte der ausgewählten Checkboxen; eine einzelne Checkbox ohne `[]` liefert einen Boolean.

## Remote-Zugriff

```ts
form.remote.get('name')!.value = 'Erika';
form.remote.get('name')!.disabled = true;
form.remote.get('*')!.validated = true;

const rawElements = form.remote.elements;
const controlWrappers = form.remote.controls;
```

Zur Laufzeit funktionieren zusätzlich `form.remote.name` und `form.remote['*']`; für vollständig typisierten Code ist `get(...)` vorzuziehen.

## Programmatisch

```ts
const content = document.createElement('div');
content.innerHTML = '<input name="query">';

const form = new TjForm(content);
form.hooks = {
  async onLoad({ form }) {
    form.data = await loadData();
  },
  onSubmit: ({ formData }) => sendData(formData),
};
document.body.append(form);
```

Alternativ wählt `form.controller = 'contact-api'` einen global registrierten Controller aus. Ein direkt gesetztes `form.onSubmit` überschreibt nur den Submit-Hook; `form.hooks` überschreibt die entsprechenden Hooks und Optionen des Registry-Controllers.

Für einen beliebigen bestehenden Container kann weiterhin `new FormScope(container)` verwendet werden.

## Custom Controls

Custom Elements werden ohne direkte Abhängigkeit erkannt, wenn sie ein `name`-Attribut und eine les- und schreibbare `value`-Property bereitstellen. Optionale Boolean-Properties sind `disabled`, `valid`, `invalid` und `validated`. Komplexere Controls können über `FormValuePluginRegistry` ein eigenes Plugin registrieren.

`nte-input` aus Nextrap erfüllt diese Schnittstelle und wird direkt unterstützt.

## Demo lokal starten

```bash
cd packages/form
npx vite
```

Der Demo-Viewer ist anschließend unter `/__tdemo` verfügbar.
