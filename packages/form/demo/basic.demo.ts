import { defineDemo } from '@trunkjs/demo-viewer';
import { enterNextPlugin, registerFormPreset } from '@trunkjs/form';

registerFormPreset('basic-values', {
  value: {
    name: 'Max Mustermann',
    contact: { email: 'max@example.com', country: 'ch' },
  },
});

registerFormPreset('enter-next', {
  plugins: [enterNextPlugin()],
});

registerFormPreset('demo-submit', {
  onSubmit({ value, getElements }) {
    return {
      value,
      elements: getElements().map((element) => element.localName),
    };
  },
});

export default defineDemo({
  title: 'Object-valued form',
  description: 'Value, nested named forms, presets, element access, and opt-in Enter behavior.',

  render(root: HTMLElement) {
    root.innerHTML = `
      <tj-form presets="basic-values enter-next demo-submit" style="display:grid; gap:12px; max-width:520px; padding:24px;">
        <label>Name <input name="name" required /></label>
        <tj-form name="contact" style="display:grid; gap:12px; padding:16px; border:1px solid #ddd;">
          <label>E-Mail <input name="email" type="email" required /></label>
          <label>Land
            <select name="country">
              <option value="de">Deutschland</option>
              <option value="at">Österreich</option>
              <option value="ch">Schweiz</option>
            </select>
          </label>
        </tj-form>
        <button type="submit">Wert ausgeben</button>
        <pre data-output></pre>
      </tj-form>
    `;

    const form = root.querySelector('tj-form');
    const output = root.querySelector<HTMLElement>('[data-output]');
    if (!form || !output) {
      return;
    }
    const renderValue = (value: unknown) => {
      output.textContent = JSON.stringify(value, null, 2);
    };

    form.addEventListener('input', () => renderValue(form.value));
    form.addEventListener('tj-form-submit', (event) => {
      renderValue((event as CustomEvent<{ value: Record<string, unknown> }>).detail.value);
    });
    renderValue(form.value);
  },
});
