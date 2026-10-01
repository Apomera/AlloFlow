// Student submissions carry learner work, not copies of teacher pictures, and
// studio writing (Memory Aid, Applied Challenge, Notes, Anchor Charts) reaches
// the Work Story and the checkpoint check-in. FIX0927_HH_MOD points the test
// at a saved pre-fix host_handlers_module.js for mutation checks.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let create;
beforeAll(() => {
  window.React = window.React || {};
  window.AlloModules = window.AlloModules || {};
  if (!window.AlloModules.StudioResponse) new Function(readFileSync('studio_response_module.js', 'utf8'))();
  const saved = window.AlloModules.HostHandlers;
  delete window.AlloModules.HostHandlers;
  new Function(readFileSync(process.env.FIX0927_HH_MOD || 'host_handlers_module.js', 'utf8'))();
  create = window.AlloModules.HostHandlers;
  if (saved) window.AlloModules.HostHandlers = saved;
});
const handlers = (scope) => create(new Proxy(scope, { get: (target, key) => (key in target ? target[key] : (key === 'warnLog' ? () => {} : undefined)) }));
const png = (kb, tag) => 'data:image/png;base64,' + (tag + 'A'.repeat(kb * 1024)).slice(0, kb * 1024);

describe('submission content drops teacher pictures but keeps learner work', () => {
  it('strips inline pictures from teacher resources wherever they sit', () => {
    const image = { id: 'img', type: 'image', title: 'Panels', data: { imageUrl: png(300, 'a'), originalImage: { imageUrl: png(300, 'b') }, visualPlan: { panels: [{ imageUrl: png(300, 'c'), caption: 'Rain falls' }, { imageUrl: png(600, 'g'), frames: [png(200, 'f1'), png(200, 'f2')] }] } } };
    const outline = { id: 'org', type: 'outline', title: 'Space', data: { main: 'Water', conceptArt: { n1: { type: 'image', dataUrl: png(250, 'art') } }, constellation: { 'n0|n1': { w: 0.8, why: 'Rain feeds rivers' } } } };
    const adventure = { id: 'adv', type: 'adventure', title: 'Quest', data: { snapshot: { sceneImage: png(300, 's'), history: [{ text: 'I opened the door', image: png(300, 'h') }] } } };
    const [a, b, c] = handlers({}).sanitizeSubmissionData([image, outline, adventure]);
    const size = JSON.stringify([a, b, c]).length;
    expect(size).toBeLessThan(5000);
    expect(JSON.stringify([a, b, c])).not.toContain('data:image');
    expect(a.data.visualPlan.panels[0].caption).toBe('Rain falls');
    expect(b.data.constellation['n0|n1'].why).toBe('Rain feeds rivers');
    expect(c.data.snapshot.history[0].text).toBe('I opened the door');
    expect(image.data.originalImage.imageUrl.startsWith('data:image')).toBe(true);
  });
  it('leaves learner-owned records and audio untouched', () => {
    const audio = 'data:audio/webm;base64,' + 'B'.repeat(4000);
    const fluency = { id: 'flu', type: 'fluency-record', title: 'Reading', data: { audioRecording: audio } };
    const story = { id: 'sf', type: 'storyforge-submission', title: 'My story', data: { pages: [{ text: 'Once', illustration: png(20, 'mine') }] } };
    const quiz = { id: 'qz', type: 'quiz', title: 'Quiz', data: { questions: [{ question: 'Say it', oralAnswer: audio }] } };
    const [f, s, q] = handlers({}).sanitizeSubmissionData([fluency, story, quiz]);
    expect(f.data.audioRecording).toBe(audio);
    expect(s.data.pages[0].illustration).toBe(png(20, 'mine'));
    expect(q.data.questions[0].oralAnswer).toBe(audio);
  });
});

describe('studio writing reaches the Work Story and checkpoints', () => {
  const draft = 'A cell is the smallest unit of life that can live on its own.';
  const aid = { id: 'aid1', type: 'memory-aid', title: 'Cells', data: { cards: [{ id: 'c1', term: 'Cell', definition: 'Unit of life' }] } };
  const studio = { schemaVersion: 1, cards: [{ id: 'c1', studentDraft: draft, studentConnections: [], studentReasoning: '' }] };
  it('records the written length, not the object name', () => {
    const noteEdit = vi.fn(), append = vi.fn();
    const scope = { history: [aid], _alloEnsureLedger: () => ({ noteEdit, append }), _alloLastLenRef: { current: {} } };
    handlers(scope)._alloNoteStudentText('aid1', 'studio', studio);
    const lengths = [...noteEdit.mock.calls.map((call) => call[2]), ...append.mock.calls.map((call) => call[1].chars)];
    expect(lengths).toContain(draft.length);
    expect(lengths).not.toContain('[object Object]'.length);
    noteEdit.mockClear(); append.mockClear();
    handlers(scope)._alloNoteStudentText('aid1', 'studio', { ...studio, cards: [{ ...studio.cards[0], studentDraft: '' }] });
    expect(noteEdit.mock.calls.some((call) => call[1] === -draft.length && call[2] === 0)).toBe(true);
  });
  it('builds checkpoints from studio writing', () => {
    const scope = { history: [aid], studentResponses: { aid1: { studio } }, generatedContent: null };
    const { text } = handlers(scope)._alloCheckpointArtifact();
    expect(text).toContain(draft);
  });
});
