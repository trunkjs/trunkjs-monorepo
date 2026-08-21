import { Router, setDefaultRouter, withRouter, type RouteChange } from '@trunkjs/router';

class DashboardPage extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    console.log('dashboard', route.query.get('period'));
  }
}

class DashboardSidebar extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    console.log('sidebar route', route.name);
  }
}

class DashboardActions extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    console.log('actions route', route.url.pathname);
  }

  showWeek() {
    this.router.navigate({
      name: 'dashboard',
      query: { period: 'week' },
    });
  }

  showMonthWithoutHistoryEntry() {
    this.router.replace({
      name: 'dashboard',
      query: { period: 'month' },
    });
  }
}

customElements.define('dashboard-page', DashboardPage);
customElements.define('dashboard-sidebar', DashboardSidebar);
customElements.define('dashboard-actions', DashboardActions);

// The complete route and outlet configuration can be defined programmatically.
const router = new Router([
  {
    name: 'dashboard',
    path: '/dashboard',
    meta: { title: 'Dashboard' },
    outlets: {
      default: DashboardPage,
      sidebar: DashboardSidebar,
      actions: [DashboardActions],
    },
  },
]);

setDefaultRouter(router);
router.start();

// Markup:
// <router-content name="sidebar"></router-content>
// <router-content></router-content>
// <router-content name="actions"></router-content>

router.navigate({ name: 'dashboard', query: { period: 'week' } });
router.back();
router.forward();
