import { defineDemo } from '@trunkjs/demo-viewer';
import html from './demo.html?raw';
import style from './demo.scss?url';
export default defineDemo({
  title: 'Hello World',
  description: 'Einfache HTML-Demo innerhalb von tj-demo.',

  css: style,

  html,

  controls: {
    items: [
      {
        id: 'toggle',
        type: 'button',
        label: 'On off',
        onClick: () => console.log('wurst'),
      },
    ],
  },
});
