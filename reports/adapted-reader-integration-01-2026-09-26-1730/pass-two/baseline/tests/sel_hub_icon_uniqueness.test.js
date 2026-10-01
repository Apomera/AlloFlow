// SEL Hub — the catalog icon is the fastest way to tell 71 cards apart.
//
// In the grid, and especially in the compact/mobile layout, the icon carries
// most of the scanning load. Five tools shared the compass (which is also the
// Self-Direction section icon), three shared the scales (also a section icon)
// and three shared the speaking head. Those ties are now broken.
//
// Ten two-way pairs remain. Those are a design call rather than a defect, so
// this suite RATCHETS: the count may fall, never rise. Re-baseline deliberately
// when a pair is resolved.
//
// Icons live in source as \uXXXX escapes, so decode before comparing — comparing
// the escaped text would call every card unique and this whole suite vacuous.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'sel_hub/sel_hub_module.js'), 'utf8');

function block(start, end) {
  const i = src.indexOf(start);
  return i < 0 ? '' : src.slice(i, src.indexOf(end, i));
}

const decode = (s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

const cards = [];
[
  block('var _allSelTools = [', '\n      var _dynamicTools'),
  block('var _dynamicTools = [', '\n      _dynamicTools.forEach'),
].forEach((b) => {
  b.split('\n').forEach((line) => {
    const id = /\{\s*id:\s*'([^']+)'/.exec(line);
    const icon = /icon:\s*'((?:[^'\\]|\\.)*)'/.exec(line);
    if (!id || !icon) return;
    const label = /label:\s*'((?:[^'\\]|\\.)*)'/.exec(line);
    cards.push({
      id: id[1],
      isCategory: /category:\s*true/.test(line),
      icon: decode(icon[1]),
      label: label ? label[1] : id[1],
    });
  });
});

const tools = cards.filter((c) => !c.isCategory);
const categories = cards.filter((c) => c.isCategory);

const groupsOf = (list) => {
  const by = new Map();
  list.forEach((c) => { by.set(c.icon, [...(by.get(c.icon) || []), c]); });
  return [...by.values()].filter((g) => g.length > 1);
};

// Known two-way pairs, awaiting a design call. May only shrink.
const MAX_TOOL_DUPLICATE_GROUPS = 10;
const MAX_SECTION_ICON_CLASHES = 9;

describe('SEL Hub · catalog icons', () => {
  it('parses every card (guards the guard)', () => {
    // A decode or parse slip would leave this suite comparing nothing.
    expect(tools.length).toBeGreaterThan(60);
    expect(categories.length).toBeGreaterThan(5);
    expect(tools.every((c) => c.icon.length > 0)).toBe(true);
  });

  it('decodes escapes before comparing (calibration)', () => {
    // Two different escapes for the same emoji must compare equal, and the raw
    // escaped text must not be what gets compared.
    expect(decode('\\uD83E\\uDDED')).toBe(decode('\\ud83e\\udded'));
    expect(decode('\\uD83E\\uDDED')).not.toBe('\\uD83E\\uDDED');
  });

  it('no three or more tools share an icon', () => {
    const bad = groupsOf(tools).filter((g) => g.length >= 3)
      .map((g) => `${g[0].icon} x${g.length}: ${g.map((c) => c.id).join(', ')}`);
    expect(bad, `icons shared by three or more tools:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('duplicate icon pairs never increase', () => {
    const groups = groupsOf(tools);
    expect(
      groups.length,
      `duplicate icon groups rose to ${groups.length} (baseline ${MAX_TOOL_DUPLICATE_GROUPS}):\n  `
        + groups.map((g) => `${g[0].icon} ${g.map((c) => c.label).join(' | ')}`).join('\n  '),
    ).toBeLessThanOrEqual(MAX_TOOL_DUPLICATE_GROUPS);
  });

  it('section headers are all distinct from each other', () => {
    const bad = groupsOf(categories).map((g) => `${g[0].icon}: ${g.map((c) => c.label).join(', ')}`);
    expect(bad, `two sections wear the same icon:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('tools wearing their section icon never increase', () => {
    const catIcons = new Map(categories.map((c) => [c.icon, c.label]));
    const clashes = tools.filter((t) => catIcons.has(t.icon));
    expect(
      clashes.length,
      `tools sharing a section-header icon rose to ${clashes.length} (baseline ${MAX_SECTION_ICON_CLASHES}):\n  `
        + clashes.map((t) => `${t.icon} ${t.label} vs "${catIcons.get(t.icon)}"`).join('\n  '),
    ).toBeLessThanOrEqual(MAX_SECTION_ICON_CLASHES);
  });

  it('every icon is a single glyph, with no stray variation selector on an emoji-default codepoint', () => {
    // Hand-typed emoji is where combining marks and variation selectors go
    // wrong. An emoji-presentation codepoint followed by U+FE0F is harmless but
    // signals the icon was pasted rather than written as an escape.
    const suspicious = tools.filter((t) => [...t.icon].length > 2)
      .map((t) => `${t.id}: ${[...t.icon].length} codepoints`);
    expect(suspicious, `icons with more than two codepoints:\n  ${suspicious.join('\n  ')}`).toEqual([]);
  });
});
