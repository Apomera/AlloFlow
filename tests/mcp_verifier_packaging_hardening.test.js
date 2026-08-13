import { afterAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';

const requireCjs = createRequire(import.meta.url);
const Driver = requireCjs(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'));
const Builder = requireCjs(resolve(process.cwd(), 'desktop/mcp/build_mcpb.cjs'));
const Artifact = requireCjs(resolve(process.cwd(), 'desktop/mcp/verify_mcpb_artifact.cjs'));
const scratch = mkdtempSync(join(tmpdir(), 'alloflow-verifier-hardening-'));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function veraPdfReport(compliant = true) {
  return {
    report: {
      buildInformation: { releaseDetails: [{ id: 'core', version: '1.30.2' }] },
      jobs: [{
        validationResult: [{
          compliant,
          details: {
            failedRules: compliant ? 0 : 1,
            failedChecks: compliant ? 0 : 1,
            passedRules: 12,
            passedChecks: 34,
            ruleSummaries: compliant ? [] : [{
              ruleStatus: 'FAILED', specification: 'ISO 14289-1', clause: '7.1',
              testNumber: 3, description: 'Content is not tagged.', failedChecks: 1,
            }],
          },
        }],
      }],
    },
  };
}

function fakeChild(onSpawn) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.kill = vi.fn(() => {
    queueMicrotask(() => child.emit('close', null, 'SIGKILL'));
    return true;
  });
  if (onSpawn) onSpawn(child);
  return child;
}

describe('MCP verifier byte binding and cancellation', () => {
  it('validates an immutable snapshot and returns metadata binding the verdict to those bytes', async () => {
    const source = join(scratch, 'binding-source.pdf');
    const original = Buffer.from('%PDF-1.4\nimmutable original bytes\n%%EOF\n', 'latin1');
    writeFileSync(source, original);
    let validationPath = null;
    let captured = null;
    const progress = [];
    const driver = Driver.createDriver({
      log: () => {},
      spawnProcess(_command, args) {
        validationPath = args.at(-1);
        captured = readFileSync(validationPath);
        return fakeChild((child) => queueMicrotask(() => {
          writeFileSync(source, Buffer.from('%PDF-1.4\nchanged after spawn\n%%EOF\n', 'latin1'));
          child.stdout.end(JSON.stringify(veraPdfReport(true)));
          child.emit('close', 0, null);
        }));
      },
    });
    try {
      const result = await driver.validatePdfUaCli({ filePath: source, onProgress: (line) => progress.push(line) });
      expect(validationPath).not.toBe(source);
      expect(captured).toEqual(original);
      expect(result).toMatchObject({
        status: 'compliant', validator: 'veraPDF', profile: 'ua1', validatorVersion: '1.30.2',
        inputBytes: original.length,
        inputSha256: createHash('sha256').update(original).digest('hex'),
      });
      expect(result.validatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.validationDurationMs).toBeGreaterThanOrEqual(0);
      expect(progress[0]).toMatch(/validation started/i);
      expect(progress.at(-1)).toMatch(/validation complete: compliant/i);
      expect(existsSync(validationPath)).toBe(false);
    } finally {
      await driver.close();
    }
  });

  it('kills the Java child and rejects with a stable AbortError contract', async () => {
    const source = join(scratch, 'abort-source.pdf');
    writeFileSync(source, Buffer.from('%PDF-1.4\nabort fixture\n%%EOF\n', 'latin1'));
    const controller = new AbortController();
    const progress = [];
    let child = null;
    let validationPath = null;
    const driver = Driver.createDriver({
      log: () => {},
      spawnProcess(_command, args) {
        validationPath = args.at(-1);
        child = fakeChild();
        return child;
      },
    });
    try {
      const pending = driver.validatePdfUaCli({
        filePath: source, signal: controller.signal, onProgress: (line) => progress.push(line),
      });
      controller.abort(new Error('user requested stop'));
      await expect(pending).rejects.toMatchObject({
        name: 'AbortError', code: 'ALLOFLOW_VALIDATION_CANCELLED',
      });
      expect(child.kill).toHaveBeenCalledWith('SIGKILL');
      expect(progress.at(-1)).toMatch(/validation cancelled/i);
      expect(existsSync(validationPath)).toBe(false);
    } finally {
      await driver.close();
    }
  });

  it('keeps the network-dependent browser validator behind explicit opt-in', async () => {
    const previous = process.env.ALLOFLOW_MCP_ALLOW_BROWSER_VERAPDF_EGRESS;
    delete process.env.ALLOFLOW_MCP_ALLOW_BROWSER_VERAPDF_EGRESS;
    const driver = Driver.createDriver({ log: () => {} });
    try {
      await expect(driver.validatePdfUa({ filePath: 'unused.pdf' })).rejects.toMatchObject({
        code: 'ALLOFLOW_BROWSER_VERAPDF_EGRESS_DISABLED',
      });
    } finally {
      if (previous === undefined) delete process.env.ALLOFLOW_MCP_ALLOW_BROWSER_VERAPDF_EGRESS;
      else process.env.ALLOFLOW_MCP_ALLOW_BROWSER_VERAPDF_EGRESS = previous;
      await driver.close();
    }
  });
});

describe('MCPB vendor and tool-registry release contracts', () => {
  it('canonicalizes only manifest-declared LF text before hashing and staging', () => {
    const root = join(scratch, 'vendor-normalization');
    mkdirSync(root, { recursive: true });
    const canonical = Buffer.from('one\ntwo\n', 'utf8');
    const crlf = Buffer.from('one\r\ntwo\r\n', 'utf8');
    const entry = {
      path: 'THIRD_PARTY_NOTICES.md', normalization: 'lf', bytes: canonical.length,
      sha256: createHash('sha256').update(canonical).digest('hex'),
    };
    writeFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), crlf);
    writeFileSync(join(root, 'manifest.json'), JSON.stringify({ schema: 1, files: [entry] }));

    expect(Driver.normalizeVendorAssetBytes(entry, crlf)).toEqual(canonical);
    expect(Builder.materializeAndVerifyVendorBundle(root)).toMatchObject({ files: 1 });
    expect(readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'))).toEqual(canonical);
    expect(Driver.verifyVendorBundle()).toMatchObject({ present: true, hashVerified: true, files: 12 });
  });

  it('uses unique manifest/server tool-name parity instead of a stale fixed count', () => {
    const tools = Builder.buildManifest().tools;
    expect(tools).toHaveLength(29);
    expect(Artifact.validatedToolNames(tools, 'manifest')).toHaveLength(29);
    expect(() => Artifact.validatedToolNames([...tools, tools[0]], 'manifest')).toThrow(/duplicate/i);
    expect(Artifact.DEFAULT_RPC_TIMEOUT_MS).toBe(60000);
  });
});
