export type TControlDefinition = {
  label: string;
  info?: string;
  element?: HTMLElement | 'button' | 'input' | 'select' | 'textarea';
  selectOptions?: { label?: string; value?: string; disabled?: boolean }[] | string[];
  init?: (element: HTMLElement) => void | Promise<void>;
  events?: {
    [eventName: string]: (event: Event) => void;
  };
  // Shortcuts for common events
  onclick?: (event: Event) => void;
  onchange?: (event: Event) => void;
  oninput?: (event: Event) => void;
  onfocus?: (event: Event) => void;
  onblur?: (event: Event) => void;
  onkeydown?: (event: Event) => void;
  onkeyup?: (event: Event) => void;
};

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

  /**
   * The content auf the controls slot (for buttons etc.). Here you can place your own controls. You
   * should use the controls attibute to add standard controls.
   */
  controls_raw_html?: string;

  controls?: TControlDefinition[];

  render?(root: HTMLElement): void | Promise<void>;

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
