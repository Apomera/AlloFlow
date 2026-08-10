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

  it('gives the field canvas exactly one label, the dynamic one', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    // This previously required BOTH a static "scanner-visible" label and the
    // dynamic one, in the same props object. That cannot work: duplicate keys
    // are legal JavaScript and the LAST wins, so the static label never reached
    // the DOM — it only ever satisfied this source-text assertion. The real
    // audit (dev-tools/check_stem_a11y.cjs) reads the rendered element, and it
    // passes on the dynamic label alone.
    // Anchor on the canvas's own marker: "'aria-label': isSoccer" alone also
    // matches a role="group" div several hundred lines earlier.
    const marker = source.indexOf("'data-playlab-canvas': 'true'");
    expect(marker, 'field canvas marker should exist').toBeGreaterThan(-1);
    const opener = source.lastIndexOf("h('canvas'", marker);
    expect(opener, 'marker should sit inside a canvas element').toBeGreaterThan(-1);
    const endOfProps = source.indexOf('onMouseDown: handleMouseDown', marker);
    expect(endOfProps).toBeGreaterThan(marker);
    const props = source.slice(opener, endOfProps);

    expect(props, 'field canvas should declare role="img"').toMatch(/role:\s*'img'/);
    expect(props, 'field canvas should carry the dynamic label').toContain("'aria-label': isSoccer");
    expect((props.match(/'aria-label'\s*:/g) || []).length,
      'canvas should declare aria-label exactly once').toBe(1);
  });
});
