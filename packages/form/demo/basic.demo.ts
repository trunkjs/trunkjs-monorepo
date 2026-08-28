import { defineDemo } from '@trunkjs/demo-viewer';
import { registerFormController } from '@trunkjs/form';

registerFormController('basic-demo', {
  args: { source: 'demo' },
  onLoad({ form }) {
    form.data = {
      name: 'Max Mustermann',
      email: 'max@example.com',
      newsletter: true,
      role: 'admin',
      tags: ['docs'],
      country: 'ch',
      note: 'Geladen über den global registrierten Form-Controller',
    };
  },
  onValidate({ form }) {
    return form.checkValidity();
  },
  onSubmit({ data, args }) {
    return { data, args, submitted: true };
  },
});

export default defineDemo({
  title: 'Basic form',
  description: 'Erste Demo für FormScope mit Standard-Plugins.',

  render(root: HTMLElement) {
    root.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.style.display = 'grid';
    wrapper.style.gap = '16px';
    wrapper.style.maxWidth = '520px';
    wrapper.style.padding = '24px';
    wrapper.style.border = '1px solid #d4d4d8';
    wrapper.style.borderRadius = '16px';
    wrapper.style.background = '#fff';

    const form = document.createElement('tj-form');
    form.controller = 'basic-demo';
    form.style.display = 'grid';
    form.style.gap = '12px';

    form.innerHTML = `
      <label style="display:grid; gap:6px; font:14px/1.4 sans-serif; color:#18181b;">
        Name
        <input name="name" type="text" placeholder="Max Mustermann" style="padding:10px 12px; border:1px solid #a1a1aa; border-radius:10px;" />
      </label>

      <label style="display:grid; gap:6px; font:14px/1.4 sans-serif; color:#18181b;">
        E-Mail
        <input name="email" type="email" placeholder="max@example.com" style="padding:10px 12px; border:1px solid #a1a1aa; border-radius:10px;" />
      </label>

      <label style="display:flex; gap:8px; align-items:center; font:14px/1.4 sans-serif; color:#18181b;">
        <input name="newsletter" type="checkbox" />
        Newsletter abonnieren
      </label>

      <fieldset style="display:grid; gap:8px; border:1px solid #e4e4e7; border-radius:12px; padding:12px;">
        <legend>Rolle</legend>
        <label style="display:flex; gap:8px; align-items:center;">
          <input name="role" type="radio" value="user" /> User
        </label>
        <label style="display:flex; gap:8px; align-items:center;">
          <input name="role" type="radio" value="admin" /> Admin
        </label>
      </fieldset>

      <fieldset style="display:grid; gap:8px; border:1px solid #e4e4e7; border-radius:12px; padding:12px;">
        <legend>Tags (Array)</legend>
        <label><input name="tags[]" type="checkbox" value="docs" /> Dokumentation</label>
        <label><input name="tags[]" type="checkbox" value="examples" /> Beispiele</label>
      </fieldset>

      <label style="display:grid; gap:6px; font:14px/1.4 sans-serif; color:#18181b;">
        Land
        <select name="country" style="padding:10px 12px; border:1px solid #a1a1aa; border-radius:10px;">
          <option value="de">Deutschland</option>
          <option value="at">Österreich</option>
          <option value="ch">Schweiz</option>
        </select>
      </label>

      <label style="display:grid; gap:6px; font:14px/1.4 sans-serif; color:#18181b;">
        Notiz
        <textarea name="note" rows="4" style="padding:10px 12px; border:1px solid #a1a1aa; border-radius:10px;"></textarea>
      </label>
    `;

    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '12px';

    const readButton = document.createElement('button');
    readButton.type = 'button';
    readButton.textContent = 'Daten lesen';

    const fillButton = document.createElement('button');
    fillButton.type = 'button';
    fillButton.textContent = 'Andere Werte setzen';

    const validateButton = document.createElement('button');
    validateButton.type = 'button';
    validateButton.textContent = 'Validated umschalten';

    const submitButton = document.createElement('button');
    submitButton.type = 'button';
    submitButton.textContent = 'AJAX-Submit auslösen';

    for (const button of [readButton, fillButton, validateButton, submitButton]) {
      button.style.padding = '10px 16px';
      button.style.borderRadius = '10px';
      button.style.border = '1px solid #a1a1aa';
      button.style.background = '#18181b';
      button.style.color = '#fff';
      button.style.cursor = 'pointer';
    }

    const output = document.createElement('pre');
    output.style.margin = '0';
    output.style.padding = '16px';
    output.style.borderRadius = '12px';
    output.style.background = '#f4f4f5';
    output.style.fontSize = '12px';
    output.style.overflow = 'auto';

    const renderOutput = () => {
      output.textContent = JSON.stringify(form.data, null, 2);
    };

    readButton.addEventListener('click', renderOutput);
    fillButton.addEventListener('click', () => {
      form.data = {
        name: 'Erika Musterfrau',
        email: 'erika@example.com',
        newsletter: false,
        role: 'user',
        tags: ['examples'],
        country: 'at',
        note: 'Neu gesetzt per Button',
      };
      renderOutput();
    });
    validateButton.addEventListener('click', () => {
      const all = form.remote.get('*');
      if (all) {
        all.validated = !all.validated;
      }
    });
    submitButton.addEventListener('click', () => form.requestSubmit());
    form.addEventListener('tj-form-success', (event) => {
      const { result } = (event as CustomEvent<{ result: unknown }>).detail;
      output.textContent = JSON.stringify(result, null, 2);
    });

    renderOutput();

    buttonRow.append(readButton, fillButton, validateButton, submitButton);
    wrapper.append(form, buttonRow, output);
    root.append(wrapper);
  },
});
