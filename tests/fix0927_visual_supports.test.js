// Lesson Images / Visual Supports fixes (2026-09-27 review of the 24 core resources).
// I1: an uploaded panel replacement is not described by the original picture's text.
// I2: a student cannot change or wipe the teacher's annotations; opening writes nothing.
// I3: Regenerate clears position-keyed panel work (after confirming), plans in the
//     resource's language, commits id-bound, and drops an AI description of the old picture.
// I4: per-panel "Describe from the image" never overwrites author text and reports failure.
// I5: students do not see teacher copy or the Regenerate control.
// Mutation runs point the *_CANDIDATE env vars at pre-fix builds kept in a scratch dir.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const load = (file, env) => new Function(readFileSync(process.env[env] || resolve(process.cwd(), file), 'utf8') + '\n//# sourceURL=' + file)();
let React, createRoot, act, root, host, A;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null, has: () => true });
  if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  window.warnLog = window.warnLog || (() => {});
  load('alt_text_module.js', 'FIX0927_VS_ALT');
  load('visual_panel_module.js', 'FIX0927_VS_PANEL');
  load('view_image_module.js', 'FIX0927_VS_IMAGE');
  load('host_handlers_module.js', 'FIX0927_VS_HOST');
  A = window.AlloModules.AltText;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; vi.restoreAllMocks(); delete window.callGeminiVision; });

const ORIGINAL = 'data:image/png;base64,T1JJR0lOQUw=';
const UPLOADED = 'data:image/png;base64,VVBMT0FERUQ=';
const ARROW = { type: 'arrow', color: '#ef4444', start: { x: 10, y: 10 }, end: { x: 50, y: 50 } };
const plan = () => ({ title: 'Volcano', panels: [
  { imageUrl: ORIGINAL, caption: 'Magma rises', alt: 'A red volcano erupting lava', altSource: 'vision', altHash: A.hashImage(ORIGINAL), labels: [] },
  { imageUrl: ORIGINAL + 'x', caption: 'Ash cloud', alt: 'Grey ash cloud', altSource: 'vision', altHash: A.hashImage(ORIGINAL + 'x'), labels: [] } ] });
const mount = (element) => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); act(() => root.render(element)); };
const grid = (props) => React.createElement(window.AlloModules.VisualPanelGrid, { visualPlan: plan(), t: () => '', language: 'English', onUpdatePanel: () => {}, onUpdateLabel: () => {}, ...props });
const button = (text) => [...host.querySelectorAll('button')].find(b => b.textContent.includes(text));

describe('I2: learner annotations never edit the teacher annotations', () => {
  it('opening the visual writes nothing, and a student Clear removes only their own marks', () => {
    const calls = [];
    mount(grid({ isTeacherMode: false, initialAnnotations: { drawings: {} }, readOnlyDrawings: { 0: [ARROW] }, onAnnotationsChange: a => calls.push(a) }));
    expect(calls.length).toBe(0);
    act(() => button('Clear').click());
    expect(calls.length).toBe(0); // nothing of the learner's to clear, so nothing changed
    expect(host.querySelectorAll('svg.drawing-overlay line').length).toBe(1); // the teacher's arrow is still drawn
  });

  it('ImageView sends a student change to the learner store, never to the resource', () => {
    const onUpdateResource = vi.fn(() => true), onLearnerAnnotationsChange = vi.fn();
    const resource = { id: 'img-1', type: 'image', data: { prompt: 'Volcano', imageUrl: ORIGINAL, visualPlan: plan(), annotations: { drawings: { 0: [ARROW] }, userLabels: { 0: [{ id: 't1', text: 'Crater', x: 5, y: 5 }] } } } };
    mount(React.createElement(window.AlloModules.ImageView, {
      t: () => '', generatedContent: resource, isTeacherMode: false, leveledTextLanguage: 'English', singleImageFileRef: React.createRef(),
      imageRefinementInput: '', addToast: () => {}, onUpdateResource, onLearnerAnnotationsChange, VisualPanelGrid: window.AlloModules.VisualPanelGrid,
      handleUpdateVisualPanel: () => {}, learnerAnnotations: { drawings: { 1: [ARROW] } },
    }));
    expect(onUpdateResource).not.toHaveBeenCalled();
    act(() => button('Clear').click());
    expect(onUpdateResource).not.toHaveBeenCalled();
    expect(onLearnerAnnotationsChange).toHaveBeenCalledTimes(1);
    expect(onLearnerAnnotationsChange.mock.calls[0]).toEqual(['img-1', { drawings: {}, userLabels: {} }]);
    expect(host.querySelectorAll('svg.drawing-overlay line').length).toBe(1); // teacher arrow survives the learner's Clear
  });
});

