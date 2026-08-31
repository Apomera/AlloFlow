// Pets Lab — scientific-integrity invariants.
//
// This tool is heavily and well cited, which is exactly why the few
// weakly-sourced numbers in it were dangerous: they read with the same
// authority as the AVMA/CDC-backed material around them. These tests pin
// the HEDGES, not the wording, so the prose can be rewritten freely but a
// contested figure can't quietly return as a bare fact.
//
// Pattern follows the worldbuilder-penmanship overclaim invariant: assert on
// source content, because these strings live in sub-views SSR can't reach.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.resolve(process.cwd(), 'stem_lab/stem_tool_pets.js'),
  'utf8'
);

/** Text within `window` chars either side of each occurrence of `needle`. */
function contextsAround(needle, window = 700) {
  const out = [];
  let i = SRC.indexOf(needle);
  while (i !== -1) {
    out.push(SRC.slice(Math.max(0, i - window), i + needle.length + window));
    i = SRC.indexOf(needle, i + needle.length);
  }
  return out;
}

function sourceBetween(startMarker, endMarker) {
  const start = SRC.indexOf(startMarker);
  const end = SRC.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('Could not slice source between ' + startMarker + ' and ' + endMarker);
  }
  return SRC.slice(start, end);
}

const HEDGE = /shakier|rough|not seriously disputed|advocacy|feral-colony|unowned|trivia rather than data|wide range|be careful|treat it as|treat the direction/i;

describe('Pets Lab — contested figures stay hedged', () => {
  it('the outdoor-cat lifespan figure is never stated as a bare fact', () => {
    // The "2-5 years outdoors" number leans on feral-colony data, not owned
    // cats. Every place it appears must acknowledge that. Scoped to the
    // cat-lifespan claim so unrelated 2-5 ranges (service-dog waitlists,
    // hamster years) don't trip it.
    const claims = [...SRC.matchAll(/[^\n]*\b(?:outdoor|indoor)[^\n]*2–5[^\n]*/gi)].map((m) => m[0]);
    expect(claims.length).toBeGreaterThan(0);
    for (const c of claims) {
      expect(c, 'an unhedged "2-5 years" outdoor-cat claim is present').toMatch(HEDGE);
    }
  });

  it('does not claim a precise indoor:outdoor lifespan multiplier', () => {
    // Both "3-4x longer" and a "~3x shorter" rewrite are the same
    // unsupported precision. Scope the guard to cat + indoor/outdoor lines so
    // sourced 3x figures about declawing cannot trip it.
    const catLifespanLines = SRC.split(/\r?\n/).filter((line) =>
      /cat/i.test(line) &&
      /indoor|outdoor/i.test(line) &&
      /live|lifespan/i.test(line)
    );
    expect(catLifespanLines.length).toBeGreaterThan(0);
    const preciseMultiplier =
      /(?:live|lifespan)[^\n]{0,140}(?:~\s*)?3(?:\s*[-\u2013]\s*4)?\s*[x\u00d7]\s*(?:longer|shorter)/i;
    for (const line of catLifespanLines) {
      expect(line, 'a precise indoor/outdoor cat lifespan multiplier returned').not.toMatch(
        preciseMultiplier
      );
    }

    // "3-4x longer" was the overclaim; the direction is sound, the
    // multiplier is not measured.
    expect(SRC).not.toMatch(/3–4× longer/);
    expect(SRC).not.toMatch(/live ~?3–4× LONGER/i);
  });

  it('cites the Loss et al. predation estimate as a range, not just a midpoint', () => {
    // "2.4 billion", not the WCAG 2.4.7 reference in the stylesheet block.
    const ctxs = [...contextsAround('2.4 billion'), ...contextsAround('2.4 BILLION')];
    expect(ctxs.length).toBeGreaterThan(0);
    for (const c of ctxs) {
      // Wherever the 2.4-billion midpoint appears it must sit next to the
      // published range (1.3-4 billion) or be explicitly called a midpoint.
      expect(c, 'the 2.4-billion midpoint is quoted without its range').toMatch(
        /1\.3–4|midpoint/i
      );
    }
  });

  it('attributes most free-roaming predation to unowned cats', () => {
    // Loss et al. attribute the majority to un-owned cats; presenting the
    // total as pet-owner impact overstates what keeping YOUR cat in achieves.
    const ctxs = contextsAround('billion');
    const mentionsUnowned = ctxs.some((c) => /unowned|feral|stray/i.test(c));
    expect(mentionsUnowned).toBe(true);
  });

  it('flags bite-force PSI numbers as television trivia, not measurement', () => {
    if (!SRC.includes('PSI')) return; // fine to drop them entirely
    for (const c of contextsAround('PSI')) {
      expect(c, 'PSI figures presented without a sourcing caveat').toMatch(
        /television|TV |not a controlled study|trivia/i
      );
    }
  });

  it('keeps the load-bearing pit-bull claims that ARE well supported', () => {
    // Hedging the PSI trivia must not soften the anatomy or the
    // breed-vs-individual point, which are the parts that matter.
    expect(SRC).toMatch(/no dog breed has a jaw-locking mechanism/i);
    expect(SRC).toMatch(/individual than breed-determined/i);
  });
});

