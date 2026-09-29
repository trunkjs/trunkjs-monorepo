# 08 — Router, Prolit und Scope: Ist-/Soll-Beispiele für den Review

**Status: Entwurfsvergleich vom 29. September 2026.** Die Abschnitte mit „AKTUELL“ verwenden APIs des Quellstands `842245e5996e6d51ff4d1b3ca896a280b2c28506`. „VORGESCHLAGEN“ bezeichnet noch nicht implementierte Erweiterungen. Insbesondere `routeResource`, `start({ default: true })`, `updateQuery`, `NavigationResult` und `onViewSuccess` sind keine bereits verfügbaren Exports bzw. Optionen. Vorgeschlagene Varianten stehen nur hier in Markdown, nicht als vermeintlich ausführbare TypeScript-Module.

Die vollständigen Proposals liegen im Quellrepository unter `packages/prolit/proposals/2026-09-29-router-prolit-scope-api.md` und `packages/prolit/proposals/2026-09-29-router-prolit-scope-internals.md`. Dieses Dokument bleibt auch ohne diese nicht mitgelieferten Quelldokumente verständlich. „Aktuell“ ist keine Aussage über npm-Veröffentlichungen. Der offene Dirty-Navigation-PR #41 ist nicht Teil des genannten `main`-Stands.

## 01 — Eine Benutzerseite über einen echten Direktlink öffnen

**AKTUELL.** [03-router-users.ts](03-router-users.ts) definiert und registriert `ExampleUserPage`, ihren lokalen Datensatz für Ada (`42`) und Linus (`7`), den Scope und die Ladebehandlung. Keine API-Server-Attrappe und kein zusätzliches Mount-Hilfsprogramm sind erforderlich.

In die Anwendung gehört dieses HTML:

```html
<router-content></router-content>
```

Das Anwendungsmodul, ausgeführt nachdem der Body existiert:

```ts
import { Router, setDefaultRouter } from '@trunkjs/router';
import { ExampleUserPage } from './03-router-users';

const router = new Router([ExampleUserPage]);
setDefaultRouter(router);
router.start();
```

Jetzt `/users/42?tab=history` öffnen: Ada und der Tab `history` werden angezeigt. Der vorhandene Link auf Linus navigiert nach `/users/7?tab=profile`. Eine unbekannte ID wie `/users/99` zeigt die Resource-Fehlermeldung; der Retry-Button wiederholt den Read für genau diese ID. Ohne geänderte Daten bleibt ein unbekannter Benutzer auch nach Retry unbekannt — Wiederholung ist keine Erfolgszusage.

**Wichtig:** Nicht nach `start()` bedingungslos `replace('/users/42')` aufrufen. Das würde jeden Direktlink überschreiben. Die Anwendung muss ihren Shell-Einstieg auch für `/users/...` ausliefern. Beim tatsächlichen Abbau der Anwendung `router.stop()` aufrufen; dies stoppt die Browser-Listener, entfernt aber nicht eigenständig alle vorhandenen Views.

**VORGESCHLAGEN — nur der Start wird kürzer:**

```ts
import { Router } from '@trunkjs/router';
import { ExampleUserPage } from './03-router-users';

const router = new Router([ExampleUserPage]).start({ default: true });
```

Die Option übernimmt ausdrücklich die Default-Bindung; die Adresse wird weiterhin nur gelesen. Die drei Verantwortlichkeiten bleiben erkennbar: Elementregistrierung im Komponentenmodul, Routenregistrierung im Router, Aktivierung durch `start`. Eine parameterlose Seite benötigt bereits heute kein `withRouter` und keinen leeren Route-Hook.

## 02 — Route und Daten verbinden, ohne Mount-Wissen in jeder Seite

**AKTUELL.** Im vollständigen Beispiel 03 koordinieren zwei Stellen denselben Ladeauftrag. Der relevante Auszug lautet:

```ts
// Innerhalb des Scopes:
$hooks: {
  $connect: (): (() => void) => {
    this.#scopeConnected = true;
    if (this.scope.userId) void this.scope.user.reload(this.scope.userId);
    return () => { this.#scopeConnected = false; };
  },
},
```

```ts
// Innerhalb der Klasse:
#scopeConnected = false;

override onRouteChange({ route }: RouteChange): void {
  this.scope.tab = route.query.get('tab') ?? 'profile';
  const id = route.params['id'];
  if (id === this.scope.userId) return;
  this.scope.userId = id;
  if (this.#scopeConnected) void this.scope.user.reload(id);
}
```

