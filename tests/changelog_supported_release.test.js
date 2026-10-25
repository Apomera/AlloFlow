import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const source = readFileSync('changelog.html', 'utf8');
const mirror = readFileSync('desktop/web-app/public/changelog.html', 'utf8');
const windows = [];
const previousUrl = 'https://share.gemini.google/PreviousRelease';
const currentUrl = 'https://share.gemini.google/CurrentRelease';
const history = [
  { version: '1.0', released: '2026-01-01T00:00:00Z', notes: 'Original release notes.', canvas_url: previousUrl },
  { version: '2.0', released: '2026-10-22T00:00:00Z', notes: 'Current release notes.', canvas_url: currentUrl },
];

afterEach(() => {
  windows.splice(0).forEach(window => window.close());
});

async function render(body = history, pageUrl = 'https://apomera.github.io/AlloFlow/changelog.html', failure = false) {
  const requested = [];
  const dom = new JSDOM(source, {
    url: pageUrl,
    runScripts: 'dangerously',
    virtualConsole: new VirtualConsole(),
    beforeParse(window) {
      window.fetch = input => {
        requested.push(new URL(input, window.location.href));
        return failure
          ? Promise.reject(new Error('Offline'))
          : Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(body)) });
      };
    },
  });
  windows.push(dom.window);
  await new Promise(resolve => setTimeout(resolve, 0));
  return { document: dom.window.document, requested };
}

describe('release history directs classroom access to the current launcher', () => {
  it.each([
    ['https://apomera.github.io/AlloFlow/changelog.html', 'https://apomera.github.io/AlloFlow/launch.html'],
    ['https://alloflow-cdn.pages.dev/changelog.html', 'https://alloflow-cdn.pages.dev/launch.html'],
  ])('keeps the current-version action within the hosting path at %s', async (pageUrl, launchUrl) => {
    const { document, requested } = await render(history, pageUrl);
    const action = document.getElementById('current-version-link');
    expect(action.href).toBe(launchUrl);
    expect(action.textContent).toBe('Open current version');
    expect(document.querySelectorAll('#current-version-link')).toHaveLength(1);
    expect(action.getAttribute('aria-describedby')).toBe('version-access-guidance');
    expect(document.getElementById('version-access-guidance').textContent).toContain('Older versions may lack current fixes.');
    expect(requested).toHaveLength(1);
    expect(requested[0].pathname).toBe(new URL('releases.json', pageUrl).pathname);
    expect(document.querySelectorAll('#list a')).toHaveLength(0);
    expect([...document.querySelectorAll('a')].map(a => a.href)).not.toContain(previousUrl);
    expect([...document.querySelectorAll('a')].map(a => a.href)).not.toContain(currentUrl);
  });

  it('preserves every release date and note, newest first, without launching historical copies', async () => {
    const { document } = await render({ releases: history });
    const entries = [...document.querySelectorAll('#list .release')];
    expect(entries).toHaveLength(2);
    expect(entries.map(entry => entry.querySelector('.version').textContent)).toEqual(['v2.0', 'v1.0']);
    expect(entries.map(entry => entry.querySelector('.notes').textContent)).toEqual(['Current release notes.', 'Original release notes.']);
    expect(entries.map(entry => entry.querySelector('time').getAttribute('datetime'))).toEqual([history[1].released, history[0].released]);
    expect(entries.map(entry => entry.querySelector('.history-note').textContent)).toEqual(['Historical release notes', 'Historical release notes']);
    expect(document.getElementById('list').hidden).toBe(false);
  });

  it('never turns archived launch metadata or release-note markup into an actionable old-version link', async () => {
    const marker = '<a href="https://example.invalid/old-copy">Old copy</a><img src=x onerror=alert(1)>';
    const { document } = await render([
      { version: '1.0', notes: marker, canvas_url: previousUrl },
      { version: '0.9', notes: 'Review record.', canvas_url: 'javascript:alert(1)' },
      { version: '0.8', notes: 'Review record.', canvas_url: 'https://example.invalid/unsupported-copy' },
    ]);
    expect(document.querySelector('#list .notes').textContent).toBe(marker);
    expect(document.querySelectorAll('#list a, #list img, #list [onerror]')).toHaveLength(0);
    expect(document.querySelectorAll('#list .release')).toHaveLength(3);
  });

  it('keeps current-version access available when history cannot be loaded', async () => {
    const { document } = await render(history, undefined, true);
    expect(document.getElementById('status').getAttribute('role')).toBe('alert');
    expect(document.getElementById('status').textContent).toContain('Offline');
    expect(document.getElementById('current-version-link').getAttribute('href')).toBe('launch.html');
    expect(document.getElementById('current-version-link').closest('[hidden]')).toBe(null);
  });

  it('keeps the current-version action available when release history is empty', async () => {
    const { document } = await render([]);
    expect(document.getElementById('status').textContent).toContain('No releases yet');
    expect(document.getElementById('current-version-link').getAttribute('href')).toBe('launch.html');
    expect(document.querySelectorAll('#list a')).toHaveLength(0);
  });

  it('ships identical behavior in the root page and public mirror', () => {
    expect(mirror).toBe(source);
  });
});
