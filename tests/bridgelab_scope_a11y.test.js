import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_bridgelab.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_bridgelab.js';

describe('Bridge Lab table relationships', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('scopes all three data-table header maps as columns', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect((source.match(/scope: 'col'/g) || []).length).toBeGreaterThanOrEqual(3);
  });
});
