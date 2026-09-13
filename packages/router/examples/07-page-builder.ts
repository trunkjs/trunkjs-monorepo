import { Router, setDefaultRouter, withRouter, type RouteChange } from '@trunkjs/router';

// Independent routing preview for micx-io/micx-pagebuilder, not a port of its editors.
// Keeps the four existing URL shapes; no backend or Kasimir globals are used here.
class PageOverview extends HTMLElement {
  connectedCallback() { this.textContent = 'Page overview'; }
}
class PageEditor extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    const pid = route.query.get('pid');
    const lang = route.query.get('lang');
    if (!pid || !lang) { this.textContent = 'Choose a page and language'; return; }
    // Runs also when only pid/lang change. The editor instance is retained then:
    // a real port must resolve unsaved changes before replacing its model.
    this.textContent = `Edit ${pid} (${lang}) on ${route.params['site_id']}`;
  }
}
class TranslationEditor extends HTMLElement {
  connectedCallback() { this.textContent = 'Translation editor route'; }
}
class DataEditor extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    this.textContent = `Data file: ${route.query.get('file') ?? 'none selected'}`;
  }
}
customElements.define('example-pb-overview', PageOverview);
customElements.define('example-pb-page', PageEditor);
customElements.define('example-pb-translations', TranslationEditor);
customElements.define('example-pb-data', DataEditor);

const router = new Router([
  { name: 'index', path: '/e/:sub_id/:site_id', components: [PageOverview] },
  { name: 'page', path: '/e/:sub_id/:site_id/page', components: [PageEditor] },
  { name: 'translation', path: '/e/:sub_id/:site_id/translation', components: [TranslationEditor] },
  { name: 'edit-data', path: '/e/:sub_id/:site_id/edit-data', components: [DataEditor] },
]);
setDefaultRouter(router);
document.body.innerHTML = '<router-content></router-content>';
router.start();

// Fixed example tenant. In the app, obtain both values from its matched entry URL.
// Unlike ka_href(), Router does not silently inherit current route parameters.
const site = { sub_id: 'demo', site_id: 'practice' };
router.replace({ name: 'index', params: site });
router.navigate({ name: 'page', params: site, query: { pid: 'home/home', lang: 'de' } });
// /e/demo/practice/page?pid=home%2Fhome&lang=de; "Edit home/home (de) on practice".
router.navigate({ name: 'page', params: site, query: { pid: 'home/home', lang: 'en' } });
// Same PageEditor instance, now "Edit home/home (en) on practice".

const hours = document.createElement('a');
hours.href = router.url({ name: 'edit-data', params: site, query: { file: 'openhours.yml' } });
hours.textContent = 'Opening hours';
document.body.append(hours);
// Clicking shows "Data file: openhours.yml". Back restores the page query snapshot.
