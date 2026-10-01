// SEL Hub registry cleanups (review Batch C).
//
// Guards the registry/reachability fixes against regression:
//  - REG-NOCARD-EXECFUNCTION: the registered execfunction tool must have a grid card.
//  - SELUX-7: no two grid cards may share the label "Social Skills Lab".
//  - evidence-badge omissions: every carded tool that previously lacked an
//    _evidenceBase entry (execfunction, crisiscompanion) must now have one.
//  - station-builder orphans: the Station Builder picker must filter to carded
//    tools so a registered-but-uncarded tool can't be saved into a Station.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const HUB = fs.readFileSync(path.join(process.cwd(), 'sel_hub/sel_hub_module.js'), 'utf8');
const SOCIALLAB = fs.readFileSync(path.join(process.cwd(), 'sel_hub/sel_tool_sociallab.js'), 'utf8');

describe('SEL Batch C — registry cleanups', () => {
  it('execfunction has a grid card (REG-NOCARD-EXECFUNCTION)', () => {
    expect(HUB).toMatch(/id:\s*'execfunction'/);
    // and it is a real card entry with a label + range, not a stray reference
    const line = HUB.split('\n').find((l) => /id:\s*'execfunction'/.test(l)) || '';
    expect(line).toMatch(/label:\s*'Executive Function'/);
    expect(line).toMatch(/recommendedRange:/);
  });

  it('no two grid cards share the label "Social Skills Lab" (SELUX-7)', () => {
    const matches = HUB.match(/label:\s*'Social Skills Lab'/g) || [];
    expect(matches.length).toBe(1); // only the broad "social" card keeps the name
    // the AI-roleplay tool was disambiguated
    expect(HUB).toMatch(/label:\s*'Social Skills Roleplay'/);
    expect(SOCIALLAB).toMatch(/title:\s*'Social Skills Roleplay'/);
  });

  it('execfunction and crisiscompanion have evidence-base badges (no silent omission)', () => {
    expect(HUB).toMatch(/execfunction:\s*\{\s*tier:/);
    expect(HUB).toMatch(/crisiscompanion:\s*\{\s*tier:/);
  });

  it('Station Builder picker filters to carded tools (station-builder orphans)', () => {
    // the picker registry is intersected with the carded id set before render
    expect(HUB).toMatch(/_cardedIds\[tool\.id\]/);
    expect(HUB).toMatch(/registry\s*=\s*registry\.filter/);
  });
});
