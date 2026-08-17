// StoryForge option-table keys must MATCH their table labels, not merely exist.
//
// The display/identity split routes every dropdown and picker through
// a11y.storyforge_opt_* / _shape_ / _phase_name_ keys, with the table's English
// label only as fallback. So a key whose VALUE drifted from its table shows the
// wrong text to every user, including English ones — silently, because the key
// resolves fine.
//
// That is not hypothetical: the generator that produced these keys used
// /label: ["']([^"']+)["']/ , which stopped at the apostrophe inside
// "Bird's-eye" and wrote "Bird". An existence-only check passed it. This test
// compares values, which is the check that catches it.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const src = fs.readFileSync(path.join(ROOT, 'story_forge_source.jsx'), 'utf8');
const ui = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8')).a11y;

const slug = (v) => (v === '' || v == null)
  ? 'placeholder'
  : String(v).toLowerCase().replace(/[^a-z0-9]+/g, '_');

function listBlock(name) {
  const m = src.match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];'));
  if (!m) throw new Error('table not found: ' + name);
  // label may be single- OR double-quoted, and may itself contain an apostrophe
  const out = [];
  for (const e of m[1].matchAll(/\{ value: '([^']*)',\s*label: (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) {
    out.push([e[1], (e[2] !== undefined ? e[2] : e[3]).replace(/\\'/g, "'")]);
  }
  return out;
}

const LIST_TABLES = {
  shot: 'COMIC_SHOT_OPTIONS', angle: 'COMIC_ANGLE_OPTIONS', mood: 'COMIC_MOOD_OPTIONS',
  transition: 'COMIC_TRANSITION_OPTIONS', lettering: 'COMIC_LETTERING_SPACE_OPTIONS',
  pageturn: 'COMIC_PAGE_TURN_OPTIONS', frame: 'COMIC_PANEL_FRAME_OPTIONS',
};

describe('StoryForge option-table keys', () => {
  for (const [family, table] of Object.entries(LIST_TABLES)) {
    it(`${family}: every value has a key whose text matches the table label`, () => {
      const rows = listBlock(table);
      expect(rows.length).toBeGreaterThan(0);
      for (const [value, label] of rows) {
        const key = `storyforge_opt_${family}_${slug(value)}`;
        expect(ui[key], `${key} missing`).toBeDefined();
        expect(ui[key], `${key} drifted from ${table}`).toBe(label);
      }
    });
  }

  it('placeholder rows do not collide with a literal "none" value', () => {
    // COMIC_LETTERING_SPACE_OPTIONS has BOTH '' (the dropdown placeholder) and
    // 'none' ("No bubble area"). Folding them together showed the wrong label.
    expect(ui.storyforge_opt_lettering_placeholder).toBe('Lettering space');
    expect(ui.storyforge_opt_lettering_none).toBe('No bubble area');
  });

  it('phase names cover every PHASES value', () => {
    const m = src.match(/const PHASES = \[([^\]]*)\]/);
    const phases = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
    expect(phases.length).toBe(6);
    for (const p of phases) expect(ui['storyforge_phase_name_' + p], p).toBeDefined();
  });

  it('story shapes have both a label and a description key', () => {
    const m = src.match(/const STORY_SHAPES = \{([\s\S]*?)\n\};/);
    const keys = [...m[1].matchAll(/^\s{2}(\w+):/gm)].map(x => x[1]);
    expect(keys.length).toBe(6);
    for (const k of keys) {
      expect(ui['storyforge_shape_' + k], k).toBeDefined();
      expect(ui['storyforge_shape_' + k + '_desc'], k + ' desc').toBeDefined();
    }
  });
});
