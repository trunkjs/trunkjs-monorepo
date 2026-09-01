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
    controls.controls = { items: [{ id: 'open', type: 'button', label: 'Open', onClick() { return; } }] };
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

  it('applies native attributes through the unified control definition', async () => {
    const controls = document.createElement('tj-demo-controls') as TjDemoControls;
    controls.environment = environment;
    controls.controls = {
      items: [{
        id: 'value',
        type: 'input',
        label: 'Value',
        value: 25,
        attributes: { type: 'range', min: '0', max: '100' },
      }],
    };
    document.body.append(controls);
    await controls.updateComplete;

    const input = controls.renderRoot.querySelector<HTMLInputElement>('input[data-tj-demo-control]');
    expect(input?.type).toBe('range');
    expect(input?.min).toBe('0');
    expect(input?.max).toBe('100');
    expect(input?.value).toBe('25');
  });

  it('offers all available handlers in a dropdown', async () => {
    const controls = document.createElement('tj-demo-controls') as TjDemoControls;
    controls.environment = environment;
    controls.controls = { items: [{ type: 'json', label: 'Data' }] };
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
