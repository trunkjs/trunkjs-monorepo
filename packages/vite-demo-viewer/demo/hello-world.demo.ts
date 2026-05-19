import { defineDemo } from '../src/types';
import html from './demo.html?raw';
import style from './demo.scss?url';
export default defineDemo({
  title: 'Hello World',
  description: 'Einfache HTML-Demo innerhalb von tj-demo.',

  css: style,

  html,

  controls: [
    {
      label: 'On off',
      element: 'button',
      events: {
        click: () => console.log('wurst'),
      },
    },
  ],
});
