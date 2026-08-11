// Suite-integrated wrapper for the two static component-identity gates:
//
//   dev-tools/scan_hook_order_branches.cjs      — hooks declared in a
//     conditional view branch of a tool's inline render() (React #310/#300;
//     shipped 3× before the gate existed: swimlab, firstresponse, petsLab).
//   dev-tools/scan_render_scoped_components.cjs — components DEFINED inside
//     render() and used via createElement, whose per-render identity remounts
//     the view and wipes local state on any toolData write (82 fixed
//     2026-08-11 via the stableType() shim).
//
// Both scanners exit 1 on findings and 0 when clean. Running them here means
// any `vitest run tests/` sweep catches a regression — deploy.sh runs no
// vitest, and standalone gates only work when someone remembers them.
// Runtime walks live in stem_view_identity_stability / *_hook_order tests;
// these static gates are the wide net across all 140 tool files.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

function runGate(script) {
  try {
    const out = execFileSync('node', [resolve(process.cwd(), script)], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 120_000,
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

describe('static component-identity gates (all stem tools)', () => {
  it('no hooks in conditional view branches (scan_hook_order_branches)', () => {
    const r = runGate('dev-tools/scan_hook_order_branches.cjs');
    expect(r.code, 'scanner findings:\n' + r.out).toBe(0);
  }, 150_000);

  it('no stateful per-render component identities (scan_render_scoped_components)', () => {
    const r = runGate('dev-tools/scan_render_scoped_components.cjs');
    expect(r.code, 'scanner findings:\n' + r.out).toBe(0);
  }, 150_000);
});
