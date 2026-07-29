// Pets Lab — Service & Support Animals.
//
// This section names its own audience as "handlers, businesses, school staff,
// and bystanders", which makes it the highest-consequence prose in the tool: a
// family or a school acting on a wrong reading of the ADA gets someone
// unlawfully excluded, or gets a handler embarrassed and ejected.
//
// Two things pinned here, both added 2026-07-28:
//
//  1. THE RULE HAS TWO HALVES. The card listed only what staff may NOT do —
//     two questions, no documentation, no demonstration — and never mentioned
//     28 CFR 36.302(c)(2), under which an out-of-control or non-housebroken
//     animal may lawfully be excluded. As written it read "you can never say
//     no", which is wrong, leaves school staff with no lawful response to a
//     genuinely disruptive animal, and undercuts legitimate handlers by
//     erasing the line between a working dog and a pet in a vest.
//
//  2. Reading-to-dogs was stated as improving fluency. Systematic reviews are
//     cautious (Hall, Gee & Mills 2016); the tool now says so.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_pets.js';
const ID = 'petsLab';
const SRC = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');

function text(html) {
  return html.replace(/&amp;/g, '&').replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#xA7;/g, '§');
}
const serviceView = () => text(renderTool(ID, { [ID]: { view: 'service' } }));

beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z')); });
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => { resetStemLab(); loadTool(FILE, ID); });

describe('the ADA access rule is stated in BOTH directions', () => {
  it('keeps the limits on what staff may ask', () => {
    const html = serviceView();
    expect(html).toMatch(/only TWO questions/i);
    expect(html).toMatch(/CANNOT ask for documentation/i);
  });

  it('also states the lawful grounds for exclusion', () => {
    const html = serviceView();
    expect(html, 'the out-of-control ground is missing').toMatch(/out of control/i);
    expect(html, 'the not-housebroken ground is missing').toMatch(/not housebroken/i);
  });

  it('cites the regulation rather than asserting it bare', () => {
    expect(serviceView()).toMatch(/36\.302/);
  });

  it('says the handler must still be served without the animal', () => {
    // Exclusion of the animal is not exclusion of the person — the half of
    // the provision most often dropped when it is summarised.
    expect(serviceView()).toMatch(/served without the animal/i);
  });

  it('names allergies and fear as NOT valid grounds', () => {
    // The most common wrong reason given in practice.
    expect(serviceView()).toMatch(/Allergies and fear of dogs are NOT valid grounds/i);
  });

  it('states the control requirement and its exception', () => {
    const html = serviceView();
    expect(html).toMatch(/harnessed, leashed, or tethered/i);
    expect(html).toMatch(/voice or signal/i);
  });
});

describe('the three categories stay legally distinct', () => {
  it('keeps ESA outside the ADA', () => {
    const html = serviceView();
    expect(html).toMatch(/NOT a service animal under the ADA/i);
    expect(html).toMatch(/Fair Housing Act/i);
  });

  it('keeps the 2021 air-travel change', () => {
    expect(serviceView()).toMatch(/DOT removed ESA accommodation.*2021/i);
  });

  it('keeps "no federal registry" and self-training validity', () => {
    const html = serviceView();
    expect(html).toMatch(/No federal certification or registration exists/i);
    expect(html).toMatch(/self-trained service dog is equally legal/i);
  });

  it('does not claim a service animal may be any species', () => {
    // ADA service animals are dogs (with a separate miniature-horse
    // provision). "Any species" belongs to ESAs only.
    const html = serviceView();
    const dogIdx = html.indexOf('Service dog (ADA');
    const esaIdx = html.indexOf('Emotional Support Animal');
    expect(dogIdx).toBeGreaterThan(-1);
    expect(esaIdx).toBeGreaterThan(dogIdx);
    const dogCard = html.slice(dogIdx, esaIdx);
    expect(dogCard).not.toMatch(/any species/i);
    expect(dogCard).toMatch(/miniature horse/i);
  });
});

describe('reading-to-dogs is not overclaimed', () => {
  it('does not assert a fluency improvement as established', () => {
    const html = serviceView();
    expect(html).not.toMatch(/improve struggling readers' fluency/i);
  });

  it('says plainly that the effect is unsettled, and cites a review', () => {
    const html = serviceView();
    expect(html).toMatch(/not settled/i);
    expect(html).toMatch(/Hall, Gee & Mills 2016/);
  });

  it('keeps what IS supported — the affective benefit', () => {
    // Hedging must not delete the real finding: children report enjoying it
    // and feeling less self-conscious.
    expect(serviceView()).toMatch(/less self-conscious/i);
  });

  it('warns it is not a substitute for a reading intervention', () => {
    // The practical consequence for a school allocating intervention time.
    expect(serviceView()).toMatch(/not as a substitute for an evidence-based reading intervention/i);
  });
});

describe('source-level guard', () => {
  it('the exclusion provision lives in the service view, not just anywhere', () => {
    const start = SRC.indexOf('function renderService()');
    const end = SRC.indexOf('function renderPicker()');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = SRC.slice(start, end);
    expect(body).toMatch(/36\.302\(c\)\(2\)/);
    expect(body).toMatch(/out of control/i);
  });
});
