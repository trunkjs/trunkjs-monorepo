---
slugName: enhance-template-rendering-demo-scope-init
includeFiles:
- ./demo/template-rendering.html
- ./demo/index.html
- ./demo/main.ts
- ./src/components/tj-html-scope/tj-html-scope.ts
- ./src/utils/scope-init.ts
- ./README.md
editFiles:
- ./demo/template-rendering.html
- ./demo/index.html
- ./demo/data/user.json
- ./README.md
original_prompt: mach das template-rendering beispiel schön und demonstriere das scope-init
  mit einer externen json datei sowie mit inline und aus script element. mach für
  jedes beispiel eine eigene tj-html-scope auf im beispiel
---
# Prepare Improve template-rendering demo and show scope-init variants

Make the demo visually pleasant and demonstrate scope-init in three ways: inline JSON, from a script element (application/json), and from an external JSON file. Use a separate <tj-html-scope> instance for each example.

## Assumptions

- The demo is served under /demo via Vite dev server; static assets in /demo/data are publicly accessible.
- We’ll standardize module loading in demo pages to use /demo/main.js.
- Inputs with name attributes will mirror to the scope. We’ll keep their default values aligned with the scope-init to avoid initial override.
- The template engine supports {{...}}, *if and *for as in current code.

## Tasks

- Enhance template-rendering demo Add three separate <tj-html-scope> examples (inline, script JSON, external JSON).
- Add external JSON file Add /demo/data/user.json used by the demo.
- Update demo index Link the new demo page from /demo/index.html.
- Update docs Append a short section to README.md showing the three scope-init variants.
- Clean up content Remove inappropriate text from the template.

## Overview: File changes

- ./demo/template-rendering.html Replace with a polished page featuring three <tj-html-scope> examples and nicer styling.
- ./demo/index.html Add link to Template Rendering demo and standardize loader.
- ./demo/data/user.json New: Sample JSON for external scope-init.
- ./README.md Append a “Template rendering demo” section with three scope-init snippets.

## Detail changes

### ./demo/template-rendering.html

