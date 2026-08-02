import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_volume.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_volume.js';

describe('Volume Lab WebGL canvas semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the 3D volume model and retains its stateful label', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'img', 'aria-label': 'Interactive 3D volume model'");
    expect(source).toContain("'aria-label': (function() {");
    expect(source).toContain("'aria-describedby': 'volume-gl-description'");
  });
});
