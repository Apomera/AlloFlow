// SEL Hub — the sound toggle must not be announced as the badge count.
//
// Four tools (coping, emotions, mindfulness, perspective) share a tab-bar
// toolbar with a sound toggle and a badge-panel toggle. Both buttons carried
// the same copy-pasted aria-label, the trophy emoji plus "3/12", so a screen
// reader announced the MUTE button as "3/12". Each is now named for what it
// does and exposes its state: the sound toggle is a pressed/unpressed switch,
// the badge toggle says how many badges are earned and whether its panel is
// open. This guard reads the source: it is the property we want asserted
// (a name that matches the control), not the symptom (a trophy in a label).

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SEL = resolve(process.cwd(), 'sel_hub');
const TROPHY_LABEL = "'aria-label': '\\uD83C\\uDFC5 '"; // the literal escape text in source

describe('SEL Hub · toolbar toggles are named for what they do', () => {
  const files = readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f)).sort();

  it('no control is named by the trophy-and-count string', () => {
    const offenders = files.filter((f) => readFileSync(join(SEL, f), 'utf8').includes(TROPHY_LABEL));
    expect(offenders, 'aria-label starts with the trophy escape; name the control, not its decoration').toEqual([]);
  });

  it('every sound toggle in the shared toolbar is a switch with a stable name', () => {
    const missing = [];
    let seen = 0;
    for (const f of files) {
      const src = readFileSync(join(SEL, f), 'utf8');
      const lines = src.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (!/upd\('soundEnabled',\s*!soundEnabled\)/.test(lines[i])) continue;
        seen++;
        // The props object may put the label two lines below the onClick.
        const win = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
        // Contract, not spelling. Either shape exposes name + state:
        //   (a) a stable name about sound plus aria-pressed, or
        //   (b) a name that itself changes with the state (Mute / Unmute).
        // What is NOT acceptable: a name about something else (badges), or no name.
        const stable = /'aria-label':\s*'[^']*(sound|mute)[^']*'/i.test(win) && /'aria-pressed':\s*(!!)?soundEnabled/.test(win);
        const stateful = /'aria-label':\s*soundEnabled\s*\?\s*'[^']*(mute|sound)[^']*'\s*:\s*'[^']*(mute|sound)[^']*'/i.test(win);
        if (!stable && !stateful) missing.push(f + ':' + (i + 1));
      }
    }
    expect(seen, 'no sound toggles found — the probe is blind').toBeGreaterThan(0);
    expect(missing, 'sound toggle without a stable name + aria-pressed').toEqual([]);
  });

  it('every badge-panel toggle says how many are earned and whether the panel is open', () => {
    const missing = [];
    let seen = 0;
    for (const f of files) {
      const src = readFileSync(join(SEL, f), 'utf8');
      const lines = src.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (!/upd\('showBadgesPanel',\s*!showBadgesPanel\)/.test(lines[i])) continue;
        seen++;
        const win = lines.slice(Math.max(0, i - 2), i + 1).join('\n');
        // Contract, not spelling: the name says "badges", carries the total
        // (BADGES.length), and the button reports whether its panel is open.
        if (!/'aria-label':[^\n]*badges/i.test(win) || !/BADGES\.length/.test(win) || !/'aria-expanded':\s*!!showBadgesPanel/.test(win)) missing.push(f + ':' + (i + 1));
      }
    }
    expect(seen, 'no badge-panel toggles found — the probe is blind').toBeGreaterThan(0);
    expect(missing, 'badge toggle without count name + aria-expanded').toEqual([]);
  });
});
