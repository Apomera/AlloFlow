import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

// "Preserve these essential terms" (2026-09-28). Word breaking keeps
// "l'atmosphère", "Newton's" and Arabic/Hebrew words with attached prefixes
// whole, so a term inside them was reported absent from the source and a
// correct rewrite was rejected as "essential-terms-missing".
let vocabulary, split;
beforeAll(() => {
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('text_pipeline_helpers_module.js'); loadAlloModule('generation_helpers_module.js');
  vocabulary = window.AlloModules.GenerationHelpers.preservedVocabulary;
  split = window.AlloModules.TextPipelineHelpers.splitReferencesFromBody;
});
const absent = (source, term) => vocabulary.prepare(source, [term], split).absentFromSource;
const kept = (source, candidate, term) => vocabulary.validate(source, candidate, [term], split);

describe('terms inside elisions, possessives and attached prefixes', () => {
  it.each([
    ['French elision', "La lumière traverse l'atmosphère.", 'atmosphère'],
    ['French elision, typographic apostrophe', 'La lumière traverse l’atmosphère.', 'atmosphère'],
    ['French qu elision', "On dit qu'Einstein avait raison.", 'Einstein'],
    ['Italian elision', "Nell'ecosistema vivono molte specie.", 'ecosistema'],
    ['English possessive', "Newton's laws describe motion.", 'Newton'],
    ['English possessive, typographic', 'Newton’s laws describe motion.', 'Newton'],
    ['Arabic conjunction and article', 'والتمثيل الضوئي يحتاج إلى الضوء.', 'التمثيل الضوئي'],
    ['Arabic preposition', 'يحدث بالتمثيل الضوئي في الورقة.', 'التمثيل الضوئي'],
    ['Arabic term without the article', 'والتمثيل مهم للنبات.', 'تمثيل'],
    ['Hebrew prefix', 'הצמח חי בפוטוסינתזה.', 'פוטוסינתזה'],
    ['Hebrew two prefixes', 'וכשהאור חזק הצמח גדל.', 'אור'],
  ])('%s: found in the source', (_name, source, term) => {
    expect(absent(source, term)).toEqual([]);
  });

  it.each([
    ['French', "L'atmosphère protège la Terre.", "La lumière traverse l'atmosphère.", 'atmosphère'],
    ['Italian', 'Un ecosistema ricco.', "Nell'ecosistema vivono molte specie.", 'ecosistema'],
    ['English', 'Newton described three laws.', "Newton's three laws describe motion.", 'Newton'],
    ['Arabic', 'التمثيل الضوئي يصنع الغذاء.', 'بالتمثيل الضوئي يصنع النبات غذاءه.', 'التمثيل الضوئي'],
    ['Hebrew', 'פוטוסינתזה יוצרת מזון.', 'הצמח יוצר מזון בפוטוסינתזה.', 'פוטוסינתזה'],
  ])('%s: a rewrite using the attached form keeps the term', (_name, source, candidate, term) => {
    expect(kept(source, candidate, term)).toMatchObject({ valid: true, missingTerms: [] });
  });

  it('still rejects a term that is only part of another word', () => {
    expect(absent('A selfish bird ate.', 'fish')).toEqual(['fish']);
    expect(absent('Newtonian physics is classical.', 'Newton')).toEqual(['Newton']);
    // An elided start does not excuse a longer ending: "d'atmosphères" is plural.
    expect(absent("Il parle d'atmosphères lointaines.", 'atmosphère')).toEqual(['atmosphère']);
    expect(kept('The fish swim.', 'The selfish swimmers swim.', 'fish')).toMatchObject({ valid: false, reason: 'essential-terms-missing' });
  });

  it('does not treat a long word before an apostrophe as an elided prefix', () => {
    // Only a short elided prefix (l', qu', nell', dell', quest') starts a term.
    expect(absent("The rainforest'shelter was dense.", 'shelter')).toEqual(['shelter']);
  });

  it('accepts only the listed Arabic and Hebrew prefixes', () => {
    expect(absent('בפוטוסינתזה', 'וטוסינתזה')).toEqual(['וטוסינתזה']);
    expect(absent('والتمثيل', 'لتمثيل')).toEqual(['لتمثيل']);
  });
});
