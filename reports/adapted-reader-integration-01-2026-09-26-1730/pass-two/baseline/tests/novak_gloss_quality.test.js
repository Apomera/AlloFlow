import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const evaluation = require('../reports/novak-gloss-enhancements/evaluate.cjs');
const contract = require('../instructional_context_module.js');
const generate = evaluation.loadProductionGenerator();
const hash = text => createHash('sha256').update(text, 'utf8').digest('hex');
function proposal(snapshot, spelling = 'Graymalkin') {
  return evaluation.fixture.terms.map(term => {
    const quote = term.id === 'grimalkin' ? spelling : term.quote;
    return { id: 'word-' + snapshot.text.indexOf(quote), text: term.referenceGloss,
      priority: 'essential', origin: 'educator', pinned: true };
  });
}
describe('Macbeth contextual gloss acceptance fixture', () => {
  it('contains the exact complete local opening scene, including verse and speakers', () => {
    const fixture = evaluation.fixture;
    const book = JSON.parse(readFileSync(fixture.source.path, 'utf8'));
    const page = book.pages.find(page => page.n === fixture.source.page);
    expect(fixture.text).toBe(page.text.slice(fixture.source.start, fixture.source.end));
    expect(hash(fixture.text)).toBe(fixture.sha256);
    expect(fixture.text.startsWith('ACT I\n\nSCENE I.')).toBe(true);
    expect(fixture.text.endsWith('[Exeunt.]')).toBe(true);
    expect(fixture.text).toContain('ALL.\nFair is foul, and foul is fair:\nHover through the fog and filthy air.');
    expect(fixture.text).toContain('FIRST WITCH.\nWhen shall we three meet again?\nIn thunder, lightning, or in rain?');
    expect(fixture.variants[0].text).toBe(fixture.text.replace('Graymalkin', 'Grimalkin'));
  });
  it.each(evaluation.buildCases())('validates exact anchors on $id with a labeled test double, not live model evidence', async testCase => {
    const snapshot = contract.createSourceSnapshot(testCase.text);
    const before = JSON.stringify(snapshot);
    const result = await generate(snapshot, { contextModule: contract, gradeLevel: testCase.grade,
      callGemini: async () => JSON.stringify({ sourceFingerprint: snapshot.fingerprint, annotations: proposal(snapshot, testCase.spelling),
        rewrittenPassage: 'This unwanted rewritten passage must not replace the source.' }) });
    const checks = evaluation.evaluateResult(testCase, snapshot, before, result);
    expect(checks.structuralPass).toBe(true);
    expect(checks.heuristicRequirementsMet).toBe(true);
    expect(checks.humanReview).toBe('pending');
    expect(JSON.stringify(snapshot)).toBe(before);
    expect(result.annotations.every(annotation => annotation.origin === 'generated' && annotation.pinned === false)).toBe(true);
  });
  it('uses contextual literary guidance without leaking acceptance answers into production prompts', async () => {
    const cases = await evaluation.prepareCases(generate);
    for (const testCase of cases) {
      const prompt = testCase.prompts[0];
      expect(prompt).toContain('historical/literary sense');
      expect(prompt).toContain('poetic ambiguity');
      expect(prompt).toContain('do not substitute a familiar modern sense');
      expect(prompt).toContain('Mark priority "essential" only');
      expect(prompt).toContain('"priority":"helpful"');
      expect(prompt).toContain('Source passage: ' + JSON.stringify(testCase.text));
      expect(prompt).not.toContain(evaluation.fixture.terms[0].referenceGloss);
      expect(testCase.status).toBe('not-run');
    }
  });
  it('defaults malformed priority to helpful and never accepts model curation privileges', async () => {
    const snapshot = contract.createSourceSnapshot(evaluation.fixture.text);
    const annotations = proposal(snapshot).slice(0, 1).map(annotation => ({ ...annotation, priority: 'mandatory' }));
    const result = await generate(snapshot, { contextModule: contract,
      callGemini: async () => JSON.stringify({ sourceFingerprint: snapshot.fingerprint, annotations }) });
    expect(result.annotations[0]).toMatchObject({ priority: 'helpful', origin: 'generated', pinned: false });
  });
  it('distinguishes valid formatting from missed terms or a wrong historical sense', async () => {
    const testCase = evaluation.buildCases()[0], snapshot = contract.createSourceSnapshot(testCase.text);
    const before = JSON.stringify(snapshot), annotations = proposal(snapshot).filter(annotation => !annotation.id.endsWith(String(snapshot.text.indexOf('heath'))));
    const anon = annotations.find(annotation => annotation.id === 'word-' + snapshot.text.indexOf('Anon'));
    anon.text = 'an anonymous writer';
    const result = await generate(snapshot, { contextModule: contract,
      callGemini: async () => JSON.stringify({ sourceFingerprint: snapshot.fingerprint, annotations }) });
    const checked = evaluation.evaluateResult(testCase, snapshot, before, result);
    expect(checked.structuralPass).toBe(true);
    expect(checked.heuristicRequirementsMet).toBe(false);
    expect(checked.targetChecks.find(term => term.id === 'heath').covered).toBe(false);
    expect(checked.targetChecks.find(term => term.id === 'anon').misleadingSenseFlag).toBe(true);
  });
});
