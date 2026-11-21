// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { TjForm, type TjFormUpdateDetail } from './tj-form';

// Jede Form wird nach dem Test getrennt, damit delegierte Listener sauber entfernt werden.
afterEach(() => document.body.replaceChildren());

// Prüft die gemeinsame Objektreferenz statt einer separaten Formular-Datenkopie.
describe('TjForm object binding', () => {
  // Auch vor dem Connect registrierte Verbraucher sehen beim Update die neuen Werte.
  it.each(['input', 'change'])('emits update after synchronizing %s without redispatching native events', (type) => {
    const form = new TjForm();
    form.innerHTML = '<input type="checkbox" name="popup"><input name="title">';
    const value = { popup: false, title: 'Alt', metadata: { retained: true } };
    const states: boolean[] = [];
    let nativeEvents = 0;
    form.addEventListener('update', event => {
      const detail = (event as CustomEvent<TjFormUpdateDetail>).detail;
      expect(detail.value).toBe(value);
      expect(value.title).toBe('Neu');
      expect(value.metadata).toEqual({ retained: true });
      states.push(value.popup);
    });
    form.addEventListener(type, () => nativeEvents++);
    document.body.append(form);
    form.value = value;
    const checkbox = form.querySelector<HTMLInputElement>('[name="popup"]')!;
    form.querySelector<HTMLInputElement>('[name="title"]')!.value = 'Neu';
    for (const checked of [true, false, true]) {
      checkbox.checked = checked;
      checkbox.dispatchEvent(new Event(type, { bubbles: true }));
    }
    expect(states).toEqual([true, false, true]);
    expect(nativeEvents).toBe(3);
  });

  // Kind-Updates dürfen beim Elternformular nicht als zweites Update ankommen.
  it('emits one local update per nested form with synchronized data', () => {
    const form = new TjForm();
    form.innerHTML = '<tj-form name="address"><input name="city"></tj-form>';
    document.body.append(form);
    const nested = form.querySelector('tj-form')!;
    const value = { address: { city: 'Berlin' } };
    form.value = value;
    const events: string[] = [];
    nested.addEventListener('update', event => {
      expect(event.target).toBe(nested);
      expect(value.address.city).toBe('Bonn');
      events.push('child');
    });
    form.addEventListener('update', event => {
      expect(event.target).toBe(form);
      expect(value.address.city).toBe('Bonn');
      events.push('parent');
    });
    const input = form.querySelector('input')!;
    input.value = 'Bonn';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(events).toEqual(['child', 'parent']);
  });

  it.each(['input', 'change'])('writes %s changes into the supplied object and preserves metadata', (type) => {
    const form = new TjForm();
    form.innerHTML = '<input name="title">';
    document.body.append(form);
    const metadata = { source: 'test' };
    const value = { title: 'Alt', metadata };
    form.value = value;
    const input = form.querySelector('input')!;
    expect(input.value).toBe('Alt');
    input.value = 'Neu';
    input.dispatchEvent(new Event(type, { bubbles: true }));
    expect(value.title).toBe('Neu');
    expect(form.value).toBe(value);
    expect(value.metadata).toBe(metadata);
  });

  it('keeps nested object references and updates parents from nested input events', () => {
    const form = new TjForm();
    form.innerHTML = '<tj-form name="address"><input name="city"></tj-form>';
    document.body.append(form);
    const address = { city: 'Berlin', metadata: { retained: true } };
    const value = { address, title: 'Profil' };
    form.value = value;
    const input = form.querySelector('input')!;
    input.value = 'Bonn';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(value.address).toBe(address);
    expect(address.city).toBe('Bonn');
    expect(address.metadata).toEqual({ retained: true });
    expect(form.querySelector('tj-form')!.value).toBe(address);
    expect(form.value).toBe(value);
  });

  it('reads programmatic edits before submit and exposes the original reference', async () => {
    const form = new TjForm();
    form.innerHTML = '<input name="title">';
    document.body.append(form);
    const value = { title: 'Alt', metadata: {} };
    form.value = value;
    form.querySelector('input')!.value = 'Programmatisch';
    form.addEventListener('tj-form-submit', event => {
      event.preventDefault();
      expect((event as CustomEvent).detail.value).toBe(value);
      expect(value.title).toBe('Programmatisch');
    }, { once: true });
    await form.requestSubmit();
    expect(value.title).toBe('Programmatisch');
  });

  it('stops updating a replaced reference and detaches listeners on disconnect', () => {
    const form = new TjForm();
    form.innerHTML = '<input name="title">';
    document.body.append(form);
    const oldValue = { title: 'Alt' };
    const value = { title: 'Neu' };
    form.value = oldValue;
    form.value = value;
    const input = form.querySelector('input')!;
    input.value = 'Aktuell';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(oldValue.title).toBe('Alt');
    expect(value.title).toBe('Aktuell');
    form.remove();
    input.value = 'Getrennt';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(value.title).toBe('Aktuell');
  });
});
