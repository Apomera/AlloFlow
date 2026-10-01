// Pets Lab — Zoonoses & One Health.
//
// These checks deliberately pin actions, exposure routes, higher-risk groups,
// and primary sources rather than volatile prevalence or state-ranking facts.
// The tool teaches prevention and expert escalation; it must not imply that a
// species alone diagnoses exposure or that an activity result clears a real
// medical or veterinary concern.

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
  it('states source, severity, protection and a linked citation', () => {
    expect(ZOONOSES.length).toBeGreaterThanOrEqual(6);
    for (const z of ZOONOSES) {
      for (const f of ['id', 'name', 'from', 'severity', 'protect', 'cite', 'sourceUrl']) {
        expect(typeof z[f], z.id + ' missing ' + f).toBe('string');
        expect(z[f].length, z.id + '.' + f + ' is too short to be real').toBeGreaterThan(2);
      }
      expect(z.sourceUrl, z.id + ' needs an HTTPS source').toMatch(/^https:\/\//);
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

  it('identifies the groups for whom a new infection can be especially serious', () => {
    const s = byId('toxo').severity;
    expect(s).toMatch(/new infection during pregnancy/i);
    expect(s).toMatch(/weakened immune systems/i);
    expect(s).toMatch(/serious complications/i);
  });

  it('covers litter, food, soil, water and produce routes without blaming ordinary contact', () => {
    const p = byId('toxo').protect;
    expect(p).toMatch(/undercooked meat/i);
    expect(p).toMatch(/soil, water, or produce/i);
    expect(p).toMatch(/cat feces/i);
    expect(p).toMatch(/not ordinary contact with a cat alone/i);
  });

  it('gives current litter-box timing, barrier and hand-hygiene guidance', () => {
    const p = byId('toxo').protect;
    expect(p).toMatch(/someone else change litter/i);
    expect(p).toMatch(/disposable gloves/i);
    expect(p).toMatch(/wash hands/i);
    expect(p).toMatch(/change litter daily/i);
    expect(p).toMatch(/1–5 days/);
  });

  it('links CDC prevention guidance and agrees with the quiz', () => {
    expect(byId('toxo').sourceUrl).toBe('https://www.cdc.gov/toxoplasmosis/prevention/index.html');
    const q = SRC.slice(SRC.indexOf('toxoplasmosis risk?'), SRC.indexOf('toxoplasmosis risk?') + 1400);
    expect(q).toMatch(/Keep the cat/i);
    expect(q).toMatch(/someone else change litter/i);
    expect(q).toMatch(/food and soil precautions/i);
    expect(q).toMatch(/ordinary contact with a cat is not the typical route/i);
  });
});

describe('rabies advice preserves a case-specific exposure assessment', () => {
  it('avoids fake deadlines, blanket indoor-bat rules and symptom-stage absolutes', () => {
    expect(byId('rabies').protect).not.toMatch(/within hours/i);
    expect(byId('rabies').protect).not.toMatch(/ANY bat indoors/);
    expect(byId('rabies').severity).not.toMatch(/always fatal|fatal once symptoms appear/i);
  });

  it('starts with current vaccination and prompt wound washing', () => {
    const p = byId('rabies').protect;
    expect(p).toMatch(/current on vaccination/i);
    expect(p).toMatch(/wash promptly and thoroughly with soap and water/i);
  });

  it('uses the conditional bat-contact rule and preserves the bat for advice or testing', () => {
    const p = byId('rabies').protect;
    expect(p).toMatch(/bat contact happened or cannot be ruled out/i);
    expect(p).toMatch(/do not touch or release the bat/i);
    expect(p).toMatch(/keep people and pets away/i);
  });

  it('assigns testing and post-exposure decisions to the right experts', () => {
    const p = byId('rabies').protect;
    expect(p).toMatch(/public health or animal control/i);
    expect(p).toMatch(/medical professional/i);
    expect(p).toMatch(/Public health evaluates whether testing and post-exposure prophylaxis are needed/i);
  });

  it('conveys severity without turning the card into self-triage', () => {
    expect(byId('rabies').severity).toMatch(/extremely high fatality rate/i);
    expect(byId('rabies').severity).toMatch(/prevention happen before symptoms/i);
    expect(byId('rabies').sourceUrl).toBe('https://www.cdc.gov/rabies/prevention/bats.html');
  });
});

describe('Maine tick guidance is specific without overstating rankings', () => {
  it('does not assert a bare national #1', () => {
    expect(byId('lyme').severity).not.toMatch(/has the highest US incidence/i);
    expect(zooView()).not.toMatch(/Maine has the highest US incidence/i);
  });

  it('explains that tick infection and exposure risk vary', () => {
    const s = byId('lyme').severity;
    expect(s).toMatch(/several infections/i);
    expect(s).toMatch(/not every tick is infected/i);
    expect(s).toMatch(/species, location, and attachment/i);
  });

  it('makes prevention, checks and prompt removal the actionable content', () => {
    const p = byId('lyme').protect;
    expect(p).toMatch(/veterinarian-recommended tick-prevention plan/i);
    expect(p).toMatch(/check people and animals/i);
    expect(p).toMatch(/remove attached ticks promptly/i);
    expect(p).toMatch(/Maine CDC guidance/i);
  });

  it('renders a measured Maine summary and current vaccination rule', () => {
    const html = zooView();
    expect(html).toMatch(/one of the highest US Lyme \+ anaplasmosis incidence rates/i);
    expect(html).toMatch(/veterinarian-guided tick-prevention plan/i);
    expect(html).toMatch(/remain current on rabies vaccination at the intervals that apply to the vaccine used/i);
    expect(byId('lyme').sourceUrl).toBe('https://www.maine.gov/dhhs/mecdc/diseases-conditions/insect-borne-diseases/ticks');
  });
});

describe('Salmonella guidance reduces direct and indirect exposure', () => {
  it('does not treat a negative sample as future clearance', () => {
    const html = text(renderTool(ID, { [ID]: { view: 'reptiles' } }));
    expect(html).toMatch(/negative sample does not clear future shedding/i);
  });

  it('uses CDC-style healthy-carrier language and covers habitat exposure', () => {
    const card = byId('salmonella');
    expect(card.protect).toMatch(/carry Salmonella while looking healthy/i);
    expect(card.protect).toMatch(/animal, food, waste, habitat, or tank water/i);
    expect(card.protect).toMatch(/out of food-preparation areas/i);
    const html = text(renderTool(ID, { [ID]: { view: 'reptiles' } }));
    expect(html).toMatch(/reptiles \+ amphibians commonly carry Salmonella and can shed it/i);
    expect(SRC).not.toMatch(/universally shed Salmonella|shedding is universal/i);
  });

  it('names higher-risk groups and preserves CDC choice-and-contact guidance', () => {
    const card = byId('salmonella');
    expect(card.severity).toMatch(/children under 5/i);
    expect(card.severity).toMatch(/adults 65\+/i);
    expect(card.severity).toMatch(/weakened immune systems/i);
    expect(card.protect).toMatch(/higher-risk households to consider another pet/i);
    expect(card.protect).toMatch(/young children should avoid contact/i);
    const html = text(renderTool(ID, { [ID]: { view: 'reptiles' } }));
    expect(html).toMatch(/to consider another pet/i);
    expect(html).toMatch(/young children should avoid reptile and amphibian contact/i);
    expect(html).not.toMatch(/no reptiles in households with children under 5/i);
    expect(card.sourceUrl).toBe('https://www.cdc.gov/healthy-pets/about/reptiles-and-amphibians.html');
  });
});

describe('One Health framing teaches an exposure pathway', () => {
  it('links CDC and joins human, animal, plant and environmental health', () => {
    const html = zooView();
    expect(html).toMatch(/One Health/);
    expect(html).toContain('https://www.cdc.gov/onehealth/index.html');
    expect(html).toMatch(/human, animal, plant, and environmental health/i);
    expect(html).not.toMatch(/60%|75%/);
  });

  it('renders the four-link model and rejects species-only diagnosis', () => {
    const html = zooView();
    expect(html).toContain('data-pets-pathway-model="four-links"');
    expect(html).toMatch(/Exposure:.*Route:.*Person:.*Break point:/is);
    expect(html).toMatch(/animal species alone is not a diagnosis or a complete risk assessment/i);
  });
});
