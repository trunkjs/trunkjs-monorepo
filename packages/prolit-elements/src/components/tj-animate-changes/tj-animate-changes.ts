// <auto-animate-container>
// Beobachtet direkte Kinder (add/remove/reorder) und animiert Enter/Leave/Move via WAAPI + FLIP.
// Nutzung:
//   <auto-animate-container duration="200" easing="ease" stagger="0"> ... </auto-animate-container>
// Optional: Mit dem Attribut "selectors" können tiefer verschachtelte Elemente per CSS-Selektoren beobachtet werden,
//           z. B. <tj-animate-changes selectors=".row, li.item">...</tj-animate-changes>
// Tipps: In Kombination mit lit/repeat(..., keyFn, ...) für stabile Keys nutzen.

export class AutoAnimateContainer extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['duration', 'easing', 'stagger', 'selectors'];
  }

  get duration(): number {
    return Number(this.getAttribute('duration') ?? 200);
  }
  get easing(): string {
    return this.getAttribute('easing') ?? 'ease';
  }
  get stagger(): number {
    return Number(this.getAttribute('stagger') ?? 0);
  }
  get selectors(): string {
    return this.getAttribute('selectors') ?? '';
  }

  private _rects: WeakMap<Element, DOMRect>; // WeakMap<Element, DOMRect>
  private _anims: WeakMap<Element, Animation>; // WeakMap<Element, Animation>
  private _mo: MutationObserver | null; // MutationObserver

  constructor() {
    super();
    this._rects = new WeakMap(); // Element -> last DOMRect
    this._anims = new WeakMap(); // Element -> current Animation
    this._mo = null;

    // Shadow mit Slot, Kinder bleiben im Light DOM (beobachtbar)
    this.attachShadow({ mode: 'open' }).innerHTML = `<slot></slot>`;
  }

  connectedCallback(): void {
    // Initiale Snapshot-Positionsdaten erfassen
    this._snapshot();
    // Änderungen beobachten (direkte Kinder oder tief, falls selectors angegeben)
    this._mo = new MutationObserver((muts) => this._onMutations(muts));
    this._mo.observe(this, { childList: true, subtree: !!this.selectors.trim() });
  }

  disconnectedCallback(): void {
    this._mo?.disconnect();
  }

  attributeChangedCallback(name: string, _old: string | null, _new: string | null) {
    /* runtime-read; nichts nötig */
    // Bei Änderung der 'selectors' Konfiguration erneut beobachten und Snapshot aktualisieren
    if (name === 'selectors') {
      this._mo?.disconnect();
      this._snapshot();
      this._mo = new MutationObserver((muts) => this._onMutations(muts));
      this._mo.observe(this, { childList: true, subtree: !!this.selectors.trim() });
    }
  }

  /** Alle zu beobachtenden Elemente:
   *  - Standard: direkte Kindelemente
   *  - Mit selectors: alle passenden tiefen Elemente in DOM-Reihenfolge
   */
  _elements(): Element[] {
    const sel = this.selectors.trim();
    if (!sel) {
      return Array.from(this.children) as Element[];
    }
    // Union aller Selektoren in DOM-Order
    try {
      return Array.from(this.querySelectorAll(sel));
    } catch {
      console.warn(`Invalid selector "${sel}" in <auto-animate-container>. Falling back to direct children.`);
      // Fallback bei ungültigem Selektor: wie ohne selectors verhalten
      return Array.from(this.children) as Element[];
    }
  }

  /** Letzte Positionen der Kinder speichern */
  _snapshot(): void {
    for (const el of this._elements()) {
      this._rects.set(el, el.getBoundingClientRect());
    }
  }

  _onMutations(muts: MutationRecord[]): void {
    let removed: Element[] = [];
    let added: Element[] = [];

    const sel = this.selectors.trim();

    if (sel) {
      // Tiefenbeobachtung: entfernte/neu hinzugefügte Knoten inkl. passender Nachfahren berücksichtigen
      for (const m of muts) {
        m.removedNodes.forEach((n) => {
          if (n.nodeType === 1) {
            const el = n as Element;
            try {
              if ((el as Element).matches?.(sel)) removed.push(el);
            } catch {
              /* ignore invalid selector at runtime */
            }
            try {
              el.querySelectorAll?.(sel)?.forEach((child) => removed.push(child));
            } catch {
              /* ignore */
            }
          }
        });
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) {
            console.log('Added node:', n);
            const el = n as Element;
            try {
              if ((el as Element).matches?.(sel)) added.push(el);
            } catch {
              /* ignore */
            }
            try {
              el.querySelectorAll?.(sel)?.forEach((child) => added.push(child));
            } catch {
              /* ignore */
            }
          }
        });
      }
      // Deduplizieren (ein Element kann mehrfach gezählt werden)
      removed = Array.from(new Set(removed));
      added = Array.from(new Set(added));
    } else {
      // Standard: nur direkte Kinder betrachten
      for (const m of muts) {
        m.removedNodes.forEach((n) => {
          if (n.nodeType === 1) removed.push(n as Element);
        });
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) added.push(n as Element);
        });
      }
    }

    // Leave: entfernte Elemente mit Ghost animieren
    for (const el of removed) {
      const prevRect = this._rects.get(el);
      if (prevRect) this._animateLeave(el, prevRect);
    }

    // Enter: neue Elemente ohne komplizierte Vorbereitungen (WAAPI from->to)
    for (const _el of added) {
      // optional: sofortige sichtbare Ausgangslage (nicht zwingend)
      // (WAAPI 'from' Keyframe reicht i.d.R.)
    }

    // Move/Enter via FLIP in rAF (Layout nach DOM-Änderungen messen)
    const prev = new Map<Element, DOMRect | undefined>();
    for (const el of this._elements()) prev.set(el, this._rects.get(el));

    requestAnimationFrame(() => {
      const duration = this.duration;
      const easing = this.easing;
      const stagger = this.stagger;
      let i = 0;

      for (const el of this._elements()) {
        const first = prev.get(el);
        const last = el.getBoundingClientRect();
        this._rects.set(el, last);

        if (first) {
          const dx = first.left - last.left;
          const dy = first.top - last.top;
          // Bewegung (auch Reorder) animieren
          if (dx || dy) {
            this._anims.get(el)?.cancel();
            const anim = (el as Element).animate(
              [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
              { duration, easing, delay: stagger * i },
            );
            this._anims.set(el, anim);
          }
        } else {
          // Enter (neu hinzugefügt)
          this._anims.get(el)?.cancel();
          const anim = (el as Element).animate(
            [
              { opacity: 0, transform: 'translateY(-6px)' },
              { opacity: 1, transform: 'none' },
            ],
            { duration, easing, delay: stagger * i },
          );
          this._anims.set(el, anim);
        }
        i++;
      }
    });
  }

  _animateLeave(el: Element, rect: DOMRect): void {
    console.log('Leave animation for:', el);
    // Ghost-Clone an der alten Position für Leave-Animation
    const ghost = el.cloneNode(true);
    const s = (ghost as HTMLElement).style;
    s.position = 'fixed';
    s.left = rect.left + 'px';
    s.top = rect.top + 'px';
    s.width = rect.width + 'px';
    s.height = rect.height + 'px';
    s.margin = '0';
    s.pointerEvents = 'none';
    s.boxSizing = 'border-box';
    document.body.appendChild(ghost);

    (ghost as HTMLElement)
      .animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(-6px)' },
        ],
        { duration: this.duration, easing: this.easing },
      )
      .finished.finally(() => (ghost as HTMLElement).remove());
  }
}

customElements.define('tj-animate-changes', AutoAnimateContainer);
