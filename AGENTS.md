# AGENTS.md

Diese Datei beschreibt die **repository-spezifischen** Regeln für einen Coding-Agent in diesem Repository.

Generische Coding-, Release- und Library-Regeln liegen in den Skills und sollen dort gepflegt werden.

## Repository-Vorrang

- Repository-spezifische Konventionen und bestehende Dokumentation haben Vorrang vor generischen Skill-Regeln.
- Vorhandene Patterns, Utilities, Dateistrukturen und APIs sollen bevorzugt wiederverwendet werden.
- Änderungen sollen sich am bestehenden Aufbau des Repositories orientieren.

## Die .ai-usage-info.md Datei

Diese Datei sollte für alle Pakete uptodate gehalten werden. In dieser sollten alle Informationen enthalten sein, um 
die AI zu informieren, damit sie die Anforderungen der Pakete versteht und entsprechend coden kann. In dieser Datei
sollten hauptsächlich Beispiele enthalten sein. Suche ggf auch nach .ai-usage-info.md Dateien in anderen Paketen, um zu sehen, wie diese aufgebaut sind. (auch in node-modules)

## Paketlokale Agent Skills

- Paketbezogene Skills liegen im jeweiligen Paket unter `packages/<paket>/.agents/skills/<skill>/`, nicht im zentralen `.agents/skills`-Verzeichnis des Repositories.
- Lege für neue und bestehende Pakete künftig passende paketlokale Skills in dieser Struktur an. Referenzen eines Skills bleiben in dessen `references/`-Verzeichnis.
- Nimm `.agents/**/*` in die Build-Assets des Pakets auf, damit die Skills im veröffentlichten NPM-Paket enthalten sind und von Konsumenten gefunden werden können.
- Zentrale Skills sind nur für Regeln vorgesehen, die paketübergreifend für das gesamte Repository gelten.
