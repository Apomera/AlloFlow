import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_behaviorlab.js');

// A real-browser probe (dev-tools/mobile_target_probe.mjs, iPhone viewport) found
// 17 controls under the WCAG 2.5.5 44x44 floor on the intro screen alone: the
// Plain/Technical register chips at 22px tall, the five schedule chips at 23px,
// Log/Reset, the "I'm stuck" button, three range sliders at 16px, a 13px
// checkbox and the hypothesis textarea. This is a classroom tool used on phones.
//
// Source-text assertions, because the probe needs a browser and this has to fail
// in the ordinary unit run. The probe stays the instrument of record; this gate
// stops a silent regression between probe runs.
describe('Behavior Lab touch target floor', () => {
  const src = fs.readFileSync(sourcePath, 'utf8');

  it('gives the register chips a 44px floor', () => {
    // The control a learner who needs the plain wording has to hit.
    expect(src).toMatch(/minHeight: 44, padding: '2px 12px', borderRadius: '999rem'/);
  });

  it('gives the inquiry widget controls a 44px floor', () => {
    // Schedule chips (CRF/FR3/VR5/FI30/VI30), Log, Reset, "I'm stuck".
    const floored = (src.match(/minHeight: 44/g) || []).length;
    expect(floored, 'a control lost its 44px floor').toBeGreaterThanOrEqual(6);
  });

  it('makes the range sliders and the checkbox thumb-sized', () => {
    // Native range tracks measure ~16px and a native checkbox 13px.
    const ranges = (src.match(/width: '100%', height: 44/g) || []).length;
    expect(ranges, 'a range slider is back to its 16px native height').toBe(3);
    expect(src).toMatch(/type: 'checkbox'[\s\S]{0,220}width: 24, height: 24/);
  });

  it('keeps the back control a 44px square', () => {
    expect(src).toMatch(/minWidth: 44, minHeight: 44/);
  });

  it('leaves no bare 3px-padded mini button in the inquiry widget', () => {
    // The shape that produced the 23px chips: tiny padding, no floor.
    expect(src).not.toMatch(/padding: '3px 8px', fontSize: 10, fontWeight: 700, borderRadius: 4/);
  });
});
