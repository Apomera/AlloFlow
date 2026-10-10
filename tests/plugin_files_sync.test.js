// PLUGIN_FILES ↔ git sync gate (audit B4/B5, 2026-06-28). build.js's PLUGIN_FILES is the set of
// stem_lab/sel_hub plugins whose CDN cache-bust hash build.js bumps on --mode=prod. A plugin on disk but
// MISSING from PLUGIN_FILES serves STALE forever with no signal (dinolab/lumen, B4); a DUPLICATE entry
// (atcTower ×2, B5) or a CASING mismatch vs the git filename (atcTower/algebraCAS — camelCase entries that
// 404 / never get hashed on case-sensitive CDNs) are the same silent-failure class. dev-tools/
// check_plugin_files.cjs is the blocking deploy gate; this runs it in CI so drift is caught on every test
// run, not only at deploy time, and pins that it stays wired into deploy.sh.
import { afterEach, describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const fixtures = [];
afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    if (!resolve(fixture).startsWith(resolve(tmpdir()) + sep) || !basename(fixture).startsWith('alloflow-plugin-files-')) throw new Error('Unexpected fixture directory');
    rmSync(fixture, { recursive: true, force: true });
  }
});

describe('PLUGIN_FILES ↔ git sync gate', () => {
  it('the gate script exists and is wired into deploy.sh Step 0.6', () => {
    expect(existsSync(resolve(root, 'dev-tools/check_plugin_files.cjs'))).toBe(true);
    expect(readFileSync(resolve(root, 'deploy.sh'), 'utf8')).toContain('check_plugin_files.cjs');
  });
  it('PLUGIN_FILES has NO drift (no dups, dead entries, casing 404s, or stale-CDN plugins)', () => {
    // runs the REAL gate; exit 0 = in sync, non-zero throws → drift present.
    expect(() => execFileSync('node', ['dev-tools/check_plugin_files.cjs', '--quiet'], { cwd: root })).not.toThrow();
  });
  it('recognizes Perception companions and rejects one omitted from the build manifest', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'alloflow-plugin-files-'));
    fixtures.push(fixture);
    mkdirSync(join(fixture, 'dev-tools')); mkdirSync(join(fixture, 'stem_lab'));
    const checker = join(fixture, 'dev-tools/check_plugin_files.cjs');
    writeFileSync(checker, readFileSync(resolve(root, 'dev-tools/check_plugin_files.cjs')));
    const files = ['perception_gallery.js', 'perception_gallery_scene.js', 'perception_walk.js', 'perception_walk_scene.js'];
    files.forEach(file => writeFileSync(join(fixture, 'stem_lab', file), ''));
    execFileSync('git', ['init', '-q'], { cwd: fixture });
    execFileSync('git', ['add', '--', 'stem_lab'], { cwd: fixture });
    const manifest = list => 'const PLUGIN_FILES = [' + list.map(file => "'stem_lab/" + file + "'").join(',') + '];';
    writeFileSync(join(fixture, 'build.js'), manifest(files));
    expect(() => execFileSync(process.execPath, [checker, '--quiet'], { cwd: fixture, stdio: 'pipe' })).not.toThrow();
    writeFileSync(join(fixture, 'build.js'), manifest(files.slice(0, 3)));
    expect(() => execFileSync(process.execPath, [checker, '--quiet'], { cwd: fixture, stdio: 'pipe' })).toThrow();
  });
});
