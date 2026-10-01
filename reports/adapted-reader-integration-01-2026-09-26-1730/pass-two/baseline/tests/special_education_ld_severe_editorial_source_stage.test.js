import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = file => fs.readFileSync(resolve(root, file), 'utf8');
const parse = file => JSON.parse(read(file));
const variantValue = (question, field, batch) => question[`${field}${batch === 1 ? 'A' : 'B'}`] || question[field];

const suites = [
  {
    stem: 'special_education_learning_disabilities_5383',
    idPrefix: 'ld5383',
    source: require('../dev-tools/special_education_learning_disabilities_5383/item_content.cjs'),
    forbidden: /For a student with a learning disability,\s+(?:a student|a learner)|student with a learning disability[^?]{0,100},\s+a student(?:’s|s)?\b|During explicit (?:literacy|written-expression) intervention[^?]{0,100},\s+during|,\s+during\s+(?:systematic K[–-]6 phonics|elementary writing instruction|IEP development)|,\s+in effective co-teaching/i,
  },
  {
    stem: 'special_education_severe_profound_5547',
    idPrefix: 'sp5547',
    source: require('../dev-tools/special_education_severe_profound_5547/item_content.cjs'),
    forbidden: /^For a learner with severe or profound disabilities,|^When planning intensive, age-respectful support,|,\s+during IEP development,|,\s+in effective co-teaching,/im,
  },
];

describe('LD 5383 and Severe/Profound 5547 source and final-release editorial integrity', () => {
  for (const suite of suites) {
    it(`${suite.stem} binds both source diagnostics to reviewed prompts and keys`, () => {
      const pack = parse(`test_prep/${suite.stem}_pack.json`);
      const questions = suite.source.flatMap(bank => bank.questions);
      const byId = new Map(pack.items.map(item => [item.id, item]));

      expect(questions).toHaveLength(100);
      expect(pack.items.length).toBeGreaterThanOrEqual(200);
      for (let batch = 1; batch <= 2; batch++) {
        for (let index = 0; index < questions.length; index++) {
          const id = `${suite.idPrefix}-b${batch}-${String(index + 1).padStart(3, '0')}`;
          const item = byId.get(id);
          const question = questions[index];
          expect(item?.prompt, id).toBe(batch === 1 ? question.promptA : question.promptB);
          expect(item?.choices[item.answerIndex], id).toBe(variantValue(question, 'correct', batch));
        }
      }
    });

    it(`${suite.stem} rejects mechanical lead-ins across pack and learning activities`, () => {
      const pack = parse(`test_prep/${suite.stem}_pack.json`);
      const library = parse(`test_prep/${suite.stem}_learning_library.json`);
      const prompts = [
        ...pack.items.slice(0, 200).map(item => item.prompt),
        ...library.chapters.flatMap(chapter => chapter.knowledgeChecks.map(check => check.prompt)),
        ...library.flashcards.map(card => card.front),
      ].join('\n');

      expect(library.chapters.flatMap(chapter => chapter.knowledgeChecks)).toHaveLength(60);
      expect(library.flashcards).toHaveLength(75);
      expect(prompts).not.toMatch(suite.forbidden);
      expect(`${read(`dev-tools/${suite.stem}/item_content.cjs`)}\n${prompts}`).not.toMatch(/\uFFFD|\u00e2\u20ac|\u00c3/);
    });

    it(`${suite.stem} publishes passing QA with exact deploy parity`, () => {
      const nativeQa = parse(`test_prep/${suite.stem}_native_qa.json`);
      const libraryQa = parse(`test_prep/${suite.stem}_learning_library_qa.json`);
      expect(nativeQa.summary).toMatchObject({ totalItems: 500, passedItems: 500, sourceItems: 200, findings: [], status: 'pass' });
      expect(libraryQa.summary).toMatchObject({ findings: [], status: 'pass' });

      for (const suffix of [
        '_items.json',
        '_pack.json',
        '_learning_library.json',
        '_native_qa.json',
        '_native_qa.md',
        '_learning_library_qa.json',
        '_learning_library_qa.md',
      ]) {
        expect(read(`desktop/web-app/public/test_prep/${suite.stem}${suffix}`)).toBe(read(`test_prep/${suite.stem}${suffix}`));
      }
    });
  }
});
