import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { patchDesktopHtml }=require('../desktop/scripts/build-desktop-web.cjs');
const source = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const hostArtifact = new vm.Script(fs.readFileSync('host_handlers_module.js', 'utf8'), {
  filename: 'host_handlers_module.js',
});

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, 'missing source marker: ' + startMarker).toBeGreaterThan(-1);
  expect(source.indexOf(startMarker, start + startMarker.length), 'ambiguous source marker: ' + startMarker).toBe(-1);
  expect(end, 'missing end marker: ' + endMarker).toBeGreaterThan(start);
  return source.slice(start, end);
}

// The intake implementation moved into HostHandlers. Run that shipped module
// through the current shell accessor and forwarding shim, rather than testing a
// copied body or silently slicing from an inline-handler marker that no longer exists.
const hostAccessor = section('  let __alloHostHandlersCache = null;', '  // Non-fatal variant');
const handlerShim = section('  const handleFileUpload =', '\n');
const loader = section('    const loadModule = (name, url) => {', '    window.__alloRetryModule =');
const lazy = section('    window.__alloLazyFileIntake =', '\n');

function harness(load) {
  vi.useFakeTimers();
  let epoch = 0;
  const window = { React: {}, AlloModules: {} };
  const calls = {};
  // Explicit host UI sinks needed by the real startNewPdfAudit reset. Missing new
  // dependencies fail loudly; no catch-all Proxy manufactures passing stand-ins.
  for (const name of [
    'requestPdfAuditModules', 'cancelActiveProjectLoad', 'cancelActiveFileIntakeOperations',
    'invalidateLocalDataHydration', 'setPdfReturnPillDismissed', 'setPdfActiveRemediationStorageKey',
    'setPdfRemediationDeleteConfirm', 'setPdfAuditResult', 'setPdfFixResult', 'setDiffChunks',
    'setDiffSelection', 'setApplyingRemarkup', 'setPdfFixLoading', 'setPdfAutoContinueRunning',
    'setPdfFixStep', 'setPendingPdfBase64', 'setPendingPdfFile', 'setPdfBatchMode',
    'setPdfBatchQueue', 'setPdfBatchSummary', 'setPdfBatchProcessing', 'setPdfBatchCurrentIndex',
    'setPdfBatchStep', 'setPdfPageRange', 'setPdfMultiSession', 'setPdfAuditTab',
    'setDiffViewOpen', 'setPdfPreviewOpen', 'setLiveChunkStream', 'setExtractedImagesList',
    'setLiveChunkSessionActive', 'setLiveChunkExpanded', 'setLiveChunkRejected',
    'setChunkResumePrompt', 'setBoringPalettePrompt', 'setChunkSaveFlash', 'setFixIssuesList',
    'setExtractionData', 'setFidelityResult', 'setImageReinsertionReport', 'setAutoRestoreSummary',
    'setShowLargeFileModal', 'setPendingLargeFile', 'setIsLargeFileProcessing',
    'setLargeFileProgress', 'setLargeFileTotalChunks', 'setLargeFileStatus', 'setPdfWebMode',
    'setIsExtracting', 'setPdfAuditLoading', 'setGenerationStep', 'setError', 'addToast', 'warnLog',
  ]) calls[name] = vi.fn();
  const deps = {
    ...calls,
    invalidatePdfDocumentOperations: vi.fn(() => ++epoch),
    isPdfDocumentIntakeCurrent: (candidate) => candidate === epoch,
    _alloMiscHandlersDeps: (documentIntakeEpoch) => ({ epoch: documentIntakeEpoch }),
    t: () => '',
    ALLO_PDF_REMEDIATION_CACHE: { clearDismissal: vi.fn() },
    lastPdfAuditResultRef: { current: null },
    pdfAutoContinueAbortRef: { current: false },
    pdfAutoContinueAbortCtrlRef: { current: null },
    selectedPreviewImgRef: { current: null },
    lastPdfBytesRef: { current: null },
  };
  window.__alloLazyFileIntake = vi.fn(() => load?.(window));
  const context = vm.createContext({
    window, __alloHostDeps: deps, localStorage: {}, setTimeout,
    console: { log() {}, warn() {}, error() {} },
  });
  hostArtifact.runInContext(context);
  expect(window.AlloModules.HostHandlers).toEqual(expect.any(Function));
  const upload = vm.runInContext(hostAccessor + handlerShim + ';handleFileUpload', context);
  return { window, upload, calls, deps };
}

