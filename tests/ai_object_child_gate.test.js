// The object-child gate runs in CI, and is proven non-vacuous here (2026-09-15).
//
// dev-tools/check_ai_object_child_render.cjs sweeps the surfaces that render model output for
// AI values passed straight to React as children. That crash class blanked Aaron's Curriculum
// Audit on 2026-09-13 and was then found in the research lanes and the visual organizers.
//
// A gate nobody runs is not a gate, so this test invokes it. And a gate that cannot fail is
// worse than none, so the second case MUTATES a guard out of a real source, asserts the gate
// goes red, and restores the file — the failure mode this repo has been bitten by before
// (a pin that passes for free teaches people to trust a green that means nothing).
import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The gate reads 87 sources, several of them multi-megabyte, from OneDrive-synced storage:
// measured 7s to 27s per run depending on the sync state, and this file runs it six times.
// The default 5s timeout is not a real signal here, so allow for the slow case.
vi.setConfig({ testTimeout: 180000 });

const GATE = resolve(process.cwd(), 'dev-tools/check_ai_object_child_render.cjs');

function runGate() {
  try {
    const stdout = execFileSync(process.execPath, [GATE, '--quiet'], { encoding: 'utf8' });
    return { code: 0, stdout };
  } catch (error) {
    return { code: error.status ?? 1, stdout: String(error.stdout || '') };
  }
}

// Swap one exact string in a source file, run the gate, then put the file back byte-for-byte.
function withMutation(relativePath, from, to, assertion) {
  const abs = resolve(process.cwd(), relativePath);
  const original = readFileSync(abs, 'utf8');
  expect(original.includes(from), `${relativePath} should still contain the guard: ${from}`).toBe(true);
  try {
    writeFileSync(abs, original.replace(from, to), 'utf8');
    assertion(runGate());
  } finally {
    writeFileSync(abs, original, 'utf8');
  }
  expect(readFileSync(abs, 'utf8')).toBe(original);
}

describe('AI object-child gate', () => {
  it('passes on the current tree', () => {
    const { code, stdout } = runGate();
    expect(stdout, stdout).toContain('no unguarded AI children');
    expect(code).toBe(0);
  });

  it.each([
    ['the audit report list guard', 'view_alignment_report_source.jsx', 'return <li key={i}>{auditText(s)}</li>;', 'return <li key={i}>{s}</li>;'],
    ['a research-lane scalar guard', 'research_lane_scientific_source.jsx', '{aiScalarText(data.entities_question)}', '{data.entities_question}'],
    ['the humanities analog-domain guard', 'research_lane_humanities_source.jsx', '{aiScalarText(data.analog_domain_shape.example_claim_shape)}', '{data.analog_domain_shape.example_claim_shape}'],
    ['the glossary syllable guard', 'view_glossary_source.jsx', '{glossaryAiText(syl)}', '{syl}'],
    ['the level-check reason guard', 'view_simplified_source.jsx', '{simplifiedAiText(data.reason)}', '{data.reason}'],
    // The audit report reaches llmReview through a one-letter local (`var a = p.access`),
    // so an anchored root pattern could not see these six sites at all. The gate now
    // allows one alias hop in front of llmReview; this case proves that hop works.
    ['an aliased llmReview narrative guard', 'view_alignment_report_source.jsx', '{auditText(a.llmReview.narrative)}</p>}', '{a.llmReview.narrative}</p>}'],
  ])('goes red when %s is removed', (_label, file, from, to) => {
    withMutation(file, from, to, ({ code, stdout }) => {
      expect(stdout, stdout).toContain('unguarded AI child render');
      expect(code).toBe(1);
    });
  });

  it('is green again after every mutation is reverted', () => {
    expect(runGate().code).toBe(0);
  });
});
