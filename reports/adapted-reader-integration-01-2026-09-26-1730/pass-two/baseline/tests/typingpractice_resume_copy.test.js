import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js'), 'utf8');

describe('Typing Practice recovery copy', () => {
  it('distinguishes completed sessions from private resume drafts', () => {
    expect(source).toContain('Completed sessions save when you finish; unfinished practice can be resumed privately later.');
  });

  it('keeps the copy synchronized in the desktop mirror', () => {
    expect(mirror).toBe(source);
  });
});
