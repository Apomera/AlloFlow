import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const miscSource = read('misc_handlers_source.jsx');
const educatorSource = read('view_educator_hub_modal_source.jsx');

const uploadPrelude = miscSource.slice(0, miscSource.indexOf('const handleLoadProject'));
const uploadRuntime = new Function('window', `${uploadPrelude}\nreturn { handleFileUpload, cancelFileIntakeOperations, classify: _classifyMiscUpload };`)(globalThis.window || {});
const autoLoopSource = miscSource.slice(miscSource.indexOf('async function runAutoFixLoop'));
const runAutoFixLoop = new Function('window', `${autoLoopSource}\nreturn runAutoFixLoop;`)(globalThis.window || {});

class ControlledFileReader {
  static instances = [];

  constructor() {
    this.file = null;
    this.result = null;
    this.mode = null;
    this.readyState = 0;
    this.aborted = false;
    ControlledFileReader.instances.push(this);
  }

  readAsDataURL(file) { this.file = file; this.mode = 'data-url'; this.readyState = 1; }
  readAsText(file) { this.file = file; this.mode = 'text'; this.readyState = 1; }
  async abort() {
    this.aborted = true;
    this.readyState = 2;
    if (this.onabort) await this.onabort({ target: this });
  }

  async succeed(value = 'QUJD') {
    this.readyState = 2;
    this.result = this.mode === 'text'
      ? value
      : `data:${this.file?.type || 'application/octet-stream'};base64,${value}`;
    if (this.onload) await this.onload({ target: this });
  }

  async fail(message = 'reader failed') {
    this.error = new Error(message);
    if (this.onerror) await this.onerror({ target: this });
  }
}

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const uploadDeps = (overrides = {}) => ({
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
  documentIntakeEpoch: 4,
  isPdfDocumentIntakeCurrent: vi.fn(() => true),
  ...overrides,
});

beforeEach(() => {
  ControlledFileReader.instances = [];
  vi.stubGlobal('FileReader', ControlledFileReader);
  window.__alloPdfRunGen = 0;
  window.__alloPdfAbortSignal = null;
});

