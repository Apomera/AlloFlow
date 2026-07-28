// RoadReady — the simulated road test must not predict the real one.
//
// The result screen scores a 4-minute keyboard drive out of 100 and shows a big
// PASSED banner at 90+. It used to caption that with "You would pass the Maine BMV
// road test at this level".
//
// The 🪪 on that screen is deliberately left alone: it is the Road Test feature's
// icon throughout the tool (module card, journal entries, toasts), not a claim that
// a licence has been issued. The sentence was the problem, not the glyph.
//
// That is a claim about a real licensing exam, made from a browser simulation. The
// Maine BMV road test is scored by an examiner riding in the vehicle, on car
// control, mirror and blind-spot checks, and judgement in live traffic — none of
// which a keyboard can assess. A learner who defers real practice because a game
// told them they would pass is the failure mode, and it is a safety one.
//
// Passing the SIMULATION is a real achievement and the banner still says so. What
// it must not do is forecast the outcome of the statutory test.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'stem_lab/stem_tool_roadready.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_roadready.js';
const CATALOG = 'ui_strings.js';

let source;
let catalog;
beforeAll(() => {
  source = readFileSync(SOURCE, 'utf8');
  catalog = readFileSync(CATALOG, 'utf8');
});

describe('RoadReady road-test result makes no claim about the real exam', () => {
  it('does not tell the student they would pass the Maine BMV road test', () => {
    // The exact wording that shipped, plus the general shape of the claim.
    expect(source).not.toMatch(/You would pass the Maine BMV road test/i);
    expect(source).not.toMatch(/you would pass the (real |actual )?(BMV |state )?road test/i);
  });

  it('still tells the student what the real test actually measures', () => {
    expect(source).toMatch(/scored by an examiner/i);
    expect(source).toMatch(/a keyboard cannot measure/i);
  });

  it('still credits passing the simulation itself', () => {
    // The fix must not have removed the achievement, only the forecast.
    // The apostrophe is backslash-escaped in the source literal.
    expect(source).toMatch(/cleared this simulator\\?'s 90-point bar/i);
    expect(source).toMatch(/'PASSED'/);
  });

  it('is not overridden by the ui_strings catalog', () => {
    // ui_strings.js wins over tool prose, so a stale entry there would put the
    // old claim back on screen even with the source fixed.
    expect(catalog).not.toMatch(/You would pass the Maine BMV road test/i);
  });

  it('ships the fix in the deploy mirror, not just the source', () => {
    // desktop/web-app/public/stem_lab/ is the tracked copy that actually ships and
    // it does not always auto-sync.
    const mirror = readFileSync(MIRROR, 'utf8');
    expect(mirror).not.toMatch(/You would pass the Maine BMV road test/i);
    expect(mirror).toMatch(/scored by an examiner/i);
  });
});
