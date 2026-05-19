/* __TJ_DEMO_VIEWER_COMPONENT_IMPORT__ */
// @ts-ignore virtual module provided by the plugin at runtime
import { demos } from 'virtual:tdemo-registry';

function applyDemos() {
  const viewer = document.querySelector('tj-demo-viewer');

  if (!viewer) {
    return false;
  }

  viewer.demos = demos;
  return true;
}

if (!applyDemos()) {
  window.addEventListener(
    'tj:viewerReady',
    () => {
      applyDemos();
    },
    { once: true },
  );
}
