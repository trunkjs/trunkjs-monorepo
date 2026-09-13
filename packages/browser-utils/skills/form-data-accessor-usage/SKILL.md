---
name: form-data-accessor-usage
description: Use @trunkjs/browser-utils FormDataAccessor to read or write named native and custom form controls, inspect element/value pairs, or create FormData from a DOM container.
---

# FormDataAccessor usage

Use `FormDataAccessor` for a small, framework-independent view of named value elements below a DOM root.

```ts
import { FormDataAccessor } from '@trunkjs/browser-utils';

const accessor = new FormDataAccessor(container);

accessor.data = { name: 'Erika', topics: ['docs'] };
console.log(accessor.data);
console.log(accessor.formData);
```

The root may be an `HTMLElement`, `Document`, or `DocumentFragment`. Controls are discovered dynamically on every
access. A control needs a non-empty `name` and a readable/writable `value` property. Native inputs, textareas, selects,
and compatible custom elements such as `nte-input` follow this contract.

A named value element owns its complete value. Named descendants below it are not returned as additional entries. This
allows object-valued controls such as a named nested `tj-form` to form a data tree without duplicate flat fields.

## Data behavior

- `name[]` becomes an array under the name without `[]` in `data`.
- A radio group returns its selected value.
- One checkbox without `[]` returns a Boolean.
- Checkbox groups return selected option values.
- Multi-selects and custom controls may expose arrays.
- Assigning `data` is a partial update; names absent from the object are unchanged.
- `formData` omits disabled, unchecked, and non-submit controls.

## Element and value pairs

Use `entries` when code needs both the current value and its original element. Each entry has a dynamic `value`
getter/setter, so it can update the control without a wrapper API.

```ts
for (const entry of accessor.entries) {
  console.log(entry.name, entry.value, entry.element);
}

accessor.entries.forEach(({ element }) => {
  element.toggleAttribute('validated', true);
});
```

Prefer direct iteration for operations such as disabling, validating, or marking controls invalid. Add specialized
collection methods only when a concrete repeated requirement cannot be expressed clearly through `entries`.
