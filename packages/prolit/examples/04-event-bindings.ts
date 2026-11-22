import { Listen, ProlitElement, scopeDefine } from '@trunkjs/prolit';
import { customElement } from 'lit/decorators.js';

declare global {
  interface DocumentEventMap {
    'example:note': CustomEvent<{ message: string }>;
  }
}

@customElement('example-event-panel')
export class ExampleEventPanel extends ProlitElement {
  protected override scope = scopeDefine({
    // language=HTML
    $tpl: `
      <section>
        <button data-action @click="messages = [...messages, 'scope click']">Emit a click</button>
        <ul><li *for="message of messages">{{ message }}</li></ul>
      </section>
    `,

    messages: [] as string[],
  });

  readonly bus = new EventTarget();

  @Listen('click', { options: { capture: true } })
  onHostClick(): void {
    this.add('host capture');
  }

  @Listen('resize', { target: 'window', options: { passive: true } })
  onResize(): void {
    this.add('window resize');
  }

  @Listen('example:note', { target: 'document' })
  onNote(event: DocumentEventMap['example:note']): void {
    this.add(event.detail.message);
  }

  @Listen('example:ping', {
    target: (host) => (host as ExampleEventPanel).bus,
  })
  onPing(): void {
    this.add('bus ping');
  }

  @Listen('example:once', { options: { once: true } })
  onOnce(): void {
    this.add('once per connection');
  }

  @Listen('click')
  onActionClick(event: MouseEvent): void {
    // Delegate from the host: the button does not exist at the first connection.
    if (event.target instanceof Element && event.target.closest('[data-action]')) {
      this.add('button target');
    }
  }

  @Listen('keydown', { target: 'document' })
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.add('Escape');
  }

  add(message: string): void {
    this.scope.messages = [...this.scope.messages, message];
  }

  listenTemporarily(): () => void {
    // This registration is dynamic and can be permanently removed with off().
    return this.on('example:temporary', () => this.add('temporary'));
  }
}
