import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { App } from './components/app';
import { initAssets } from "./core/assets";
import { getPrerenderers } from "./ui/prerender";

async function go() {
  await initAssets(getPrerenderers());
  const root = ReactDOM.createRoot(document.getElementById('render-root')!);
  root.render(React.createElement(App, {}));
}

window.onload = go;
