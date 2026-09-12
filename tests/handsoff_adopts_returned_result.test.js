// Hands-off wrapper adopts the pipeline's returned result (field log 2026-09-11).
//
// The pipeline publishes setPdfFixResult through window.__docPipelineState, a page-global that the
// LAST-RENDERED host instance owns. The 09-11 Canvas log showed two live hosts (host-2 / host-4):
// fixAndVerifyPdf returned a scored result to the click-owning host (run-1-returned:
// returned.present=true, refHeld.present=false), runAutoFixLoop then read that host's EMPTY ref,
// ran zero rounds and resolved undefined, and the wrapper stopped as "no result" with the final
// full audit skipped. The wrapper now publishes the returned result through the view's own
// (instance-bound) setPdfFixResult before deciding anything, and an empty ref after a round reads
// as "no progress", never "no result". runAutoFixLoop says when it never ran.
//
// These live in onClick / loop code that cannot be unit-executed here, so the load-bearing
// structure is pinned by source; the sentinel is exercised behaviourally on the extracted function.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const viewSrc = read('view_pdf_audit_source.jsx');
const viewMod = read('view_pdf_audit_module.js');
const miscSrc = read('misc_handlers_source.jsx');
const miscMod = read('misc_handlers_module.js');

const wrapperOf = (text, quote) => {
  const start = text.indexOf(`_handsLog(${quote}run-1-returned${quote}`);
  const end = text.indexOf(`_handsLog(${quote}loop-round${quote}`, start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end + 400);
};

describe('hands-off wrapper adopts the returned result into its own host before continuing', () => {
  for (const [label, text, q] of [['source', viewSrc, "'"], ['module', viewMod, '"']]) {
    const wrapper = wrapperOf(text, q);
    it(`${label}: publishes _res through the view's setPdfFixResult when the ref does not hold it`, () => {
      expect(wrapper).toContain('const _handsAdoptReturned = () => {');
      expect(wrapper).toContain('setPdfFixResult(_res);');
      expect(wrapper).toContain(`_handsLog(${q}adopted-returned-result${q}`);
      // adoption happens BEFORE the continue decision is logged
      expect(wrapper.indexOf('_handsAdoptReturned();')).toBeLessThan(wrapper.indexOf(`_handsLog(${q}continue-decision${q}`));
    });
    it(`${label}: adoption is epoch-gated and idempotent (same object or same HTML already held)`, () => {
      expect(wrapper).toContain('!_oneClickDocumentIsCurrent()) return false;');
      expect(wrapper).toContain('if (_held && (_held === _res || _held.accessibleHtml === _res.accessibleHtml)) return false;');
    });
    it(`${label}: the ref is preferred but the returned result is the fallback, before and after each round`, () => {
      expect(wrapper).toContain('let r = pdfFixResultRef.current || _res;');
      expect(wrapper).toContain('r = pdfFixResultRef.current || r;');
      expect(wrapper).not.toContain('let r = _res || pdfFixResultRef.current;');
    });
  }
});

describe('runAutoFixLoop reports when it never ran', () => {
  for (const [label, text] of [['source', miscSrc], ['module', miscMod]]) {
    it(`${label}: returns the started:false sentinel on an empty ref, before any side effect`, () => {
      const start = text.indexOf('async function runAutoFixLoop(maxRounds, deps)');
      const body = text.slice(start, text.indexOf('let cur = pdfFixResultRef.current;', start));
      const sentinel = "if (!pdfFixResultRef.current || !pdfFixResultRef.current.accessibleHtml) return { started: false, reason: 'no-result' };";
      expect(body).toContain(sentinel);
      // after the re-entry guard, before the abort controller / run slot / running flag are touched
      expect(body.indexOf(sentinel)).toBeGreaterThan(body.indexOf("reason: 'already-running'"));
      expect(body.indexOf(sentinel)).toBeLessThan(body.indexOf('pdfAutoContinueAbortRef.current = false;'));
      expect(body.indexOf(sentinel)).toBeLessThan(body.indexOf('new AbortController()'));
    });
  }

  it('behaviour: an empty ref resolves { started: false, reason: "no-result" } and touches nothing', async () => {
    const start = miscMod.indexOf('async function runAutoFixLoop(maxRounds, deps)');
    const end = miscMod.indexOf('\n}\n', start) + 3;
    const fn = new Function('window', miscMod.slice(start, end) + '\nreturn runAutoFixLoop;')(globalThis);
    const touched = [];
    const deps = new Proxy({
      pdfAutoContinueAbortCtrlRef: { current: null },
      pdfAutoContinueAbortRef: { current: false },
      pdfFixResultRef: { current: null },
      pdfHtmlRevisionRef: { current: 0 },
      addToast: () => touched.push('toast'),
      t: () => '',
      warnLog: () => {},
    }, { get: (o, k) => (k in o ? o[k] : (...a) => touched.push(String(k)) ) });
    await expect(fn(3, deps)).resolves.toEqual({ started: false, reason: 'no-result' });
    expect(touched).toEqual([]);
    expect(deps.pdfAutoContinueAbortCtrlRef.current).toBe(null);
  });
});
