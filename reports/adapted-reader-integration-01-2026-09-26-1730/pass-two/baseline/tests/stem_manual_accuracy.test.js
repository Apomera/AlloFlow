// STEM tool manuals must describe the tool that exists (2026-09-20).
//
// The Water Cycle manual told teachers that Water Worlds shows "the cycle under
// different planetary conditions" and was "a natural bridge to an astronomy unit".
// The mode is a watershed model: you edit a valley's ground cover and run repeatable
// storms. There is no planetary content in it at all. A teacher could have planned a
// lesson around a feature the tool never had, and nothing in the repo would have said
// so, because the manuals were prose checked by nobody.
//
// A manual is prose, so most of it cannot be asserted. What CAN be asserted is that the
// mode names it teaches are the mode names the tool ships, and that it does not promise
// subject matter the tool does not contain. That is what this file does.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const catalog = JSON.parse(read('docs/manuals/catalog.json'));
const toolManuals = catalog.items.filter((i) => i.format === 'STEM tool teacher manual');

const text = (html) => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&mdash;|&ndash;/g, '-')
  .replace(/&rsquo;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ');

describe('water cycle manual matches the shipped tool', () => {
  const manual = text(read('manual-water-cycle.html'));
  const tool = read('stem_lab/stem_tool_watercycle.js');

  it('teaches the five modes the tool actually defines', () => {
    const labels = Array.from(
      tool.matchAll(/sect_(?:explore|be_the_water|storm_lab|steward|water_worlds)',\s*'([^']+)'/g),
      (m) => m[1],
    );
    expect(labels).toEqual(['Explore', 'Be the Water', 'Storm Lab', 'Steward', 'Water Worlds']);
    for (const label of labels) {
      expect(manual, 'manual should name the ' + label + ' mode').toContain(label);
    }
  });

  it('does not promise planetary science that Water Worlds does not contain', () => {
    // Ground truth: the mode's own blurb, its kernel and its view.
    const blurb = /sect_water_worlds_blurb',\s*'([^']+)'/.exec(tool);
    expect(blurb, 'Water Worlds blurb').toBeTruthy();
    expect(blurb[1]).toMatch(/valley|storm/i);
    const implementation = read('stem_lab/water_worlds_kernel.js') + read('stem_lab/water_worlds_view.js');
    expect(/\bplanet|\bmars\b|exoplanet/i.test(implementation), 'tool has no planetary content').toBe(false);
    expect(/planetary conditions|planet is colder|no atmosphere|astronomy unit/i.test(manual),
      'manual must not describe Water Worlds as planetary').toBe(false);
  });

  it('keeps the six named processes it tells teachers to step through', () => {
    for (const stage of ['Evaporation', 'Condensation', 'Precipitation', 'Collection', 'Transpiration', 'Infiltration']) {
      expect(manual, 'manual names ' + stage).toContain(stage);
      expect(tool, 'tool defines ' + stage).toContain(stage);
    }
  });
});

// EvoLab (2026-09-20). Its manual put Homology vs Analogy in the "Evidence and ancestry"
// path, where the tool puts Trait Divergence Model, and left Homology vs Analogy out of the
// "Practice and project" path it actually belongs to. It also said three cards sit under
// Teacher Resources while the tool renders four, and then described all four. A teacher
// following the path table would have sent students to the wrong module.
describe('evolab manual matches the shipped tool', () => {
  const manual = text(read('manual-evo-lab.html'));
  const tool = read('stem_lab/stem_tool_evolab.js');

  const moduleTitle = (key) => {
    const m = new RegExp(key + ":\\s*'([^']+)'").exec(tool);
    expect(m, 'MODULE_TITLES entry for ' + key).toBeTruthy();
    return m[1];
  };
  const trackModules = (id) => {
    const block = new RegExp("id: '" + id + "'[^]{0,400}?modules: \\[([^\\]]+)\\]").exec(tool);
    expect(block, 'learningTracks entry for ' + id).toBeTruthy();
    return block[1].split(',').map((x) => x.trim().replace(/'/g, ''));
  };

  it('lists each learning path with the modules the tool assigns to it', () => {
    for (const id of ['evidence', 'practice']) {
      for (const key of trackModules(id)) {
        expect(manual, id + ' path should name ' + key).toContain(moduleTitle(key));
      }
    }
  });

  it('does not place a module in a path the tool assigns elsewhere', () => {
    // The specific defect: Homology vs Analogy belongs to 'practice', not 'evidence'.
    expect(trackModules('practice')).toContain('homologySleuth');
    expect(trackModules('evidence')).toContain('speciation');
    const evidenceRow = /Evidence and ancestry<\/th>[\s\S]{0,200}?<\/tr>/.exec(read('manual-evo-lab.html'));
    expect(evidenceRow, 'evidence path row').toBeTruthy();
    expect(evidenceRow[0]).toContain(moduleTitle('speciation'));
    expect(evidenceRow[0]).not.toContain(moduleTitle('homologySleuth'));
  });

  it('counts the Teacher Resources cards the tool renders', () => {
    const cards = ['class_snapshot', '5_day_curriculum_guide', 'module_map', 'standards_crosswalk']
      .filter((key) => tool.includes("'stem.evolab." + key + "',"));
    expect(cards.length, 'Teacher Resources cards found in source').toBe(4);
    expect(manual).toMatch(/Four things sit under/);
    expect(manual).not.toMatch(/Three things sit under/);
  });
});

describe('every catalogued STEM manual points at a real tool', () => {
  it('names a tool source that exists and is substantial', () => {
    expect(toolManuals.length).toBeGreaterThanOrEqual(5);
    for (const item of toolManuals) {
      const source = read(item.canonicalSource);
      expect(source.length, item.id + ' tool source is not a stub').toBeGreaterThan(10000);
    }
  });
});

// Coaster Lab (2026-09-20). The manual said "three built-in design challenges ship with the
// tool" and located them in the Missions panel. Missions ships fifteen, and the panel prints
// its own count. The three named challenges are real but belong to a different control in a
// different panel: the "Guided design challenge" selector in Build's Designer workbench. A
// teacher reading section 3 would have gone looking in the wrong place and found fifteen
// things instead of three.
describe('coaster lab manual matches the shipped tool', () => {
  const manual = text(read('manual-coaster-lab.html'));
  const tool = read('stem_lab/stem_tool_coasterlab.js');

  it('counts the missions the tool actually defines', () => {
    const block = /const MISSIONS = \[([^]*?)\n\s*\];/.exec(tool);
    expect(block, 'MISSIONS array').toBeTruthy();
    const count = (block[1].match(/name: '/g) || []).length;
    expect(count).toBe(15);
    expect(manual, 'manual states the real mission count').toMatch(/Fifteen\s+missions/i);
    expect(manual, 'manual must not claim three built-in challenges ship')
      .not.toMatch(/Three\s+built-in design challenges/i);
  });

  it('puts the three guided design challenges where the tool puts them', () => {
    for (const label of ['Build a smooth 20 m hill', 'Create 3 seconds of airtime', 'Finish below 4.0 vertical g']) {
      expect(tool, 'tool offers ' + label).toContain('>' + label + '<');
    }
    expect(tool, 'the selector the labels belong to').toContain('clab-designChallenge');
    expect(manual, 'manual sends teachers to the Designer workbench').toMatch(/Designer\s+workbench/i);
    expect(manual, 'manual no longer sources them from Missions')
      .not.toMatch(/three challenges from the Missions panel/i);
  });
});
