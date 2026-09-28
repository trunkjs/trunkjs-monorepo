export type DialogResult<T = void> = { submitted: true; data: T } | { submitted: false };
export type DialogDimension = string | number;

export interface DialogOptions {
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  width?: DialogDimension;
  height?: DialogDimension;
  maxWidth?: DialogDimension;
  maxHeight?: DialogDimension;
  closeButton?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

/** A renderer mounts the original element. close() must release all renderer resources. */
export interface DialogSession { close(): void | Promise<void>; }
export interface DialogRenderer {
  mount(content: HTMLElement, options: Readonly<DialogOptions>, dismiss: () => void): DialogSession;
}

export interface DialogOpenOptions extends DialogOptions { renderer?: DialogRenderer; }
let defaultRenderer: DialogRenderer | undefined;

/** Configure once at application startup; an individual open may override the renderer. */
export function configureProlitDialogs(options: { renderer: DialogRenderer }): void {
  defaultRenderer = options.renderer;
}

export function resolveDialogRenderer(renderer?: DialogRenderer): DialogRenderer {
  const resolved = renderer ?? defaultRenderer;
  if (!resolved) throw new Error('Configure a Prolit dialog renderer before opening a dialog.');
  return resolved;
}
