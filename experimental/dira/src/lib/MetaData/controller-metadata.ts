import * as ts from 'typescript';

export type JSONSchema = Record<string, any>;
export type ParamMeta = { name: string; type: string; optional: boolean; schema?: JSONSchema };
export type MethodMeta = {
  name: string;
  static: boolean;
  params: ParamMeta[];
  returnType: string;
  returnSchema?: JSONSchema;
  decorators: { name: string; text: string }[];
  types: Record<string, JSONSchema>;
};
export type ControllerMeta = {
  file: string;
  className: string;
  decorators: { name: string; text: string }[];
  methods: MethodMeta[];
};

export function getControllerMetadata(
  filePath: string,
  compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    strict: true,
    esModuleInterop: true,
  },
): ControllerMeta[] {
  const program = ts.createProgram([filePath], compilerOptions);
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(filePath);
  if (!sf) throw new Error(`File not found: ${filePath}`);

  const decoratorsOf = (node: ts.Node): readonly ts.Decorator[] => {
    const decs = (ts.canHaveDecorators?.(node) && ts.getDecorators?.(node)) || (node as any).decorators;
    return (decs ?? []) as readonly ts.Decorator[];
  };

  const hasStatic = (node: ts.Node): boolean => {
    const flags = ts.getCombinedModifierFlags(node as ts.Declaration);
    return (flags & ts.ModifierFlags.Static) !== 0;
  };

  const decName = (d: ts.Decorator): string => {
    const ex = d.expression;
    if (ts.isCallExpression(ex)) {
      return ts.isIdentifier(ex.expression) ? ex.expression.text : ex.expression.getText(sf);
    }
    return ts.isIdentifier(ex) ? ex.text : ex.getText(sf);
  };

  const methodDecorators = (m: ts.ClassElement) =>
    decoratorsOf(m).map((d) => ({ name: decName(d), text: d.getText(sf) }));

  const classDecorators = (cls: ts.ClassDeclaration) =>
    decoratorsOf(cls).map((d) => ({ name: decName(d), text: d.getText(sf) }));

  const isController = (cls: ts.ClassDeclaration): boolean =>
    decoratorsOf(cls).some((d) => decName(d) === 'Controller');

  const typeToSchema = (type: ts.Type): JSONSchema => {
    // literals
    if (type.isStringLiteral()) return { type: 'string', const: type.value };
    if (type.isNumberLiteral()) return { type: 'number', const: type.value };

    // primitives
    if (type.flags & ts.TypeFlags.String) return { type: 'string' };
    if (type.flags & ts.TypeFlags.Number) return { type: 'number' };
    if (type.flags & ts.TypeFlags.Boolean) return { type: 'boolean' };
    if (type.flags & ts.TypeFlags.BigInt) return { type: 'integer' };
    if (type.flags & ts.TypeFlags.Null) return { type: 'null' };
    if (type.flags & ts.TypeFlags.Undefined) return { type: 'null' }; // JSON Schema kennt kein undefined

    // union / intersection
    if (type.isUnion()) return { anyOf: type.types.map((t) => typeToSchema(t)) };
    // Intersection detection (best-effort; TS API lacks a stable flag)
    const anyType = type as any;
    if (
      anyType.isIntersection?.() ||
      (anyType.types &&
        anyType.flags & ts.TypeFlags.Object &&
        anyType.types?.length &&
        anyType.symbol?.escapedName === '__type')
    ) {
      const parts: ts.Type[] = anyType.types ?? [];
      if (parts.length) return { allOf: parts.map((t: ts.Type) => typeToSchema(t)) };
    }

    // tuples
    const isTuple = (() => {
      if ((type.flags & ts.TypeFlags.Object) === 0) return false;
      const obj = type as ts.ObjectType as any;
      return (obj.objectFlags & ts.ObjectFlags.Tuple) !== 0;
    })();
    if (isTuple) {
      const elemTypes: readonly ts.Type[] = (checker as any).getTypeArguments?.(type as ts.TypeReference) || [];
      return {
        type: 'array',
        items: elemTypes.map((t) => typeToSchema(t)),
        minItems: elemTypes.length,
        maxItems: elemTypes.length,
      };
    }

    // arrays (Array<T> | ReadonlyArray<T> | T[])
    const idxElem = checker.getIndexTypeOfType(type, ts.IndexKind.Number);
    const typeArgsForRef: readonly ts.Type[] = (checker as any).getTypeArguments?.(type as ts.TypeReference) || [];
    const typeArgElem = typeArgsForRef[0];
    const isArray =
      !!idxElem || !!typeArgElem || (checker as any).isArrayType?.(type) || (checker as any).isArrayLikeType?.(type);

    if (isArray) {
      const elem = idxElem ?? typeArgElem;
      return { type: 'array', items: elem ? typeToSchema(elem) : {} };
    }

    // functions
    if (type.getCallSignatures().length) return { type: 'string', description: 'function' };

    // objects (plain/records) – after array/tuple to avoid listing Array props
    if (type.getProperties().length) {
      const props: Record<string, any> = {};
      for (const prop of type.getProperties()) {
        if (!prop.valueDeclaration) continue;
        const propType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration);
        props[prop.name] = typeToSchema(propType);
      }
      return { type: 'object', properties: props };
    }

    // any/unknown/never & fallback → nicht "any" erzwingen
    if (type.flags & ts.TypeFlags.Any) return {};
    if (type.flags & ts.TypeFlags.Unknown) return {};
    if (type.flags & ts.TypeFlags.Never) return {};

    return {}; // konservativer Fallback
  };

  const out: ControllerMeta[] = [];

  ts.forEachChild(sf, (node) => {
    if (!ts.isClassDeclaration(node) || !node.name) return;
    if (!isController(node)) return;

    const methods: MethodMeta[] = [];

    for (const member of node.members) {
      if (!ts.isMethodDeclaration(member) || !member.name) continue;

      const name = member.name.getText(sf);
      const sig = checker.getSignatureFromDeclaration(member);
      if (!sig) continue;

      const params: ParamMeta[] = member.parameters.map((p) => {
        const t = checker.getTypeAtLocation(p.type ?? p);
        return {
          name: p.name.getText(sf),
          type: checker.typeToString(t),
          optional: !!p.questionToken || !!p.initializer,
          schema: typeToSchema(t),
        };
      });

      const retType = checker.getReturnTypeOfSignature(sig);
      const returnType = checker.typeToString(retType);
      const returnSchema = typeToSchema(retType);

      const types: Record<string, JSONSchema> = {};
      params.forEach((p) => {
        types[p.type] = p.schema || {};
      });
      types[returnType] = returnSchema;

      methods.push({
        name,
        static: hasStatic(member),
        params,
        returnType,
        returnSchema,
        decorators: methodDecorators(member),
        types,
      });
    }

    out.push({
      file: sf.fileName,
      className: node.name.text,
      decorators: classDecorators(node),
      methods,
    });
  });

  return out;
}