describe('I1: an uploaded replacement is not described by the original picture', () => {
  it('shows the replacement without the original description and flags the description stale', () => {
    mount(grid({ isTeacherMode: true, initialAnnotations: { imageOverrides: { 0: UPLOADED } }, onAnnotationsChange: () => {} }));
    const shown = [...host.querySelectorAll('img')].find(img => img.getAttribute('src') === UPLOADED);
    expect(shown).toBeTruthy();
    expect(shown.getAttribute('alt')).not.toBe('A red volcano erupting lava');
    expect(shown.getAttribute('alt')).toBe('Magma rises');
    expect(host.querySelector('#panel-alt-0').closest('[data-alt-source]').getAttribute('data-alt-source')).toBe('stale');
    expect(host.querySelector('#panel-alt-1').closest('[data-alt-source]').getAttribute('data-alt-source')).not.toBe('stale');
  });
});

describe('I4: per-panel Describe from the image keeps author text and reports failure', () => {
  it('a draft that returns after the author edited the text is offered only with an ownership check', async () => {
    let finish;
    vi.spyOn(A, 'draftAlts').mockImplementation(() => new Promise(r => { finish = r; }));
    window.callGeminiVision = () => {};
    const onUpdatePanel = vi.fn();
    mount(grid({ isTeacherMode: true, initialAnnotations: {}, onAnnotationsChange: () => {}, onUpdatePanel }));
    act(() => host.querySelector('#panel-alt-0').closest('[data-alt-source]').querySelector('button[aria-busy]').click());
    await act(async () => { finish([{ alt: 'AI draft', source: 'vision', decorative: false }]); });
    expect(onUpdatePanel).toHaveBeenCalledTimes(1);
    const [idx, patch, guard] = onUpdatePanel.mock.calls[0];
    expect(idx).toBe(0);
    expect(patch.alt).toBe('AI draft');
    expect(typeof guard?.accept).toBe('function');
    const panel = plan().panels[0];
    expect(guard.accept(panel)).toBe(true);
    expect(guard.accept({ ...panel, alt: 'Typed by the teacher', altSource: 'author' })).toBe(false);
    expect(guard.accept({ ...panel, decorative: true })).toBe(false);
  });

  it('a failed draft shows an alert instead of an unhandled error', async () => {
    vi.spyOn(A, 'draftAlts').mockImplementation(() => Promise.reject(new Error('offline')));
    window.callGeminiVision = () => {};
    mount(grid({ isTeacherMode: true, initialAnnotations: {}, onAnnotationsChange: () => {}, t: k => (k === 'a11y.alt.regenerate_failed' ? 'No se pudo describir.' : '') }));
    await act(async () => { host.querySelector('#panel-alt-1').closest('[data-alt-source]').querySelector('button[aria-busy]').click(); });
    const alert = host.querySelector('[role="alert"]');
    expect(alert && alert.textContent).toBe('No se pudo describir.');
  });
});

