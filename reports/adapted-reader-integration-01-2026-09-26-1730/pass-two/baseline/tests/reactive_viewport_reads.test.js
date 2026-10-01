// Guard against stale render-time viewport reads.
//
// The SEL standard shell hid two header pills with a raw `window.innerWidth`
// read evaluated during render. React does not re-render when innerWidth
// changes, so the pills kept their mount-time state through resize and
// rotation while the rest of the header reflowed.
//
// A sweep of sel_hub/ + stem_lab/ (31 reads) found that was the ONLY genuine
// instance — every other read is a resize handler, a state initialiser, an
// effect, imperative canvas sizing, a ctx-first fallback, or device detection.
// This test keeps it that way, and keeps the gate's own exemption list honest.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const GATE = resolve(process.cwd(), 'dev-tools/check_reactive_viewport_reads.cjs');

function runGate(args = []) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [GATE, ...args], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }) };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

describe('reactive viewport reads', () => {
  const report = JSON.parse(runGate(['--json']).out);

  it('actually scans the tool sources', () => {
    // A collapse here means the scanner stopped matching, which would make the
    // assertion below vacuously true.
    expect(report.scanned).toBeGreaterThan(20);
  });

  it('finds no stale render-time viewport read', () => {
    const detail = report.findings.map((f) => `${f.file}:${f.line} — ${f.snippet}`).join('\n');
    expect(report.findings, detail).toHaveLength(0);
  });

  it('passes overall, with no rotted exemption', () => {
    const { code, out } = runGate();
    expect(out).not.toMatch(/STALE-ALLOWLIST/);
    expect(code, out.slice(0, 1500)).toBe(0);
  });

  it('keeps the SEL shell on reactive state rather than a raw read', () => {
    const src = readFileSync(resolve(process.cwd(), 'sel_hub/sel_hub_module.js'), 'utf8');
    expect(src).toContain('!shellIsCompact && pill(');
    expect(src).toContain("typeof ctx.isCompact === 'boolean'");
    expect(src).toContain('isCompact: isCompact,');
  });

  it('documents a reason for every exemption it grants', () => {
    const gate = readFileSync(GATE, 'utf8');
    const block = gate.slice(gate.indexOf('const ALLOWLIST = ['), gate.indexOf('];', gate.indexOf('const ALLOWLIST = [')));
    const entries = (block.match(/file:/g) || []).length;
    const reasons = (block.match(/reason:/g) || []).length;
    // An exemption without a stated reason is a silencer, not a review.
    expect(reasons).toBe(entries);
  });
});
