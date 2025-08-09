---
slugName: get-arg-names-optional-default-and-container-buildparameters
includeFiles:
    - ./src/lib/Container/get-arg-names.ts
    - ./src/lib/Container/Container.ts
    - ./README.md
editFiles:
    - ./src/lib/Container/get-arg-names.ts
    - ./src/lib/Container/Container.ts
original_prompt: Make getArgNames return also if it is a optional parameter. Let it
    return a key value where value has only one key isOptional and hasDefault. In Container
    make buildParams return undefined on a optional paramter that is not defined in
    di.
---

# Prepare Enhance getArgNames to expose optional/default metadata and adjust Container.buildParameters

Implement enhanced argument metadata detection and adjust DI parameter building to return undefined for optional or defaulted parameters that are not registered in the DI container.

## Assumptions

- getArgNames should return a key-value structure where keys are parameter names and values contain only:
    - isOptional: boolean
    - hasDefault: boolean
- Optional parameters should be considered those with a TS/JS optional marker (?) or a default value (= ...).
- The function source is available at runtime via fn.toString(). This works reliably for:
    - regular functions
    - arrow functions
    - classes (constructor(...) extracted)
    - Note: For TypeScript-emitted JavaScript, optional marker (?) is removed. Defaults typically remain in the JS source and can be detected. We will treat defaults as implying optionality.
- Destructured parameters (e.g., function({a}, [b])) are not resolvable by name and will be skipped from DI resolution.
- Parameter order must be preserved. We will construct the result object in declaration order; iterating Object.keys will preserve this order for non-integer keys.
- The method name remains buildParameters (not “buildParams” as in the request phrasing).
- For a parameter that is optional (or has a default) and is not found in DI and not overridden, buildParameters should place undefined in the argument list, allowing default/optional behavior to activate.
- For required parameters missing in DI and not overridden, the container should continue to throw (via resolve) as before.

## Missing Information

- Should destructured parameters be supported differently (e.g., attempt to resolve each property)? Current plan: skip them.
- Should a parameter with default but no explicit ? be reported as isOptional: true? Current plan: yes, since providing undefined triggers defaults.
- Is there any external code that directly relies on getArgNames returning a string[]? Current codebase only uses it in Container.buildParameters, which we will update accordingly.

If any of these assumptions should change, please confirm before implementation.

## Tasks

- update-get-arg-names Return Record<string, { isOptional: boolean; hasDefault: boolean }> in declaration order
- update-container-buildparameters Return undefined for optional/defaulted params missing in DI; adapt to new getArgNames shape

## Overview: File changes

- ./src/lib/Container/get-arg-names.ts Replace implementation to return parameter metadata map with isOptional/hasDefault, preserve order, support function/arrow/class constructor
- ./src/lib/Container/Container.ts Update buildParameters to consume new getArgNames result and return undefined for optional/defaulted params not found in DI

## Detail changes

### ./src/lib/Container/get-arg-names.ts

Referenced Tasks

- update-get-arg-names Implement metadata extraction and return ordered Record

Replace entire file content by

