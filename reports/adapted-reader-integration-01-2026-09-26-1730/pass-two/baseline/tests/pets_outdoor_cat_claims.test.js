// Pets Lab — the outdoor-cat claims must agree with each other.
//
// The lab teaches one position on outdoor cats, and teaches it carefully:
// cats with outdoor access DO die younger (traffic, predators, disease,
// poisoning — the mechanisms are solid), but the widely quoted "2–5 years"
// figure comes largely from feral-colony data, not owned cats, and circulates
// in advocacy material more than peer-reviewed work. Welfare & Ethics says so,
// the Cat species card says so, and the Welfare decision activity marks
// "tell them outdoor cats only live 2 to 5 years" as a weaker pick for exactly
// that reason.
//
// The care-sim's "Open the door" choice contradicted all of it:
//
//     "Owned outdoor cat lifespan ~5 years on average. They'll also kill an
//      estimated dozens of birds/mammals per year. See Welfare & Ethics for the
//      data."
//
// It asserted the shaky figure as fact, for OWNED cats (the group the data
// does not cover), quoted a per-cat predation number that appears nowhere in
// the lab's own evidence, and then sent the student to the tab that debunks it.
//
// These tests read the lab's own figures from the Welfare evidence and require
// the care-sim note to agree with them, rather than holding a second copy of
// any number here.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const PETS = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_pets.js'), 'utf8');
const MIRROR = fs.readFileSync(path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_pets.js'), 'utf8');

// The cat care-sim scenario's free-roam choice. (Rabbits also have a
// `free_roam` choice, so anchor on the cat label, not the id.)
const CAT_FREE_ROAM = sliceBetween(PETS, "{ id: 'free_roam', label: 'Open the door; \"they know where home is\"'", '\n        ]', {
  label: 'cat care-sim free_roam choice',
});
// The text a student actually sees. The source around it carries a comment
// that QUOTES the old wording to explain the fix, so assertions about what the
// lab says must read the string literal, not the slice.
const NOTE = (() => {
  const m = CAT_FREE_ROAM.match(/\bnote:\s*'((?:\\'|[^'])*)'/);
  if (!m) throw new Error('cat free_roam note literal not found');
  return m[1];
})();
// Source with whole-line // comments removed, for lab-wide "never says" checks.
const PETS_CODE = PETS.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const WELFARE_DATA = sliceBetween(PETS, "data: 'Loss et al. 2013", "',\n", { label: 'Welfare outdoor-cat data' });
const WELFARE_LIFESPAN = sliceBetween(PETS, "ownCatLifespan: '", "',\n", { label: 'Welfare ownCatLifespan' });

// "the popular 2–5 years", "2-5 years", "2 to 5 years"
const SHORT_FIGURE = /2\s*(?:–|-|to)\s*5 years/g;
const CAUTION = /rough|shak|careful|wary|feral|circulat|advocacy/i;

function billionBirds(text) {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(\d+(?:\.\d+)?)\s*billion birds/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

describe('Pets outdoor-cat claims agree across the lab', () => {
  it('reads the Welfare evidence it checks against', () => {
    expect(billionBirds(WELFARE_DATA)).not.toBeNull();
    expect(WELFARE_LIFESPAN).toMatch(/feral/);
    expect(WELFARE_LIFESPAN).toMatch(SHORT_FIGURE);
  });

  it('never states the short outdoor lifespan without the caution the lab teaches', () => {
    const hits = [...PETS_CODE.matchAll(SHORT_FIGURE)];
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      // The caution may sit in the same sentence or, for the Welfare activity
      // option that QUOTES the claim so students can evaluate it, in that
      // option's own feedback note a few lines on.
      // hit.index is a PETS_CODE offset, so slice PETS_CODE with it.
      const around = PETS_CODE.slice(Math.max(0, hit.index - 220), hit.index + 420);
      const line = PETS_CODE.slice(0, hit.index).split('\n').length;
      expect(around, `line ${line} states "2–5 years" with no caution`).toMatch(CAUTION);
    }
  });

  it('no longer asserts an owned-cat lifespan figure as fact', () => {
    expect(PETS_CODE).not.toMatch(/Owned outdoor cat lifespan/);
    expect(NOTE).not.toMatch(/~\s*5 years/);
  });

  it('keeps the teaching point: outdoor access shortens a cat\'s life, for named reasons', () => {
    expect(NOTE).toMatch(/die younger/);
    for (const cause of ['traffic', 'predators', 'disease', 'poisoning']) {
      expect(NOTE).toMatch(new RegExp(cause));
    }
    expect(NOTE).toMatch(CAUTION);
  });

  it('quotes the same predation figure as the Welfare evidence it points to', () => {
    expect(NOTE).toMatch(/See Welfare & Ethics/);
    expect(billionBirds(NOTE)).toEqual(billionBirds(WELFARE_DATA));
    // The evidence gives population totals only; a per-cat figure would be a
    // number the linked tab cannot back up.
    expect(NOTE).not.toMatch(/dozens of birds|birds\/mammals per year|per cat/);
  });

  it('ships the same note in the public mirror', () => {
    expect(sliceBetween(MIRROR, "{ id: 'free_roam', label: 'Open the door; \"they know where home is\"'", '\n        ]', {
      label: 'mirror cat free_roam choice',
    })).toBe(CAT_FREE_ROAM);
  });
});
