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

## Library-Projekt und externe Änderungen

Dieses Repository ist ein Library-Projekt. Werden Änderungen von außerhalb dieses Repositories durchgeführt, insbesondere wenn es als Workspace, eingebundene Abhängigkeit oder Teil eines anderen Repositories beziehungsweise übergeordneten Projekts bearbeitet wird, müssen vor jeder Änderung zuerst alle Dateien, die geändert, neu angelegt oder gelöscht werden sollen, kurz und konkret aufgelistet werden; anschließend muss die ausdrückliche Zustimmung des Users zu genau diesen vorgesehenen Änderungen eingeholt werden, und erst nach dieser Zustimmung dürfen die Änderungen ausgeführt werden. Erfolgt die Entwicklung dagegen direkt innerhalb dieses Repositories als eigentliche Arbeitsumgebung und Ziel der Aufgabe, ist aufgrund dieser Library-Regel keine zusätzliche Zustimmung erforderlich.

Für automatische Aufgaben, die vom zentralen Hypervisor-Agenten in `dermatthes/chatgpt-agent-space` gestartet werden und ausschließlich auf einem eigenen Branch arbeiten sowie einen Pull Request zur menschlichen Prüfung erstellen oder aktualisieren, gilt die ausdrückliche Nutzerfreigabe dauerhaft als erteilt. Diese Ausnahme erlaubt keine direkten Commits auf `main`, keine Scope-Erweiterungen außerhalb der jeweiligen Agent-Aufgabe und kein automatisches oder eigenständiges Mergen.