describe('document intake hard limits and media classification', () => {
  it('rejects an oversized PDF before FileReader even when LargeFileModule is unavailable', async () => {
    const deps = uploadDeps();
    const file = { name: 'too-large.pdf', type: 'application/octet-stream', size: 31 * 1024 * 1024 };

    await uploadRuntime.handleFileUpload({ target: { files: [file] } }, deps);

    expect(ControlledFileReader.instances).toHaveLength(0);
    expect(deps.setError).toHaveBeenCalled();
    expect(deps.setIsExtracting).toHaveBeenLastCalledWith(false);
    expect(deps.setGenerationStep).toHaveBeenLastCalledWith('');
  });

  it('ends extraction cleanly for a non-chunkable file above the inline budget', async () => {
    const deps = uploadDeps();
    const file = { name: 'large.docx', type: '', size: 16 * 1024 * 1024 };

    await uploadRuntime.handleFileUpload({ target: { files: [file] } }, deps);

    expect(ControlledFileReader.instances).toHaveLength(0);
    expect(deps.setError).toHaveBeenCalledWith('toasts.file_large');
    expect(deps.setIsExtracting).toHaveBeenLastCalledWith(false);
    expect(deps.setGenerationStep).toHaveBeenLastCalledWith('');
  });

  it.each([
    [{ name: 'lecture.MP3', type: '', size: 1024 }, 'audio/mpeg', false],
    [{ name: 'demo.mp4', type: 'application/octet-stream', size: 2048 }, 'video/mp4', true],
  ])('routes generic-MIME media by extension', async (file, expectedMime, isVideo) => {
    const deps = uploadDeps();

    await uploadRuntime.handleFileUpload({ target: { files: [file] } }, deps);
    expect(ControlledFileReader.instances).toHaveLength(1);
    await ControlledFileReader.instances[0].succeed();

    expect(deps.setPdfAuditResult).toHaveBeenCalledWith(expect.objectContaining({
      fileName: file.name,
      _mediaPending: { mime: expectedMime, isVideo },
    }));
    expect(deps.setIsExtracting).toHaveBeenLastCalledWith(false);
    expect(deps.setGenerationStep).toHaveBeenLastCalledWith('');
  });

  it('keeps the modal visible until FileReader publishes the remediation chooser', async () => {
    const modal = { loading: true, result: null };
    const writes = [];
    const deps = uploadDeps({
      setPdfAuditResult: vi.fn((result) => {
        modal.result = result;
        writes.push('result:' + result.fileName);
      }),
      setPdfAuditLoading: vi.fn((loading) => {
        modal.loading = loading;
        writes.push('loading:' + loading);
      }),
    });
    const file = { name: 'deferred.pdf', type: 'application/pdf', size: 4096 };

    await uploadRuntime.handleFileUpload({ target: { files: [file] } }, deps);

    expect(ControlledFileReader.instances).toHaveLength(1);
    expect(deps.setPdfAuditLoading).not.toHaveBeenCalled();
    expect(modal.loading || modal.result).toBeTruthy();

    await ControlledFileReader.instances[0].succeed('JVBERi0xLjQ=');

    expect(writes).toEqual(['result:deferred.pdf', 'loading:false']);
    expect(deps.setPdfAuditLoading).toHaveBeenLastCalledWith(false);
    expect(modal.loading || modal.result).toBeTruthy();
  });

  it('does not let a stale FileReader completion dismiss a newer intake modal', async () => {
    const activeEpoch = { current: 1 };
    const modal = { loading: true, result: null };
    const setPdfAuditLoading = vi.fn((loading) => { modal.loading = loading; });
    const setPdfAuditResult = vi.fn((result) => { modal.result = result; });
    const isCurrent = vi.fn((epoch) => epoch === activeEpoch.current);
    const oldDeps = uploadDeps({
      documentIntakeEpoch: 1,
      isPdfDocumentIntakeCurrent: isCurrent,
      setPdfAuditLoading,
      setPdfAuditResult,
    });
    const newDeps = uploadDeps({
      documentIntakeEpoch: 2,
      isPdfDocumentIntakeCurrent: isCurrent,
      setPdfAuditLoading,
      setPdfAuditResult,
    });

    await uploadRuntime.handleFileUpload({
      target: { files: [{ name: 'old.pdf', type: 'application/pdf', size: 10 }] },
    }, oldDeps);
    activeEpoch.current = 2;
    modal.loading = true;
    modal.result = null;
    await uploadRuntime.handleFileUpload({
      target: { files: [{ name: 'new.pdf', type: 'application/pdf', size: 20 }] },
    }, newDeps);

    await ControlledFileReader.instances[0].succeed('T0xE');
    expect(ControlledFileReader.instances[0].aborted).toBe(true);
    expect(setPdfAuditLoading).not.toHaveBeenCalled();
    expect(modal.loading || modal.result).toBeTruthy();

    await ControlledFileReader.instances[1].succeed('TkVX');
    expect(setPdfAuditResult).toHaveBeenLastCalledWith(expect.objectContaining({ fileName: 'new.pdf' }));
    expect(setPdfAuditLoading).toHaveBeenCalledTimes(1);
    expect(setPdfAuditLoading).toHaveBeenLastCalledWith(false);
    expect(modal.loading || modal.result).toBeTruthy();
  });

  it('aborts deferred workbook work and suppresses every late finalizer after invalidation', async () => {
    const conversion = deferred();
    let conversionSignal = null;
    const deps = uploadDeps({
      convertXlsxToMarkdownTables: vi.fn((_b64, options) => {
        conversionSignal = options.signal;
        return conversion.promise;
      }),
    });

    await uploadRuntime.handleFileUpload({
      target: { files: [{ name: 'cancelled.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 100 }] },
    }, deps);
    const pendingRead = ControlledFileReader.instances[0].succeed('V09SS0JPT0s=');
    await vi.waitFor(() => expect(deps.convertXlsxToMarkdownTables).toHaveBeenCalledTimes(1));
    expect(conversionSignal?.aborted).toBe(false);

    deps.setPendingPdfBase64.mockClear();
    deps.setPdfAuditResult.mockClear();
    deps.setError.mockClear();
    deps.setIsExtracting.mockClear();
    deps.setGenerationStep.mockClear();
    deps.addToast.mockClear();
    expect(uploadRuntime.cancelFileIntakeOperations()).toBe(true);
    expect(conversionSignal?.aborted).toBe(true);
    conversion.resolve({ text: '| A |\n| --- |', sheets: 1, truncatedRows: 0 });
    await pendingRead;

    expect(deps.setPendingPdfBase64).not.toHaveBeenCalled();
    expect(deps.setPdfAuditResult).not.toHaveBeenCalled();
    expect(deps.setError).not.toHaveBeenCalled();
    expect(deps.setIsExtracting).not.toHaveBeenCalled();
    expect(deps.setGenerationStep).not.toHaveBeenCalled();
    expect(deps.addToast).not.toHaveBeenCalled();
  });

  it('settles the host loading state when no file reaches the module', async () => {
    const deps = uploadDeps();

    await uploadRuntime.handleFileUpload({ target: { files: [] } }, deps);

    expect(ControlledFileReader.instances).toHaveLength(0);
    expect(deps.setIsExtracting).toHaveBeenLastCalledWith(false);
    expect(deps.setGenerationStep).toHaveBeenLastCalledWith('');
    expect(deps.setPdfAuditLoading).toHaveBeenLastCalledWith(false);
  });

  it('clears extraction status after an ordinary PDF reaches remediation intake', async () => {
    const deps = uploadDeps();
    const file = { name: 'lesson.pdf', type: 'application/pdf', size: 4096 };

    await uploadRuntime.handleFileUpload({ target: { files: [file] } }, deps);
    await ControlledFileReader.instances[0].succeed('JVBERi0xLjQ=');

    expect(deps.setPendingPdfBase64).toHaveBeenLastCalledWith('JVBERi0xLjQ=');
    expect(deps.setPdfAuditResult).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'lesson.pdf' }));
    expect(deps.setIsExtracting).toHaveBeenLastCalledWith(false);
    expect(deps.setGenerationStep).toHaveBeenLastCalledWith('');
  });

  it('clears extraction status after an ordinary text upload succeeds', async () => {
    const deps = uploadDeps();
    const file = { name: 'notes.txt', type: 'text/plain', size: 128 };

    await uploadRuntime.handleFileUpload({ target: { files: [file] } }, deps);
    await ControlledFileReader.instances[0].succeed('Useful classroom notes');

    expect(deps.setInputText).toHaveBeenLastCalledWith('Useful classroom notes');
    expect(deps.setIsExtracting).toHaveBeenLastCalledWith(false);
    expect(deps.setGenerationStep).toHaveBeenLastCalledWith('');
  });

  it('clears extraction status after FileReader failure', async () => {
    const deps = uploadDeps();
    const file = { name: 'broken.pdf', type: 'application/pdf', size: 256 };

    await uploadRuntime.handleFileUpload({ target: { files: [file] } }, deps);
    await ControlledFileReader.instances[0].fail();

    expect(deps.setError).toHaveBeenLastCalledWith('quick_start.error_read_file');
    expect(deps.setIsExtracting).toHaveBeenLastCalledWith(false);
    expect(deps.setGenerationStep).toHaveBeenLastCalledWith('');
  });

  it('keeps a superseded reader callback write-free', async () => {
    let current = true;
    const deps = uploadDeps({ isPdfDocumentIntakeCurrent: vi.fn(() => current) });
    const file = { name: 'old.pdf', type: 'application/pdf', size: 256 };

    await uploadRuntime.handleFileUpload({ target: { files: [file] } }, deps);
    deps.setPendingPdfBase64.mockClear();
    deps.setPendingPdfFile.mockClear();
    deps.setPdfAuditResult.mockClear();
    deps.setIsExtracting.mockClear();
    deps.setGenerationStep.mockClear();
    current = false;
    await ControlledFileReader.instances[0].succeed('JVBERi0xLjQ=');

    expect(deps.setPendingPdfBase64).not.toHaveBeenCalled();
    expect(deps.setPendingPdfFile).not.toHaveBeenCalled();
    expect(deps.setPdfAuditResult).not.toHaveBeenCalled();
    expect(deps.setIsExtracting).not.toHaveBeenCalled();
    expect(deps.setGenerationStep).not.toHaveBeenCalled();
  });

  it('routes long generic-MIME media without base64 expansion and releases extraction state', async () => {
    const deps = uploadDeps();
    const file = { name: 'seminar.WEBM', type: 'application/octet-stream', size: 16 * 1024 * 1024 };

    await uploadRuntime.handleFileUpload({ target: { files: [file] } }, deps);

    expect(ControlledFileReader.instances).toHaveLength(0);
    expect(deps.setPdfAuditResult).toHaveBeenCalledWith(expect.objectContaining({
      _mediaPending: { mime: 'video/webm', isVideo: true, chunked: true },
    }));
    expect(deps.setIsExtracting).toHaveBeenLastCalledWith(false);
    expect(deps.setGenerationStep).toHaveBeenLastCalledWith('');
  });

  it('does not let deferred run A announce or clear replacement run B', async () => {
    const roundA = deferred();
    const deps = failingAutoLoopDeps();
    deps.aiFixChunked = vi.fn(() => roundA.promise);

    const runA = runAutoFixLoop(1, deps);
    await vi.waitFor(() => expect(deps.aiFixChunked).toHaveBeenCalledTimes(1));

    const runBController = new AbortController();
    window.__alloPdfRunGen += 1;
    window.__alloPdfAbortSignal = runBController.signal;
    deps.pdfAutoContinueAbortCtrlRef.current = runBController;
    deps.pdfAutoContinueAbortRef.current = false;
    roundA.reject(new Error('late run A failure'));
    await runA;

    expect(deps.pdfAutoContinueAbortCtrlRef.current).toBe(runBController);
    expect(deps.setPdfAutoContinueRunning).not.toHaveBeenCalledWith(false);
    expect(deps.setPdfFixLoading).not.toHaveBeenCalledWith(false);
    expect(deps.setPdfFixStep).not.toHaveBeenCalledWith('');
    expect(deps.addToast).not.toHaveBeenCalled();
    expect(deps.saveProjectToFile).not.toHaveBeenCalled();
  });
});