describe('I3: Regenerate', () => {
  function hostFor(resource, extra = {}) {
    const state = { dialog: null, commits: [], toasts: [], set: null };
    const deps = new Proxy({
      generatedContent: resource, isTeacherMode: true, useLowQualityVisuals: true, studentLanguage: 'English', gradeLevel: '5th Grade',
      setSingleImageOverride() {}, setIsProcessing() {}, setGenerationStep() {}, setError() {}, warnLog() {}, t: () => undefined,
      addToast: (m, kind) => state.toasts.push(kind), setConfirmDialog: d => { state.dialog = d; },
      generateVisualPlan: vi.fn(async () => ({ panels: [{}, {}] })),
      executeVisualPlan: vi.fn(async () => ({ title: 'New', panels: [{ imageUrl: 'data:image/png;base64,TkVXMQ==' }, { imageUrl: 'data:image/png;base64,TkVXMg==' }] })),
      callImagen: vi.fn(async () => 'data:image/png;base64,TkVXX0FJ'),
      onUpdateResource: (id, updater) => { const next = updater(extra.latest || resource); state.commits.push({ id, next }); return next !== (extra.latest || resource); },
      setGeneratedContent: v => { state.set = v; }, setHistory() {}, ...extra.deps,
    }, { get: (o, k) => (k in o ? o[k] : undefined) });
    return { H: window.AlloModules.createHostHandlers(deps), state, deps };
  }
  const multi = () => ({ id: 'img-1', type: 'image', config: { language: 'Spanish', grade: '3rd Grade' }, data: { prompt: 'Volcán', imageUrl: ORIGINAL, visualPlan: plan(),
    annotations: { drawings: { 0: [ARROW] }, captionOverrides: { 1: 'Nube' }, challengeActive: true, challengeType: 'scratch' } } });

  it('asks before removing panel work, plans in the resource language, and clears the old panel annotations', async () => {
    const resource = multi();
    const { H, state, deps } = hostFor(resource);
    await H.handleRestoreImage();
    expect(deps.generateVisualPlan).not.toHaveBeenCalled();
    expect(typeof state.dialog?.onConfirm).toBe('function');
    await state.dialog.onConfirm();
    await vi.waitFor(() => expect(state.commits.length).toBe(1));
    expect(deps.generateVisualPlan).toHaveBeenCalledWith('Volcán', '3rd Grade', 'Spanish');
    const { id, next } = state.commits[0];
    expect(id).toBe('img-1');
    expect(next.data.visualPlan.title).toBe('New');
    expect(next.data.annotations).toEqual({ challengeActive: true, challengeType: 'scratch' });
    expect(state.set).toBe(null);
  });

  it('does not apply new pictures over a visual that changed meanwhile', async () => {
    const resource = { id: 'img-2', type: 'image', data: { prompt: 'Volcano', imageUrl: ORIGINAL, altText: 'Old', altSource: 'vision' } };
    const latest = { ...resource, data: { ...resource.data, imageUrl: UPLOADED } };
    const { H, state } = hostFor(resource, { latest });
    await H.handleRestoreImage();
    expect(state.commits[0].next).toBe(latest);
    expect(state.toasts).toContain('warning');
  });

  it('drops an AI description of the old picture but keeps an author description', async () => {
    const ai = { id: 'img-3', type: 'image', data: { prompt: 'Volcano', imageUrl: ORIGINAL, altText: 'Old AI words', altSource: 'vision', altHash: 'h' } };
    const r1 = hostFor(ai); await r1.H.handleRestoreImage();
    expect(r1.state.commits[0].next.data).toMatchObject({ imageUrl: 'data:image/png;base64,TkVXX0FJ', altText: '', altSource: '' });
    const author = { id: 'img-4', type: 'image', data: { prompt: 'Volcano', imageUrl: ORIGINAL, altText: 'Teacher words', altSource: 'author', altHash: 'h' } };
    const r2 = hostFor(author); await r2.H.handleRestoreImage();
    expect(r2.state.commits[0].next.data).toMatchObject({ altText: 'Teacher words', altSource: 'author' });
  });

  it('does nothing for a student', async () => {
    const resource = { id: 'img-5', type: 'image', data: { prompt: 'Volcano', imageUrl: ORIGINAL } };
    const { H, state, deps } = hostFor(resource, { deps: { isTeacherMode: false } });
    await H.handleRestoreImage();
    expect(deps.callImagen).not.toHaveBeenCalled();
    expect(state.commits.length + (state.set ? 1 : 0)).toBe(0);
  });
});

