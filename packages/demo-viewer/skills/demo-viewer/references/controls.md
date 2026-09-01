# Demo Controls

Use `controls: { items: [...] }` for demo interactions. It is rendered as collapsible controls below the demo and provides inspectable handler code through the Vite integration. Do not create separate button rows, toolbars, JSON editors, or output panels inside demo HTML or `render()`.

## Controls and demo elements

Every handler receives the control event and a `TDemoEnvironment`. Query only inside the current demo through `env.query()`, `env.queryOptional()`, or `env.queryAll()`; do not use global `document.querySelector()`.

```ts
export default defineDemo({
  html: '<dialog>Example</dialog>',
  controls: {
    items: [{
      id: 'open',
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

`output` does not render inside the controls. Its initial value and later updates through `env.controls.setValue(...)` are appended to the persistent logging toast.

## Editable JSON

```ts
controls: {
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
        env.controls.setValue('response', event.value);
      },
    },
    { id: 'response', type: 'json', label: 'Current data', readonly: true, value: null },
  ],
}
```

JSON defaults to Apply/Reset. Use `update: 'change'` or `update: 'input'` only for useful live updates, with `debounce` where appropriate. Use `env.controls.getValue()`, `setValue()`, `refresh()`, `reset()`, and `setError()` to coordinate fields.

Use `attributes` for native control attributes that are not represented directly by the item definition:

```ts
{
  id: 'volume',
  type: 'input',
  label: 'Volume',
  value: 50,
  attributes: { type: 'range', min: '0', max: '100' },
  onInput(event) {
    console.log(event.value);
  },
}
```

## Toasts and logging

Use the viewer-owned toast API instead of adding notification or log markup to the demo.

### Temporary toast

`env.toast.show(message, options?)` displays a status toast and returns its numeric id. The optional `title` is rendered above the message:

```ts
onClick(_, env) {
  env.toast.show('The record was saved.', { title: 'Success' });
}
```

Temporary toasts disappear after five seconds unless hovered or keyboard-focused. Keep the returned id only when the demo must close the toast earlier:

```ts
onClick(_, env) {
  const toastId = env.toast.show('Waiting for the request…', { title: 'Loading' });

  void saveRecord().finally(() => env.toast.dismiss(toastId));
}
```

### Persistent log

`env.toast.log(...values)` appends values to the persistent logging toast. Use `env.toast.clearLog()` when a demo action deliberately starts a fresh log:

```ts
afterRender(env) {
  env.toast.log('Initial state', { active: true });
}

// In a control handler:
env.toast.clearLog();
env.toast.log('New run started');
```

`console.log` and `console.error` are also mirrored into the logging toast. Prefer explicit `env.toast.log(...)` when the output is an intentional, documented part of the demo; use console calls for incidental diagnostics.

Closing the logging toast clears its current entries. A later log call or output update makes it visible again.

### Viewer-owned event list

Represent an event list with an `output` control rather than custom HTML. Output controls are omitted from the controls toolbar; their initial values and updates are appended to the persistent logging toast.

```ts
export default defineDemo({
  html: '<example-element></example-element>',
  controls: {
    items: [
      { id: 'events', type: 'output', label: 'Events', value: 'No events yet.' },
    ],
  },
  afterRender(env) {
    const element = env.query('example-element');
    const events: string[] = [];
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      events.push(`changed: ${JSON.stringify(detail)}`);
      env.controls.setValue('events', events.join('\n'));
      env.toast.show('changed', { title: 'Component event' });
    };

    element.addEventListener('changed', onChanged);
    return () => element.removeEventListener('changed', onChanged);
  },
});
```

`env.controls.setValue('events', value)` stores the current output value and adds a labeled log entry. Keep the list bounded in long-running demos so repeated events do not produce unbounded strings.

## After render and cleanup

Use `afterRender(env)` for initialization that needs the completed demo DOM. Return cleanup logic when adding listeners.

```ts
afterRender(env) {
  const table = env.query<NteDataTableElement>('nte-data-table');
  const update = () => env.controls.setValue('response', table.data);
  table.addEventListener('data-change', update);
  update();
  return () => table.removeEventListener('data-change', update);
}
```

`env.element` is available when the rendered demo has exactly one root element.

## Migration

- `actionBar: { items }` → `controls: { items }`
- `controls: [...]` → `controls: { items: [...] }` using typed items and `onClick`/`onChange` handlers
- `env.actionBar` → `env.controls`
- `controls_raw_html` → an `html` or `custom` control item
