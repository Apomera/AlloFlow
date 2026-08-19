import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const files = [
  path.join(process.cwd(), 'escape_room_module.js'),
  path.join(process.cwd(), 'desktop/web-app', 'public', 'escape_room_module.js')
];

describe('Collaborative Escape Room puzzle mix', () => {
  it('requires an explicit balanced mix and prepares every non-MCQ type', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain('use exactly 2 "mcq", 2 "sequence", 2 "matching", 2 "fillin", 1 "cipher", and 1 "scramble"');
      expect(source).toContain('var expectedCounts = { mcq: 2, sequence: 2, matching: 2, fillin: 2, cipher: 1, scramble: 1 };');
      expect(source).toContain('\"id\": \"obj10\"');
      expect(source).toContain('Unbalanced collaborative puzzle mix');
      expect(source).toContain('type: normalizedType,');
      expect(source).toContain("if (normalizedType === 'matching' && p.pairs)");
      expect(source).toContain("if ((normalizedType === 'fillin' || normalizedType === 'cipher') && p.wordbank)");
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(files[0], 'utf8')).toBe(fs.readFileSync(files[1], 'utf8'));
  });
});
