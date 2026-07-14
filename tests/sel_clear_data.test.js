// SEL right-to-delete affordance (review SEL-PRIV-7).
//
// Previously there was no way for a student/teacher to delete SEL data
// (journal entries, reflections, safety plan, streak, stations, progress).
// The hub now exposes a confirm-gated "Clear my SEL data" control that removes
// the SEL localStorage keys, resets hub state, and clears the window mirror
// slots (so a subsequent project-save can't re-serialize the deleted data).

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const HUB = fs.readFileSync(path.join(process.cwd(), 'sel_hub/sel_hub_module.js'), 'utf8');

describe('SEL-PRIV-7 — clear-my-SEL-data affordance', () => {
  it('defines a clearAllSelData handler reachable from a labelled button', () => {
    expect(HUB).toMatch(/var clearAllSelData = function/);
    expect(HUB).toMatch(/Clear my SEL data/);
    expect(HUB).toMatch(/onClick: clearAllSelData/);
  });

  it('is confirm-gated (destructive, cannot be undone)', () => {
    expect(HUB).toMatch(/window\.confirm/);
    expect(HUB).toMatch(/cannot be undone/i);
  });

  it('scans + removes SEL-namespaced localStorage keys (no variant missed)', () => {
    expect(HUB).toMatch(/\^\(alloflow_sel_\|alloSel\|crisisCompanion/);
    expect(HUB).toMatch(/localStorage\.removeItem/);
  });

  it('also clears the window mirror slots so a save cannot re-persist deleted data', () => {
    expect(HUB).toMatch(/window\.__alloflowSelToolData = \{\}/);
    expect(HUB).toMatch(/window\.__alloflowSelEngagement = null/);
  });
});
