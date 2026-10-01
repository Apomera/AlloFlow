import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_echotrainer.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_echotrainer.js');

describe('EchoTrainer inline challenge accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('uses focusable regions for inline tutorial and challenge cards', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    // These used to assert the exact spelling of each card's props, including the
    // tutorial label as a concatenated English string. Localizing that label
    // (announcements and labels in this tool were English-only) changed the
    // spelling without changing anything the cards expose, so assert the three
    // invariants that actually matter per card: role="region", a non-empty
    // accessible name, and tabIndex 0 — and that none has regressed to
    // role="dialog", which traps focus in a card that is not a modal.
    const cards = [
      ['tutorial', /'aria-label':\s*tFmt\('stem\.echotrainer\.aria_tutorial_step'/],
      ['distance challenge', /'aria-label':\s*t\('stem\.echotrainer\.distance_estimation_challenge'/],
      ['material quiz', /'aria-label':\s*t\('stem\.echotrainer\.material_identification_quiz'/],
    ];

    for (const [label, labelPattern] of cards) {
      const m = labelPattern.exec(source);
      expect(m, label + ' should carry an accessible name').not.toBeNull();
      // Look at the props object this label belongs to: from the enclosing h(
      // call up to just past the label.
      const opener = source.lastIndexOf("h('div'", m.index);
      expect(opener, label + ' label should sit on a div').toBeGreaterThan(-1);
      const props = source.slice(opener, m.index + 400);
      expect(props, label + ' should be role="region"').toMatch(/role:\s*'region'/);
      expect(props, label + ' should not be role="dialog"').not.toMatch(/role:\s*'dialog'/);
      expect(props, label + ' should be focusable').toMatch(/tabIndex:\s*0/);
    }
  });
});
