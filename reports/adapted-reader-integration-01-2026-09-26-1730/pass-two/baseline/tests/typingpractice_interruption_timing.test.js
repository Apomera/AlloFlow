import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js'), 'utf8');

describe('Typing Practice resume timing integrity', () => {
  it('counts time away from a saved draft as paused time', () => {
    expect(source).toContain('var resumePausedMs = resumeDraft ?');
    expect(source).toContain('var draftSavedAt = Date.parse(resumeDraft.savedAt);');
    expect(source).toContain('resumePausedMs += Math.max(0, Date.now() - draftSavedAt);');
  });

  it('keeps the desktop mirror aligned with the timing safeguard', () => {
    expect(mirror).toBe(source);
  });
});
