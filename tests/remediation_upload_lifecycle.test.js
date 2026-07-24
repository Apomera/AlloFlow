import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const host = read('AlloFlowANTI.txt');
const view = read('view_pdf_audit_source.jsx');
const miscSource = read('misc_handlers_source.jsx');
const docSource = read('doc_pipeline_source.jsx');

let MiscHandlers;

class ControlledFileReader {
  static instances = [];

  constructor() {
    this.file = null;
    this.result = null;
    this.error = null;
    ControlledFileReader.instances.push(this);
  }

  readAsDataURL(file) {
    this.file = file;
  }

  async succeed(base64) {
    this.result = `data:${this.file?.type || 'application/octet-stream'};base64,${base64}`;
    const event = { target: this };
    if (typeof this.onload === 'function') await this.onload(event);
    if (typeof this.onloadend === 'function') await this.onloadend(event);
  }
}

const makeUploadDeps = (overrides = {}) => ({
  LargeFileHandler: {
    needsChunking: vi.fn(() => false),
    getFileType: vi.fn(() => 'pdf'),
  },
  callGeminiVision: vi.fn(),
  convertXlsxToMarkdownTables: null,
  addToast: vi.fn(),
  t: (key) => key,
  warnLog: vi.fn(),
  setShowLargeFileModal: vi.fn(),
  setPendingLargeFile: vi.fn(),
  setError: vi.fn(),
  setIsExtracting: vi.fn(),
  setGenerationStep: vi.fn(),
  setInputText: vi.fn(),
  recordSourceProvenance: vi.fn(),
  setPendingPdfBase64: vi.fn(),
  setPendingPdfFile: vi.fn(),
  setPdfAuditResult: vi.fn(),
  setPdfAuditLoading: vi.fn(),
  documentIntakeEpoch: 1,
  isPdfDocumentIntakeCurrent: vi.fn(() => true),
  ...overrides,
});

const section = (source, startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  expect(start, `missing start marker: ${startNeedle}`).toBeGreaterThan(-1);
  expect(end, `missing end marker after ${startNeedle}: ${endNeedle}`).toBeGreaterThan(start);
  return source.slice(start, end);
};

const deferred = () => {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
};

function runStartupRestoreEffect({ epochRef, rehydrate, setPdfFixResult }) {
  const needle = "const latestKey = safeGetItem('allo.lastPdfAudit.latest');";
  const needleIndex = host.indexOf(needle);
  expect(needleIndex).toBeGreaterThan(-1);
  const start = host.lastIndexOf('  useEffect(() => {', needleIndex);
  const end = host.indexOf('  const toggleDiffChunk', needleIndex);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const effectSource = host.slice(start, end);
  let cleanup = () => {};
  const useEffect = (effect) => {
    cleanup = effect() || (() => {});
  };
  const payload = JSON.stringify({
    pdfFixResult: { sourceText: 'saved source', accessibleHtml: '<main>saved</main>' },
  });
  const safeGetItem = (key) => {
    if (key === 'allo.lastPdfAudit.latest') return 'saved-audit-key';
    if (key === 'saved-audit-key') return payload;
    return null;
  };
  const execute = new Function(
    'useEffect',
    'React',
    'safeGetItem',
    'rehydrateVerificationHtmlBinding',
    'setPdfFixResult',
    'pdfDocumentSelectionEpochRef',
    effectSource,
  );
  execute(
    useEffect,
    { useEffect },
    safeGetItem,
    rehydrate,
    setPdfFixResult,
    epochRef,
  );
  return cleanup;
}

beforeAll(() => {
  loadAlloModule('misc_handlers_module.js');
  MiscHandlers = window.AlloModules.MiscHandlers;
});

