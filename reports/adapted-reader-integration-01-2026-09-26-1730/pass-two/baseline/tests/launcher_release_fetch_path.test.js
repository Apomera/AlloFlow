// The launcher's release fetch and the version it announces (2026-09-20).
//
// GitHub Pages serves the launcher from a PROJECT subpath
// (apomera.github.io/AlloFlow/launch.html). The fetch used to ask for
// '/release.json', which resolves to the ACCOUNT root, 404s there, and sent every
// visitor down the catch branch, so the badge read "Offline - using bundled v1.5"
// while the deployed release.json said 1.6. The old launcher_browser_fallback test
// stubbed fetch with a canned reply, so it could never see this.
//
// These pin the two halves: the request must resolve under the launcher's own
// directory, and the baked-in fallback must not fall behind release.json.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = process.cwd();
const launcher = readFileSync(resolve(ROOT, 'launch.html'), 'utf8');
const launcherMirror = readFileSync(resolve(ROOT, 'desktop/web-app/public/launch.html'), 'utf8');
const release = JSON.parse(readFileSync(resolve(ROOT, 'release.json'), 'utf8'));
const releaseMirror = JSON.parse(readFileSync(resolve(ROOT, 'desktop/web-app/public/release.json'), 'utf8'));
const bumpScript = readFileSync(resolve(ROOT, 'bump-link.mjs'), 'utf8');

// Serve release.json ONLY at the project subpath, exactly like GitHub Pages does.
function renderAt(pageUrl, served) {
  const requested = [];
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(launcher, {
    url: pageUrl,
    runScripts: 'dangerously',
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem('alloflow.launch.interstitialDismissed', '1');
      window.fetch = (input) => {
        const url = new URL(String(input), window.location.href);
        requested.push(url.origin + url.pathname);
        if (url.origin + url.pathname !== served) {
          return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('404')) });
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ canvas_url: 'https://share.gemini.google/4wPpHHtUoPdi', version: '9.9' }) });
      };
    },
  });
  return { dom, requested };
}

describe('launcher release fetch path', () => {
  const PAGE = 'https://apomera.github.io/AlloFlow/launch.html';
  const SERVED = 'https://apomera.github.io/AlloFlow/release.json';

  it('asks for release.json beside the launcher, not at the account root', () => {
    const { dom, requested } = renderAt(PAGE, SERVED);
    expect(requested).toContain(SERVED);
    expect(requested).not.toContain('https://apomera.github.io/release.json');
    dom.window.close();
  });

  it('reports the live version rather than the bundled fallback when the file is reachable', async () => {
    const { dom } = renderAt(PAGE, SERVED);
    await new Promise((r) => setTimeout(r, 0));
    const status = dom.window.document.getElementById('status-text');
    expect(status.textContent).toContain('Live');
    expect(status.textContent).not.toContain('Offline');
    expect(dom.window.document.getElementById('version-label').textContent).toBe('v9.9');
    dom.window.close();
  });

  it('still falls back honestly when release.json really is unreachable', async () => {
    const { dom } = renderAt(PAGE, 'https://example.invalid/nothing.json');
    await new Promise((r) => setTimeout(r, 0));
    expect(dom.window.document.getElementById('status-text').textContent).toContain('Offline');
    dom.window.close();
  });
});

describe('launcher bundled fallback does not fall behind the release', () => {
  it('bakes in the version release.json actually names', () => {
    const baked = /const\s+FALLBACK_VERSION\s*=\s*"([^"]*)"/.exec(launcher);
    expect(baked, 'FALLBACK_VERSION constant').toBeTruthy();
    expect(baked[1]).toBe(release.version);
  });

  it('paints that same version before the fetch resolves', () => {
    const label = /<span\s+id="version-label"\s*>v?([\d.]+)<\/span>/.exec(launcher);
    expect(label, 'version-label span').toBeTruthy();
    expect(label[1]).toBe(release.version);
  });

  it('keeps both deploy copies in step', () => {
    expect(launcherMirror).toBe(launcher);
    expect(releaseMirror.version).toBe(release.version);
  });

  it('has the release script rewrite the version, so it cannot silently go stale again', () => {
    expect(bumpScript).toMatch(/FALLBACK_VERSION_RE/);
    expect(bumpScript).toMatch(/LAUNCH_VERSION_LABEL_RE/);
    expect(bumpScript).toContain('rewriteLaunchHtml(newUrl, newVersion)');
  });
});
