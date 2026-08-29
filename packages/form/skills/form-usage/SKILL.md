---
name: form-usage
description: Use @trunkjs/form for dynamic named DOM values, element/value entries, native FormData, and registered tj-form lifecycle callbacks.
---

# @trunkjs/form usage

Use `FormDataAccessor` from `@trunkjs/browser-utils` when named native or custom controls below a DOM root need a small
read/write API. Use `<tj-form>` when the same data access also needs registered load, validation, submit, success, or
error callbacks.

## Dynamic data access

```ts
import { FormDataAccessor } from '@trunkjs/browser-utils';

const accessor = new FormDataAccessor(container);

accessor.data = { name: 'Erika', topics: ['docs'] };
console.log(accessor.data);
console.log(accessor.formData);
```

The accessor queries current `[name]` descendants on every access. A supported element has a non-empty `name` and a
readable/writable `value` property. Native inputs, textareas, selects, and compatible custom elements such as
`nte-input` follow this contract.

`name[]` becomes an array under the name without `[]` in `data`. Radio groups return the selected value. A single
checkbox without `[]` returns a Boolean; checkbox groups return selected option values.

## Element and value access

Use `entries` when behavior must be applied to individual controls. Each entry exposes `name`, the original `element`,
and a dynamic `value` getter/setter.

```ts
for (const entry of accessor.entries) {
  console.log(entry.name, entry.value, entry.element);
}

accessor.entries.forEach(({ element }) => {
  element.toggleAttribute('validated', true);
});
```

Do not introduce a remote proxy, validation collection, or plugin registry for operations that can be expressed by
iterating these entries. Add specialized behavior only when a concrete control cannot satisfy the value contract.

## Registered form callbacks

```html
<tj-form controller="contact-api">
  <input name="name" />
  <button type="submit">Send</button>
</tj-form>
```

```ts
import { registerFormController } from '@trunkjs/form';

registerFormController('contact-api', {
  async onLoad({ form }) {
    form.data = await loadDraft();
  },
  onValidate({ form }) {
    return form.checkValidity();
  },
  async onSubmit({ form }) {
    await fetch('/api/contact', { method: 'POST', body: form.formData });
  },
  onError({ context, phase }) {
    if (phase === 'submit') saveDraft(context.form.data);
  },
});
```

Registry entries contain callbacks and optional `action`, `method`, and `fetchOptions`; they do not contain values or
generic `args`. Capture connector configuration in the callback closure. Registration and custom-element connection may
happen in either order.

Available hooks are `onInit`, `onLoad`, `onValidate`, `onSubmit`, `onSuccess`, and `onError`. Return `false` from
`onValidate` to stop submission. If no `onSubmit` exists and an action is configured, `<tj-form>` submits with `fetch`.

Use `form.form`, `requestSubmit()`, `reset()`, `checkValidity()`, and `reportValidity()` for native form behavior. Events
`tj-form-invalid`, `tj-form-submit`, `tj-form-success`, and `tj-form-error` remain available for observation.