`userId` speichert die bereits übernommene Identität, `#scopeConnected` schützt vor einem Request vor Aktivierung. Diese Zeilen heute einfach zu löschen wäre falsch. Der Reviewer muss derzeit die Reihenfolge von Router-Hook und Lit-Mount kennen, obwohl der fachliche Auftrag nur „Benutzer für diese ID laden“ lautet.

**VORGESCHLAGEN.** Folgende vollständige alternative Komponente verwendet den neuen, optionalen Bibliotheksadapter. Sie ersetzt Beispiel 03 für diesen Entwurf; nicht beide Alternativen gleichzeitig in denselben Router registrieren.

```ts
import { ProlitElement, scopeDefine } from '@trunkjs/prolit';
import { routeResource } from '@trunkjs/prolit/router'; // VORGESCHLAGEN
import { route, withRouter } from '@trunkjs/router';
import { customElement } from 'lit/decorators.js';

const sampleUsers: Record<string, { id: string; name: string }> = {
  '42': { id: '42', name: 'Ada' },
  '7': { id: '7', name: 'Linus' },
};

@route({ name: 'review-user', path: '/users/:id' })
@customElement('review-user-page')
export class UserPage extends withRouter(ProlitElement) {
  protected override scope = scopeDefine({
    // language=HTML
    $tpl: `
      <main>
        <nav>
          <a href="/users/42?tab=profile">Ada</a>
          <a href="/users/7?tab=profile">Linus</a>
        </nav>
        <p *if="user.pending" role="status">Loading user…</p>
        <p *if="user.error" role="alert">{{ user.error.message }}</p>
        <button *if="user.error" @click="user.reload()"
          ?disabled="user.pending">Retry</button>
        <section *if="user.data">
          <h1>{{ user.data.name }}</h1>
          <p>User ID: {{ user.data.id }}, tab: {{ $fn.tab() }}</p>
        </section>
      </main>
    `,
    user: routeResource(this, {
      key: route => route.params['id'],
      load: async (_context, id) => {
        const user = sampleUsers[id];
        if (!user) throw new Error(`Unknown user ${id}`);
        return user;
      },
      errorMessage: 'User could not be loaded.',
    }),
    $fn: {
      tab: (): string => this.query.get('tab') ?? 'profile',
    },
  });
}
```

In der Anwendung wird nun `UserPage` aus diesem alternativen Komponentenmodul importiert und mit `new Router([UserPage])` registriert; HTML und Startablauf entsprechen 01. Es gibt keine zusätzliche Anwendungs-Hilfsklasse hinter `routeResource`: Der Adapter wäre Teil der Bibliothek und müsste zuerst implementiert werden.

Der Reviewer sieht die Datenidentität in `key`, den Read in `load` und den öffentlichen Fehlertext unmittelbar nebeneinander. `userId`, Verbindungsmerker, `onRouteChange` und `$connect` entfallen für diesen Standardfall. Ein geänderter Tab benötigt kein dupliziertes Scope-Feld: `$fn.tab()` liest den bestätigten Routerzustand. Der vorgeschlagene Adapter muss bei relevanten Route-Updates auch die Scope-Darstellung invalidieren, selbst wenn der Resource-Schlüssel gleich bleibt.

Die verkürzte Nutzung verlangt einen strengeren internen Vertrag: kein Request während Konstruktion, genau ein Read nach Aktivierung, Abbruch bei neuem Schlüssel oder Disconnect, kein automatischer Retry und keine alten Daten unter neuer Identität. `reload()` wiederholt den aktuellen Schlüssel. Ein `null`-Schlüssel deaktiviert die Auswahl. Der bisherige `scopeResource.reload(...args)` bleibt für explizit gesteuerte Operationen erhalten.

Für dynamische Links bleibt `router.url({ name, params, query })` richtig. Die beiden statischen Links oben brauchen absichtlich keinen Wrapper. Weniger Code bedeutet hier auch, vorhandenes HTML zu nutzen, statt jede URL durch eine neue Funktion zu leiten.

## 03 — Suche und komplexere Schlüssel, ohne alle Route-Änderungen zu laden