const failingAutoLoopDeps = () => {
  const initial = {
    accessibleHtml: '<main><h1>Source</h1></main>',
    sourceText: 'Source',
    afterScore: 70,
    afterScoreVerified: false,
    verificationState: 'partial',
    requiresManualReview: true,
    axeAudit: { score: 100, totalViolations: 0, violations: [] },
    secondEngineAudit: { score: 100, failViolations: 0, fails: [] },
    verificationAudit: { score: 70, issues: [{ wcag: '1.3.1', issue: 'Missing structure.' }] },
  };
  const pdfFixResultRef = { current: initial };
  return {
    pdfAutoContinueAbortCtrlRef: { current: null },
    pdfAutoContinueAbortRef: { current: false },
    pdfFixResultRef,
    pdfHtmlRevisionRef: { current: 0 },
    setPdfAutoContinueRunning: vi.fn(),
    setPdfFixLoading: vi.fn(),
    setPdfFixResult: vi.fn(),
    setPdfFixStep: vi.fn(),
    pdfFixLoading: false,
    pdfTargetScore: 95,
    pdfAutoFixPasses: 1,
    autoFixAxeViolations: vi.fn(),
    aiFixChunked: vi.fn(async () => { throw new Error('provider failed'); }),
    waitForGeminiCalm: vi.fn(async () => {}),
    runAxeAudit: vi.fn(),
    runEqualAccessAudit: vi.fn(),
    deriveVerificationState: vi.fn(),
    createVerificationHtmlBinding: vi.fn(),
    applyVerificationHtmlBinding: vi.fn(),
    isLiveVerificationHtmlBound: vi.fn(() => false),
    enforceVerificationHtmlBinding: vi.fn((value) => value),
    formatVerificationReason: vi.fn((reason) => String(reason || '')),
    auditOutputAccessibility: vi.fn(),
    recomputeIssueResolution: vi.fn(),
    recomputeContentFidelity: vi.fn(),
    _docPipeline: { equalAccessUnavailable: vi.fn(() => false), finalizeRemediationRound: vi.fn() },
    sanitizeStyleForWCAG: vi.fn(),
    attachVerificationHtmlProof: vi.fn(),
    saveProjectToFile: vi.fn(),
    addToast: vi.fn(),
    pdfAutoSaveProject: true,
    t: (key) => key,
    warnLog: vi.fn(),
  };
};

