import { AfterArrangeEventDetail } from './src/components/tj-content-pane/TjContentPane';

export * from './src/components/tj-content-pane/TjContentPane';
export * from './src/lib/apply-layout';
export * from './src/lib/attrAssign';
export * from './src/lib/SectionTreeBuilder';
export * from './src/mixins/SubLayoutApplyMixin';
export * from './src/pre-parsers/TextBlockPreParser';

declare global {
  interface HTMLElementEventMap {
    afterArrange: CustomEvent<AfterArrangeEventDetail>;
  }
}
