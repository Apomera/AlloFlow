import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('desktop web shell boundary', () => {
  const appSources = [
    'AlloFlowANTI.txt',
    'desktop/web-app/src/AlloFlowANTI.txt',
    'desktop/web-app/src/App.jsx',
  ];

  it('does not require VexFlow from the host compiler', () => {
    for (const sourcePath of appSources) {
      const source = read(sourcePath);
      expect(source).not.toMatch(/from\s+['"]vexflow['"]/);
      expect(source).toContain('vendor/vexflow-5.0.0/vexflow.js?v=5.0.0');
      expect(source).toContain('using the built-in SVG renderer');
    }
    expect(fs.existsSync(path.join(root, 'vendor/vexflow-5.0.0/vexflow.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'desktop/web-app/public/vendor/vexflow-5.0.0/vexflow.js'))).toBe(true);
  });

  it('keeps Firebase deployment opt-in and never assigns a third-party proxy', () => {
    const firebaseRc = JSON.parse(read('desktop/web-app/.firebaserc'));
    expect(firebaseRc.projects.default).toBe('YOUR_PROJECT_ID');

    // The rule this guard exists for: no default pointing at infrastructure the
    // project does not own. It originally pinned the comment text left behind
    // when the prismflow Firebase default was removed, which made "has no
    // default at all" and "has a first-party default" indistinguishable —
    // so restoring search on the project's OWN Cloudflare Worker tripped it.
    // Now it checks the property instead of the prose.
    for (const sourcePath of appSources) {
      const source = read(sourcePath);
      expect(source).not.toContain('prismflow-911fe.web.app/api/searchProxy');

      const assignments = [...source.matchAll(
        /window\.ALLOFLOW_CANVAS_SEARCH_PROXY\s*=\s*'([^']+)'/g,
      )].map((m) => m[1]);

      for (const url of assignments) {
        // First-party only: the project's own Cloudflare Worker.
        expect(url).toMatch(/^https:\/\/[a-z0-9-]+\.aaron-pomeranz\.workers\.dev\//);
      }
    }
  });

  it('lets a district override or disable the Canvas search default', () => {
    // A hardcoded default is only acceptable while it stays overridable: a
    // district must be able to point at its own proxy, or turn the transport
    // off entirely, without editing the app source.
    const source = read('AlloFlowANTI.txt');
    const assignment = source.match(
      /if \(_isCanvasEnv[^\n]*\n\s*window\.ALLOFLOW_CANVAS_SEARCH_PROXY = '[^']+';/,
    );
    expect(assignment).not.toBeNull();

    const guard = assignment[0];
    // Must not clobber a value the host already set...
    expect(guard).toContain('!window.ALLOFLOW_CANVAS_SEARCH_PROXY');
    // ...and must honour the kill switch.
    expect(guard).toContain('!window.ALLOFLOW_DISABLE_CANVAS_SEARCH_PROXY');
    // ...and must never apply outside Canvas, where real transports exist.
    expect(guard).toContain('_isCanvasEnv');
  });

  it('uses the repurposed desktop path throughout tracked code', () => {
    expect(read('desktop/scripts/build-desktop-web.cjs')).toContain(
      "path.join(REPO_ROOT, 'desktop/web-app')",
    );
    expect(read('desktop/web-app/package.json')).toContain(
      'node ../../build.js --copy-student-shell',
    );
    expect(fs.existsSync(path.join(root, 'prismflow-deploy'))).toBe(false);
  });
});
