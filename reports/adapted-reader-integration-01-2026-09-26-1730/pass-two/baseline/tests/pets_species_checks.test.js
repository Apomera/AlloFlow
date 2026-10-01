import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const PETS = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_pets.js'), 'utf8');

// sliceBetween throws by naming the anchor that moved, so a refactor that
// relocates one of these regions fails loudly instead of silently pinning
// the whole file.
function between(source, startMarker, endMarker) {
  return sliceBetween(source, startMarker, endMarker, { file: 'stem_lab/stem_tool_pets.js' });
}

const SPECIES_IDS = ['dogs', 'cats', 'smallMammals', 'birds', 'reptiles'];

function checksTable() {
  const source = between(PETS, 'var SPECIES_CHECKS = {', '  // ─────────────────────────────────────────────────────────\n  // SECTION 2: NUTRITION');
  return vm.runInNewContext(`(function () { ${source}; return SPECIES_CHECKS; })()`);
}

// The normalizer is declared inside the evidence-schema region; give it the
// real table so the option-id allowlist under test is the shipped one.
function normalizer() {
  const source = between(PETS, 'function normalizeSpeciesChecks(raw) {', 'function normalizeAiDrafts(');
  return vm.runInNewContext(
    `(function () { ${source}; return { normalizeSpeciesChecks, speciesCheckDone }; })()`,
    { SPECIES_CHECKS: checksTable() }
  );
}

const CHECKS = checksTable();

describe('Pets species prediction checks — content', () => {
  it('authors one check per species view, with a real answer', () => {
    expect(Object.keys(CHECKS).sort()).toEqual([...SPECIES_IDS].sort());
    for (const id of SPECIES_IDS) {
      const check = CHECKS[id];
      expect(check.id, id).toBe(id);
      expect(check.options.length, id).toBe(3);
      const optionIds = check.options.map((option) => option.id);
      expect(new Set(optionIds).size, id + ' duplicate option ids').toBe(3);
      expect(optionIds, id + ' answer must be an option').toContain(check.answer);
    }
  });

  it('writes a prompt, a reveal, a why, and a miss note for every check', () => {
    for (const id of SPECIES_IDS) {
      const check = CHECKS[id];
      for (const field of ['prompt', 'reveal', 'why', 'missNote']) {
        expect(typeof check[field], `${id}.${field}`).toBe('string');
        expect(check[field].length, `${id}.${field} too short`).toBeGreaterThan(60);
      }
      for (const option of check.options) {
        expect(option.label.length, `${id} option ${option.id}`).toBeGreaterThan(15);
      }
    }
  });

  // A distractor that is conspicuously shorter than the key is answerable
  // without reading. Keep every option within a believable band of the answer.
  it('does not let option length give the answer away', () => {
    for (const id of SPECIES_IDS) {
      const check = CHECKS[id];
      const lengths = check.options.map((option) => option.label.length);
      const answerLength = check.options.filter((o) => o.id === check.answer)[0].label.length;
      expect(answerLength, id + ' answer is the longest by a mile')
        .toBeLessThan(Math.max(...lengths) * 2.2);
    }
  });

  // Answer-position bias: a table whose key always sits in the same slot is
  // guessable from position alone.
  it('spreads the correct answer across option positions', () => {
    const positions = SPECIES_IDS.map((id) =>
      CHECKS[id].options.findIndex((option) => option.id === CHECKS[id].answer));
    expect(new Set(positions).size, 'answer always in the same slot').toBeGreaterThan(1);
  });

  // Pin each answer to the claim its own reveal makes, so flipping a key
  // contradicts the explanation the student is shown rather than silently
  // teaching the opposite of the sourced prose.
  it('marks the answer the reveal text actually supports', () => {
    const EXPECTED = {
      // small breeds outlive giant ones
      dogs: { answer: 'smaller', reveal: /REVERSES/ },
      // obligate carnivore: a nutrient profile, not a protein total
      cats: { answer: 'nutrients', reveal: /obligate carnivores/i },
      // guinea pigs are the herd animal; hamsters are the solitary one
      smallMammals: { answer: 'gp', reveal: /herd animals/i },
      // overheated PTFE kills birds
      birds: { answer: 'fatal', reveal: /PTFE/ },
      // UVB output fades before visible light does
      reptiles: { answer: 'replace', reveal: /lose their UVB output/i },
    };
    for (const id of SPECIES_IDS) {
      expect(CHECKS[id].answer, id + ' answer key').toBe(EXPECTED[id].answer);
      expect(CHECKS[id].reveal, id + ' reveal').toMatch(EXPECTED[id].reveal);
    }
  });

  it('keeps the module id list in sync with the authored table', () => {
    const list = vm.runInNewContext(
      between(PETS, 'var PETS_SPECIES_CHECK_MODULES = [', '];')
        .replace('var PETS_SPECIES_CHECK_MODULES = ', '') + ']');
    expect([...list].sort()).toEqual(Object.keys(CHECKS).sort());
  });
});

