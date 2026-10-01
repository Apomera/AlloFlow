// Pets Lab — science claims agree with their sources and with each other.
//
// A graded quiz answer usually has twins elsewhere in the lab, and the twins
// drift. Three claims had drifted, each checked against its source 2026-09-23:
//
// 1. Dog domestication. The Dogs module and quiz q1 said "a single
//    domestication event", citing "Frantz 2016, Botigué 2017". Frantz et al.
//    2016 (Science) is titled "Genomic and archaeological evidence suggest a
//    DUAL origin of domestic dogs" — it argued for two origins. Botigué et al.
//    2017 argued for one. The lab's own domestication timeline already said the
//    origin is "genuinely unsettled ... a dual origin is on the table", so the
//    lab contradicted itself and cited a paper for the opposite of its finding.
//    The 15,000–40,000-year window (what q1 actually grades) is unchanged.
//
// 2. Cat taurine. The Cat card said cats "cannot synthesize taurine, vitamin A,
//    or arginine ... MUST get them from animal protein"; q2's keyed answer said
//    cats "lost the metabolic ability to synthesize taurine"; a discussion
//    prompt said "Cats can't make taurine". Cats do make some taurine and
//    arginine — low cysteine dioxygenase and cysteine-sulfinate decarboxylase
//    activity keeps synthesis below loss — and commercial foods add synthetic
//    taurine. The lab's careful passages already said "dietary requirement".
//
// 3. Cat meowing. A discussion prompt said "Adult-cat meowing only happens at
//    humans"; the Cat card itself said adult feral cats "rarely" meow at each
//    other (Bradshaw), and kittens meow to their mothers. "Only" is false.
//
// Plus quiz q7 asked for the "SCIENTIFIC distinction" under the ADA — a legal one.
//
// Assertions read the source with comment lines removed, so an explanatory
// comment quoting an old claim cannot trip or satisfy them.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const RAW = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_pets.js'), 'utf8');
const MIRROR = fs.readFileSync(path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_pets.js'), 'utf8');
const SRC = RAW.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const QUIZ = sliceBetween(SRC, "{ id: 'q1', icon:", "{ id: 'q15', icon:", { label: 'knowledge quiz q1-q14' });
function question(id) {
  const next = { q1: 'q2', q2: 'q3', q3: 'q4', q7: 'q8', q10: 'q11' }[id];
  return sliceBetween(QUIZ, `{ id: '${id}', icon:`, `{ id: '${next}', icon:`, { label: `quiz ${id}` });
}

describe('dog domestication: the lab says the origin is unsettled, everywhere', () => {
  it('never presents a single domestication event as the finding', () => {
    expect(SRC).not.toMatch(/single domestication event/i);
  });

  it('cites Frantz et al. 2016 only for the two-origin hypothesis it proposed', () => {
    const mentions = [...SRC.matchAll(/Frantz/g)];
    expect(mentions.length).toBeGreaterThan(0);
    for (const m of mentions) {
      const sentence = SRC.slice(m.index, m.index + 90);
      expect(sentence, 'Frantz cited without its two-origin finding').toMatch(/two origins|dual/i);
    }
  });

  it('agrees across the Dogs module, the quiz, and the domestication timeline', () => {
    const dogs = sliceBetween(SRC, "'Domestication: 15,000–40,000 years ago'", "'Belyaev fox experiment'", { label: 'Dogs module domestication' });
    const timeline = sliceBetween(SRC, "h('strong', { style: { color: T.muted } }, 'dogs'),", "'Horses'", { label: 'domestication timeline, dogs' });
    expect(dogs).toMatch(/once or more than once is still argued/);
    expect(question('q1')).toMatch(/still debated/);
    expect(timeline).toMatch(/genuinely unsettled/);
  });

  it('still grades q1 on the well-supported 15,000–40,000-year window', () => {
    const q1 = question('q1');
    expect(q1).toMatch(/'~15,000–40,000 years'/);
    expect(q1).toMatch(/correct: 2,/);
  });
});

describe('cat taurine: a dietary requirement, not an inability', () => {
  it('never says cats cannot make taurine or lost the ability', () => {
    expect(SRC).not.toMatch(/cannot synthesi[sz]e taurine|can\\?'t make taurine|lost the metabolic ability/i);
    expect(SRC).not.toMatch(/MUST get them from animal protein/);
  });

  it('keys q2 on too-little synthesis and explains the mechanism', () => {
    const q2 = question('q2');
    expect(q2).toContain("'Cats make too little taurine, so food must supply it; they\\'re obligate carnivores'");
    expect(q2).toMatch(/correct: 1,/);
    expect(q2).toMatch(/do make some taurine/);
    expect(q2).toMatch(/bile acids/);
  });

  it('frames the vegan-diet discussion on the real premise', () => {
    expect(SRC).toMatch(/Cats make too little taurine on their own .*synthetic taurine/);
  });
});

describe('cat meowing: rarely at each other, not never', () => {
  it('never says adult meowing only happens at humans', () => {
    expect(SRC).not.toMatch(/meowing only happens at humans/i);
  });

  it('uses "rarely" on both the Cat card and the discussion prompt', () => {
    const card = sliceBetween(SRC, "name: 'Cats (Felis catus)',", "lifespan: '12–18 years indoor", { label: 'Cat card' });
    expect(card).toMatch(/rarely meow at each other/);
    expect(SRC).toMatch(/'Adult cats rarely meow at each other, yet meow often at people\./);
  });
});

// 4. Dog lifespan by size. Five passages disagreed with each other and with the
//    data: small breeds "reach 14–16" / "live 14–18", Great Danes "6–8" in one
//    place and "often 7–10" in another, "large dogs lose to small dogs by ~5
//    years". VetCompass: Great Dane median 6.0 (IQR 4–9). McMillan et al. 2024
//    (584,734 UK dogs): small breeds median 12.7, Mastiff 9.0, Labrador 13.1 —
//    a LARGE breed that out-lives the small-breed median — longest-lived breeds
//    ~15. The reversal is real; it is steep at GIANT size, not "large".
describe('dog lifespan by size agrees with the data and with itself', () => {
  it('never puts small breeds at 14–16 or 14–18 years, or giants at 6–8', () => {
    // No "dogs|breeds" requirement: the AI ground-truth copy said "(small 14–16
    // yr; giant 6–8 yr)" and slipped past a pattern that demanded the noun.
    expect(SRC).not.toMatch(/\bsmall\b[^.']{0,40}\b14\s*[–-]\s*1[68]\b/i);
    expect(SRC).not.toMatch(/\bgiant\b[^.']{0,20}\b6\s*[–-]\s*8\s*(?:yr|years)/i);
  });

  it('gives Great Danes the same figure everywhere they are quantified', () => {
    const danes = [...SRC.matchAll(/Great Danes?[^.']{0,40}?(\d+)(?:\s*[–-]\s*(\d+))?\s*(?:years|yr)?/g)]
      .filter((m) => !/Chihuahua/.test(m[0]));
    expect(danes.length).toBeGreaterThanOrEqual(3);
    for (const m of danes) expect(m[0], 'Great Dane figure').toMatch(/about 6\b/);
  });

  it('attributes the steep drop to giant breeds, not "large" dogs', () => {
    expect(SRC).not.toMatch(/large dogs lose to small dogs/);
    expect(SRC).toMatch(/giant breeds live about half as long as small ones/);
  });

  it('frames the causes as explanations, not a settled share of the gap', () => {
    expect(SRC).not.toMatch(/explain most of the gap/);
  });

  it('keeps the teaching point and the graded answers intact', () => {
    const check = sliceBetween(SRC, "prompt: 'Two healthy puppies, both well cared for: a Great Dane and a Chihuahua.", 'missNote:', { label: 'Dogs prediction check' });
    expect(check).toMatch(/answer: 'smaller'/);
    expect(check).toMatch(/Within dogs the relationship REVERSES/);
    // SRC has comment lines stripped, so the end anchor must be code: the next item.
    const medium = sliceBetween(SRC, "species: 'Average medium-size dog (~50 lb)'", "{ id: 7, species: 'Cockatiel'", { label: 'Lifespan Match medium dog' });
    expect(medium).toMatch(/correct: 'b3'/);
    expect(SRC).toMatch(/6: \{ min: 10, max: 14, label: '10-14 years' \}/);
  });
});

// 5. Parrot lifespan. "Macaws + cockatoos hit 50–80 years" (4 places), the
//    blue-and-gold macaw keyed to "50+ years" and drawn as 50–80, African greys
//    and Amazons "40–60". Young et al. 2012 (Animal Conservation; 83,212 zoo
//    records, 260 species), Table 2 maxima: blue-and-yellow macaw 48.5 (n =
//    2,124), grey 48.3, Amazons 34–39; only 12 species ever had a bird past 50;
//    the 70+ birds are cockatoos (Moluccan 92.6). Macaws are "decades" (20–50).
describe('parrot lifespan agrees with the captive-parrot data', () => {
  const LIFESPAN = sliceBetween(SRC, 'function renderLifespan() {', "lsScore >= 6 ? ' — solid baseline.", { label: 'Lifespan Match data' });

  it('quotes "50–80 years" only as the popular figure it corrects', () => {
    const quoted = SRC.split(/(?<!\\)'|\.\s/).filter((x) => /\b50\s*[–-]\s*80\b/.test(x));
    for (const x of quoted) expect(x, '50–80 stated as a parrot lifespan').toMatch(/rare record-holders/);
    expect(SRC).not.toMatch(/African Greys: 40–60|Amazons: 40–60/);
    expect(SRC).not.toMatch(/parrots = 15\+ to 80/);
  });

  it('keys the macaw to 20–50 years and reserves 50+ for tortoises and record cockatoos', () => {
    expect(LIFESPAN).toMatch(/species: 'Blue-and-gold macaw \(parrot\)', icon: '[^']+', correct: 'b4',/);
    const b5 = sliceBetween(LIFESPAN, "{ id: 'b5',", '}', { label: 'bucket b5' });
    expect(b5).not.toMatch(/Macaws/);
    const b2 = sliceBetween(LIFESPAN, "{ id: 'b2',", '}', { label: 'bucket b2' });
    expect(b2).toMatch(/giant-breed dogs/);
  });

  it('draws every item inside the bucket it grades as correct', () => {
    const range = (label) => {
      if (/^Under (\d+)/.test(label)) return [0, +label.match(/^Under (\d+)/)[1]];
      if (/^(\d+)\+/.test(label)) return [+label.match(/^(\d+)\+/)[1], Infinity];
      const m = label.match(/^(\d+)\s*[–-]\s*(\d+)/);
      return [+m[1], +m[2]];
    };
    const buckets = Object.fromEntries([...LIFESPAN.matchAll(/\{ id: '(b\d)', label: '([^']+)'/g)].map((m) => [m[1], range(m[2])]));
    const visuals = Object.fromEntries([...LIFESPAN.matchAll(/^\s+(\d+): \{ min: (\d+), max: (\d+), label:/gm)].map((m) => [m[1], [+m[2], +m[3]]]));
    const items = [...LIFESPAN.matchAll(/\{ id: (\d+), species: '([^']+)', icon: '[^']+', correct: '(b\d)'(?:, accepted: \[([^\]]*)\])?/g)];
    expect(Object.keys(buckets)).toHaveLength(5);
    expect(items).toHaveLength(10);
    for (const [, id, species, correct, accepted] of items) {
      const ok = accepted ? accepted.match(/b\d/g) : [correct];
      const lo = Math.min(...ok.map((b) => buckets[b][0]));
      const hi = Math.max(...ok.map((b) => buckets[b][1]));
      const [min, max] = visuals[id];
      expect(min >= lo && max <= hi, `${species}: drawn ${min}-${max}, graded ${ok.join('/')}`).toBe(true);
    }
  });

  it('gives the macaw the same range on the Bird card as on the timeline', () => {
    const card = SRC.match(/macaw (\d+)–(\d+) yr/);
    expect(card).not.toBeNull();
    expect(LIFESPAN).toContain(`3: { min: ${card[1]}, max: ${card[2]}, label: '${card[1]}-${card[2]} years' }`);
  });

  it('sources the reality check', () => {
    expect(SRC).toMatch(/83,212 zoo birds, Young et al\. 2012/);
    expect(SRC).toMatch(/only 12 of 260 species ever had a bird live past 50/);
  });
});

// 6. Mech POPULARIZED "alpha" (from Schenkel 1947); one care-sim note said he
//    "coined" it. "Whisker fatigue ... is real": Slovak & Foster 2021 (JFMS, 40
//    cats) found a whisker-friendly dish changed no eating measure.
describe('smaller attributions', () => {
  it('credits Mech with popularizing "alpha", never coining it', () => {
    const mech = SRC.split(/(?<!\\)'|\.\s/).filter((x) => /\bMech\b/.test(x) && /alpha/.test(x));
    expect(mech.length).toBeGreaterThanOrEqual(3);
    for (const x of mech) expect(x, 'Mech attribution').not.toMatch(/coined/);
  });

  it('says ferrets cannot thrive on plants, not that they cannot eat them', () => {
    expect(SRC).not.toMatch(/cannot eat plant-based food/);
    expect(SRC).toMatch(/digests fiber and carbohydrate poorly, so they cannot thrive on a plant-based diet/);
  });

  it('gives the Labrador its Newfoundland origin', () => {
    expect(SRC).not.toMatch(/Lab is named for Labrador, just to the north/);
    expect(SRC).toMatch(/developed from St\. John\\'s water dogs in Newfoundland/);
  });

  it('says reptiles make little body heat, not none', () => {
    // Tegus warm themselves in the breeding season (Tattersall 2016); brooding
    // pythons shiver. The absolute appeared on the Reptiles page and in the
    // UVB prediction check.
    expect(SRC).not.toMatch(/cannot generate (?:body heat|its own body heat)/);
    expect(SRC).toMatch(/Reptiles make little body heat from metabolism/);
  });

  it('pairs guinea pigs with monkeys and apes, not all primates, for vitamin C', () => {
    expect(SRC).not.toMatch(/humans and other primates|humans \+ great apes/);
    expect(SRC).toMatch(/along with humans, monkeys and apes, and some bats/);
  });

  it('sizes the cat\'s tapetum and whisker wiring from the literature', () => {
    // Tapetum: ~44% gain in the cat (up to ~50%), not "doubling". Whiskers:
    // 100–200 nerve fibers per follicle.
    expect(SRC).not.toMatch(/doubling effective sensitivity|200\+ nerve endings/);
    expect(SRC).toMatch(/raising low-light sensitivity by roughly 40–50% \(not doubling it\)/);
    expect(SRC).toMatch(/each whisker follicle is supplied by 100–200 nerve fibers/);
  });

  it('frames whisker fatigue as weakly supported', () => {
    expect(SRC).not.toMatch(/Whisker fatigue from narrow food bowls is real/);
    expect(SRC).toMatch(/"Whisker fatigue" from narrow bowls is popular but weakly supported/);
  });
});

// 7. Famous animals, checked against the record: Cher Ami was male (Smithsonian
//    DNA test, 2021); Stubby is displayed at the Smithsonian, not buried, and
//    no source from his lifetime calls him "Sgt."; Hachikō's organs were
//    examined in 2011 for cause of death (cancer, heartworm), not attachment
//    research; Endal's rescue followed a car strike, not a fit, and "Dog of the
//    Millennium" was Dogs Today's award. Belyaev: Lord et al. 2020 found the
//    founding foxes came from Canadian fur farms and most "domestication
//    syndrome" traits predated the selection; the lab stated the classic
//    reading as settled in three places.
describe('famous animals match the historical record', () => {
  const FAMOUS = sliceBetween(SRC, 'var FAMOUS_ANIMALS = [', 'var FAMOUS_FILTERS = [', { label: 'famous animals' });
  const story = (id) => sliceBetween(FAMOUS, `{ id: '${id}',`, "' }", { label: `famous: ${id}` });

  it('Cher Ami is male', () => {
    expect(story('cher-ami')).not.toMatch(/\bshe\b/);
    expect(story('cher-ami')).toMatch(/2021 Smithsonian DNA test showed he was male/);
  });

  it('Stubby is on display, and his rank is honorary', () => {
    expect(story('stubby')).not.toMatch(/Buried at the Smithsonian|first dog to be promoted/);
    expect(story('stubby')).toMatch(/on display at the Smithsonian/);
    expect(story('stubby')).toMatch(/"Sergeant" is honorary/);
  });

  it('Hachikō\'s preserved organs answered a cause-of-death question', () => {
    expect(story('hachiko')).not.toMatch(/attachment-research/);
    expect(story('hachiko')).toMatch(/2011 University of Tokyo examination found terminal cancer and a heartworm infection/);
  });

  it('Endal\'s rescue and award are told as documented', () => {
    expect(story('endal')).not.toMatch(/had a fit|pressing a phone button|\(BBC\)/);
    expect(story('endal')).toMatch(/knocked Parton out of his wheelchair/);
    expect(story('endal')).toMatch(/Dogs Today magazine/);
  });

  it('never states the Belyaev reading as settled, in all three places', () => {
    expect(SRC).not.toMatch(/Demonstrated that selection for behavior alone|Showed that selecting for behavior alone|experiment showed tameness selection drags/);
    const belyaev = SRC.split(/(?<!\\)'|\.\s/).filter((x) => /Belyaev/.test(x));
    expect(belyaev.length).toBeGreaterThanOrEqual(3);
    expect((SRC.match(/2020 reanalysis/g) || []).length).toBeGreaterThanOrEqual(3);
  });
});

// 8. Quiz keys vs sources. q10 keyed "hip dysplasia" as a purebred-concentrated
//    disorder; Bellumori et al. 2013 (JAVMA, 27,254 dogs) found hip dysplasia
//    among 13 of 24 disorders with NO purebred/mixed difference (purebreds more
//    likely: 10, incl. dilated cardiomyopathy, elbow dysplasia). q15 keyed ticks
//    "active any day above ~40°F"; Maine CDC / UMaine: above freezing. q3 and the
//    Training passage cited an "AVMA" position against dominance training; the
//    statements are AVSAB's and the ACVB's.
describe('quiz keys agree with their sources', () => {
  it('q10 keys disorders that ARE more common in purebreds', () => {
    const q10 = question('q10');
    expect(q10).toContain("'Concentrated genetic disorders (elbow dysplasia, dilated cardiomyopathy, etc.)'");
    expect(q10).toMatch(/correct: 1,/);
    expect(q10).toMatch(/13, including hip dysplasia, were just as common in mixed breeds/);
    expect(SRC).toMatch(/Hip dysplasia'\),\s*' \(German Shepherd[^']*just as common in mixed breeds/);
  });

  it('q15 says above freezing, not above ~40°F', () => {
    const q15 = sliceBetween(SRC, "{ id: 'q15', icon:", 'var QUIZ_CHOICE_FEEDBACK = {', { label: 'quiz q15' });
    // Whole file: the tick-prevention action restated the old threshold.
    expect(SRC).not.toMatch(/above ~40°F/);
    expect(q15).toMatch(/'Adult deer ticks \(Ixodes scapularis\) become active on winter days above freezing/);
    expect(q15).toMatch(/correct: 1,/);
  });

  it('credits the dominance-training position statements to the bodies that issued them', () => {
    expect(SRC).not.toMatch(/AVSAB \+ AVMA/);
    expect(question('q3')).toMatch(/American Veterinary Society of Animal Behavior \(AVSAB\)/);
  });
});

describe('service animals', () => {
  it('asks for the legal distinction under the ADA, not a scientific one', () => {
    const q7 = question('q7');
    expect(q7).toMatch(/Under federal law \(ADA\), what\\'s the legal distinction/);
    expect(q7).not.toMatch(/SCIENTIFIC/);
  });
});

describe('mirror', () => {
  it('ships the same quiz in the public mirror', () => {
    const mirrorSrc = MIRROR.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(sliceBetween(mirrorSrc, "{ id: 'q1', icon:", "{ id: 'q15', icon:", { label: 'mirror quiz' })).toBe(QUIZ);
  });
});
