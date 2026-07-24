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

  it('keeps Firebase deployment opt-in and never assigns the maintainer proxy', () => {
    const firebaseRc = JSON.parse(read('desktop/web-app/.firebaserc'));
    expect(firebaseRc.projects.default).toBe('YOUR_PROJECT_ID');

    for (const sourcePath of appSources) {
      const source = read(sourcePath);
      expect(source).not.toContain(
        "window.ALLOFLOW_CANVAS_SEARCH_PROXY = 'https://prismflow-911fe.web.app/api/searchProxy'",
      );
      expect(source).toContain('Canvas compatibility search is opt-in');
    }
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