function input(fileOrName = 'rainfall.pdf') {
  const file = typeof fileOrName === 'string'
    ? new File(['%PDF-1.4\nsynthetic fixture'], fileOrName, { type: 'application/pdf' })
    : fileOrName;
  let files = file ? [file] : [];
  let value = file?.name || '';
  // A browser clears its live FileList when input.value is cleared. Capturing
  // the File before that happens, and reselecting it for retry, are the behavior
  // under test; a permanently populated array would conceal a broken capture.
  const control = {
    get files() { return files; },
    get value() { return value; },
    set value(next) { value = next; if (next === '') files = []; },
  };
  return { currentTarget: control, target: control };
}

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('first-use file intake readiness', () => {
  it('promotes intake out of the startup queue without waiting for background work', () => {
    const queued = { name: 'MiscHandlersModule', url: 'queued' };
    const names = { MiscHandlersModule: queued };
    const loadNow = vi.fn();
    const window = { AlloModules: {} };
    const context = { window, __alloBootstrappingModules: false, __alloDeferredModuleNames: names, __alloLoadModuleNow: loadNow };
    vm.runInNewContext(loader + lazy + ';window.__alloLazyFileIntake();', context);
    expect(names.MiscHandlersModule).toBeUndefined();
    expect(loadNow).toHaveBeenCalledWith('MiscHandlersModule', expect.stringContaining('misc_handlers_module.js'));
  });

  it('loads on selection, retains the File after clearing the input, and dispatches when ready', async () => {
    const dispatch = vi.fn();
    const h = harness(w => setTimeout(() => { w.AlloModules.MiscHandlers = { handleFileUpload: dispatch }; }, 250));
    const event = input();
    const file = event.currentTarget.files[0];
    const run = h.upload(event);
    expect(h.window.__alloLazyFileIntake).toHaveBeenCalledOnce();
    expect(event.currentTarget.value).toBe('');
    expect(event.currentTarget.files).toEqual([]);
    expect(h.calls.setIsExtracting).toHaveBeenLastCalledWith(true);
    expect(h.calls.setPdfAuditLoading).toHaveBeenLastCalledWith(true);
    expect(dispatch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(dispatch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    await run;
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({ files: [file] }),
      currentTarget: expect.objectContaining({ files: [file] }),
    }), { epoch: 1 });
    expect(dispatch.mock.calls[0][0].target.files[0]).toBe(file);
    expect(h.calls.cancelActiveFileIntakeOperations).toHaveBeenCalledWith('new-pdf-audit');
    expect(h.calls.setError).not.toHaveBeenCalled();
  });

  it('uses an already registered handler without starting another load', async () => {
    const h = harness();
    const dispatch = vi.fn();
    h.window.AlloModules.MiscHandlers = { handleFileUpload: dispatch };
    await h.upload(input());
    expect(dispatch).toHaveBeenCalledOnce();
    expect(h.window.__alloLazyFileIntake).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows retry guidance after a timeout and accepts the same file on retry', async () => {
    const h = harness();
    const event = input();
    const file = event.currentTarget.files[0];
    const first = h.upload(event);
    await vi.advanceTimersByTimeAsync(29900);
    expect(h.calls.setError).not.toHaveBeenCalled();
    expect(h.calls.setIsExtracting).toHaveBeenLastCalledWith(true);
    await vi.advanceTimersByTimeAsync(100);
    await first;
    expect(h.calls.setPdfAuditLoading).toHaveBeenLastCalledWith(false);
    expect(h.calls.setIsExtracting).toHaveBeenLastCalledWith(false);
    expect(h.calls.setGenerationStep).toHaveBeenLastCalledWith('');
    expect(h.calls.setError).toHaveBeenCalledWith(expect.stringContaining('choose the file again to retry'));
    expect(event.currentTarget.files).toEqual([]);
    const dispatch = vi.fn();
    h.window.__alloLazyFileIntake.mockImplementation(() => { h.window.AlloModules.MiscHandlers = { handleFileUpload: dispatch }; });
    const retry = h.upload(input(file));
    await vi.advanceTimersByTimeAsync(100);
    await retry;
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch.mock.calls[0][0].target.files[0]).toBe(file);
    expect(dispatch.mock.calls[0][1]).toEqual({ epoch: 2 });
    expect(h.window.__alloLazyFileIntake).toHaveBeenCalledTimes(2);
  });

  it('never dispatches a stale file when another upload replaces it during loading', async () => {
    const h = harness();
    const first = h.upload(input('first.pdf'));
    const second = h.upload(input('second.pdf'));
    const dispatch = vi.fn();
    h.window.AlloModules.MiscHandlers = { handleFileUpload: dispatch };
    await vi.advanceTimersByTimeAsync(100);
    await Promise.all([first, second]);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch.mock.calls[0][0].target.files[0].name).toBe('second.pdf');
    expect(dispatch.mock.calls[0][1]).toEqual({ epoch: 2 });
    expect(h.calls.setError).not.toHaveBeenCalled();
    expect(h.calls.setIsExtracting).toHaveBeenLastCalledWith(true);
    expect(h.calls.setPdfAuditLoading).toHaveBeenLastCalledWith(true);
  });

  it('does not reset the audit or request intake when selection is cancelled', async () => {
    const h = harness();
    await h.upload(input(null));
    expect(h.deps.invalidatePdfDocumentOperations).not.toHaveBeenCalled();
    expect(h.calls.requestPdfAuditModules).not.toHaveBeenCalled();
    expect(h.window.__alloLazyFileIntake).not.toHaveBeenCalled();
    expect(h.calls.setIsExtracting).not.toHaveBeenCalled();
  });

  it('does not clear the newer upload or publish an error when an older dispatched upload fails', async () => {
    const h = harness();
    let rejectFirst;
    const dispatch = vi.fn(() => new Promise((resolve, reject) => { rejectFirst = reject; }));
    h.window.AlloModules.MiscHandlers = { handleFileUpload: dispatch };
    const first = h.upload(input('first.pdf'));
    delete h.window.AlloModules.MiscHandlers;
    const second = h.upload(input('second.pdf'));
    rejectFirst(new Error('older upload failed'));
    await first;
    expect(h.calls.setError).not.toHaveBeenCalled();
    expect(h.calls.addToast).not.toHaveBeenCalled();
    expect(h.calls.setIsExtracting).toHaveBeenLastCalledWith(true);
    expect(h.calls.setPdfAuditLoading).toHaveBeenLastCalledWith(true);
    const secondDispatch = vi.fn();
    h.window.AlloModules.MiscHandlers = { handleFileUpload: secondDispatch };
    await vi.advanceTimersByTimeAsync(100);
    await second;
    expect(secondDispatch).toHaveBeenCalledOnce();
    expect(secondDispatch.mock.calls[0][0].target.files[0].name).toBe('second.pdf');
    expect(secondDispatch.mock.calls[0][1]).toEqual({ epoch: 2 });
  });
});
describe('desktop startup assets',()=>{
  it('repairs legacy AI script paths even with id/defer attributes during desktop staging',()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alloflow-startup-test-'));
    try {
      for(const tag of ['<script id="alloflow-ai-backend-script" src="/ai_backend_module.js" defer="defer"></script>', '<script src="/ai_backend_module.js"></script>']) {
        const file=path.join(dir,'index.html');fs.writeFileSync(file,tag);patchDesktopHtml(dir);const result=fs.readFileSync(file,'utf8');expect(result).toBe(tag.replace('/ai_backend_module.js','./ai_backend_module.js'));patchDesktopHtml(dir);expect(fs.readFileSync(file,'utf8')).toBe(result);
      }
    } finally {fs.unlinkSync(path.join(dir,'index.html'));fs.rmdirSync(dir);}
  });
  it('resolves the AI script within the app under both root and nested hosting',()=>{
    const html=fs.readFileSync('desktop/web-app/public/index.html','utf8');const src=html.match(/id="alloflow-ai-backend-script" src="([^"]+)"/)[1];
    for(const base of ['http://localhost/','http://localhost/app/'])expect(new URL(src,base).href).toBe(base+'ai_backend_module.js');
  });
  it('includes the quest contract in the asset-copy manifest and local public assets',()=>{
    const build=fs.readFileSync('build.js','utf8');expect(build).toMatch(/name: 'AlloQuestContract',\s+filename: 'allo_quest_contract_module.js'/);expect(fs.readFileSync('desktop/web-app/public/allo_quest_contract_module.js','utf8')).toBe(fs.readFileSync('allo_quest_contract_module.js','utf8'));
  });
});

describe('tool catalog host paths',()=>{
  it.each([['http://localhost/app/','http://localhost/app/tool_index.json'],['http://127.0.0.1/','http://127.0.0.1/tool_index.json'],['https://alloflow.org/app/','https://alloflow.org/tool_index.json'],['https://gemini.google.com/app/123','https://alloflow-cdn.pages.dev/tool_index.json']])('loads the catalog from the correct host for %s',(href,expected)=>{
    const start=source.lastIndexOf('(function () {',source.indexOf('var _tiUrl'));const end=source.indexOf('})();',start)+5;const fetch=vi.fn(()=>Promise.resolve({ok:false}));
    vm.runInNewContext(source.slice(start,end),{window:{location:new URL(href)},fetch,URL});expect(fetch).toHaveBeenCalledWith(expected,{cache:'no-cache'});
  });
});