describe('auto-remediation failure ownership', () => {
  it('handles a rejected round, clears its flags, and reports the failure without rejecting', async () => {
    const deps = failingAutoLoopDeps();

    await expect(runAutoFixLoop(1, deps)).resolves.toBeUndefined();

    expect(deps.addToast).toHaveBeenCalledWith(expect.stringContaining('provider failed'), 'error');
    expect(deps.setPdfFixLoading).toHaveBeenLastCalledWith(false);
    expect(deps.setPdfAutoContinueRunning).toHaveBeenLastCalledWith(false);
    expect(deps.saveProjectToFile).toHaveBeenCalledWith(true);
  });

  it('never autosaves or clears a newer run when rejection occurs after a generation change', async () => {
    const deps = failingAutoLoopDeps();
    deps.aiFixChunked = vi.fn(async () => {
      window.__alloPdfRunGen += 1;
      throw new Error('late stale failure');
    });

    await expect(runAutoFixLoop(1, deps)).resolves.toBeUndefined();

    expect(deps.saveProjectToFile).not.toHaveBeenCalled();
    expect(deps.setPdfFixLoading).not.toHaveBeenCalledWith(false);
    expect(deps.warnLog).toHaveBeenCalledWith(expect.stringContaining('Stale loop rejected'), expect.anything());
  });
});

