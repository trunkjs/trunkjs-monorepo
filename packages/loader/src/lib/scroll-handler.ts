type SavedPosition = { url: string; scrollTop: number };

/** Stores the active URL and scroll offset for the next full page load. */
export class ScrollHandler {
  #saveTimer: number | undefined;
  #positionRestored = false;
  #connected = false;

  constructor(
    private scrollElement: Window | HTMLElement = window,
    private scrollId = 'scroll-position1',
    private debug: (...args: unknown[]) => void = () => undefined,
  ) {}

  #readPosition(): SavedPosition | null {
    try {
      const value = sessionStorage.getItem(this.scrollId);
      if (!value) return null;
      const position: unknown = JSON.parse(value);
      if (
        typeof position === 'object' && position !== null &&
        'url' in position && typeof position.url === 'string' &&
        'scrollTop' in position && typeof position.scrollTop === 'number' &&
        Number.isFinite(position.scrollTop)
      ) return position as SavedPosition;
    } catch {
      // Storage can be unavailable or contain data from an older version.
    }
    return null;
  }

  #savePosition = () => {
    if (!this.#positionRestored || !this.#connected) return;
    window.clearTimeout(this.#saveTimer);
    this.#saveTimer = undefined;
    try {
      const scrollTop = this.scrollElement === window ? window.scrollY : (this.scrollElement as HTMLElement).scrollTop;
      sessionStorage.setItem(this.scrollId, JSON.stringify({ url: location.href, scrollTop }));
      this.debug('Saved scroll position', location.href, scrollTop);
    } catch {
      // A disabled session store must not break navigation.
    }
  };

  #handleScroll = () => {
    if (!this.#positionRestored) return;
    window.clearTimeout(this.#saveTimer);
    this.#saveTimer = window.setTimeout(this.#savePosition, 100);
  };

  public restoreScrollPosition() {
    const saved = this.#readPosition();
    if (saved?.url === location.href) {
      this.debug('Restoring saved position', saved.scrollTop, location.href);
      this.scrollElement.scrollTo({ top: saved.scrollTop, left: 0, behavior: 'instant' as ScrollBehavior });
    } else if (!this.scrollToHash()) {
      this.debug('Scrolling to top', location.href);
      this.scrollElement.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
    this.#positionRestored = true;
  }

  #getHashTarget(hash: string): HTMLElement | null {
    if (!hash) return null;
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      id = hash.slice(1);
    }
    return document.getElementById(id) || document.getElementsByName(id)[0] || null;
  }

  public hasHashTarget(hash: string): boolean {
    return this.#getHashTarget(hash) !== null;
  }

  public scrollToHash(behavior: ScrollBehavior = 'instant' as ScrollBehavior): boolean {
    const target = this.#getHashTarget(location.hash);
    if (!target) return false;
    this.debug('Scrolling to anchor', location.hash, behavior);
    target.scrollIntoView({ behavior, block: 'start' });
    return true;
  }

  public connectEventListener() {
    if (this.#connected) return;
    this.#connected = true;
    this.scrollElement.addEventListener('scroll', this.#handleScroll, { passive: true });
    window.addEventListener('pagehide', this.#savePosition);
  }

  public disconnectEventListener() {
    this.#connected = false;
    window.clearTimeout(this.#saveTimer);
    this.scrollElement.removeEventListener('scroll', this.#handleScroll);
    window.removeEventListener('pagehide', this.#savePosition);
  }
}
