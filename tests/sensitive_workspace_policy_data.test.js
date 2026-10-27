import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const PASSWORD = 'synthetic policy proof passphrase', services = [];
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
function fixture(initialPolicy, initialRetention) {
  let policy = initialPolicy, retention = initialRetention;
  const repository = { store: null, revision: 0, async read() { return { store: copy(this.store), revision: this.revision }; }, async compareAndSwap(expected, value) { if (expected !== this.revision) return false; this.store = copy(value); this.revision++; return true; } };
  const service = SW.createService({ repository, vaultModule: Vault, crypto: Crypto, cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false, getContext: () => ({ isCanvas: true, learner: false }), getPolicy: () => policy, getRetentionPolicy: () => retention });
  services.push(service); return { service, repository, setPolicy(value) { policy = value; }, setRetention(value) { retention = value; } };
}
async function ready(h) { await h.service.setup(PASSWORD); const recoveryInput = h.service.getStatus().setupRecoveryCode; await h.service.exportBackup(); await h.service.finishSetup({ recoveryInput, backupSaved: true }); }
afterEach(() => services.splice(0).forEach(service => service.dispose()));
describe('explicit clinical policy approval requires own validated configuration', () => {
  it('permits an explicit valid Canvas and AI policy', async () => {
    const h = fixture({ version: 1, allowCanvasRecords: true, allowExternalAi: ['report-writer'] }); await ready(h);
    expect(() => h.service.getSession('report-writer').assertCanTransmit('ai')).not.toThrow();
  });
  it('keeps Canvas real records blocked under the default policy', async () => {
    const h = fixture(undefined); await expect(h.service.setup(PASSWORD)).rejects.toMatchObject({ code: 'PROTECTED_CANVAS_NOT_APPROVED' }); expect(h.repository.store).toBeNull();
  });
  it.each([
    ['inherited version', () => Object.assign(Object.create({ version: 1 }), { allowCanvasRecords: true })],
    ['inherited Canvas permission', () => Object.assign(Object.create({ allowCanvasRecords: true }), { version: 1 })],
    ['accessor Canvas permission', () => { const policy = { version: 1 }; Object.defineProperty(policy, 'allowCanvasRecords', { enumerable: true, get: () => true }); return policy; }]
  ])('blocks %s before entering setup', async (_label, make) => {
    const h = fixture(make()); const result = await h.service.setup(PASSWORD).then(value => ({ value }), error => ({ error }));
    expect(result.error).toBeTruthy(); expect(h.service.getStatus().phase).not.toBe('setup'); expect(h.repository.store).toBeNull();
  });
  it.each([['array', ['report-writer']], ['string', 'report-writer']])('rejects inherited AI permission represented as %s', async (_kind, inherited) => {
    const h = fixture({ version: 1, allowCanvasRecords: true, allowExternalAi: [] }); await ready(h); const session = h.service.getSession('report-writer');
    expect(() => session.assertCanTransmit('ai')).toThrow();
    h.setPolicy(Object.assign(Object.create({ allowExternalAi: inherited }), { version: 1, allowCanvasRecords: true }));
    expect(() => session.assertCanTransmit('ai')).toThrow();
  });

  it('accepts frozen and null-prototype own configuration without enabling unlisted features', async () => {
    const config = Object.assign(Object.create(null), { version: 1, allowCanvasRecords: true, allowExternalAi: Object.freeze(['report-writer']) });
    const h = fixture(Object.freeze(config)); await ready(h);
    expect(() => h.service.getSession('report-writer').assertCanTransmit('ai')).not.toThrow();
    expect(() => h.service.getSession('behavior-lens').assertCanTransmit('ai')).toThrow();
  });

  it('keeps omitted optional AI permission disabled in an otherwise valid policy', async () => {
    const h = fixture({ version: 1, allowCanvasRecords: true }); await ready(h);
    expect(() => h.service.getSession('report-writer').assertCanTransmit('ai')).toThrow();
  });

  const malformed = [
    ['missing version', () => ({ allowCanvasRecords: true })],
    ['unknown non-enumerable field', () => Object.defineProperty({ version: 1, allowCanvasRecords: true }, 'unexpected', { value: true })],
    ['symbol field', () => ({ version: 1, allowCanvasRecords: true, [Symbol('approval')]: true })],
    ['array policy', () => Object.assign([], { version: 1, allowCanvasRecords: true })],
    ['non-boolean approval', () => ({ version: 1, allowCanvasRecords: 'true' })],
    ['string feature list', () => ({ version: 1, allowCanvasRecords: true, allowExternalAi: 'report-writer' })],
    ['sparse feature list', () => ({ version: 1, allowCanvasRecords: true, allowExternalAi: new Array(1) })],
    ['excessive feature list', () => ({ version: 1, allowCanvasRecords: true, allowExternalAi: new Array(1000000) })],
    ['duplicate feature list', () => ({ version: 1, allowCanvasRecords: true, allowExternalAi: ['report-writer', 'report-writer'] })],
    ['unknown feature', () => ({ version: 1, allowCanvasRecords: true, allowExternalAi: ['unknown-feature'] })],
    ['array symbol property', () => ({ version: 1, allowCanvasRecords: true, allowExternalAi: Object.assign(['report-writer'], { [Symbol('extra')]: true }) })]
  ];
  it.each(malformed)('blocks %s without persisting a clinical store', async (_label, make) => {
    const h = fixture(make()); await expect(h.service.setup(PASSWORD)).rejects.toMatchObject({ code: 'PROTECTED_CONTEXT_BLOCKED' });
    expect(h.repository.store).toBeNull();
  });

  it.each(['version', 'allowCanvasRecords', 'allowExternalAi', 'array-element'])('rejects the %s accessor without executing it', async field => {
    let calls = 0; const config = { version: 1, allowCanvasRecords: true, allowExternalAi: ['report-writer'] };
    if (field === 'array-element') Object.defineProperty(config.allowExternalAi, '0', { enumerable: true, get() { calls++; return 'report-writer'; } });
    else Object.defineProperty(config, field, { enumerable: true, get() { calls++; return field === 'version' ? 1 : field === 'allowExternalAi' ? ['report-writer'] : true; } });
    const h = fixture(config); await expect(h.service.setup(PASSWORD)).rejects.toMatchObject({ code: 'PROTECTED_CONTEXT_BLOCKED' });
    expect(calls).toBe(0); expect(h.repository.store).toBeNull();
  });

  it('revalidates a mutated feature list before a captured request may proceed', async () => {
    const config = { version: 1, allowCanvasRecords: true, allowExternalAi: ['report-writer'] }, h = fixture(config); await ready(h);
    const session = h.service.getSession('report-writer'), controls = session.createRequestControls(session.captureEpoch());
    expect(() => controls.beforeRequest()).not.toThrow();
    delete config.allowExternalAi[0];
    expect(() => controls.beforeRequest()).toThrow();
  });

  it('can still save and lock existing work after malformed policy revokes ordinary access', async () => {
    const config = { version: 1, allowCanvasRecords: true }, h = fixture(config); await ready(h);
    const session = h.service.getSession('report-writer'); session.storage.setItem('allo_rw_draft', 'SYNTHETIC PRESERVED POLICY DRAFT');
    let calls = 0; const invalid = { version: 1 }; Object.defineProperty(invalid, 'allowCanvasRecords', { get() { calls++; return true; } });
    h.setPolicy(invalid); expect(() => session.storage.getItem('allo_rw_draft')).toThrow();
    await h.service.lock('synthetic-policy-revocation'); expect(h.service.getStatus().phase).toBe('locked'); expect(calls).toBe(0);
    h.setPolicy(config); await h.service.unlock(PASSWORD);
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC PRESERVED POLICY DRAFT');
  });
});

