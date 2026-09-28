import type { DialogDimension, DialogRenderer } from './dialog-renderer';

const scrollLocks = new WeakMap<Document, { count: number; overflow: string }>();
const dimension = (value: DialogDimension): string => typeof value === 'number' ? `${value}px` : value;

/** Flat grey reference renderer using the browser's native modal/focus behavior. */
export function createSimpleDialogRenderer(): DialogRenderer {
  return {
    mount(content, options, dismiss) {
      const doc = content.ownerDocument;
      const opener = doc.activeElement;
      const host = doc.createElement('div');
      host.dataset['prolitDialog'] = '';
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          dialog { box-sizing: border-box; padding: 0; border: 1px solid #666;
            border-radius: 8px; background: #303030; color: #eee;
            font: 16px/1.5 system-ui, sans-serif; }
          dialog::backdrop { background: rgb(0 0 0 / 55%); }
          header { display: flex; align-items: center; gap: 16px; padding: 12px 16px;
            background: #252525; border-bottom: 1px solid #555; }
          h2 { margin: 0; flex: 1; font-size: 16px; font-weight: 600; }
          button { color: #eee; background: #444; border: 1px solid #777;
            border-radius: 4px; padding: 4px 10px; font: inherit; cursor: pointer; }
          button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
          main { padding: 16px; min-height: 0; overflow: auto; flex: 1; }
          .frame { display: flex; flex-direction: column; height: 100%; max-height: inherit; }
        </style>
        <dialog><div class="frame"><header><h2></h2><button type="button" aria-label="Close dialog">×</button></header>
          <main><slot></slot></main></div></dialog>`;
      const dialog = root.querySelector('dialog')!;
      root.querySelector('h2')!.textContent = options.title ?? 'Dialog';
      dialog.setAttribute('aria-label', options.title ?? 'Dialog');
      const fullscreen = options.size === 'fullscreen';
      const widths = { sm: '360px', md: '560px', lg: '880px', fullscreen: '100vw' };
      dialog.style.width = dimension(options.width ?? widths[options.size ?? 'md']);
      dialog.style.height = dimension(options.height ?? (fullscreen ? '100dvh' : 'auto'));
      dialog.style.maxWidth = dimension(options.maxWidth ?? (fullscreen ? '100vw' : 'calc(100vw - 32px)'));
      dialog.style.maxHeight = dimension(options.maxHeight ?? (fullscreen ? '100dvh' : 'calc(100dvh - 32px)'));
      if (fullscreen) { dialog.style.margin = '0'; dialog.style.borderRadius = '0'; }
      const controller = new AbortController();
      const close = root.querySelector('button')!;
      close.hidden = options.closeButton === false;
      close.addEventListener('click', dismiss, { signal: controller.signal });
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        if (options.closeOnEscape !== false) dismiss();
      }, { signal: controller.signal });
      dialog.addEventListener('close', dismiss, { signal: controller.signal });
      dialog.addEventListener('click', (event) => {
        if (!options.closeOnBackdrop || event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss();
      }, { signal: controller.signal });
      host.append(content);
      doc.body.append(host);
      try { dialog.showModal(); }
      catch (error) { controller.abort(); host.remove(); throw error; }
      const lock = scrollLocks.get(doc) ?? { count: 0, overflow: doc.body.style.overflow };
      lock.count++;
      scrollLocks.set(doc, lock);
      doc.body.style.overflow = 'hidden';
      let closed = false;
      return {
        close() {
          if (closed) return;
          closed = true;
          controller.abort();
          if (dialog.open) dialog.close();
          host.remove();
          if (--lock.count === 0) {
            doc.body.style.overflow = lock.overflow;
            scrollLocks.delete(doc);
          }
          if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
        },
      };
    },
  };
}