describe('Pets Lab — rabbit guidance centers adult responsibility without blanket bans', () => {
  it('does not misstate House Rabbit Society as banning young-child households', () => {
    expect(SRC).not.toMatch(/House Rabbit Society advises against rabbits/i);
    expect(SRC).not.toMatch(/rabbits are arguably the WORST starter pet/i);
    expect(SRC).not.toMatch(/future shelter rabbit/i);
  });

  it('keeps adult primary care and supervised interaction across learning surfaces', () => {
    const adultCareMentions = (SRC.match(/adult (?:must|should be|primary caregiver|responsibility)/gi) || []).length;
    expect(adultCareMentions).toBeGreaterThanOrEqual(4);
    expect(SRC).toMatch(/supervised, rabbit-respecting interaction/i);
    expect(SRC).toMatch(/rabbit-experienced veterinary care/i);
  });

  it('keeps the rabbit quiz accurate without making the distractors plausible', () => {
    const quizItem = sourceBetween(
      "{ id: 'q12'",
      "{ id: 'q13'",
    );
    expect(quizItem).toMatch(/adult primary caregiver/i);
    expect(quizItem).toMatch(/spacious indoor housing/i);
    expect(quizItem).toMatch(/correct:\s*1/);
    expect(quizItem).not.toMatch(/advises against rabbits in homes/i);
  });
});

