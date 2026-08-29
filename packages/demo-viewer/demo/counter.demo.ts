import { defineDemo } from '@trunkjs/demo-viewer';

export default defineDemo({
  title: 'Interaktive Counter-Demo',
  description: 'Eine einfache Demo mit sticky Controls im Footer.',

  render(root: HTMLElement) {
    root.replaceChildren();

    const count = 0;

    const wrapper = document.createElement('section');
    wrapper.style.display = 'grid';
    wrapper.style.gap = '16px';
    wrapper.style.maxWidth = '420px';
    wrapper.style.padding = '24px';
    wrapper.style.borderRadius = '16px';
    wrapper.style.background = 'linear-gradient(135deg, #eff6ff, #f5f3ff)';
    wrapper.style.border = '1px solid #cbd5e1';

    const value = document.createElement('output');
    value.style.fontSize = '3rem';
    value.style.fontWeight = '700';
    value.style.color = '#1e293b';

    const hint = document.createElement('p');
    hint.textContent = 'Nutze die Buttons unten, um den Zähler zu verändern.';
    hint.style.margin = '0';
    hint.style.color = '#475569';

    value.textContent = String(count);
    wrapper.append(value, hint);
    root.append(wrapper);
  },
  actionBar: {
    items: [
      {
        type: 'button',
        label: '−1',
        onClick(_, env) {
          const value = env.query<HTMLOutputElement>('output');
          value.textContent = String(Number(value.textContent) - 1);
          env.actionBar.setValue('state', { count: Number(value.textContent) });
        },
      },
      {
        type: 'button',
        label: '+1',
        onClick(_, env) {
          const value = env.query<HTMLOutputElement>('output');
          value.textContent = String(Number(value.textContent) + 1);
          env.actionBar.setValue('state', { count: Number(value.textContent) });
        },
      },
      { id: 'state', type: 'json', label: 'Aktueller Zustand', readonly: true, value: { count: 0 } },
    ],
  },
});
