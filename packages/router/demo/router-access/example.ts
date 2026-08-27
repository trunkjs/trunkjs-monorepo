import { Router, route, setDefaultRouter, withRouter, type RouteChange } from '@trunkjs/router';

@route({
  name: 'home',
  path: '/',
  meta: {
    area: 'start',
    title: 'Home',
  },
})
class HomePage extends withRouter(HTMLElement) {
  override onRouteChange({ route, previousRoute }: RouteChange) {
    console.log('HomePage route changed', {
      from: previousRoute?.name,
      to: route.name,
      path: route.path,
      meta: route.meta,
    });
  }

  openVideo(vid = '123') {
    this.router.navigate({
      name: 'video',
      params: { vid },
      query: { tab: 'details' },
    });
  }
}

@route({
  name: 'video',
  path: '/videos/:vid',
  meta: {
    area: 'media',
    title: 'Video',
  },
})
class VideoPage extends withRouter(HTMLElement) {
  override onRouteChange({ route, previousRoute }: RouteChange) {
    // Preferred inside onRouteChange: use the supplied route snapshot.
    console.log('VideoPage route changed', {
      from: previousRoute?.name,
      to: route.name,
      vid: route.params.vid,
      tab: route.query.get('tab'),
      area: route.meta.area,
    });
  }

  openNextVideo() {
    this.router.navigate({
      name: 'video',
      params: { vid: Number(this.params.vid) + 1 },
      query: { tab: this.query.get('tab') ?? 'details' },
    });
  }

  replaceWithCommentsTab() {
    this.router.replace({
      name: 'video',
      params: { vid: this.params.vid },
      query: { tab: 'comments' },
    });
  }

  goHome() {
    this.router.navigate({ name: 'home' });
  }
}

class VideoToolbar extends withRouter(HTMLElement) {
  override onRouteChange({ route, previousRoute }: RouteChange) {
    console.log('VideoToolbar route changed', {
      from: previousRoute?.url.pathname,
      to: route.url.pathname,
      routeName: route.name,
      params: route.params,
      query: Object.fromEntries(route.query),
      meta: route.meta,
    });
  }

  openComments() {
    // Outside onRouteChange the convenience getters reflect router.current.
    this.router.navigate({
      name: 'video',
      params: { vid: this.params.vid },
      query: { tab: 'comments' },
    });
  }

  openVideo(vid: string | number) {
    this.router.navigate({
      name: 'video',
      params: { vid },
    });
  }

  goHome() {
    this.router.navigate({ name: 'home' });
  }

  goBack() {
    this.router.back();
  }

  goForward() {
    this.router.forward();
  }

  createShareUrl() {
    return this.router.url({
      name: 'video',
      params: { vid: this.params.vid },
      query: { tab: this.query.get('tab') ?? undefined },
    });
  }
}

customElements.define('home-page', HomePage);
customElements.define('video-page', VideoPage);
customElements.define('video-toolbar', VideoToolbar);

const router = new Router([HomePage, VideoPage]);
setDefaultRouter(router);
router.start();

// Programmatic navigation outside Web Components.
router.navigate({ name: 'video', params: { vid: 123 } });
router.navigate({ name: 'video', params: { vid: 124 }, query: { tab: 'comments' } });
router.back();
router.forward();

// Generate a URL without navigating.
const href = router.url({
  name: 'video',
  params: { vid: 125 },
  query: { tab: 'details' },
});
console.log(href); // /videos/125?tab=details

// Normal anchors also work. Matching internal links are intercepted by the Router:
// <a href="/">Home</a>
// <a href="/videos/123">Video 123</a>
// <a href="/videos/124?tab=comments">Video 124 comments</a>
//
// Typical application markup:
// <video-toolbar></video-toolbar>
// <router-content></router-content>
