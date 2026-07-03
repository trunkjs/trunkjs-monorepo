export default {
  title: 'Interaktive Counter-Demo',
  description: 'Eine einfache Demo mit sticky Controls im Footer.',

  render(root: HTMLElement) {
    root.replaceChildren();

    let count = 0;

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

    const controls = document.createElement('div');
    controls.slot = 'controls';
    controls.style.display = 'flex';
    controls.style.gap = '12px';

    const decrement = document.createElement('button');
    decrement.textContent = '−1';

    const increment = document.createElement('button');
    increment.textContent = '+1';

    for (const button of [decrement, increment]) {
      button.style.padding = '10px 16px';
      button.style.borderRadius = '10px';
      button.style.border = '1px solid #94a3b8';
      button.style.background = '#fff';
      button.style.cursor = 'pointer';
    }

    const update = () => {
      value.textContent = String(count);
    };

    decrement.addEventListener('click', () => {
      count -= 1;
      update();
    });

    increment.addEventListener('click', () => {
      count += 1;
      update();
    });

    update();

    controls.append(decrement, increment);
    wrapper.append(value, hint);
    root.append(wrapper, controls);
  },
};
