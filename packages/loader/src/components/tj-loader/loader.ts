

import style from "./loader.scss?inline";


export class LoaderElement extends HTMLElement {


  #elementMap = new Map<HTMLElement, { waitStart: number }>();

  #startTime = Date.now();

  #interval : number | null = null;

  #onAfterLoad = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Convert style from inline style to a style element
    const styleElement = document.createElement('style');
    styleElement.textContent = style;
    const shadowRoot = this.shadowRoot!;
    shadowRoot.appendChild(styleElement);
    const rootElement = document.createElement('div');

    // Find the first Image element in document


    rootElement.innerHTML = `<div id="wrapper"><slot name="loader"><div id="window"><div id="image"><img src="" loading="eager"></div><div id="loadbar"></div></div></slot></div><slot id="main"></slot>`;
    shadowRoot.appendChild(rootElement);
  }

  connectedCallback() {
    window.tj_loader_state = "loading";

    this.addEventListener('init:child-waitreq', (e) => this.#handleChildWaitReq(e as CustomEvent));
    this.addEventListener('init:child-ready', (e) => this.#handleChildReady(e as CustomEvent));

    this.#interval = window.setInterval(this.#checkReadyState, 2000);

    window.addEventListener('load', () => {
      this.#onAfterLoad = true;
      console.debug(`Window load event received after ${Date.now() - this.#startTime}ms`);
      this.#checkReadyState();
    });

    window.setTimeout(() => {
      const firstImg = document.querySelector("img.loader") ?? document.querySelector("img");
      const imageSrc = firstImg?.getAttribute('src') || this.getAttribute('data-src') || '';
      const img = this.shadowRoot!.querySelector("img");
      if (img) {
        img.onload = () => {
          img.classList.add('loaded');
        }
        img.setAttribute("src", imageSrc);
      }
    },2);


  }

  #checkReadyState = () => {
    // Walk map and remove elements loading longer than 4 sekonds

    const now = Date.now();
    for (const [element, info] of this.#elementMap.entries()) {
      if (now - info.waitStart > 4000) {
        console.error(`Element ${element} has been waiting for more than 4 seconds. Removing from loader (Check callbacks!).`, element);
        this.#elementMap.delete(element);
      }
    }

    if ( ! this.#onAfterLoad) {
      return; // Wait for ready stat
    }

    if (this.#elementMap.size === 0) {
      window.tj_loader_state = "ready";
      this.dispatchEvent(new CustomEvent('loader:ready', {
        bubbles: true,
        composed: true,
      }));
      console.debug(`Loader ready after ${Date.now() - this.#startTime}ms`);
      this.classList.add('ready');
      window.clearInterval(this.#interval!);
    }
  }

  #handleChildWaitReq = (event: CustomEvent) => {
    const {element, state} = event.detail;
    this.#elementMap.set(element, {waitStart: Date.now()});
  };




  #handleChildReady = (event: CustomEvent) => {
    const {element, state} = event.detail;
    const info = this.#elementMap.get(element);
    if ( ! info) {
      console.warn(`Received ready event for element that did not send waitreq:`, element);
      return;
    }
    this.#elementMap.delete(element);
    console.debug(`Element ready:`, element, `Waited for ${Date.now() - info.waitStart}ms`);
    this.#checkReadyState()
  }

}

// check if the element is already defined - if so trigger error
if (customElements.get('tj-loader')) {
  console.error('tj-loader is already defined. Please check for duplicate imports or custom element definitions.');
} else {
  customElements.define('tj-loader', LoaderElement);
}