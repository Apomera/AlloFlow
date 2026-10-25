import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadAlloModule } from './setup.js';
import { createDaWorkspaceFixture } from './helpers/dynamic_assessment_workspace_fixture.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, DynamicAssessment, sharedApi;
const mounted = [];

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('dynamic_assessment_module.js');
  sharedApi = window.AlloModules.IdentifierRedaction;
  DynamicAssessment = window.AlloModules.DynamicAssessment;
});
beforeEach(() => {
  window.AlloModules.SensitiveWorkspace = createDaWorkspaceFixture(React).api;
});

afterEach(async () => {
  await act(async () => {
    mounted.splice(0).forEach(({ root, container }) => { root.unmount(); container.remove(); });
    await Promise.resolve();
  });
  window.AlloModules.IdentifierRedaction = sharedApi;
  vi.restoreAllMocks();
});

async function mountAdapter(overrides = {}, actualReview = false) {
  let assessment, review;
  function CaptureAssessment(props) { assessment = props; return null; }
  function CaptureReview(props) { review = props; return React.createElement('div', { 'data-review': props.review.id }); }
  window.AlloModules.IdentifierRedaction = actualReview ? sharedApi : { ...sharedApi, SensitivePromptReview: CaptureReview };
  let host = {
    studentNickname: 'Ada Learner', history: [], addToast: vi.fn(),
    callGemini: vi.fn(async () => ({ kind: 'assessment', items: [1, 2], complete: true })),
    callImagen: vi.fn(async () => 'data:image/png;base64,cGljdHVyZQ=='),
    callGeminiImageEdit: vi.fn(async () => 'data:image/png;base64,ZWRpdGVk'),
    handleGenerate: vi.fn(async () => ({ id: 'support-1' })),
    setHistory: vi.fn(), setGeneratedContent: vi.fn(), setIsGeneratingTermImage: vi.fn(),
    setIsDynamicAssessmentOpen: vi.fn(), handleRestoreView: vi.fn(),
    t: key => key, ...overrides
  };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  async function render() {
    await act(async () => {
      root.render(React.createElement(DynamicAssessment.HostAdapter, { React, DynamicAssessment: CaptureAssessment, host }));
      await Promise.resolve();
    });
  }
  await render();
  return {
    get host() { return host; }, get assessment() { return assessment; },
    get review() { return container.querySelector('[data-review]') ? review : null; },
    async rerender(next) { host = { ...host, ...next }; await render(); },
    async unmount() {
      await act(async () => { root.unmount(); await Promise.resolve(); });
      const index = mounted.findIndex(value => value.root === root);
      if (index >= 0) mounted.splice(index, 1);
      container.remove();
    }
  };
}

async function start(fn) {
  let pending;
  await act(async () => {
    pending = fn();
    pending.catch(() => {});
    await Promise.resolve();
  });
  return { pending };
}

async function accept(harness, edits = {}) {
  let result;
  await act(async () => {
    const props = harness.review;
    result = props.onAccept(props.review.id, { prompt: props.review.prompt, searchQuery: props.review.searchQuery, ...edits });
    await Promise.resolve();
  });
  return result;
}

