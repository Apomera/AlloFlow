import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js'), 'utf8');

describe('Typing Practice exit recovery copy', () => {
  it('explains that Escape saves a private draft instead of discarding work', () => {
    expect(source).toContain('Save a private resume draft and return to the menu');
    expect(source).toContain('A private resume draft was saved; no completed session was counted.');
    expect(source).toContain('private resume draft is ready when you return.');
  });

  it('keeps exit messaging synchronized in the desktop mirror', () => {
    expect(mirror).toBe(source);
  });
});
