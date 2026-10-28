import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('publishes the new shared link while preserving release history and current mirrors', () => {
  const tempParent = fs.realpathSync(os.tmpdir());
  const fixture = fs.mkdtempSync(path.join(tempParent, 'alloflow-link-release-'));
  const oldUrl = 'https://share.gemini.google/PreviousRelease';
  const newUrl = 'https://share.gemini.google/CurrentRelease';
  const oldRelease = { id: 'previous-release', version: '1.6', canvas_url: oldUrl, released: '2026-09-13T20:00:00.000Z', notes: 'Previous release notes' };
  const write = (name, data) => {
    const target = path.join(fixture, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
  };
  const json = name => JSON.parse(fs.readFileSync(path.join(fixture, name), 'utf8'));
  try {
    write('release.json', JSON.stringify(oldRelease));
    write('releases.json', JSON.stringify([oldRelease]));
    write('launch.html', `const FALLBACK_CANVAS_URL = "${oldUrl}";\nconst FALLBACK_VERSION = "1.6";\n<span id="version-label">v1.6</span>\n<a id="launch-btn" href="${oldUrl}">Launch</a>`);
    write('index.html', '<span data-version-label>v1.6</span>');
    // The in-app button holds no link (it is integrity-pinned), so a link change must
    // leave both the source and the built module untouched.
    const appModule = "const CANVAS_FALLBACK_URL = 'https://alloflow-cdn.pages.dev/launch';";
    write('view_misc_modals_source.jsx', appModule);
    write('view_misc_modals_module.js', appModule);
    write('desktop/web-app/public/view_misc_modals_module.js', appModule);
    for (const name of ['release.json', 'releases.json', 'launch.html']) {
      write('desktop/web-app/public/' + name, fs.readFileSync(path.join(fixture, name)));
    }
    write('dev-tools/set_canvas_url.cjs', fs.readFileSync('dev-tools/set_canvas_url.cjs'));
    // A builder that marks its output, so a rebuild during the release would show.
    write('_build_view_misc_modals_module.js', `const fs = require('node:fs');\nfs.writeFileSync('view_misc_modals_module.js', 'REBUILT');\nfs.writeFileSync('desktop/web-app/public/view_misc_modals_module.js', 'REBUILT');`);
    const script = fs.readFileSync('bump-link.mjs', 'utf8').replace(
      'const REPO_ROOT = "C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated";',
      'const REPO_ROOT = ' + JSON.stringify(fixture.replace(/\\/g, '/')) + ';'
    );
    write('bump-link.mjs', script);
    const result = spawnSync(process.execPath, [path.join(fixture, 'bump-link.mjs'), newUrl, 'Current release notes'], { cwd: fixture, encoding: 'utf8', timeout: 20000 });
    expect(result.status, result.stderr).toBe(0);
    expect(json('release.json')).toMatchObject({ version: '1.7', canvas_url: newUrl, notes: 'Current release notes' });
    expect(json('releases.json')[0]).toMatchObject({ version: '1.7', canvas_url: newUrl });
    expect(json('releases.json')[1]).toEqual(oldRelease);
    for (const name of ['release.json', 'releases.json', 'launch.html']) {
      expect(fs.readFileSync(path.join(fixture, 'desktop/web-app/public', name), 'utf8')).toBe(fs.readFileSync(path.join(fixture, name), 'utf8'));
    }
    expect(fs.readFileSync(path.join(fixture, 'index.html'), 'utf8')).toContain('v1.7');
    for (const name of ['view_misc_modals_source.jsx', 'view_misc_modals_module.js', 'desktop/web-app/public/view_misc_modals_module.js']) {
      expect(fs.readFileSync(path.join(fixture, name), 'utf8'), name).toBe(appModule);
    }
    expect(result.stdout).toContain('set_canvas_url --check');
  } finally {
    const resolved = fs.realpathSync(fixture);
    if (path.dirname(resolved) !== tempParent || !path.basename(resolved).startsWith('alloflow-link-release-')) throw new Error('Unsafe fixture cleanup path.');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}, 30000);
