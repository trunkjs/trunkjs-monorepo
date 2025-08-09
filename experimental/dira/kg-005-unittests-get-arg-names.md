---
slugName: unittests-get-arg-names
includeFiles:
    - ./src/lib/Container/get-arg-names.ts
    - ./vite.config.ts
    - ./.kindergarden.md
editFiles:
    - ./src/lib/Container/get-arg-names.spec.ts
original_prompt: schreibe unitttests für get-arg-names
---

# Prepare Unittests für get-arg-names

Schreibe kompakte, aber aussagekräftige Unit-Tests für get-arg-names, die die wichtigsten Signaturen und Randfälle abdecken: klassische Funktionen, Arrow-Functions, Klassenkonstruktoren, Defaults, Destructuring, Rest-Parameter, Kommentare, Strings mit Kommas/Klammern.

## Annahmen

- Tests laufen mit Vitest (siehe vorhandene vite.config.ts).
- Optional-Markierungen (?) und TypeScript-Typannotationen werden zur Laufzeit im transpilierten JS entfernt, daher kann get-arg-names optionale Parameter nicht sicher erkennen. In den Erwartungen gelten Parameter ohne Default grundsätzlich als nicht optional (isOptional: false), auch wenn sie in TS mit ? deklariert sind.
- Kommentare in Parametern dürfen keine notwendigen Satzzeichen (wie Kommas) verdecken, da die Implementierung Kommentare vor dem Parsen entfernt. Deshalb werden Kommentare so gesetzt, dass sie keine Trennzeichen zerstören.

## Aufgaben

- Tests hinzufügen Schreibe Vitest-Tests, die Kernfälle und Randfälle in wenigen, starken Testfällen abdecken.

## Überblick: Dateiänderungen

- ./src/lib/Container/get-arg-names.spec.ts Neue Vitest-Testdatei mit 4 kompakten Tests, die viele Randbereiche abdecken.

## Detailänderungen

### ./src/lib/Container/get-arg-names.spec.ts

Referenzierte Aufgaben

- Tests hinzufügen Schreibe Vitest-Tests, die Kernfälle und Randfälle in wenigen, starken Testfällen abdecken.

Neuen Inhalt einfügen (komplette Datei):

```ts
import { describe, it, expect } from 'vitest';
import { getArgNames } from './get-arg-names';

describe('getArgNames', () => {
    it('parst klassische Funktionen mit Defaults, Destructuring, Rest und Strings mit Kommas', () => {
        // Enthält: required, default, destructured (überspringen), string default mit Komma, Rest
        const fn = function foo(a, b = 1, { x }, c = 'hi, there', ...rest) {};
        const meta = getArgNames(fn);

        expect(Object.keys(meta)).toEqual(['a', 'b', 'c', 'rest']);

        expect(meta.a).toEqual({ isOptional: false, hasDefault: false });
        expect(meta.b).toEqual({ isOptional: true, hasDefault: true });
        expect(meta.c).toEqual({ isOptional: true, hasDefault: true });
        expect(meta.rest).toEqual({ isOptional: false, hasDefault: false });
    });

    it('parst Arrow-Functions (einzelner Parameter und mit Klammern), ignoriert Destructuring und übersteht Kommentare/Whitespace', () => {
        const single = (x) => x;
        const m1 = getArgNames(single);
        expect(Object.keys(m1)).toEqual(['x']);
        expect(m1.x).toEqual({ isOptional: false, hasDefault: false });

        const complex = (
            a,
            /* Kommentar nach a */ b = { x: [1, 2, { k: 'v' }] },
            [z],
            // Zeilenkommentar zwischen den Parametern
            d,
        ) => null;

        const m2 = getArgNames(complex);
        expect(Object.keys(m2)).toEqual(['a', 'b', 'd']);
        expect(m2.a).toEqual({ isOptional: false, hasDefault: false });
        expect(m2.b).toEqual({ isOptional: true, hasDefault: true });
        expect(m2.d).toEqual({ isOptional: false, hasDefault: false });
    });

    it('extrahiert Konstruktor-Parameter aus Klassen und ignoriert destrukturierte mit Default', () => {
        class K {
            constructor(a, b = 2, { d } = {}, e) {}
        }
        const meta = getArgNames(K as unknown as Function);
        expect(Object.keys(meta)).toEqual(['a', 'b', 'e']);
        expect(meta.a).toEqual({ isOptional: false, hasDefault: false });
        expect(meta.b).toEqual({ isOptional: true, hasDefault: true });
        expect(meta.e).toEqual({ isOptional: false, hasDefault: false });
    });

    it('handhabt verschachtelte Klammern/Strings und Defaults mit Arrow-Funktionen; leere Parameter', () => {
        function f(a = '[] , () , {}', b = () => ({ x: [1, 2], y: 'a,b' }), c) {}
        const m = getArgNames(f);
        expect(Object.keys(m)).toEqual(['a', 'b', 'c']);
        expect(m.a).toEqual({ isOptional: true, hasDefault: true });
        expect(m.b).toEqual({ isOptional: true, hasDefault: true });
        expect(m.c).toEqual({ isOptional: false, hasDefault: false });

        // Leere Parameterlisten
        expect(getArgNames(function () {})).toEqual({});
        expect(getArgNames(() => {})).toEqual({});
    });
});
```

## Beispiel-Verbesserungen für die ursprüngliche Anfrage

- „Schreibe Vitest-Unit-Tests für src/lib/Container/get-arg-names.ts. Bitte decke klassische Funktionen, Arrow-Functions, Klassenkonstruktoren, Defaults, Destructuring, Rest-Parameter, Kommentare und Strings mit Kommas ab.“
- „Berücksichtige, dass optionale TS-Parameter (?) zur Laufzeit nicht erkennbar sind. Erwarte isOptional nur bei Defaults als true.“
