import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'escape_room_module.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'escape_room_module.js');

describe('Escape Room preview editor accessibility', () => {
  it('names puzzle, option, hint, and final-door editor inputs in both mirrors', () => {
    const expected = [
      "'aria-label': editLabel + ' for puzzle ' + (idx + 1)",
      "'aria-label': 'Option ' + String.fromCharCode(65 + optIdx) + ' for puzzle ' + (idx + 1)",
      "'aria-label': 'Hint for puzzle ' + (idx + 1)",
      "'aria-label': 'Final door puzzle sentence'"
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