**AKTUELL.** [02-api-users.ts](02-api-users.ts) verwendet `scopeResource` und übergibt `reload(query)` ausdrücklich. [02-api.ts](02-api.ts) definiert den vollständigen typisierten `API`-Stub: `GET /api/users?q=...` liefert `User[]`, `POST /api/users` mit `{ name }` liefert einen `User`. In einer echten Anwendung wird stattdessen deren generierter Stub importiert. Es gibt hier keinen erfundenen `API.Users.Get`-Endpoint.

**VORGESCHLAGEN — Scope-Feld in einer routerfähigen Listenkomponente:**

```ts
// Zusätzlich im Komponentenmodul:
import { API } from './02-api';

// Ersetzt dort die manuell vom Suchbegriff angestoßene Resource:
users: routeResource(this, {
  key: route => route.query.get('q') ?? '',
  load: ({ signal }, query) => API.Users.List.request({
    query: { q: query },
    options: { signal },
  }),
  errorMessage: 'Users could not be loaded.',
}),
```

Der Datenaufruf ist real; nur die automatische Route-/Aktivierungsbindung ist vorgeschlagen. Änderungen an `tab` oder `#details` lösen keinen Read aus, weil beide nicht im Schlüssel stehen. Ein leerer Suchbegriff ist ein gültiger Request; eine leere Ergebnisliste ist Erfolg.

Heute müssen Query-Änderungen als vollständiges Navigationsziel formuliert werden. Der vorgeschlagene Komfortaufruf verändert nur die aktuelle Query und läuft dennoch durch die normale Navigation:

```ts
// VORGESCHLAGEN; router ist die bereits gestartete Instanz aus 01.
await router.updateQuery({ q: 'Ada' }, { replace: true });
await router.updateQuery({ q: null }, { replace: true }); // Suchwert entfernen
```

Pfad, andere Outlets, Hash und nicht angegebene Query-Werte bleiben erhalten. `undefined` bedeutet keine Änderung, `null` Entfernen. Ein Suchfeld hat gegebenenfalls einen lokalen Eingabeentwurf; die bestätigte URL bleibt nach abgelehnter Navigation unverändert. Eine entsprechende Formularvariante muss diesen Entwurf erhalten oder ausdrücklich auf den bestätigten Wert zurücksetzen, statt eine nicht erfolgte Navigation vorzutäuschen.

Bei Mandanten- und Sprachabhängigkeit kann der Schlüssel ein flaches Tupel sein: `key: r => [r.params['tenant'], r.query.get('lang') ?? 'de'] as const`. Der Loader bekommt dieses Tupel als zweites Argument. Das ist eine bewusst erweiterte Definition, kein implizites Erben alter Parameter. Eigene Startbedingungen bleiben über manuelle Resources oder `null` als deaktivierenden Schlüssel möglich.

## 04 — Speichern: weniger Koordination, aber keine verschleierten Fehler

**AKTUELL.** Beispiel 02 trennt Read und Write bereits richtig. Der gekürzte Auszug aus `submit()` zeigt den Erfolgspfad:

```ts
const result = await this.scope.$fn.create(name);
if (result.status !== 'success' || !this.isConnected) return;
this.scope.draft = '';
await this.scope.users.reload(this.scope.query);
```

Ein Reviewer muss hier zwei Fragen ergänzen: Kann der Benutzer während des POST bereits einen neuen Entwurf schreiben? Kann dieselbe Instanz inzwischen erneut verbunden oder für andere Eingabedaten verwendet worden sein? `isConnected` allein beantwortet beides nicht. Der Standardfall kann die Felder während des abschließenden Writes sperren; editierbare Parallelentwürfe brauchen stattdessen eine Versions-/Identitätsprüfung.

**VORGESCHLAGEN — optionale spätere Action-Ergänzung, noch nicht verfügbar.** Diese unabhängige Komponente zeigt einen einfachen Create-Flow mit dem vorhandenen HTTP-Vertrag aus 02. Sie wird wie andere normale Komponenten importiert und über `<review-create-user></review-create-user>` in der Anwendung verwendet; sie benötigt keinen Router.

