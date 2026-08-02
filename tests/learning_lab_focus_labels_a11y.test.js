import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_learning_lab.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_learning_lab.js';

describe('Learning Lab focus and field semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('retains the shared focus-visible indicator while removing inline outline suppression', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('[data-ll-focusable]:focus-visible');
    expect(source).not.toContain("outline: 'none'");
  });

  it('gives reusable input and textarea helpers a programmatic name', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': (extra && extra['aria-label']) || placeholder || 'Learning Lab input'");
    expect(source).toContain("'aria-label': (extra && extra['aria-label']) || placeholder || 'Learning Lab response'");
  });
});
