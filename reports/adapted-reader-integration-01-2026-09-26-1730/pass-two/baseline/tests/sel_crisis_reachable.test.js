// Crisis Companion reachability (SEL review Batch C headline).
//
// The Crisis Companion REGISTERS (renders) but previously had no card in the SEL
// Hub grid, so students told to "open the Crisis Companion in this SEL Hub" could
// not find it. It must have a grid card (in sel_hub_module.js) — not just a
// registration in its own tool file. This guards against the card being dropped.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const HUB = fs.readFileSync(path.join(process.cwd(), 'sel_hub/sel_hub_module.js'), 'utf8');

describe('Crisis Companion is reachable from the SEL Hub grid', () => {
  it('sel_hub_module.js has a crisiscompanion grid card', () => {
    expect(HUB).toMatch(/id:\s*'crisiscompanion'/);
  });

  it('the card carries label + a recommended range (a real grid entry, not a stray ref)', () => {
    // The card line should include the label and a recommendedRange like its neighbors.
    const line = HUB.split('\n').find((l) => /id:\s*'crisiscompanion'/.test(l)) || '';
    expect(line).toMatch(/label:\s*'Crisis Companion'/);
    expect(line).toMatch(/recommendedRange:/);
  });
});
