import { defineDemo } from '@trunkjs/demo-viewer';
import { createScope, defineArray } from '../src/lib/Scope/scope';

const example1 = () => {
  const $scope = createScope({
    name: {
      onchange: (value, event) => {
        console.log('Name geändert:', value.value);
      },
    },
    geburtsdatum: {
      defaultValue: '2000-01-01',
      oninput: (value) => {
        console.log('Geburtsdatum geändert:', value.value);
      },
    },
    arbeitgeber: defineArray({
      firma: {
        defaultValue: 'Firma XYZ',
      },
      position: {
        defaultValue: 'Softwareentwickler',
        onchange: (value) => {
          value.element?.classList.toggle('highlight', value.value === 'Manager');
        },
      },
    }),
  });
};

export default defineDemo({
  title: 'Basic form',
  description: 'Erste Demo für FormScope mit Standard-Plugins.',

  render() {},
});
