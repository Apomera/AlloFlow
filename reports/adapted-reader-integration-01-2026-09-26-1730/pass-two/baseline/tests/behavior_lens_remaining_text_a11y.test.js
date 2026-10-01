import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'behavior_lens_module.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'behavior_lens_module.js');

describe('Behavior Lens remaining text-field accessibility', () => {
  it('names consultation, behavior-definition, wizard, and BIP text fields in both mirrors', () => {
    const expected = [
      "'aria-label': 'Additional consultation notes'",
      "'aria-label': 'Examples of the target behavior'",
      "'aria-label': 'Non-examples of the target behavior'",
      "'aria-label': tt('behavior_lens.ui.design_wizard_research_question', 'Design wizard research question')",
      "'aria-label': 'Editable behavior intervention plan document'"
    ];
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      for (const value of expected) expect(source).toContain(value);
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
