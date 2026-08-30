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

## Globale Presets und Submit

Presets werden ausschließlich programmatisch registriert und im Markup über das Attribut `presets` ausgewählt. Die
Registry liegt auf `globalThis.__trunkjsFormRegistry`, sodass unabhängig gebaute Bundles dieselben Presets verwenden.

`registerFormPreset(preset)` registriert das Standard-Preset. Es gilt automatisch, wenn ein `<tj-form>` kein
`presets`-Attribut besitzt:

```ts
import { enterNextPlugin, registerFormPreset } from '@trunkjs/form';

registerFormPreset({
  value: { displayName: 'Erika' },
  async onSubmit({ value, submitter, getElements }) {
    getElements().forEach((element) => element.toggleAttribute('disabled', true));
    await saveProfile(value, submitter);
  },
});
```

```html
<tj-form>
  <input name="displayName" required />
  <button type="submit">Speichern</button>
</tj-form>
```

Benannte Presets lassen sich kombinieren. Werte, Plugins und Submit-Callbacks werden in der Reihenfolge des Attributs
aktiviert beziehungsweise ausgeführt:

```ts
registerFormPreset('profile-values', {
  value: { displayName: 'Erika' },
});

registerFormPreset('enter-next', {
  plugins: [enterNextPlugin()],
});

registerFormPreset('save-profile', {
  onSubmit({ value }) {
    return saveProfile(value);
  },
});
```

```html
<tj-form presets="profile-values enter-next save-profile">
  <!-- controls -->
</tj-form>
```

Kommas sind ebenfalls erlaubt. Ein vorhandenes, aber leeres `presets=""` deaktiviert alle Presets. Soll zusätzlich zu
benannten Presets das Standard-Preset laufen, muss `default` ausdrücklich in der Liste stehen.

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
