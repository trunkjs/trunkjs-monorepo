# Prolit: Bewertung und Vergleich

Stand: 12. September 2026. Prolit-Quellstand und Einzelbefunde stehen in [§ 2 des Frontentwurfs](2026-09-12-prolit-elements-frontentwurf.md#-2-aktueller-stand-und-belastbare-befunde). Die Bewertung trennt vorhandene Funktion von vorgeschlagener API; sie ist kein Performance-Benchmark und keine vollständige Sicherheitsprüfung.

## Was am Konzept gut ist

Prolit kombiniert HTML-nahe Kontrollstrukturen mit Lit-Rendering und normalen Custom Elements. Eine Zeile wie `<tr *for="user of users; user.id">` ist für HTML-Autoren unmittelbar lesbar. Daten und Callbacks im Scope ermöglichen eine kompakte, lokale Komponentenbeschreibung. Das ist besonders passend für editierbare Light-DOM-Oberflächen, die bestehende Web Components wie Nextrap verwenden.

Der Compiler verwendet vorhandene Lit-Bausteine wie `repeat`, `when`, `classMap` und `styleMap`. Eigene DOM-Diffing-Logik ist damit nicht nötig. Der bestehende Cache pro Template-Instanz vermeidet erneute Kompilierung bei jedem Update. Daraus folgt jedoch noch kein belegter Geschwindigkeits- oder Größenvorteil gegenüber anderen Frameworks.

## Was heute schwach ist

Die Syntax ist weiter als das Komponentenmodell: Lifecycle-Hooks sind deklariert, aber nicht ausgeführt; automatische Updates hängen vom Zugriffsweg ab. Eventobjekte und Promise-Fehlerbehandlung fehlen. Der generische Scope verliert durch breite `any`-Zugriffe einen Teil seines Nutzens; Template-Ausdrücke sind nicht TypeScript-geprüft. Die enthaltene Demo teilt einen Scope zwischen Instanzen. Diese Punkte treffen genau die Verlässlichkeit, die eine einfach aussehende API im Hintergrund leisten muss.

Der Runtime-Compiler erzeugt zusätzliche Syntax-, Diagnose- und CSP-Verantwortung. Fehlertexte mit Quellkontext sind ein guter Ansatz, aber keine automatische Fehlerbehebung. Namen und README passen stellenweise nicht mehr zum Code. Vor größerem Funktionsumfang würde ich diesen Vertrag stabilisieren.

## Vergleich anhand des gewünschten Anwendungsfalls

| Ansatz | HTML und Scope | Daten / Aktualisierung | Konsequenz für dieses Projekt |
|---|---|---|---|
| **Prolit heute** | `{{ }}`, `*for`, `$fn` im eigenen Scope | flacher Proxy, explizite Updates, kein Ressourcenmodell | passt zur gewünschten Schreibweise; Lifecycle und Async-Vertrag noch unfertig |
| **Prolit Zielentwurf** | Scope und Template pro Komponente in einer TS-Datei | `ProlitElement`, `scopeResource` und `scopeAction` | klare Light-DOM-Zuständigkeit und weniger Boilerplate; diese Funktionen sind noch zu bauen |
| **Lit** | JS-Ausdrücke in Tagged Templates; direkte Properties und Eventlistener | Komponente fordert Updates an | bestehende technische Grundlage; weniger eigene Template-Sprache, aber mehr JS im Markup. [Lit-Ausdrücke](https://lit.dev/docs/templates/expressions/) |
| **Alpine** | `x-data` bündelt Daten/Methoden direkt für einen HTML-Bereich | reaktive Zustandsänderungen im lokalen Datenobjekt | konzeptionell nahe am HTML-/Scope-Wunsch; sinnvolle Referenz für lokalen Scope-Zugriff, ohne daraus eine fertige Nextrap-Integration abzuleiten. [Alpine x-data](https://alpinejs.dev/directives/data) |
| **Vue** | Templates greifen auf reaktive Werte zu | `ref`/`reactive`, DOM-Aktualisierung nach Änderungen | gute Referenz für konsistente Reaktivität; größere Umstellung des bestehenden Lit-Komponentenmodells. [Vue-Reaktivität](https://vuejs.org/guide/essentials/reactivity-fundamentals.html) |
| **React** | Listen typischerweise mit `map`/`filter` in JSX; stabile Keys | UI wird aus Anwendungsdaten beschrieben | für diesen Wunsch weniger HTML-nahe Schleifensyntax; keine überzeugende Vereinfachung gegenüber der bestehenden Lit-Basis. [React-Listen](https://react.dev/learn/rendering-lists) |
| **Svelte** | deklarative `{#await}`-Blöcke mit Pending-/Erfolg-/Fehlerzweigen | Promise-Zustände sind im Template darstellbar | gute Referenz für sichtbare Async-Zustände; Prolit kann diese Klarheit über Scope-Ressourcen erreichen, ohne die Syntax zu kopieren. [Svelte await](https://svelte.dev/docs/svelte/await) |

Die Spalte „Konsequenz“ ist eine Bewertung für diesen konkreten Entwurf, keine allgemeine Rangliste. Die Quellen beschreiben die jeweiligen Mechanismen; eine integrierte Vergleichs-App wurde nicht gebaut.

## Was verbessert werden sollte

| Priorität | Verbesserung | Nutzen |
|---|---|---|
| 1 | instanzeigener Scope und konsistente Proxy-/Template-Bindung | mehrere Komponenten beeinflussen sich nicht versehentlich |
| 1 | definierte Renderbereiche und Lifecycle-Bereinigung | Shadow- und Light-DOM-Renderer überschreiben sich nicht |
| 1 | `$event`, Promise-Fehlerroute, korrekter `TemplateResult`-Typ | Formulare und typisierte Dialoge funktionieren zuverlässig |
| 2 | klare Ressourcen-API mit Abort und Konkurrenzregel | Serviceabfragen ohne handgepflegte Zustandsvariablen |
| 2 | präzise `$fn`-Generics und Compilerdiagnostik | Fehler früher erkennen und direkt am Template beheben |
| 3 | optionale Vorcompilierung | strenge CSP und weniger Laufzeit-Kompilierarbeit ermöglichen |

Meine Empfehlung ist, den kleinen Prolit-Ansatz beizubehalten und zuerst seine verbindlichen Regeln zu schließen. **Eine Ziel-API: expliziter Start, Ressourcen für Reads, aufrufbare Aktionen unter `$fn` und ein gemeinsamer Fehler-/Ergebnisvertrag.** Das Minimalbeispiel und die vollständige Tabelle zeigen jetzt dieselbe API; manuelle Statusflags werden als Gegenbeispiel eingeordnet. Der Dialog sollte die bestehende Nextrap-Basis behalten und lediglich seinen Inhalt durch Prolit rendern. Globale Stores, weitere Controller-Schichten oder ein eigener Dialogmanager sind für das gezeigte Problem nicht erforderlich.


## Gegenprobe im Anwendungsalltag

Die [SPA-Beispiele](examples/README.md) prüfen die Empfehlung an Suche, wechselnden Details, Dialog-Speichern und Live-Daten. Der Gewinn liegt in wiederkehrenden Zustandsnamen und sichtbaren Auslösern. Die verbleibenden Kosten sind bewusst benannt: callable Action-Generics und Lifecycle-Bindung für den Bibliotheksentwickler; explizite Parameter, ein kleiner Nextrap-Dismiss-Adapter und fehlender Template-Typcheck für den Anwendungsentwickler. Eine weitere Abstraktion ist erst gerechtfertigt, wenn sie diese konkreten Stellen verbessert.
