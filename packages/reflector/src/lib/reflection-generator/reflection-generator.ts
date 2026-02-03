import * as path from 'path';
import * as ts from 'typescript';

export type ReflectKind =
  | 'class'
  | 'interface'
  | 'enum'
  | 'function'
  | 'typeAlias'
  | 'variable'
  | 'namespace'
  | 'unknown';

export interface DocTag {
  name: string; // e.g. "param", "returns", "deprecated"
  text?: string; // rendered tag text (if any)
}

export interface DocBlock {
  /** Best-effort full JSDoc comment text (joined, trimmed). */
  comment?: string;
  /** Parsed tags like @param, @returns, etc. */
  tags: DocTag[];
  /** Raw JSDoc string slice if we can get it. */
  raw?: string;
}

export interface ReflectedLocation {
  fileName: string;
  startLine: number;
  startCol: number;
}

export interface ReflectedDecorator {
  /** Decorator name, best-effort (e.g. "sealed", "Component", "foo.bar") */
  name: string;
  /** Full decorator text as written in source (e.g. "@Component({ ... })") */
  text?: string;
  /** Best-effort argument texts (without surrounding parentheses). */
  arguments?: string[];
}

export interface ReflectedParameter {
  name: string;
  typeText?: string;
  /** Referenzen (IDs) auf benutzte Typ-Definitionen, sofern auflösbar. */
  typeRefIds?: string[];
  isOptional?: boolean;
  isRest?: boolean;
  hasDefault?: boolean;
}

export interface ReflectedMember {
  name: string;
  kind: 'property' | 'method' | 'constructor' | 'callSignature' | 'indexSignature' | 'unknown';
  typeText?: string;
  /** Referenzen (IDs) auf benutzte Typ-Definitionen, sofern auflösbar. */
  typeRefIds?: string[];

  /** For methods/constructors/call signatures. */
  params?: ReflectedParameter[];
  /** For methods/functions. */
  returnTypeText?: string;
  /** Referenzen (IDs) auf den Return-Type, sofern auflösbar. */
  returnTypeRefIds?: string[];

  /** For getters/setters merged into a single property member. */
  hasGetter?: boolean;
  hasSetter?: boolean;

  decorators?: ReflectedDecorator[];

  isOptional?: boolean;
  isReadonly?: boolean;
  isStatic?: boolean;
  doc?: DocBlock;
}

export interface ReflectedDefinition {
  id: string; // stable-ish key: <file>::<qualifiedName>::<pos>
  kind: ReflectKind;
  name: string; // simple name
  qualifiedName?: string; // symbol qualified name (when possible)
  location: ReflectedLocation;

  exported: boolean;
  defaultExport: boolean;

  typeText?: string; // e.g. for type alias, variable, function signature-ish
  /** Referenzen (IDs) auf benutzte Typ-Definitionen, sofern auflösbar. */
  typeRefIds?: string[];
  heritage?: string[]; // extends / implements (best-effort)
  members?: ReflectedMember[]; // class/interface members (best-effort)

  decorators?: ReflectedDecorator[];

  doc?: DocBlock;
  jsDocNodesCount?: number; // debug: how many JSDoc nodes were attached
}

export type AddInput = string | { fileName: string; sourceText: string };

/**
 * includeMatcher wird vor dem finalen Export pro ReflectedDefinition aufgerufen.
 * Wenn false zurückgegeben wird, wird die Definition nicht in results/store übernommen.
 */
export type IncludeMatcher = (ctx: {
  definition: Omit<ReflectedDefinition, 'id'> & { id?: string };
  node: ts.Node;
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
  /** Best-effort export info (export/default keywords only). */
  exported: boolean;
  defaultExport: boolean;
}) => boolean;

/**
 * ReflectionGenerator liest TypeScript AST (vom TS-Compiler) und extrahiert Metadaten:
 * Definitionen, Typen, Exports und JSDoc Docblocks/Tags.
 */
export class ReflectionGenerator {
  private compilerOptions: ts.CompilerOptions;
  private host: ts.CompilerHost;

  /** Root-Dateien, die in das TS-Programm aufgenommen werden sollen (Disk oder In-Memory). */
  private rootFiles = new Set<string>();

  /** In-memory injection: fileName -> sourceText */
  private inMemoryFiles = new Map<string, string>();

