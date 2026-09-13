---
name: trunkjs-api-skill
description: Zentraler Einstieg für Auswahl und Verwendung öffentlicher TrunkJS-Packages; vor konkreter Arbeit auf package-lokale Skills routen.
---

# TrunkJS API Skill

Dieser Skill ist der zentrale Einstieg für die Verwendung des gesamten TrunkJS-Monorepositories. Er ordnet Packages und öffentliche Oberflächen ein; package-lokale Skills unter `packages/<package>/skills/` bleiben für konkrete API-Verträge verbindlich.

## Regeln

### § 1 Quellen und Paketwahl

§ 1.1 Vor konkreter Implementierung ist der passende package-lokale Skill zu lesen. Wenn ein solcher Skill fehlt, sind öffentlicher Entrypoint, README, Tests und vorhandene `.ai-usage-info.md` als Quellmaterial zu verwenden. Bestehende Patterns und öffentliche APIs haben Vorrang vor neuen Parallel-Lösungen.

§ 1.2 Paketbezogene Skills liegen im jeweiligen Package unter `packages/<package>/skills/<skill>/` und sollen mit dem npm-Package ausgeliefert werden. Legacy-Pfade unter `.agents/skills/` werden nicht ohne ausdrücklichen Migrationsauftrag verschoben.

§ 1.3 Private Quellpfade anderer Packages werden nicht als Cross-Package-API behandelt. Konsumenten verwenden den jeweiligen öffentlichen Package-Entrypoint und dokumentierte Subpath-Exports.

### § 2 Zusammenspiel der Kernpakete

§ 2.1 Markdown-/Kramdown-Inhalte werden mit `@trunkjs/content-pane` strukturell verarbeitet; `@trunkjs/markdown-loader` ist für das Laden von Markdown zuständig und ersetzt nicht die Layout-/Rendering-Verträge von Content Pane.

§ 2.2 Responsive Verhalten wird bevorzugt mit `@trunkjs/responsive` ausgedrückt. `@trunkjs/element-relocator` übernimmt nur das Verschieben von Elementen und implementiert keine eigenen Breakpoints.

§ 2.3 Ausführbare Demos werden mit `@trunkjs/demo-viewer` definiert; `@trunkjs/vite-demo-viewer` übernimmt die Vite-/Nx-/GitHub-Pages-Integration und nicht die eigentliche Demo-Definition.

### § 3 Rückmeldung bei falscher Benutzungsinformation

§ 3.1 Ist Benutzungsinformation unklar, widersprüchlich oder nachweislich falsch, soll ein GitHub-Issue in `trunkjs/trunkjs-monorepo` angelegt werden. Das Issue nennt betroffene API, erwartetes Verhalten, beobachtetes Verhalten oder Missverständnis und möglichst ein reproduzierbares Beispiel. Solche Issues werden täglich gegen aktuellen Code, Tests, Exports und Repository-Regeln validiert und erst bei Bestätigung in diesen Skill übernommen.

## Paketübersicht

### @trunkjs/api-stub – Hilfen zum Stubben von APIs
Für kontrollierte Test-/Entwicklungs-APIs, wenn reale Backends nicht verwendet werden sollen.

- Öffentliche Exporte aus `src/index` — Stub-Hilfen; konkrete Funktionen über den Package-Entrypoint prüfen.

### @trunkjs/ast-markdown – Strukturierte Markdown-Verarbeitung
Für Analyse und Transformation von Markdown auf AST-Ebene statt reinem String-Handling.

- Öffentliche AST-/Markdown-Exporte — für Parser-/Transformationsaufgaben; aktuelle Typen über Entrypoint und Tests beziehen.

### @trunkjs/browser-utils – Browser-, DOM- und Runtime-Hilfen
Für DOM, Formwerte, Timing, Storage, Breakpoints, Events, Logging und Web-Component-Mixins.

- `FormDataAccessor` — liest/schreibt benannte native und Custom-Form-Controls und erzeugt `FormData` aus DOM-Containern.
- Browser-/DOM-Hilfen — für Elementerzeugung, Timing, Storage und Diagnose.
- Event-/Custom-Element-/Lit-Mixins — für wiederverwendbare browserseitige Komponentenlogik.
- `browser-utils-usage` und spezialisierte package-lokale Skills — verbindliche Detailquelle.

### @trunkjs/content-pane – Markdown/Kramdown zu layoutfähigem Content
Für CMS-, Website-, Jekyll- und Demo-Inhalte mit deklarativer Layout-/Slot-Zuordnung.

- `<tj-content-pane>` — verarbeitet Markdown/Kramdown und erzeugt layoutfähigen Content.
- Layout-Syntax `{: layout="..."}` — ordnet Blöcke deklarativ Layout-/Custom-Element-Strukturen zu.
- `content-pane-usage` — für Konsum in Seiten, CMS, Demos und Jekyll.
- `content-pane-content-elements` — für eigene Custom Elements mit SubLayout-/Slot-Routing.
- `content-pane-demo` — für Content-Pane-Markup in ausführbaren Demos.

