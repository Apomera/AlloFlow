import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'behavior_lens_module.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'behavior_lens_module.js');

describe('Behavior Lens Graph Engine input accessibility', () => {
  it('names the CSV, Y-axis, and X-axis configuration controls in both mirrors', () => {
    const expected = [
      "'aria-label': tt('behavior_lens.ui.session_data_csv_input', 'Session data CSV input')",
      "'aria-label': tt('behavior_lens.ui.yaxis_label_input', 'Y-axis label')",
      "'aria-label': tt('behavior_lens.ui.xaxis_label_input', 'X-axis label')"
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
