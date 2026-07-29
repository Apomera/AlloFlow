// Pets Lab — Career Pathways provenance.
//
// Students make real decisions on these numbers, so the question is not only
// "is the figure right" but "can a reader tell how much weight it carries".
//
// Before 2026-07-28 the section said "Salaries from BLS OEWS 2024 medians
// where available" — true, but it hid WHICH. Only veterinarian and vet tech
// are distinct BLS occupations with a published national median; the other six
// (behaviorist, trainer, wildlife rehabber, shelter director, lab-animal
// specialist, marine mammal trainer) are folded into broader categories or not
// surveyed, so their ranges come from professional bodies and job listings. A
// job-board range and a national survey median rendered identically.
//
// Two further gaps, both material for this tool's Maine-localised audience:
// every figure is NATIONAL, and wage data expires.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_pets.js';
const ID = 'petsLab';
const SRC = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');

function extractCareers() {
  const i = SRC.indexOf('var CAREER_PATHS = [');
  const o = SRC.indexOf('[', i);
  let d = 0, j = o;
  for (; j < SRC.length; j++) {
    if (SRC[j] === '[') d++;
    else if (SRC[j] === ']') { d--; if (!d) { j++; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(o, j) + ')');
}
const CAREERS = extractCareers();

function text(html) {
  return html.replace(/&amp;/g, '&').replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
const careersView = () => text(renderTool(ID, { [ID]: { view: 'careers' } }));

beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z')); });
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => { resetStemLab(); loadTool(FILE, ID); });

describe('career data is complete', () => {
  it('every path states salary, outlook, education and where', () => {
    expect(CAREERS.length).toBeGreaterThanOrEqual(6);
    for (const c of CAREERS) {
      expect(typeof c.id).toBe('string');
      expect(c.id.length, 'id is empty').toBeGreaterThan(0);
      for (const f of ['title', 'salary', 'growth', 'edu', 'where']) {
        expect(typeof c[f], c.id + ' missing ' + f).toBe('string');
        expect(c[f].length, c.id + '.' + f + ' is too short to be real').toBeGreaterThan(3);
      }
      expect(Array.isArray(c.tags)).toBe(true);
    }
  });

  it('spans more than one training level', () => {
    // The section's premise is that animal work is not all doctorate-track.
    const tags = new Set(CAREERS.flatMap((c) => c.tags));
    expect(tags.has('trade') || tags.has('AAS')).toBe(true);
    expect(tags.has('doctorate') || tags.has('PhD-track')).toBe(true);
  });
});

describe('a reader can tell a BLS median from an estimate', () => {
  it('marks every card as one or the other', () => {
    // Count by each chip's unique tooltip, not by the visible word: the
    // phrase "BLS median" also appears in the intro copy AND inside the
    // estimate chip's own tooltip, which made a naive count read 15 for 8
    // cards.
    const html = careersView();
    const bls = (html.match(/National median from the BLS Occupational Employment/g) || []).length;
    const est = (html.match(/Not a separate BLS occupation/g) || []).length;
    expect(bls, 'expected exactly the BLS-surveyed occupations').toBe(2);
    expect(bls + est, 'not every career card carries a provenance chip').toBe(CAREERS.length);
  });

  it('marks exactly the two real BLS occupations', () => {
    const m = SRC.match(/var CAREER_BLS_SOURCED = \{([^}]*)\}/);
    expect(m, 'the BLS-sourced map is gone').toBeTruthy();
    expect(m[1]).toMatch(/\bvet\s*:\s*true/);
    expect(m[1]).toMatch(/\bvetTech\s*:\s*true/);
    const flagged = [...m[1].matchAll(/(\w+)\s*:\s*true/g)].map((x) => x[1]);
    expect(flagged.sort()).toEqual(['vet', 'vetTech']);
  });

  it('every flagged id is a real career entry', () => {
    const m = SRC.match(/var CAREER_BLS_SOURCED = \{([^}]*)\}/);
    const flagged = [...m[1].matchAll(/(\w+)\s*:\s*true/g)].map((x) => x[1]);
    const ids = new Set(CAREERS.map((c) => c.id));
    for (const f of flagged) expect(ids.has(f), f + ' is flagged BLS but is not a career id').toBe(true);
  });

  it('explains what the weaker label means rather than just showing a word', () => {
    expect(SRC).toMatch(/Not a separate BLS occupation/);
    expect(SRC).toMatch(/weaker evidence than a BLS median/);
  });
});

describe('the numbers are framed as national and perishable', () => {
  it('says the figures are national, not local', () => {
    expect(careersView()).toMatch(/national/i);
  });

  it('warns that rural Maine differs from a national median', () => {
    // The tool localises everything else to Maine; presenting national pay
    // without that caveat is the mismatch.
    const html = careersView();
    expect(html).toMatch(/rural Maine/i);
    expect(html).toMatch(/compare local postings/i);
  });

  it('tells the reader to check current BLS rather than trusting the page', () => {
    const html = careersView();
    expect(html).toMatch(/goes stale|stale/i);
    expect(html).toMatch(/Occupational Outlook Handbook/i);
  });

  it('still names the vintage of what is shown', () => {
    const html = careersView();
    expect(html).toMatch(/2024/);
    expect(html).toMatch(/2022.{0,3}2032/);
  });
});
