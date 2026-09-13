import { afterEach, describe, expect, it } from 'vitest';
import './tj-demo-toast';
import { TjDemoToast } from './tj-demo-toast';

describe('TjDemoToast', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows and dismisses a toast', async () => {
    const toast = document.createElement('tj-demo-toast') as TjDemoToast;
    document.body.append(toast);

    const id = toast.show('Saved', { title: 'Success' });
    await toast.updateComplete;

    expect(toast.shadowRoot?.querySelector('.message')?.textContent).toBe('Saved');
    toast.dismiss(id);
    await toast.updateComplete;
    expect(toast.shadowRoot?.querySelector('.message')).toBeNull();
  });

  it('keeps log output in a persistent logging toast', async () => {
    const toast = document.createElement('tj-demo-toast') as TjDemoToast;
    document.body.append(toast);

    toast.log('value', { count: 2 });
    await toast.updateComplete;

    const loggingToast = toast.shadowRoot?.querySelector('.logging-toast');
    expect(loggingToast).not.toBeNull();
    expect(loggingToast?.textContent).toContain('value');
    expect(loggingToast?.textContent).toContain('"count": 2');
  });
});
