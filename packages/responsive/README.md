# Responsive Module

The **Responsive Module** provides an easy way to define breakpoints outside of CSS media queries, allowing dynamic DOM updates using JavaScript.


## Basic Usage

```html
<div class="-md:d-none md:d-block lg:text-red"></div>
<div style="display:none" md-style="display:block;color:red"></div>
```

## Breakpoints

Breakpoints are defined in `window.config.breakpoints` and default to Bootstrap's breakpoint system:

- **xs**: 0px
- **sm**: 576px
- **md**: 768px
- **lg**: 992px
- **xl**: 1200px
- **xxl**: 1400px

You can override these values by configuring `window.config.breakpoints`.

## Class-Based Features

The module allows class names to be applied dynamically based on breakpoints.

```html
<div class="-xl:d-none xl:d-block lg-xxl:text-red"></div>
```

### Explanation:
- **`-xl:`** → This class applies **below** the `xl` breakpoint.
- **`xl:`** → This class applies **above** the `xl` breakpoint.
- **`lg-xxl:`** → This class applies **between** `lg` and `xxl` breakpoints.

### Example Behavior:
- When the viewport width is **1300px**, the `xl:d-block` rule applies, making the element visible.
- When the viewport width is **500px**, the `-xl:d-none` rule applies, hiding the element.

## Style-Based Features

You can also define inline styles for different breakpoints using `*-style` attributes.

```html
<div style="display:none" xl-style="display:block;color:red"></div>
```

### Behavior:
- When the viewport width reaches the `xl` breakpoint, `display:block` and `color:red` are applied.

## Features

- **Idempotency:** The adjustment process is repeatable, meaning original classes and styles are stored and restored appropriately.
- **Mutation Observation:** The module dynamically adjusts content when DOM elements are added or modified.

## API and Usage

### Import and Initialize:

```typescript
import { TjResponsive } from "./responsive";

const responsive = new TjResponsive();
responsive.adjust(document.body);
responsive.observe(document.body);
```

### Methods:

- **`adjust(target: HTMLElement)`**  
  Adjusts and applies responsive classes and styles to the target element and its children.

- **`observe(target: HTMLElement)`**  
  Observes changes in the DOM and dynamically applies responsive styles and classes.

This enables responsive designs without relying solely on CSS media queries.

---

## Examples

The following snippets demonstrate typical use-cases for the Responsive Module.

### 1. Show/Hide Elements at Specific Breakpoints

```html
<!-- Hidden on extra-small screens (<576px), visible otherwise -->
<div class="-sm:d-none sm:d-block card">
  <h3>Important Notice</h3>
  <p>This card is not rendered on very small screens.</p>
</div>
```

### 2. Change Layout Direction

```html
<!-- Flex row that becomes a column on medium screens and below -->
<div class="d-flex md:flex-column">
  <img src="hero.jpg" alt="hero" class="w-50 md:w-100">
  <div class="content px-4">
    <h1>Hello world</h1>
    <p>Lorem ipsum dolor sit amet…</p>
  </div>
</div>
```

### 3. Inline Style Switching

```html
<!-- Dark theme activates at the lg breakpoint -->
<section lg-style="background:#222;color:#fff" style="background:#fff;color:#000">
  <h2>Contrast Section</h2>
  <p>The background switches at the lg breakpoint.</p>
</section>
```

### 4. Range-Based Visibility

```html
<!-- Visible only between md (≥768px) and xl (<1200px) -->
<nav class="md-xl:d-block -md:d-none xl-:d-none">
  <ul class="nav">
    <li><a href="/">Home</a></li>
    <li><a href="/docs">Docs</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>
```

### 5. Combining Classes and Inline Styles

```html
<!-- Card shrinks and gains shadow on small screens -->
<article
  class="card sm:shadow-lg"
  -sm-style="max-width:100%;"
  sm-style="max-width:50%;"
>
  <h2>Adaptive Card</h2>
  <p>Resize the window to watch me adapt!</p>
</article>
```

These examples should give you a quick overview on how to leverage the Responsive Module for real-world layouts. Feel free to mix and match class-based and style-based directives to suit your design requirements.
