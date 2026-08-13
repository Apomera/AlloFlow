import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8').replace(/\\r\\n/g, '\\n');
const historyPanel = readFileSync(resolve(process.cwd(), 'view_history_panel_source.jsx'), 'utf8').replace(/\\r\\n/g, '\\n');

describe('protected recovery app workflow', () => {
  it('fails closed at boot and renders an explicit locked workflow', () => {
    const vaultCheck = anti.indexOf('vaultModule?.isVaultStore?.(rawStore)');
    const plainNormalize = anti.indexOf('ALLO_WORKSPACE_RECOVERY.isSupportedPayload(rawStore)', vaultCheck);
    expect(vaultCheck).toBeGreaterThan(0);
    expect(plainNormalize).toBeGreaterThan(vaultCheck);
    expect(anti).toContain("canvasRecoveryDialogMode === 'vault-locked' ? 'Unlock protected saved work'");
    expect(anti).toContain("canvasRecoveryDialogMode === 'vault-locked' ? (\n              renderCanvasRecoveryLockedScreen()");
    expect(anti).toContain("canvasRecoveryVaultState.enabled && canvasRecoveryVaultState.locked");
  });

  it('routes protected mutations and autosave through the vault controller', () => {
    expect(anti).toContain("candidate => controller.upsertSnapshot(candidate)");
    expect(anti).toContain("await controller.setPolicy(policy.id, policy.effectiveId)");
    expect(anti).toContain("await controller.setPinned(snapshotId, pinned === true)");
    expect(anti).toContain("await controller.deleteSnapshot(snapshotId)");
    expect(anti).toContain("await controller.restoreSnapshot(snapshotId)");
    expect(anti).toContain("ALLO_WORKSPACE_RECOVERY.stripLargeAssets(target, 'user-remove-media')");
  });

  it('confirms a shown-once recovery key before committing setup or rotation', () => {
    const generate = anti.indexOf('const recoveryCode = stack.crypto.generateRecoveryCode()');
    const pending = anti.indexOf("canvasRecoveryVaultPendingActionRef.current = { action: 'enable'", generate);
    const commit = anti.indexOf('commitCanvasRecoveryVaultEnable(pending.password, canvasRecoveryVaultForm.recoveryCode)', pending);
    expect(generate).toBeGreaterThan(0);
    expect(pending).toBeGreaterThan(generate);
    expect(commit).toBeGreaterThan(pending);
    expect(anti).toContain('controller.rotateRecoveryKey(canvasRecoveryVaultForm.recoveryCode)');
    expect(anti).toContain("canvasRecoveryVaultForm.mode !== 'confirm-recovery-code'");
    expect(anti).toContain("recoveryCode: '',");
  });

  it('keeps encryption, recovery backup, and educator-gate claims distinct', () => {
    expect(anti).toContain('Protect Gemini Canvas recovery workspaces');
    expect(anti).toContain('Preferences, legacy offline caches, speech models, downloads, and other Canvas storage are not encrypted');
    expect(anti).toContain('Export encrypted backup');
    expect(anti).toContain("'Export readable copy'");
    expect(anti).toContain('it does not encrypt data and is not a server authorization boundary');
  });

  it('shows locked status and the protected count instead of claiming the tab is saved', () => {
    expect(historyPanel).toContain("canvasRecoverySaveStatus === 'locked'");
    expect(historyPanel).toContain('Protected recovery workspaces locked');
    expect(historyPanel).toContain('<Lock size={10}');
    expect(anti).toContain('canvasRecoveryVaultState.enabled ? canvasRecoveryVaultState.snapshotCount');
  });
});
