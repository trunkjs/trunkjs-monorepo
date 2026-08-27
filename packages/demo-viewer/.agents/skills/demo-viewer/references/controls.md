# Demo Controls

Use `controls` for repeatable viewer controls. Each definition creates or accepts an element and attaches its handlers.

## Standard controls

```ts
import { defineDemo } from '@trunkjs/demo-viewer';

export default defineDemo({
  title: 'Interactive button',
  html: '<button id="target" type="button">Target</button>',
  controls: [
    {
      label: 'Disable target',
      info: 'Toggles the disabled state.',
      element: 'button',
      onclick: () => {
        const target = document.querySelector<HTMLButtonElement>('#target');
        if (target) target.disabled = !target.disabled;
      },
    },
    {
      label: 'Variant',
      element: 'select',
      selectOptions: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
      ],
      onchange: (event) => {
        const value = (event.target as HTMLSelectElement).value;
        document.querySelector('#target')?.setAttribute('data-variant', value);
      },
    },
  ],
});
```

Supported element shortcuts are:

- `button`
- `input`
- `select`
- `textarea`

An existing `HTMLElement` can also be supplied through `element`.

Use `init(element)` for initial configuration that needs the created element. It may be asynchronous.

## Events

Common event shortcuts include:

- `onclick`
- `onchange`
- `oninput`
- `onfocus`
- `onblur`
- `onkeydown`
- `onkeyup`

Use the `events` map for other event names:

```ts
{
  label: 'Pointer control',
  element: 'button',
  events: {
    pointerenter: () => console.log('entered'),
    pointerleave: () => console.log('left'),
  },
}
```

## Custom control markup

Use `controls_raw_html` only when the standard definitions cannot express the required UI:

```ts
export default defineDemo({
  title: 'Custom controls',
  html: '<div id="preview"></div>',
  controls_raw_html: `
    <fieldset>
      <legend>Preview size</legend>
      <button type="button" data-size="small">Small</button>
      <button type="button" data-size="large">Large</button>
    </fieldset>
  `,
});
```

Prefer `controls` when event handlers or initialization logic are required; it keeps behavior in TypeScript instead of inline HTML attributes.