```ts
import { ProlitElement, scopeAction, scopeDefine, scopeResource } from '@trunkjs/prolit';
import { customElement } from 'lit/decorators.js';
import { API } from './02-api';

@customElement('review-create-user')
export class CreateUser extends ProlitElement {
  protected override scope = scopeDefine({
    // language=HTML
    $tpl: `
      <section>
        <form @submit="$event.preventDefault(); $fn.create(draft.trim())">
          <fieldset ?disabled="$fn.create.pending">
            <label>Name <input required .value="draft"
              @input="draft = $event.currentTarget.value"></label>
            <button type="submit" ?disabled="!draft.trim()">Create</button>
          </fieldset>
        </form>
        <p *if="$fn.create.pending" role="status">Saving…</p>
        <p *if="$fn.create.error" role="alert">{{ $fn.create.error.message }}</p>
        <p *if="users.pending" role="status">Loading users…</p>
        <p *if="users.error" role="alert">{{ users.error.message }}</p>
        <button *if="users.error" @click="users.reload()"
          ?disabled="users.pending">Retry list</button>
        <p *if="!users.pending && users.data?.length === 0">No users.</p>
        <ul><li *for="user of users.data ?? []; user.id">{{ user.name }}</li></ul>
      </section>
    `,
    draft: '',
    users: scopeResource({
      load: ({ signal }) => API.Users.List.request({
        query: { q: '' }, options: { signal },
      }),
      errorMessage: 'Users could not be loaded.',
    }),
    $fn: {
      create: scopeAction({
        run: (name: string) => API.Users.Create.request({ body: { name } }),
        errorMessage: 'User could not be saved.',
        // VORGESCHLAGEN: nur für dieselbe aktive View, kein Server-Erfolgs-Hook.
        onViewSuccess: (): void => {
          this.scope.draft = '';
          void this.scope.users.reload();
        },
      }),
    },
    $hooks: {
      $connect: (): void => { void this.scope.users.reload(); },
    },
  });
}
```

Erwartung: Ein POST wird genau einmal ausgeführt; währenddessen sind die Formulareingaben gesperrt. Ein fehlgeschlagener POST lässt den Entwurf bestehen. Nach bestätigtem Erfolg in derselben Aktivierung wird der Entwurf geleert und die Liste separat geladen. Schlägt nur dieses Laden fehl, wiederholt „Retry list“ ausschließlich GET, nicht POST. Der Server muss den Namen weiterhin validieren; native Formularvalidierung ist kein API-Schutz.

`onViewSuccess` darf nur synchrone lokale Folgearbeit ausführen. Der separat gestartete Read liefert weiterhin sein eigenes Ergebnis. Nach Disconnect oder anderer View-Identität entfällt der UI-Effekt, aber der tatsächliche Write-Erfolg bleibt im zurückgegebenen `ScopeResult` erhalten. Für wiederverwendete Dialoge wäre ein zusätzlicher expliziter `viewKey` nötig. Ein Fehler im Effekt darf einen erfolgreichen Write nicht zu „Write fehlgeschlagen“ machen. Diese Semantik ist Voraussetzung für die Ergänzung, nicht bereits in `scopeAction` enthalten.

Für mehrstufige, asynchrone Geschäftsabläufe bleibt die vorhandene ausdrückliche Form `const result = await action(...); if (result.status === 'success') ...` sinnvoll. Das Ziel ist nicht, jede erkennbare Erfolgsentscheidung in Konfigurations-Callbacks zu verstecken. Die Action-Ergänzung ist gegenüber `routeResource` nachrangig.

## 05 — Dialog oder Inspector: die Standard-API nicht ersetzen

**AKTUELL.** [07-dialogs.md](07-dialogs.md) zeigt den vollständigen Input-/Result-Vertrag und dieselbe Komponente inline, programmgesteuert oder als Route. Ein einzelner Dialogaufruf braucht keine neue Abstraktion:

```ts
import { configureProlitDialogs } from '@trunkjs/prolit/dialog';
import { createSimpleDialogRenderer } from '@trunkjs/prolit/dialog/simple';
import { ExampleUserDialog } from './07-dialogs';

configureProlitDialogs({ renderer: createSimpleDialogRenderer() }); // einmal beim App-Start
const result = await ExampleUserDialog.show({ id: '42' });
if (result.submitted) console.log(result.data);
```

Für eine adressierbare Zusatzansicht bleibt die vorhandene Form `router.navigateOutlet('modal', { name: 'partial-user', params: { id: '42' } })` passend. Sie setzt die Route, den Renderer und das benannte Outlet aus Beispiel 07 voraus. Der Hintergrund soll dabei seinen Entwurf behalten.

