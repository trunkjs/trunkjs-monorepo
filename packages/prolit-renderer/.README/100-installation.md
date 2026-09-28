# Installation

Requirements
- Node.js 18+
- lit-html 3.x
- lit 3.x (for directives like `when`)
- ESM environment

Install

```bash
npm i @trunkjs/prolit lit lit-html
# or
pnpm add @trunkjs/prolit lit lit-html
```

TypeScript
- Enable ES2022 target or later.
- ESM modules recommended.
- Decorators if you use LitElement decorators.

```json
// tsconfig.json (excerpt)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "experimentalDecorators": true
  }
}
```