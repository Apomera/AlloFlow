import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js'), Crypto = require('../allo_crypto_module.js'), Vault = require('../allo_device_vault_module.js');
const source = readFileSync('dynamic_assessment_module.js', 'utf8');
const between = (first, last) => { const start = source.indexOf(first), end = source.indexOf(last, start); if (start < 0 || end <= start) throw new Error('DA source anchors changed'); return source.slice(start, end); };
const code = between('    function daAssertOperation()', '    props = Object.assign({}, props, daBlockedParentCallbacks') + between('    function daDownloadBlob(', '    function exportAllSessionsEncrypted(');
function downloadCallback(label) {
  const end = source.indexOf('            "aria-label": "' + label + '"') >= 0 ? source.indexOf('            "aria-label": "' + label + '"') : source.indexOf('              "aria-label": "' + label + '"');
  if (end < 0) throw new Error('DA CSV label anchor changed');
  const start = source.lastIndexOf('onClick: function () {', end), chunk = source.slice(start + 'onClick: '.length, end).trim();
  if (start < 0 || !chunk.endsWith(',')) throw new Error('DA CSV callback source anchors changed');
  return chunk.slice(0, -1);
}
const services = [];
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
async function fixture() {
  const repository = { revision: 0, store: null, async read() { return { revision: this.revision, store: clone(this.store) }; }, async compareAndSwap(revision, value) { if (revision !== this.revision) return false; this.store = clone(value); this.revision++; return true; } };
  const service = SW.createService({ repository, vaultModule: Vault, crypto: Crypto, lifecycle: false, cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, getContext: () => ({ isCanvas: true, learner: false }), policy: { version: 1, allowCanvasRecords: true }, confirmExport: () => true });
  services.push(service); await service.setup('synthetic-export-password'); const recoveryInput = service.getStatus().setupRecoveryCode; await service.exportBackup(); await service.finishSetup({ recoveryInput, backupSaved: true });
  const workspace = service.getSession('dynamic-assessment'), urls = new Map(), timers = [], addToast = vi.fn();
  const urlApi = { createObjectURL: vi.fn(blob => { const url = 'blob:synthetic-' + (urls.size + 1); urls.set(url, blob); return url; }), revokeObjectURL: vi.fn(url => urls.delete(url)) };
  const env = { workspace, daRenderEpoch: workspace.captureEpoch(), props: { addToast }, addToast, document, URL: urlApi, Blob, setTimeout: fn => { timers.push(fn); }, daRedactSessionForExport: value => value, DA_SCHEMA_VERSION: 1, daAskConfirm: opts => opts.onConfirm(), daFullExportWarning: 'Synthetic export confirmation', daExportFullLabel: 'Export', state: { sessions: [] }, allStats: [], buildSessionStatsCsv: () => 'SYNTHETIC SESSION CSV', buildItemAnalyticsCsv: () => 'SYNTHETIC ITEM CSV' };
  const api = new Function(...Object.keys(env), code + '\nreturn { exportSessionAsJson, downloadDaBackup, sessionCsv: (' + downloadCallback('Download all session statistics as CSV') + '), itemCsv: (' + downloadCallback('Download item analytics as CSV') + ') };')(...Object.values(env));
  const record = { id: 'synthetic-record', studentNickname: 'SYNTHETIC RETAINED CLINICAL CANARY', dateStarted: '2026-10-26T00:00:00.000Z' };
  return { service, api, urls, timers, record, urlApi, addToast };
}
afterEach(() => { services.splice(0).forEach(service => service.dispose()); document.body.innerHTML = ''; vi.restoreAllMocks(); });
describe('DA temporary download handles', () => {
  it('allows a current reviewed JSON download and revokes its handle after the normal delay', async () => {
    const h = await fixture(), click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    h.api.exportSessionAsJson(h.record, 'full'); expect(click).toHaveBeenCalledOnce(); expect(h.urls.size).toBe(1);
    h.timers.splice(0).forEach(fn => fn()); expect(h.urls.size).toBe(0); expect(document.querySelectorAll('a')).toHaveLength(0);
  });
  it('removes a failed readable download handle before a later workspace lock', async () => {
    const h = await fixture(); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('Synthetic download refusal'); });
    h.api.exportSessionAsJson(h.record, 'full'); await h.service.lock('synthetic-audit');
    expect(document.querySelectorAll('a')).toHaveLength(0); expect(h.urls.size).toBe(0);
  });
  it('revokes the readable URL when filename preparation fails', async () => {
    const h = await fixture(); h.api.exportSessionAsJson({ ...h.record, dateStarted: 'invalid-date' }, 'full');
    expect(h.urls.size).toBe(0); expect(document.querySelectorAll('a')).toHaveLength(0);
  });
  it('revokes a completed download even if its temporary anchor was already removed', async () => {
    const h = await fixture(); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    h.api.exportSessionAsJson(h.record, 'full'); document.querySelector('a').remove(); h.timers.splice(0).forEach(fn => fn());
    expect(h.urls.size).toBe(0);
  });
  it('also cleans the encrypted backup handle if native click fails', async () => {
    const h = await fixture(); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('Synthetic download refusal'); });
    expect(() => h.api.downloadDaBackup({ encrypted: 'synthetic' }, 'synthetic.json')).toThrow('Synthetic download refusal');
    expect(document.querySelectorAll('a')).toHaveLength(0); expect(h.urls.size).toBe(0);
  });
  it.each(['sessionCsv', 'itemCsv'])('cleans %s failures and does not report success', async operation => {
    const h = await fixture(); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('Synthetic download refusal'); });
    h.api[operation](); expect(h.urls.size).toBe(0); expect(document.querySelectorAll('a')).toHaveLength(0);
    expect(h.addToast).toHaveBeenCalledOnce(); expect(h.addToast.mock.calls[0][0]).toMatch(/^CSV export failed:/);
  });
  it('denies stale export callbacks before allocating a URL', async () => {
    const h = await fixture(); await h.service.lock('synthetic-stale-export'); h.api.exportSessionAsJson(h.record, 'full'); h.api.sessionCsv(); h.api.itemCsv();
    expect(() => h.api.downloadDaBackup({}, 'synthetic.json')).toThrow();
    expect(h.urlApi.createObjectURL).not.toHaveBeenCalled();
  });
  it('revokes independently when anchor cleanup itself throws', async () => {
    const h = await fixture(); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    h.api.exportSessionAsJson(h.record, 'full'); vi.spyOn(document.body, 'removeChild').mockImplementation(() => { throw new Error('Synthetic detached DOM'); });
    h.timers.splice(0).forEach(fn => fn()); expect(h.urls.size).toBe(0); expect(document.querySelector('a').hasAttribute('href')).toBe(false);
  });
});
