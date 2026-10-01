import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Art Studio announced its screen-reader messages in English while the visible
// UI was translated, so a blind learner working in another language heard
// English. Every announcement now reaches the translator.
//
// This gate was itself the bug once: an earlier version only inspected calls
// whose body STARTED with a quote, so it passed while 21 calls that begin with
// a condition -- announceToSR(paused ? 'A.' : 'B.') -- were still English. It
// now walks each complete call and looks for prose anywhere inside it.
const copies = [
  'stem_lab/stem_tool_artstudio.js',
  'desktop/web-app/public/stem_lab/stem_tool_artstudio.js',
];

function announcementBodies(src) {
  const bodies = [];
  let i = 0;
  while ((i = src.indexOf('announceToSR(', i)) !== -1) {
    const open = i + 'announceToSR('.length;
    let depth = 1, j = open, inStr = null;
    for (; j < src.length && depth > 0; j++) {
      const c = src[j];
      if (inStr) { if (c === '\\') j++; else if (c === inStr) inStr = null; continue; }
      if (c === "'" || c === '"') inStr = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
    }
    bodies.push(src.slice(open, j - 1));
    i = j;
  }
  return bodies;
}

// Prose = capitalised and either multi-word or sentence-final. Option values
// such as 'free', 'move' or 'PageUp' are deliberately not prose.
function unkeyedProse(body) {
  const stripped = body.replace(/__alloT\([^()]*\)/g, '_T_');
  return (stripped.match(/'([A-Z][A-Za-z0-9 ,.\-]{3,})'/g) || []).filter((lit) => / |\.$/.test(lit.slice(1, -1)));
}

describe('Art Studio screen-reader announcements reach the translator', () => {
  for (const file of copies) {
    it(file + ' has no announcement holding English outside a translator call', () => {
      const bodies = announcementBodies(readFileSync(file, 'utf8'));
      expect(bodies.length).toBeGreaterThan(100);
      const offenders = bodies.filter((b) => unkeyedProse(b).length).map((b) => b.replace(/\s+/g, ' ').slice(0, 90));
      expect(offenders).toEqual([]);
    });
  }

  it('is calibrated: it would catch a bare announcement and a conditional one', () => {
    // Both shapes must be detected, or the gate is blind again.
    expect(unkeyedProse("'Watercolor dried.'")).toHaveLength(1);
    expect(unkeyedProse("paused ? 'Drying paused.' : 'Drying resumed.'")).toHaveLength(2);
    expect(unkeyedProse("__alloT('stem.artstudio.sr_x', 'Watercolor dried.')")).toHaveLength(0);
    expect(unkeyedProse("st.transformAxis === 'free' ? a : b")).toHaveLength(0);
  });

  it('registers every announcement key in all three English registries', () => {
    const src = readFileSync(copies[0], 'utf8');
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.artstudio;
    const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.artstudio;
    const catalog = JSON.parse(readFileSync('dev-tools/i18n/stem_artstudio_en.json', 'utf8'));
    // The comma matters: a key followed by ' + ...' is a dynamic prefix
    // completed at runtime (sr_color_, sr_shape_), not a key to look up.
    const keys = [...src.matchAll(/__alloT\('stem\.artstudio\.(sr_[a-z0-9_]+)'\s*,/g)].map((m) => m[1]);
    expect(new Set(keys).size).toBeGreaterThanOrEqual(100);
    for (const key of new Set(keys)) {
      expect(section[key], key).toBeTruthy();
      expect(mirror[key], key).toBe(section[key]);
      expect(catalog[key], key).toBe(section[key]);
    }
  });

  it('uses full sentences where a spliced word would change the sentence', () => {
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.artstudio;
    expect(section.sr_part_is_hidden_use_controls).toContain('is hidden.');
    expect(section.sr_part_is_locked_use_controls).toContain('is locked.');
    expect(section.sr_imported_sculpture_one).toContain('{value2} part.');
    expect(section.sr_imported_sculpture_many).toContain('{value2} parts.');
    // A cursor report and a draw report are separate sentences, not a prefix
    // glued in front of the coordinates.
    expect(section.sr_drew_to_x_y).toBe('Drew to x {value1}, y {value2}.');
    expect(section.sr_symmetry_cursor_x_y).toBe('Symmetry cursor x {value1}, y {value2}.');
  });

  it('registers the enumerated words the announcements name', () => {
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.artstudio;
    expect(section.sr_color_light_gray).toBe('light gray');
    expect(section.sr_shape_torus).toBe('torus');
    expect(section.sr_dir_closer).toBe('closer');
    expect(section.sr_depth_near).toBe('near');
  });

  it('keeps placeholders in the templates that carry a value', () => {
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.artstudio;
    expect(section.sr_watercolor_cursor_at_column_row).toBe('Watercolor cursor at column {value1}, row {value2}.');
    expect(section.sr_pixel_row_column).toBe('Pixel row {value1}, column {value2}.');
  });
});
