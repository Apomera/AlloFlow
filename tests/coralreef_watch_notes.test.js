import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// After a right answer, the reveal tells students what the dive lets them watch that
// animal do (cleaning stations, grazing puffs, turtles breathing, feeding scars,
// anemonefish taking cover, mantas being cleaned), each with its sources listed.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SRC = readFileSync(resolve(process.cwd(), TOOL), 'utf8');
const tail = SRC.lastIndexOf('})(');
function watch() {
  const win = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
  new Function('window', SRC.slice(0, tail) + 'window.__watchNote = watchNote;\n' + SRC.slice(tail))(win);
  return (id) => win.__watchNote(id, (k, f) => f);
}

describe('dive reveal watch notes', () => {
  it('names a behaviour the dive shows for each animal that has one', () => {
    const w = watch();
    expect(w('cleaner_wrasse')).toMatch(/cleaning station/);
    expect(w('parrotfish')).toMatch(/puffs/);
    expect(w('bumphead_parrotfish')).toMatch(/sand/);
    expect(w('green_turtle')).toMatch(/breathe air/);
    expect(w('hawksbill_turtle')).toMatch(/surface/);
    expect(w('crown_of_thorns')).toMatch(/white skeleton/);
    expect(w('clownfish')).toMatch(/tentacles/);
    expect(w('reef_manta')).toMatch(/cleaning stations/);
  });

  it('says nothing for animals without a shown behaviour, and only in the reveal', () => {
    const w = watch();
    for (const id of ['blue_tang', 'brain_coral', 'sea_fan', 'reef_star']) expect(w(id)).toBeNull();
    expect(/data-watch-note/.test(SRC)).toBe(true);
    for (const id of ['fishaus-labroides', 'bansemer2002', 'lof-cleaning', 'armstrong2021', 'swot2024', 'donate2026', 'nps-cots', 'trnski2020', 'hayashi2019']) expect(SRC.includes("id: '" + id + "'"), id).toBe(true);
  });

  it('keeps the turtle line honest about how long turtles stay down', () => {
    const t = watch()('green_turtle');
    expect(t).toMatch(/minute or two/);
    expect(t).toMatch(/hours/);
  });
});
