import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const PASSWORD = 'synthetic old protected password';
const NEW_PASSWORD = 'synthetic new protected password';
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const services = [];
let oldChannel, channels;
class Repo {
  store = null; revision = 0;
  async read() { return { store: clone(this.store), revision: this.revision }; }
  async compareAndSwap(expected, next) { if (expected !== this.revision) return false; this.store = clone(next); this.revision++; return true; }
}
function service(repository, lifecycle = false) {
  const value = SW.createService({ repository, crypto: Crypto, vaultModule: Vault,
    cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle, saveDelayMs: 60000,
    getContext: () => ({ learner: false, isCanvas: false }) });
  services.push(value); return value;
}
async function ready(value, password = PASSWORD) {
  await value.setup(password);
  const key = value.getStatus().setupRecoveryCode;
  await value.exportBackup(); await value.finishSetup({ recoveryInput: key, backupSaved: true });
}
async function erase(value) {
  return value.deleteClinicalRecords(await value.prepareDeletion(), { phrase: 'DELETE PROTECTED RECORDS', password: PASSWORD,
    retentionApproved: true, holdsReviewed: true, otherClinicalWindowsClosed: true });
}
function barrier() {
  let entered, release;
  const paused = new Promise(resolve => { entered = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  return { paused, release, async pause() { entered(); await wait; } };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 25));
beforeEach(() => {
  oldChannel = window.BroadcastChannel; channels = new Set();
  window.BroadcastChannel = class {
    constructor() { channels.add(this); }
    postMessage(data) { for (const channel of channels) if (channel !== this && channel.onmessage) channel.onmessage({ data }); }
    close() { channels.delete(this); }
  };
});
afterEach(() => { services.splice(0).forEach(value => value.dispose()); window.BroadcastChannel = oldChannel; });

describe('clinical deletion notice generation fences', () => {
  it('does not clear a newly configured workspace when an old durable-read result arrives late', async () => {
    const repository = new Repo(), deleting = service(repository); await ready(deleting);
    const receiving = service(repository, true); await receiving.init(); await receiving.unlock(PASSWORD);
    await receiving.prepareDeletion();
    const receipt = await erase(deleting);
    const gate = barrier(), originalRead = repository.read.bind(repository);
    let intercept = true;
    repository.read = async () => {
      const head = await originalRead();
      if (intercept) { intercept = false; await gate.pause(); }
      return head;
    };
    [...channels][0].onmessage({ data: { kind: 'deleted', marker: receipt.deletedAt } });
    await gate.paused;
    // Locking a paused review observes the deletion before its delayed notice
    // does. A different credential generation then opens new records.
    await receiving.lock('manual'); await ready(receiving, NEW_PASSWORD);
    const current = receiving.getSession('report-writer');
    current.storage.setItem('allo_rw_new_draft', 'SYNTHETIC NEW WORK AFTER DELETION');
    const currentStore = clone(repository.store);
    gate.release(); await tick();
    expect(receiving.getStatus().phase).toBe('ready');
    expect(current.storage.getItem('allo_rw_new_draft')).toBe('SYNTHETIC NEW WORK AFTER DELETION');
    expect(receiving.getStatus().pending).toBe(1);
    expect(repository.store).toEqual(currentStore);
  });

  it('ignores a duplicate prior marker while a new setup is staged on that tombstone', async () => {
    const repository = new Repo(), deleting = service(repository); await ready(deleting);
    const receipt = await erase(deleting);
    const receiving = service(repository, true); await receiving.init();
    await receiving.setup(NEW_PASSWORD);
    const recovery = receiving.getStatus().setupRecoveryCode;
    expect(receiving.getStatus().phase).toBe('setup');
    [...channels][0].onmessage({ data: { kind: 'deleted', marker: receipt.deletedAt } });
    await tick();
    expect(receiving.getStatus().phase).toBe('setup');
    expect(receiving.getStatus().setupRecoveryCode).toBe(recovery);
    expect(repository.store.kind).toBe('alloflow-clinical-deletion-tombstone');
    await receiving.exportBackup(); await receiving.finishSetup({ recoveryInput: recovery, backupSaved: true });
    expect(receiving.getStatus().phase).toBe('ready');
    expect(Vault.isVaultStore(repository.store)).toBe(true);
  });
});
