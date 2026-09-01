import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const AXE_SOURCE = require(resolve(MODULES_DIR, 'axe-core')).source;
const { JSDOM } = require(resolve(MODULES_DIR, 'jsdom'));

export const WCAG_AA_OPTIONS = Object.freeze({
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
  rules: { 'color-contrast': { enabled: false } },
});

export async function runIsolatedAxe(html, { selector = null, options = WCAG_AA_OPTIONS } = {}) {
  const fixture = new JSDOM('<!doctype html><html><body><main id="axe-fixture"></main></body></html>', {
    runScripts: 'outside-only',
  });
  const host = fixture.window.document.querySelector('#axe-fixture');
  host.innerHTML = String(html || '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

  try {
    fixture.window.eval(AXE_SOURCE);
    const target = selector ? host.querySelector(selector) : host;
    if (!target) throw new Error('Isolated axe target not found: ' + selector);
    return await fixture.window.axe.run(target, options);
  } finally {
    if (fixture.window.axe) fixture.window.axe.cleanup();
    fixture.window.close();
  }
}
