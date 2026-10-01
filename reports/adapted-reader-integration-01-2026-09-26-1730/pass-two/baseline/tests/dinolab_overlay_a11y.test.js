// Dino Lab — the anatomy overlay is decoration and must say so.
//
// The Field Station draws leader lines and rings from each anatomy label to
// its point on the 3D model. That SVG carries no information of its own: the
// labels are real buttons and spans beside it, and the model's canvas has its
// own role and description. But with no role and no name the graphic still
// surfaced to a screen reader as an unlabelled <svg> — noise between two
// things that were already announced properly.
//
// The sibling SVG in this tool (the small period sparkline) already sets
// aria-hidden and focusable="false". This one was the exception.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function svgTags() {
  return [...SRC.matchAll(/el\('svg', \{([^}]*)\}/g)].map((m) => m[1]);
}

describe('decorative SVG is hidden, informative SVG is not', () => {
  it('finds the SVGs this tool draws', () => {
    expect(svgTags().length).toBeGreaterThanOrEqual(2);
  });

  it('hides every SVG that carries no information of its own', () => {
    // Both SVGs here are decoration over content that is already text. If a
    // future one is informative it should get a role and a name instead — and
    // this test should then be narrowed rather than deleted.
    const unhidden = svgTags().filter((t) => !/aria-hidden/.test(t));
    expect(unhidden, 'an SVG with neither aria-hidden nor a name: ' + unhidden.join(' | '))
      .toEqual([]);
  });

  it('keeps hidden SVGs out of the tab order', () => {
    // aria-hidden alone is not enough: an SVG can still be focusable in some
    // browsers, which lands a keyboard user on a thing screen readers ignore.
    const hidden = svgTags().filter((t) => /aria-hidden/.test(t));
    const focusable = hidden.filter((t) => !/focusable: 'false'/.test(t));
    expect(focusable, 'hidden SVG still focusable: ' + focusable.join(' | ')).toEqual([]);
  });

  it('leaves the anatomy part labels as real text', () => {
    // This is WHY the overlay can be hidden. If the labels ever moved into the
    // SVG, hiding it would silence them.
    expect(SRC).toContain('data-dino-part-label');
    expect(SRC).toMatch(/part\.label/);
  });

  it('keeps the 3D model canvas described', () => {
    // The canvas is the informative graphic in this tab and must stay named.
    expect(SRC).toMatch(/procedural 3D reconstruction viewer/);
    expect(SRC).toMatch(/role: 'application'/);
  });
});
