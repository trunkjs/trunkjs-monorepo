# @trunkjs/animate-changes

Animate child additions, removals and movement independently of Prolit.

```ts
import '@trunkjs/animate-changes';
```

```html
<tj-animate-changes selectors="li">
  <ul><li>First item</li></ul>
</tj-animate-changes>
```

The element observes mutations and animates matching elements using the Web Animations API.
Importing this package registers `tj-animate-changes`; the existing tag stays unchanged.
