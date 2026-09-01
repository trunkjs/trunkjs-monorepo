## 1.0.1 (2026-09-01)

### 🚀 Features

- **form:** compose global form presets ([d94865c](https://github.com/trunkjs/trunkjs-monorepo/commit/d94865c))
- **form:** add ajax form element and remote controls ([0d75fd1](https://github.com/trunkjs/trunkjs-monorepo/commit/0d75fd1))

### 🩹 Fixes

- **form:** select a single preset ([cda92d5](https://github.com/trunkjs/trunkjs-monorepo/commit/cda92d5))

### ❤️ Thank You

- Matthias Leuffen

# Changelog

## Unreleased

- `tj-form` auf eine kleine objektwertige `value`- und `getElements()`-API reduziert
- `FormDataAccessor` aus `@trunkjs/browser-utils` als gemeinsame DOM-Utility verwendet
- Benannte verschachtelte Forms werden als eigener Objektwert statt als doppelte flache Controls gelesen
- Bundle-übergreifende globale Preset-Registry für ein Default- oder benanntes Preset ergänzt
- `EnterNextPlugin` für konfigurierbare Validierung und Fokuswechsel per Enter ergänzt
- Native Form-, Fetch- und Validierungs-Lifecycle-Logik entfernt

## 1.0.0

- Initiale Grundstruktur für `@trunkjs/form`
- Vite-Demo-Viewer-Setup ergänzt
- `FormScope` mit Plugin-System ergänzt
- Standard-Value-Plugins für `input`, `checkbox`, `radio`, `textarea` und `select` ergänzt
