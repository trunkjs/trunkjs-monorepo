# html-scope

Add a lightweight reactive "scope" to plain HTML using <tj-html-scope> and @trunkjs/template.

## Warning about multiple *for or *if attrributes

Althoug prolit supports multiple structural directives on a single element, within <template> elements, the 
second and further directives will not be rendered in the DOM.
This is a limitation of the HTML parser and not a bug in prolit. To work around this, you can use nested elements 

## Quick start

```html
<prolit-scope update-on="change keyup" init='{ "name": "World", "repeatCount": 3 }'>
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
      
      <!-- Import another HTML file -->
      <div import-src="/some/other/file.html"></div>
      
  </template>

</prolit-scope>
```

- update-on: space/comma separated events that trigger scope updates from inputs inside the element.
- Inputs with a name attribute are synced into the scope as scope[name] = value.

## init

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
  <prolit-scope init='{ "name": "Jane", "repeatCount": 2 }'></prolit-scope>
  ```

- From the DOM
  ```html
  <script id="seed" type="application/json">{"name":"Dom","repeatCount":4}</script>
  <prolit-scope init='JSON.parse(document.querySelector("#seed")?.textContent ?? "{}")'></prolit-scope>
  ```

- Remote (async)
  ```html
  <prolit-scope
    init='await fetch("/api/scope").then(r => r.json())'
  ></prolit-scope>
  ```

Notes
- The expression is executed as code. Do not inject untrusted strings.
- If the expression does not return an object, the evaluation will fail and be ignored by the component.

## Events

- scope-update: fired after the scope is extended via scope-init.

## Building

Run `nx build prolit-elements` to build the library.

## Running unit tests

Run `nx test html-scope` to execute the unit tests via Vitest (jsdom environment).

## Template rendering demo

Three ways to initialize scope using scope-init:

- Inline object
  ```html
  <prolit-scope init='{ "name": "World", "repeatCount": 3 }'>
    <template>
      <div *for="i of Array.from({ length: repeatCount })">Hello {{name}}</div>
    </template>
  </prolit-scope>
  ```

- From a script element (application/json)
  ```html
  <script id="seed-user" type="application/json">{"name":"Dom","repeatCount":4}</script>
  <prolit-scope
    init='JSON.parse(document.querySelector("#seed-user")?.textContent ?? "{}")'>
    <template>
      <div *for="i of Array.from({ length: repeatCount })">Hi {{name}}</div>
    </template>
  </prolit-scope>
  ```

- External JSON via fetch (async)
  ```html
  <prolit-scope
    init='await fetch("/demo/data/user.json").then(r => r.json())'>
    <template>
      <div *for="i of Array.from({ length: repeatCount })">Welcome {{name}}</div>
    </template>
  </prolit-scope>
  ```

See a full showcase at /demo/template-rendering.html when running the dev server.


## Import another HTML file

You can import another HTML file into your current HTML file using the `import-src` attribute on a `<div>` element. This allows you to modularize your HTML content and reuse components across different pages.

The import will happen before compiling the template, so you can use structural directives like `*for` and `*if` in the imported content.


```html
<div import-src="/path/to/your/file.html"></div>
```

## Import Templates form remote URLs

```html
<prolit-scope src="/path/to/your/file.html"></prolit-scope>
```

Inside the imported file you can also define a scope:

```html
<script type="application/json" scope>
{
  "title": "Hello from remote",
  "items": ["Item 1", "Item 2", "Item 3"]
}
</script>
<ul>
    <li *for="item of items">{{ item }}</li>
</ul>
```
