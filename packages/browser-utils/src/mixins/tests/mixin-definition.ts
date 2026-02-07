import { LitElement } from 'lit';
import { BreakPointMixin, EventBindingsMixin, LoggingMixin } from '../../index';

class test0 extends LitElement {
  static override styles = [];
  override connectedCallback() {
    super.connectedCallback();
  }
}

class test01 extends BreakPointMixin(LitElement) {
  static override styles = [];

  override connectedCallback() {
    super.connectedCallback();
  }
}

class test extends LoggingMixin(LitElement) {
  static override styles = [];
}

class test2 extends BreakPointMixin(LoggingMixin(LitElement)) {
  static override styles = [];
}
class test3 extends EventBindingsMixin(BreakPointMixin(LoggingMixin(LitElement))) {
  static override styles = [];
}
