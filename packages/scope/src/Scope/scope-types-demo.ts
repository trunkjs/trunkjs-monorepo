// @ts-nocheck
import { createScope, defineScope, type TScope } from './scope-types';

const scopeDefinition = defineScope({
  zeit: {
    defaultValue: '',
    onclick(value, event) {
      $scope.wurst.$value = 'Bratwurst';
      value.element.getAttribute('wrust');

      console.log('Zeit clicked!', value, event);
    },
  },
  wurst: {
    defaultValue: 'lecker',

    onclick(value, event) {
      console.log('Wurst clicked!', value, event);
    },
  },
  arbeitgeber: defineScope({
    name: {
      defaultValue: '',
      onclick: (value) => {
        value.element.getAttribute('wrust');
      },
    },
    position: {
      defaultValue: 'Position',
    },
  }),
});

const $scope: TScope<typeof scopeDefinition> = createScope(scopeDefinition);

$scope.arbeitgeber.name.$scope.$$.name.onclick = (value, event) => console.log('New click handler', value, event);

$scope.withValue('key2', {
  defaultValue: 'value2',
});

$scope.key2.$$.onclick = (value) => console.log(value);

$scope.withScope('firma', {
  name: {
    defaultValue: 'ACME',
    onclick: (value) => console.log('Firma name clicked!', value.$value, value.$scope),
  },
});

$scope.firma.name.$$.onclick = (value) => console.log(value.$root.wurst.$value);

$scope.withArray('mitarbeiter', {
  name: {
    defaultValue: 'Max',
  },
});

$scope.mitarbeiter[0].name.$value = 'wurst';
$scope.mitarbeiter.at(0).name.$value = 'wurst';
$scope.mitarbeiter.first().name.$value = 'wurst';
$scope.mitarbeiter.last().name.$value = 'wurst';

const mitarbeiterIterator = $scope.mitarbeiter[Symbol.iterator]();
const ersterMitarbeiter = mitarbeiterIterator.next().value;
if (ersterMitarbeiter) {
  ersterMitarbeiter.name.$value = 'wurst';
  ersterMitarbeiter.$root.firma.name.$value = 'Root ACME';
}

$scope.mitarbeiter.$$.item.name.defaultValue = 'Moritz';

const value = $scope.$value;

$scope.mitarbeiter.$value.forEach((m) => m.name);

void value;
