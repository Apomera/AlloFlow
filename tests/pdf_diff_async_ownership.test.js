import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const miscView = read('view_misc_panels_source.jsx');
const host = read('AlloFlowANTI.txt');
const auditView = read('view_pdf_audit_source.jsx');

const helperStart = miscView.indexOf('function _createPdfDiffOperationManager');
const helperEnd = miscView.indexOf('function PdfDiffViewer', helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error('PdfDiff operation-manager markers missing');
const createOperationManager = new Function(
  miscView.slice(helperStart, helperEnd) + '\nreturn _createPdfDiffOperationManager;'
)();

const deferred = () => {
  let resolvePromise;
  const promise = new Promise((resolveValue) => { resolvePromise = resolveValue; });
  return { promise, resolve: resolvePromise };
};

const makeController = () => {
  const signal = { aborted: false };
  return {
    signal,
    abort() { signal.aborted = true; },
  };
};

const makeDocumentHarness = () => {
  let epoch = 1;
  let revision = 0;
  let result = { accessibleHtml: '<main>A</main>', finalText: 'A' };
  const capture = () => ({ documentEpoch: epoch, revision, html: result.accessibleHtml });
  const isCurrent = (token) => !!(token
    && token.documentEpoch === epoch
    && token.revision === revision
    && token.html === result.accessibleHtml);
  const commit = (token, updater) => {
    if (!isCurrent(token)) return false;
    const next = typeof updater === 'function' ? updater(result) : updater;
    if (!next || !isCurrent(token)) return false;
    const htmlChanged = next.accessibleHtml !== result.accessibleHtml;
    result = next;
    if (htmlChanged) revision += 1;
    return true;
  };
  const open = (name, html) => {
    epoch += 1;
    revision += 1;
    result = { accessibleHtml: html, finalText: name };
  };
  return {
    capture,
    commit,
    isCurrent,
    open,
    result: () => result,
  };
};

describe('PdfDiff asynchronous document ownership', () => {
  it('rejects deferred document A after document B opens, even when A resolves last', async () => {
    const manager = createOperationManager(makeController);
    const documentState = makeDocumentHarness();
    const responseA = deferred();
    const ownerA = manager.begin(documentState.capture(), 'refine');
    const lateACommit = (async () => {
      const lateHtml = await responseA.promise;
      return manager.commit(ownerA, documentState.isCurrent, documentState.commit, (prev) => ({
        ...prev,
        accessibleHtml: lateHtml,
        finalText: 'A-late',
      }));
    })();

    documentState.open('B', '<main>B</main>');
    const ownerB = manager.begin(documentState.capture(), 'refine');
    expect(ownerA.signal.aborted).toBe(true);

    responseA.resolve('<main>A resolved after B</main>');
    expect(await lateACommit).toBe(false);
    expect(documentState.result()).toEqual({ accessibleHtml: '<main>B</main>', finalText: 'B' });
    expect(manager.finish(ownerA)).toBe(false);
    expect(manager.isCurrent(ownerB, documentState.isCurrent)).toBe(true);

    expect(manager.commit(ownerB, documentState.isCurrent, documentState.commit, (prev) => ({
      ...prev,
      accessibleHtml: '<main>B refined</main>',
      finalText: 'B refined',
    }))).toBe(true);
    expect(documentState.result()).toEqual({
      accessibleHtml: '<main>B refined</main>',
      finalText: 'B refined',
    });
  });

  it('rejects an old token when the document changes without a replacement operation', () => {
    const manager = createOperationManager(makeController);
    const documentState = makeDocumentHarness();
    const ownerA = manager.begin(documentState.capture(), 'apply');
    documentState.open('B', '<main>B</main>');
    expect(manager.commit(ownerA, documentState.isCurrent, documentState.commit, (prev) => ({
      ...prev,
      accessibleHtml: '<main>stale A</main>',
    }))).toBe(false);
    expect(documentState.result().accessibleHtml).toBe('<main>B</main>');
  });

  it('wires every async Diff mutation through cancellation and an atomic host CAS', () => {
    const handlerStart = miscView.indexOf('const _applyAndExport = async');
    const handlerEnd = miscView.indexOf('const _closeDiff =', handlerStart);
    const handlers = miscView.slice(handlerStart, handlerEnd);
    expect(handlers.match(/callGeminiForRemarkup\(_remarkupOwner/g)).toHaveLength(3);
    expect(handlers).not.toMatch(/await callGemini\(/);
    expect(handlers.match(/commitRemarkupOperation\(_remarkupOwner/g)).toHaveLength(3);
    expect(miscView).toContain('if (resolve) resolve(false);');
    expect(host).toContain('isPdfHtmlCommitTokenCurrent');
    expect(host).toContain('pdfDocumentEpoch: pdfDocumentSelectionEpochRef.current');
    expect(auditView).toContain('mediaDigesting || applyingRemarkup || !!webJobBusy');
  });
});
