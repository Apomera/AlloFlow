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
    // 74cbea9c9 (2026-09-13) re-encoded the inline boot logo from the 22 KB JPEG to an
    // 8.6 KB WebP at the same 249x189, so compare the decoded frame size, not the bytes.
    const original = fs.readFileSync(path.join(root, 'rainbow-book.jpg'));
    const jpegSize = (b) => {
      for (let i = 2; i + 8 < b.length && b[i] === 0xff;) {
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
        i += 2 + b.readUInt16BE(i + 2);
      }
      return null;
    };
    const webpSize = (b) => (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 16) === 'WEBPVP8 '
      ? [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff] : null);
    const want = jpegSize(original);
    expect(want).toEqual([249, 189]);
    const payloads = new Set();
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const logo = read(file).match(/<img src=\{"data:image\/(jpeg|webp);base64,([^"}]+)"\}[^>]+>/);
      expect(logo, file).not.toBeNull();
      const bytes = Buffer.from(logo[2], 'base64');
      if (logo[1] === 'jpeg') expect(bytes.equals(original), file).toBe(true);
      else expect(webpSize(bytes), file).toEqual(want);
      payloads.add(logo[2]);
      expect(logo[0]).toContain('loading="eager"');
      expect(logo[0]).toContain('fetchpriority="high"');
    }
    expect(payloads.size, 'host, src mirror and App.jsx ship the same logo').toBe(1);
  });
});