describe('I6: failed panels and the Visual Supports modal', () => {
  it('a panel whose picture failed says so and offers the teacher a retry instead of an endless spinner', () => {
    const onRetryFailed = vi.fn();
    const failedPlan = { title: 'Volcano', panels: [{ caption: 'Magma rises', labels: [], failed: true }, { caption: 'Ash', labels: [], failed: true }] };
    mount(grid({ visualPlan: failedPlan, isTeacherMode: true, initialAnnotations: {}, onAnnotationsChange: () => {}, onRetryFailed }));
    expect(host.querySelectorAll('[data-panel-failed="true"]').length).toBe(2);
    expect(host.querySelector('.animate-spin')).toBe(null);
    act(() => button('Make the pictures again').click());
    expect(onRetryFailed).toHaveBeenCalledTimes(1);
  });

  it('generation and Regenerate mark a panel with no picture as failed', () => {
    const dispatcher = readFileSync(process.env.FIX0927_VS_DISPATCHER_SRC || resolve(process.cwd(), 'generate_dispatcher_source.jsx'), 'utf8');
    expect(dispatcher).toMatch(/\(executedPlan\?\.panels \|\| \[\]\)\.forEach\(p => \{ if \(p && !p\.imageUrl\) p\.failed = true; \}\);/);
  });

  it('the modal shows the host translation', () => {
    load('view_visual_supports_modal_module.js', 'FIX0927_VS_MODAL');
    const Modal = window.AlloModules.VisualSupportsModal.VisualSupportsModal;
    const T = { 'visuals.supports_modal.title': 'Apoyos visuales', 'visuals.supports_modal.no_boards': 'Aún no hay tableros' };
    mount(React.createElement(Modal, { t: k => T[k], vsTab: 'boards', setVsTab: () => {}, showVisualSupports: true, setShowVisualSupports: () => {} }));
    expect(host.querySelector('#visual-supports-title').textContent).toContain('Apoyos visuales');
    expect(host.textContent).toContain('Aún no hay tableros');
    expect(host.textContent).toContain('Pause animations'); // untranslated keys keep the English text
  });
});

describe('I5: students do not see teacher copy', () => {
  const view = (resource, teacher) => mount(React.createElement(window.AlloModules.ImageView, {
    t: k => k, generatedContent: resource, isTeacherMode: teacher, leveledTextLanguage: 'English', fillInTheBlank: true, singleImageFileRef: React.createRef(),
    imageRefinementInput: '', addToast: () => {}, onUpdateResource: () => true, handleRestoreImage: () => {}, VisualPanelGrid: () => null,
  }));
  it('hides the UDL goal banner and the generation prompt from a student', () => {
    const resource = { id: 'img-6', type: 'image', data: { prompt: 'SECRET PROMPT TEXT', imageUrl: ORIGINAL, altText: 'x' } };
    view(resource, false);
    expect(host.textContent).not.toContain('UDL Goal');
    expect(host.textContent).not.toContain('Worksheet Mode');
    expect(host.textContent).not.toContain('SECRET PROMPT TEXT');
  });
  it('offers Regenerate for a stripped picture only to the teacher', () => {
    const stripped = { id: 'img-7', type: 'image', data: { prompt: 'Volcano' } };
    view(stripped, false);
    expect(host.querySelector('[data-help-key="visuals_regenerate"]')).toBe(null);
    act(() => root.unmount()); root = null; host.remove(); host = null;
    view(stripped, true);
    expect(host.querySelectorAll('[data-help-key="visuals_regenerate"]').length).toBeGreaterThan(0);
  });
});
