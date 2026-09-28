export * from './src/lib/router';
export * from './src/lib/auxiliary-route';
export * from './src/lib/with-router';

export * from './src/components/router-content';

import type { RouterContent } from './src/components/router-content';

declare global {
  interface HTMLElementTagNameMap {
    'router-content': RouterContent;
  }
}

export * from './src/lib/route-renderer';
