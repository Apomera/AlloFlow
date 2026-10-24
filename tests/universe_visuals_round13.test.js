// Universe Explorer, thirteenth pass (2026-10-19): a zoom window on the timeline linked to
// "Our Milky Way". It shows the galaxy swallowing dwarfs, then the young Sun's disk, then
// Earth through time. Earth's eras are dated and share their ages with the key moments.
// (The window itself is canvas art and was checked in a browser.)
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });

describe('Earth through time (pure)', () => {
  it('dates each era, in order, and shares ages with the key moments', () => {
    const eras = pure.UNIVERSE_EARTH_ERAS, moments = Object.fromEntries(pure.UNIVERSE_MOMENTS.flat().map((m) => [m.id, m.age]));
    eras.slice(1).forEach((era, i) => expect(era.from, era.name).toBeGreaterThan(eras[i].from));
    const linked = eras.filter((era) => era.moment);
    expect(linked.map((era) => era.moment)).toEqual(['earth', 'life', 'oxygen', 'animals', 'dinosaurs', 'humans']);
    linked.forEach((era) => expect(era.from, era.moment).toBe(moments[era.moment]));
  });

  it('picks the era for an age, with ice and Pangaea where they belong', () => {
    expect(pure.universeEarthEra(9.2)).toBe(null);
    expect(pure.universeEarthEra(9.3).look).toBe('molten');
    expect(pure.universeEarthEra(10.6).name).toBe('microbes in the sea');
    expect(pure.universeEarthEra(13.1).look).toBe('ice');
    expect(pure.universeEarthEra(13.2).look).toBe('rust');
    expect(pure.universeEarthEra(13.5).look).toBe('pangaea');
    expect(pure.universeEarthEra(13.79999).today).toBeUndefined();
    expect(pure.universeEarthEra(13.8).today).toBe(true);
  });

  it('says how long ago in the unit a learner would use', () => {
    expect(pure.universeAgoLabel(9.26)).toBe('4.5 billion years ago');
    expect(pure.universeAgoLabel(13.734)).toBe('66 million years ago');
    expect(pure.universeAgoLabel(13.7997)).toBe('300 thousand years ago');
    expect(pure.universeAgoLabel(13.8)).toBe('today');
  });
});

describe('Zoom window cards (pure)', () => {
  const at = (age) => pure.universeSceneKinds(pure.universeSceneClock(age), true, age);
  it('offers the young Sun’s disk, then Earth, as click-to-learn cards', () => {
    expect(at(6)).not.toContain('disk');
    expect(at(6)).not.toContain('earth');
    expect(at(9.2)).toContain('disk');
    expect(at(9.2)).not.toContain('earth');
    expect(at(9.3)).toContain('earth');
    expect(at(9.3)).not.toContain('disk');
    expect(at(13.8)).toContain('earth');
    expect(at(13.81)).not.toContain('earth');
    const card = pure.UNIVERSE_SCENE_KINDS.earth;
    ['icon', 'name', 'what', 'when', 'size', 'model', 'think'].forEach((field) => expect(card[field], field).toBeTruthy());
  });
});
