import { describe, expect, it } from 'vitest';
import { ScopeValueRuntime } from './scope-runtime';
import { createScope, defineArray, defineScope, type TScope } from './scope-types';

describe('scope runtime', () => {
  it('defineScope and defineArray keep the definition shape', () => {
    const child = defineScope({
      name: {
        defaultValue: 'Max',
      },
    });
    const array = defineArray(child);

    expect(child.name.defaultValue).toBe('Max');
    expect(array.__type).toBe('array');
    expect(array.item).toBe(child);
  });

  it('withValue adds a value entry once', () => {
    const scopeDefinition = {
      name: {
        defaultValue: 'Anna',
      },
    };
    const $scope: TScope<typeof scopeDefinition> = createScope(scopeDefinition);

    $scope.withValue('age', {
      defaultValue: 33,
    });

    expect($scope.age.$value).toBe(33);
    expect($scope.$value).toEqual({
      name: 'Anna',
      age: 33,
    });
  });

  it('withScope adds a child scope once', () => {
    const scopeDefinition = {};
    const $scope: TScope<typeof scopeDefinition> = createScope(scopeDefinition);

    $scope.withScope('firma', {
      name: {
        defaultValue: 'ACME',
      },
    });

    expect($scope.firma.name.$value).toBe('ACME');
    expect($scope.firma.$root).toBe($scope);
  });

  it('withArray adds an array once', () => {
    const scopeDefinition = {};
    const $scope: TScope<typeof scopeDefinition> = createScope(scopeDefinition);

    $scope.withArray('mitarbeiter', {
      name: {
        defaultValue: 'Max',
      },
    });

    expect($scope.mitarbeiter.first().name.$value).toBe('Max');
    expect($scope.mitarbeiter.$root).toBe($scope);
    expect($scope.mitarbeiter.$value).toEqual([{ name: 'Max' }]);
  });

  it('uses a custom value factory when provided', () => {
    class CustomValue extends ScopeValueRuntime<any, any, any> {
      public get legacyValue(): unknown {
        return this.$value;
      }
    }

    const $scope = createScope(
      {
        name: {
          defaultValue: 'Anna',
        },
      },
      {
        createValue: (name, definition, scope, root) => new CustomValue(name, definition, scope, root),
      },
    );

    expect($scope.name).toBeInstanceOf(CustomValue);
    expect(($scope.name as CustomValue).legacyValue).toBe('Anna');
  });

  it('returns value metadata and resolves callbacks on demand', () => {
    let metaCalls = 0;
    const $scope = createScope({
      name: {
        defaultValue: 'Anna',
        $meta: (value, scope) => {
          metaCalls += 1;
          return {
            length: value.length,
            current: scope.name.$value,
          };
        },
      },
    });

    expect($scope.name.$meta).toEqual({
      meta: {
        length: 4,
        current: 'Anna',
      },
      value: 'Anna',
    });
    expect(metaCalls).toBe(1);

    expect($scope.$meta).toEqual({
      meta: {
        $self: {},
        name: {
          meta: {
            length: 4,
            current: 'Anna',
          },
          value: 'Anna',
        },
      },
      value: {
        name: 'Anna',
      },
    });
    expect(metaCalls).toBe(2);
  });

  it('collects metadata recursively for scopes and arrays', () => {
    const $scope = createScope({
      $meta: {
        section: 'root',
      },
      person: defineScope({
        $meta: {
          section: 'person',
        },
        city: {
          defaultValue: 'Berlin',
          $meta: {
            label: 'City',
          },
        },
      }),
      tags: defineArray({
        label: {
          defaultValue: 'seed',
          $meta: (value, scope) => ({
            upper: value.toUpperCase(),
            current: scope.label.$value,
          }),
        },
      }),
    });

    $scope.tags.first().label.$value = 'alpha';

    expect($scope.$meta).toEqual({
      meta: {
        $self: {
          section: 'root',
        },
        person: {
          meta: {
            $self: {
              section: 'person',
            },
            city: {
              meta: {
                label: 'City',
              },
              value: 'Berlin',
            },
          },
          value: {
            city: 'Berlin',
          },
        },
        tags: {
          meta: {
            $self: {},
            items: [
              {
                meta: {
                  $self: {},
                  label: {
                    meta: {
                      upper: 'ALPHA',
                      current: 'alpha',
                    },
                    value: 'alpha',
                  },
                },
                value: {
                  label: 'alpha',
                },
              },
            ],
          },
          value: [
            {
              label: 'alpha',
            },
          ],
        },
      },
      value: {
        person: {
          city: 'Berlin',
        },
        tags: [
          {
            label: 'alpha',
          },
        ],
      },
    });
  });

  it('supports nested proxy access as an integration flow', () => {
    const scopeDefinition = {
      titel: {
        defaultValue: 'Start',
      },
      firma: defineScope({
        name: {
          defaultValue: 'Trunk',
          onclick: (value) => {
            value.$root.titel.$value = `${value.$scope.position.$value}:${value.$value}`;
          },
        },
        position: {
          defaultValue: 'Lead',
        },
      }),
      mitarbeiter: defineArray({
        name: {
          defaultValue: 'Max',
        },
        adresse: {
          ort: {
            defaultValue: 'Berlin',
          },
        },
      }),
    };
    const $scope: TScope<typeof scopeDefinition> = createScope(scopeDefinition);

    expect(Object.keys($scope).sort()).toEqual(['firma', 'mitarbeiter', 'titel']);

    $scope.firma.name.$$.onclick?.($scope.firma.name, { type: 'click' } as Event);
    expect($scope.titel.$value).toBe('Lead:Trunk');

    const ersterMitarbeiter = $scope.mitarbeiter[0];
    ersterMitarbeiter.name.$value = 'Moritz';
    ersterMitarbeiter.adresse.ort.$value = 'Hamburg';

    expect(ersterMitarbeiter.$root).toBe($scope);
    expect(ersterMitarbeiter.name.$scope).toBe(ersterMitarbeiter);
    expect($scope.mitarbeiter.at(0)).toBe(ersterMitarbeiter);
    expect($scope.mitarbeiter.first()).toBe(ersterMitarbeiter);
    expect($scope.mitarbeiter.last()).toBe(ersterMitarbeiter);
    expect($scope.mitarbeiter[Symbol.iterator]().next().value).toBe(ersterMitarbeiter);

    expect($scope.mitarbeiter.$value).toEqual([
      {
        name: 'Moritz',
        adresse: {
          ort: 'Hamburg',
        },
      },
    ]);

    expect($scope.$value).toEqual({
      titel: 'Lead:Trunk',
      firma: {
        name: 'Trunk',
        position: 'Lead',
      },
      mitarbeiter: [
        {
          name: 'Moritz',
          adresse: {
            ort: 'Hamburg',
          },
        },
      ],
    });
  });
});
