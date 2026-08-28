import { defineDemo } from '@trunkjs/demo-viewer';
import { createFormScope, defineArray } from '../src/lib/Scope/scope';

const example1 = () => {
  const $scope = createFormScope({
    name: {},
    geburtsdatum: {
      defaultValue: '2000-01-01',
      oninput: (value) => {
        console.log('Geburtsdatum geändert:', value.value);
        value.$scope?.name.value;
      },
    },
    arbeitgeber: defineArray({
      firma: {
        defaultValue: 'Firma XYZ',
      },
      position: {
        defaultValue: 'Softwareentwickler',
      },
    }),
  });

  $scope.name.onchange = (value, event) => {
    console.log('Name geändert:', value.value, event.type);
    value.$scope.value;
  };

  $scope.geburtsdatum.oninput = (value) => {
    console.log('Geburtsdatum geändert:', value.value);
    value.$scope?.name.value;
  };

  $scope.arbeitgeber.at(0).position.onchange = (value) => {
    value.element.classList.toggle('highlight', value.value === 'Manager');
    value.$scope?.firma.value;
  };
};

export default defineDemo({
  title: 'Basic form',
  description: 'Erste Demo für FormScope mit Standard-Plugins.',

  render() {},
});
