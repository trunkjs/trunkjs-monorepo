import { LitElement } from 'lit';
import { ProLitTemplate } from './ProLitTemplate';

export interface ScopeDefinition {
  [key: string]: any;
  $fn?: {
    [fnName: string]: (...args: any[]) => any;
  };
  $hooks?: {
    $init?: () => void;
    $beforeRender?: () => void;
    $afterRender?: () => void;
    $onceBeforeRender?: () => void;
    $onceAfterRender?: () => void;
  };
  $on?: {
    [eventName: string]: (event: Event) => void;
  };
  $ref?: {
    [refName: string]: HTMLElement | null;
  };
  $tpl?: ProLitTemplate | string; // Template or string for the template
  $this?: LitElement;
  $update?: () => void; // Function to trigger an update
  $raw?: object & ScopeDefinition; // Raw scope object
  $rawPure?: object & ScopeDefinition; // Raw scope object without reactive properties
}

export function scopeDefine<T extends object & ScopeDefinition>(scope: T): T & ScopeDefinition {
  scope.$update = () => {
    if (scope.$this && typeof scope.$this.requestUpdate === 'function') {
      // If $this is defined, call requestUpdate to trigger a re-render
      scope.$this.requestUpdate();
    }
  };

  if (scope.$tpl !== undefined) {
    if (typeof scope.$tpl === 'string') {
      // If $tpl is a string, convert it to a Template instance
      scope.$tpl = new ProLitTemplate(scope.$tpl);
    } else if (scope.$tpl instanceof ProLitTemplate) {
      scope.$tpl.scope = scope;
    } else {
      throw new Error('Invalid value for $tpl: Expected string or ProLitTemplate, found' + typeof scope.$tpl);
    }
  }

  return new Proxy(scope, {
    get(target, prop: string) {
      if (prop === '$tpl') {
        if (!target.$tpl) {
          throw new Error('Template is not defined. Please define a template using the $tpl property.');
        }
        return target.$tpl;
      }
      if (prop === '$raw') return target; // Return the raw scope object

      if (prop === '$rawPure') {
        // Return a pure version of the scope without any reactive properties
        return Object.fromEntries(Object.entries(target).filter(([key]) => !key.startsWith('$')));
      }

      return target[prop];
    },

    set(target, prop: string, value: any) {
      // @ts-expect-error - We allow setting any property on the target
      target[prop] = value;

      if (!prop.startsWith('$') && scope.$this) {
        // Trigger a Update
        scope.$this.requestUpdate();
      }

      if (prop === '$tpl') {
        if (!(value instanceof ProLitTemplate)) {
          throw new Error('$tpl must be an instance of Template.');
        }
        value.scope = scope; // Set the scope for the template
      }
      return true;
    },
  });
}
