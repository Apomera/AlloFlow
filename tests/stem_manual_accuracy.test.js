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

describe('every catalogued STEM manual points at a real tool', () => {
  it('names a tool source that exists and is substantial', () => {
    expect(toolManuals.length).toBeGreaterThanOrEqual(5);
    for (const item of toolManuals) {
      const source = read(item.canonicalSource);
      expect(source.length, item.id + ' tool source is not a stub').toBeGreaterThan(10000);
    }
  });
});