describe('Educator Hub batch intake ownership', () => {
  it('applies count, per-file, and aggregate budgets before creating FileReaders', () => {
    const preflight = educatorSource.indexOf('const acceptedPdfFiles = [];');
    const begin = educatorSource.indexOf('beginPdfDocumentIntake({', preflight);
    const reader = educatorSource.indexOf('reader = new FileReader();', preflight);
    expect(preflight).toBeGreaterThan(-1);
    expect(educatorSource).toContain('const _EDUCATOR_BATCH_MAX_FILES = 60;');
    expect(educatorSource).toContain('function _educatorBatchMemoryBudget()');
    expect(educatorSource).toContain('navigator.deviceMemory');
    expect(educatorSource).toContain('Math.max(48, Math.min(128');
    expect(educatorSource).toContain('size > batchBudget.perFileBytes');
    expect(educatorSource).toContain('acceptedBytes + size > batchBudget.totalBytes');
    expect(educatorSource).not.toMatch(/200 MB per-file|300 MB batch memory/);
    expect(begin).toBeGreaterThan(preflight);
    expect(reader).toBeGreaterThan(begin);
  });

  it('keeps token ownership checks, aborts stale reads, and exposes accessible progress cancellation', () => {
    expect(educatorSource).toContain('pdfBatchIntakeRef.current !== intakeJob');
    expect(educatorSource).toContain('isPdfDocumentIntakeCurrent(intakeToken)');
    expect(educatorSource).toContain('reader.abort()');
    expect(educatorSource).toContain('role="status" aria-live="polite"');
    expect(educatorSource).toContain('_cancelPdfBatchIntake(true)');
    expect(educatorSource).toContain('<progress');
  });
});
