import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// renderer.dispose() frees GPU objects but leaves the WebGL CONTEXT alive until the canvas is garbage collected.
// Chromium caps concurrent contexts at about 16 and the lab has some twenty 3D tools, so a student who opens a
// few in a row gets an earlier tool's context evicted ("Too many active WebGL contexts. Oldest context will be
// lost.") and that tool paints black on return. Measured 2026-09-13 with scratch/probe_gl_release.mjs: 20
// mount/unmount cycles of Molecule Lab or Echo Navigator produced four evictions before the sweep and none after.
//
// Every tool that constructs a WebGLRenderer must release the context on unmount: either its own
// forceContextLoss in a mount-scoped effect (Particle Lab's pattern) or the host's StemLab.releaseGl right after
// dispose(), which loses the context on the next tick only if the canvas has left the document, so a scene
// rebuilt on the same, still-attached canvas keeps its context.

const ROOT = process.cwd();
// Pets was mid-feature in another session when the sweep ran (uncommitted care-sim work); it still leaks.
const DEFERRED = ['stem_tool_pets.js'];

describe('STEM Lab WebGL context release (sweep)', () => {
  const tools = readdirSync(resolve(ROOT, 'stem_lab')).filter((name) => /^stem_tool_.*\.js$/.test(name));
  const withRenderer = tools.filter((name) => /new THREE\.WebGLRenderer\(/.test(readFileSync(resolve(ROOT, 'stem_lab', name), 'utf8')));

  it('finds the 3D tools at all', () => {
    expect(withRenderer.length).toBeGreaterThanOrEqual(25);
  });

  it('every tool that builds a WebGLRenderer releases its context, in root and in the desktop mirror', { timeout: 60000 }, () => {
    const leaking = [];
    for (const name of withRenderer) {
      if (DEFERRED.includes(name)) continue;
      for (const dir of ['stem_lab', 'desktop/web-app/public/stem_lab']) {
        const source = readFileSync(resolve(ROOT, dir, name), 'utf8');
        const releases = /forceContextLoss\(\)/.test(source) || /StemLab\.releaseGl\(/.test(source);
        if (!releases) leaking.push(dir + '/' + name);
      }
    }
    expect(leaking, 'add `if (window.StemLab && window.StemLab.releaseGl) window.StemLab.releaseGl(renderer);` after renderer.dispose()').toEqual([]);
  });

  it('keeps the deferred list honest', () => {
    for (const name of DEFERRED) {
      const source = readFileSync(resolve(ROOT, 'stem_lab', name), 'utf8');
      expect(/forceContextLoss\(\)|StemLab\.releaseGl\(/.test(source), name + ' now releases its context: drop it from DEFERRED').toBe(false);
    }
  });

  it('the host helper loses the context only once the canvas has left the document', () => {
    for (const dir of ['stem_lab', 'desktop/web-app/public/stem_lab']) {
      const host = readFileSync(resolve(ROOT, dir, 'stem_lab_module.js'), 'utf8');
      const at = host.indexOf('releaseGl: function (renderer) {');
      expect(at, dir + ' host module exposes releaseGl').toBeGreaterThan(-1);
      const body = host.slice(at, at + 700);
      expect(body).toContain('if (canvas.isConnected) return;');
      expect(body).toContain('renderer.forceContextLoss();');
      expect(body).toContain('window.setTimeout(');
    }
  });
});
