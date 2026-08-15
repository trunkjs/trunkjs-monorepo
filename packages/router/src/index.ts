export * from './lib/router';
export * from './lib/with-router';

import { RouterContent } from './lib/with-router';

declare global {
  interface HTMLElementTagNameMap {
    'router-content': RouterContent;
  }
}
