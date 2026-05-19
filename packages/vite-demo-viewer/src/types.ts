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

  tags?: string[];

  /**
   * Add Stylesheets to the demo.
   *
   * <example>
   * import style from './my-demo.scss?inline';
   * import style from './my-demo.css?url';
   * </example>
   *
   */
  css?: string | string[];

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
   * The content auf the controls slot (for buttons etc.). Here you can place your own controls. You
   * should use the controls attibute to add standard controls.
   */
  controls_raw_html?: string;

  controls?: TControlDefinition[];

  render?(root: HTMLElement): void | Promise<void>;
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
