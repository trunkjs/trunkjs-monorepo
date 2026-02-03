function Typed<P, R>() {
  return function <T extends (arg: P, ...rest: any[]) => R>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    // runtime logic here
  };
}

class wurst {
  // Example should work: Is this possible?
  @Typed<SomeInputClass, SomeOutput>()
  public exampleFunction(arg) {}
}
