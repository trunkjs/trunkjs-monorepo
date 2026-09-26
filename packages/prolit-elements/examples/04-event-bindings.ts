import { Listen } from '@trunkjs/browser-utils';
import { prolit_html as html, scopeDefine } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import type { PropertyValues } from 'lit';

declare global {
  interface DocumentEventMap {
    'example:note': CustomEvent<{ message: string }>;
  }
}

const template = html`
  <section>
    <button data-action @click="$fn.add('scope click')">Emit a click</button>
    <ul><li *for="message of messages">{{ message }}</li></ul>
  </section>
`;

export class ExampleEventPanel extends ProlitElement {
  readonly bus = new EventTarget();
  override scope = scopeDefine({
    messages: [] as string[],
    $fn: { add: (message: string): void => this.add(message) },
    $tpl: template,
  });

  constructor() {
    super();
    this.on('click', () => this.add('host capture'), { target: 'host', options: { capture: true } });
    this.on('resize', () => this.add('window resize'), { target: 'window', options: { passive: true } });
    this.on('example:note', (event) => this.add(event.detail.message), { target: 'document' });
    this.on('example:ping', () => this.add('bus ping'), { target: this.bus });
    this.on('click', () => this.add('shadow root click'), { target: 'shadowRoot' });
    this.on('example:once', () => this.add('once per connection'), { options: { once: true } });
  }

  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    // A rendered node only exists after Lit's first update. This target is re-resolved on reconnect.
    this.on('click', () => this.add('button target'), {
      target: (host) => host.shadowRoot!.querySelector('[data-action]')!,
    });
  }

  @Listen('keydown', { target: 'document' })
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.add('Escape');
  }

  add(message: string): void {
    this.scope.messages = [...this.scope.messages, message];
  }

  listenTemporarily(): () => void {
    return this.on('example:temporary', () => this.add('temporary'));
  }
}

customElements.define('example-event-panel', ExampleEventPanel);

export function mountEventPanel(target: HTMLElement): ExampleEventPanel {
  const panel = document.createElement('example-event-panel') as ExampleEventPanel;
  target.append(panel);
  return panel;
}
