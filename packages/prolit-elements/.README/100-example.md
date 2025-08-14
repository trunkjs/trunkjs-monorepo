# Example

<tj-html-scope update-on="change keyup" scope-init='{ "title": "Hello World", "active": 3 }'>
  <template>
      <h1>{{ title }}</h1>

      <!-- property + boolean + class/style + event -->
      <button
          @click="count++; $update()"
          ?disabled="busy"
          ~class="{ active: count > 0 }"
          ~style="{ color: busy ? 'gray' : 'blue' }"
      >
          Clicked {{ count }}x
      </button>

      <!-- interpolation in attribute (quoted) -->
      <div title="Items: {{ todos.length }}"></div>

      <!-- multiple structural directives on one element (left-to-right) -->
      <!-- order: *if then *for -> if gates the loop -->
      <ul>
          <li *if="todos.length" *for="t of todos; t.id">
              {{$index}}: {{ t.text }}
          </li>
      </ul>

      <!-- order: *for then *if -> loop first, filter per item -->
      <ul>
          <li *for="t of todos" *if="t.text.startsWith('B')">
              {{ t.text }}
          </li>
      </ul>

      <!-- nested loops by repeating *for -->
      <ul>
          <li *for="row of matrix" *for="cell of row">{{ $index }}:{{ cell }}</li>
      </ul>

      <!-- object iteration with 'in' and $index -->
      <ul>
          <li *for="k in obj">{{ $index }}:{{ k }}={{ obj[k] }}</li>
      </ul>

      <!-- *do and *log -->
      <p *do="greet = 'Hi'">{{ greet }}, user!</p>
      <span *if="debug" *log="todos.length"></span>
  </template>

</tj-html-scope>