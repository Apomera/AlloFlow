import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_spacecolony.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_spacecolony.js';

describe('Space Colony life-support semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names subsystem gauges, scopes the log header, and labels the hypothesis', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'img', 'aria-label': 'Life-support subsystem balance gauges'");
    expect(source).toContain("scope: 'col'");
    expect(source).toContain("'aria-label': 'Space colony subsystem hypothesis'");
  });
});