**VORGESCHLAGENE VERBESSERUNG DES VERTRAGS, NICHT NEUE AUFRUFS-SYNTAX:** Die konkrete View erhält ihre eigenen Outlet-Parameter. Eine fachlich irrelevante Query-Änderung setzt ihren Entwurf nicht zurück. Bei abgelehnter Dirty-Bestätigung bleibt der Dialog offen. Dazu muss eine Schließabsicht vor der tatsächlichen Entfernung geprüft werden; ein nachträglicher Guard nach `open().then(...)` kommt zu spät.

Ein eigener Renderer oder ein komplexeres Input-Mapping bleibt ausdrücklich möglich. Das Beispiel benötigt dafür weder eine zusätzliche Scope-Kopie noch einen zweiten Router. Globale automatische Datenübernahme zwischen Primärseite und Dialog wird nicht vorgeschlagen.

## 06 — Was ist wirklich fertig, wenn ein Aufruf zurückkehrt?

| Aufruf / Zustand | AKTUELL | Zukünftiger Vertrag |
|---|---|---|
| `router.url(target)` | URL erzeugt, keine Navigation. | Unverändert synchron. |
| `router.navigate(target)` | Synchroner Kontext oder `null`; keine Datenbereitschaft. | Vorgeschlagenes `Promise<NavigationResult>` nach Guard/Commit, weiterhin keine HTTP-Bereitschaft. |
| `scopeResource.reload(...)` | `ScopeResult` dieses Reads. | Beibehalten; `routeResource.reload()` bindet nur dessen Argument aus der Route. |
| `scopeAction(...)` | Tatsächliches Write-Ergebnis, auch über Disconnect hinweg. | Beibehalten; gültiger UI-Effekt separat. |
| `updateComplete` | Lit-Komponentenupdate, nicht sämtliche Scope-Requests. | Keine künstliche Gleichsetzung mit Datenbereitschaft. |
| Dialog `show()` | Benutzerresultat nach Schließen; kein Router-Commit-Vertrag. | Routed Close muss vor Disposal autorisiert werden. |

Der offene PR #41 schlägt zunächst `Promise<RouteContext | null>` vor, nicht bereits `NavigationResult`. Eine Umstellung ist deshalb mit allen Outlet-/Dialog-Aufrufern gemeinsam zu planen. Bestehende Wahrheitswertprüfungen von `router.replace(...)` wären bei einer Promise nicht mehr korrekt. Guards für Link, Back/Forward, programmgesteuerte Navigation und Schließen dürfen nicht getrennte Regeln besitzen.

## 07 — Review ohne Kenntnis der Bibliotheksinternas

| Frage | Wo sie im vorgeschlagenen Standardfall beantwortet wird |
|---|---|
| Welche Seite? | `@route` an der Komponentenklasse. |
| Welche Daten und wann laden? | `routeResource.key` und `load` nebeneinander. |
| Woher kommen Request-Typen? | Konkreter importierter API-Stub, nicht eine angenommene Helper-Funktion. |
| Was ist währenddessen sichtbar? | `pending`, `error`, Daten und Retry im Template. |
| Was verändert den Server? | Eigenständige `scopeAction.run`. |
| Was geschieht nach Erfolg? | Expliziter Ergebniszweig oder deutlich benannter optionaler View-Effekt. |
| Welche Daten werden gespeichert? | Konkretes DTO wie `{ name }`, nicht der ganze Scope. |
| Was passiert bei Spezialfällen? | Manuelle Resource, expliziter Router, Input-Mapping und Renderer bleiben nutzbar. |

Die Reduktion im Detailbeispiel ist konkret: zwei technische Zustandsfelder und zwei koordinierende Lifecycle-Stellen entfallen. Die fachliche Datenidentität, Fehlermeldung und Wiederholung bleiben sichtbar. Dieser Nutzen rechtfertigt eine Bibliotheksintegration eher als bloß kürzere Namen oder ein Decorator, der Route, HTTP, Formular und Dialog gleichzeitig versteckt.

Die aktuellen Beispiele wurden anhand ihrer Implementierung und der vorhandenen Tests gelesen. Die vorgeschlagenen Varianten sind Entwurfscode, nicht ausgeführt oder gegen bereits vorhandene Exports typgeprüft. Vor Übernahme als ausführbare `.ts`-Beispiele müssen die neuen Verträge implementiert und insbesondere Deep Links, Überholung, Reconnect, Query-only-Updates, Write-Erfolge und abgelehnte Dialogschließung geprüft werden.
