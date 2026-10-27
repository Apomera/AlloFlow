import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('behavior_lens_module.js', 'utf8');
const start = source.indexOf('    function blCreateDownloadLink()'), end = source.indexOf('    function blOpenReadableWindow(', start);
if (start < 0 || end <= start) throw new Error('BehaviorLens download helper anchors changed');
function fixture(failure) {
  const blobs = new Map([['blob:synthetic-clinical-download', new Blob(['SYNTHETIC CLINICAL RECORD'])]]);
  const url = { revokeObjectURL: vi.fn(value => blobs.delete(value)) };
  const session = { captureEpoch: () => 7, assertCurrent() { if (failure === 'stale') throw Object.assign(new Error('Synthetic stale session'), { name: 'AbortError' }); }, assertCanExport() {
    if (failure === 'declined') throw Object.assign(new Error('Synthetic declined export'), { name: 'AbortError' });
    if (failure === 'policy') throw new Error('Synthetic policy refusal');
  } };
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { if (failure === 'click') throw new Error('Synthetic native click failure'); });
  const create = new Function('blRequireProtectedSession', 'document', 'URL', source.slice(start, end) + '\nreturn blCreateDownloadLink;')(() => session, document, url);
  const link = create(); link.href = 'blob:synthetic-clinical-download'; link.download = 'synthetic.json'; document.body.appendChild(link);
  return { link, blobs, url, click };
}
afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });
describe('BehaviorLens refused or failed download cleanup', () => {
  it.each(['click', 'policy'])('removes readable output when %s throws', failure => {
    const h = fixture(failure); expect(() => h.link.click()).toThrow('Synthetic');
    expect(h.blobs.size).toBe(0); expect(h.link.isConnected).toBe(false); expect(h.link.hasAttribute('href')).toBe(false);
  });
  it.each(['declined', 'stale'])('removes readable output after %s cancellation', failure => {
    const h = fixture(failure); expect(h.link.click()).toBe(false); expect(h.click).not.toHaveBeenCalled();
    expect(h.blobs.size).toBe(0); expect(h.link.isConnected).toBe(false); expect(h.link.hasAttribute('href')).toBe(false);
  });
  it('preserves the successful handoff for its existing caller cleanup', () => {
    const h = fixture(); expect(h.link.click()).toBeUndefined(); expect(h.click).toHaveBeenCalledOnce();
    expect(h.link.isConnected).toBe(true); expect(h.link.href).toBe('blob:synthetic-clinical-download'); expect(h.blobs.size).toBe(1);
    document.body.removeChild(h.link); h.url.revokeObjectURL(h.link.href); expect(h.blobs.size).toBe(0);
  });
});
