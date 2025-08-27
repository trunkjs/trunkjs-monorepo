import { TjResponsiveElement } from './components/tj-responsive/tj-responsive';

export * from './components/tj-responsive/tj-responsive';

declare global {
  interface HTMLElementTagNameMap {
    'tj-responsive': TjResponsiveElement;
  }
}
