import type { ScopeDefinition } from '@trunkjs/template';

/**
 * Evaluate the scope-init attribute value as a JavaScript expression or async function body.
 *
 * The expression is evaluated with the following parameters available:
 * - host: the element on which the attribute is defined
 * - scope: the current scope object
 * - console, fetch: convenience globals
 *
 * Examples:
 * - "{ name: 'World', repeatCount: 3 }"
 * - "await (await fetch('/api/user')).json()"
 * - "const data = await (await fetch('/api')).json(); return { ...data }"
 */
export async function evaluateScopeInitExpression(
  host: Element,
  expression: string,
  scope: ScopeDefinition,
): Promise<Record<string, unknown>> {
  const expr = sanitizeExpression(expression);

  const AsyncFunctionCtor = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
  ) => (...args: unknown[]) => Promise<unknown>;

  // Attempt 1: treat as a single expression (we wrap in return (...))
  try {
    const fnExpr = new AsyncFunctionCtor('host', 'scope', 'console', 'fetch', '"use strict"; return (' + expr + ');');
    const result = await fnExpr(host, scope, console, getFetch());

    validateResult(result);
    return result as Record<string, unknown>;
  } catch (errExpr) {
    // Attempt 2: treat as a full async function body (statements allowed, must include explicit return)
    try {
      const fnBody = new AsyncFunctionCtor('host', 'scope', 'console', 'fetch', '"use strict"; ' + expr);
      const result = await fnBody(host, scope, console, getFetch());

      validateResult(result);
      return result as Record<string, unknown>;
    } catch (errBody) {
      const err =
        errBody instanceof Error
          ? errBody
          : new Error(typeof errBody === 'string' ? errBody : 'Unknown evaluation error');
      // Prefer the second error (body) as it is likely the more appropriate fallback
      throw new Error(`scope-init evaluation failed: ${err.message}`);
    }
  }
}

function sanitizeExpression(input: string): string {
  let out = (input ?? '').trim();
  // strip leading "javascript:" if present
  if (out.toLowerCase().startsWith('javascript:')) {
    out = out.slice('javascript:'.length).trim();
  }
  return out;
}

function validateResult(result: unknown): asserts result is Record<string, unknown> {
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('scope-init must evaluate to an object (e.g. { foo: "bar" })');
  }
}

function getFetch(): typeof fetch {
  if (typeof fetch === 'function') return fetch;
  throw new Error('fetch is not available in this environment');
}
