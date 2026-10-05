import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from '../../tests/setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const types = ['note-taking', 'anchor-chart', 'memory-aid', 'applied-challenge'];
const factories = {};
let studioApi;

beforeAll(() => {
  globalThis.React = window.React = React;
  // These are the full editable factory and its shipped artifact. No handler
  // replacement, projected submission logic, or adapter stub is used.
  factories.source = new Function('window', 'React', 'structuredClone',
    readFileSync(process.env.ALLO_STUDIO_HOST_HANDLERS_SOURCE || 'host_handlers_source.jsx', 'utf8') + '\nreturn createHostHandlers;'
  )(window, React, structuredClone);
  // Evaluate the chosen bytes directly so the setup helper's module cache
  // cannot silently substitute production for a report-local candidate.
  new Function('window', 'React', 'structuredClone',
    readFileSync(process.env.ALLO_STUDIO_HOST_HANDLERS_MODULE || 'host_handlers_module.js', 'utf8')
  )(window, React, structuredClone);
  factories.runtime = window.AlloModules.HostHandlers;
  loadAlloModule('studio_response_module.js');
  studioApi = window.AlloModules.StudioResponse;
});

afterEach(() => {
  window.AlloModules.StudioResponse = studioApi;
  delete window.__alloQrStudentMode;
});

function fixture(type) {
  const id = 'synthetic-' + type;
  const answer = 'Learner writing for ' + type;
  const teacherOnly = 'PRIVATE_TEACHER_FACT';
  const privateMedia = 'data:image/png;base64,PRIVATE_MEDIA';
  let data, studio;
  if (type === 'note-taking') {
    data = { templateType: 'cornell-notes', notes: [{ id: 'n1', text: '' }], summary: '', sourceExcerpt: teacherOnly };
    studio = { schemaVersion: 1, notes: [{ id: 'n1', text: answer }], sourceExcerpt: teacherOnly, visualImage: privateMedia };
  } else if (type === 'anchor-chart') {
    data = { sections: [{ id: 's1', label: 'A concept', bulletIds: ['b1'], bullets: [teacherOnly] }], sourceExcerpt: teacherOnly };
    studio = { schemaVersion: 1, studentAnswers: { s1: { b1: answer } }, sourceExcerpt: teacherOnly, visualImage: privateMedia };
  } else if (type === 'memory-aid') {
    data = { cards: [{ id: 'c1', target: 'A concept', essentialFacts: [teacherOnly], studentDraft: '', visualImage: privateMedia }] };
    studio = { schemaVersion: 1, cards: [{ id: 'c1', studentDraft: answer, studentReasoning: 'My reasoning', visualImage: privateMedia, practiceAttempts: [{ response: teacherOnly }] }] };
  } else {
    data = { brief: { lockedLessonFacts: [teacherOnly] }, workspace: { response: '' }, sourceExcerpt: teacherOnly };
    studio = { schemaVersion: 1, workspace: { response: answer }, sourceExcerpt: teacherOnly, visualImage: privateMedia };
  }
  return { resource: { id, type, title: 'Synthetic assignment', data }, responses: { [id]: { studio } }, answer };
}

function harness(factory, type, channel) {
  const f = fixture(type);
  const downloaded = [];
  const uploaded = [];
  const download = vi.fn((payload, filename) => downloaded.push({ payload: structuredClone(payload), filename }));
  const upload = vi.fn(async (_url, payload) => {
    uploaded.push(structuredClone(payload));
    return { ok: true, filename: 'synthetic-submission.json' };
  });
  const deps = {
    history: [f.resource], studentResponses: f.responses, studentNickname: 'Synthetic Owl',
    studentProjectSettings: {}, sourceTopic: 'Synthetic assignment', generatedContent: null,
    rosterKey: null, gameCompletions: {}, pasteEvents: [], globalPoints: 0, adventureState: { level: 1 },
    _alloCheckpointRecordsRef: { current: [] }, _alloLedgerRef: { current: null },
    activeSessionCode: null, mbStudent: null,
    mbHostedAssignment: channel === 'mailbox' ? { id: 'synthetic-pack', url: 'https://mailbox.example.invalid/', secret: 'synthetic-secret' } : null,
    alloStableAssignmentId: () => 'synthetic-assignment', generateUUID: () => 'synthetic-submission-id',
    t: key => key, addToast: vi.fn(), warnLog: vi.fn(), setIsSaveActionPulsing: vi.fn(),
    downloadSubmissionBackup: download, _alloMailboxCallWithRetry: upload,
    // The controlled boundary records the actual serialized submission. This
    // lane does not exercise mailbox protocol/chunk retry behavior.
    _alloSplitPackChunks: serialized => [serialized],
  };
  const handlers = factory(deps);
  deps.sanitizeSubmissionData = handlers.sanitizeSubmissionData;
  return {
    ...f, deps, handlers, download, upload, downloaded, uploaded,
    payload() {
      return channel === 'mailbox' ? JSON.parse(uploaded.map(part => part.data).join('')) : downloaded[0].payload;
    },
  };
}