describe('clinical deletion policy uses own data fields', () => {
  const valid = { version: 1, allowCanvasRecords: true };
  it.each([
    ['default', undefined], ['explicit defaults', { version: 1 }],
    ['null prototype', Object.assign(Object.create(null), { version: 1, allowManualDeletion: true, legalHold: false })]
  ])('preserves %s deletion-review configuration', async (_label, retention) => {
    const h = fixture(valid, retention); await ready(h);
    await expect(h.service.prepareDeletion()).resolves.toMatchObject({ kind: 'alloflow-clinical-deletion-review' });
    expect(h.repository.store.kind).toBe('alloflow-recovery-vault');
  });

  it.each([
    ['legal hold', { version: 1, legalHold: true }], ['deletion disabled', { version: 1, allowManualDeletion: false }],
    ['inherited hold field', Object.assign(Object.create({ legalHold: false }), { version: 1 })],
    ['inherited version', Object.create({ version: 1 })], ['unknown field', { version: 1, approval: true }],
    ['symbol field', { version: 1, [Symbol('approval')]: true }], ['non-boolean hold', { version: 1, legalHold: 'false' }]
  ])('blocks %s without deleting or concealing the saved draft', async (_label, retention) => {
    const h = fixture(valid, retention); await ready(h);
    const session = h.service.getSession('report-writer'); session.storage.setItem('allo_rw_draft', 'SYNTHETIC HELD RECORD'); await h.service.flush();
    const before = copy(h.repository.store);
    await expect(h.service.prepareDeletion()).rejects.toMatchObject({ code: 'PROTECTED_DELETION_HELD' });
    expect(h.repository.store).toEqual(before); expect(session.storage.getItem('allo_rw_draft')).toBe('SYNTHETIC HELD RECORD');
  });

  it.each(['version', 'allowManualDeletion', 'legalHold'])('rejects %s retention accessors without executing them', async field => {
    let calls = 0; const retention = { version: 1, allowManualDeletion: true, legalHold: false };
    Object.defineProperty(retention, field, { enumerable: true, get() { calls++; return field === 'version' ? 1 : field === 'allowManualDeletion'; } });
    const h = fixture(valid, retention); await ready(h); const before = copy(h.repository.store);
    await expect(h.service.prepareDeletion()).rejects.toMatchObject({ code: 'PROTECTED_DELETION_HELD' });
    expect(calls).toBe(0); expect(h.repository.store).toEqual(before);
  });
});
