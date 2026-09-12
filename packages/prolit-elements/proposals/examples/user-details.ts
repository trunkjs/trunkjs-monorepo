/**
 * API DESIGN ONLY: parent/router selects an ID; scope stays local to the child.
 * NEW: ProlitElement, scopeResource, $connect and $event. No router package.
 * Usage: element.scope.$fn.select('42'); see README.md for parent integration.
 */
import { prolit_html, scopeDefine, scopeResource } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import { userApi } from './user-api';

export class UserDetails extends ProlitElement {
  public scope = scopeDefine({
    $this: this,
    selectedId: null as string | null,
    user: scopeResource({
      load: ({ signal }, userId: string) => userApi.get(userId, { signal }),
      retainData: false, // Never show A's data under B's selection.
      errorMessage: 'Details konnten nicht geladen werden.',
    }),
    $fn: {
      select: (userId: string): void => {
        this.scope.selectedId = userId;
        if (this.isConnected) void this.scope.user.reload(userId);
      },
      reload: (): void => {
        if (this.scope.selectedId !== null) void this.scope.user.reload(this.scope.selectedId);
      },
    },
    $hooks: { $connect: (): void => this.scope.$fn.reload() },
    $tpl: prolit_html`
      <p *if="selectedId === null">Bitte einen Benutzer auswählen.</p>
      <p *if="user.pending" role="status">Details werden geladen …</p>
      <p *if="user.error" role="alert">{{ user.error.message }}</p>
      <button *if="user.error" type="button" @click="$fn.reload()" ?disabled="user.pending">Erneut laden</button>
      <article *if="user.data !== undefined">
        <h2>{{ user.data.name }}</h2><p>{{ user.data.email }}</p>
      </article>
    `,
  });
}
customElements.define('app-user-details', UserDetails);
