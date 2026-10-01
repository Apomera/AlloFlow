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

  it('is confirm-gated by an accessible in-app dialog (destructive, cannot be undone)', () => {
    // SEL-PRIV-7: the destructive delete requires explicit confirmation. The gate is an
    // ACCESSIBLE in-app confirm dialog, NOT window.confirm — that was intentionally
    // removed (5e0f7ecdf "confirm SEL data deletion accessibly") because a native
    // window.confirm is not reliably announced by screen readers and cannot be
    // theme/contrast-styled. This asserts the real gate flow, which is stronger.
    // 1. The trigger button only OPENS the dialog — it never deletes directly.
    expect(HUB).toMatch(/id: 'sel-clear-all-data-button',[\s\S]{0,80}setShowClearSelConfirm\(true\)/);
    // 2. The dialog renders only while the confirm state is open, is an accessible
    //    labelled dialog, and the real deletion (clearAllSelData) is wired ONLY to
    //    its confirm button.
    expect(HUB).toMatch(/showClearSelConfirm && h\('div'/);
    expect(HUB).toMatch(/id: 'sel-clear-data-confirm-modal'/);
    expect(HUB).toMatch(/'aria-labelledby': 'sel-clear-data-confirm-title'/);
    expect(HUB).toMatch(/onClick: clearAllSelData/);
    // 3. The irreversibility is stated to the user.
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
