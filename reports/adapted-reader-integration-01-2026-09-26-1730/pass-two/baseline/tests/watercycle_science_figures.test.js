import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// The Water Cycle teaches the same physical number in many places at once.
//
// The 42-degree rainbow rule is stated NINE times in English — the scene caption, the pilot lab's
// status line, its step list, its primary and secondary science cards, the notebook report, the
// alt text for two canvas states, and the receipt — and it is ALSO encoded twice as a constant:
// once for the 2D scene's arc geometry (WC_RAINBOW_PRIMARY_DEG, which decides where the bow is
// drawn and when it is possible at all) and once for the pilot kernel (WC_PILOT_RAINBOW_PRIMARY_DEG,
// which decides whether the challenge is winnable). Nothing connected any of those to any other.
//
// That is the failure this repo has already recorded once as a class: one fact, two derivations.
// A future correction — sources put the secondary anywhere from 50 to 53 degrees, so a reviewer
// nudging 51 is entirely plausible — would land in one place and leave the other eight teaching the
// old number. The tool would then contradict itself, on screens a student sees in the same minute.
//
// Consolidating the constants would fix two of the eleven sites and leave the nine sentences
// untouched, because those are translation keys, not code. So the guard is a cross-check instead:
// every constant and every sentence is compared to every other, and the packs are compared to the
// English. Nothing below restates 42 or 51 — the numbers are read out of the tool, so this suite
// asserts AGREEMENT, not a particular value, and a deliberate correction stays a one-line change
// plus the copy it obliges you to update.
const PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

const DEGREE = '°';
// Numbers written as an angle: "42 degrees", "42°", "6,5 grados". Packs use Western digits
// throughout; the decimal comma is normalised because several of them use it.
const ANGLE = new RegExp(
  '(\\d{1,3}(?:[.,]\\d+)?)\\s*(?:' + DEGREE + '|degrees?\\b|deg\\b)',
  'gi',
);

function readConstant(source, name) {
  const found = new RegExp('\\bvar\\s+' + name + '\\s*=\\s*(-?[\\d.]+)\\s*;').exec(source);
  expect(found, name + ' is no longer a plain numeric constant; this suite reads it from source').toBeTruthy();
  return Number(found[1]);
}

// t('key', 'English default') — the tool uses both quote styles.
function englishDefaults(source) {
  const call = /\bt\(\s*'(stem\.watercycle\.[a-z0-9_]+)'\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
  const out = new Map();
  let match;
  while ((match = call.exec(source))) {
    const text = match[2].slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (!out.has(match[1])) out.set(match[1], text);
  }
  return out;
}

function anglesIn(text) {
  const out = [];
  let match;
  ANGLE.lastIndex = 0;
  while ((match = ANGLE.exec(text))) out.push(Number(match[1].replace(',', '.')));
  return out;
}

// The rainbow sentences live under keys that name them; filtering on the key rather than on the
// prose keeps the tool's minified CSS blob (which contains both "rainbow" class names and
// "110deg" gradient stops) out of the sample entirely.
function rainbowSentences(source) {
  const rows = [];
  for (const [key, text] of englishDefaults(source)) {
    if (!/rainbow/.test(key)) continue;
    const angles = anglesIn(text);
    if (angles.length) rows.push({ key, text, angles });
  }
  return rows;
}

describe.each(PATHS)('Water Cycle stated science figures (%s)', (relativePath) => {
  const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');

  it('states one bow angle, not one per subsystem', () => {
    const scenePrimary = readConstant(source, 'WC_RAINBOW_PRIMARY_DEG');
    const sceneSecondary = readConstant(source, 'WC_RAINBOW_SECONDARY_DEG');
    const pilotPrimary = readConstant(source, 'WC_PILOT_RAINBOW_PRIMARY_DEG');
    const pilotSecondary = readConstant(source, 'WC_PILOT_RAINBOW_SECONDARY_DEG');
    const pilotMaxSun = readConstant(source, 'WC_PILOT_RAINBOW_MAX_SUN_DEG');

    expect(pilotPrimary, 'the scene draws the primary bow at one angle and the pilot lab teaches another')
      .toBe(scenePrimary);
    expect(pilotSecondary, 'the scene draws the secondary bow at one angle and the pilot lab teaches another')
      .toBe(sceneSecondary);
    // The bow's crown sits its own angular radius above the antisolar point, which is as far below
    // the horizon as the Sun is above it — so the Sun altitude at which the primary is lost is the
    // primary's own angle. These are not two numbers that happen to match; they are one number.
    expect(pilotMaxSun, 'the highest Sun that still allows a bow IS the primary bow angle')
      .toBe(scenePrimary);
    expect(sceneSecondary, 'the secondary bow is the wider of the two').toBeGreaterThan(scenePrimary);
  });

  it('never tells a student an angle the geometry does not use', () => {
    const primary = readConstant(source, 'WC_RAINBOW_PRIMARY_DEG');
    const secondary = readConstant(source, 'WC_RAINBOW_SECONDARY_DEG');
    const sentences = rainbowSentences(source);
    // A pass proves nothing if the scan found nothing to check.
    expect(sentences.length, 'expected the rainbow rule to be stated in several places')
      .toBeGreaterThan(8);

    const wrong = [];
    for (const row of sentences) {
      for (const angle of row.angles) {
        if (angle !== primary && angle !== secondary) wrong.push(row.key + ' says ' + angle);
      }
      // A key that names one bow must not quote the other bow's angle at it.
      if (/primary|_sun|scene_rainbow_rule/.test(row.key) && !/secondary|double|science$|paths_value/.test(row.key)) {
        if (row.angles.indexOf(primary) < 0) wrong.push(row.key + ' names the primary bow but never states ' + primary);
      }
      if (/secondary/.test(row.key) && row.angles.indexOf(secondary) < 0) {
        wrong.push(row.key + ' names the secondary bow but never states ' + secondary);
      }
    }
    expect(wrong, 'copy disagrees with the geometry: ' + wrong.join('; ')).toEqual([]);
  });

  it('flies the lapse rate the quiz marks correct', () => {
    // The 9-12 quiz asks for the environmental lapse rate and marks one option right. The pilot
    // mode then cools a real parcel using WC_PILOT_ENV_LAPSE. If those two ever differ, the tool
    // grades a student wrong for reading its own simulation correctly.
    const environmental = readConstant(source, 'WC_PILOT_ENV_LAPSE');
    const dry = readConstant(source, 'WC_PILOT_DRY_LAPSE');
    const defaults = englishDefaults(source);

    const question = defaults.get('stem.watercycle.quiz_912_1_q');
    expect(question, 'the lapse-rate question moved or was renamed').toBeTruthy();
    expect(question.toLowerCase()).toContain('lapse rate');

    // Find the marked answer rather than assuming its index: wcQuizQuestion takes the option list
    // then the zero-based correct index.
    const block = source.slice(source.indexOf("'stem.watercycle.quiz_912_1_q'"));
    const correctIndex = Number(/\],\s*(\d+),/.exec(block)[1]);
    const marked = defaults.get('stem.watercycle.quiz_912_1_opt' + (correctIndex + 1));
    expect(marked, 'no option text for the marked answer').toBeTruthy();
    expect(anglesIn(marked), 'the marked answer must state the rate the simulation uses')
      .toContain(environmental);

    // The distractor feedback names the dry adiabatic rate; it has to be the one the parcel uses.
    const dryFeedback = defaults.get('stem.watercycle.quiz_912_1_fb3');
    expect(dryFeedback, 'the dry-adiabatic feedback moved or was renamed').toBeTruthy();
    expect(anglesIn(dryFeedback), 'the feedback quotes a dry adiabatic rate the model does not use')
      .toContain(dry);
  });
});

