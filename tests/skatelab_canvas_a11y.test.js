import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_skatelab.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_skatelab.js';

describe('Skate Lab motion canvas semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the simulation canvas and retains its dynamic scene label', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    // The static "Interactive skate motion simulation canvas" label this used to
    // require was a SECOND aria-label in the same props object. Duplicate keys
    // are legal JavaScript and the last wins, so it never reached the DOM; only
    // the dynamic scene label ever did. Assert what the element really exposes.
    const at = source.indexOf("'aria-label': (function() {");
    expect(at, 'canvas should carry the dynamic scene label').toBeGreaterThan(-1);
    const opener = source.lastIndexOf("h('canvas'", at);
    expect(opener).toBeGreaterThan(-1);
    const props = source.slice(opener, at);
    expect(props, 'canvas should declare role="img"').toMatch(/role:\s*'img'/);
    expect((props.match(/'aria-label'\s*:/g) || []).length,
      'canvas should declare aria-label once, not twice').toBe(0);
    expect(source).toContain("'aria-describedby': 'sk-canvas-summary'");
  });
});
