/* __TJ_DEMO_VIEWER_COMPONENT_IMPORT__ */
// @ts-ignore virtual module provided by the plugin at runtime
import { demos } from 'virtual:tdemo-registry';

window.addEventListener('tj:viewerReady', () => {
  const viewer = document.querySelector('tj-demo-viewer');

  if (!viewer) {
    throw new Error('tj-demo-viewer element not found');
  }

  viewer.demos = demos;
});
