# Proposal: FormDataAccessor und vereinfachtes `tj-form`

## Problem

Der bisherige Datenzugriff von `tj-form` verteilt eine einfache Aufgabe auf `FormScope`, `FormRemote`, Control-Wrapper,
eine Proxy-API und mehrere Value-Plugins. Zusätzlich gibt es parallele Repräsentationen als `data`, `value`, `map` und
`formData`. Dadurch wird die Form-API größer, ohne dass die meisten Anwendungen diese Abstraktionen benötigen.

`nte-input` zeigt mit seinem kleinen `FormDataAccessor`, dass ein dynamischer Zugriff auf benannte DOM-Elemente als
Grundlage ausreicht. TrunkJS soll dieses Muster in den framework-unabhängigen Browser Utils allgemein bereitstellen,
damit Form-Komponenten und Nextrap dieselbe Implementierung verwenden.

## Entscheidung

`@trunkjs/browser-utils` exportiert einen eigenständig nutzbaren `FormDataAccessor`. `tj-form` verwendet dieselbe Klasse
intern und stellt nur deren wesentliche Getter und Setter bereit.

```ts
import { FormDataAccessor } from '@trunkjs/browser-utils';

const accessor = new FormDataAccessor(container);

accessor.data = { email: 'mail@example.com', topics: ['docs'] };
console.log(accessor.data);
console.log(accessor.formData);

for (const entry of accessor.entries) {
  console.log(entry.name, entry.value, entry.element);
}
```

Die minimale API ist:

| API | Zweck |
| --- | --- |
| `data` | Aktuelle Werte als flaches Objekt lesen oder vorhandene benannte Elemente beschreiben |
| `entries` | Dynamische Liste aus `name`, les-/schreibbarem `value` und dem originalen `element` |
| `formData` | Aktuelle, sendbare Werte als natives `FormData` lesen |

Jeder Zugriff fragt den aktuellen DOM-Baum neu ab. Nachträglich eingefügte oder entfernte Controls sind damit ohne
`MutationObserver`, Cache-Invaliderung oder Registrierung sichtbar. Die `value`-Property eines Eintrags greift ebenfalls
direkt auf das Element zu.

Spezielle Sammelmethoden wie `validateAll()`, `disableAll()` oder `setInvalid()` werden zunächst nicht ergänzt. Sie lassen
sich ohne weitere Abstraktion über die Elemente ausdrücken:

```ts
form.entries.forEach(({ element }) => {
  element.toggleAttribute('validated', true);
});
```

## `tj-form`

`tj-form` delegiert `data`, `entries` und `formData` an den Accessor. Die nativen Methoden `requestSubmit()`, `reset()`,
`checkValidity()` und `reportValidity()` bleiben erhalten.

Die globale Controller-Registry bleibt bestehen, weil sie die zeitlich unabhängige Registrierung von API-Callbacks löst.
Controller-Kontexte enthalten nur noch das Form-Element sowie beim Submit das Event und den Submitter. Aktuelle Werte
werden immer über die Getter des Form-Elements gelesen:

```ts
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

Controller-`args` entfallen. Konfiguration gehört entweder direkt in den registrierten Callback-Closure oder in die
vorhandenen Controller-Felder `action`, `method` und `fetchOptions`.

## Entfernte Zwischenebenen

- `FormScope` für den DOM-Datenzugriff
- `FormRemote` samt Proxy und Control-Wrappern
- `FormValuePluginRegistry` und die eingebauten Value-Plugins
- parallele `value`- und `map`-Aliasse
- per Element gemergte `hooks`, `onSubmit`, `controllerArgs` und `fetchOptions`

Die ältere, unabhängige Scope-API unter `lib/Scope` bleibt unverändert. `@nextrap/nte-input` entfernt seine lokale Kopie
und verwendet ebenfalls den Export aus `@trunkjs/browser-utils`; diese Änderung wird in einem separaten Nextrap-PR
geliefert.
