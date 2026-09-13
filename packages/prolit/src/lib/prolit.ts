import { html, nothing } from 'lit';
import { AsyncDirective } from 'lit/async-directive.js';
import { directive, PartType, type ChildPart, type PartInfo } from 'lit/directive.js';
import { ProlitExpressionError } from './lit-env';
import { connect, disconnect, getRuntime, type ScopeBinding, type ScopeDiagnostic } from './scope-runtime';
import { isProlitScope, type ProlitScope } from './scopeDefine';

const renderFailure = () => html`<p role="alert" data-prolit-error>Inhalt konnte nicht dargestellt werden.</p>`;
const eventFailure = () => html`<p role="alert" data-prolit-error>Aktion konnte nicht ausgeführt werden.</p>`;

class ProlitDirective extends AsyncDirective implements ScopeBinding {
  private scope?: ProlitScope;
  private part?: ChildPart;
  private failureRevision = -1;
  private failure?: 'render' | 'event' | 'connect';
  private diagnosticTarget?: EventTarget;

  constructor(info: PartInfo) {
    super(info);
    if (info.type !== PartType.CHILD) throw new Error('prolit() requires a Lit child expression.');
  }
  override update(part: ChildPart, [candidate, fallback = nothing]: [unknown, unknown?]): unknown {
    this.part = part;
    // Root insertion may initially occur in a fragment. Retain the last live diagnostic target.
    const parent = part.parentNode;
    this.diagnosticTarget = parent instanceof ShadowRoot ? parent.host : parent;
    return this.render(candidate, fallback);
  }
  render(candidate: unknown, fallback: unknown = nothing): unknown {
    const next = isProlitScope(candidate) ? candidate : undefined;
    if (next !== this.scope) {
      this.release();
      this.scope = next;
      this.failure = undefined;
    }
    if (!next) return fallback;
    if (this.failure === 'connect') return renderFailure();
    if (this.failureRevision !== getRuntime(next)!.revision) this.failure = undefined;
    if (this.isConnected && !this.mount()) return renderFailure();
    return this.renderScope();
  }
  private mount(): boolean {
    if (!this.scope) return false;
    try {
      connect(getRuntime(this.scope)!, this);
      return true;
    } catch (cause) {
      this.failure = 'connect';
      this.diagnose({ scope: this.scope, cause, phase: 'connect' });
      return false;
    }
  }
  private renderScope(): unknown {
    if (this.failure === 'connect' || this.failure === 'render') return renderFailure();
    if (this.failure === 'event') return eventFailure();
    try {
      return this.scope!.$tpl.render();
    } catch (cause) {
      this.failure = 'render';
      this.diagnose({ scope: this.scope!, cause, phase: 'render' });
      return renderFailure();
    }
  }
  changed(): void {
    if (!this.isConnected || getRuntime(this.scope)?.binding !== this) return;
    if (this.failure && this.failureRevision === getRuntime(this.scope)!.revision) return;
    this.failure = undefined;
    this.setValue(this.renderScope());
  }
  diagnose(error: ScopeDiagnostic): void {
    if (error.cause instanceof ProlitExpressionError) {
      error = { ...error, expression: error.cause.expression, cause: error.cause.cause };
    }
    if (['event', 'render', 'connect'].includes(error.phase))
      this.failureRevision = getRuntime(this.scope)?.revision ?? -1;
    if (error.phase === 'event') {
      this.failure = 'event';
      if (this.isConnected) this.setValue(eventFailure());
    }
    const parent = this.part?.parentNode;
    const target = parent instanceof ShadowRoot ? parent.host : parent;
    const event = new CustomEvent<ScopeDiagnostic>('scope-error', { detail: error, bubbles: true, composed: true });
    const recipient = target ?? this.diagnosticTarget;
    // Initial nested parts live in a fragment until Lit commits the outer template.
    // Defer only then, so an ancestor can observe the bubbling diagnostic.
    if (recipient instanceof Node && !recipient.isConnected) {
      queueMicrotask(() => recipient.dispatchEvent(event));
    } else {
      recipient?.dispatchEvent(event);
    }
  }
  private release(): void {
    const runtime = getRuntime(this.scope);
    if (runtime) disconnect(runtime, this);
  }
  protected override disconnected(): void {
    this.release();
  }
  protected override reconnected(): void {
    if (!this.scope) return;
    this.failure = undefined;
    if (this.mount()) this.setValue(this.renderScope());
    else this.setValue(renderFailure());
  }
}
/** Bind a scope at a Lit child expression. Missing/invalid scopes render fallback (default: nothing).
 * Valid but failing scopes render a technical error, never the optional-content fallback.
 * Manual render() roots must receive setConnected(false) before disposal. See README.
 * @example render(prolit(scope, html`<p>Default content</p>`), target);
 */
export const prolit = directive(ProlitDirective);
export type { ScopeDiagnostic } from './scope-runtime';
