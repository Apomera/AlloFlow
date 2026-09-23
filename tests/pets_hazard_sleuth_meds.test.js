// Pets Lab — Household Hazard Sleuth covers the medicine cabinet, and every
// place that depends on how many vignettes it has agrees.
//
// The game had ten vignettes, all food, plants, or a fume. It never touched
// human medicines, which are the largest category on ASPCA Animal Poison
// Control's annual top-toxins list (over-the-counter medications #1, 16.9% of
// exposures in the 2025 report), nor the classic cat poisoning from a DOG
// product: permethrin flea treatments. Three vignettes were appended:
// acetaminophen (cat-focused), ibuprofen/naproxen (multi-species), and a
// permethrin-treated dog groomed by a cat (cat-focused). Sources: ASPCA top
// toxins; VCA and Pet Poison Helpline on acetaminophen, ibuprofen, permethrin.
//
// "10" was load-bearing in twelve places, several of them silent: the saved
// missed-vignette list was capped at index 9, so a missed medicine case would
// have vanished from review; the load-time normalizer would have reset a game
// resumed on a new vignette; reconcileScore(10) would have stripped the score
// from every new completion in the teacher view; and the on-screen verdict
// (score >= 8) would have said "target met" at 9/13 while the saved record
// said criterionMet: false.
//
// This file reads the vignette count from the shipped array and requires every
// one of those sites to agree with it, so the next vignette added fails here
// with the exact site named, instead of silently in a student's save.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const PETS = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_pets.js'), 'utf8');
const MIRROR = fs.readFileSync(path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_pets.js'), 'utf8');

const GAME = sliceBetween(PETS, 'var TFS_VIGNETTES = [', 'var tfsState = normalizePetsMiniGameState', {
  label: 'Household Hazard Sleuth vignettes + target',
});
const { V, TARGET } = new Function(GAME + '\nreturn { V: TFS_VIGNETTES, TARGET: tfsTarget };')();
const N = V.length;
const LEGACY_N = 10;

function criterionMet(score, total) {
  // completeModule's rule, verbatim in behaviour: finalPct >= 80
  return Math.round((score / total) * 100) >= 80;
}

describe('Household Hazard Sleuth covers the medicine cabinet', () => {
  it('has the three medicine-cabinet vignettes appended after the original ten', () => {
    expect(N).toBe(13);
    expect(V.map((v) => v.id)).toEqual(Array.from({ length: N }, (_, i) => i + 1));
    expect(V[10]).toMatchObject({ correct: 'toxicCats' });
    expect(V[10].food).toMatch(/acetaminophen/i);
    expect(V[11]).toMatchObject({ correct: 'toxicMulti' });
    expect(V[11].food).toMatch(/ibuprofen|naproxen/i);
    expect(V[12]).toMatchObject({ correct: 'toxicCats' });
    expect(V[12].food).toMatch(/permethrin/i);
  });

  it('teaches the call-first protocol and never a home dose, for every medicine case', () => {
    for (const v of V.slice(10)) {
      expect(v.why, v.food).toMatch(/call immediately/);
      expect(v.why, v.food).not.toMatch(/\b\d+\s*(mg|milligram|tablets? (is|are) (safe|fine|ok))/i);
    }
    expect(V[10].why).toMatch(/never give any pet a human pain reliever/);
    expect(V[12].why).toMatch(/Never use a dog flea product on a cat/);
  });

  it('keeps the original ten vignettes in their original positions', () => {
    // Saved in-progress games and missed-review lists store INDICES.
    expect(V.slice(0, LEGACY_N).map((v) => v.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(V[9].food).toMatch(/carrot/i);
  });
});

describe('every count-dependent site agrees with the vignette array', () => {
  it('shows a target computed with the same rule the saved record uses', () => {
    for (let score = 0; score <= N; score += 1) {
      expect(score >= TARGET, `score ${score}/${N}`).toBe(criterionMet(score, N));
    }
    expect(TARGET).toBe(11);
  });

  it('bounds saved missed-vignette and review indices at the array length', () => {
    const helpers = sliceBetween(PETS, 'function normalizeToxicFoodIndices(value) {', 'function normalizeLifespanIndices(value) {', {
      label: 'toxic-food normalizers',
    });
    expect(helpers).toContain(`normalizePetsReviewIndices(value, ${N})`);
    expect(helpers).toContain(`normalizePetsFocusedReviewState(raw, missed, ${N},`);
  });

  it('normalizes a resumed game against the array length on load', () => {
    expect(PETS).toContain(`normalizePetsMiniGameState(snapshot, 'tfs', ${N},`);
    expect(PETS).not.toContain("normalizePetsMiniGameState(snapshot, 'tfs', 10,");
  });

  it('accepts new completions and keeps records finished before the medicine cases', () => {
    const branch = sliceBetween(PETS, "} else if (moduleId === 'nutrition' || moduleId === 'lifespan') {", "} else if (moduleId === 'zoonoses') {", {
      label: 'nutrition/lifespan reconcile',
    });
    expect(branch).toContain(`reconcileScore(moduleId === 'nutrition' && details.total !== ${LEGACY_N} ? ${N} : ${LEGACY_N})`);
  });

  it('lists the new completion reason and keeps both legacy ones', () => {
    const reasons = sliceBetween(PETS, 'nutrition: [\'Finished all', '],', { label: 'nutrition completion reasons' });
    expect(reasons).toContain(`'Finished all ${N} Household Hazard Sleuth vignettes'`);
    expect(reasons).toContain(`'Finished all ${LEGACY_N} Household Hazard Sleuth vignettes'`);
    expect(reasons).toContain(`'Finished all ${LEGACY_N} Toxic Foods Sleuth vignettes'`);
    // ...and the game writes exactly the new one.
    expect(PETS).toContain("completeModule('nutrition', 'Finished all ' + TFS_VIGNETTES.length + ' Household Hazard Sleuth vignettes', {");
  });

  it('derives every visible count inside the game from the array', () => {
    const ui = sliceBetween(PETS, 'var tfsState = normalizePetsMiniGameState', 'function beginTfsReview', { label: 'hazard game body' });
    // From the game's title to the close of its IIFE — every visible count
    // string (header, intro, start button, banner, target status) sits inside.
    const view = sliceBetween(PETS, "'Household Hazard Sleuth'),", '\n        })()', { label: 'hazard game view' });
    for (const text of [ui, view]) {
      expect(text).not.toMatch(/8\/10|of 10'|All 10 vignettes|'10 vignettes|'10 food/);
    }
    expect(PETS).toContain('var targetMet = tfsScore >= tfsTarget;');
  });

  it('states the same counts in the learning target', () => {
    expect(PETS).toContain(
      `target: 'I can recognize common food, plant, medicine, and fume hazard patterns and use a call-first response protocol.', success: 'Finish all ${N} vignettes; ${TARGET}/${N} meets the activity target.`);
  });

  it('ships the same game in the public mirror', () => {
    expect(sliceBetween(MIRROR, 'var TFS_VIGNETTES = [', 'var tfsState = normalizePetsMiniGameState', { label: 'mirror game' })).toBe(GAME);
  });
});
