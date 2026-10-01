// SEL Hub quote-attribution gate.
//
// Several SEL tools quote named, real, often living people. On 2026-09-14 an
// audit found three of Disability Voices' eight advocate quotes were not in
// their cited sources, and Upstander credited Gandhi with a sentence he never
// said. No existing gate could see any of it: a fabricated quote is a
// well-formed string with a citation next to it.
//
// This runs dev-tools/check_sel_quote_attribution.cjs in-process so a
// regression fails the suite rather than waiting for someone to run the script.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const GATE = resolve(process.cwd(), 'dev-tools/check_sel_quote_attribution.cjs');

function runGate() {
  try {
    const stdout = execFileSync(process.execPath, [GATE, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch (err) {
    // --json still prints a full report on a non-zero exit.
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
}

const BLOCKING = new Set(['known-misattribution', 'conflicting-attribution', 'editorial-tell']);

describe('SEL Hub quote attribution', () => {
  const report = runGate();

  it('audits the full attributed-quote corpus', () => {
    // A collapse here means the extractor stopped matching (a records refactor,
    // a renamed key), which would make every assertion below vacuously true.
    expect(report.audited).toBeGreaterThan(250);
  });

  it('has no blocking attribution defects', () => {
    const blocking = report.findings.filter((f) => BLOCKING.has(f.kind));
    const detail = blocking
      .map((f) => `${f.kind}: "${f.quote}" @ ${f.where.join(', ')} — ${f.detail}`)
      .join('\n');
    expect(blocking, detail).toHaveLength(0);
  });

  it('does not credit Gandhi with the "be the change" paraphrase', () => {
    // The single most-circulated misattribution in English, and it shipped here.
    const upstander = readFileSync(resolve(process.cwd(), 'sel_hub/sel_tool_upstander.js'), 'utf8');
    expect(upstander).not.toContain("quote: 'Be the change you wish to see in the world.'");
    expect(upstander).toContain('If we could change ourselves, the tendencies in the world would also change');
  });

  it('keeps the upstander source and public mirror byte-identical', () => {
    const src = readFileSync(resolve(process.cwd(), 'sel_hub/sel_tool_upstander.js'), 'utf8');
    const pub = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_upstander.js'), 'utf8');
    expect(pub).toBe(src);
  });
});
