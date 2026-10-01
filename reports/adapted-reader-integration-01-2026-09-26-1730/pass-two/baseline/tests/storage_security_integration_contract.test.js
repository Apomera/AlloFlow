import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const read = file => readFileSync(resolve(process.cwd(), file), 'utf8').replace(/\r\n/g, '\n');
const anti = read('AlloFlowANTI.txt');

const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
class Repo {
  constructor(store) { this.store = copy(store); this.revision = 0; }
  async read() { return { store: copy(this.store), revision: this.revision }; }
  async compareAndSwap(revision, next) {
    if (revision !== this.revision) return false;
    this.store = copy(next);
    this.revision += 1;
    return true;
  }
}
const plainStore = {
  version: 1,
  retentionPolicy: 'standard',
  effectiveRetentionPolicy: 'standard',
  legacyMigrationComplete: true,
  removedSnapshotIds: {},
  snapshots: [{
    version: 1,
    id: 'workspace-a',
    title: 'Private workspace',
    savedAt: '2026-08-12T10:00:00.000Z',
    workspace: { history: [{ id: 'r1', content: 'secret' }] }
  }]
};

describe('final storage-security integration contracts', () => {
  it('requires explicit Canvas approval from the click gesture and retries preferences', () => {
    const start = anti.indexOf('const approveAndRetryCanvasRecoveryStorage = async () =>');
    const end = anti.indexOf('const retryCanvasRecoveryStorage = async () =>', start);
    const handler = anti.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(handler.indexOf('deviceStorage.connectWithApproval()')).toBeGreaterThan(0);
    expect(handler.indexOf('deviceStorage.connectWithApproval()')).toBeLessThan(handler.indexOf('await approvalPromise'));
    expect(handler).toContain("typeof window.__alloRetryPrefsHydration === 'function'");
    expect(handler).toContain('{ replaceExisting: beforeWorkspaceEntry }');
    // 2026-08: the reload was removed by design — a Canvas document reload is
    // destructive, so the handler re-hydrates preferences in place instead
    // (the in-source "NEVER reload here" note documents it).
    expect(handler).not.toContain('window.location.reload()');
    expect(handler).toContain('NEVER reload here');
    expect(anti).toContain("canvasRecoveryErrorCode === 'allo/approval-required'");
  });

  it('makes Canvas preference hydration retriable and gates educator entry until known', () => {
    const source = read('utils_pure_source.jsx');
    const module = read('utils_pure_module.js');
    const mirror = read('desktop/web-app/public/utils_pure_module.js');
    expect(mirror).toBe(module);
    for (const value of [source, module]) {
      expect(value).toContain("__alloPrefsHydrationStatus = 'pending'");
      expect(value).toContain("available ? 'ready' : 'unavailable'");
      expect(value).toContain('window.__alloRetryPrefsHydration = _hydratePrefs');
      expect(value).toContain("const replaceExisting = options?.replaceExisting === true");
      expect(value).toContain('skippedExisting');
      expect(value).toContain("window.addEventListener('alloflow:educator-access-code-changed', _lsSnapshot)");
    }
    expect(anti).toContain("_isCanvasEnv && window.__alloPrefsHydrationStatus !== 'ready'");
    const launch = read('view_launch_pad_source.jsx');
    expect(launch).toContain('window._alloEducatorAccessCodeRequired()');
  });

  it('reauthenticates a supplied disable password even while the controller is unlocked', async () => {
    const repo = new Repo(plainStore);
    const controller = Vault.createRecoveryVaultController({
      repository: repo,
      crypto: Crypto,
      cryptoOptions: { iterations: 10000 },
      now: () => new Date('2026-08-12T12:00:00.000Z')
    });
    await controller.enableProtection('correct password');
    expect(Vault.isVaultStore(repo.store)).toBe(true);
    await expect(controller.disableProtection('wrong password'))
      .rejects.toMatchObject({ code: 'VAULT_PASSWORD_OR_CORRUPT' });
    expect(Vault.isVaultStore(repo.store)).toBe(true);
    await expect(controller.disableProtection('correct password')).resolves.toMatchObject({ disabled: true });
    expect(Vault.isVaultStore(repo.store)).toBe(false);
  });

  it('keeps backup import reachable and refuses to report stale autosaves as saved', () => {
    const branch = anti.indexOf("mode === 'confirm-recovery-code' ? renderCanvasRecoveryCodeConfirmation()");
    const importMode = anti.indexOf("mode === 'import-backup' ? renderCanvasRecoveryBackupImportForm()", branch);
    const disabledMode = anti.indexOf('!canvasRecoveryVaultState.enabled ?', branch);
    expect(importMode).toBeGreaterThan(branch);
    expect(importMode).toBeLessThan(disabledMode);
    expect(anti).toContain("mutationResult.reason === 'stale'");
    expect(anti).toContain("mutationResult.reason === 'stale-snapshot'");
    expect(anti).toContain("conflict.code = 'allo/recovery-save-stale'");
  });

  it('preserves resource-free unit/profile state and stops their Canvas legacy writes', () => {
    expect(anti).toContain("(Array.isArray(workspace.units) && workspace.units.length > 0)");
    expect(anti).toContain("(Array.isArray(workspace.profiles) && workspace.profiles.length > 0)");
    expect(anti).toContain('|| units.length > 0');
    expect(anti).toContain('|| profiles.length > 0');
    expect(anti).toContain('if (!lzLoaded || isCanvas)');
  });

  it('clears transient credentials on dismissal and states the narrow encryption boundary', () => {
    expect(anti).toContain('const closeCanvasRecoveryDialog = (nextMode = null) =>');
    expect(anti).toContain("clearCanvasRecoveryVaultSecrets('idle')");
    expect(anti).toContain('Preferences, legacy offline caches, speech models, downloads, and other Canvas storage are not encrypted');
    expect(anti).not.toMatch(/one-time recovery key/i);
    expect(anti).toContain('Cancel setup');
    expect(anti).toContain('Keep existing key');
    expect(anti).toContain('if (committed) {');
    expect(anti).toContain("setCanvasRecoveryDialogMode('vault-locked')");
  });

  it('ships synchronized security module mirrors and v2 eager loaders', () => {
    for (const file of [
      'allo_device_vault_module.js',
      'device_access_code_module.js',
      'view_history_panel_module.js',
      'view_launch_pad_module.js',
      'ui_modals_module.js'
    ]) {
      expect(read(`desktop/web-app/public/${file}`)).toBe(read(file));
    }
    // The static security-v2 tag was superseded by the per-deploy CDN hash
    // stamp; the invariant is that every security module URL stays
    // cache-busted with an explicit ?v= param.
    for (const mod of ['allo_crypto_module', 'device_access_code_module', 'allo_device_vault_module', 'allo_recovery_vault_integration_module']) {
      expect(anti).toMatch(new RegExp(`${mod}\\.js\\?v=[a-z0-9-]+`));
    }
  });
});
