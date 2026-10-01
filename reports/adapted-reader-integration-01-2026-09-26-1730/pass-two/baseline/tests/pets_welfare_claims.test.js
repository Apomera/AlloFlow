// Pets Lab — welfare and glossary claims say what their sources say.
//
// The glossary and the "what you can do" cards are one-line summaries, and
// one-line summaries round a qualified finding up to an absolute. Each claim
// below had drifted from its source and from the lab's own longer passages,
// checked 2026-09-23:
//
// 1. TNR. "The only humane + effective community-cat management tool"; "AVMA +
//    most major shelters support TNR as the only humane large-scale tool";
//    "reduces population over generations without killing". The AVMA's 2016
//    policy supports properly managed colonies and prefers non-lethal methods
//    first, but says cats outside managed colonies should be removed and does
//    not oppose considering euthanasia for colonies not achieving attrition.
//    In the field, numbers fell only where >70% of cats across a contiguous
//    area were neutered (PNAS 2022). The lab's own section is headed "where the
//    welfare community disagrees", yet ended "the disagreement is about
//    strategy, not facts" — it is partly about evidence.
//
// 2. ESAs on planes. The glossary said "FHA + sometimes DOT"; DOT stopped
//    requiring airlines to accept ESAs in 2021, which the Service page and the
//    ESA access case both already say. It also gave service dogs "full public
//    access" with no exception — the out-of-control case teaches the exception.
//
// 3. Brachycephaly. "Inability to thermoregulate", "can't exercise, can't cool
//    themselves". Hall, Carter & O'Neill 2020 (Sci Rep, 905,543 UK dogs):
//    brachycephalic dogs 2.10x the odds of heat-related illness, Bulldogs 13.95x
//    a Labrador's. Impaired, and dangerous, but not absent.
//
// 4. Allogrooming. "Cats ONLY allogroom individuals they trust"; cats groom
//    mainly preferred companions, but grooming also runs down the hierarchy and
//    can precede aggression (van den Bos 1998).
//
// 5. "ASPCA and AVMA both recommend indoor-only": the ASPCA does; the AVMA
//    recommends confinement — indoors, an outdoor enclosure, or on a leash.
//
// Assertions read the source with comment lines removed, so an explanatory
// comment quoting an old claim cannot trip or satisfy them.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ROOT = process.cwd();
const strip = (s) => s.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const SRC = strip(fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_pets.js'), 'utf8'));
const MIRROR = strip(fs.readFileSync(path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_pets.js'), 'utf8'));

const GLOSSARY = sliceBetween(SRC, 'var GLOSSARY = [', 'var PUNNETT_GOALS = [', { label: 'glossary' });
function term(name) {
  return sliceBetween(GLOSSARY, `{ term: '${name}', def: '`, '\n', { label: `glossary: ${name}` });
}
const TNR_DEBATE = sliceBetween(SRC, "tnrControversy: '", "',\n", { label: 'Welfare & Ethics TNR debate' });
const TNR_ACTION = sliceBetween(SRC, "{ id: 'tnr', icon:", "url:", { label: 'community action: TNR' });

describe('TNR: a qualified tool, and the lab says why', () => {
  it('never calls TNR the only humane or effective option', () => {
    expect(SRC).not.toMatch(/only humane/i);
  });

  it('states the condition under which TNR shrinks a colony, in both summaries', () => {
    expect(term('TNR (Trap-Neuter-Return)')).not.toMatch(/Reduces population over generations/);
    expect(term('TNR (Trap-Neuter-Return)')).toMatch(/only when nearly all of its cats are sterilized and new cats stop arriving/);
    expect(TNR_ACTION).toMatch(/only when nearly all of its cats are sterilized and new cats stop arriving/);
  });

  it('reports the AVMA position as the qualified one it is', () => {
    expect(TNR_DEBATE).toMatch(/The AVMA is more cautious/);
    expect(TNR_DEBATE).toMatch(/cats outside managed colonies should be removed/);
    expect(TNR_DEBATE).toMatch(/does not rule out euthanasia/);
  });

  it('says the disagreement is partly about evidence, and gives the evidence', () => {
    expect(TNR_DEBATE).not.toMatch(/about strategy, not facts/);
    expect(TNR_DEBATE).toMatch(/more than 70% of the cats across a whole area were neutered/);
    expect(TNR_DEBATE).toMatch(/Part is about values/);
  });
});

describe('service dogs and ESAs: the glossary agrees with the Service page', () => {
  it('dates the end of airline ESA accommodation everywhere it comes up', () => {
    expect(term('Service dog vs ESA')).not.toMatch(/sometimes DOT/);
    // One fragment per sentence or string literal. The old glossary line said
    // "Emotional support animal", never "ESA", so both names count.
    const mentions = SRC.split(/(?<!\\)'|\.\s/)
      .filter((x) => /\b(?:airlines?|DOT)\b/.test(x) && /\bESAs?\b|emotional support/i.test(x));
    expect(mentions.length).toBeGreaterThanOrEqual(3);
    for (const m of mentions) expect(m, 'airline ESA claim without its date').toMatch(/2021/);
  });

  it('gives service-dog access with its lawful exception', () => {
    // Whole file: the Service page and the AI ground truth restated it too.
    expect(SRC).not.toMatch(/[Ff]ull public access/);
    expect(term('Service dog vs ESA')).toMatch(/unless it is out of control or not housebroken/);
  });
});

describe('brachycephaly: impaired cooling, quantified', () => {
  it('never says flat-faced breeds cannot cool themselves or exercise', () => {
    expect(SRC).not.toMatch(/inability to thermoregulate|can\\?'t cool themselves|can\\?'t exercise/);
  });

  it('quantifies the heat risk from Hall et al. 2020', () => {
    expect(term('Brachycephalic')).toMatch(/about twice the heatstroke risk/);
    const bullet = sliceBetween(SRC, "' (English bulldog, French bulldog, pug, Persian cat):", "\n", { label: 'genetics brachycephaly bullet' });
    expect(bullet).toMatch(/about 14 times a Labrador\\'s odds of heatstroke/);
  });
});

describe('smaller glossary and attribution fixes', () => {
  it('does not say cats groom only cats they trust', () => {
    expect(term('Allogrooming')).not.toMatch(/only allogroom/);
    expect(term('Allogrooming')).toMatch(/preferred companions/);
  });

  // Swiss TSchV Art. 64(2) bars housing young rabbits alone for eight weeks;
  // adult rabbits may be kept alone. Guinea pigs may not, which the lab says.
  it('says solo housing is illegal in Switzerland for guinea pigs, never rabbits', () => {
    const illegal = SRC.split(/(?<!\\)'|\.\s/).filter((x) => /Switzerland|Swiss/.test(x) && /illegal/i.test(x));
    expect(illegal.length).toBeGreaterThanOrEqual(2);
    for (const x of illegal) expect(x, 'Swiss solo-housing claim about rabbits').not.toMatch(/rabbit/i);
    expect(SRC).toMatch(/young rabbits may not be housed alone in their first eight weeks/);
  });

  it('keeps the ASPCA and AVMA indoor recommendations distinct', () => {
    expect(SRC).not.toMatch(/ASPCA and AVMA both recommend indoor-only/);
    expect(SRC).toMatch(/the AVMA recommends keeping them confined \(indoors, in an outdoor enclosure, or on a leash\)/);
  });
});

// 6. Spay/neuter. "≈0.5% if spayed before 1st heat vs ≈26% later" printed
//    Schneider et al. 1969's RELATIVE risks (vs an intact dog) as rates; a 2012
//    systematic review (Beauvais et al., JSAP) judged the dog evidence weak.
//    Cats are stronger: spaying before 6 months, 91% fewer mammary carcinomas
//    (Overley et al. 2005). "Reduces prostate disease" omitted that prostate
//    cancers are commoner in neutered dogs (Bryan et al. 2007). Rabbits "~80%
//    uterine cancer by age 5" is an old laboratory-colony figure for particular
//    breeds; in 854 female pet rabbits at necropsy, 26.8% had uterine disease
//    of ANY kind (Bertram et al. 2018). Spaying remains the advice throughout.
const SPAY = sliceBetween(SRC, 'spayNeuter: {', 'behavior: [', { label: 'Welfare spay/neuter health' });

describe('spay/neuter: the health numbers mean what they say', () => {
  it('presents the 1969 dog figures as relative risks with weak evidence', () => {
    expect(SRC).not.toMatch(/0\.5% if spayed/);
    expect(SPAY).toMatch(/relative risks, not rates/);
    expect(SPAY).toMatch(/2012 systematic review rated the dog evidence weak/);
    expect(SPAY).toMatch(/91% fewer mammary carcinomas/);
  });

  // Timing credited "AVMA + 2013 large-breed research" with waiting "for some
  // giant breeds". Hart et al. 2020 (35 breeds): the joint-disorder risk of
  // neutering before a year was in large breeds (Golden, Labrador, German
  // Shepherd); for most breeds age made no difference; small breeds none.
  it('describes neuter timing by what the breed studies found', () => {
    expect(SRC).not.toMatch(/AVMA \+ 2013|for some giant breeds/);
    expect(SRC).toMatch(/For some large dog breeds \(Golden Retriever, Labrador, German Shepherd\)/);
    expect(SRC).toMatch(/most showed no such effect, and small breeds none/);
  });

  it('gives the prostate trade-off, not a blanket benefit', () => {
    expect(SPAY).not.toMatch(/Reduces prostate disease in dogs/);
    expect(SPAY).toMatch(/prostate cancers are more common in neutered dogs/);
  });

  it('never states the laboratory-colony rabbit figure as a pet-rabbit fact', () => {
    const mentions = SRC.split(/(?<!\\)'|\.\s/).filter((x) => /80%/.test(x) && /uterine|rabbit/i.test(x));
    expect(mentions.length).toBeGreaterThanOrEqual(2);
    for (const m of mentions) expect(m, 'rabbit 80% figure without its origin').toMatch(/laboratory/);
    expect(SPAY).toMatch(/about a quarter \(26\.8%\) had uterine disease of any kind/);
  });
});

// 7. Declawing. Martell-Moran et al. 2018 (JFMS, 274 cats) reported ODDS by
//    outcome: back pain 2.9, house-soiling 7.2, biting 4.5; the lab said "7× the
//    rate of unwanted behaviors". The AVMA's 2020 policy DISCOURAGES elective
//    declawing (the AAFP opposes it). US statewide bans (ALDF, 2026): NY 2019,
//    MD 2022, VA 2024, CA/MA/RI 2025, plus DC 2023; the lab listed two states.
describe('declawing: the study, the policies and the bans as they stand', () => {
  const DECLAW = sliceBetween(SRC, 'declawing: {', 'outdoorCats: {', { label: 'Welfare declawing' });

  it('reports the 2018 odds ratios by outcome', () => {
    expect(DECLAW).not.toMatch(/7× the rate of unwanted behaviors/);
    expect(DECLAW).toMatch(/about 3 times the odds of back pain, 7 times the odds of house-soiling, and 4\.5 times the odds of biting/);
  });

  it('says the AVMA discourages and the AAFP opposes', () => {
    expect(DECLAW).not.toMatch(/Opposed by AVMA/);
    expect(DECLAW).toMatch(/Discouraged by the AVMA \(2020 policy/);
  });

  it('lists all six state bans and DC', () => {
    for (const s of ['New York \\(2019\\)', 'Maryland \\(2022\\)', 'Virginia \\(2024\\)', 'California, Massachusetts and Rhode Island \\(2025\\)', 'Washington, DC \\(2023\\)']) {
      expect(DECLAW).toMatch(new RegExp(s));
    }
    expect(DECLAW).toMatch(/six states ban elective declawing/);
  });
});

// 7b. Adoption. ASPCA pet statistics, 2025 data (Shelter Animals Count): 5.8
//     million dogs and cats entered shelters and rescues, ~597,000 euthanized.
//     The lab said 6.3 million / 920,000 "(ASPCA 2024)", older estimates, in two
//     places. "Pre-evaluated for temperament": shelter behavior evaluations
//     predict post-adoption biting poorly (Patronek & Bradley 2016).
describe('adoption: current shelter numbers, honest about temperament tests', () => {
  it('uses the 2025 shelter figures everywhere', () => {
    expect(SRC).not.toMatch(/6\.3 million|920,000/);
    expect(SRC).toMatch(/About 5\.8 million dogs and cats entered US shelters and rescues in 2025, and about 597,000 were euthanized/);
    expect(SRC).toMatch(/shelter intake is already about 5\.8 million dogs and cats a year/);
  });

  it('does not promise that a shelter test has vetted temperament', () => {
    expect(SRC).not.toMatch(/pre-evaluated for temperament/);
    expect(SRC).toMatch(/Formal shelter behavior tests predict poorly/);
  });
});

// 7c. The litter calculator multiplied one female by 3.2 a year, never let a
//     cat die, and showed ~5,000 cats at 7 years under the caption "HSUS
//     conservative estimate, assuming 50% survival" (its code comment said
//     80%). The page said "hundreds" and the TNR card "100+". It now runs on
//     measured rates (Nutter et al. 2004, JAVMA): 1.4 litters/yr, 3 kittens,
//     75% of kittens dead or gone by 6 months. These tests run the page's own
//     function and check every sentence that quotes it.
const MODEL_SRC = sliceBetween(SRC, 'var LITTER_MODEL = {', 'var WELFARE_DATA = {', { label: 'litter model' });
const { LITTER_MODEL, petsLitterMath } = new Function(`${MODEL_SRC}; return { LITTER_MODEL, petsLitterMath };`)();

describe('litter calculator: measured rates, one model behind every number', () => {
  it('uses the field-study rates', () => {
    expect(LITTER_MODEL).toEqual({ littersPerYear: 1.4, kittensPerLitter: 3, kittenSurvival: 0.25, femaleShare: 0.5 });
  });

  it('computes an upper bound in the hundreds, not thousands, at 7 years', () => {
    const last = petsLitterMath(7).at(-1);
    expect(last).toEqual({ year: 7, born: 145, alive: 37 });
    expect(petsLitterMath(99)).toHaveLength(7);
    expect(petsLitterMath('x')).toHaveLength(1);
  });

  it('renders from the model, with its real assumptions', () => {
    expect(SRC).toMatch(/var litterRows = petsLitterMath\(years\);/);
    expect(SRC).not.toMatch(/growthFactor|HSUS conservative estimate/);
    expect(SRC).toMatch(/Field rates \(Nutter et al\. 2004\): 1\.4 litters a year, 3 kittens a litter, 1 kitten in 4 reaching 6 months/);
  });

  it('quotes a kitten count the model supports, wherever it is quoted', () => {
    const quotes = [...SRC.matchAll(/over (\d+) kittens in (\d+) years/g)];
    expect(quotes.length).toBeGreaterThanOrEqual(2);
    for (const [text, n, years] of quotes) {
      const born = petsLitterMath(Number(years)).at(-1).born;
      expect(born, `"${text}"`).toBeGreaterThan(Number(n));
      expect(born, `"${text}" understates the model by far`).toBeLessThan(Number(n) * 2);
    }
    expect(SRC).not.toMatch(/100\+ cats in 7 years|hundreds of kittens within 7 years/);
  });
});

// A source pin cannot see `totalCats = litterLast.born * 30`; only rendering
// the view and comparing against the same function can.
describe('litter calculator: the rendered numbers are the model\'s numbers', () => {
  const decode = (html) => html.replace(/&amp;/g, '&').replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // Load once: the first load of this ~19k-line tool took 12s under machine
  // load, past vitest's 10s hook default, and renders do not need a fresh copy.
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    resetStemLab();
    loadTool('stem_lab/stem_tool_pets.js', 'petsLab');
  }, 120_000);
  afterAll(() => { vi.useRealTimers(); });

  it.each([1, 5, 7])('%i-year view', (years) => {
    const html = decode(renderTool('petsLab', { petsLab: { view: 'welfare', welfareSec: 'spayNeuter', litterYears: years } }));
    const rows = petsLitterMath(years);
    const last = rows.at(-1);
    // The headline element itself: the chart also prints the final count, so a
    // page-wide `>145</div>` search passed with the headline inflated 30x.
    const headline = html.match(/and her daughters<\/div><div[^>]*>([^<]+)<\/div>/);
    expect(headline, 'headline number not found').not.toBeNull();
    expect(headline[1]).toBe(last.born.toLocaleString());
    expect(html).toContain(`about ${last.alive} cats would be alive`);
    expect(html).toContain('Kittens born, running total by year: ' +
      rows.map((r) => `year ${r.year}, ${r.born.toLocaleString()}`).join('; ') + '.');
  });
});

// 8. The Welfare intro promised "Browse all four to earn the Welfare-Aware
//    badge". Since 94f4b6b38 (09-14) the award also needs a decision in every
//    topic, so a student who did exactly what the page said got nothing.
describe('Welfare-Aware badge: the page states the rule the code enforces', () => {
  it('awards only for four visits plus four decisions', () => {
    expect(SRC).toMatch(/if \(validVisited >= 4 && decided\.complete\) \{\s*awardBadge\('pets_welfare_aware', 'Welfare-Aware'\);/);
  });

  it('tells the student both halves of that rule', () => {
    const intro = sliceBetween(SRC, "backBar('🛡️ Welfare & Ethics'),", 'sectionTabs,', { label: 'Welfare intro' });
    expect(intro).not.toMatch(/Browse all four to earn/);
    expect(intro).toMatch(/make the decision at the end of each/);
  });
});

describe('mirror', () => {
  it('ships the same glossary, TNR debate, and spay evidence in the public mirror', () => {
    expect(sliceBetween(MIRROR, 'var GLOSSARY = [', 'var PUNNETT_GOALS = [', { label: 'mirror glossary' })).toBe(GLOSSARY);
    expect(sliceBetween(MIRROR, "tnrControversy: '", "',\n", { label: 'mirror TNR debate' })).toBe(TNR_DEBATE);
    expect(sliceBetween(MIRROR, 'spayNeuter: {', 'behavior: [', { label: 'mirror spay/neuter' })).toBe(SPAY);
  });
});
