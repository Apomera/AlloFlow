import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const start = host.indexOf('  const selectBuilderResources =');
const end = host.indexOf('  // ── Builder crop-chrome sweeper', start);
if (start < 0 || end < 0) throw new Error('Builder handoff boundary missing');
const handoff = host.slice(start, end);

function harness(initialHistory) {
  const callbacks = Object.fromEntries(['requestExportPreviewModules', 'ensureExportLibraries', 'setExportPreviewSource', 'setBuilderWorkspaceMode', 'setExportPreviewMode', 'setShowExportPreview', 'setShowExportMenu', 'addToast'].map(name => [name, vi.fn()]));
  const api = new Function('callbacks', 'initialHistory', `
    const { requestExportPreviewModules, ensureExportLibraries, setExportPreviewSource, setBuilderWorkspaceMode, setExportPreviewMode, setShowExportPreview, setShowExportMenu, addToast } = callbacks;
    let history = initialHistory, builderResourceIds = null;
    const setBuilderResourceIds = ids => { builderResourceIds = ids; };
    const t = () => '';
    const _builderOpenerElRef = {}, _builderDraftRestoreRef = {}, _builderReviewSessionRef = {};
    const getExportableHistory = items => items.filter(item => item.type !== 'persona');
    const getSkippedResources = items => items.filter(item => item.type === 'persona').map(item => item.title);
    ${handoff}
    return { selectBuilderResources, openExportPreview, getBuilderHistory, getBuilderExportableHistory, getBuilderSkippedResources,
      updateHistory: value => { history = value; }, scope: () => builderResourceIds };
  `)(callbacks, initialHistory);
  return { ...api, callbacks };
}
const current = { id: 'current', type: 'simplified', title: 'Current reading', data: 'CURRENT_LESSON_TEXT' };
const old = { id: 'old', type: 'simplified', title: 'Older reading', data: 'OTHER_LESSON_TEXT' };

beforeAll(() => loadAlloModule('export_handlers_module.js'));
beforeEach(() => { delete window.__alloBuilderEditedPack; });

describe('Guided lesson to Document Builder handoff', () => {
  it('selects only the current lesson without changing History', () => {
    const history = [old, current];
    const h = harness(history);
    h.openExportPreview('print', [current.id]);
    expect(h.getBuilderHistory()).toEqual([current]);
    expect(h.scope()).toEqual([current.id]);
    expect(history).toEqual([old, current]);
    expect(h.callbacks.setShowExportPreview).toHaveBeenCalledWith(true);
  });

  it.each([[], ['missing'], ['current', 'missing'], [null], 'current'])('does not open or fall back to all History for invalid selection %j', ids => {
    const h = harness([old, current]);
    expect(h.openExportPreview('print', ids)).toBe(false);
    expect(h.callbacks.setShowExportPreview).not.toHaveBeenCalled();
    expect(h.callbacks.addToast).toHaveBeenCalled();
  });

  it('deduplicates IDs and keeps the original resource order', () => {
    const h = harness([old, current]);
    h.openExportPreview('print', ['current', 'old', 'current']);
    expect(h.getBuilderHistory()).toEqual([old, current]);
    expect(h.scope()).toEqual(['current', 'old']);
  });

  it('keeps resources with special export routes in the skipped list for this lesson only', () => {
    const excluded = { id: 'chat', type: 'persona', title: 'Current interview' };
    const h = harness([old, current, excluded, { id: 'old-chat', type: 'persona', title: 'Old interview' }]);
    h.openExportPreview('print', ['current', 'chat']);
    expect(h.getBuilderExportableHistory()).toEqual([current]);
    expect(h.getBuilderSkippedResources()).toEqual(['Current interview']);
  });

  it('rejects a lesson with no resources supported by the Builder', () => {
    const h = harness([{ id: 'chat', type: 'persona' }]);
    expect(h.openExportPreview('print', ['chat'])).toBe(false);
    expect(h.callbacks.setShowExportPreview).not.toHaveBeenCalled();
  });

  it('keeps a deleted resource from causing a broader export', () => {
    const h = harness([old, current]);
    h.openExportPreview('print', ['current']);
    h.updateHistory([old]);
    expect(h.getBuilderHistory()).toEqual([]);
    expect(h.selectBuilderResources([old], h.scope()).ready).toBe(false);
  });

  it('resets the scope when opening the ordinary History builder', () => {
    const h = harness([old, current]);
    h.openExportPreview('print', ['current']);
    h.openExportPreview('html');
    expect(h.scope()).toBeNull();
    expect(h.getBuilderHistory()).toEqual([old, current]);
  });

  it('restores an edited project scope on its first open', () => {
    window.__alloBuilderEditedPack = { restoredFromProject: true, resourceIds: ['current'] };
    const h = harness([old, current]);
    h.openExportPreview();
    expect(h.getBuilderHistory()).toEqual([current]);
    h.openExportPreview();
    expect(h.getBuilderHistory()).toEqual([old, current]);
  });

  it('renders only the selected lesson in the actual slide-preview generator', () => {
    const h = harness([old, current]);
    h.openExportPreview('slides', ['current']);
    const html = window.AlloModules.ExportHandlers.getSlidesPreviewHTML({ sourceTopic: 'Reading', gradeLevel: '5', getExportableHistory: h.getBuilderExportableHistory, t: () => '' });
    expect(html).toContain('CURRENT_LESSON_TEXT');
    expect(html).not.toContain('OTHER_LESSON_TEXT');
  });

  it('wires the same selection into the guided button, renderer, download handler, and Builder view', () => {
    expect(host).toContain("openGuidedDocumentBuilder={() => openExportPreview('print', guidedCreatedHistoryIds)}");
    expect(host).toContain('const exportableResources = getBuilderExportableHistory();');
    expect(host).toContain('return generateFullPackHTML(exportableResources, sourceTopic');
    expect(host).toContain('getExportableHistory: getBuilderExportableHistory, getSkippedResources: getBuilderSkippedResources');
    expect(host).toContain('handleExportSlides: () => handleExportSlides({ history: getBuilderHistory() })');
    expect(host).toContain('history: getBuilderHistory(), builderResourceIds, isAgentRunning');
  });
});