describe('Pets Lab — the quiz agrees with the reference material', () => {
  it('the outdoor-cat quiz answer does not assert the precise multiplier', () => {
    const i = SRC.indexOf("stem: 'A friend says \"outdoor cats are happier");
    expect(i).toBeGreaterThan(-1);
    const item = SRC.slice(i, i + 1800);
    expect(item).toMatch(/substantially longer/i);
    expect(item).not.toMatch(/12–18 yr vs 2–5 yr/);
    // ...and still explains WHY the answer is right.
    expect(item).toMatch(/traffic|predators|disease/i);
  });

  it('every quiz item still has a rationale', () => {
    const start = SRC.indexOf('var QUIZ = [');
    // Search forward from `start`: `function renderQuizMode` appears EARLIER
    // in the file, so an unanchored search sliced backwards and matched zero.
    const end = SRC.indexOf('function renderQuiz(', start);
    const quizSrc = SRC.slice(start, end);
    const stems = (quizSrc.match(/\bstem:/g) || []).length;
    const whys = (quizSrc.match(/\bwhy:/g) || []).length;
    expect(stems).toBeGreaterThanOrEqual(15);
    expect(whys).toBe(stems);
  });

  it('gives every rotated distractor specific coaching and samples all four strands', () => {
    const start = SRC.indexOf('var QUIZ = [');
    const end = SRC.indexOf('function renderQuiz(', start);
    const bank = new Function(
      `${SRC.slice(start, end)}; return {
        quiz: QUIZ,
        summarize: knowledgeQuizStrandSummary,
        labels: QUIZ_STRAND_LABELS
      };`
    )();

    expect(bank.quiz).toHaveLength(15);
    expect(new Set(bank.quiz.map((item) => item.id)).size).toBe(15);
    for (const item of bank.quiz) {
      expect(Object.keys(bank.labels)).toContain(item.strand);
      item.choices.forEach((choice, choiceIndex) => {
        if (choiceIndex === item.correct) {
          expect(item.choiceFeedback[choice]).toBeUndefined();
        } else {
          expect(item.choiceFeedback[choice], `${item.id}: ${choice}`).toEqual(expect.any(String));
          expect(item.choiceFeedback[choice].trim().length).toBeGreaterThan(20);
        }
      });
    }

    const totals = bank.quiz.reduce((counts, item) => {
      counts[item.strand] = (counts[item.strand] || 0) + 1;
      return counts;
    }, {});
    expect(Object.keys(totals).sort()).toEqual(['behavior', 'biology', 'health', 'welfare']);
    expect(Math.min(...Object.values(totals))).toBeGreaterThanOrEqual(3);

    const allCorrect = Object.fromEntries(bank.quiz.map((item) => [item.id, true]));
    expect(bank.summarize(allCorrect)).toMatchObject({ met: 4, total: 4, complete: true });

    const rankedChoice = (item, rankFromLongest) => item.choices
      .map((choice, index) => ({ index, length: choice.length }))
      .sort((a, b) => b.length - a.length || a.index - b.index)[rankFromLongest].index;
    const strategies = {
      longest: (item) => rankedChoice(item, 0),
      secondLongest: (item) => rankedChoice(item, 1),
      secondShortest: (item) => rankedChoice(item, 2),
      shortest: (item) => rankedChoice(item, 3),
      firstPosition: () => 0,
      secondPosition: () => 1,
      thirdPosition: () => 2,
      fourthPosition: () => 3,
    };
    for (const [name, choose] of Object.entries(strategies)) {
      const responses = Object.fromEntries(bank.quiz.map((item) => [
        item.id,
        choose(item) === item.correct,
      ]));
      const score = Object.values(responses).filter(Boolean).length;
      const strands = bank.summarize(responses);
      const meetsTarget = score / bank.quiz.length >= 0.7 &&
        strands.complete && strands.met === strands.total;
      expect(meetsTarget, `${name} must not pass the quiz without content knowledge`).toBe(false);
    }

    const correctLengthRanks = bank.quiz.map((item) =>
      rankedChoice(item, 0) === item.correct ? 1 :
        rankedChoice(item, 1) === item.correct ? 2 :
          rankedChoice(item, 2) === item.correct ? 3 : 4
    );
    expect(new Set(correctLengthRanks).size).toBe(4);
    expect(Math.max(...[1, 2, 3, 4].map((rank) =>
      correctLengthRanks.filter((value) => value === rank).length
    ))).toBeLessThanOrEqual(6);
  });

  it('describes reptile Salmonella risk without claiming constant universal shedding', () => {
    expect(SRC).toContain('Healthy-looking reptiles commonly carry and can shed Salmonella');
    expect(SRC).not.toContain('Reptiles universally shed Salmonella');
    expect(SRC).not.toContain('Salmonella shedding is universal in reptiles');
    expect(SRC).not.toMatch(/Reptiles:\s*ALL shed Salmonella/i);
  });
});

