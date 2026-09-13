import { describe, expect, it, vi } from 'vitest';
import { bindToOnEvent, EventMixin, MemoryEventRegistry, type TEventMap, type TEventMapConstraint } from './EventMixin';

type TestEvents = {
  click: [payload: { payload: string }];
  'target:event': [payload: { payload: string }];
};

class Base {}

class MockEventRegistry<TEvents extends TEventMapConstraint = TEventMap, TThis = unknown> extends MemoryEventRegistry<
  TEvents,
  TThis
> {}

class CustomEventHandler extends EventMixin<typeof Base, TestEvents>(Base, new MockEventRegistry<TestEvents>()) {
  @bindToOnEvent('click')
  accessor onclick: ((payload: { payload: string }) => void) | undefined;
}

describe('EventMixin', () => {
  it('supports $on assignment and $emit', () => {
    const handler = new CustomEventHandler();
    handler.defineOn({
      'target:event': (payload) => {},
    });
    const click = vi.fn();

    handler.$on.click = click;

    handler.$emit('click', { payload: 'test' });

    expect(click).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledWith({ payload: 'test' });
  });

  it('removes handlers when null is assigned', () => {
    const handler = new CustomEventHandler();
    const click = vi.fn();

    handler.$on.click = click;
    handler.$emit('click', { payload: 'first' });

    handler.$on.click = null;
    handler.$emit('click', { payload: 'second' });

    expect(click).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledWith({ payload: 'first' });
  });

  it('supports dynamic event names and defineOn', () => {
    const handler = new CustomEventHandler();
    const dynamicHandler = vi.fn();
    const click = vi.fn();

    handler.$on['target:event'] = dynamicHandler;
    handler.$emit('target:event', { payload: 'dynamic' });

    handler.defineOn({
      click,
    });
    handler.$emit('click', { payload: 'defineOn' });

    expect(dynamicHandler).toHaveBeenCalledWith({ payload: 'dynamic' });
    expect(click).toHaveBeenCalledWith({ payload: 'defineOn' });
  });

  it('binds accessor handlers with @bindToOnEvent', () => {
    const handler = new CustomEventHandler();
    const click = vi.fn();

    handler.onclick = click;
    handler.$emit('click', { payload: 'decorated' });

    expect(click).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledWith({ payload: 'decorated' });
  });
});
