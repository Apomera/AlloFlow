// Universe Explorer, eighteenth pass (2026-10-19): the sort-task card lists (Fermi, Mysteries,
// Multiverse, Elements) lay out in a container-driven grid: two columns where there is room,
// one where there is not. The rule must never overflow a narrow panel (min(100%, ...)).
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
const rule = () => sliceBetween(readFileSync(TOOL, 'utf8'), '[data-universe-tool] .uni-bigq-list{', '}', { label: 'bigq list rule' });

describe('Sort-task card grid (source)', () => {
  it('uses an auto-fill grid sized by the container, not the viewport', () => {
    const css = rule();
    expect(css.includes('display:grid')).toBe(true);
    expect(css.includes('grid-template-columns:repeat(auto-fill,minmax(min(100%,23rem),1fr))')).toBe(true);
    expect(css.includes('align-items:start')).toBe(true);
  });

  it('never makes a column wider than a narrow container', () => {
    expect(/minmax\(min\(100%,/.test(rule())).toBe(true);
    expect(/minmax\(\d+(\.\d+)?rem,/.test(rule())).toBe(false);
  });

  it('adds no viewport media query for the grid', () => {
    const src = readFileSync(TOOL, 'utf8');
    expect(/@media[^{]*\{[^}]*\.uni-bigq-list/.test(src)).toBe(false);
  });
});
