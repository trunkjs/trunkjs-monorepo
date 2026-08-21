import { Router, route, setDefaultRouter, withRouter, type RouteChange } from '@trunkjs/router';

@route({
  name: 'video',
  path: '/videos/:vid',
  meta: {
    area: 'media',
    title: 'Video',
  },
})
class VideoPage extends HTMLElement {}

const router = new Router([VideoPage]);
setDefaultRouter(router);
router.start();

class VideoToolbar extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    // Preferred inside the callback: use the supplied route snapshot.
    const vid = route.params.vid;
    const tab = route.query.get('tab');
    const area = route.meta.area;

    console.log({ vid, tab, area });
  }

  openComments() {
    // Convenience getters always reflect router.current.
    const vid = this.params.vid;
    const currentName = this.routeName;
    const currentUrl = this.url;

    console.log({ vid, currentName, currentUrl });

    // The complete Router instance is available for all router operations.
    this.router.navigate({
      name: 'video',
      params: { vid },
      query: { tab: 'comments' },
    });
  }

  createShareUrl() {
    return this.router.url({
      name: 'video',
      params: { vid: this.params.vid },
      query: { tab: this.query.get('tab') ?? undefined },
    });
  }
}

customElements.define('video-page', VideoPage);
customElements.define('video-toolbar', VideoToolbar);

// Outside a Web Component, keep/use the Router instance directly:
const href = router.url({ name: 'video', params: { vid: 123 } });
router.navigate(href);
