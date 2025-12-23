import { debounce, EventBindingsMixin, Listen, LoggingMixin, waitForLoad } from '@trunkjs/browser-utils';
import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('tj-scrollspy')
export class Scrollspy extends EventBindingsMixin(LoggingMixin(LitElement)) {
  @property({ type: String, reflect: true }) accessor top_class = 'scrolled-top';
  @property({ type: String, reflect: true }) accessor bottom_class = 'scrolled-bottom';
  @property({ type: String, reflect: true }) accessor scrolled_class = 'scrolled';

  @property({ type: Number, reflect: true }) accessor top_offset = 0;
  @property({ type: Number, reflect: true }) accessor bottom_offset = 0;

  // Class for all already visited sections and (on first call) all sections above the viewport (will not be removed again)
  @property({ type: String, reflect: true }) accessor visibleClass = 'section-visible';

  // Class only set for the current element that is getting visible. Removed after
  @property({ type: String, reflect: true }) accessor firstVisibleClass = 'section-first-visible';

  // Remove the firstVisibleClass after a delay (to allow for CSS transitions)
  @property({ type: Number, reflect: true }) accessor removeFirstVisibleAfter = 1000; // ms

  @property({ type: Boolean, reflect: true }) accessor sectionSelector = 'tj-content-pane > section';

  private updateScrollClasses(): void {
    const scrollY = window.scrollY || window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;

    // Top class
    if (scrollY <= this.top_offset) {
      this.classList.add(this.top_class);
    } else {
      this.classList.remove(this.top_class);
    }

    // Bottom class
    if (scrollY + winHeight >= docHeight - this.bottom_offset) {
      this.classList.add(this.bottom_class);
    } else {
      this.classList.remove(this.bottom_class);
    }

    // Scrolled class
    if (scrollY > this.top_offset && scrollY + winHeight < docHeight - this.bottom_offset) {
      this.classList.add(this.scrolled_class);
    } else {
      this.classList.remove(this.scrolled_class);
    }
  }

  /**
   * Will:
   *
   * - mark all sections above the current scroll position as visible (by adding the visibleClass)
   * - mark the first section that becomes visible in the viewport with firstVisibleClass (removed after a delay)
   * - will not set firstVisibleClass again if visibleClass is already set
   *
   * @private
   */
  private updateVisibleSections(): void {
    const sections = Array.from(document.querySelectorAll(this.sectionSelector)) as HTMLElement[];
    const scrollY = window.scrollY || window.pageYOffset;
    const winHeight = window.innerHeight;

    let firstNewVisibleSection: HTMLElement | null = null;

    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + scrollY;
      const sectionBottom = rect.bottom + scrollY;

      // Section is above the viewport
      if (sectionBottom < scrollY) {
        if (!section.classList.contains(this.visibleClass)) {
          section.classList.add(this.visibleClass);
        }
      }
      // Section is in the viewport
      else if (sectionTop < scrollY + winHeight && sectionBottom > scrollY) {
        if (!section.classList.contains(this.visibleClass)) {
          section.classList.add(this.visibleClass);
          if (!firstNewVisibleSection) {
            firstNewVisibleSection = section;
          }
        }
      }
      // Section is below the viewport
      else {
        // Do nothing, we don't remove visibleClass once set
      }
    }

    // Handle firstNewVisibleSection
    if (firstNewVisibleSection && !firstNewVisibleSection.classList.contains(this.firstVisibleClass)) {
      firstNewVisibleSection.classList.add(this.firstVisibleClass);
      setTimeout(() => {
        firstNewVisibleSection?.classList.remove(this.firstVisibleClass);
      }, this.removeFirstVisibleAfter);
    }
  }

  @debounce(200, 100)
  @Listen('scroll', { target: 'window', options: { passive: true } })
  private onScroll(): void {
    // If the window is scrolled to the top set the top_class
    this.updateScrollClasses();
    this.updateVisibleSections();
  }

  override async connectedCallback() {
    await waitForLoad();
    super.connectedCallback();
    this.log('Scrollspy connected to the DOM.');
    this.onScroll();
  }

  // Disbale shadow DOM
  override createRenderRoot() {
    return this;
  }
}