```ts
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ArgMeta = { isOptional: boolean; hasDefault: boolean };

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getArgNames(fn: Function): Record<string, ArgMeta> {
    // Convert function to string and normalize
    const src = fn
        .toString()
        // remove single-line comments
        .replace(/\/\/.*$/gm, '')
        // remove block comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // collapse whitespace
        .replace(/\s+/g, ' ')
        .trim();

    let paramsSrc: string | null = null;

    // Match classic function declaration/expression
    if (/^\s*function\b/.test(src)) {
        const m = src.match(/function[^(]*\(([^)]*)\)/);
        if (m) paramsSrc = m[1];
    }
    // Match arrow function with parentheses: (a, b) => ...
    if (paramsSrc == null && /^\s*\(/.test(src)) {
        const m = src.match(/^\s*\(([^)]*)\)\s*=>/);
        if (m) paramsSrc = m[1];
    }
    // Match arrow function single param: a => ...
    if (paramsSrc == null) {
        const m = src.match(/^\s*([A-Za-z_$][\w$]*)\s*=>/);
        if (m) paramsSrc = m[1];
    }
    // Match class constructor: class X { constructor(a, b) { ... } }
    if (paramsSrc == null && /^\s*class\b/.test(src)) {
        const m = src.match(/constructor\s*\(([^)]*)\)/);
        if (m) paramsSrc = m[1];
    }

    const result: Record<string, ArgMeta> = {};
    if (paramsSrc == null || paramsSrc.trim() === '') return result;

    // Split by commas that are not inside (), {}, [], or strings
    const parts: string[] = [];
    let buf = '';
    let depthParen = 0;
    let depthBrace = 0;
    let depthBracket = 0;
    let inStr: '"' | "'" | '`' | null = null;
    let escape = false;

    for (let i = 0; i < paramsSrc.length; i++) {
        const ch = paramsSrc[i];

        if (inStr) {
            buf += ch;
            if (escape) {
                escape = false;
            } else if (ch === '\\') {
                escape = true;
            } else if (ch === inStr) {
                inStr = null;
            }
            continue;
        }

        if (ch === '"' || ch === "'" || ch === '`') {
            inStr = ch as '"' | "'" | '`';
            buf += ch;
            continue;
        }

        if (ch === '(') depthParen++;
        else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
        else if (ch === '{') depthBrace++;
        else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
        else if (ch === '[') depthBracket++;
        else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);

        if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
            parts.push(buf.trim());
            buf = '';
        } else {
            buf += ch;
        }
    }
    if (buf.trim() !== '') parts.push(buf.trim());

    for (const raw of parts) {
        const p = raw.trim();
        if (!p) continue;

        // Skip destructured params; not resolvable via token name
        if (p.startsWith('{') || p.startsWith('[')) {
            continue;
        }

        // Extract:
        // - optional marker (?)
        // - default (= ...)
        // - param name
        const m = p.match(/^(?:\.\.\.)?\s*([A-Za-z_$][\w$]*)\s*(\?)?\s*(?::[^=]+)?\s*(=\s*[\s\S]+)?$/);
        if (!m) {
            continue;
        }

        const name = m[1];
        const hasOptMark = !!m[2];
        const hasDefault = m[3] != null;

        // isOptional is true if explicitly marked optional or has a default
        result[name] = {
            isOptional: hasOptMark || hasDefault,
            hasDefault: hasDefault,
        };
    }

    return result;
}
```

### ./src/lib/Container/Container.ts

Referenced Tasks

- update-container-buildparameters Consume new getArgNames metadata and return undefined for missing optional/defaulted tokens

Update the buildParameters method only. Replace the existing buildParameters implementation with:

```ts
  /**
   * Builds parameters for a function based on its parameter names and metadata.
   * - Each parameter name is treated as a token and resolved via the container,
   *   unless an override is provided in overrideParams.
   * - If a parameter is optional (or has a default) and is not registered in DI
   *   and is not overridden, 'undefined' is passed to allow optional/default behavior.
   *
   * Example:
   *   function factory(logger, config = {}) { ... }
   *   container.buildParameters(factory) // -> [resolve('logger'), undefined] if 'config' is not registered
   *
   * @param fn Function or constructor to inspect
   * @param overrideParams Map of parameter-name -> value which overrides resolution
   */
  buildParameters(fn: Function, overrideParams: Record<string, any> = {}): any[] {
    const paramMap = getArgNames(fn); // Record<string, { isOptional: boolean; hasDefault: boolean }>
    const args: any[] = [];

    // Preserve declared order via Object.keys (insertion order)
    for (const name of Object.keys(paramMap)) {
      if (Object.prototype.hasOwnProperty.call(overrideParams, name)) {
        args.push(overrideParams[name]);
        continue;
      }

      const meta = paramMap[name];

      if (this.hasToken(name)) {
        args.push(this.resolve(name));
      } else if (meta.isOptional || meta.hasDefault) {
        // Optional/defaulted parameter missing in DI -> pass undefined
        args.push(undefined);
      } else {
        // Required parameter: trigger resolution to throw the appropriate error
        args.push(this.resolve(name));
      }
    }

    return args;
  }
```

No other parts of Container need changes.

## Example prompts to improve the original request

- Clarify destructured parameters handling:
    - “If a factory uses destructured parameters (e.g., function({logger, config})), should we attempt to resolve each property or skip destructured params?”
- Clarify behavior for TS-compiled code:
    - “At runtime, TS optional markers (?) are removed. Should we treat only default values (= ...) as optional, or force isOptional=false without defaults?”
- Confirm method naming:
    - “You mentioned buildParams; the existing method is buildParameters. Should we rename it, or keep the existing name?”

## Notes

- This change is backward-incompatible for any external consumers of getArgNames who expect string[]. In this codebase, only Container.buildParameters consumes it; we updated it accordingly.
- Parameter order is preserved by building the result object in the parsed order and relying on the insertion order of object keys.
