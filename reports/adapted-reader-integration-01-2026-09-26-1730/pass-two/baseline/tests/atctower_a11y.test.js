import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_atctower.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_atctower.js';

describe('ATC Tower control and status semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('labels both slider groups and exposes status rings as images', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect((source.match(/'aria-label': s\.label/g) || []).length).toBe(2);
    expect(source).toContain("role: 'img', 'aria-label': ring.label + ': ' + ring.num");
  });
});
