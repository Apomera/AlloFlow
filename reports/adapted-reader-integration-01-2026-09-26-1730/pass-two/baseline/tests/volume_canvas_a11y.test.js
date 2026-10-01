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
    // The static "Interactive 3D volume model" label this used to require was a
    // SECOND aria-label in the same props object. Duplicate keys are legal
    // JavaScript and the last wins, so it never reached the DOM — only the
    // stateful label did. Assert what the element actually exposes, and that the
    // duplicate does not come back.
    const marker = source.indexOf("'data-volume-gl': 'true'");
    expect(marker, 'GL canvas marker should exist').toBeGreaterThan(-1);
    const opener = source.lastIndexOf("h('canvas'", marker);
    expect(opener, 'marker should sit inside a canvas element').toBeGreaterThan(-1);
    const labelAt = source.indexOf("'aria-label': (function() {", marker);
    expect(labelAt, 'GL canvas should carry the stateful label').toBeGreaterThan(marker);

    const props = source.slice(opener, labelAt);
    expect(props, 'GL canvas should declare role="img"').toMatch(/role:\s*'img'/);
    expect(props).toContain("'aria-describedby': 'volume-gl-description'");
    expect((props.match(/'aria-label'\s*:/g) || []).length,
      'GL canvas should declare aria-label exactly once').toBe(0);
  });
});