for (const factoryName of ['source', 'runtime']) {
  for (const channel of ['download', 'mailbox']) {
    describe(factoryName + ' studio submission readiness via ' + channel, () => {
      it.each(types)('blocks incomplete %s submission, then preserves writing on adapter-ready retry', async type => {
        const h = harness(factories[factoryName], type, channel);
        const before = JSON.stringify({ history: h.deps.history, responses: h.deps.studentResponses });
        delete window.AlloModules.StudioResponse;
        const blocked = await h.handlers.handleSubmitAssignment('Synthetic Owl', {});
        expect(blocked).toMatchObject({ ok: false, retryable: true });
        expect(h.download).not.toHaveBeenCalled();
        expect(h.upload).not.toHaveBeenCalled();
        expect(h.deps.setIsSaveActionPulsing).not.toHaveBeenCalled();
        expect(JSON.stringify({ history: h.deps.history, responses: h.deps.studentResponses })).toBe(before);

        window.AlloModules.StudioResponse = studioApi;
        const submitted = await h.handlers.handleSubmitAssignment('Synthetic Owl', {});
        expect(submitted).toMatchObject({ ok: true, delivery: channel });
        const payload = h.payload();
        expect(payload.content).toHaveLength(1);
        expect(payload.content[0]).toMatchObject({ id: h.resource.id, type });
        expect(JSON.stringify(payload.content)).toContain(h.answer);
        expect(Object.values(payload.answers)).toContain(h.answer);
        expect(payload.responses).toEqual(payload.answers);
        expect(JSON.stringify(payload)).not.toMatch(/PRIVATE_TEACHER_FACT|PRIVATE_MEDIA|sourceExcerpt|essentialFacts|visualImage|practiceAttempts/);
        expect(JSON.stringify({ history: h.deps.history, responses: h.deps.studentResponses })).toBe(before);
        expect(h.download).toHaveBeenCalledTimes(channel === 'download' ? 1 : 0);
        expect(h.upload).toHaveBeenCalledTimes(channel === 'mailbox' ? 1 : 0);
      });

      it('allows an ordinary quiz submission without the studio adapter', async () => {
        const h = harness(factories[factoryName], 'memory-aid', channel);
        h.deps.history = [{ id: 'synthetic-quiz', type: 'quiz', title: 'Synthetic quiz', data: [{ question: 'Which?', options: ['A', 'B'], correctAnswer: 0 }] }];
        h.deps.studentResponses = { 'synthetic-quiz': { 0: 'A' } };
        delete window.AlloModules.StudioResponse;
        const submitted = await h.handlers.handleSubmitAssignment('Synthetic Owl', {});
        expect(submitted).toMatchObject({ ok: true, delivery: channel });
        const payload = h.payload();
        expect(payload.content).toHaveLength(1);
        expect(payload.content[0].type).toBe('quiz');
        expect(payload.answers).toEqual({ 'synthetic-quiz': { 0: 'A' } });
      });

      it('blocks a truthy partial adapter before any submission delivery', async () => {
        const h = harness(factories[factoryName], 'applied-challenge', channel);
        const before = JSON.stringify({ history: h.deps.history, responses: h.deps.studentResponses });
        window.AlloModules.StudioResponse = { supports: studioApi.supports, toSubmission: studioApi.toSubmission };
        const blocked = await h.handlers.handleSubmitAssignment('Synthetic Owl', {});
        expect(blocked).toMatchObject({ ok: false, retryable: true });
        expect(h.download).not.toHaveBeenCalled();
        expect(h.upload).not.toHaveBeenCalled();
        expect(h.deps.setIsSaveActionPulsing).not.toHaveBeenCalled();
        expect(JSON.stringify({ history: h.deps.history, responses: h.deps.studentResponses })).toBe(before);
      });
    });
  }
}