describe('Pets species prediction checks — state', () => {
  it('keeps only authored species and authored option ids', () => {
    const { normalizeSpeciesChecks } = normalizer();
    const restored = normalizeSpeciesChecks({
      dogs: { pick: 'smaller', revealed: true },
      cats: { pick: 'NOT_AN_OPTION', revealed: true },
      notASpecies: { pick: 'smaller', revealed: true },
      birds: 'not-an-object',
    });
    expect(Object.keys(restored).sort()).toEqual(['cats', 'dogs']);
    expect(restored.dogs).toEqual({ pick: 'smaller', revealed: true });
    // An unknown pick is dropped, but the reveal it was paired with survives.
    expect(restored.cats).toEqual({ pick: null, revealed: true });
  });

  it('drops an empty record rather than storing a blank row', () => {
    const { normalizeSpeciesChecks } = normalizer();
    expect(normalizeSpeciesChecks({ dogs: { pick: null, revealed: false } })).toEqual({});
    expect(normalizeSpeciesChecks(null)).toEqual({});
    expect(normalizeSpeciesChecks([])).toEqual({});
    expect(normalizeSpeciesChecks('nope')).toEqual({});
  });

  it('treats a revealed check as done whether or not the guess was right', () => {
    const { normalizeSpeciesChecks, speciesCheckDone } = normalizer();
    const state = normalizeSpeciesChecks({
      dogs: { pick: 'bigger', revealed: true },   // wrong guess
      cats: { pick: 'nutrients', revealed: false }, // right guess, not revealed
    });
    expect(speciesCheckDone(state, 'dogs'), 'wrong but revealed counts').toBe(true);
    expect(speciesCheckDone(state, 'cats'), 'not revealed yet').toBe(false);
    expect(speciesCheckDone(state, 'birds')).toBe(false);
    expect(speciesCheckDone({}, 'dogs')).toBe(false);
  });
});

describe('Pets species prediction checks — wiring', () => {
  it('renders the check in all five species views, before the reading', () => {
    for (const id of SPECIES_IDS) {
      expect(PETS, id).toContain(`sourceCard('${id}'),\n        speciesCheck('${id}'),`);
    }
  });

  it('activity-gates the species modules', () => {
    const gate = between(PETS, 'var PETS_ACTIVITY_COMPLETION_MODULES = {', '};');
    for (const id of SPECIES_IDS) {
      expect(gate, id).toContain(`${id}: true`);
    }
  });

  it('persists the checks through the snapshot normalizer', () => {
    expect(PETS).toContain("'sensoryDusk', 'speciesChecks'");
    expect(PETS).toContain('snapshot.speciesChecks = normalizeSpeciesChecks(snapshot.speciesChecks);');
  });

  // Completion must not depend on being right: the reveal call is what records
  // the activity, and it is reached from both the answered and skipped paths.
  it('completes the module on reveal without requiring a correct prediction', () => {
    const reveal = between(PETS, 'function reveal() {', 'function tryAgain() {');
    expect(reveal).toContain("completeModule(speciesId, 'Prediction check completed'");
    expect(reveal).toContain("predicted: pick ? 'answered' : 'skipped'");
    expect(reveal).not.toMatch(/if\s*\(\s*!?correct\s*\)\s*return/);
  });

  it('never keeps a criterionMet flag on a skipped prediction', () => {
    const reconcile = between(PETS, 'PETS_SPECIES_CHECK_MODULES.indexOf(moduleId) >= 0', 'moduleId === \'sensory\'');
    expect(reconcile).toContain("details.predicted !== 'answered'");
    expect(reconcile).toContain('delete details.criterionMet;');
  });
});
