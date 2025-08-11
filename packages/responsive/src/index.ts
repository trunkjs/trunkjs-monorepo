import { TjResponsiveElement } from './components/tj-responsive/tj-responsive';

export * from './components/tj-responsive/tj-responsive';
export * from './lib/responsive';

declare global {
  interface HTMLElementTagNameMap {
    'tj-responsive': TjResponsiveElement;
  }
}
