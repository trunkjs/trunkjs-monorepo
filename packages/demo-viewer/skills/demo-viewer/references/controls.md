# Demo Action Bar

Use `actionBar` for demo interactions. It is rendered as the viewer's collapsible bottom bar. Do not create separate button rows, toolbars, JSON editors, or output panels inside demo HTML or `render()`.

## Actions and demo elements

Every handler receives the action event and a `TDemoEnvironment`. Query only inside the current demo through `env.query()`, `env.queryOptional()`, or `env.queryAll()`; do not use global `document.querySelector()`.

```ts
export default defineDemo({
  html: '<dialog>Example</dialog>',
  actionBar: {
    items: [{
      type: 'button',
      label: 'Open dialog',
      onClick(_, env) {
        env.query<HTMLDialogElement>('dialog').showModal();
      },
    }],
  },
});
```

Available item types are `button`, `input`, `select`, `textarea`, `checkbox`, `json`, `output`, `html`, `group`, and `custom`.

## Editable JSON

```ts
actionBar: {
  items: [
    {
      id: 'request',
      type: 'json',
      label: 'Table data',
      editable: true,
      value: [{ id: 1, name: 'Alice' }],
      validate: value => Array.isArray(value) || 'Expected an array.',
      onApply(event, env) {
        env.query<NteDataTableElement>('nte-data-table').data = event.value;
        env.actionBar.setValue('response', event.value);
      },
    },
    { id: 'response', type: 'json', label: 'Current data', readonly: true, value: null },
  ],
}
```

JSON defaults to Apply/Reset. Use `update: 'change'` or `update: 'input'` only for useful live updates, with `debounce` where appropriate. Use `env.actionBar.getValue()`, `setValue()`, `refresh()`, `reset()`, and `setError()` to coordinate fields.

## After render and cleanup

Use `afterRender(env)` for initialization that needs the completed demo DOM. Return cleanup logic when adding listeners.

```ts
afterRender(env) {
  const table = env.query<NteDataTableElement>('nte-data-table');
  const update = () => env.actionBar.setValue('response', table.data);
  table.addEventListener('data-change', update);
  update();
  return () => table.removeEventListener('data-change', update);
}
```

`env.element` is available when the rendered demo has exactly one root element.

## Legacy controls

Existing `controls` and `controls_raw_html` remain supported. Use `actionBar` for new and updated demos.
