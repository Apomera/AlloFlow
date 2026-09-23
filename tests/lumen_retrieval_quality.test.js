// Lumen evidence core: retrieval quality and the AI-permission floor.
//
// WHY (2026-09-23):
//   - Tokens were ASCII-only: "niño" became "ni", and Arabic, Somali-script or
//     Vietnamese text produced no tokens, so references and sources in the
//     languages AlloFlow serves could not be retrieved at all.
//   - "weakness" never matched "weaknesses"; stemming is now available OPT-IN,
//     so existing Study and Content Engine rankings do not move (their golden
//     tests are unchanged).
//   - A source marked allowAI:false was protected only by Lumen Study's UI; the
//     Content Engine sent its passages to the model. retrieve() now takes
//     forAI, and buildGroundedPrompt never includes such a passage.
//   - There was no test of ranking quality at all.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let E;
beforeAll(() => {
  loadAlloModule('stem_lab/stem_lumen_evidence.js');
  E = window.LumenEvidence;
});

const projectWith = (sources) => sources.reduce((p, s) => E.upsertSource(p, s), E.makeProject({ id: 'q' }));
const ids = (rows) => rows.map(r => r.node.sourceId);

describe('tokens in every script', () => {
  it('finds a Spanish passage by an accented or an unaccented query', () => {
    const p = projectWith([{ id: 'es', title: 'Informe', content: 'El niño tiene dificultades con la lectura en voz alta.' }, { id: 'en', title: 'Other', content: 'Math facts were fluent.' }]);
    expect(ids(E.retrieve(p, 'niño lectura'))).toEqual(['es']);
    expect(ids(E.retrieve(p, 'nino'))).toEqual(['es']);
  });
  it('finds Arabic text, which produced no tokens before', () => {
    const p = projectWith([{ id: 'ar', title: 'تقرير', content: 'يواجه الطالب صعوبة في القراءة والكتابة.' }]);
    expect(ids(E.retrieve(p, 'القراءة'))).toEqual(['ar']);
  });
  it('leaves plain ASCII tokenization exactly as it was', () => {
    const text = "Letter-Word ID scores; Gf-Gc (1.5 SD) weren't the child's O'Neil_2 standard, e.g. SLD.";
    const old = (text.toLowerCase().match(/[a-z0-9][a-z0-9'_-]*/g) || []).filter(t => t.length > 1);
    expect(E.tokenize(text, true)).toEqual(old);
  });
});

describe('opt-in stemming', () => {
  const p = () => projectWith([
    { id: 'psw', title: 'Criteria', content: 'The child shows a relative weakness in phonological processing.' },
    { id: 'other', title: 'Procedures', content: 'Notices are provided in the native language of the parent.' },
  ]);
  // (A singular query already reaches plural text by Lumen's substring phrase
  // bonus; the gap is a PLURAL or -ing query against singular/base text.)
  it('does not change default ranking: "weaknesses" does not match "weakness" unless asked', () => {
    expect(E.retrieve(p(), 'weaknesses')).toEqual([]);
  });
  it('with stem:true, plural and -ing forms meet their base words', () => {
    expect(ids(E.retrieve(p(), 'weaknesses', { stem: true }))).toEqual(['psw']);
    expect(ids(E.retrieve(p(), 'showing', { stem: true }))).toEqual(['psw']);
  });
});

describe('quote strength', () => {
  it('a quote of one or two words is recorded as weakly supported, not supported', () => {
    const p = projectWith([{ id: 's', title: 'Guide', content: 'The team reviews the reading data every six weeks.' }]);
    const rows = E.retrieve(p, 'reading data');
    const id = rows[0].node.id;
    const answer = (quote) => E.validateGroundedResponse(JSON.stringify({ claims: [{ text: 'Data are reviewed.', evidenceIds: [id], quote }] }), rows);
    expect(answer('the').claims[0].supportStatus).toBe('weakly-supported');
    expect(answer('reviews the reading data every six weeks').claims[0].supportStatus).toBe('supported');
  });
});

describe('scoping and the AI-permission floor', () => {
  const p = () => projectWith([
    { id: 'open', title: 'Open', content: 'Reading fluency improved with repeated reading.' },
    { id: 'licensed', title: 'Licensed', content: 'Reading fluency norms from a licensed manual.', allowAI: false },
  ]);
  it('sourceIds restricts retrieval to the caller\'s corpus', () => {
    expect(ids(E.retrieve(p(), 'reading fluency', { sourceIds: ['open'] }))).toEqual(['open']);
  });
  it('forAI drops sources that do not allow AI use; without it they are still found for local reading', () => {
    expect(ids(E.retrieve(p(), 'reading fluency')).sort()).toEqual(['licensed', 'open']);
    expect(ids(E.retrieve(p(), 'reading fluency', { forAI: true }))).toEqual(['open']);
  });
  it('buildGroundedPrompt never includes a passage whose source disallows AI, even if handed one', () => {
    const project = p();
    const rows = E.retrieve(project, 'reading fluency');
    const prompt = E.buildGroundedPrompt(project, 'What improved?', rows);
    expect(prompt).toContain('repeated reading');
    expect(prompt).not.toContain('licensed manual');
  });
});
