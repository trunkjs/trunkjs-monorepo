import { AuxiliaryRoute, Router, setDefaultRouter, withRouter, type RouteChange } from '@trunkjs/router';

// Independent alternative: one primary editor with a separately navigable inspector.
class ProjectEditor extends withRouter(HTMLElement) {
  override onRouteChange({ route, changed }: RouteChange) {
    if (changed.primary) this.textContent = `Project ${route.params['projectId']}`;
  }
}
class FileInspector extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    // this.params is always the PRIMARY route. Read the named auxiliary snapshot here.
    this.textContent = `File ${route.outlets['inspector']?.params['fileId'] ?? ''}`;
  }
}
customElements.define('example-project-editor', ProjectEditor);
customElements.define('example-file-inspector', FileInspector);

const router = new Router([
  { name: 'project', path: '/projects/:projectId', components: [ProjectEditor] },
]);
router.addAuxiliaryRoute(new AuxiliaryRoute({
  name: 'file', outlet: 'inspector', path: 'files/:fileId', components: FileInspector,
}));
setDefaultRouter(router);
document.body.innerHTML = '<router-content></router-content><router-content name="inspector"></router-content>';
router.start();
router.replace({ name: 'project', params: { projectId: 42 } });
router.navigateOutlet('inspector', { name: 'file', params: { fileId: 'docs/intro.md' } });
// /projects/42(inspector:files/docs%2Fintro.md) — editor instance stays mounted.
router.replaceOutlet('inspector', { name: 'file', params: { fileId: 'docs/about.md' } });
// Inspector changes; its previous file is replaced in browser history.
router.clearOutlet('inspector');
// /projects/42 — inspector is empty; the editor still exists. Back reopens the file.

// A fixed sidebar tied to the same primary route needs no AuxiliaryRoute.
// Example 05 shows the complete registration for that alternative layout.
