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
};
export type ProlitGeneratedRendererFn = (scope: any, $$__litEnv: LitEnv) => string;

/**
 * Return the LitEnv to add as paramter 2 to the generated Function
 *
 */
export function litEnv(): LitEnv {
  return {
    html,
    repeat,
    when,
    styleMap,
    classMap,
  };
}
