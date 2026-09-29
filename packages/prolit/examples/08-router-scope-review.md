# 08 — Router, Prolit und Scope im Anwendungslifecycle

Die ausführbaren Beispiele [03 — Router users](03-router-users.ts), [02 — API users](02-api-users.ts) und [07 — Dialogs](07-dialogs.md) zeigen die Bausteine. Dieses Kapitel verbindet ihre Lebenszyklen. Der Router verwaltet URL, History und Views; der Scope verwaltet Read- und Write-Zustand. Ein HTTP-Ergebnis ist nicht das Navigationsergebnis.

## 01 — Direktlink und routengebundene Daten

Die Anwendung liefert ihren Shell-Einstieg auch für `/users/42` aus und enthält `<router-content></router-content>`. Nach Import der registrierten `ExampleUserPage` startet sie:

```ts
import { Router } from '@trunkjs/router';
import { ExampleUserPage } from './03-router-users';

const router = new Router([ExampleUserPage]).start({ default: true });
```

`start({ default: true })` bindet diesen Router explizit als Default und wertet die vorhandene URL aus. Es überschreibt keinen Deep Link. Die bisherige Form `setDefaultRouter(router); router.start()` bleibt möglich. Eine andere aktive Default-Instanz muss vorher gestoppt werden.

Die Seite deklariert ihren Ladeauftrag zusammenhängend:

```ts
import { routeResource } from '@trunkjs/prolit/router';

user: routeResource(this, {
  key: route => route.params['id'],
  load: async (_context, id) => {
    const user = sampleUsers[id]; // Lokaler Datensatz aus 03-router-users.ts
    if (!user) throw new Error(`Unknown user ${id}`);
    return user;
  },
  errorMessage: 'User could not be loaded.',
}),
```

Der Read beginnt erst nach dem Mount des Scopes. Ein Wechsel von `42` zu `7` bricht den alten Read ab, entfernt die alten Daten und lädt Linus; ein verspätetes Ergebnis für Ada wird ignoriert. `user.reload()` wiederholt den aktuellen Schlüssel nach einem Fehler, ohne automatischen Retry. `key: route => null` deaktiviert den Read. Ein flaches Tupel wie `[route.params['id'], route.query.get('lang') ?? 'de'] as const` wählt mehrere Abhängigkeiten; der Loader erhält es als **ein** zweites Argument. Das bestehende `scopeResource.reload(...args)` bleibt für manuelle Reads.

## 02 — Query ändern und Dirty-Zustand prüfen

`updateQuery` ändert nur angegebene Werte. Andere Query-Einträge, Pfad, Outlets und Hash bleiben erhalten:

```ts
await router.updateQuery({ q: 'Ada' }, { replace: true });
await router.updateQuery({ q: null }, { replace: true });
```

`undefined` lässt einen Eintrag stehen, `null` löscht ihn, ein skalarer Wert ersetzt auch mehrfach vorhandene Werte. Die Änderung läuft durch dieselben Dirty-Checks wie `navigate` oder ein normaler Link. Beide Navigationsmethoden liefern eine Promise mit der bestätigten Route oder `null` bei abgelehnter bzw. nicht passender Navigation. `null` ist kein abgeschlossener Daten-Read. Die URL bleibt bei abgelehnter programmatischer Navigation unverändert; ein lokaler Sucheingabeentwurf muss auf den bestätigten Wert zurückgesetzt oder bewusst erhalten werden.

Ein Editor setzt `router.setDirty(true)` beim Bearbeiten und `setDirty(false)` nach erfolgreichem Speichern. Alternativ kann er ein bubbling `RouteDirtyEvent` auslösen. `setDirtyConfirmation` nimmt einen synchronen oder asynchronen Bestätigungsdialog an; ohne Konfiguration wird `window.confirm` verwendet. `addDirtyCheck(isDirty, confirm?)` registriert einen lokalen Check und liefert seinen Disposer. Der Router prüft Links, programmatische Navigation, Query-Änderungen, Outlets und Back/Forward. Nach Ablehnung bleiben View und Entwurf erhalten. [Router-Beispiel 09](../../router/examples/09-dirty-navigation.ts) zeigt einen vollständigen Editor. Bei fremden History-Einträgen ist nur die sichtbare URL sicher wiederherstellbar.

## 03 — Writes und Dialoge

`scopeAction` sperrt einen zweiten gleichzeitigen Write mit `cancelled/busy`. Ein Write läuft nach Disconnect weiter und gibt sein tatsächliches Ergebnis zurück. Beispiel 02 sperrt während des POST die Felder und leert den Entwurf nur, wenn die gleiche Verbindung und derselbe abgeschickte Text noch gelten. Der anschließende Listen-Read ist eine neue Operation: Scheitert er, bleibt der POST erfolgreich und der Retry lädt nur die Liste.

Ein gerouteter `ProlitDialogElement` fragt vor dem Entfernen seine Schließ-Navigation an. Lehnt ein Dirty-Check diese ab, bleiben dieselbe Dialoginstanz und ihr Entwurf sichtbar. Bei bestätigter Navigation entsorgt der Outlet-Eigentümer die Präsentation. Für ein Auxiliary-Outlet gelten seine eigenen Parameter; eine irrelevante Query-Änderung sollte fachliche Dialogeingaben nicht neu initialisieren. Manuell gesteuerte Dialoge und Renderer bleiben möglich.

Template-Quelltext ist ausführbarer, vertrauenswürdiger Code. API-Werte gehören in Scope-Felder; `$rawPure` ist kein validiertes Request-DTO. Browserseitig müssen Deep-Link-Fallback, Fokus, Escape und Backdrop zur Anwendung passen.
