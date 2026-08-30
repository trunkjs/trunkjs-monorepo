# Demo Action Bar

Use `actionBar` for demo interactions. It is rendered as collapsible controls below the demo. Do not create separate button rows, toolbars, JSON editors, or output panels inside demo HTML or `render()`.

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

With the Vite integration, inline `onClick`, `onChange`, `onInput`, `onApply`, and `validate` bodies are automatically inspectable from the Code action next to the control. Give controls stable `id` values when possible; otherwise the build integration uses their nested array path. Use `inspectable()` for a referenced handler.

`output` does not render inside the controls. Its initial value and later updates through `env.actionBar.setValue(...)` are appended to the persistent logging toast.

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

## Toasts and logging

Use the viewer-owned toast API for short notifications and persistent log output:

```ts
afterRender(env) {
  env.toast.show('Saved', { title: 'Success' });
  env.toast.log('Current value', { active: true });
}
```

Normal toasts disappear after five seconds unless hovered or keyboard-focused. Log entries remain in the bottom logging toast until it is closed or `env.toast.clearLog()` is called. `console.log` and `console.error` are mirrored into this logging toast.

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
