// @vitest-environment jsdom

import { LoaderRunLevelRegistry } from './loader-controller';

describe('LoaderRunLevelRegistry', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('runs registered levels in order', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    const registry = new LoaderRunLevelRegistry();
    const calls: string[] = [];
    registry
      .register({ name: 'structure', settleMs: 1, start: () => calls.push('structure') })
      .register({ name: 'media', settleMs: 1, start: () => calls.push('media') });

    const run = registry.run(host, { eventTarget: window, startWhen: Promise.resolve() });
    await vi.runAllTimersAsync();

    await expect(run).resolves.toEqual([
      expect.objectContaining({ name: 'structure', status: 'completed' }),
      expect.objectContaining({ name: 'media', status: 'completed' }),
    ]);
    expect(calls).toEqual(['structure', 'media']);
  });

  it('waits for explicit promises and element readiness', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    const child = document.createElement('div');
    const registry = new LoaderRunLevelRegistry();
    registry.register({
      name: 'structure',
      settleMs: 5,
      timeoutMs: 100,
      start: ({ waitUntil }) => {
        waitUntil(
          new Promise<void>((resolve) => {
            setTimeout(resolve, 10);
          }),
        );
        window.dispatchEvent(new CustomEvent('init:child-waitreq', { detail: { element: child } }));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('init:child-ready', { detail: { element: child } }));
        }, 20);
      },
    });

    const run = registry.run(host, { eventTarget: window, startWhen: Promise.resolve() });
    await vi.runAllTimersAsync();

    await expect(run).resolves.toEqual([expect.objectContaining({ name: 'structure', status: 'completed' })]);
  });

  it('continues after a level timeout', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    const registry = new LoaderRunLevelRegistry();
    const calls: string[] = [];
    registry
      .register({
        name: 'blocked',
        settleMs: 1,
        timeoutMs: 10,
        start: ({ waitUntil }) =>
          waitUntil(
            new Promise<void>((resolve) => {
              setTimeout(resolve, 100);
            }),
          ),
      })
      .register({ name: 'next', settleMs: 1, start: () => calls.push('next') });

    const run = registry.run(host, { eventTarget: window, startWhen: Promise.resolve() });
    await vi.runAllTimersAsync();

    await expect(run).resolves.toEqual([
      expect.objectContaining({ name: 'blocked', status: 'timed-out' }),
      expect.objectContaining({ name: 'next', status: 'completed' }),
    ]);
    expect(calls).toEqual(['next']);
  });

  it('skips a selector-bound level when its component is absent', async () => {
    const host = document.createElement('div');
    const registry = new LoaderRunLevelRegistry();
    const start = vi.fn();
    registry.register({ name: 'optional', selector: 'x-optional', start });

    const result = await registry.run(host, { eventTarget: window, startWhen: Promise.resolve() });

    expect(result).toEqual([expect.objectContaining({ name: 'optional', status: 'skipped' })]);
    expect(start).not.toHaveBeenCalled();
  });
});
