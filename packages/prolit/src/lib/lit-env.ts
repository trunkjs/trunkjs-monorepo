import { html } from 'lit-html';
import { repeat, RepeatDirectiveFn } from 'lit-html/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { when } from 'lit/directives/when.js';

export type LitEnv = {
  html: any;
  repeat: RepeatDirectiveFn;
  when: any;
  styleMap: any;
  classMap: any;
  catchError: ($$__litEnv: LitEnv, fn: () => string) => string;
  originalCode?: string;
  originalTemplateString?: string;
};
export type ProlitGeneratedRendererFn = (scope: any, $$__litEnv: LitEnv) => string;

function extractErrorLineFromStack(stack: string): { line: number; column: number } {
  const m = stack.split('\n')[0]?.match(/:(\d+):(\d+)$/);
  return { line: m ? +m[1] : -1, column: m ? +m[2] : -1 };
}

const catchError = ($$__litEnv: LitEnv, fn: any, throwError = false, originalStmt = '<undefined>') => {
  try {
    return fn();
  } catch (e: any) {
    let { line, column } = extractErrorLineFromStack(e?.stack ?? '');
    let originalCode = String($$__litEnv?.originalCode ?? '');

    let isHtml = false;
    if ($$__litEnv?.originalTemplateString) {
      line -= 2; // Adjust line number for template strings (remove function and first line
      originalCode = $$__litEnv.originalTemplateString;
      isHtml = true;
    }

    const lines = originalCode.split('\n');

    const idx = Math.min(Math.max(line - 1, 0), lines.length - 1);
    const errLine = lines[idx] ?? '';

    const caretPos = Math.min(Math.max((column || 1) - 1, 0), errLine.length);
    let caret = ' '.repeat(caretPos + String(line).length) + '^^^^';
    if (isHtml) {
      caret = '^'.repeat(String(errLine).length);
    }
    // Inject caret line into numbered code
    const numberedWithCaret = lines
      .map((l, i) => {
        if (i === idx) {
          return `${i + 1}: ${l}\n ${caret}`;
        }
        return `${i + 1}: ${l}`;
      })
      .join('\n');

    const msg =
      `Error while rendering \`${originalStmt}\`: ${e}\n` +
      `Line ${line}, Column ${caretPos + 1}:\n\n` +
      `${line}:${errLine}\n${caret}\n\n` +
      `Compiled Template:\n${numberedWithCaret}` +
      '\n';

    if (!throwError) {
      console.warn('Caught error via *catch: ' + msg);
    } else {
      console.error('Caught error via *catch: ' + msg);
      throw new Error(msg);
    }
    return String(e);
  }
};

/**
 * Return the LitEnv to add as paramter 2 to the generated Function
 *
 */
export function litEnv(fn: ProlitGeneratedRendererFn, origTemplateString: string): LitEnv {
  return {
    html,
    repeat,
    when,
    styleMap,
    classMap,
    catchError,
    originalCode: fn.toString(),
    originalTemplateString: origTemplateString,
  };
}