describe('Water Cycle stated science figures across translations', () => {
  const source = readFileSync(resolve(process.cwd(), PATHS[0]), 'utf8');
  const primary = readConstant(source, 'WC_RAINBOW_PRIMARY_DEG');
  const secondary = readConstant(source, 'WC_RAINBOW_SECONDARY_DEG');
  const sentences = rainbowSentences(source);

  function flatten(value, prefix, out) {
    for (const key of Object.keys(value)) {
      const child = value[key];
      const path = prefix ? prefix + '.' + key : key;
      if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, out);
      else if (typeof child === 'string') out[path] = child;
    }
    return out;
  }

  it('keeps the same angles in every language that translates them', () => {
    // The English copy gets reviewed. The packs do not get re-reviewed for physics, so a number
    // dropped or altered in translation is invisible until a student in that language reads it.
    const directory = resolve(process.cwd(), 'lang');
    const packs = readdirSync(directory).filter((file) => file.endsWith('.js'));
    expect(packs.length, 'no language packs found to check').toBeGreaterThan(20);

    const wrong = [];
    let compared = 0;
    for (const file of packs) {
      const flat = flatten(JSON.parse(readFileSync(resolve(directory, file), 'utf8')), '', {});
      for (const row of sentences) {
        const translated = flat[row.key];
        if (typeof translated !== 'string' || !translated) continue;
        compared++;
        const want = row.angles.slice().sort().join(',');
        const found = anglesIn(translated);
        // A translation may drop the unit word and write the bare figure, which is fine; what is
        // not fine is a different figure, or none.
        const bare = (translated.match(/\d{1,3}(?:[.,]\d+)?/g) || [])
          .map((text) => Number(text.replace(',', '.')))
          .filter((value) => value === primary || value === secondary);
        const got = (found.length ? found : bare).slice().sort().join(',');
        if (got !== want) wrong.push(file + ' ' + row.key + ': want ' + want + ', got ' + (got || 'none'));
      }
    }
    expect(compared, 'no translated rainbow copy was actually compared').toBeGreaterThan(100);
    expect(wrong, 'translated copy states a different bow angle: ' + wrong.slice(0, 8).join('; ')).toEqual([]);
    // Sixty-odd packs of several megabytes each, read off a synced drive: this is IO-bound, not
    // slow logic, and the default 5s budget is not enough for it.
  }, 60000);
});
