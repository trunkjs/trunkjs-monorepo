# @trunkjs/form

`<tj-form>` ist ein kleines Value-Element. Es sammelt die Werte benannter nativer oder kompatibler Custom Elements und
liefert sie über `value` immer als Objekt zurück. Validierung, Requests und weitere Abläufe gehören nicht zum Kern.

## Value und verschachtelte Forms

```html
<tj-form id="profile">
  <input name="displayName" />
  <tj-form name="address">
    <input name="street" />
    <input name="city" />
  </tj-form>
</tj-form>
```

```ts
const form = document.querySelector<TjForm>('#profile')!;

form.value = {
  displayName: 'Erika',
  address: { street: 'Musterweg 1', city: 'Berlin' },
};

console.log(form.value);
// { displayName: 'Erika', address: { street: 'Musterweg 1', city: 'Berlin' } }
```

Ein Element wird berücksichtigt, wenn es einen nicht leeren `name` und eine les-/schreibbare `value`-Property besitzt.
Damit funktionieren native Controls sowie kompatible Custom Elements wie `<nte-input>`. Ein benanntes Value-Element
besitzt seinen gesamten Wert; seine Unterelemente werden vom übergeordneten `FormDataAccessor` nicht erneut gelesen.

`entries` liefert dynamische Element-/Wert-Paare. `getElements()` gibt die aktuell sichtbaren Controls direkt zurück.

## Presets und Submit

Presets bündeln vorbesetzte Werte, einen Submit-Callback und optionale Plugins:

```ts
import { enterNextPlugin, registerFormPreset } from '@trunkjs/form';

registerFormPreset('profile', {
  value: { displayName: 'Erika' },
  plugins: [enterNextPlugin()],
  async onSubmit({ value, submitter, getElements }) {
    getElements().forEach((element) => element.toggleAttribute('disabled', true));
    await saveProfile(value, submitter);
  },
});
```

```html
<tj-form preset="profile">
  <input name="displayName" required />
  <button type="submit">Speichern</button>
</tj-form>
```

`<tj-form>` erzeugt bewusst kein natives `<form>`. Ein Klick auf einen zugehörigen Submit-Button oder
`requestSubmit()` löst das abbrechbare Event `tj-form-submit` aus und ruft anschließend `onSubmit` auf. Buttons und
Events verschachtelter Forms bleiben bei ihrer nächstgelegenen Form.

`enterNextPlugin()` verhindert Submit per Enter, validiert das aktuelle Element und fokussiert bei Erfolg das nächste.
Für Custom Controls kann `validate` oder `focus` konfiguriert werden.

## Demo lokal starten

```bash
cd packages/form
npx vite
```

Der Demo-Viewer ist anschließend unter `/__tdemo` verfügbar.
