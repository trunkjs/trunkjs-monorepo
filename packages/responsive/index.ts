import { TjResponsiveElement } from './src/components/tj-responsive/tj-responsive';

export * from './src/components/tj-responsive/tj-responsive';

declare global {
  interface HTMLElementTagNameMap {
    'tj-responsive': TjResponsiveElement;
  }
}
