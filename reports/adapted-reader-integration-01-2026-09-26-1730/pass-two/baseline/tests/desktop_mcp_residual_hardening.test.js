import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const server = readFileSync(resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');

describe('desktop MCP residual durability hardening', () => {
  it('validates compact terminal checkpoints by exact fields and HTML binding', () => {
    const start = server.indexOf('function checkpointTerminalAudit(');
    const end = server.indexOf('function validateCheckpointEnvelope(', start);
    const capsule = server.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(capsule).toContain('...Driver.TERMINAL_CHECKPOINT_REMEDIATION_FIELDS');
    expect(capsule).toContain('checkpointTerminalCapsule(value.remediation)');
    expect(capsule).toContain('binding.digest !== sha256Bytes');
    expect(capsule).toContain('checkpointTerminalAudit(value.axeAudit');
    expect(capsule).toContain('checkpointTerminalAudit(value.secondEngineAudit');
  });

  it('keeps credential proof private and separates authenticity from current usability', () => {
    expect(server).toContain('let geminiKeyVerification = null;');
    expect(server).toContain('identityBefore === identityAfter');
    expect(server).toContain('keyBefore.source === keyAfter.source');
    expect(server).toContain('keyVerificationCheckedAt');
    expect(server).toContain('const keyUsableNow =');
    expect(server).toMatch(/ready: keyUsableNow .* browserRuntimeReady/);
    expect(server).toContain("state: 'key-quota-exhausted'");
    expect(server).toContain("state: 'key-invalid'");
    expect(server).toContain("state: 'key-unreachable'");
  });
});

describe('desktop MCP runtime build fencing source contract', function () {
  it('fails every driver execution closed after an on-disk build change', function () {
    const driverFactory = server.slice(
      server.indexOf('function getDriver()'),
      server.indexOf('async function validatePdfUaLocally('),
    );
    const buildGuard = server.slice(
      server.indexOf('function checkpointEngineFiles()'),
      server.indexOf('function checkpointAudit('),
    );
    const selfTest = server.slice(
      server.indexOf('async remediation_selftest('),
      server.indexOf('async export_accessible_office('),
    );
    expect(driverFactory).toContain('requireCurrentRuntimeBuild();');
    expect(buildGuard).toContain('stat.ctimeMs');
    expect(buildGuard).toContain('if (before !== after)');
    expect(buildGuard).toContain('desktop_runtime_build_changed_since_server_start');
    expect(buildGuard).toContain('requireCurrentRuntimeBuild();');
    expect(selfTest).toContain('requireCurrentRuntimeBuild();');
  });
});