describe('Scoped edited Builder drafts', () => {
  function drafts() {
    const selection = host.slice(host.indexOf('  const selectBuilderResources ='), host.indexOf('  const getBuilderHistory ='));
    const functions = host.slice(host.indexOf('  const _getBuilderDraftForProject ='), host.indexOf('  const resetCanvasWorkspaceSettings ='));
    return new Function('history', selection + `
      const _syncBuilderEditsToRemediation = () => {};
      const _getBuilderHistorySignature = () => 'matching-history';
      const _sanitizeBuilderProjectDraft = (html, historySignature) => ({ html, source: 'history', historySignature });
      const _packBuilderProjectDraft = async clean => ({ ...clean, version: 2, payload: 'encoded' });
      const _unpackBuilderProjectDraft = async candidate => candidate.html;
      const addToast = () => {}, t = () => '';
      ` + functions + '\nreturn { save: _getBuilderDraftForProject, restore: _restoreBuilderDraftFromProject };')([old, current]);
  }

  it('keeps the selected IDs alongside the encoded edited draft and restores them', async () => {
    const api = drafts();
    window.__alloBuilderEditedPack = { source: 'history', historySignature: 'matching-history', resourceIds: ['current'], html: '<html><body>Edited current reading</body></html>' };
    const saved = await api.save();
    expect(saved).toMatchObject({ version: 2, payload: 'encoded', resourceIds: ['current'] });
    expect(await api.restore(saved, [old, current])).toBe(true);
    expect(window.__alloBuilderEditedPack.resourceIds).toEqual(['current']);
    expect(window.__alloBuilderEditedPack.html).toContain('Edited current reading');
  });

  it('does not restore a scoped draft against a project missing its selected resource', async () => {
    const api = drafts();
    const saved = { source: 'history', resourceIds: ['missing'], html: '<html><body>Old edited reading</body></html>' };
    expect(await api.restore(saved, [old, current])).toBe(false);
    expect(window.__alloBuilderEditedPack).toBeNull();
  });

  it('restores legacy drafts as unscoped documents', async () => {
    const api = drafts();
    expect(await api.restore({ html: '<html><body>Legacy document</body></html>' }, [old, current])).toBe(true);
    expect(window.__alloBuilderEditedPack.resourceIds).toBeNull();
  });
});

describe('Scoped reading HTML', () => {
  it('generates the selected lesson through the real document pipeline', () => {
    loadAlloModule('doc_builder_renderer_module.js');
    loadAlloModule('doc_pipeline_module.js');
    const stub = async () => '{}';
    const pipeline = window.AlloModules.createDocPipeline({ callGemini: stub, callGeminiVision: stub, callImagen: async () => null,
      addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Reading', state: {} });
    const h = harness([old, current]);
    h.openExportPreview('html', ['current']);
    const html = pipeline.generateFullPackHTML(h.getBuilderExportableHistory(), 'Reading pack', false, {}, { includeSimplified: true, includeLessonPlan: false, includeAnalysis: false });
    expect(html).toContain('CURRENT_LESSON_TEXT');
    expect(html).not.toContain('OTHER_LESSON_TEXT');
    expect(new DOMParser().parseFromString(html, 'text/html').body.textContent).toContain('CURRENT_LESSON_TEXT');
  });
});
