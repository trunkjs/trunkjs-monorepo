/** Module docs */

function decorator1<This, Fn extends (this: This, param: SomeType) => void>(
  value: Fn,
  context: ClassMethodDecoratorContext<This, Fn>,
) {
  if (context.kind !== 'method') {
    throw new Error('decorator1 can only be applied to methods');
  }

  return function (this: This, param: SomeType): void {
    console.log('Decorator1 - before method');
    value.apply(this, [param]);
    console.log('Decorator1 - after method');
  };
}

@decorator1('abc', { name: 'wurst' })
export class Controller {
  @decorator1('def', { name: 'methode' })
  public someMethod(param: SomeType): void {
    console.log('Value is', param.value);
  }
}
