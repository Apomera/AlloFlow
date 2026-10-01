// SEL badge popups announce to screen readers (review A11Y-7, additive part).
//
// Earning a badge previously updated showBadgePopup silently — screen-reader
// users got no feedback. Every SEL tool that awards a badge must now announce it
// via ctx.announceToSR. (The remaining A11Y-7 work — keyboard dismiss, role,
// and the auto-dismiss timing decision — is a shared-helper refactor deferred to
// Aaron, modeled on digitalwellbeing.)

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const TOOLS = [
  'advocacy', 'coping', 'emotions', 'decisions', 'mindfulness', 'perspective',
  'social', 'zones', 'conflict', 'community', 'teamwork', 'journal',
];

describe('SEL badge popups announce to screen readers (A11Y-7)', () => {
  it.each(TOOLS)('sel_tool_%s.js announces the earned badge via announceToSR', (tool) => {
    const src = fs.readFileSync(path.join(process.cwd(), `sel_hub/sel_tool_${tool}.js`), 'utf8');
    expect(src).toMatch(/announceToSR\('Badge earned: ' \+ badge\.name\)/);
  });

  it('digitalwellbeing (the reference pattern) already announces earned badges', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'sel_hub/sel_tool_digitalwellbeing.js'), 'utf8');
    expect(src).toMatch(/announceToSR\('Badge earned: '/);
  });
});
