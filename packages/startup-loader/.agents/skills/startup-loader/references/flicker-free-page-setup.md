# Flicker-free page setup

Use this setup when creating or reviewing a page shell. Flicker prevention depends on CSS and markup being present before the first paint; the JavaScript coordinator alone cannot undo content that was already visible.

## 1. Load the critical rule before modules

Put the package's `index.scss` into the application's blocking CSS bundle, or inline its compiled rule in `<head>`:

```html
<style>
  tj-startup-loader:not(:defined) {
    display: block;
  }

  tj-startup-loader:not(:defined) > :not([slot='loader']) {
    visibility: hidden !important;
  }
</style>
```

Do not rely exclusively on CSS injected by a deferred or module script. That can run after the browser's first paint on a cold or throttled load.

## 2. Render the loader shell in the initial HTML

Place every element that must reveal as one unit inside the startup loader. Keep the optional theme loader in its dedicated slot so the critical rule leaves it visible:

```html
<body>
  <tj-startup-loader scope="global">
    <div slot="loader" role="status" aria-live="polite">Initializing…</div>

    <app-config startup-id="config"></app-config>
    <app-layout startup-id="layout" depends-on="config"></app-layout>
  </tj-startup-loader>

  <script type="module" src="/src/main.ts"></script>
</body>
```

Do not insert the loader wrapper later from JavaScript. Child components may already have initialized or painted by then.

## 3. Define the coordinator from the module entry

```ts
import '@trunkjs/startup-loader';
```

If the application CSS pipeline supports Sass imports before first paint, include this there rather than relying on a JavaScript-side style import:

```scss
@use '@trunkjs/startup-loader/index.scss';
```

The global Browser Utils queue allows participating child elements to register before the `<tj-startup-loader>` definition has loaded, as long as the loader tag is already present in the document.

## 4. Preserve the reveal phases

- `startup-loader:ready`: all registered startup work has settled; main content is still hidden.
- `startup-loader:pre-visual`: the loader slot is removed and the content is prepared for reveal.
- `startup-loader:visual`: the reveal transition has completed and the content is fully visible.

Do not add competing `display`, `visibility`, or `opacity` rules to the loader's direct children. Put application animation inside the revealed components and start reveal-dependent behavior through `waitForPreVisual` or `waitForVisual`.

## 5. Verification checklist

- The critical selector is present in the initial `<head>` response.
- The startup loader and its protected content are present in the initial HTML.
- Only the element with `slot="loader"` remains visible before custom-element definition.
- There is only one global loader; isolated nested loaders use `scope="local"`.
- Participating components use `StartupLoaderMixin` and await the base `connectedCallback()` when overriding it.
- Every `depends-on` value resolves to one unique `startup-id`.
- With `<tj-startup-loader debug>`, the console shows registration, dependency-safe starts, readiness, and reveal phases in the expected order.
- Under cache-disabled network and CPU throttling, protected content never appears partially initialized.
- Missing dependencies, cycles, and timeouts produce useful errors but still reveal the page.
