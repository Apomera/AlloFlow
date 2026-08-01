import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'behavior_lens_module.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'behavior_lens_module.js');

describe('Behavior Lens custom report dates accessibility', () => {
  it('names the custom report start and end date inputs in both mirrors', () => {
    const expected = [
      "'aria-label': 'Custom report start date'",
      "'aria-label': 'Custom report end date'"
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
