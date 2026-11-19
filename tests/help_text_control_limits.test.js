// Help Mode ranges come from the controls (2026-11-18). An audit against the code found old entries with invented
// limits: Bingo "1 to 30 cards", timeline "5 to 25", FAQ "3 to 20", brainstorm "3 to 15 steps", word search "12x12 to
// 20x20". Each limit here is read from the control, so changing a control fails this until its help catches up.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const help = vm.runInNewContext('(' + readFileSync('help_strings.js', 'utf8') + ')');
const panels = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
const games = readFileSync('games_source.jsx', 'utf8');
const textUtil = readFileSync('text_utility_helpers_source.jsx', 'utf8');

// min/max on the element that carries the help key (attributes on either side of it).
function limits(src, key) {
  const at = src.indexOf('data-help-key="' + key + '"');
  expect(at, key).toBeGreaterThan(0);
  const tag = src.slice(src.lastIndexOf('<', at), src.indexOf('/>', at));
  return { min: (tag.match(/min="(\d+)"/) || [])[1], max: (tag.match(/max="(\d+)"/) || [])[1] };
}

describe('Help Mode ranges match the controls', () => {
  it('Bingo card count', () => {
    const { min, max } = limits(games, 'bingo_card_count_input');
    expect(help.bingo_card_count_input).toContain('from ' + min + ' to ' + max);
    expect(games).toContain('Math.min(' + max + ', parseInt(e.target.value) || 20)');
    expect(help.bingo_card_count_input).toContain('default 20');
  });
  it('timeline item count', () => {
    const { min, max } = limits(panels, 'timeline_count');
    expect(help.timeline_count).toContain('from ' + min + ' to ' + max);
  });
  it('math problem count', () => {
    const { min, max } = limits(panels, 'math_quantity');
    expect(help.math_quantity).toContain(min + ' to ' + max);
  });
  it('FAQ count options', () => {
    const at = panels.indexOf('data-help-key="faq_count"');
    const opts = [...panels.slice(at, panels.indexOf('</select>', at)).matchAll(/<option value=\{?"?(\d+)"?\}?>/g)].map((m) => m[1]);
    expect(opts.length).toBeGreaterThan(2);
    expect(help.faq_count).toContain(opts.slice(0, -1).join(', ').replace(/\b5\b/, '5 (default)') + ' or ' + opts[opts.length - 1]);
  });
  it('word search grid and word limit', () => {
    expect(textUtil).toContain('const size = 15;');
    expect(textUtil).toContain('.slice(0, 12);');
    expect(help.glossary_word_search).toContain('Up to 12 words');
    expect(help.glossary_word_search).toContain('15x15');
  });
});
