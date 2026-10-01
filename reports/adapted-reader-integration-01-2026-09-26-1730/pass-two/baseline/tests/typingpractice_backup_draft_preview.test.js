import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js'), 'utf8');

describe('Typing Practice backup draft transparency', () => {
  it('discloses unfinished resume drafts in backup copy', () => {
    expect(source).toContain('any unfinished private resume draft');
    expect(source).toContain("var draftNotice = parsed.state.interruptedDrill ?");
    expect(source).toContain('private unfinished resume draft.');
  });

  it('keeps the deployed mirror aligned with backup copy', () => {
    expect(mirror).toBe(source);
  });
});
