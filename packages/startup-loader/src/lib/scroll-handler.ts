import { Debouncer } from './Debouncer';

export class ScrollHandler {
  #debouncer = new Debouncer(100, 500);

  #positionRestored = false;

  constructor(
    private scrollElement: Window | HTMLElement = window,
    private scrollId = 'scroll-position1',
  ) {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }

  handleScroll = async () => {
    if (!this.#positionRestored) {
      return; // Scroll before the position is restored should not be saved
    }
    await this.#debouncer.wait();
    sessionStorage.setItem(
      this.scrollId,
      JSON.stringify({
        url: location.href,
        scrollTop: this.scrollElement instanceof Window ? window.scrollY : this.scrollElement.scrollTop,
      }),
    );
  };

  public restoreScrollPosition() {
    const savedPosition = sessionStorage.getItem(this.scrollId);
    if (savedPosition) {
      const { url, scrollTop } = JSON.parse(savedPosition);
      if (url === location.href) {
        this.scrollElement.scrollTo(0, scrollTop);
      } else if (window.location.hash !== '') {
        // Try to scroll to element with id matching the hash
        const hash = window.location.hash.substring(1);
        const targetElement = document.getElementById(hash);
        if (targetElement) {
          targetElement.scrollIntoView();
        }
      }
    }
    this.#positionRestored = true;
  }

  connectEventListener() {
    this.scrollElement.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  disconnectEventListener() {
    this.scrollElement.removeEventListener('scroll', this.handleScroll);
  }
}
