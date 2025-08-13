# html-scope

Add a lightweight reactive "scope" to plain HTML using <tj-html-scope> and @trunkjs/template.

## Quick start

```html
<tj-html-scope update-on="change keyup" scope-init='{ "name": "World", "repeatCount": 3 }'>
  <template>
    <div *for="i of Array.from({ length: repeatCount })">Hello {{name}}</div>
  </template>

  <input type="text" name="name" value="World" />
  <input type="number" name="repeatCount" value="3" />
</tj-html-scope>
```

- update-on: space/comma separated events that trigger scope updates from inputs inside the element.
- Inputs with a name attribute are synced into the scope as scope[name] = value.

## scope-init

Initialize or extend the component scope from an evaluated expression. The expression runs in an async context with access to:
- host element (as host), current scope (as scope)
- window, document, console, fetch

Rules:
- The expression must evaluate to an object. That object is shallow-merged into the current scope.
- It is evaluated on connect and whenever the scope-init attribute changes.
- A scope-update event is dispatched after merging.

Examples

- Inline object
  ```html
  <tj-html-scope scope-init='{ "name": "Jane", "repeatCount": 2 }'></tj-html-scope>
  ```

- From the DOM
  ```html
  <script id="seed" type="application/json">{"name":"Dom","repeatCount":4}</script>
  <tj-html-scope
    scope-init='JSON.parse(document.querySelector("#seed")?.textContent ?? "{}")'
  ></tj-html-scope>
  ```

- Remote (async)
  ```html
  <tj-html-scope
    scope-init='await fetch("/api/scope").then(r => r.json())'
  ></tj-html-scope>
  ```

Notes
- The expression is executed as code. Do not inject untrusted strings.
- If the expression does not return an object, the evaluation will fail and be ignored by the component.

## Events

- scope-update: fired after the scope is extended via scope-init.

## Building

Run `nx build html-scope` to build the library.

## Running unit tests

Run `nx test html-scope` to execute the unit tests via Vitest (jsdom environment).

## Template rendering demo

Three ways to initialize scope using scope-init:

- Inline object
  ```html
  <tj-html-scope scope-init='{ "name": "World", "repeatCount": 3 }'>
    <template>
      <div *for="i of Array.from({ length: repeatCount })">Hello {{name}}</div>
    </template>
  </tj-html-scope>
  ```

- From a script element (application/json)
  ```html
  <script id="seed-user" type="application/json">{"name":"Dom","repeatCount":4}</script>
  <tj-html-scope
    scope-init='JSON.parse(document.querySelector("#seed-user")?.textContent ?? "{}")'>
    <template>
      <div *for="i of Array.from({ length: repeatCount })">Hi {{name}}</div>
    </template>
  </tj-html-scope>
  ```

- External JSON via fetch (async)
  ```html
  <tj-html-scope
    scope-init='await fetch("/demo/data/user.json").then(r => r.json())'>
    <template>
      <div *for="i of Array.from({ length: repeatCount })">Welcome {{name}}</div>
    </template>
  </tj-html-scope>
  ```

See a full showcase at /demo/template-rendering.html when running the dev server.