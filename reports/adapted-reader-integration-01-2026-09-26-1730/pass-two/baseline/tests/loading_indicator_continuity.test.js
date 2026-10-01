import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { transformSync } from '@babel/core';
import transformJsx from '@babel/plugin-transform-react-jsx';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('AlloFlowANTI.txt');
const start = source.indexOf('{isAppReady && (moduleLoadInfo.pending.length');
const end = source.indexOf('{showSessionModal &&', start);
const pill = source.slice(start, end).trim();
const compiled = transformSync(`window.LoadingPill = function ({isAppReady, moduleLoadInfo}) {
  const t = () => '';
  return <>${pill}</>;
};`, { plugins: [transformJsx], configFile: false, babelrc: false }).code;

function mount() {
  const dom = new JSDOM('<div id="root"></div>', { runScripts: 'outside-only' });
  const win = dom.window;
  win.eval(read('desktop/web-app/node_modules/react/umd/react.production.min.js'));
  win.eval(read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'));
  win.eval(compiled);
  const host = win.document.getElementById('root');
  const reactRoot = win.ReactDOM.createRoot(host);
  return {
    win, host,
    render(pending, queued, failed = [], isAppReady = true) {
      win.ReactDOM.flushSync(() => reactRoot.render(win.React.createElement(win.LoadingPill, {
        isAppReady, moduleLoadInfo: { pending, queued, failed },
      })));
    },
    close() { reactRoot.unmount(); win.close(); },
  };
}

describe('initial loading indicators', () => {
  it('keeps the pill and spinner mounted between batches and count changes', () => {
    const app = mount();
    try {
      app.render(['active'], Array.from({ length: 99 }, (_, i) => `tool-${i}`));
      const pillNode = app.host.querySelector('[data-allo-module-loading-pill]');
      const spinner = app.host.querySelector('.animate-spin');
      expect(pillNode.textContent).toContain('100 left');
      for (const [pending, queued, remaining] of [
        [[], ['queued-a', 'queued-b'], 2],
        [['queued-a'], ['queued-b'], 2],
        [['queued-b'], [], 1],
      ]) {
        app.render(pending, queued);
        expect(app.host.querySelector('[data-allo-module-loading-pill]')).toBe(pillNode);
        expect(app.host.querySelector('.animate-spin')).toBe(spinner);
        expect(pillNode.textContent).toContain(`${remaining} left`);
      }
      app.render([], []);
      expect(app.host.childElementCount).toBe(0);
    } finally { app.close(); }
  });

  it('preserves startup visibility and the failed-module retry action', () => {
    const app = mount();
    try {
      app.render(['active'], ['queued'], [], false);
      expect(app.host.childElementCount).toBe(0);
      let retries = 0;
      app.win.__alloRetryFailedModules = () => { retries++; };
      app.render([], [], ['failed']);
      expect(app.host.querySelector('.animate-spin')).toBeNull();
      expect(app.host.textContent).toContain('1 failed');
      app.host.querySelector('button').click();
      expect(retries).toBe(1);
      app.render([], ['queued'], ['failed']);
      expect(app.host.textContent).toContain('1 left');
      expect(app.host.querySelector('button')).not.toBeNull();
    } finally { app.close(); }
  });

  it('ships the original rainbow eagerly without a preview-relative image request', () => {
    const original = fs.readFileSync(path.join(root, 'rainbow-book.jpg'));
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const logo = read(file).match(/<img src=\{"data:image\/jpeg;base64,([^"}]+)"\}[^>]+>/);
      expect(logo, file).not.toBeNull();
      expect(Buffer.from(logo[1], 'base64').equals(original)).toBe(true);
      expect(logo[0]).toContain('loading="eager"');
      expect(logo[0]).toContain('fetchpriority="high"');
    }
  });
});
