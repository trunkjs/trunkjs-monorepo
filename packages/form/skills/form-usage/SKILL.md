---
name: form-usage
description: Use @trunkjs/form and the tj-form element for AJAX submits, lifecycle controllers, form values, arrays, remote control access, and custom form controls.
---

# @trunkjs/form usage

Use `<tj-form>` when a form must submit through JavaScript and expose programmatic value and control access. It creates an internal native `HTMLFormElement`, so native submit buttons, Enter submit, validation, reset, and form-associated custom elements continue to work.

## Basic form

```html
<tj-form controller="contact-api">
  <input name="name" />
  <input name="topics[]" value="docs" type="checkbox" />
  <input name="topics[]" value="support" type="checkbox" />
  <button type="submit">Send</button>
</tj-form>
```

`name[]` is returned as an array under the key without `[]`. A radio group returns its selected value. A repeated checkbox name returns the selected option values, while one checkbox without `[]` returns a Boolean.

## Values and remote controls

```ts
const form = document.querySelector('tj-form')!;

form.data = { name: 'Max', topics: ['docs'] };
form.map = new Map([['name', 'Erika']]);
console.log(form.formData);

form.remote.get('name')!.value = 'Moritz';
form.remote.get('name')!.disabled = true;
form.remote.get('*')!.validated = true;
```

Prefer `remote.get(name)` in TypeScript. Runtime proxy shortcuts `remote[name]` and `remote['*']` are also available. Use `remote.controls` for wrappers and `remote.elements` for raw elements.

## Controller registry and lifecycle

```ts
import { registerFormController } from '@trunkjs/form';

registerFormController('contact-api', {
  args: { endpoint: '/api/contact' },
  async onLoad({ form }) {
    form.data = await loadDraft();
  },
  onValidate({ form }) {
    return form.checkValidity();
  },
  async onSubmit({ formData, form, data, args }) {
    await fetch(String(args.endpoint), { method: 'POST', body: formData });
    form.remote.get('*')!.disabled = true;
    console.log(data);
  },
  async onError({ context, phase }) {
    if (phase === 'submit') await saveDraft(context.data);
  },
});
```

Registry entries are behavioral controllers, not stored form values. Register them during module evaluation; controller registration and custom-element connection may happen in either order. Select one with the `controller` HTML attribute or `form.controller` property.

Hooks are `onInit`, `onLoad`, `onValidate`, `onSubmit`, `onSuccess`, and `onError`. Load or restore values explicitly inside `onLoad` through `form.data`, `form.map`, or `form.formData`. Return `false` from `onValidate` to stop submission. `onError` receives `{ context, error, phase }`, where phase is `init`, `load`, `validate`, `submit`, or `success`.

For per-element behavior, assign `form.hooks = { ... }`; matching hooks and options override the registry controller. `form.onSubmit` is a shorthand override for only submission. If no submit handler exists and `action` is set, `<tj-form>` submits with `fetch`. Listen for `tj-form-invalid`, `tj-form-submit`, `tj-form-success`, and `tj-form-error` to observe or cancel the lifecycle. Keep validator-plugin orchestration separate until that architecture is specified.

## Programmatic container

```ts
const content = document.createElement('section');
content.innerHTML = '<input name="query">';

const form = new TjForm(content);
form.hooks = {
  async onLoad({ form }) {
    form.data = await loadData();
  },
  onSubmit: ({ formData }) => sendData(formData),
};
document.body.append(form);
```

Use `new FormScope(existingContainer)` when no `<tj-form>` wrapper should be created.

## Custom controls

An automatically detected custom element must have a non-empty `name` attribute/property and a writable `value` property:

```ts
interface CustomFormControlElement extends HTMLElement {
  value: unknown;
  disabled?: boolean;
  valid?: boolean;
  invalid?: boolean;
  validated?: boolean;
}
```

`nte-input` follows this contract and works without a direct Nextrap dependency. Register a dedicated `FormValuePluginInterface` only when a control needs different read/write or child-traversal semantics.