describe('Pets Lab - educational models disclose their limits', () => {
  it('uses a semantic note for model disclosures', () => {
    const helper = sourceBetween('function learningModelNote(', 'function sourceCard(');
    expect(helper).toMatch(/className:\s*'petslab-model-note'/);
    expect(helper).toMatch(/role:\s*'note'/);
  });

  it('labels the care-tradeoff weights as hand-authored and non-diagnostic', () => {
    const menu = sourceBetween('function renderMenu()', 'function renderDogs()');
    expect(menu).toMatch(/learningModelNote\('Exploration model'/);
    expect(menu).toMatch(/hand-authored[\s\S]{0,240}not validated/i);
    expect(menu).toMatch(/not validated[\s\S]{0,180}(?:diagnosis|diagnostic)/i);
    expect(menu).toMatch(/individualized veterinary advice/i);
  });

  it('labels Pet Picker as decision support, not a validated adoption instrument', () => {
    const picker = sourceBetween('function renderPicker()', 'function renderBodyLang()');
    expect(picker).toMatch(/learningModelNote\('Decision-support model'/);
    expect(picker).toMatch(/fixed educational weights/i);
    expect(picker).toMatch(/not a validated matching instrument/i);
    expect(picker).toMatch(/not as an adoption decision/i);
  });

  it('labels Care Sim scores as simplified rather than a diagnosis or forecast', () => {
    const careSim = sourceBetween('function renderCareSim()', 'function renderSensory()');
    expect(careSim).toMatch(/learningModelNote\('Simulation model'/);
    expect(careSim).toMatch(/scores and scenarios are simplified/i);
    expect(careSim).toMatch(/not a welfare diagnosis/i);
    expect(careSim).toMatch(/budget forecast/i);
    expect(careSim).toMatch(/veterinarian or qualified caregiver/i);
  });
});

describe('Pets Lab - persisted progress cannot inflate or leak', () => {
  it('counts only canonical decoder signals toward every mastery total', () => {
    const canonicalKeys = sourceBetween('function canonicalBodyLanguageSignalKeys()', 'function canonicalDecoderMasteryCount(');
    const answerQuiz = sourceBetween('function answerQuiz(', 'function nextQuiz()');
    const masteryView = sourceBetween('function renderDecoderMastery()', "case 'menu':");

    expect(canonicalKeys).toMatch(/var canonicalKeys = \{\}/);
    expect(canonicalKeys).toMatch(/canonicalKeys\[group\.species \+ '\\|' \+ item\.signal\] = true/);
    expect(answerQuiz).toMatch(/Object\.keys\(nextMastery\)\.filter/);
    expect(answerQuiz).toMatch(/canonicalSignalKeys\[key\]/);

    expect(masteryView).toMatch(/var canonicalMasteryKeys = \{\}/);
    expect(masteryView).toMatch(/Object\.keys\(decoderMastery \|\| \{\}\)\.filter/);
    expect(masteryView).toMatch(/canonicalMasteryKeys\[key\]/);

    // Menu and celebration counters must not trust arbitrary persisted object
    // keys, or one stale/foreign key can display 28/27 and imply mastery.
    expect(SRC).not.toMatch(/Object\.keys\(decoderMastery \|\| \{\}\)\.length/);
  });

  it('treats a host _replace snapshot as authoritative over warm caches', () => {
    const hydration = sourceBetween('var _hydratedRef', 'var _decoderCelebState');
    expect(hydration).toMatch(/winState && winState\._replace === true/);
    expect(hydration).toMatch(
      /replaceFromWindow\s*\?\s*Object\.assign\(\{\}, winState\)\s*:\s*Object\.assign\(\{\}, lsStateV1 \|\| \{\}, lsStateV2 \|\| \{\}, winState \|\| \{\}\)/
    );

    const hotRestore = sourceBetween(
      'function onRestore()',
      "window.addEventListener('alloflow-petslab-restored'"
    );
    expect(hotRestore).toMatch(/var replace = w\._replace === true/);
    expect(hotRestore).toMatch(/else if \(replace\) restorePatch\[key\] = undefined/);
    expect(hotRestore).toMatch(/_awardedBadgesRef\.current = \{\}/);
    expect(hotRestore).toMatch(/_aiRequestRef\.current\.seq \+= 1/);

    // The control marker belongs to the host handoff, never the durable
    // learner-state whitelist written back to localStorage.
    const persistKeys = sourceBetween('var PETS_PERSIST_KEYS = [', 'function petsPersistentSnapshot(');
    expect(persistKeys).not.toMatch(/['"]_replace['"]/);
  });
});

describe('Pets Lab - poisoning guidance is call-first and non-diagnostic', () => {
  const toxicBank = sourceBetween('var TOXIC_FOODS = [', 'var SPECIES_NUTRITION = [');
  const nutrition = sourceBetween('function renderNutrition()', 'function renderZoonoses()');

  it('uses risk context instead of home dose thresholds', () => {
    expect((toxicBank.match(/riskNote:/g) || [])).toHaveLength(8);
    expect(toxicBank).not.toMatch(/thresholdNote/);
    expect(toxicBank).not.toMatch(/20 mg\/kg|60 mg\/kg|200 mg\/kg|0\.1 g\/kg|0\.5 g\/kg|15–30 g\/kg|~2 g\/kg/i);
    expect(nutrition).toMatch(/do not supply a safe dose or authorize home observation/i);
  });

  it('keeps the emergency protocol complete and immediately actionable', () => {
    expect(nutrition).toMatch(/data-pets-poison-protocol/);
    expect(nutrition).toMatch(/Do not wait for symptoms/i);
    expect(nutrition).toMatch(/Do not induce vomiting/i);
    expect(nutrition).toMatch(/activated charcoal/i);
    expect(nutrition).toMatch(/species, approximate weight/i);
    expect(nutrition).toMatch(/estimated amount and time/i);
    expect(nutrition).toMatch(/Collapse, seizure, trouble breathing, or unresponsiveness/i);
    expect(nutrition).toContain('(888) 426-4435');
    expect(nutrition).toContain('(855) 764-7661');
    expect(nutrition).toMatch(/Consultation fees may apply/i);
  });

  it('does not turn hazard practice into a safety clearance', () => {
    expect(nutrition).toMatch(/data-pets-hazard-boundary/);
    expect(nutrition).toMatch(/cannot rule out poisoning, calculate a safe dose, or replace case-specific advice/i);
    expect(nutrition).toMatch(/No listed toxin/);
    expect(nutrition).not.toMatch(/Safe for both/);
    expect(nutrition).not.toMatch(/kills CATS only|kill DOGS|kill BIRDS/i);
  });

  it('does not restore stale poison-control prices or guaranteed outcomes', () => {
    expect(SRC).not.toMatch(/\$95 consult|\$95 24\/7|\$95–\$200 advice line/i);
    expect(SRC).not.toMatch(/rules out the bad outcome with confidence/i);
    expect(SRC).not.toMatch(/~85% recovery|GI stasis emergency likely within months/i);
    expect(SRC).not.toMatch(/12-hr rule from House Rabbit Society/i);
    expect(SRC).toMatch(/Do not wait for a 12-hour cutoff/i);
    expect(SRC).toMatch(/force-feeding can worsen an obstruction/i);
  });

  it('keeps AI grounding aligned with the non-clearance teaching boundary', () => {
    const groundTruth = sourceBetween('var AI_GROUND_TRUTH = [', '// WELFARE & ETHICS DATA');
    expect(groundTruth).toMatch(/These are teaching patterns, not clearance for unlisted species/i);
    expect(groundTruth).toMatch(/do not wait for symptoms/i);
    expect(groundTruth).toMatch(/Do not induce vomiting/i);
    expect(groundTruth).not.toMatch(/Toxic to dogs:|Toxic to cats:|Toxic to birds:/i);
  });
});

describe('Pets Lab - nutrition label literacy prioritizes evidence over marketing', () => {
  const speciesCards = sourceBetween('var SPECIES_NUTRITION = [', 'var PET_FOOD_LABEL_CHECKS = [');
  const labelChecks = sourceBetween('var PET_FOOD_LABEL_CHECKS = [', 'var PET_FOOD_LABEL_CASES = [');
  const labelCases = sourceBetween('var PET_FOOD_LABEL_CASES = [', '// SECTION 3: ZOONOSES + One Health');
  const nutrition = sourceBetween('function renderNutrition()', 'function renderZoonoses()');

  it('gives every species card a verification question without shaming shortcuts', () => {
    expect((speciesCards.match(/verify:/g) || [])).toHaveLength(5);
    expect(speciesCards).toMatch(/finished diet/i);
    expect(speciesCards).toMatch(/individual dog/i);
    expect(SRC).not.toMatch(/Vegan diets? for cats|medical neglect|MUST consume animal protein|Must eat animal protein|single meat-free meal|AAFCO commercial cat foods guarantee minimums/i);
    expect(SRC).not.toMatch(/Iceberg lettuce is mostly water\s*\+\s*dangerous|AAFCO statement on label\s*=/i);
  });

  it('defines five label checks and three purpose-and-life-stage practice cases', () => {
    expect((labelChecks.match(/\{ id:/g) || [])).toHaveLength(5);
    expect(labelChecks).toMatch(/intended species/i);
    expect(labelChecks).toMatch(/nutritional[- ]adequacy statement/i);
    expect(labelChecks).toMatch(/intermittent or supplemental/i);
    expect(labelChecks).toMatch(/calorie/i);
    expect(labelChecks).toMatch(/manufacturer/i);

    expect((labelCases.match(/\{ id:/g) || [])).toHaveLength(3);
    expect(labelCases).toMatch(/not a nutritionally complete sole diet/i);
    expect(labelCases).toMatch(/maintenance.+adult life stage/is);
  });

  it('renders an evidence-versus-marketing decoder with moisture context and sources', () => {
    expect(nutrition).toMatch(/data-pets-food-label-decoder/);
    expect(nutrition).toMatch(/data-pets-label-checklist/);
    expect(nutrition).toMatch(/data-pets-label-evidence-contrast/);
    expect(nutrition).toMatch(/data-pets-label-moisture-note/);
    expect(nutrition).toMatch(/One ingredient.+position/is);
    expect(nutrition).toMatch(/cannot be compared directly without converting to a dry-matter basis/i);
    expect(nutrition).toContain('https://www.fda.gov/animal-veterinary/animal-health-literacy/complete-and-balanced-pet-food');
    expect(nutrition).toContain('https://www.aafco.org/consumers/understanding-pet-food/reading-labels/');
    expect(nutrition).toContain('https://wsava.org/wp-content/uploads/2021/04/Selecting-a-pet-food-for-your-pet-updated-2021_WSAVA-Global-Nutrition-Toolkit.pdf');
  });
});

describe('Pets Lab - interaction safety treats cues as uncertainty, not prediction', () => {
  const challenges = sourceBetween('function bodyLanguageContextChallenges()', 'function normalizeBodyLanguageTransfer(');
  const decoder = sourceBetween('function renderBodyLang()', '// LIFETIME COST CALCULATOR');
  const diagram = sourceBetween('function svgEthogram()', '// WELFARE & ETHICS');
  const groundTruth = sourceBetween('var AI_GROUND_TRUTH = [', '// WELFARE & ETHICS DATA');

  it('adds a familiar-family-dog case with active child supervision and a protected retreat', () => {
    expect((challenges.match(/\bid:\s*'/g) || [])).toHaveLength(7);
    expect(challenges).toMatch(/id: 'dog-child-rest'/);
    expect(challenges).toMatch(/familiar family dog/i);
    expect(challenges).toMatch(/child-free retreat with active adult supervision/i);
    expect(challenges).toMatch(/Familiarity does not replace active supervision/i);
    expect(challenges).toMatch(/A growl is safety information/i);
  });

  it('renders a semantic three-step Pause, Space, Support protocol with primary sources', () => {
    expect(decoder).toMatch(/data-pets-interaction-safety': 'pause-space-support'/);
    expect(decoder).toMatch(/aria-labelledby': 'pets-interaction-safety-heading'/);
    expect((decoder.match(/['"]data-pets-interaction-step['"]\s*:/g) || [])).toHaveLength(3);
    expect(decoder).toMatch(/not a clearance test or a bite countdown/i);
    expect(decoder).toMatch(/familiar or family pet still needs active adult supervision/i);
    expect(decoder).toContain('https://www.cdc.gov/healthy-pets/about/dogs.html');
    expect(decoder).toContain('https://avsab.org/understanding-canine-facial-expressions-body-postures/');
  });

  it('removes deterministic bite countdowns from learner and AI-facing guidance', () => {
    expect(SRC).not.toMatch(/Most dog bites are predictable|minutes in advance|A bite is the next step|about-to-bite|lead-up was visible|Missing this window = lifelong fearfulness|Safe to greet/i);
    expect(diagram).toMatch(/a bite is possible, not predictable/i);
    expect(diagram).toMatch(/cannot guarantee safety or predict an exact countdown/i);
    expect(groundTruth).toMatch(/no cue guarantees safety or predicts a precise time to bite/i);
    expect(groundTruth).toMatch(/familiar family pets/i);
  });
});
