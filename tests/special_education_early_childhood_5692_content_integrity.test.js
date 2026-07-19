import { createRequire } from 'node:module';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const banks = require('../dev-tools/special_education_early_childhood_5692/item_content.cjs');
const {
  assertSourceContentIntegrity,
  assertPackContentIntegrity,
  assertLibraryContentIntegrity,
} = require('../dev-tools/special_education_early_childhood_5692/content_integrity.cjs');

const readJson = (file) => JSON.parse(fs.readFileSync(resolve(process.cwd(), file), 'utf8'));

function sourceQuestionAt(sourceBanks, position) {
  return sourceBanks.flatMap((bank) => bank.questions)[position - 1];
}

function eraseQuestionMeaning(question) {
  Object.assign(question, {
    promptA: 'Which general statement is accurate?',
    promptB: 'Which general statement is accurate in this situation?',
    correct: 'Use an individualized process.',
    distractors: ['Use one fixed rule.', 'Wait indefinitely.', 'Choose without evidence.'],
    rationale: 'The decision should be individualized and based on relevant evidence.',
  });
}

describe('Special Education EC/EI 5692 content-integrity gates', () => {
  it('accepts the authored 100-question source and rejects every legacy adapter literal', () => {
    expect(() => assertSourceContentIntegrity(banks)).not.toThrow();
    const legacyLiterals = [
      'A early childhood special educator asks a question.',
      'All young childs should use the same support.',
      'A inclusive classroom is required.',
      'The early intervention or school program selects a placement.',
      'Use the same separate inclusive early-learning setting.',
      'Compare an IFSP or IEP without identifying the applicable IDEA part.',
      'A child uses a school program copier.',
    ];
    for (const literal of legacyLiterals) {
      const mutation = structuredClone(banks);
      mutation[0].questions[0].promptA = literal;
      expect(() => assertSourceContentIntegrity(mutation)).toThrow(/EC5692 source integrity failed/);
    }
  });

  it('rejects loss of each targeted Part C, Part B, age, or routine boundary', () => {
    for (const position of [25, 35, 36, 37, 39, 85, 86, 99]) {
      const mutation = structuredClone(banks);
      eraseQuestionMeaning(sourceQuestionAt(mutation, position));
      expect(() => assertSourceContentIntegrity(mutation)).toThrow(/EC5692 source integrity failed/);
    }
  });

  it('accepts released pack and library content and rejects semantic regressions in each layer', () => {
    const pack = readJson('test_prep/special_education_early_childhood_5692_pack.json');
    const library = readJson('test_prep/special_education_early_childhood_5692_learning_library.json');
    expect(() => assertPackContentIntegrity(pack)).not.toThrow();
    expect(() => assertLibraryContentIntegrity(library)).not.toThrow();

    const packMutation = structuredClone(pack);
    const placement = packMutation.items.find((item) => item.id === 'se5692-b1-025');
    Object.assign(placement, {
      prompt: 'A program selects a setting. What should happen?',
      choices: ['Use one setting.', 'Ask one person.', 'Wait.', 'Use data.'],
      rationale: 'Use an individualized process.',
      choiceRationales: ['One.', 'Two.', 'Three.', 'Four.'],
    });
    expect(() => assertPackContentIntegrity(packMutation)).toThrow(/EC5692 pack integrity failed/);

    const libraryMutation = structuredClone(library);
    const ifspCard = libraryMutation.flashcards.find((card) => card.id === 'se5692-card-073');
    ifspCard.front = 'Which plan applies?';
    ifspCard.back = 'Use the relevant plan.';
    expect(() => assertLibraryContentIntegrity(libraryMutation)).toThrow(/EC5692 library integrity failed/);
  });
});
