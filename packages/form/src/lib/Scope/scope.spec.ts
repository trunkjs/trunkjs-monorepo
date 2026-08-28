import { describe, expect, it } from 'vitest';

import { createFormScope, defineArray } from './scope';

describe('createFormScope', () => {
  it('keeps the legacy ScopeValue helpers on form scopes', () => {
    const $scope = createFormScope({
      name: {
        defaultValue: 'Anna',
      },
      profile: {
        email: {
          defaultValue: 'anna@example.com',
        },
      },
      jobs: defineArray({
        title: {
          defaultValue: 'Dev',
        },
      }),
    });

    expect($scope.name.value).toBe('Anna');

    $scope.name.setValue('Berta');
    expect($scope.name.$value).toBe('Berta');

    const changes: Array<string> = [];
    $scope.name.onchange = (value) => {
      changes.push(String(value.value));
    };

    expect($scope.name.getEventListener('change')).toBe($scope.name.onchange);

    const arrayContainer = $scope.name.array('jobs');
    arrayContainer.set('title', 'Lead');
    expect(arrayContainer.get('title').value).toBe('Lead');

    expect($scope.profile.email.value).toBe('anna@example.com');
    expect($scope.jobs.first().title.value).toBe('Dev');
  });
});
