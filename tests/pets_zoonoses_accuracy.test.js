// Pets Lab — Zoonoses & One Health.
//
// This view tells a reader what to do about rabies exposure and about
// toxoplasmosis in pregnancy. Wrong prose here does not produce a wrong answer
// on a worksheet; it produces someone not seeking care. Four things pinned,
// all added 2026-07-28:
//
//  1. TOXOPLASMOSIS IMMUNITY WAS BACKWARDS. The card said "most cat-owning
//     humans have already been exposed and developed immunity." US
//     seroprevalence is roughly 1 in 10 (NHANES), so most US cat owners are
//     still SUSCEPTIBLE. The high-seroprevalence figure belongs to parts of
//     Europe and South America. Offering false reassurance to the one group
//     the card singles out — pregnant readers — is the worst direction for
//     this particular error to point.
//
//  2. RABIES PEP HAD A FAKE DEADLINE. "PEP within hours of suspected
//     exposure" implies a window that closes. There is no cutoff (CDC), and a
//     reader who thinks they missed it may not seek care at all — again, the
//     error pointed toward inaction.
//
//  3. THE TOOL CONTRADICTED ITSELF ON LYME, on one screen. The Lyme card said
//     Maine "has the highest US incidence rate"; the Maine-reality box below
//     it said "one of the highest". The stronger claim is the less defensible
//     one — the top spot moves between Maine, Vermont and New Hampshire.
//
//  4. A NEGATIVE SALMONELLA TEST DOES NOT CLEAR A REPTILE. Shedding is
//     intermittent. "All reptiles shed" is kept intact because a quiz item
//     depends on it; the intermittency point is additive.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_pets.js';
const ID = 'petsLab';
const SRC = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');

