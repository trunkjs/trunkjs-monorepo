import { nothing, render, type RootPart } from 'lit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prolit, prolit_html, scopeAction, scopeDefine, scopeResource, type ProlitScope } from '../../index';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const roots: RootPart[] = [];
function mount(scope: ProlitScope) {
  const target = document.createElement('div');
  document.body.append(target);
  const part = render(prolit(scope), target);
  roots.push(part);
  return { part, target };
}
afterEach(() => {
  roots.splice(0).forEach((root) => root.setConnected(false));
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('scopeResource', () => {
  it('starts only when explicitly called while mounted; $connect sees an active scope', async () => {
    const load = vi.fn(async () => ['Ada']);
    const scope = scopeDefine({
      users: scopeResource({ load, errorMessage: 'Load failed' }),
      $tpl: prolit_html`<p>{{ users.data }}</p>`,
    });
    expect(scope.users.pending).toBe(false);
    expect(await scope.users.reload()).toEqual({ status: 'cancelled', reason: 'disconnected' });
    expect(load).not.toHaveBeenCalled();
    const { part } = mount(scope);
    expect(load).not.toHaveBeenCalled();
    const result = scope.users.reload();
    expect(scope.users.pending).toBe(true);
    expect(await result).toEqual({ status: 'success', data: ['Ada'] });
    expect(scope.users.data).toEqual(['Ada']);
    expect(scope.users.pending).toBe(false);
    part.setConnected(false);
    expect(await scope.users.reload()).toMatchObject({ status: 'cancelled' });
    const connected = scopeDefine({
      users: scopeResource({ load, errorMessage: 'Load failed' }),
      $hooks: {
        $connect: (): void => {
          void connected.users.reload();
        },
      },
      $tpl: prolit_html`<p>Connected</p>`,
    });
    mount(connected);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('settles superseded reads immediately and ignores late fulfillment/rejection', async () => {
    const a = deferred<string>();
    const b = deferred<string>();
    const signals: AbortSignal[] = [];
    const scope = scopeDefine({
      user: scopeResource({
        load: ({ signal }, id: string) => {
          signals.push(signal);
          return id === 'a' ? a.promise : b.promise;
        },
        errorMessage: 'Load failed',
      }),
      $tpl: prolit_html`<p>{{ user.data }}</p>`,
    });
    const { target } = mount(scope);
    const diagnostics = vi.fn();
    target.addEventListener('scope-error', diagnostics);
    const first = scope.user.reload('a');
    const second = scope.user.reload('b');
    expect(await first).toEqual({ status: 'cancelled', reason: 'superseded' });
    expect(signals[0].aborted).toBe(true);
    b.resolve('Linus');
    await second;
    a.reject(new Error('late failure'));
    await Promise.resolve();
    expect(scope.user.data).toBe('Linus');
    expect(scope.user.error).toBeNull();
    expect(diagnostics).not.toHaveBeenCalled();
  });
  it('cancels a pending read on scope replacement even if the loader ignores abort', async () => {
    const request = deferred<string>();
    const scope = scopeDefine({
      user: scopeResource({ load: () => request.promise, errorMessage: 'Load failed' }),
      $tpl: prolit_html`<p>{{ user.data }}</p>`,
    });
    const { target } = mount(scope);
    const result = scope.user.reload();
    render(nothing, target);
    expect(await result).toEqual({ status: 'cancelled', reason: 'disconnected' });
    expect(scope.user.pending).toBe(false);
    request.resolve('late');
    await Promise.resolve();
    expect(scope.user.data).toBeUndefined();
  });
  it('retains successful data on refresh failure and reports the original cause once', async () => {
    const cause = new Error('private server details');
    const load = vi.fn().mockResolvedValueOnce(['Ada']).mockRejectedValueOnce(cause).mockResolvedValueOnce([]);
    const scope = scopeDefine({
      users: scopeResource<string[]>({ load, errorMessage: 'Cannot load users' }),
      $tpl: prolit_html`<p>{{ users.error?.message }}</p>`,
    });
    const { target } = mount(scope);
    const diagnostic = vi.fn();
    target.addEventListener('scope-error', diagnostic);
    await scope.users.reload();
    const result = await scope.users.reload();
    expect(result).toEqual({ status: 'error', error: { message: 'Cannot load users', cause } });
    expect(scope.users.data).toEqual(['Ada']);
    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(target.textContent).not.toContain('private server details');
    const retry = scope.users.reload();
    expect(scope.users.error).toBeNull();
    await retry;
    expect(scope.users.data).toEqual([]);
  });
  it('clears old parameter data with retainData:false and catches synchronous loader errors', async () => {
    let fail = false;
    const scope = scopeDefine({
      user: scopeResource({
        load: () => {
          if (fail) throw Error('sync');
          return Promise.resolve('Ada');
        },
        errorMessage: 'Cannot load',
        retainData: false,
      }),
      $tpl: prolit_html`<p>User</p>`,
    });
    mount(scope);
    await scope.user.reload();
    fail = true;
    expect((await scope.user.reload()).status).toBe('error');
    expect(scope.user.data).toBeUndefined();
    expect(scope.user.pending).toBe(false);
  });
});

describe('scopeAction', () => {
  it('locks synchronously, survives disconnect/reconnect, and returns the actual write result', async () => {
    const request = deferred<string>();
    const run = vi.fn(() => request.promise);
    const scope = scopeDefine({
      $fn: { save: scopeAction({ run, errorMessage: 'Cannot save' }) },
      $tpl: prolit_html`<p>Save</p>`,
    });
    expect(await scope.$fn.save()).toEqual({ status: 'cancelled', reason: 'disconnected' });
    const { part } = mount(scope);
    const result = scope.$fn.save();
    expect(scope.$fn.save.pending).toBe(true);
    expect(await scope.$fn.save()).toEqual({ status: 'cancelled', reason: 'busy' });
    part.setConnected(false);
    part.setConnected(true);
    expect(await scope.$fn.save()).toEqual({ status: 'cancelled', reason: 'busy' });
    request.resolve('saved');
    expect(await result).toEqual({ status: 'success', data: 'saved' });
    expect(run).toHaveBeenCalledTimes(1);
    expect(scope.$fn.save.pending).toBe(false);
  });
  it('keeps draft data on error, reports once and clears the error on explicit retry', async () => {
    const cause = new Error('conflict');
    const run = vi.fn().mockRejectedValueOnce(cause).mockResolvedValueOnce('saved');
    const scope = scopeDefine({
      draft: { name: 'Ada Lovelace' },
      $fn: { save: scopeAction({ run, errorMessage: 'Cannot save' }) },
      $tpl: prolit_html`<p>{{ draft.name }}</p>`,
    });
    const { target } = mount(scope);
    const diagnostic = vi.fn();
    target.addEventListener('scope-error', diagnostic);
    expect(await scope.$fn.save()).toEqual({ status: 'error', error: { message: 'Cannot save', cause } });
    expect(scope.draft.name).toBe('Ada Lovelace');
    expect(diagnostic).toHaveBeenCalledTimes(1);
    const retry = scope.$fn.save();
    expect(scope.$fn.save.error).toBeNull();
    expect((await retry).status).toBe('success');
  });
});
