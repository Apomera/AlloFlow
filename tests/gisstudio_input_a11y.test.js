import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

// Mounted jsdom work here is slow under a full parallel suite run, and the
// 5 s default timeout fails random tests without anything being wrong. Each
// file finishes in about a second on its own; this only removes the starvation.
vi.setConfig({ testTimeout: 20000 });

const sourcePath = 'stem_lab/stem_tool_gisstudio.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_gisstudio.js';

describe('GIS Studio buffer control semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the buffer radius input in kilometers', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain(`'aria-label': __alloT('stem.gisstudio.a11y_buffer_radius_in_kilometers', 'Buffer radius in kilometers')`);
  });
});