function extractArray(name) {
  const i = SRC.indexOf('var ' + name + ' = [');
  expect(i, name + ' is gone from the source').toBeGreaterThan(-1);
  const o = SRC.indexOf('[', i);
  let d = 0, j = o;
  for (; j < SRC.length; j++) {
    if (SRC[j] === '[') d++;
    else if (SRC[j] === ']') { d--; if (!d) { j++; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(o, j) + ')');
}
const ZOONOSES = extractArray('ZOONOSES');
const byId = (id) => ZOONOSES.find((z) => z.id === id);

function text(html) {
  return html.replace(/&amp;/g, '&').replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
const zooView = () => text(renderTool(ID, { [ID]: { view: 'zoonoses' } }));

beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z')); });
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => { resetStemLab(); loadTool(FILE, ID); });

describe('every disease card is complete', () => {
  it('states source, severity, protection and a citation', () => {
    expect(ZOONOSES.length).toBeGreaterThanOrEqual(6);
    for (const z of ZOONOSES) {
      for (const f of ['id', 'name', 'from', 'severity', 'protect', 'cite']) {
        expect(typeof z[f], z.id + ' missing ' + f).toBe('string');
        expect(z[f].length, z.id + '.' + f + ' is too short to be real').toBeGreaterThan(2);
      }
    }
  });

  it('renders all of them', () => {
    const html = zooView();
    for (const z of ZOONOSES) expect(html, z.id + ' does not reach the screen').toContain(z.name);
  });
});

describe('toxoplasmosis does not offer false immunity', () => {
  it('no longer claims most cat owners are already immune', () => {
    const html = zooView();
    expect(html).not.toMatch(/already been exposed and developed immunity/i);
    expect(byId('toxo').severity).not.toMatch(/most cat-owning humans have already/i);
  });

  it('says plainly that most US readers are still susceptible', () => {
    const s = byId('toxo').severity;
    expect(s).toMatch(/do not assume|do NOT assume/i);
    expect(s).toMatch(/1 in 10|11%|10%/);
    expect(s).toMatch(/susceptible/i);
  });

  it('explains where the wrong belief comes from rather than only deleting it', () => {
    // A reader who has heard "everyone has had it already" needs to know why
    // it is wrong here, or they will keep believing the version they heard.
    expect(byId('toxo').severity).toMatch(/Europe|South America/);
  });

  it('names the route that actually dominates in the US', () => {
    expect(byId('toxo').severity).toMatch(/undercooked meat/i);
    expect(byId('toxo').severity).toMatch(/produce/i);
  });

  it('keeps the practical litter-box guidance intact', () => {
    const p = byId('toxo').protect;
    expect(p).toMatch(/someone else cleans litter box/i);
    expect(p).toMatch(/24\+ hr/);
  });

  it('gives the mechanism behind "indoor cats are low risk"', () => {
    // The reassurance is real, but it is only trustworthy with the reason.
    const p = byId('toxo').protect;
    expect(p).toMatch(/week or two/i);
    expect(p).toMatch(/first infection/i);
  });

  it('agrees with the quiz item that covers the same ground', () => {
    // Both surfaces must land on meat/produce as the higher risk, or a
    // student gets one answer from the card and another from the quiz.
    const q = SRC.slice(SRC.indexOf('toxoplasmosis risk?'), SRC.indexOf('toxoplasmosis risk?') + 1400);
    expect(q).toMatch(/undercooked meat/i);
    expect(q).toMatch(/Indoor cats fed only commercial food are very low risk/i);
  });
});

describe('rabies advice does not imply a closed window', () => {
  it('drops the "within hours" deadline', () => {
    expect(byId('rabies').protect).not.toMatch(/within hours/i);
    expect(zooView()).not.toMatch(/PEP \(post-exposure prophylaxis\) within hours/i);
  });

  it('says there is no cutoff and to seek care late', () => {
    const p = byId('rabies').protect;
    expect(p).toMatch(/no cutoff|NO cutoff/);
    expect(p).toMatch(/even if days have already passed/i);
  });

  it('still conveys that sooner is better', () => {
    // Removing a false deadline must not read as "no rush".
    expect(byId('rabies').protect).toMatch(/as soon as/i);
    expect(byId('rabies').protect).toMatch(/Sooner is better/i);
  });

  it('gives the one action a bystander can take immediately', () => {
    const p = byId('rabies').protect;
    expect(p).toMatch(/soap and running water/i);
    expect(p).toMatch(/15 minutes/i);
  });

  it('keeps the bat rule and the vaccination rule', () => {
    const p = byId('rabies').protect;
    expect(p).toMatch(/ANY bat indoors/);
    expect(p).toMatch(/Vaccinate dogs \+ cats/i);
    expect(byId('rabies').severity).toMatch(/FATAL once symptoms appear/i);
  });
});

describe('the Maine Lyme claim is consistent across the view', () => {
  it('does not assert a bare national #1', () => {
    expect(byId('lyme').severity).not.toMatch(/has the highest US incidence/i);
    expect(zooView()).not.toMatch(/Maine has the highest US incidence/i);
  });

  it('names the states it trades places with', () => {
    const s = byId('lyme').severity;
    expect(s).toMatch(/Vermont/);
    expect(s).toMatch(/New Hampshire/);
  });

  it('the card and the Maine-reality box make the same strength of claim', () => {
    // Both render on one screen; a reader seeing "the highest" above "one of
    // the highest" cannot tell which the tool means.
    const html = zooView();
    expect(html).toMatch(/one of the highest US Lyme/i);
    const superlatives = (html.match(/the highest US/gi) || []).length;
    const hedged = (html.match(/one of the highest US/gi) || []).length;
    expect(superlatives, 'an unhedged "the highest US" is back').toBe(hedged);
  });

  it('keeps the actionable Maine content', () => {
    const html = zooView();
    expect(html).toMatch(/Year-round tick prevention/i);
    expect(html).toMatch(/rabies vaccine is legally required/i);
    expect(byId('lyme').protect).toMatch(/40.F|40°F/);
  });
});

describe('a negative Salmonella test does not clear a reptile', () => {
  it('says intermittent shedding makes one test meaningless', () => {
    const html = text(renderTool(ID, { [ID]: { view: 'reptiles' } }));
    expect(html).toMatch(/intermittent/i);
    expect(html).toMatch(/does NOT clear the animal/i);
  });

  it('leaves the universal-shedding statement standing', () => {
    // A quiz item is scored against it; weakening it here would make the
    // keyed answer wrong.
    const html = text(renderTool(ID, { [ID]: { view: 'reptiles' } }));
    expect(html).toMatch(/all reptiles \+ amphibians shed Salmonella/i);
    expect(SRC).toMatch(/Reptiles universally shed Salmonella/);
  });

  it('keeps the under-5 household guidance', () => {
    const html = text(renderTool(ID, { [ID]: { view: 'reptiles' } }));
    expect(html).toMatch(/no reptiles in households with children under 5/i);
  });
});

describe('One Health framing survives', () => {
  it('keeps the CDC proportions that motivate the section', () => {
    const html = zooView();
    expect(html).toMatch(/60%/);
    expect(html).toMatch(/75%/);
    expect(html).toMatch(/One Health/);
  });
});
