// The browser shell (app/index.html on Cloudflare Pages) references vendor scripts by
// root-absolute path (/vendor/...). Pages serves the repo root, so every such file must
// exist under vendor/ at the root, not only under desktop/web-app/public/vendor/ (which
// only the React build sees). When one was missing, Pages answered the request with the
// SPA fallback page (HTTP 200, text/html), the browser refused it as a script, and touch
// drag-and-drop silently died on phones. Found live 2026-09-06, still live 2026-09-13.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const shell = readFileSync(resolve(ROOT, 'app', 'index.html'), 'utf8');

describe('browser shell vendor assets exist where Pages serves them', () => {
  const refs = [...shell.matchAll(/(?:src|href)="\/vendor\/([^"?]+)/g)].map((m) => m[1]);

  it('the shell references at least the touch drag-and-drop polyfill', () => {
    expect(refs).toContain('drag-drop-touch-2.0.3.esm.min.js');
  });

  it.each(refs.length ? refs : ['(none)'])('/vendor/%s is a real file at the repo root', (file) => {
    if (file === '(none)') return;
    const p = resolve(ROOT, 'vendor', file);
    expect(existsSync(p), p).toBe(true);
    expect(statSync(p).size).toBeGreaterThan(100);
    const head = readFileSync(p, 'utf8').slice(0, 200);
    expect(head.trimStart().startsWith('<'), file + ' looks like HTML, not a script').toBe(false);
  });

  it('the root copy matches the React build copy byte for byte', () => {
    for (const file of refs) {
      const a = resolve(ROOT, 'vendor', file);
      const b = resolve(ROOT, 'desktop', 'web-app', 'public', 'vendor', file);
      if (existsSync(b)) expect(readFileSync(a), file).toEqual(readFileSync(b));
    }
  });
});