beforeEach(() => {
  ControlledFileReader.instances = [];
  vi.stubGlobal('FileReader', ControlledFileReader);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('document remediation upload routing', () => {
  it.each([
    ['uppercase extension with an empty MIME type', { name: 'UPPER.PDF', type: '', size: 41 }],
    ['PDF extension with a generic MIME type', { name: 'generic.PdF', type: 'application/octet-stream', size: 42 }],
    ['PDF MIME type without a PDF extension', { name: 'download', type: 'application/pdf', size: 43 }],
  ])('routes %s to the remediation chooser', async (_label, file) => {
    const deps = makeUploadDeps();

    await MiscHandlers.handleFileUpload({ target: { files: [file] } }, deps);

    expect(ControlledFileReader.instances).toHaveLength(1);
    await ControlledFileReader.instances[0].succeed('JVBERi0xLjQK');
    expect(deps.setPendingPdfBase64).toHaveBeenCalledWith('JVBERi0xLjQK');
    expect(deps.setPendingPdfFile).toHaveBeenCalledWith(file);
    expect(deps.setPdfAuditResult).toHaveBeenCalledWith({
      _choosing: true,
      fileName: file.name,
      fileSize: file.size,
    });
    expect(deps.setError).not.toHaveBeenCalledWith('toasts.unsupported_file_type');
  });

  it('discards an older FileReader completion after a newer document selection', async () => {
    const activeEpoch = { current: 1 };
    const fileA = { name: 'first.pdf', type: 'application/pdf', size: 10 };
    const fileB = { name: 'second.pdf', type: 'application/pdf', size: 20 };
    const shared = {
      setPendingPdfBase64: vi.fn(),
      setPendingPdfFile: vi.fn(),
      setPdfAuditResult: vi.fn(),
    };
    const depsA = makeUploadDeps({
      ...shared,
      documentIntakeEpoch: 1,
      isPdfDocumentIntakeCurrent: vi.fn((epoch = 1) => epoch === activeEpoch.current),
    });
    await MiscHandlers.handleFileUpload({ target: { files: [fileA] } }, depsA);
    activeEpoch.current = 2;
    const depsB = makeUploadDeps({
      ...shared,
      documentIntakeEpoch: 2,
      isPdfDocumentIntakeCurrent: vi.fn((epoch = 2) => epoch === activeEpoch.current),
    });
    await MiscHandlers.handleFileUpload({ target: { files: [fileB] } }, depsB);
    expect(ControlledFileReader.instances).toHaveLength(2);

    const auditCallsBeforeReads = shared.setPdfAuditResult.mock.calls.length;
    shared.setPendingPdfBase64.mockClear();
    shared.setPendingPdfFile.mockClear();
    await ControlledFileReader.instances[1].succeed('U0VDT05E');
    await ControlledFileReader.instances[0].succeed('RklSU1Q=');

    expect(shared.setPendingPdfBase64).toHaveBeenCalledTimes(1);
    expect(shared.setPendingPdfBase64).toHaveBeenCalledWith('U0VDT05E');
    expect(shared.setPendingPdfFile).toHaveBeenCalledTimes(1);
    expect(shared.setPendingPdfFile).toHaveBeenCalledWith(fileB);
    const lateAuditCalls = shared.setPdfAuditResult.mock.calls.slice(auditCallsBeforeReads);
    expect(lateAuditCalls.some(([result]) => result?.fileName === fileA.name)).toBe(false);
    expect(shared.setPdfAuditResult).toHaveBeenLastCalledWith(expect.objectContaining({ fileName: fileB.name }));
  });
});

describe('host document-selection lifecycle', () => {
  it('owns one monotonic epoch and startNewPdfAudit clears every stale document surface before returning it', () => {
    expect(host).toContain('const pdfDocumentSelectionEpochRef = useRef(0);');
    const invalidation = section(host, '  const invalidatePdfDocumentOperations = () => {', '  const _closePdfAuditModal');
    expect(invalidation).toContain('++pdfDocumentSelectionEpochRef.current');
    expect(invalidation).toContain('window.__alloPdfRunGen = (window.__alloPdfRunGen || 0) + 1');
    expect(invalidation).toContain('window.__alloPdfBatchAbortCtrl.abort()');
    expect(invalidation).toContain('window.__alloflowCompareCropInsert = null');
    expect(invalidation).toContain('window.__alloflowCompareGetTagged = null');
    expect(invalidation).toContain('window.__alloflowExtractedImages = []');
    expect(invalidation).toContain('window.__alloflowCropDescribe = null');
    const reset = section(host, '  const startNewPdfAudit = () => {', '  const ensurePdfBase64');
    const epochIndex = reset.indexOf('invalidatePdfDocumentOperations()');
    expect(epochIndex).toBeGreaterThan(-1);
    for (const clear of [
      'lastPdfAuditResultRef.current = null',
      'setPdfAuditResult(null)',
      'setPdfFixResult(null)',
      'setPendingPdfBase64(null)',
      'setPendingPdfFile(null)',
      'lastPdfBytesRef.current = null',
      'setPdfPageRange(null)',
      'setPdfMultiSession(null)',
      'setPdfBatchProcessing(false)',
      'setLiveChunkStream([])',
      'setLiveChunkSessionActive(false)',
      'setChunkResumePrompt(null)',
      'setFixIssuesList(null)',
      'setExtractionData(null)',
      'setFidelityResult(null)',
      'setImageReinsertionReport(null)',
      'setExtractedImagesList([])',
      'setAutoRestoreSummary(null)',
      'setShowLargeFileModal(false)',
      'setPendingLargeFile(null)',
    ]) {
      expect(reset.indexOf(clear), `${clear} must follow the epoch claim`).toBeGreaterThan(epochIndex);
    }
    const returnMatch = reset.match(/return\s+(?:documentIntakeEpoch|pdfDocumentSelectionEpochRef\.current)\s*;/);
    expect(returnMatch).not.toBeNull();
    expect(host).toContain('const eventIsCurrent = (e) => Number.isInteger(e && e.detail && e.detail.documentEpoch)');
    expect(host).toContain('if (!Number.isInteger(eventEpoch) || eventEpoch !== pdfDocumentSelectionEpochRef.current) return;');
    expect(reset.indexOf(returnMatch[0])).toBeGreaterThan(reset.indexOf('setPendingPdfFile(null)'));
  });

  it('captures the selected file, starts a fresh epoch, waits for MiscHandlers, and resets the input on every exit', () => {
    const upload = section(host, '  const handleFileUpload = async (e) => {', '  const repairGeneratedText');
    const fileCapture = upload.search(/const\s+file\s*=.*files/);
    const epochClaim = upload.indexOf('startNewPdfAudit()');
    const firstAwait = upload.indexOf('await ');
    const delegate = upload.indexOf('.handleFileUpload(');
    const finalizer = upload.lastIndexOf('finally');
    const reset = upload.lastIndexOf(".value = ''");

    expect(fileCapture).toBeGreaterThan(-1);
    expect(epochClaim).toBeGreaterThan(fileCapture);
    expect(firstAwait).toBeGreaterThan(epochClaim);
    expect(delegate).toBeGreaterThan(firstAwait);
    expect(upload).toContain('documentIntakeEpoch');
    expect(upload).toContain('isPdfDocumentIntakeCurrent');
    expect(upload).toContain('attempt < 300');
    expect(upload).not.toContain('[handleFileUpload] MiscHandlers module not loaded - reload the page');
    expect(host).toMatch(/setPdfAuditResult,\s*setPdfAuditLoading,\s*documentIntakeEpoch/);
    const currentGuard = upload.indexOf('if (!isPdfDocumentIntakeCurrent(documentIntakeEpoch)) return;');
    const delegationEnd = upload.indexOf('} catch (err)', currentGuard);
    expect(currentGuard).toBeGreaterThan(-1);
    expect(delegationEnd).toBeGreaterThan(currentGuard);
    expect(upload.slice(currentGuard, delegationEnd)).not.toContain('setPdfAuditLoading(false)');
    expect(finalizer).toBeGreaterThan(delegate);
    expect(reset).toBeGreaterThan(finalizer);
  });

  it('prevents a late startup rehydrate from restoring the previous document over a new selection', async () => {
    const gate = deferred();
    const epochRef = { current: 0 };
    const setPdfFixResult = vi.fn();
    const rehydrate = vi.fn(() => gate.promise);
    const cleanup = runStartupRestoreEffect({ epochRef, rehydrate, setPdfFixResult });
    await vi.waitFor(() => expect(rehydrate).toHaveBeenCalledTimes(1));

    epochRef.current = 1;
    gate.resolve({ sourceText: 'saved source', accessibleHtml: '<main>stale</main>' });
    await Promise.resolve();
    await Promise.resolve();

    expect(setPdfFixResult).not.toHaveBeenCalled();
    cleanup();
  });

  it('still restores the saved result when no newer document was selected', async () => {
    const restored = { sourceText: 'saved source', accessibleHtml: '<main>current</main>' };
    const epochRef = { current: 7 };
    const setPdfFixResult = vi.fn();
    const rehydrate = vi.fn(async () => restored);
    const cleanup = runStartupRestoreEffect({ epochRef, rehydrate, setPdfFixResult });

    await vi.waitFor(() => expect(setPdfFixResult).toHaveBeenCalledWith(restored));
    cleanup();
  });

  it('publishes an abort signal for the active audit and restores the previous owner on finish or reset', () => {
    const lifecycle = section(
      host,
      '  const pdfAuditEpochRef = useRef(0);',
      '  const [pendingPdfFile, setPendingPdfFile] = useState(null);',
    );
    const makeLifecycle = new Function(
      'React',
      'useRef',
      'AbortController',
      'window',
      'setPdfAuditLoading',
      `${lifecycle}\nreturn { beginPdfAuditRun, finishPdfAuditRun, invalidatePdfAuditRun };`,
    );
    const previousSignal = { owner: 'previous-operation' };
    const fakeWindow = { __alloPdfAbortSignal: previousSignal };
    const api = makeLifecycle(
      { useCallback: (fn) => fn },
      (initial) => ({ current: initial }),
      AbortController,
      fakeWindow,
      vi.fn(),
    );

    const first = api.beginPdfAuditRun();
    expect(fakeWindow.__alloPdfAbortSignal).toBe(first.signal);
    expect(first.signal.aborted).toBe(false);
    expect(api.finishPdfAuditRun(first)).toBe(true);
    expect(fakeWindow.__alloPdfAbortSignal).toBe(previousSignal);

    const second = api.beginPdfAuditRun();
    expect(fakeWindow.__alloPdfAbortSignal).toBe(second.signal);
    api.invalidatePdfAuditRun();
    expect(second.signal.aborted).toBe(true);
    expect(fakeWindow.__alloPdfAbortSignal).toBe(previousSignal);
  });

  it('bounds a pending lazy module load so the audit UI can offer Retry', () => {
    const loader = section(host, 'var expireModuleLoad = function() {', 's.onload = () => {');
    expect(loader).toContain("entry.status === 'pending'");
    expect(loader).toContain('entry.loadGeneration === loadGeneration');
    expect(loader).toContain('s.remove()');
    expect(loader).toContain('entry.fallbackScript.remove()');
    expect(loader).toContain('entry.loadGeneration = loadGeneration + 1');
    expect(loader).toContain("__alloSetModuleStatus(name, 'failed')");
    expect(loader.match(/setTimeout\(expireModuleLoad, 30000\)/g)).toHaveLength(2);
    expect(host).toContain('if (!source) return;');
    expect(host).not.toContain('window.onerror = function(msg, src, line, col, err)');
  });

  it('validates reattached PDF bytes against the active document and ignores stale reads', () => {
    const reattach = section(host, '  const ensurePdfBase64 = React.useCallback(() => {', '  const [pdfAutoSaveProject');
    expect(reattach).toContain('const documentIntakeEpoch = pdfDocumentSelectionEpochRef.current;');
    expect(reattach).toContain('const intakeIsCurrent = () => isPdfDocumentIntakeCurrent(documentIntakeEpoch);');
    expect(reattach).toContain("reattachHeader = atob(base64.slice(0, 2048))");
    expect(reattach).toContain("reattachHeader.includes('%PDF-')");
    expect(reattach).toContain('pdfFixResultRef.current.documentDigest');
    expect(reattach).toContain('lastPdfAuditResultRef.current && lastPdfAuditResultRef.current.documentDigest');
    expect(reattach).toContain("if (settled || !intakeIsCurrent()) { finish(null); return; }");
    expect(reattach).toContain('actualDigest !== expectedDigest');
    expect(reattach).toContain('pendingPdfFile && pendingPdfFile.documentDigest');
    expect(reattach).toContain('documentDigest: expectedDigest || null');
    expect(reattach).toContain('reader.onabort');
    expect(reattach).toContain('pdfReattachPendingRef.current');
    expect(reattach).toContain("crypto.subtle.digest('SHA-256'");
    expect(reattach).toContain('window.addEventListener(\'focus\'');
    expect(reattach).toContain('}, 30000)');
    expect(reattach).toContain('file.size > 30 * 1024 * 1024');
    expect(reattach).toContain('!!pendingPdfFile.name && file.name !== pendingPdfFile.name');
  });

  it('decodes LMS audit URLs once and bounds streamed downloads before buffering', () => {
    const lmsSetup = section(host, '  const [lmsAuditUrls, setLmsAuditUrls] = useState([]);', '  const [wordSoundsAutoReview');
    expect(lmsSetup).toContain("params.getAll('audit_url')");
    expect(lmsSetup).toContain("part.slice(part.indexOf('=') + 1).split(',')");
    expect(lmsSetup).not.toContain("params.get('audit_urls').split(',').map(u => decodeURIComponent(u))");
    expect(host).toContain("fetch(url, fetchController ? { signal: fetchController.signal } : undefined)");
    expect(host).toContain("resp.headers.get('content-length')");
    expect(host).toContain("resp.body.getReader");
    expect(host).toContain('received > maxBytes');
    expect(host).toContain("fetchController?.signal.addEventListener('abort', onFetchAbort");
    expect(host).toContain("readTimeout = setTimeout(() => failRead('The downloaded document could not be read within 30 seconds.')");
    expect(host).toContain('await new Promise((resolveRead) => {');
    const blobComplete = host.indexOf("if (blob.size > 30 * 1024 * 1024) throw new Error('The document is larger than the 30 MB safety limit.');");
    const fetchTimerHandoff = host.indexOf('clearTimeout(fetchTimeout);', blobComplete);
    const fileReaderStart = host.indexOf('await new Promise((resolveRead) => {', blobComplete);
    expect(blobComplete).toBeGreaterThan(-1);
    expect(fetchTimerHandoff).toBeGreaterThan(blobComplete);
    expect(fetchTimerHandoff).toBeLessThan(fileReaderStart);
    expect(host).toContain("if (isPdfDocumentIntakeCurrent(documentIntakeEpoch)) failRead('The downloaded document read was cancelled.'); else settleRead();");
  });
});

describe('audit-only readiness and manual audit behavior', () => {
  it('does not require the renderer or verification policy merely to run the initial audit', () => {
    const auditStart = host.indexOf('  const auditModuleNames =');
    const remediationStart = host.indexOf('  const remediationModuleNames =', auditStart);
    expect(auditStart).toBeGreaterThan(-1);
    expect(remediationStart).toBeGreaterThan(auditStart);
    const auditDefinition = host.slice(auditStart, remediationStart);
    const remediationDefinition = host.slice(remediationStart, host.indexOf('  const [canPlayBotIntro', remediationStart));

    expect(auditDefinition).toContain('DocPipelineModule');
    expect(auditDefinition).not.toContain('VerificationPolicy');
    expect(auditDefinition).not.toContain('DocBuilderRenderer');
    expect(auditDefinition).toContain('const auditReady =');
    expect(remediationDefinition).toContain('...auditModuleNames');
    for (const dependency of ['VerificationPolicy', 'DocBuilderRenderer', 'MiscHandlersModule']) {
      expect(remediationDefinition).toContain(dependency);
    }
    expect(host).toContain('auditReady, auditDependencyState');
  });

  it('gates Run Audit only on audit readiness and performs no remediation or delayed autosave', () => {
    const marker = view.indexOf('data-help-key="pdf_audit_view_start_btn"');
    expect(marker).toBeGreaterThan(-1);
    const buttonStart = view.lastIndexOf('<button', marker);
    const buttonEnd = view.indexOf('</button>', marker);
    const button = view.slice(buttonStart, buttonEnd);
    const containingRowPrefix = view.slice(Math.max(0, buttonStart - 700), buttonStart);

    expect(button).toContain('_auditInputReady');
    expect(button).toContain('disabled=');
    expect(button).not.toContain('remediationReady');
    expect(button).not.toContain('runAutoFixLoop');
    expect(button).not.toContain('saveProjectToFile');
    expect(button).not.toContain('setTimeout');
    expect(containingRowPrefix).not.toContain('onClickCapture');
  });

  it('releases the audit run token on cache and Office-document early completions', () => {
    const cached = section(docSource, '    if (_cacheKey) {', '    const _officeKind =');
    expect(cached).toMatch(/_finishAuditUi\(\);\s*return _auditCancelled\(\) \? null : cachedForDocument;/);

    const office = section(docSource, '    if (_officeKind) {', '    // Magic-byte intake gate');
    expect(office).toMatch(/_finishAuditUi\(\);\s*return _auditCancelled\(\) \? null : result;/);
  });
});

describe('auto-continue dependency wiring', () => {
  it('forwards every late-bound helper required by the extracted loop', async () => {
    const wrapper = section(
      host,
      '  const runAutoFixLoop = React.useCallback(async (maxRounds = 3) => {',
      '  const saveProjectToFile = React.useCallback',
    );
    const expressionStart = wrapper.indexOf('async (maxRounds = 3) => {');
    const expressionEnd = wrapper.indexOf('\n  }, [', expressionStart);
    expect(expressionStart).toBeGreaterThan(-1);
    expect(expressionEnd).toBeGreaterThan(expressionStart);
    const functionExpression = wrapper.slice(expressionStart, expressionEnd + 4);
    const objectStart = wrapper.indexOf('_m.runAutoFixLoop(maxRounds, {');
    const objectEnd = wrapper.indexOf('\n    });', objectStart);
    expect(objectStart).toBeGreaterThan(-1);
    expect(objectEnd).toBeGreaterThan(objectStart);
    const forwardedObject = wrapper.slice(objectStart, objectEnd);
    const dependencyNames = Array.from(forwardedObject.matchAll(/^\s*([A-Za-z_$][\w$]*),\s*$/gm), (match) => match[1]);
    for (const name of ['_docPipeline', 'attachVerificationHtmlProof', 'sanitizeStyleForWCAG']) {
      expect(dependencyNames).toContain(name);
    }
    expect(forwardedObject).toContain('saveProjectToFile:');
    expect(forwardedObject).toContain('saveProjectToFileRef.current');

    const sentinels = Object.fromEntries(dependencyNames.map((name) => [name, { dependency: name }]));
    const saveProjectToFileRef = { current: vi.fn(() => 'saved') };
    const delegated = vi.fn(async () => 'loop-result');
    const makeWrapper = new Function(
      'window',
      'saveProjectToFileRef',
      ...dependencyNames,
      `return (${functionExpression});`,
    );
    const runAutoFixLoop = makeWrapper(
      { AlloModules: { MiscHandlers: { runAutoFixLoop: delegated } } },
      saveProjectToFileRef,
      ...dependencyNames.map((name) => sentinels[name]),
    );

    await expect(runAutoFixLoop(6)).resolves.toBe('loop-result');
    expect(delegated).toHaveBeenCalledTimes(1);
    const [rounds, received] = delegated.mock.calls[0];
    expect(rounds).toBe(6);
    for (const name of ['_docPipeline', 'attachVerificationHtmlProof', 'sanitizeStyleForWCAG']) {
      expect(received[name]).toBe(sentinels[name]);
    }
    expect(received.saveProjectToFile(true)).toBe('saved');
    expect(saveProjectToFileRef.current).toHaveBeenCalledWith(true);

    const moduleDeps = miscSource.slice(
      miscSource.indexOf('async function runAutoFixLoop(maxRounds, deps)'),
      miscSource.indexOf('// Re-entry guard', miscSource.indexOf('async function runAutoFixLoop(maxRounds, deps)')),
    );
    for (const name of ['_docPipeline', 'attachVerificationHtmlProof', 'sanitizeStyleForWCAG', 'saveProjectToFile']) {
      expect(moduleDeps).toContain(name);
    }
  });
});