Replace entire file with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Template Rendering + scope-init</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg: #0f172a;
      --card: #111827;
      --text: #e5e7eb;
      --muted: #9ca3af;
      --accent: #60a5fa;
      --border: #1f2937;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container {
      max-width: 960px;
      margin: 3rem auto;
      padding: 0 1rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      box-shadow: 0 10px 20px rgba(0,0,0,0.12);
    }
    .card h2 {
      font-size: 1.1rem;
      margin: 0 0 .5rem;
    }
    .muted { color: var(--muted); }
    .stack > * + * { margin-top: .35rem; }
    .controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .5rem .75rem;
      margin-top: .75rem;
      align-items: center;
    }
    label { font-size: .85rem; color: var(--muted); }
    input[type="text"], input[type="number"] {
      width: 100%;
      box-sizing: border-box;
      background: #0b1220;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: .5rem .6rem;
      outline: none;
    }
    input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(96,165,250,.2); }
    .chip {
      display: inline-block;
      padding: .15rem .45rem;
      font-size: .75rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #0b1220;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <p><a href="/demo/index.html">← Back to demo index</a></p>
    <h1>Template Rendering and scope-init</h1>
    <p class="muted">Three independent scopes demonstrate scope-init from inline JSON, from a script tag, and from an external JSON file.</p>

    <div class="grid">

      <!-- Example 1: Inline object -->
      <div class="card">
        <h2>Inline scope-init <span class="chip">inline</span></h2>
        <p class="muted">scope-init merges this object into the scope.</p>

        <tj-html-scope update-on="change keyup"
                       scope-init='{ "name": "World", "repeatCount": 3 }'>

          <template>
            <div class="stack">
              <div *for="i of Array.from({ length: repeatCount })">Hello {{name}} #{{i + 1}}</div>
              <div *if="name?.length > 0" class="muted">Name length: {{name.length}}</div>
            </div>
          </template>

          <div class="controls">
            <label for="ex1-name">Name</label>
            <input id="ex1-name" type="text" name="name" value="World" placeholder="Enter your name" />
            <label for="ex1-repeat">Repeat</label>
            <input id="ex1-repeat" type="number" name="repeatCount" value="3" min="1" max="10" />
          </div>
        </tj-html-scope>
      </div>

      <!-- Example 2: From a script[type=application/json] element -->
      <div class="card">
        <h2>From <script> JSON <span class="chip">DOM JSON</span></h2>
        <p class="muted">Seeded via a JSON script tag read by scope-init.</p>

        <script id="seed-user" type="application/json">
          { "name": "Dom", "repeatCount": 4 }
        </script>

        <tj-html-scope update-on="change keyup"
                       scope-init='JSON.parse(document.querySelector("#seed-user")?.textContent ?? "{}")'>

          <template>
            <div class="stack">
              <div *for="i of Array.from({ length: repeatCount })">Hi {{name}} #{{i + 1}}</div>
              <div *if="repeatCount > 3" class="muted">That is a lot of greetings!</div>
            </div>
          </template>

          <div class="controls">
            <label for="ex2-name">Name</label>
            <input id="ex2-name" type="text" name="name" value="Dom" />
            <label for="ex2-repeat">Repeat</label>
            <input id="ex2-repeat" type="number" name="repeatCount" value="4" min="1" max="10" />
          </div>
        </tj-html-scope>
      </div>

      <!-- Example 3: External JSON (async fetch) -->
      <div class="card">
        <h2>External JSON <span class="chip">fetch</span></h2>
        <p class="muted">Loaded from /demo/data/user.json using await fetch in scope-init.</p>

        <tj-html-scope update-on="change keyup"
                       scope-init='await fetch("/demo/data/user.json").then(r => r.json())'>

          <template>
            <div class="stack">
              <div *for="i of Array.from({ length: repeatCount })">Welcome {{name}} #{{i + 1}}</div>
              <div *if="favorite" class="muted">Favorite: {{favorite}}</div>
            </div>
          </template>

          <div class="controls">
            <label for="ex3-name">Name</label>
            <input id="ex3-name" type="text" name="name" value="Remote User" />
            <label for="ex3-repeat">Repeat</label>
            <input id="ex3-repeat" type="number" name="repeatCount" value="2" min="1" max="10" />
          </div>
        </tj-html-scope>
      </div>

    </div>
  </div>

  <script src="/demo/main.js" type="module"></script>
</body>
</html>
```

### ./demo/index.html

Replace the file to include a link to the new demo (retain existing links) and standardize on /demo/main.js:

```html
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Demo Page</title>
  </head>
  <body>
    <h1>Name of the package</h1>

    <h2>List of Demos:</h2>
    <ul>
      <li><a href="/demo/template-rendering.html">Template Rendering + scope-init</a></li>
      <li><a href="/demo/twobar.html">Twobar</a></li>
      <li><a href="/demo/index.html">Index</a></li>
      <li><a href="/demo/other.html">Other</a></li>
      <li><a href="/demo/another.html">Another</a></li>
      <li><a href="/demo/somepage.html">Some Page</a></li>
      <li><a href="/demo/somepage2.html">Some Page 2</a></li>
      <li><a href="/demo/somepage3.html">Some Page 3</a></li>
    </ul>

    <script src="/demo/main.js" type="module"></script>
  </body>
</html>
```

### ./demo/data/user.json

Create new file:

```json
{
  "name": "Remote User",
  "repeatCount": 2,
  "favorite": "TypeScript"
}
```

### ./README.md

Append at the end of the file the following section:

```markdown
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
```

## Example prompts to refine the original request

- Should the demo include two-way binding back into inputs beyond name/value mirroring?
- Do you want more advanced template features demonstrated (computed classes, nested loops, custom helpers)?
- Should the external JSON example hit a real API endpoint instead of a static file?

