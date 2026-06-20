// SEL FERPA export gate (SEL-PRIV-1).
//
// The project-save FERPA gate in phase_k_helpers must warn + mark _CONFIDENTIAL
// not only for audio but also for SEL mental-health TEXT (journals, reflections,
// safety plan) carried in selToolData/selProgress — which previously exported
// silently. The full executeSaveFile isn't unit-testable here, so we (1) guard the
// built module against regression and (2) pin the detection regex's contract.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.join(process.cwd(), 'phase_k_helpers_module.js'), 'utf8');

describe('SEL FERPA export gate (SEL-PRIV-1)', () => {
  it('the built module gates SEL mental-health text, not just audio', () => {
    expect(SRC).toContain('_hasSelText');
    expect(SRC).toMatch(/selToolData|selProgress/);
    expect(SRC).toMatch(/reflections, journal entries, or safety plan/i);
    expect(SRC).toMatch(/CONFIDENTIAL/);
  });

  it('detection matches non-empty SEL data but not empty/absent/non-SEL', () => {
    const hasSel = (s) => /"selToolData"\s*:\s*\{\s*"/.test(s) || /"selProgress"\s*:\s*\{\s*"/.test(s);
    expect(hasSel('{\n  "selToolData": {\n    "crisiscompanion": { "safetyPlan": { "x": 1 } }\n  }\n}')).toBe(true);
    expect(hasSel('{\n  "selProgress": {\n    "journal": "today I felt"\n  }\n}')).toBe(true);
    expect(hasSel('{\n  "selToolData": {}\n}')).toBe(false);    // empty SEL data → no gate
    expect(hasSel('{\n  "selToolData": null\n}')).toBe(false);   // absent → no gate
    expect(hasSel('{\n  "history": [1, 2, 3]\n}')).toBe(false);  // ordinary lesson → no gate
  });
});
