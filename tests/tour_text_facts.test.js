// Tour numbers come from the tools (2026-11-18). A read of the tour against the code found 8 of 11 count claims
// wrong (Word Sounds "8 activities" of 20, organizers "6" of 15, STEM "4 modes" of 8, timeline "5-15" for 3-20...).
// Each count here is read from the control that offers it, so a tool that grows fails this until the tour catches up.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const tour = ui.tour;
const panels = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
const wsSetup = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const wsModule = readFileSync('word_sounds_module.js', 'utf8');

// The <option>s of the <select> that follows an anchor.
function optionsAfter(src, anchor) {
  const at = src.indexOf(anchor);
  expect(at, anchor).toBeGreaterThan(0);
  const end = src.indexOf('</select>', at);
  return [...src.slice(at, end).matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
}

describe('tour counts match the tools', () => {
  it('graphic organizer formats', () => {
    const formats = optionsAfter(panels, '<option value="Venn Diagram">');
    expect(formats.length).toBeGreaterThan(10);
    expect(tour.outline_text).toContain('into ' + formats.length + ' graphic organizer formats');
    expect(tour.outline_text).toContain('from the ' + formats.length + ' available types');
  });
  it('STEM solution modes', () => {
    const modes = optionsAfter(panels, '<option value="Problem Set Generator">');
    expect(tour.math_text).toContain('with ' + modes.length + ' solution modes');
  });
  it('timeline event range', () => {
    const at = panels.indexOf('data-help-key="timeline_count"');
    const input = panels.slice(at, at + 200);
    const min = input.match(/min="(\d+)"/)[1], max = input.match(/max="(\d+)"/)[1];
    expect(tour.timeline_text).toContain(min + ' to ' + max + ' events');
  });
  it('Word Sounds activities and badges', () => {
    const block = wsSetup.slice(wsSetup.indexOf('const ACTIVITY_SKILLS = {'), wsSetup.indexOf('\n  };', wsSetup.indexOf('const ACTIVITY_SKILLS = {')));
    const names = [...block.matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
    expect(tour.wordsounds_text).toContain('### ' + names.length + ' Activity Types');
    for (const n of names) expect(tour.wordsounds_text, n).toContain(n);
    for (const badge of ['Blend Wizard', 'Daily Star']) expect(tour.wordsounds_text).not.toContain(badge);
    for (const badge of ['Unstoppable', 'Sound Detective', 'Counting Pro']) {
      expect(wsModule).toContain('name: "' + badge + '"');
      expect(tour.wordsounds_text).toContain(badge);
    }
  });
  it('no dash left as a mid-sentence bullet, no lost glyph', () => {
    for (const [k, v] of Object.entries(tour)) {
      if (typeof v !== 'string') continue;
      expect(v.split('\n').filter((l) => /\S•\S/.test(l)), k).toEqual([]);
      expect(v, k).not.toMatch(/ with \?,/);
    }
  });
});
