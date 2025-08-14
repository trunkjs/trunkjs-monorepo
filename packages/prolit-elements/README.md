# html-scope

Add a lightweight reactive "scope" to plain HTML using <tj-html-scope> and @trunkjs/template.

## Warning about multiple *for or *if attrributes

Althoug prolit supports multiple structural directives on a single element, within <template> elements, the 
second and further directives will not be rendered in the DOM.
This is a limitation of the HTML parser and not a bug in prolit. To work around this, you can use nested elements 

## Quick start

```html
<tj-html-scope update-on="change keyup" scope-init='{ "name": "World", "repeatCount": 3 }'>
  <template>
      <h1>{{ title }}</h1>

      <!-- property + boolean + class/style + event -->
      <button
          @click="count++; $update()"
          ?disabled="busy"
          ~class="{ active: count > 0 }"
          ~style="{ color: busy ? 'gray' : 'blue' }"
      >
          Clicked {{ count }}x
      </button>

      <!-- interpolation in attribute (quoted) -->
      <div title="Items: {{ todos.length }}"></div>

      <!-- multiple structural directives on one element (left-to-right) -->
      <!-- order: *if then *for -> if gates the loop -->
      <ul>
          <li *if="todos.length" *for="t of todos; t.id">
              {{$index}}: {{ t.text }}
          </li>
      </ul>

      <!-- order: *for then *if -> loop first, filter per item -->
      <ul>
          <li *for="t of todos" *if="t.text.startsWith('B')">
              {{ t.text }}
          </li>
      </ul>

      <!-- nested loops by repeating *for -->
      <ul>
          <li *for="row of matrix" *catch="" *for="cell of row">{{ $index }}:{{ cell }}</li>
      </ul>

      <!-- object iteration with 'in' and $index -->
      <ul>
          <li *for="k in obj">{{ $index }}:{{ k }}={{ obj[k] }}</li>
      </ul>

      <!-- *do and *log -->
      <p *do="greet = 'Hi'">{{ greet }}, user!</p>
      <span *if="debug" *log="todos.length"></span>
  </template>

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