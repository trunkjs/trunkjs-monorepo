import { defineDemo } from '../src/types';
import html from './demo.html?raw';

export default defineDemo({
  title: 'Hello World',
  description: 'Einfache HTML-Demo innerhalb von tj-demo.',

  html,

  controls: [
    {
      label: 'On off',
      element: 'button',
      events: {
        click: () => console.log('click'),
      },
    },
  ],
});
