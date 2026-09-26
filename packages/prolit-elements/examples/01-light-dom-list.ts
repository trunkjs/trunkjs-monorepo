import { prolit_html, scopeDefine } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';

export class ExampleTodoList extends ProlitElement {
  @property({ type: String, reflect: true })
  heading = 'Tasks';

  readonly state = scopeDefine({
    title: 'Tasks',
    draft: '',
    todos: [{ id: 1, text: 'Read the examples', done: false }],
    $fn: {
      add: (): void => this.addTodo(),
      toggle: (id: number): void => this.toggleTodo(id),
    },
    $tpl: prolit_html`
      <section aria-label="{{ title }}">
        <h2>{{ title }}</h2>
        <label>New task <input .value="draft" @input="draft = $event.currentTarget.value"></label>
        <button @click="$fn.add()" ?disabled="!draft.trim()">Add</button>
        <p *if="todos.length === 0">No tasks yet.</p>
        <ul>
          <li *for="todo of todos; todo.id" ~class="{ done: todo.done }">
            <label>
              <input type="checkbox" .checked="todo.done" @change="$fn.toggle(todo.id)">
              {{ todo.text }}
            </label>
          </li>
        </ul>
      </section>
    `,
  });

  constructor() {
    super();
    this.scope = this.state;
  }

  protected override createRenderRoot() {
    return this;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('heading')) this.state.title = this.heading;
  }

  private addTodo(): void {
    const text = this.state.draft.trim();
    if (!text) return;
    this.state.todos = [...this.state.todos, { id: Date.now(), text, done: false }];
    this.state.draft = '';
  }

  private toggleTodo(id: number): void {
    this.state.todos = this.state.todos.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo,
    );
  }
}

customElements.define('example-todo-list', ExampleTodoList);

export function mountTodoList(target: HTMLElement): ExampleTodoList {
  const list = document.createElement('example-todo-list') as ExampleTodoList;
  list.setAttribute('heading', 'Today');
  target.append(list);
  return list;
}
