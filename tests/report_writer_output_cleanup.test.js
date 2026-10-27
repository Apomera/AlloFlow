import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('report_writer_module.js', 'utf8');
function between(first, last) {
  const start = source.indexOf(first), end = source.indexOf(last, start);
  if (start < 0 || end <= start) throw new Error('Report output anchors changed');
  return source.slice(start, end);
}
const exportSource = between('        const exportJSON = () => {', '        // The incoming JSON');
const printSource = between('        const printReport = () => {', '        const printHtmlArgs =');
const sentinel = 'SYNTHETIC CLINICAL EXPORT SENTINEL';
afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });
function jsonFixture() {
  const blobs = new Map(), saved = vi.fn(), toast = vi.fn(), timers = [], allow = vi.fn(() => true);
  const url = { createObjectURL: vi.fn(blob => { blobs.set('blob:synthetic-clinical-export', blob); return 'blob:synthetic-clinical-export'; }), revokeObjectURL: vi.fn(key => blobs.delete(key)) };
  const values = { allowReadableExport: allow, buildReportSnapshot: () => ({ reportSections: { Summary: sentinel } }), setSavedSnapshot: saved, snapshotKey: () => sentinel,
    Blob, document, URL: url, sanitizeFilenamePart: value => value, effectiveStudentName: 'SyntheticOtter', setTimeout: fn => timers.push(fn), addToast: toast, t: key => key, __alloT: (_key, fallback) => fallback };
  const run = new Function(...Object.keys(values), exportSource + '\nreturn exportJSON;')(...Object.values(values));
  return { blobs, saved, toast, url, run, timers, allow };
}
function printFixture() {
  const popupDocument = document.implementation.createHTMLDocument('Synthetic print'), close = vi.fn(), toast = vi.fn(), allow = vi.fn(() => true);
  const popup = { document: popupDocument, opener: window, close, print: vi.fn() }, open = vi.fn(() => popup);
  const values = { requireFormalExportReady: () => true, allowReadableExport: allow, window: { open }, buildReportPrintHtml: () => '<!doctype html><html><body>' + sentinel + '</body></html>', printHtmlArgs: () => ({}), addToast: toast, __alloT: (_key, fallback) => fallback };
  const run = new Function(...Object.keys(values), printSource + '\nreturn printReport;')(...Object.values(values));
  return { popupDocument, popup, close, toast, open, allow, run };
}
describe('Report Writer temporary output cleanup', () => {
  it.each(['click', 'append', 'createURL'])('cleans a failed %s download and preserves the unsaved-state warning', step => {
    const h = jsonFixture();
    if (step === 'click') vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('Synthetic download failure'); });
    if (step === 'append') vi.spyOn(document.body, 'appendChild').mockImplementation(() => { throw new Error('Synthetic DOM failure'); });
    if (step === 'createURL') h.url.createObjectURL.mockImplementation(() => { throw new Error('Synthetic resource failure'); });
    expect(h.run()).toBe(false);
    expect(document.querySelectorAll('a[href^="blob:"]')).toHaveLength(0); expect(h.blobs.size).toBe(0);
    expect(h.saved).not.toHaveBeenCalled(); expect(h.toast).toHaveBeenCalledWith(expect.stringContaining('could not start'), 'error');
    expect(h.toast.mock.calls.some(args => args[1] === 'success')).toBe(false);
  });
  it('retains successful initiation, delayed URL revocation and the completed snapshot', () => {
    const h = jsonFixture(), click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { expect(h.saved).not.toHaveBeenCalled(); });
    expect(h.run()).toBe(true); expect(click).toHaveBeenCalledOnce(); expect(h.saved).toHaveBeenCalledWith(sentinel);
    expect(document.querySelectorAll('a[href^="blob:"]')).toHaveLength(0); expect(h.blobs.size).toBe(1);
    h.timers.forEach(fn => fn()); expect(h.blobs.size).toBe(0);
  });
  it('does not allocate a readable download when export approval is declined', () => {
    const h = jsonFixture(); h.allow.mockReturnValue(false); h.run(); expect(h.url.createObjectURL).not.toHaveBeenCalled(); expect(h.saved).not.toHaveBeenCalled();
  });
  it.each(['write', 'close', 'print'])('blanks and closes temporary print data when %s fails', step => {
    const h = printFixture();
    if (step === 'write') { const original = h.popupDocument.write.bind(h.popupDocument); vi.spyOn(h.popupDocument, 'write').mockImplementation(html => { original(html); throw new Error('Synthetic partial write failure'); }); }
    if (step === 'close') vi.spyOn(h.popupDocument, 'close').mockImplementation(() => { throw new Error('Synthetic document close failure'); });
    if (step === 'print') h.popup.print.mockImplementation(() => { throw new Error('Synthetic print failure'); });
    expect(h.run()).toBe(false); expect(h.popupDocument.documentElement.textContent).not.toContain(sentinel); expect(h.close).toHaveBeenCalledOnce();
    expect(h.toast).toHaveBeenCalledWith(expect.stringContaining('could not be printed'), 'error');
  });
  it('still attempts popup close if its document is no longer readable', () => {
    const h = printFixture(); Object.defineProperty(h.popup, 'document', { get() { throw new Error('Synthetic document unavailable'); } });
    expect(h.run()).toBe(false); expect(h.close).toHaveBeenCalledOnce();
  });
  it('leaves a successfully prepared print preview open', () => {
    const h = printFixture(); expect(h.run()).toBe(true); expect(h.popup.opener).toBeNull(); expect(h.popup.print).toHaveBeenCalledOnce();
    expect(h.popupDocument.body.textContent).toContain(sentinel); expect(h.close).not.toHaveBeenCalled();
  });
  it('handles a blocked popup without writing a report', () => {
    const h = printFixture(); h.open.mockReturnValue(null); expect(h.run()).toBe(false); expect(h.popup.print).not.toHaveBeenCalled(); expect(h.toast).toHaveBeenCalledWith(expect.stringContaining('blocked'), 'error');
  });
  it('does not open a print popup after declined export approval', () => {
    const h = printFixture(); h.allow.mockReturnValue(false); h.run(); expect(h.open).not.toHaveBeenCalled();
  });
});
