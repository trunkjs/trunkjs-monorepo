/**
 * API DESIGN ONLY: one subscription per connection, cleanup and reconnect.
 * NEW: ProlitElement and $connect cleanup. Usage: <app-live-users>.
 * A push stream is NOT a Promise resource. Transport logic remains in userApi.
 */
import { prolit_html, scopeDefine } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import { userApi } from './user-api';

export class LiveUsers extends ProlitElement {
  public scope = scopeDefine({
    $this: this,
    count: null as number | null,
    error: '',
    $hooks: {
      $connect: (): (() => void) => {
        let active = true;
        this.scope.count = null;
        this.scope.error = '';
        const stop = userApi.subscribeCount(
          count => { if (active) this.scope.count = count; },
          () => { if (active) this.scope.error = 'Live-Verbindung unterbrochen.'; },
        );
        return () => { active = false; stop(); };
      },
    },
    $tpl: prolit_html`
      <p *if="count === null && !error" role="status">Live-Verbindung wird aufgebaut …</p>
      <p *if="count !== null">Aktive Benutzer: {{ count }}</p>
      <p *if="error" role="alert">{{ error }} Die angezeigte Zahl kann veraltet sein.</p>
    `,
  });
}
customElements.define('app-live-users', LiveUsers);
