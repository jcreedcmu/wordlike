import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { App } from './app';

import { initAssets } from "./core/assets";

async function go() {
  await initAssets();
  const root = ReactDOM.createRoot(document.getElementById('render-root')!);
  root.render(React.createElement(App, {}));
}

window.onload = go;
