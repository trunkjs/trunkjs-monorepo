# AGENTS.md

Diese Datei beschreibt die **repository-spezifischen** Regeln für einen Coding-Agent in diesem Repository.

Generische Coding-, Release- und Library-Regeln liegen in den Skills und sollen dort gepflegt werden.

## Repository-Vorrang

- Repository-spezifische Konventionen und bestehende Dokumentation haben Vorrang vor generischen Skill-Regeln.
- Vorhandene Patterns, Utilities, Dateistrukturen und APIs sollen bevorzugt wiederverwendet werden.
- Änderungen sollen sich am bestehenden Aufbau des Repositories orientieren.

## Die .ai-usage-info.md Datei

Vorhandene `.ai-usage-info.md`-Dateien können weiterhin als Quellmaterial dienen. Paketlokale Skills sind jedoch die
bevorzugte und künftig gepflegte Quelle für Paketwissen. Übernimm relevante API-Hinweise und Beispiele in einen
passenden paketlokalen Skill, statt neue zentrale Usage-Dateien anzulegen.

## Paketlokale Agent Skills

- Paketbezogene Skills liegen im jeweiligen Paket unter `packages/<paket>/skills/<skill>/`, nicht im zentralen `.agents/skills`-Verzeichnis des Repositories.
- Lege für neue und bestehende Pakete passende paketlokale Skills in dieser Struktur an. Referenzen eines Skills bleiben in dessen `references/`-Verzeichnis.
- Behandle `packages/<paket>/.agents/skills/` als Legacy-Pfad. Migriere vorhandene Skills nur bei einem ausdrücklichen Migrationsauftrag in den aktuellen Paketpfad.
- Nimm `skills/**/*` in die Build-Assets des Pakets auf, damit die Skills im veröffentlichten NPM-Paket enthalten sind und von Konsumenten gefunden werden können.
- Zentrale Skills sind nur für Regeln vorgesehen, die paketübergreifend für das gesamte Repository gelten.
