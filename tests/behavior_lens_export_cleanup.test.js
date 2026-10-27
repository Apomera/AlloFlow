import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('behavior_lens_module.js', 'utf8');
const slice = (first, last) => { const start = source.indexOf(first), end = source.indexOf(last, start); if (start < 0 || end < 0) throw new Error('Export helper boundary missing'); return source.slice(start, end); };
const abort = () => Object.assign(new Error('Synthetic session revoked'), { name: 'AbortError' });
function copyHarness() {
  let current = true;
  const check = () => { if (!current) throw abort(); };
  return { copy: new Function('blExportGuard', slice('    function blTryCopy(text)', '    function blWriteClipboard(') + '\nreturn blTryCopy;')(() => { check(); return check; }), revoke() { current = false; } };
}
function printHarness() {
  window.AlloModules ||= {};
  return new Function('blExportGuard', slice('    const BL_PRINT_CSS =', '    const csvCell =') + '\nreturn window.AlloModules.BehaviorLensPrint;')(() => () => {});
}
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; document.head.querySelectorAll('[data-bl-print-style]').forEach(node => node.remove()); });

describe('temporary clinical export DOM cleanup', () => {
  it.each(['execCommand', 'select'])('removes the plaintext copy control after %s throws', async failingStep => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const retained = [];
    const append = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation(node => { if (node.tagName === 'TEXTAREA') retained.push(node); return append(node); });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => { if (failingStep === 'execCommand') throw new Error('Synthetic copy denied'); return true; }) });
    if (failingStep === 'select') vi.spyOn(HTMLTextAreaElement.prototype, 'select').mockImplementation(() => { throw new Error('Synthetic selection denied'); });
    expect(await copyHarness().copy('SYNTHETIC CLINICAL COPY SENTINEL')).toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
    expect(retained).toHaveLength(1); expect(retained[0].value).toBe('');
  });
  it('clears the temporary value and restores focus after a successful fallback', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const button = document.createElement('button'); document.body.appendChild(button); button.focus();
    let retained;
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => { retained = document.querySelector('textarea'); return true; }) });
    expect(await copyHarness().copy('SYNTHETIC SUCCESSFUL COPY')).toBe(true);
    expect(retained.isConnected).toBe(false); expect(retained.value).toBe(''); expect(document.activeElement).toBe(button);
  });
  it('does not create a fallback copy after clipboard rejection if the session was revoked', async () => {
    const h = copyHarness(); let reject;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise((_resolve, fail) => { reject = fail; }) } });
    const pending = h.copy('SYNTHETIC REVOKED COPY'); h.revoke(); reject(new Error('Synthetic browser refusal'));
    expect(await pending).toBe(false); expect(document.querySelector('textarea')).toBeNull();
  });
  it('removes print copies, styles and listeners if native printing throws', () => {
    const p = printHarness();
    document.body.innerHTML = '<div><div id="ordinary">Ordinary tools</div><section data-bl-panel-content><textarea>SYNTHETIC PRINT SENTINEL</textarea><button id="trigger">Print</button></section></div>';
    const remove = vi.spyOn(window, 'removeEventListener');
    vi.spyOn(window, 'print').mockImplementation(() => { expect(document.querySelector('[data-bl-print-copy]').textContent).toBe('SYNTHETIC PRINT SENTINEL'); throw new Error('Synthetic print unavailable'); });
    expect(() => p.blPrintPanel(document.getElementById('trigger'))).toThrow('Synthetic print unavailable');
    expect(document.querySelectorAll('[data-bl-print-copy],[data-bl-print-style],[data-bl-print-hide],[data-bl-print-path],[data-bl-print-field],[data-bl-print-root]')).toHaveLength(0);
    expect(remove.mock.calls.some(call => call[0] === 'afterprint')).toBe(true);
  });
  it('keeps print content until afterprint and then removes it', () => {
    const p = printHarness();
    document.body.innerHTML = '<section data-bl-panel-content><textarea>SYNTHETIC PRINT SENTINEL</textarea><button id="trigger">Print</button></section>';
    vi.spyOn(window, 'print').mockImplementation(() => {});
    p.blPrintPanel(document.getElementById('trigger')); expect(document.querySelector('[data-bl-print-copy]')).toBeTruthy();
    window.dispatchEvent(new Event('afterprint')); expect(document.querySelectorAll('[data-bl-print-copy],[data-bl-print-style]')).toHaveLength(0);
  });
});
