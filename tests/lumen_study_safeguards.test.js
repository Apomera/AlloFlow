import { describe, it, expect } from 'vitest';
import * as EvidenceMod from '../stem_lab/stem_lumen_evidence.js';
import * as StudyMod from '../stem_lab/stem_lumen_study.js';

const E = EvidenceMod.default || EvidenceMod;
const Study = StudyMod.default || StudyMod;

describe('Lumen source provenance', () => {
  it('uses matching import provenance for the current AlloFlow source', () => {
    const content = 'A source passage about equitable access to learning.';
    const ctx = {
      inputText: content,
      sourceTopic: 'Fallback topic',
      sourceProvenance: {
        title: 'Research brief.pdf',
        locator: 'Research brief.pdf',
        type: 'application/pdf',
        importMethod: 'file-upload',
        signature: E.sourceContentSignature(content)
      }
    };
    const project = Study.initialProjectFromContext(ctx);
    expect(project.sources[0]).toMatchObject({
      title: 'Research brief.pdf',
      locator: 'Research brief.pdf',
      type: 'application/pdf',
      importMethod: 'file-upload'
    });
  });

  it('ignores provenance after the source text changes', () => {
    const ctx = {
      inputText: 'This text was edited after import.',
      sourceTopic: 'Edited source',
      sourceProvenance: {
        title: 'Old article',
        locator: 'https://example.org/old',
        type: 'url',
        signature: E.sourceContentSignature('Original imported text.')
      }
    };
    const project = Study.initialProjectFromContext(ctx);
    expect(project.sources[0].title).toBe('Edited source');
    expect(project.sources[0].locator).toBe('');
  });
});

describe('Lumen Study session safeguards', () => {
  it('enforces a short cooldown and an eight-call session ceiling', () => {
    expect(Study.checkSessionAllowance({ count: 0, lastAt: 0 }, 10_000).ok).toBe(true);
    expect(Study.checkSessionAllowance({ count: 1, lastAt: 10_000 }, 11_000)).toMatchObject({ ok: false, reason: 'cooldown' });
    expect(Study.checkSessionAllowance({ count: 1, lastAt: 10_000 }, 11_500).ok).toBe(true);
    expect(Study.checkSessionAllowance({ count: 8, lastAt: 0 }, 20_000)).toMatchObject({ ok: false, reason: 'session-limit' });
  });

  it('records bounded audit metadata without retaining the raw question', () => {
    const project = E.makeProject({ id: 'privacy-test', now: '2026-07-14T12:00:00Z' });
    const updated = E.recordStudyEvent(project, {
      action: 'study-answer',
      outcome: 'validated',
      questionHash: E.hashString('What private question did the learner ask?'),
      evidenceIds: ['ev_1'],
      question: 'What private question did the learner ask?'
    }, '2026-07-14T12:01:00Z');
    expect(updated.audit.at(-1)).toMatchObject({ action: 'study-answer', outcome: 'validated', evidenceIds: ['ev_1'] });
    expect(updated.audit.at(-1)).not.toHaveProperty('question');
    expect(JSON.stringify(updated.audit)).not.toContain('What private question');
  });
});