### @trunkjs/demo-viewer – Ausführbare Komponenten- und Package-Demos
Für reproduzierbare, interaktive `*.demo.ts`-Definitionen.

- `defineDemo()` — definiert eine ausführbare Demo.
- `render()` — rendert Demo-Inhalte im vorgesehenen Demo-Kontext.
- `afterRender()` — führt DOM-abhängige Initialisierung nach dem Rendern aus.
- Package-Skill `demo-viewer` ist bei Erstellen, Konvertieren, Fixen oder Review von Demos verbindlich.

### @trunkjs/element-relocator – Verschiebt Elemente zwischen Containern
Für responsive Navigation, wenn gleiche Navigationsitems in unterschiedliche Container wechseln sollen.

- `<tj-element-relocator>` — verschiebt direkte Navigationselemente zwischen per CSS-Selektor adressierten Zielen.
- `relocate`-Zustand/Klasse — steuert die aktive Verschiebung.
- Breakpoints nicht hier implementieren; dafür `@trunkjs/responsive` verwenden.

### @trunkjs/form – Objektbasierte Formulare und Formular-Workflows
Für benannte Formmodelle, registrierte Presets und wiederverwendbare Formular-Plugins.

- `TjForm` / `<tj-form>` — objektbasierte Formular-API und Element.
- `TjFormRegistry` — Registry für benannte Formulare/Preset-Auflösung.
- `registerFormPreset()` — registriert wiederverwendbare Form-Presets.
- `EnterNextPlugin` / `enterNextPlugin()` — steuert Enter-zu-nächstem-Feld-Verhalten.

### @trunkjs/loader – Gemeinsamer Ladezustand
Für Komponenten, die einen geteilten Loading-/Loader-Zustand koordinieren müssen.

- `<tj-loader>` — Loader-Komponente.
- Loader-State-API — synchronisiert Ladezustände zwischen beteiligten Komponenten; konkrete Methoden über Entrypoint prüfen.

### @trunkjs/markdown-loader – Lädt Markdown für Content-Pipelines
Für das Beschaffen von Markdown, bevor es gerendert oder strukturell verarbeitet wird.

- Öffentliche Markdown-Loader-API — lädt Markdown-Ressourcen; Optionen über Package-Entrypoint/README prüfen.
- Für Layout/Rendering anschließend `@trunkjs/content-pane` verwenden.

### @trunkjs/prolit – Leichte Lit-/Template-Grundlagen
Für ProLit-basierte Templates, Scopes und gemeinsame Lit-Umgebungsfunktionen.

- `ProLitTemplate` — ProLit-Template-Abstraktion.
- `scopeDefine` — registriert/definiert Inhalte im Scope-Kontext.
- Exporte aus `lit-env` — gemeinsame Lit-Umgebungshelfer.

### @trunkjs/prolit-elements – Fertige ProLit-basierte Elemente
Für wiederverwendbare Elemente auf Basis des ProLit-Pakets.

- `<tj-include>` — lädt ein HTML-Fragment; Immediate Loading ist der Standard.
- Weitere öffentliche Elemente — über package-lokale Benutzungsinformation und Entrypoint prüfen.

### @trunkjs/responsive – Runtime-Responsive-Klassen und Breakpoint-Zustände
Für responsive Zustände ohne eigene Resize-Listener oder unnötige Einzelfall-Media-Queries.

- `<tj-responsive>` — stellt Responsive-Kontext und dynamische Regeln bereit.
- Breakpoint-qualifizierte Klassen — aktivieren Klassen/Werte abhängig vom Breakpoint.
- Arbitrary Values — nur verwenden, wenn bestehende Tokens/Klassen den Sonderfall nicht besser ausdrücken.
- Package-Skill `trunkjs-responsive` ist für Syntax und technische Grenzen verbindlich.

### @trunkjs/scope – Scope-Runtime und Event-Hilfen
Für gekapselte Scope-Zustände und Ereignisweitergabe zwischen Komponenten.

- `EventMixin` — ergänzt Event-Funktionalität im Scope-Kontext.
- Scope-Runtime und Scope-Typen — öffentliche Hilfen für Erzeugung und Verwendung von Scopes.
- `createScopeDemoMessage()` — einfache öffentliche Demo-/Beispielhilfe des Entrypoints.

### @trunkjs/scrollspy – Scrollposition und aktive Sektionen
Für Navigationen oder UI-Zustände, die der sichtbaren Dokumentsektion folgen.

- Öffentliche Scrollspy-Exporte — beobachten Ziele und aktualisieren aktiven Zustand; Optionen/Events über Entrypoint prüfen.

### @trunkjs/vite-demo-viewer – Vite-/Nx-Integration für Demo Viewer
Für lokale Package-Demos, kombinierte Dokumentations-Builds und GitHub Pages.

- `tjDemoViewerPlugin()` — Vite-Plugin für Demo-Viewer-Integration.
- Setup-Konventionen für Vite/Nx — im package-lokalen `vite-demo-viewer-setup`-Skill beschrieben.
- Einzelne Demo-Definitionen weiterhin mit `@trunkjs/demo-viewer` erstellen.
