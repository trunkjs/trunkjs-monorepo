import { AfterArrangeEventDetail } from './components/tj-content-pane/TjContentPane';

export * from './components/tj-content-pane/TjContentPane';
export * from './lib/apply-layout';
export * from './lib/attrAssign';
export * from './lib/SectionTreeBuilder';
export * from './mixins/SubLayoutApplyMixin';

declare global {
  interface HTMLElementEventMap {
    afterArrange: CustomEvent<AfterArrangeEventDetail>;
  }
}
