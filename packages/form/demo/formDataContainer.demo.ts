import { defineDemo } from '@trunkjs/demo-viewer';
import { defineArray, defineScope } from '../src/lib/Scope/scope';

const example1 = () => {
  const $scope = defineScope({
    name: {
      onchange: (scope, event) => {
        $scope.geburtsdatum.value = '1990-01-01';
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
