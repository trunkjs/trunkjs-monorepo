import { describe, expect, it, vi } from 'vitest';
import { createScope, defineReactiveScope, isScope, scopeAction, scopeResource } from '../index';
import { connect, disconnect, getRuntime } from '../runtime';

describe('shared scope runtime without DOM or renderer', () => {
  it('batches state changes and cleans up exactly once on disconnect', async () => {
    const cleanup = vi.fn();
    const setup = vi.fn(() => cleanup);
    const selected = vi.fn();
    const scope = defineReactiveScope({ count: 0, $on: { selected }, $hooks: { $connect: setup } });
    const consumer = { changed: vi.fn(), diagnose: vi.fn() };
    const runtime = getRuntime(scope)!;
    expect(isScope(scope)).toBe(true);
    expect(isScope({ ...scope })).toBe(false);
    connect(runtime, consumer);
    scope.count++;
    scope.count++;
    scope.$emit('selected', '42');
    await Promise.resolve();
    expect(consumer.changed).toHaveBeenCalledTimes(1);
    expect(selected).toHaveBeenCalledWith('42');
    disconnect(runtime, consumer);
    disconnect(runtime, consumer);
    expect(cleanup).toHaveBeenCalledTimes(1);
    scope.count++;
    await Promise.resolve();
    expect(consumer.changed).toHaveBeenCalledTimes(1);
    connect(runtime, consumer);
    expect(setup).toHaveBeenCalledTimes(2);
    disconnect(runtime, consumer);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it('activates structured values through the same consumer contract', async () => {
    const scope = createScope({ person: { name: { defaultValue: 'Ada' } } });
    const consumer = { changed: vi.fn(), diagnose: vi.fn() };
    const runtime = getRuntime(scope)!;
    connect(runtime, consumer);
    scope.person.name.$value = 'Linus';
    await Promise.resolve();
    expect(consumer.changed).toHaveBeenCalledTimes(1);
    expect(scope.$value.person.name).toBe('Linus');
    disconnect(runtime, consumer);
  });

  it('cancels a resource read but preserves an in-flight write across disconnect', async () => {
    let signal: AbortSignal | undefined;
    let finishWrite!: (result: string) => void;
    const scope = defineReactiveScope({
      users: scopeResource({
        load: (context) => { signal = context.signal; return new Promise<string[]>(() => undefined); },
        errorMessage: 'Cannot load users',
      }),
      $fn: { save: scopeAction({
        run: () => new Promise<string>((resolve) => { finishWrite = resolve; }),
        errorMessage: 'Cannot save',
      }) },
    });
    const consumer = { changed: vi.fn(), diagnose: vi.fn() };
    const runtime = getRuntime(scope)!;
    expect(await scope.users.reload()).toMatchObject({ status: 'cancelled', reason: 'disconnected' });
    connect(runtime, consumer);
    const read = scope.users.reload();
    const write = scope.$fn.save();
    disconnect(runtime, consumer);
    expect(signal!.aborted).toBe(true);
    expect(await read).toMatchObject({ status: 'cancelled', reason: 'disconnected' });
    finishWrite('saved');
    expect(await write).toEqual({ status: 'success', data: 'saved' });
  });
});
