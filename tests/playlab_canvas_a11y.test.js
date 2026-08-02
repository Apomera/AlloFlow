import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_playlab.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_playlab.js';

describe('Play Lab field canvas semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('exposes a scanner-visible non-text alternative while retaining the dynamic label', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'img', 'aria-label': 'Interactive play field canvas'");
    expect(source).toContain("'aria-label': isSoccer");
  });
});
