import { describe, expect, it } from 'vitest';
import { createTest } from '../utils/createTest';

describe('Scope-Variablen: lokal vs. im Scope registriert', () => {
  it('*do: let/const bleibt lokal, nackte Zuweisung ist im Scope sichtbar', () => {
    const { e, sc, render } = createTest(
      `<div>
        <div *do="let localA = 1; $scope.A = 2">
          <span id="in">{{ localA }}-{{ A }}</span>
        </div>
        <span id="outA">{{ typeof A !== 'undefined' ? A : 'undef' }}</span>
        <span id="outLocal">{{ typeof localA !== 'undefined' ? localA : 'undef' }}</span>
      </div>`,
      {},
    );

    render();

    expect(e.querySelector('#in')!.textContent?.trim()).toBe('1-2');
    expect(e.querySelector('#outA')!.textContent?.trim()).toBe('2');
    expect(e.querySelector('#outLocal')!.textContent?.trim()).toBe('undef');

    expect((sc as any).A).toBe(2);
    expect('localA' in sc).toBe(false);
  });

  it('@click: let erzeugt lokale Variable, nackte Zuweisung schreibt in Scope', () => {
    const { e, sc, render } = createTest(
      `<div>
        <button id="btnLocal" @click="let clickedLocal = true">Local</button>
        <button id="btnScope" @click="clicks++">Scope</button>

        <span id="vLocal">{{ typeof clickedLocal !== 'undefined' ? clickedLocal : 'undef' }}</span>
        <span id="vScope">{{ typeof clicks !== 'undefined' ? clicks : 'undef' }}</span>
      </div>`,
      { clicks: 0 },
    );

    render();

    const btnLocal = e.querySelector('#btnLocal') as HTMLButtonElement;
    const btnScope = e.querySelector('#btnScope') as HTMLButtonElement;

    btnLocal.click();
    render();
    expect(e.querySelector('#vLocal')!.textContent?.trim()).toBe('undef');
    expect('clickedLocal' in sc).toBe(false);

    btnScope.click();
    render();
    expect(e.querySelector('#vScope')!.textContent?.trim()).toBe('1');
    expect((sc as any).clicks).toBe(1);
  });

  it('*for: Schleifenvariable bleibt lokal und ist außerhalb nicht verfügbar', () => {
    const { e, sc, render } = createTest(
      `<div>
        <ul><li *for="t of todos">{{ t }}</li></ul>
        <span id="outside">{{ typeof t !== 'undefined' ? t : 'undef' }}</span>
      </div>`,
      { todos: ['a', 'b'] },
    );

    render();

    const texts = Array.from(e.querySelectorAll('ul > li')).map((li) => (li.textContent ?? '').trim());
    expect(texts).toEqual(['a', 'b']);
    expect(e.querySelector('#outside')!.textContent?.trim()).toBe('undef');
    expect('t' in sc).toBe(false);
  });
});
