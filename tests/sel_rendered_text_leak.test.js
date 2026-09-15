// Guard against broken values reaching the screen as text in SEL tools.
//
// Sibling of tests/sel_numeric_render_leak.test.js. Both catch the same family:
// the tool renders successfully — so check_sel_render passes — but a bad VALUE
// is displayed to a student. Static scans are blind to these because the
// template is correct and only the runtime value is wrong.
//
// Care Constellations shipped one: its category picker rendered
//     c.icon + ' ' + h('span', null, '')
// and string-concatenating a React element yields "[object Object]", so all
// eight category buttons on the Add view read "🏠 [object Object]".
//
// The gate renders every tool across its own tab ids, not just the default
// view, because that is where state-dependent leaks hide.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const GATE = resolve(process.cwd(), 'dev-tools/check_sel_rendered_text_leak.cjs');
const CARE = resolve(process.cwd(), 'sel_hub/sel_tool_careconstellations.js');
const CARE_MIRROR = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_careconstellations.js');

function runGate() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [GATE], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 240000 }) };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

describe('SEL rendered-text leaks', () => {
  const result = runGate();

  it('renders the whole tool set while checking', () => {
    const rendered = Number(/tools rendered: (\d+)/.exec(result.out)?.[1] ?? 0);
    // Guards against a silent collapse making the assertion below vacuous.
    // If this fails with rendered=0 the child process did not produce output —
    // under heavy parallel load several gate-runner suites can starve each
    // other. That is an environment problem, not a leak; the message says so
    // rather than leaving a future reader to suspect the tools.
    expect(rendered, rendered === 0
      ? `gate produced no output (exit ${result.code}) — likely resource starvation, not a leak:
${result.out.slice(0, 600)}`
      : result.out.slice(0, 600)).toBeGreaterThan(60);
  });

  it('shows no undefined, NaN, [object Object] or null to a student', () => {
    expect(result.out, result.out.slice(0, 2000)).not.toMatch(/RENDERED-TEXT-LEAK/);
    expect(result.code).toBe(0);
  });

  it('renders the Care Constellations category icon without concatenating an element', () => {
    const src = readFileSync(CARE, 'utf8');
    expect(src).not.toContain("c.icon + ' ' + h('span', null, '')");
    expect(src).toContain("h('div', { 'aria-hidden': 'true', style: { fontSize: 14 } }, c.icon)");
  });

  it('keeps the Care Constellations source and mirror byte-identical', () => {
    expect(readFileSync(CARE_MIRROR, 'utf8')).toBe(readFileSync(CARE, 'utf8'));
  });
});
