import { defineDemo } from '@trunkjs/demo-viewer';
import { FormScope } from '@trunkjs/form';

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

    const form = document.createElement('form');
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

    const scope = new FormScope(form);
    scope.data = {
      name: 'Max Mustermann',
      email: 'max@example.com',
      newsletter: true,
      role: 'admin',
      country: 'ch',
      note: 'Vorbelegte Werte über FormScope.data',
    };

    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '12px';

    const readButton = document.createElement('button');
    readButton.type = 'button';
    readButton.textContent = 'Daten lesen';

    const fillButton = document.createElement('button');
    fillButton.type = 'button';
    fillButton.textContent = 'Andere Werte setzen';

    for (const button of [readButton, fillButton]) {
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
      output.textContent = JSON.stringify(scope.data, null, 2);
    };

    readButton.addEventListener('click', renderOutput);
    fillButton.addEventListener('click', () => {
      scope.data = {
        name: 'Erika Musterfrau',
        email: 'erika@example.com',
        newsletter: false,
        role: 'user',
        country: 'at',
        note: 'Neu gesetzt per Button',
      };
      renderOutput();
    });

    renderOutput();

    buttonRow.append(readButton, fillButton);
    wrapper.append(form, buttonRow, output);
    root.append(wrapper);
  },
});
