# 07 — Inline, programmatic and routed dialogs

Run `npx nx serve prolit-elements` and open `http://localhost:4000/examples/dialogs`.
The [complete module](07-dialogs.ts) contains one editor with an external `html` template,
`override scope`, typed input and a string result. No constructor is needed.
The Vite development server serves the example shell at its deep links too.

## Open the same component in three ways

The gallery mounts `<example-user-dialog>` inline. Its Save/Cancel buttons emit
`prolit-dialog-result` with a `DialogResult<string>` detail; the element stays mounted.
An application can call `setInput({ id: '7' })` on an inline instance.

For a programmatic modal, configure the renderer once and await a typed result:

```ts
configureProlitDialogs({ renderer: createSimpleDialogRenderer() });
const result = await ExampleUserDialog.show({ id: '42' }, { size: 'lg' });
if (result.submitted) console.log(result.data); // edited name
```

`show()` creates a new instance. `onInput(input)` runs after class initialization and
before mounting, so scope fields can safely receive input there. Non-void input is
required; a `ProlitDialogElement<void, void>` can use `show()` and `submit()` without
dummy data. A detached instance also supports `open(input, options)` and can be
reopened after its result settles. Repeated `open()` while active returns the same
Promise. Opening an already connected inline instance throws rather than moving it
out of its owner. Configure a renderer before the first open.

`submit(value)` or `abort()` closes the presentation, removes the instance and
settles the result once. External removal cancels too. Scope cleanup and inherited
`on()` listener deregistration run on disconnect; application code does not repeat them.
Renderer failures reject the Promise.

## Normal and partial routes

The same editor has two independent route decorators:

```ts
@route({ name: 'dialog-user', path: '/examples/dialogs/users/:id',
  presentation: 'dialog', closeTo: '/examples/dialogs' })
@route({ name: 'partial-user', path: 'users/:id', outlet: 'modal',
  auxiliary: true, presentation: 'dialog' })
class ExampleUserDialog extends ProlitDialogElement<{ id: string }, string> {
  // Scope and onInput as in 07-dialogs.ts.
}
```

Register the class and renderer on the router, set the default router and mount both
`<router-content>` and `<router-content name="modal">` before starting it:

```ts
const router = new Router([DialogHome, ExampleUserDialog]);
router.setRenderer('dialog', createDialogRouteRenderer());
setDefaultRouter(router);
// DialogHome and outlet mounting are defined in the complete module.
router.start();
router.navigateOutlet('modal', { name: 'partial-user', params: { id: '42' } });
```

This opens `/examples/dialogs(modal:users/42)`. The background page and its draft stay
mounted. Switching to user 7 updates the dialog's input on the same instance.
Direct links and browser history use the same rendering path. Deployments must
serve their application shell at deep links, as the example dev server does.

Closing an auxiliary dialog **replaces** the current URL with that outlet removed,
preserving other outlets, query and hash. Closing a primary dialog replaces the
URL with its required `closeTo` target. No blind `history.back()` is used: direct
links need no previous application entry, and closing does not add a dialog entry.
Browser Back/navigation disposes the old dialog without its result navigating again.
Primary dialog routes replace the primary outlet; use auxiliary routes to keep a page.
Return targets must match a registered route and should not point back to the dialog.

By default the adapter passes route parameters as input. An optional second argument
to `createDialogRouteRenderer(options, context => input)` maps/validates parameters
and query into application input. URL input is not runtime type-safe merely because
the component has a TypeScript generic. Parameter/query changes call `setInput`;
unrelated outlet changes preserve the editor's draft. Presentation errors are reported
as bubbling `route-render-error` events on the owning outlet.

## Flat grey renderer options

The reference renderer uses fixed greys, a dark translucent backdrop, a close button
and native `<dialog>` focus/Escape behavior. It applies no application theme.

| Option | Meaning / default |
|---|---|
| `title` | Accessible dialog title; `Dialog` |
| `size` | `sm` (360px), `md` (560px), `lg` (880px), `fullscreen`; `md` |
| `width`, `height` | CSS length or number in pixels; preset width / automatic height |
| `maxWidth`, `maxHeight` | CSS length or pixels; viewport minus 32px, full viewport for fullscreen |
| `closeButton` | Show the accessible close button; `true` |
| `closeOnEscape` | Allow Escape dismissal; `true` |
| `closeOnBackdrop` | Allow outside-click dismissal; `false` |
| `renderer` | Override the configured renderer for this opening |

For example: `ExampleUserDialog.show({ id: '42' }, { width: 720, height: '60vh' })`.
Explicit dimensions override the selected preset. Put component defaults in
`protected override dialogOptions`; opening options override those defaults.

## Plug in another dialog or offcanvas

Implement the exported `DialogRenderer` interface: `mount(content, options, dismiss)`
mounts the **original element** and returns `{ close() }`. It must attach synchronously,
call `dismiss()` for user cancellation, and release its wrapper, listeners and focus
resources in `close()`, which may return a Promise for an animation. If mounting
throws, the renderer must clean up partially allocated resources before rethrowing.
The base owns the result; the renderer must not recreate the scope or resolve it.

Use `configureProlitDialogs({ renderer: yourRenderer })` or pass an override to
`show()`. A Nextrap adapter belongs in the consuming application/integration package;
the TrunkJS runtime imports neither Nextrap nor the router. The generic Router knows
only `RouteRenderer`/`RouteView`; this adapter connects the two contracts.
