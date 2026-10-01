// Guard against `0 && <jsx>` render leaks in SEL tools.
//
// `cond && h(...)` renders a literal "0" when cond is the NUMBER zero, because
// React treats 0 as a renderable child (unlike false / null / undefined).
//
// Emotion Zones shipped one: the post-save re-check offer was guarded by
// `lastSaveTs && ...`, and `lastSaveTs` is `d.lastSaveTs || 0`. Before a
// student's first save that guard evaluated to 0, so a bare "0" floated under
// the zone cards — on the default tab, on first open, for every student.
//
// No static check can find these. The guard is syntactically identical to a
// correct boolean one, and whether it bites depends on runtime state. The gate
// instruments createElement during a real render of all 72 tools at their
// initial state, which is exactly the state a student meets on first open.
//
// It also distinguishes a LEAK from a legitimate numeric display: a stat card
// rendering the number 0 as its only child is correct, and 17 of those were
// flagged before the detector learned the difference.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const GATE = resolve(process.cwd(), 'dev-tools/check_sel_numeric_render_leak.cjs');
const ZONES = resolve(process.cwd(), 'sel_hub/sel_tool_zones.js');
const ZONES_MIRROR = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_zones.js');

function runGate() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [GATE, '--quiet'], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 240000 }) };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

describe('SEL numeric render leaks', () => {
  const result = runGate();

  it('renders every SEL tool while checking', () => {
    // A collapse here would make the pass below vacuous.
    expect(result.out).toMatch(/across (\d+) SEL tools/);
    const rendered = Number(/across (\d+) SEL tools/.exec(result.out)?.[1] ?? 0);
    expect(rendered).toBeGreaterThan(60);
  });

  it('finds no stray numeric render', () => {
    expect(result.out, result.out.slice(0, 2000)).not.toMatch(/NUMERIC-RENDER-LEAK/);
    expect(result.code).toBe(0);
  });

  it('keeps the Emotion Zones re-check guard boolean', () => {
    const src = readFileSync(ZONES, 'utf8');
    // `lastSaveTs` is `d.lastSaveTs || 0`, so a bare `lastSaveTs &&` leaks a 0.
    expect(src).toContain('(lastSaveTs > 0 && (Date.now() - lastSaveTs) < 90000');
    expect(src).not.toContain('(lastSaveTs && (Date.now() - lastSaveTs)');
  });

  it('keeps the Emotion Zones source and mirror byte-identical', () => {
    expect(readFileSync(ZONES_MIRROR, 'utf8')).toBe(readFileSync(ZONES, 'utf8'));
  });
});
