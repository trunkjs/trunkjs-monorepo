import { ProlitElement, scopeDefine } from '@trunkjs/prolit';
import type { PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('example-todo-list')
export class ExampleTodoList extends ProlitElement {
  protected override scope = scopeDefine({
    // language=HTML
    $tpl: `
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

    title: 'Tasks',
    draft: '',
    todos: [{ id: 1, text: 'Read the examples', done: false }],
    $fn: {
      add: (): void => {
        const text = this.scope.draft.trim();
        if (!text) return;
        this.scope.todos = [...this.scope.todos, { id: Date.now(), text, done: false }];
        this.scope.draft = '';
      },
      toggle: (id: number): void => {
        this.scope.todos = this.scope.todos.map((todo) =>
          todo.id === id ? { ...todo, done: !todo.done } : todo,
        );
      },
    },
  });

  @property({ type: String, reflect: true })
  heading = 'Tasks';

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('heading')) this.scope.title = this.heading;
  }
}