describe('Dynamic Assessment sensitive outbound review', () => {
  it('sends nothing until approval and preserves flags, abort, search options and ordinary response schema', async () => {
    const h = await mountAdapter();
    const controller = new AbortController();
    const telemetry = { purpose: 'assessment' };
    const searchOptions = { limit: 4 };
    const original = 'Ada Learner needed L2 cues on 4 of 6 items; contact parent@example.com.';
    const originalQuery = 'Ada Learner learning supports';
    const { pending } = await start(() => h.assessment.callGemini(original, true, true, 0.2, originalQuery, controller.signal, false, telemetry, searchOptions));
    expect(h.host.callGemini).not.toHaveBeenCalled();
    expect(h.review.review.prompt).toContain('L2 cues on 4 of 6 items');
    expect(h.review.review.prompt).not.toContain('Ada Learner');
    expect(h.review.review.prompt).not.toContain('parent@example.com');
    expect(h.review.review.searchQuery).not.toContain('Ada Learner');
    const approvedPrompt = h.review.review.prompt;
    const approvedQuery = h.review.review.searchQuery;
    expect(await accept(h)).toEqual({ sent: true, changed: false });
    await expect(pending).resolves.toEqual({ kind: 'assessment', items: [1, 2], complete: true });
    expect(h.host.callGemini).toHaveBeenCalledExactlyOnceWith(approvedPrompt, true, true, 0.2, approvedQuery, controller.signal, false, telemetry, searchOptions);
    expect(original).toContain('Ada Learner');
    expect(originalQuery).toBe('Ada Learner learning supports');
  });

  it('cancels a request without sending, and does not grant approval to later requests', async () => {
    const h = await mountAdapter();
    const first = await start(() => h.assessment.callGemini('Create a reading probe.'));
    await act(async () => { h.review.onCancel(h.review.review.id); await Promise.resolve(); });
    await expect(first.pending).rejects.toMatchObject({ name: 'AbortError', code: 'ALLOFLOW_AI_REVIEW_CANCELLED' });
    expect(h.host.callGemini).not.toHaveBeenCalled();
    const second = await start(() => h.assessment.callGemini('Create a different reading probe.'));
    expect(h.review).toBeTruthy();
    expect(h.host.callGemini).not.toHaveBeenCalled();
    await accept(h);
    await second.pending;
    expect(h.host.callGemini).toHaveBeenCalledTimes(1);
  });

  it('preserves an explicit null search query and ignores unrelated fresh host closures', async () => {
    const h = await mountAdapter();
    const controller = new AbortController();
    const { pending } = await start(() => h.assessment.callGemini('Create a learning probe.', false, false, null, null, controller.signal));
    await h.rerender({ handleGenerate: vi.fn(async () => ({ id: 'another-support' })) });
    expect(h.review).toBeTruthy();
    await accept(h);
    await pending;
    expect(h.host.callGemini).toHaveBeenCalledExactlyOnceWith('Create a learning probe.', false, false, null, null, controller.signal);
  });

  it('keeps clicks inside the actual review overlay from closing the assessment', async () => {
    const h = await mountAdapter({}, true);
    const { pending } = await start(() => h.assessment.callGemini('Create a learning probe.'));
    const textarea = document.querySelector('textarea[aria-label="Outgoing text to review"]') || document.querySelector('textarea');
    expect(textarea).toBeTruthy();
    await act(async () => { textarea.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(h.host.setIsDynamicAssessmentOpen).not.toHaveBeenCalled();
    const cancelButton = Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Cancel');
    expect(cancelButton).toBeTruthy();
    await act(async () => { cancelButton.click(); await Promise.resolve(); });
    await expect(pending).rejects.toMatchObject({ code: 'ALLOFLOW_AI_REVIEW_CANCELLED' });
    expect(h.host.setIsDynamicAssessmentOpen).not.toHaveBeenCalled();
    expect(h.host.callGemini).not.toHaveBeenCalled();
  });

  it('blocks every provider when the shared review helper or review component is unavailable', async () => {
    const h = await mountAdapter();
    window.AlloModules.IdentifierRedaction = undefined;
    await expect(h.assessment.callGemini('Private observation')).rejects.toThrow('review is unavailable');
    expect(() => h.assessment.onGenerateSentenceFrames('Create sentence frames for this observation.')).toThrow('protected resource route');
    window.AlloModules.IdentifierRedaction = { ...sharedApi, SensitivePromptReview: undefined };
    await expect(h.assessment.callGemini('Private observation')).rejects.toThrow('review is unavailable');
    expect(h.host.callGemini).not.toHaveBeenCalled();
    expect(h.host.handleGenerate).not.toHaveBeenCalled();
    expect(h.host.callImagen).not.toHaveBeenCalled();
  });

  it('invalidates pending approval on an internal case change, host learner change, provider revocation and unmount', async () => {
    const h = await mountAdapter();
    const first = await start(() => h.assessment.callGemini('Review this case.'));
    await act(async () => { h.assessment.onSensitiveContextChange('case-2', 'Other Learner'); await Promise.resolve(); });
    await expect(first.pending).rejects.toMatchObject({ code: 'ALLOFLOW_AI_REVIEW_CANCELLED' });
    const second = await start(() => h.assessment.callGemini('Review the new case.'));
    await h.rerender({ studentNickname: 'Other Learner' });
    await expect(second.pending).rejects.toMatchObject({ code: 'ALLOFLOW_AI_REVIEW_CANCELLED' });
    const provider = h.host.callGemini;
    const third = await start(() => h.assessment.callGemini('Draft a learning activity.'));
    await h.rerender({ callGemini: null });
    await expect(third.pending).rejects.toMatchObject({ code: 'ALLOFLOW_AI_REVIEW_CANCELLED' });
    expect(h.review).toBeNull();
    expect(provider).not.toHaveBeenCalled();
    await h.rerender({ callGemini: provider });
    const fourth = await start(() => h.assessment.callGemini('Draft another activity.'));
    await h.unmount();
    await expect(fourth.pending).rejects.toMatchObject({ code: 'ALLOFLOW_AI_REVIEW_CANCELLED' });
    expect(provider).not.toHaveBeenCalled();
  });

  it('honors an abort while the educator is reviewing', async () => {
    const h = await mountAdapter();
    const controller = new AbortController();
    const { pending } = await start(() => h.assessment.callGemini('Review an observation.', true, false, null, null, controller.signal));
    await act(async () => { controller.abort(); await Promise.resolve(); });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.host.callGemini).not.toHaveBeenCalled();
  });

  it('blocks supplementary publishing before the unprotected dispatcher receives clinical instructions', async () => {
    const h = await mountAdapter();
    const original = 'Help Ada Learner organize a paragraph using three sentence starters.';
    const sourceCase = { id: 'case-1', note: original };
    const before = JSON.stringify(sourceCase);
    expect(() => h.assessment.onGenerateVisualOrganizer('outline', sourceCase.note, 'Support')).toThrow('protected resource route');
    expect(h.host.handleGenerate).not.toHaveBeenCalled();
    expect(h.review).toBeNull();
    expect(h.host.setHistory).not.toHaveBeenCalled();
    expect(JSON.stringify(sourceCase)).toBe(before);
  });

  it('blocks the legacy glossary/image publishing chain before any AI or parent-history call', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const h = await mountAdapter({ callGemini: vi.fn(async () => '[{"term":"river","def":"Flowing water","tier":"Academic"}]') });
    expect(() => h.assessment.onGenerateGlossary(['river'], 'River words')).toThrow('protected resource route');
    expect(h.host.callGemini).not.toHaveBeenCalled();
    expect(h.host.callImagen).not.toHaveBeenCalled();
    expect(h.host.callGeminiImageEdit).not.toHaveBeenCalled();
    expect(h.host.setHistory).not.toHaveBeenCalled();
    expect(h.review).toBeNull();
  });

  it('routes all four manual supplemental pickers through the reviewed prop instead of an ambient provider', async () => {
    const h = await mountAdapter();
    const source = readFileSync('dynamic_assessment_module.js', 'utf8').replace(/\r\n/g, '\n');
    const ambient = vi.fn();
    const item = { prompt: 'Ada Learner needs a three-part learning support.', correctAnswer: '4' };
    for (const name of ['addManualManipulativeToItem', 'addManualWordSoundsProbeToItem', 'addManualVisualOrganizerToItem', 'addManualSentenceFramesToItem']) {
      const implementation = source.match(new RegExp('function ' + name + '\\(idx\\) \\{[\\s\\S]*?\\n    \\}'))?.[0];
      expect(implementation).toBeTruthy();
      const picker = new Function('props', 'generatedItems', 'addToast', 'editGeneratedItem', 'callGeminiFn', 'return (' + implementation + ');')(
        h.assessment, [item], vi.fn(), vi.fn(), ambient
      );
      await act(async () => { picker(0); await Promise.resolve(); await Promise.resolve(); });
      expect(h.review).toBeTruthy();
      expect(h.review.review.prompt).not.toContain('Ada Learner');
      expect(ambient).not.toHaveBeenCalled();
      expect(h.host.callGemini).not.toHaveBeenCalled();
      await act(async () => { h.review.onCancel(h.review.review.id); await Promise.resolve(); await Promise.resolve(); });
    }
  });

  it('keeps the public module mirror identical and installs a standalone boundary as well as the adapter boundary', () => {
    const source = readFileSync('dynamic_assessment_module.js', 'utf8');
    const digest = value => createHash('sha256').update(value).digest('hex');
    expect(digest(readFileSync('desktop/web-app/public/dynamic_assessment_module.js'))).toBe(digest(source));
    expect(source).toContain('!DA_REVIEWED_PROVIDERS.has(props.callGemini), workspace');
    expect(source).toContain('ProtectedDynamicAssessment.HostAdapter = daProtectedComponent(DynamicAssessmentHostAdapter)');
    expect(source).toContain('onSensitiveContextChange: aiReview.updateContext');
  });

  it('keeps local assessment usable and hook order stable when the review helper is absent', async () => {
    window.AlloModules.IdentifierRedaction = undefined;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    mounted.push({ root, container });
    const provider = vi.fn();
    await act(async () => {
      root.render(React.createElement(DynamicAssessment, { React, studentNickname: 'First Learner', callGemini: provider }));
      await Promise.resolve();
    });
    expect(container.querySelector('[aria-label="Dynamic Assessment Studio"]')).toBeTruthy();
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
    await act(async () => {
      root.render(React.createElement(DynamicAssessment, { React, studentNickname: 'Second Learner', callGemini: provider }));
      await Promise.resolve();
    });
    expect(container.querySelector('[aria-label="Dynamic Assessment Studio"]')).toBeTruthy();
    expect(provider).not.toHaveBeenCalled();
  });
});