  private program: ts.Program | null = null;
  private checker: ts.TypeChecker | null = null;

  /** Stored reflected definitions by id. */
  private store = new Map<string, ReflectedDefinition>();

  private includeMatcher?: IncludeMatcher;

  constructor(opts?: {
    compilerOptions?: ts.CompilerOptions;
    /** If true, we’ll try to resolve libs + node_modules like tsc does. */
    useSysHost?: boolean;
    /** Optional callback to decide whether a definition should be exported/stored. */
    includeMatcher?: IncludeMatcher;
  }) {
    this.compilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      ...opts?.compilerOptions,
    };

    this.includeMatcher = opts?.includeMatcher;

    const baseHost =
      (opts?.useSysHost ?? true)
        ? ts.createCompilerHost(this.compilerOptions, true)
        : ts.createCompilerHost(this.compilerOptions, false);

    // Wrap host so we can inject in-memory sources when provided.
    this.host = {
      ...baseHost,
      fileExists: (fileName) => {
        const norm = this.normalize(fileName);
        return this.inMemoryFiles.has(norm) || baseHost.fileExists(norm);
      },
      readFile: (fileName) => {
        const norm = this.normalize(fileName);
        if (this.inMemoryFiles.has(norm)) return this.inMemoryFiles.get(norm);
        return baseHost.readFile(norm);
      },
      getSourceFile: (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
        const norm = this.normalize(fileName);
        const injected = this.inMemoryFiles.get(norm);
        if (injected !== undefined) {
          return ts.createSourceFile(norm, injected, languageVersion, true, ts.ScriptKind.TS);
        }
        return baseHost.getSourceFile(norm, languageVersion, onError, shouldCreateNewSourceFile);
      },
    };
  }

  /**
   * ts-morph-ähnlich: Fügt Source-Files über Pfade hinzu (glob patterns werden nicht aufgelöst,
   * sondern als direkte Dateipfade erwartet).
   *
   * "ts-morph style" bedeutet hier: du gibst Pfade an, und der Generator nimmt sie als RootNames.
   */
  addSourceFilesAtPaths(paths: string | string[]): ReflectedDefinition[] {
    const items = Array.isArray(paths) ? paths : [paths];
    const added: string[] = [];
    for (const p of items) {
      const fileName = this.normalize(p);
      if (!this.rootFiles.has(fileName)) {
        this.rootFiles.add(fileName);
        added.push(fileName);
      }
    }

    if (!added.length) return [];

    this.rebuildProgram();

    const results: ReflectedDefinition[] = [];
    for (const fileName of added) {
      const sf = this.program?.getSourceFile(fileName);
      if (!sf) continue;
      const defs = this.reflectSourceFile(sf);
      results.push(...defs);
    }
    return results;
  }

  /**
   * Fügt ein tsconfig hinzu (ähnlich zu ts-morphs addSourceFilesFromTsConfig).
   * Liest fileNames über die TS Config Parser APIs.
   */
  addSourceFilesFromTsConfig(tsConfigPath: string): ReflectedDefinition[] {
    const configFileName = this.normalize(tsConfigPath);

    const readResult = ts.readConfigFile(configFileName, (p) => this.host.readFile(this.normalize(p)) ?? '');
    if (readResult.error) {
      const msg = ts.flattenDiagnosticMessageText(readResult.error.messageText, '\n');
      throw new Error(`Failed to read tsconfig: ${configFileName}\n${msg}`);
    }

    const parsed = ts.parseJsonConfigFileContent(
      readResult.config,
      ts.sys,
      path.dirname(configFileName),
      this.compilerOptions,
      configFileName,
    );

    const added: string[] = [];
    for (const f of parsed.fileNames) {
      const norm = this.normalize(f);
      if (!this.rootFiles.has(norm)) {
        this.rootFiles.add(norm);
        added.push(norm);
      }
    }

    if (!added.length) return [];

    this.rebuildProgram();

    const results: ReflectedDefinition[] = [];
    // reflect only newly added sourcefiles to keep return value predictable
    for (const fileName of added) {
      const sf = this.program?.getSourceFile(fileName);
      if (!sf) continue;
      results.push(...this.reflectSourceFile(sf));
    }

    return results;
  }

  /**
   * Optional/Komfort: erlaubt weiterhin In-Memory-Sources (z.B. für Demos/Playgrounds).
   */
  addSourceFileFromText(fileName: string, sourceText: string): ReflectedDefinition[] {
    const norm = this.normalize(fileName);
    this.inMemoryFiles.set(norm, sourceText);
    if (!this.rootFiles.has(norm)) this.rootFiles.add(norm);

    this.rebuildProgram();

    const sf = this.program?.getSourceFile(norm);
    if (!sf) return [];
    return this.reflectSourceFile(sf);
  }

  /** Get everything we’ve stored so far. */
  getAll(): ReflectedDefinition[] {
    return Array.from(this.store.values());
  }

  /** Find by simple name (not guaranteed unique). */
  findByName(name: string): ReflectedDefinition[] {
    return this.getAll().filter((d) => d.name === name);
  }

  /** Find by id returned from add(). */
  getById(id: string): ReflectedDefinition | undefined {
    return this.store.get(id);
  }

  // ------------------------ internals ------------------------

  private rebuildProgram(): void {
    const rootNames = Array.from(this.rootFiles.values());
    this.program = ts.createProgram(rootNames, this.compilerOptions, this.host);
    this.checker = this.program.getTypeChecker();
  }

  private reflectSourceFile(sf: ts.SourceFile): ReflectedDefinition[] {
    if (!this.program || !this.checker) return [];
    const checker = this.checker;

    const defs: ReflectedDefinition[] = [];

    const visit = (node: ts.Node) => {
      const reflected = this.reflectTopLevelNode(node, sf, checker);
      if (reflected && this.shouldInclude(reflected, node, sf, checker)) {
        this.store.set(reflected.id, reflected);
        defs.push(reflected);
      }
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sf, visit);
    return defs;
  }

  private shouldInclude(def: ReflectedDefinition, node: ts.Node, sf: ts.SourceFile, checker: ts.TypeChecker): boolean {
    if (!this.includeMatcher) return true;
    return this.includeMatcher({
      definition: def,
      node,
      sourceFile: sf,
      checker,
      exported: def.exported,
      defaultExport: def.defaultExport,
    });
  }

  private reflectTopLevelNode(node: ts.Node, sf: ts.SourceFile, checker: ts.TypeChecker): ReflectedDefinition | null {
    // Only reflect declarations that can be named and are "definition-like".
    if (
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isVariableStatement(node) ||
      ts.isModuleDeclaration(node)
    ) {
      // For variable statements, reflect each declared variable
      if (ts.isVariableStatement(node)) {
        // handled by caller via recursion; but we return null here and let reflectVar handle in visitor
        // We'll instead reflect variables by iterating declarations right here and returning the first
        // is awkward—so we skip here and reflect in a specialized branch:
        return null;
      }

      const name = this.getNodeName(node) ?? '(anonymous)';
      const symbol = this.getSymbol(node, checker);

      const location = this.getLocation(node, sf);

      const kind: ReflectKind = ts.isClassDeclaration(node)
        ? 'class'
        : ts.isInterfaceDeclaration(node)
          ? 'interface'
          : ts.isEnumDeclaration(node)
            ? 'enum'
            : ts.isFunctionDeclaration(node)
              ? 'function'
              : ts.isTypeAliasDeclaration(node)
                ? 'typeAlias'
                : ts.isModuleDeclaration(node)
                  ? 'namespace'
                  : 'unknown';

      const { exported, defaultExport } = this.getExportInfo(node);

      const doc = this.getDocBlock(symbol, node, checker, sf);
      const jsDocNodesCount = this.countJsDocNodes(node);

      const qualifiedName = symbol ? checker.getFullyQualifiedName(symbol) : undefined;

      const id = this.makeId(sf.fileName, qualifiedName ?? name, node.pos);

      const base: ReflectedDefinition = {
        id,
        kind,
        name,
        qualifiedName,
        location,
        exported,
        defaultExport,
        doc,
        jsDocNodesCount,
        decorators: this.getDecorators(node, sf),
      };

      // Add kind-specific details
      if (ts.isTypeAliasDeclaration(node)) {
        base.typeText = node.type.getText(sf);
        base.typeRefIds = this.collectTypeRefIdsFromTypeNode(node.type, checker);
        // Bonus: type-alias auf Objekt/Intersection best-effort Members (bereits durch getMembers für class/interface)
        // bleibt unverändert.
      } else if (ts.isEnumDeclaration(node)) {
        // enums: list members as properties
        base.members = node.members.map((m) => ({
          name: m.name.getText(sf),
          kind: 'property',
          typeText: 'number | string', // TS enums are a bit special; this is a friendly hint
          doc: this.getDocBlock(this.getSymbol(m, checker), m, checker, sf),
        }));
      } else if (ts.isFunctionDeclaration(node)) {
        // Use signature if possible
        const sig = symbol ? this.getFirstSignatureText(symbol, checker) : undefined;
        base.typeText = sig ?? this.safeTypeTextForNode(node, checker, sf);

        const signature = checker.getSignatureFromDeclaration(node);
        if (signature) {
          base.members = [
            {
              name: '(call)',
              kind: 'callSignature',
              typeText: checker.signatureToString(signature),
              typeRefIds: this.collectTypeRefIdsFromSignature(signature, checker),
              params: this.getParametersFromDeclaration(node, checker, sf),
              returnTypeText: this.getReturnTypeTextFromSignature(signature, checker),
              returnTypeRefIds: this.collectTypeRefIdsFromType(checker.getReturnTypeOfSignature(signature), checker),
              decorators: this.getDecorators(node, sf),
              doc,
            },
          ];
        }
      } else if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        base.heritage = this.getHeritage(node, sf);
        base.members = this.getMembers(node, checker, sf);
      } else if (ts.isModuleDeclaration(node)) {
        // namespace/module: best-effort type text
        base.typeText = 'namespace';
      }

      return base;
    }

    // Special handling: VariableStatement can contain multiple declarations
    if (ts.isVariableStatement(node)) {
      const { exported, defaultExport } = this.getExportInfo(node);

      const results: ReflectedDefinition[] = [];

      for (const decl of node.declarationList.declarations) {
        const name = decl.name.getText(sf);
        const symbol = this.getSymbol(decl, checker) ?? this.getSymbol(node, checker);

        const qualifiedName = symbol ? checker.getFullyQualifiedName(symbol) : name;
        const id = this.makeId(sf.fileName, qualifiedName, decl.pos);

        const t = this.tryGetTypeAtLocation(decl, checker);

        const def: ReflectedDefinition = {
          id,
          kind: 'variable',
          name,
          qualifiedName,
          location: this.getLocation(decl, sf),
          exported,
          defaultExport,
          typeText: this.safeTypeTextForNode(decl, checker, sf),
          typeRefIds: t ? this.collectTypeRefIdsFromType(t, checker) : undefined,
          doc: this.getDocBlock(symbol, decl, checker, sf),
          jsDocNodesCount: this.countJsDocNodes(decl),
        };

        // store/return is now handled by reflectSourceFile() (includeMatcher etc.).
        results.push(def);
      }

      // We can't return multiple values from reflectTopLevelNode; we register them directly here.
      // But we still respect includeMatcher.
      for (const d of results) {
        if (this.shouldInclude(d, node, sf, checker)) {
          this.store.set(d.id, d);
        }
      }

      return null;
    }

    return null;
  }

  private getMembers(
    node: ts.ClassDeclaration | ts.InterfaceDeclaration,
    checker: ts.TypeChecker,
    sf: ts.SourceFile,
  ): ReflectedMember[] {
    const members: ReflectedMember[] = [];

    // Merge get/set accessors into a single property entry.
    const accessors = new Map<string, { get?: ts.GetAccessorDeclaration; set?: ts.SetAccessorDeclaration }>();

    for (const m of node.members) {
      if (ts.isGetAccessorDeclaration(m) || ts.isSetAccessorDeclaration(m)) {
        const name = m.name?.getText(sf) ?? '(property)';
        const prev = accessors.get(name) ?? {};
        if (ts.isGetAccessorDeclaration(m)) prev.get = m;
        else prev.set = m;
        accessors.set(name, prev);
        continue;
      }

      if (ts.isConstructorDeclaration(m)) {
        const sig = checker.getSignatureFromDeclaration(m);
        members.push({
          name: 'constructor',
          kind: 'constructor',
          typeText: this.safeTypeTextForNode(m, checker, sf),
          typeRefIds: sig ? this.collectTypeRefIdsFromSignature(sig, checker) : undefined,
          params: this.getParametersFromDeclaration(m, checker, sf),
          returnTypeText: sig ? this.getReturnTypeTextFromSignature(sig, checker) : undefined,
          returnTypeRefIds: sig
            ? this.collectTypeRefIdsFromType(checker.getReturnTypeOfSignature(sig), checker)
            : undefined,
          decorators: this.getDecorators(m, sf),
          doc: this.getDocBlock(this.getSymbol(m, checker), m, checker, sf),
        });
        continue;
      }

      if (ts.isPropertyDeclaration(m) || ts.isPropertySignature(m)) {
        const name = m.name?.getText(sf) ?? '(property)';
        const tn = (m as ts.PropertyDeclaration | ts.PropertySignature).type;
        const typeRefIds = tn
          ? this.collectTypeRefIdsFromTypeNode(tn, checker)
          : this.collectTypeRefIdsFromType(this.tryGetTypeAtLocation(m, checker), checker);

        members.push({
          name,
          kind: 'property',
          typeText: this.safeTypeTextForNode(m, checker, sf),
          typeRefIds,
          isOptional: !!(m as ts.PropertySignature).questionToken,
          isReadonly: !!m.modifiers?.some((x) => x.kind === ts.SyntaxKind.ReadonlyKeyword),
          isStatic: !!m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword),
          decorators: this.getDecorators(m, sf),
          doc: this.getDocBlock(this.getSymbol(m, checker), m, checker, sf),
        });
        continue;
      }

      if (ts.isMethodDeclaration(m) || ts.isMethodSignature(m)) {
        const name = m.name?.getText(sf) ?? '(method)';
        const sig = checker.getSignatureFromDeclaration(m);
        const retType = sig ? checker.getReturnTypeOfSignature(sig) : undefined;

        members.push({
          name,
          kind: 'method',
          typeText: this.safeTypeTextForNode(m, checker, sf),
          typeRefIds: sig ? this.collectTypeRefIdsFromSignature(sig, checker) : undefined,
          params: this.getParametersFromDeclaration(m, checker, sf),
          returnTypeText: sig ? this.getReturnTypeTextFromSignature(sig, checker) : undefined,
          returnTypeRefIds: retType ? this.collectTypeRefIdsFromType(retType, checker) : undefined,
          isOptional: !!(m as ts.MethodSignature).questionToken,
          isStatic: !!m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword),
          decorators: this.getDecorators(m, sf),
          doc: this.getDocBlock(this.getSymbol(m, checker), m, checker, sf),
        });
        continue;
      }

      if (ts.isCallSignatureDeclaration(m)) {
        const sig = checker.getSignatureFromDeclaration(m);
        const retType = sig ? checker.getReturnTypeOfSignature(sig) : undefined;

        members.push({
          name: '(call)',
          kind: 'callSignature',
          typeText: this.safeTypeTextForNode(m, checker, sf),
          typeRefIds: sig ? this.collectTypeRefIdsFromSignature(sig, checker) : undefined,
          params: this.getParametersFromDeclaration(m, checker, sf),
          returnTypeText: sig ? this.getReturnTypeTextFromSignature(sig, checker) : undefined,
          returnTypeRefIds: retType ? this.collectTypeRefIdsFromType(retType, checker) : undefined,
          decorators: this.getDecorators(m, sf),
          doc: this.getDocBlock(this.getSymbol(m, checker), m, checker, sf),
        });
        continue;
      }

      if (ts.isIndexSignatureDeclaration(m)) {
        const tn = m.type;
        const typeRefIds = tn
          ? this.collectTypeRefIdsFromTypeNode(tn, checker)
          : this.collectTypeRefIdsFromType(this.tryGetTypeAtLocation(m, checker), checker);

        members.push({
          name: '(index)',
          kind: 'indexSignature',
          typeText: this.safeTypeTextForNode(m, checker, sf),
          typeRefIds,
          decorators: this.getDecorators(m, sf),
          doc: this.getDocBlock(this.getSymbol(m, checker), m, checker, sf),
        });
        continue;
      }
    }

    // Flush merged accessors.
    for (const [name, a] of accessors.entries()) {
      const decl = a.get ?? a.set;
      if (!decl) continue;

      // Best-effort type: getter return type > explicit type annotation > checker fallback.
      let typeText: string | undefined;
      let typeRefIds: string[] | undefined;
      if (a.get) {
        const sig = checker.getSignatureFromDeclaration(a.get);
        if (sig) {
          typeText = this.getReturnTypeTextFromSignature(sig, checker);
          const rt = checker.getReturnTypeOfSignature(sig);
          typeRefIds = this.collectTypeRefIdsFromType(rt, checker);
        }
      }
      if (!typeText && a.set?.parameters?.[0]) {
        typeText = this.safeTypeTextForNode(a.set.parameters[0], checker, sf);
        const tn = a.set.parameters[0].type;
        typeRefIds = tn
          ? this.collectTypeRefIdsFromTypeNode(tn, checker)
          : this.collectTypeRefIdsFromType(this.tryGetTypeAtLocation(a.set.parameters[0], checker), checker);
      }
      if (!typeText) {
        typeText = this.safeTypeTextForNode(decl, checker, sf);
        typeRefIds = this.collectTypeRefIdsFromType(this.tryGetTypeAtLocation(decl, checker), checker);
      }

      const readonly = !!a.get && !a.set;
      members.push({
        name,
        kind: 'property',
        typeText,
        typeRefIds,
        hasGetter: !!a.get,
        hasSetter: !!a.set,
        isReadonly: readonly,
        isStatic: !!decl.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword),
        decorators: this.getDecorators(decl, sf),
        doc: this.getDocBlock(this.getSymbol(decl, checker), decl, checker, sf),
      });
    }

    return members;
  }

  private getReturnTypeTextFromSignature(signature: ts.Signature, checker: ts.TypeChecker): string | undefined {
    try {
      const t = checker.getReturnTypeOfSignature(signature);
      return checker.typeToString(t);
    } catch {
      return undefined;
    }
  }

  private getParametersFromDeclaration(
    decl:
      | ts.SignatureDeclarationBase
      | ts.FunctionDeclaration
      | ts.MethodDeclaration
      | ts.MethodSignature
      | ts.ConstructorDeclaration
      | ts.CallSignatureDeclaration,
    checker: ts.TypeChecker,
    sf: ts.SourceFile,
  ): ReflectedParameter[] {
    const params: ReflectedParameter[] = [];
    const ps = decl.parameters;
    if (!ps?.length) return params;

    for (const p of ps) {
      const name = p.name.getText(sf);
      const isRest = !!p.dotDotDotToken;
      // questionToken exists on ParameterDeclaration; for some signatures optional also means initializer
      const isOptional = !!p.questionToken || !!p.initializer;
      const hasDefault = !!p.initializer;

      let typeText: string | undefined;
      let typeRefIds: string[] | undefined;

      if (p.type) {
        typeText = p.type.getText(sf);
        typeRefIds = this.collectTypeRefIdsFromTypeNode(p.type, checker);
      } else {
        typeText = this.safeTypeTextForNode(p, checker, sf);
        typeRefIds = this.collectTypeRefIdsFromType(this.tryGetTypeAtLocation(p, checker), checker);
      }

      params.push({ name, typeText, typeRefIds, isOptional, isRest, hasDefault });
    }

    return params;
  }

  // ------- helpers (doc/symbol/type/export/id/path) -------

  private getHeritage(node: ts.ClassDeclaration | ts.InterfaceDeclaration, sf: ts.SourceFile): string[] {
    const out: string[] = [];
    if (!node.heritageClauses) return out;

    for (const hc of node.heritageClauses) {
      for (const t of hc.types) {
        out.push(t.getText(sf));
      }
    }
    return out;
  }

  private getNodeName(node: ts.Node): string | undefined {
    if ('name' in node) {
      const n = (node as unknown as { name?: ts.Node }).name;
      if (n && ts.isIdentifier(n)) return n.text;
      if (n) return n.getText();
    }
    return undefined;
  }

  private getSymbol(node: ts.Node, checker: ts.TypeChecker): ts.Symbol | undefined {
    // Many declarations have a symbol directly.
    const anyNode = node as unknown as { symbol?: ts.Symbol };
    if (anyNode.symbol) return anyNode.symbol;

    // Otherwise ask checker for symbol at location/name.
    const nameNode =
      (ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isModuleDeclaration(node)) &&
      node.name
        ? node.name
        : node;

    return checker.getSymbolAtLocation(nameNode);
  }

  private getFirstSignatureText(symbol: ts.Symbol, checker: ts.TypeChecker): string | undefined {
    const decls = symbol.getDeclarations() ?? [];
    for (const d of decls) {
      if (ts.isFunctionDeclaration(d) || ts.isMethodDeclaration(d) || ts.isMethodSignature(d)) {
        const sig = checker.getSignatureFromDeclaration(d);
        if (sig) return checker.signatureToString(sig);
      }
    }
    return undefined;
  }

  private safeTypeTextForNode(node: ts.Node, checker: ts.TypeChecker, sf: ts.SourceFile): string | undefined {
    try {
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) {
        const sig = checker.getSignatureFromDeclaration(node);
        return sig ? checker.signatureToString(sig) : undefined;
      }
      if (ts.isConstructorDeclaration(node)) {
        const sig = checker.getSignatureFromDeclaration(node);
        return sig ? `new ${checker.signatureToString(sig)}` : undefined;
      }

      const type = checker.getTypeAtLocation(node);
      return checker.typeToString(type);
    } catch {
      // Fallback: AST text
      return node.getText(sf);
    }
  }

  private getExportInfo(node: ts.Node): { exported: boolean; defaultExport: boolean } {
    const mods = (node as unknown as { modifiers?: ts.NodeArray<ts.Modifier> }).modifiers;
    const exported = !!mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

    // default is only meaningful for some declarations; still safe to report.
    const defaultExport = !!mods?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);

    return { exported, defaultExport };
  }

  private getLocation(node: ts.Node, sf: ts.SourceFile): ReflectedLocation {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf, false));
    return {
      fileName: sf.fileName,
      startLine: line + 1,
      startCol: character + 1,
    };
  }

  private getDocBlock(
    symbol: ts.Symbol | undefined,
    node: ts.Node,
    checker: ts.TypeChecker,
    sf: ts.SourceFile,
  ): DocBlock | undefined {
    // Preferred: symbol-based docs (handles inherited JSDoc sometimes)
    const symComment = symbol ? ts.displayPartsToString(symbol.getDocumentationComment(checker)) : undefined;
    const symTags = symbol ? symbol.getJsDocTags(checker) : [];

    // Also attempt to read raw JSDoc text directly from AST
    const raw = this.getRawJsDoc(node, sf);

    const tags: DocTag[] = [];
    for (const t of symTags) {
      tags.push({ name: t.name, text: (t.text ?? []).map((x) => x.text).join('') || undefined });
    }

    const comment = symComment && symComment.trim() ? symComment.trim() : undefined;

    if (!comment && tags.length === 0 && !raw) return undefined;
    return { comment, tags, raw };
  }

  private getRawJsDoc(node: ts.Node, sf: ts.SourceFile): string | undefined {
    // `ts.getJSDocCommentsAndTags` returns JSDoc nodes/tags attached to this node.
    const jsDocs = ts.getJSDocCommentsAndTags(node);
    const docNodes = jsDocs.filter((d) => d.kind === ts.SyntaxKind.JSDoc) as ts.JSDoc[];
    if (!docNodes.length) return undefined;

    // Try to slice the original source text for the first JSDoc node.
    const first = docNodes[0];
    const fullText = sf.getFullText();
    const start = first.pos;
    const end = first.end;
    if (start >= 0 && end > start && end <= fullText.length) {
      const raw = fullText.slice(start, end).trim();
      return raw || undefined;
    }
    return undefined;
  }

  private countJsDocNodes(node: ts.Node): number {
    const jsDocs = ts.getJSDocCommentsAndTags(node);
    return jsDocs.filter((d) => d.kind === ts.SyntaxKind.JSDoc).length;
  }

  private makeId(fileName: string, name: string, pos: number): string {
    return `${fileName}::${name}::${pos}`;
  }

  private normalize(p: string): string {
    // Keep TS happy across platforms; store absolute-ish normalized paths.
    const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    return abs.replace(/\\/g, '/');
  }

  private getDecorators(node: ts.Node, sf: ts.SourceFile): ReflectedDecorator[] | undefined {
    // TS 5+: decorators sind nicht zuverlässig auf `node.decorators`, sondern über Helpers.
    if (!ts.canHaveDecorators(node)) return undefined;

    const ds = ts.getDecorators(node) ?? [];
    if (!ds.length) return undefined;

    const out: ReflectedDecorator[] = [];
    for (const d of ds) {
      const expr = d.expression;
      const text = `@${expr.getText(sf)}`;

      // name + args (best-effort)
      let name = expr.getText(sf);
      let args: string[] | undefined;

      if (ts.isCallExpression(expr)) {
        name = expr.expression.getText(sf);
        args = expr.arguments.map((a) => a.getText(sf));
      }

      out.push({ name, text, arguments: args });
    }

    return out;
  }

  private tryGetTypeAtLocation(node: ts.Node, checker: ts.TypeChecker): ts.Type | undefined {
    try {
      return checker.getTypeAtLocation(node);
    } catch {
      return undefined;
    }
  }

  private collectTypeRefIdsFromTypeNode(typeNode: ts.TypeNode, checker: ts.TypeChecker): string[] | undefined {
    try {
      const t = checker.getTypeFromTypeNode(typeNode);
      return this.collectTypeRefIdsFromType(t, checker);
    } catch {
      return undefined;
    }
  }

  private collectTypeRefIdsFromSignature(signature: ts.Signature, checker: ts.TypeChecker): string[] | undefined {
    const out = new Set<string>();

    try {
      const ret = checker.getReturnTypeOfSignature(signature);
      this.collectTypeRefIdsFromTypeInto(out, ret, checker);

      for (const p of signature.getParameters()) {
        const pt = checker.getTypeOfSymbol(p);
        this.collectTypeRefIdsFromTypeInto(out, pt, checker);
      }
    } catch {
      // ignore
    }

    return out.size ? Array.from(out) : undefined;
  }

  private collectTypeRefIdsFromType(type: ts.Type | undefined, checker: ts.TypeChecker): string[] | undefined {
    if (!type) return undefined;
    const out = new Set<string>();
    this.collectTypeRefIdsFromTypeInto(out, type, checker);
    return out.size ? Array.from(out) : undefined;
  }

  private collectTypeRefIdsFromTypeInto(out: Set<string>, type: ts.Type, checker: ts.TypeChecker): void {
    // Union / Intersection: recurse into constituents
    if (type.isUnionOrIntersection()) {
      for (const t of type.types) {
        this.collectTypeRefIdsFromTypeInto(out, t, checker);
      }
      return;
    }

    // Type arguments (generics, arrays, Promise<User>, etc.)
    try {
      const typeArgs: readonly ts.Type[] =
        (checker as unknown as { getTypeArguments?: (t: ts.TypeReference) => readonly ts.Type[] }).getTypeArguments?.(
          type as ts.TypeReference,
        ) ?? [];
      for (const ta of typeArgs) {
        this.collectTypeRefIdsFromTypeInto(out, ta, checker);
      }
    } catch {
      // ignore
    }

    // Unwrap aliases where possible
    let sym: ts.Symbol | undefined = (type as unknown as { aliasSymbol?: ts.Symbol }).aliasSymbol ?? type.getSymbol?.();
    if (sym && (sym.flags & ts.SymbolFlags.Alias) !== 0) {
      try {
        const aliased = checker.getAliasedSymbol(sym);
        if (aliased) sym = aliased;
      } catch {
        // ignore
      }
    }

    // Some generic types store the "target" symbol
    try {
      const withTarget = type as unknown as { target?: { symbol?: ts.Symbol } };
      const targetSym: ts.Symbol | undefined = withTarget.target?.symbol;
      if (targetSym) sym = targetSym;
    } catch {
      // ignore
    }

    if (!sym) return;

    // Find a declaration we can anchor to
    const decl = (sym.getDeclarations?.() ?? []).find(
      (d) =>
        ts.isClassDeclaration(d) ||
        ts.isInterfaceDeclaration(d) ||
        ts.isTypeAliasDeclaration(d) ||
        ts.isEnumDeclaration(d) ||
        ts.isFunctionDeclaration(d) ||
        ts.isVariableDeclaration(d) ||
        ts.isModuleDeclaration(d),
    );
    if (!decl) return;

    const sf = decl.getSourceFile();
    const qn = (() => {
      try {
        return checker.getFullyQualifiedName(sym);
      } catch {
        return sym.getName();
      }
    })();

    out.add(this.makeId(sf.fileName, qn, decl.pos));
  }
}

/**
 * Backwards compatible Alias (deprecated).
 *
 * @deprecated Use ReflectionGenerator.
 */
export class Reflector extends ReflectionGenerator {}
