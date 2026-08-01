import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'behavior_lens_module.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'behavior_lens_module.js');

describe('Behavior Lens case-study input accessibility', () => {
  it('associates the phase response label with its textarea and names the custom scenario prompt', () => {
    const expectedLabel = "htmlFor: 'behavior-lens-case-response-' + phase.id";
    const expectedId = "id: 'behavior-lens-case-response-' + phase.id";
    const expectedCustom = "'aria-label': tt('behavior_lens.ui.custom_case_scenario', 'Custom case scenario')";
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain(expectedLabel);
      expect(source).toContain(expectedId);
      expect(source).toContain(expectedCustom);
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
