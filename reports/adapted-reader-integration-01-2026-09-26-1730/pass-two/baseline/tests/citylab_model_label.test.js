// City Planning Lab — the 3D model must have a name.
//
// The shared viewer shell marks its WebGL canvas aria-hidden, so the mount
// point is what assistive technology has to work with. It carried no role and
// no accessible name, while 176 other elements in this tool are labelled — and
// the author had already given every camera move a button ("Drag is not a path
// everyone has"), so the intent was there. The view itself was the gap.
//
// These are SOURCE tests on purpose. The 3D block only renders when
// `window.StemLab.makeOrbitViewer` exists, and the smoke harness loads tool
// files without the host module, so it always takes the documented no-WebGL
// fallback instead. A render-based test here would assert against a branch the
// harness can never reach and would pass whatever the label said.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_citylab.js', 'utf8');

// The element that the viewer attaches into.
function mountBlock() {
  const at = SRC.indexOf('ref: cityViewerAttach,');
  expect(at, 'the 3D mount point was not found').toBeGreaterThan(-1);
  // Up to the end of this createElement props object.
  const end = SRC.indexOf('}),', at);
  expect(end).toBeGreaterThan(at);
  return SRC.slice(at, end);
}

describe('the 3D model is reachable without sight', () => {
  it('names the mount point', () => {
    const block = mountBlock();
    expect(block).toContain("role: 'img'");
    expect(block).toContain('aria-label');
  });

  it('describes what the model actually draws', () => {
    // buildCityScene masses each parcel as a box, marks flood exposure ON the
    // parcel, and draws water sheets for the mapped flood line. A label that
    // described something else would be worse than none.
    const block = mountBlock();
    expect(block).toMatch(/parcel/i);
    expect(block).toMatch(/flood/i);
    expect(block).toMatch(/zoning|height/i);
  });

  it('points at the equivalents rather than pretending the canvas is operable', () => {
    // The viewer's own failMessage already names them. The label should agree
    // with it rather than inventing a different set of alternatives.
    const block = mountBlock();
    expect(block).toMatch(/parcel table/i);
    expect(block).toMatch(/camera/i);
    // The failMessage is wrapped across two source lines, so match its halves.
    expect(SRC).toContain('The map and the parcel ');
    expect(SRC).toContain('table show the same plan.');
  });

  it('goes through t(), like every other string in this tool', () => {
    // 60 other keys here use the inline-fallback idiom; a bare English literal
    // would be the one string a translator never sees.
    expect(mountBlock()).toContain("t('stem.citylab.");
  });

  it('keeps the loading message OUT of the labelled element', () => {
    // role="img" makes a subtree presentational. The status line must stay a
    // SIBLING, or the one thing a stalled viewer still has to say goes silent.
    const at = SRC.indexOf('ref: cityViewerAttach,');
    const after = SRC.slice(at, at + 900);
    // The props object closes, the element closes, and THEN glStatus is tested.
    expect(after).toMatch(/\}\),\s*\n\s*glStatus === 'loading'/);
  });

  it('still keeps the no-WebGL fallback intact', () => {
    // The label is not a substitute for the fallback: a device without WebGL
    // gets the map and the table, and that path must not have been disturbed.
    expect(SRC).toContain('var failed = !CITY_VIEWER || glStatus === ');
    expect(SRC).toContain('The 3D model is not available on this device.');
  });
});
