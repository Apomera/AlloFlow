import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const LF = String.fromCharCode(10);
const server = readFileSync(
  path.resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'),
  'utf8',
);

function sha256Bytes(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hasExactKeys(value, expected) {
  if (value === null) return false;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length) return false;
  for (let index = 0; index < actual.length; index++) {
    if (actual[index] !== wanted[index]) return false;
  }
  return true;
}

function isPlainObject(value) {
  if (value === null) return false;
  if (typeof value !== 'object') return false;
  return !Array.isArray(value);
}

function loadValidator(fsMock, sha256File) {
  const start = server.indexOf('async function validateCompletionManifest(');
  const end = server.indexOf('async function findValidCompletionManifest(', start);
  const validationSource = server.slice(start, end);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const factory = new Function(
    'fs',
    'path',
    'COMPLETION_MANIFEST_SCHEMA',
    'COMPLETION_MANIFEST_KIND',
    'hasExactKeys',
    'isPlainObject',
    'SHA256_HEX_RE',
    'sha256File',
    'sha256Bytes',
    validationSource + LF + 'return validateCompletionManifest;',
  );
  return factory(
    fsMock,
    path,
    1,
    'alloflow-remediation-completion',
    hasExactKeys,
    isPlainObject,
    /^[0-9a-f]{64}$/,
    sha256File,
    sha256Bytes,
  );
}

function stableStat(size, ino) {
  return {
    size,
    mtimeMs: 10,
    ctimeMs: 20,
    dev: 30,
    ino,
    isFile() { return true; },
  };
}

describe('desktop MCP completion manifest report binding', function () {
  it('rejects a same-size report swap instead of parsing bytes that were never hashed', async function () {
    const outDir = path.resolve(process.cwd(), 'completion-race-output');
    const filePath = path.join(outDir, 'input.pdf');
    const reportPath = path.join(outDir, 'input-remediation-report.json');
    const manifestPath = path.join(outDir, 'input-remediation-completion.json');
    const sourceBytes = Buffer.from('%PDF-1.4 source');
    const oldReport = Buffer.from(JSON.stringify({
      input: filePath,
      verdict: 'PASS',
      files: { report: reportPath, completionManifest: manifestPath },
    }));
    const swappedReport = Buffer.from(JSON.stringify({
      input: filePath,
      verdict: 'FAIL',
      files: { report: reportPath, completionManifest: manifestPath },
    }));
    expect(swappedReport.length).toBe(oldReport.length);

    const compatibility = {
      optionsSha256: 'a'.repeat(64),
      engineSha256: 'b'.repeat(64),
      inputSha256: sha256Bytes(sourceBytes),
    };
    const manifest = {
      schema: 1,
      kind: 'alloflow-remediation-completion',
      source: {
        path: filePath,
        sizeBytes: sourceBytes.length,
        sha256: compatibility.inputSha256,
      },
      compatibility: {
        optionsSha256: compatibility.optionsSha256,
        engineSha256: compatibility.engineSha256,
      },
      attempt: { jobId: null, attemptId: null, attemptNumber: 0 },
      completedAt: '2026-08-12T00:00:00.000Z',
      artifacts: [{
        role: 'report',
        relativePath: path.basename(reportPath),
        sizeBytes: oldReport.length,
        sha256: sha256Bytes(oldReport),
      }],
    };
    const manifestBytes = Buffer.from(JSON.stringify(manifest));
    const stats = new Map([
      [manifestPath, stableStat(manifestBytes.length, 1)],
      [filePath, stableStat(sourceBytes.length, 2)],
      [reportPath, stableStat(oldReport.length, 3)],
    ]);
    const fsMock = {
      statSync(file) {
        const stat = stats.get(file);
        if (!stat) throw new Error('unexpected stat: ' + file);
        return { ...stat };
      },
      readFileSync(file, encoding) {
        let bytes;
        if (file === manifestPath) bytes = manifestBytes;
        else if (file === reportPath) bytes = swappedReport;
        else throw new Error('unexpected read: ' + file);
        return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
      },
    };
    let reportStreamHashes = 0;
    async function sha256File(file) {
      if (file === filePath) return compatibility.inputSha256;
      if (file === reportPath) {
        reportStreamHashes++;
        return sha256Bytes(oldReport);
      }
      throw new Error('unexpected hash: ' + file);
    }

    const validate = loadValidator(fsMock, sha256File);
    const proof = await validate(manifestPath, filePath, outDir, compatibility);
    expect(proof).toBeNull();
    expect(reportStreamHashes).toBe(0);
  });
});
