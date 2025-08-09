export * from './lib/DiraApp';
export * from './lib/Request/Request';
export * from './lib/Router/route-decorators';

export let DECORATOR_MODE: 'native' | 'legacy' | 'unknown' = 'unknown';

(function detectDecoratorMode() {
  let argc = -1;
  function Probe(...args: any[]) {
    argc = args.length;
  }

  // Triggert den Compiler-Emit für Methodendekoratoren:
  class __Probe {
    @Probe
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    m() {}
  }

  DECORATOR_MODE = argc === 2 ? 'native' : argc === 3 ? 'legacy' : 'unknown';
  if (DECORATOR_MODE !== 'native') {
    throw new Error(
      "Legacy decorators detected. For dira to work 'experimentalDecorators' has to be disabled (use native TC39).",
    );
  }
})();
