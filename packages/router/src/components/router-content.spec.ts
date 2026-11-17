import { afterEach, describe, expect, it, vi } from 'vitest';
import { Router } from '../lib/router';
import { setDefaultRouter } from '../lib/with-router';
import './router-content';

describe('RouterContent route errors', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('shows an alert when the requested route is not defined', () => {
    const router = new Router([{ path: '/' }]);
    setDefaultRouter(router);
    document.body.innerHTML = '<router-content></router-content>';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    router.navigate('/missing?from=test#section');

    const alert = document.querySelector('router-content [role="alert"]');
    expect(alert?.textContent).toBe('<router-content>: Route not found: /missing?from=test#section');
  });
});
