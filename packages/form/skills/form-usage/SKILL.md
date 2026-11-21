---
name: form-usage
description: Use @trunkjs/form TjForm and <tj-form> (programmatic API and element), TjFormRegistry and registerFormPreset() (programmatic APIs), and EnterNextPlugin and enterNextPlugin() (programmatic APIs).
---

# @trunkjs/form usage

## Objektbindung

`form.value = data` behält die Objektreferenz. Bubbelnde `input`-/`change`-Events
schreiben Control-Werte in dasselbe Objekt zurück, ohne nicht dargestellte Properties
(z. B. Metadaten) zu entfernen. Der Getter synchronisiert auch programmatische
Control-Änderungen und liefert dieselbe Referenz. Verschachtelte benannte Forms erhalten
die Referenzen ihrer Teilobjekte. Custom Controls propagieren Events aus Shadow DOM
mit `bubbles: true, composed: true`.

Für UI-Reaktionen direkt am Formular auf `update` hören. Das Event liefert
`detail.value` als bereits synchronisierte Originalreferenz; keine manuelle Übernahme
vor dem Rendering nötig. Es wird pro verarbeitetem `input`/`change` ausgelöst, nicht
beim Getter/Setter. Es bubbelt nicht, damit verschachtelte Forms jeweils nur ihre
eigenen Updates liefern. Ein Bedienvorgang kann beide nativen Events auslösen.
Der öffentliche Typ dafür ist `TjFormUpdateDetail`.

Für abbrechbare Dialoge einen eigenen Entwurf binden; bei verschachtelten editierbaren
Daten ausreichend tief kopieren. Auch gebundene Preset-Objekte werden mutiert und sind
bei gemeinsamer Verwendung nicht pro Instanz isoliert. Das Rückschreiben allein löst
kein reaktives Prolit-/Lit-Rendering für verschachtelte Properties aus.

- `TjForm` / `<tj-form>` — Named object-valued container for native and custom controls, nested forms, element access,
  and custom submit dispatch. See [README](../../README.md) and [demo](../../demo/basic.demo.ts).
- `TjFormRegistry` / `registerFormPreset()` — Registers a globally shared default or named preset containing initial
  values, a submit callback, and plugins for declarative `preset` selection. See [README](../../README.md).
- `EnterNextPlugin` / `enterNextPlugin()` — Opt-in Enter validation and focus-next behavior. See
  [demo](../../demo/basic.demo.ts).
