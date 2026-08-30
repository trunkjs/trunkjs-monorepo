import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TDemoEnvironment } from '../../types';
import './tj-demo-controls';
import { TjDemoControls } from './tj-demo-controls';

const environment = {
  state: new Map(),
  query: vi.fn(),
} as unknown as TDemoEnvironment;

describe('TjDemoControls code actions', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('opens a handler snippet from the control and returns focus when closed', async () => {
    const controls = document.createElement('tj-demo-controls') as TjDemoControls;
    controls.environment = environment;
    controls.actionBar = { items: [{ id: 'open', type: 'button', label: 'Open', onClick() {} }] };
    controls.sourceInfo = {
      controls: { open: { onClick: { code: "env.query('dialog').showModal();", language: 'js' } } },
    };
    document.body.append(controls);
    await controls.updateComplete;

    const dialog = controls.renderRoot.querySelector<HTMLDialogElement>('.code-dialog')!;
    Object.defineProperty(dialog, 'showModal', { value: () => dialog.setAttribute('open', ''), configurable: true });
    Object.defineProperty(dialog, 'close', {
      value: () => {
        dialog.removeAttribute('open');
        dialog.dispatchEvent(new Event('close'));
      },
      configurable: true,
    });
    const codeButton = controls.renderRoot.querySelector<HTMLButtonElement>('.code-button')!;
    codeButton.click();
    await controls.updateComplete;

    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('onClick');
    expect(dialog.textContent).toContain("env.query('dialog').showModal()");

    controls.renderRoot.querySelector<HTMLButtonElement>('.dialog-close')!.click();
    await controls.updateComplete;
    expect(controls.shadowRoot?.activeElement).toBe(codeButton);
  });

  it('offers all available handlers in a dropdown', async () => {
    const controls = document.createElement('tj-demo-controls') as TjDemoControls;
    controls.environment = environment;
    controls.actionBar = { items: [{ type: 'json', label: 'Data' }] };
    controls.sourceInfo = {
      controls: {
        '0': {
          validate: { code: 'Array.isArray(value)', language: 'js' },
          onApply: { code: 'apply(value)', language: 'js' },
        },
      },
    };
    document.body.append(controls);
    await controls.updateComplete;

    const labels = Array.from(controls.renderRoot.querySelectorAll('.code-menu-items button'), (button) => button.textContent);
    expect(labels).toEqual(['validate', 'onApply']);
  });
});
