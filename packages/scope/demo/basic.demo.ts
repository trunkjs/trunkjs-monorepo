import { defineDemo } from '@trunkjs/demo-viewer';
import { createScopeDemoMessage } from '@trunkjs/scope';

export default defineDemo({
  title: 'Basic scope demo',
  description: 'Kleine Starter-Demo für das neue Scope-Paket.',

  render(root: HTMLElement) {
    root.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.style.display = 'grid';
    wrapper.style.gap = '12px';
    wrapper.style.maxWidth = '480px';
    wrapper.style.padding = '24px';
    wrapper.style.border = '1px solid #d4d4d8';
    wrapper.style.borderRadius = '16px';
    wrapper.style.background = '#fff';
    wrapper.style.fontFamily = 'sans-serif';

    const title = document.createElement('h2');
    title.textContent = 'Scope Demo';
    title.style.margin = '0';

    const input = document.createElement('input');
    input.value = 'Scope';
    input.placeholder = 'Name eingeben';
    input.style.padding = '10px 12px';
    input.style.border = '1px solid #a1a1aa';
    input.style.borderRadius = '10px';

    const output = document.createElement('div');
    output.style.padding = '12px';
    output.style.borderRadius = '12px';
    output.style.background = '#f4f4f5';

    const renderOutput = () => {
      output.textContent = createScopeDemoMessage(input.value || 'Scope');
    };

    input.addEventListener('input', renderOutput);
    renderOutput();

    wrapper.append(title, input, output);
    root.append(wrapper);
  },
});
