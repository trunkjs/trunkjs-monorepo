export type TDemoCleanup = () => void | Promise<void>;
export type TDemoCodeLanguage = 'ts' | 'js' | 'html' | 'markdown' | 'scss';
export type TDemoCodeHandler = 'onClick' | 'onChange' | 'onInput' | 'onApply' | 'validate';
export type TDemoCodeSnippet = {
  code: string;
  language: TDemoCodeLanguage;
  label?: string;
};
export type TDemoSourceInfo = {
  example?: TDemoCodeSnippet;
  afterRender?: TDemoCodeSnippet;
  /** Imported SCSS entry files supplied as inspectable source by the build integration. */
  styles?: TDemoCodeSnippet[];
  controls?: Record<string, Partial<Record<TDemoCodeHandler, TDemoCodeSnippet>>>;
};

export type TDemoControlEvent<E extends HTMLElement = HTMLElement, V = unknown> = {
  readonly element: E;
  readonly value: V;
  readonly originalEvent: Event;
};
export type TDemoControlItem = {
  id?: string;
  type?: 'button' | 'input' | 'select' | 'textarea' | 'checkbox' | 'json' | 'output' | 'html' | 'group' | 'custom';
  label?: string;
  info?: string;
  value?: unknown | ((environment: TDemoEnvironment) => unknown | Promise<unknown>);
  readonly?: boolean;
  editable?: boolean;
  update?: 'apply' | 'change' | 'input';
  debounce?: number;
  options?: { label?: string; value?: string; disabled?: boolean }[] | string[];
  attributes?: Record<string, string>;
  items?: TDemoControlItem[];
  html?: string;
  create?: (environment: TDemoEnvironment) => HTMLElement;
  validate?: (value: unknown, environment: TDemoEnvironment) => true | string | Promise<true | string>;
  onClick?: (event: TDemoControlEvent, environment: TDemoEnvironment) => void | Promise<void>;
  onChange?: (event: TDemoControlEvent, environment: TDemoEnvironment) => void | Promise<void>;
  onInput?: (event: TDemoControlEvent, environment: TDemoEnvironment) => void | Promise<void>;
  onApply?: (event: TDemoControlEvent<HTMLTextAreaElement>, environment: TDemoEnvironment) => void | Promise<void>;
};
export type TDemoControlsDefinition = { layout?: 'rows' | 'columns'; items: TDemoControlItem[] };
export type TDemoToastOptions = {
  title?: string;
};
export interface TDemoToastEnvironment {
  show(message: unknown, options?: TDemoToastOptions): number;
  log(...values: unknown[]): void;
  dismiss(id: number): void;
  clearLog(): void;
}
export interface TDemoControlsEnvironment {
  getValue<T = unknown>(id: string): T;
  setValue(id: string, value: unknown): void;
  refresh(id?: string): Promise<void>;
  reset(id?: string): Promise<void>;
  setError(id: string, message?: string): void;
}
export interface TDemoEnvironment {
  readonly demo: TDemoDefinition;
  readonly root: HTMLElement;
  readonly element?: HTMLElement;
  readonly state: Map<string, unknown>;
  readonly controls: TDemoControlsEnvironment;
  readonly toast: TDemoToastEnvironment;
  query<E extends Element = HTMLElement>(selector: string): E;
  queryOptional<E extends Element = HTMLElement>(selector: string): E | null;
  queryAll<E extends Element = HTMLElement>(selector: string): readonly E[];
  rerender(): Promise<void>;
}

export type TDemoDefinition = {
  /**
   * The File path to the demo component. This should be relative to the `demos` directory in your project.
   */
  readonly filename?: string;

  group?: string;

  /** Navigation groups. Use an empty path to place the demo at the navigation root. */
  navPath?: string | string[];

  /** Lower values appear before higher values. Unordered demos follow alphabetically. */
  order?: number;

  tags?: string[];

  /**
   * Render the default viewer output in an iframe that loads this demo in fullscreen mode.
   * Use this for demos that require their own viewport, for example fixed or responsive layouts.
   *
   * @example
   * defineDemo({ iframe: true, html: '<header>...</header>' });
   */
  iframe?: boolean;

  /**
   * Add Stylesheets to the demo.
   *
   * if css it not set the default style is injected.
   *
   * If you want no styles at all set it to null.
   * If you set custom styles, you must add 'default' to the array to include the default styles as well.
   *
   * <example>
   * import style from './my-demo.scss?inline';
   * import style from './my-demo.css?url';
   * </example>
   *
   */
  css?: string | 'default' | null | Array<string | 'default'>;

  /**
   * the HTML content
   */
  html?: string;

  /**
   * Markdown content (alternative)
   */
  markdown?: string;

  /**
   * A wrapper HTML string to wrap around the demo content. It replaes the {{content}} placeholder with the actual content (html, markdown or the rendered demo component).
   */
  wrapper_html?: string;

  title?: string;

  description?: string;

  /**
   * Original, untransformed source of the .demo.ts file when supplied by the build integration.
   */
  source?: string;

  /** Inspectable example and action-handler snippets supplied by the build integration. */
  sourceInfo?: TDemoSourceInfo;

  /** Declarative, collapsible controls rendered below the demo. */
  controls?: TDemoControlsDefinition;

  render?(root: HTMLElement): void | Promise<void>;
  /** Runs after the demo DOM is complete. May return cleanup logic for the next render. */
  afterRender?(environment: TDemoEnvironment): void | TDemoCleanup | Promise<void | TDemoCleanup>;

  /**
   * Optional lazy loader used by build tools to load a demo module only when selected.
   * This lets bundlers emit per-demo chunks and CSS instead of one global demo bundle.
   */
  load?(): Promise<TDemoDefinition>;
};

export type TNavLeafNode = {
  readonly name: string;
  readonly href: string;
  readonly children?: never;
};

export type TNavBranchNode = {
  readonly name: string;
  readonly children: readonly TNavTreeNode[];
  readonly href?: never;
};

export type TNavTreeNode = TNavLeafNode | TNavBranchNode;

export type TNavData = {
  readonly title: string;
  readonly description?: string;
  readonly tree: readonly TNavTreeNode[];
};

export function defineDemo(demo: TDemoDefinition): TDemoDefinition {
  return demo;
}

/** Marks a referenced handler as eligible for build-time source extraction. */
export function inspectable<TFunction extends (...args: never[]) => unknown>(handler: TFunction): TFunction {
  return handler;
}
