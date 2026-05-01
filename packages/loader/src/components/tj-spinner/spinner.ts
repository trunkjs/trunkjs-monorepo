import style from './spinner.scss?inline';

export class SpinnerElement extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    // Convert style from inline style to a style element
    const styleElement = document.createElement('style');
    styleElement.textContent = style;
    shadowRoot.appendChild(styleElement);
    const rootElement = document.createElement('div');

    rootElement.innerHTML = `
<div id="spinner">
  <svg id="spinner-viewbox" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle id="spinner-circle" cx="50" cy="50" r="45" pathLength="100"/>
  </svg>

  <svg id="spinner-check" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 14.17L2.83 10l-1.41 1.41L7 17 19 5l-1.41-1.42L7 14.17z"/>
  </svg>
  <svg id="spinner-cross" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <line x1="30" y1="30" x2="70" y2="70" />
    <line x1="70" y1="30" x2="30" y2="70" />
  </svg>
</div>`;
    shadowRoot.appendChild(rootElement);
  }
}

// check if the element is already defined - if so trigger error
if (customElements.get('tj-spinner')) {
  console.error('tj-spinner is already defined. Please check for duplicate imports or custom element definitions.');
} else {
  customElements.define('tj-spinner', SpinnerElement);
}
