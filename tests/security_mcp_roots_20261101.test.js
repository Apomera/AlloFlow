import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const source = fs.readFileSync(process.env.ALLO_SECURITY_BASELINE === '1' ? 'tmp/security-remediation-20261101/desktop/mcp.before.cjs' : 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs', 'utf8');
const evidence = path.resolve('tmp/security-remediation-20261101/desktop');
let fixture, allowed, outside;
beforeAll(() => {
  fs.mkdirSync(evidence, { recursive: true });
  fixture = fs.mkdtempSync(path.join(evidence, 'roots-'));
  allowed = path.join(fixture, 'allowed'); outside = path.join(fixture, 'outside');
  fs.mkdirSync(allowed); fs.mkdirSync(outside);
  fs.writeFileSync(path.join(allowed, 'ok.pdf'), '%PDF-synthetic allowed');
  fs.writeFileSync(path.join(outside, 'private.pdf'), '%PDF-synthetic outside');
});
function boundary(roots = [allowed], filesystem = fs) {
  const start = source.indexOf('const ALLOWED_ROOTS =');
  const end = source.indexOf('\nfunction requirePdfPath(', start);
  // Native junction creation is denied in this execution environment (EPERM).
  // Model reparse-point metadata, while ordinary files use the actual filesystem.
  const link = path.join(allowed, 'linked');
  const linkedFs = { ...filesystem,
    lstatSync(name, options) {
      if (name === link) return { ...fs.statSync(outside, options), isSymbolicLink: () => true, isDirectory: () => true };
      return filesystem.lstatSync(name, options);
    },
    realpathSync(name) { return name === link ? outside : filesystem.realpathSync(name); },
  };
  const context = vm.createContext({ fs: linkedFs, path, Buffer, process: { platform: process.platform, env: { ALLOFLOW_MCP_ALLOWED_ROOTS: roots.join(path.delimiter) } }, MAX_PDF_BYTES: 1024 * 1024,
    invalidParams: message => Error(message) });
  vm.runInContext(source.slice(start, end), context);
  return context;
}
describe('MCP configured folder boundary', () => {
  it('accepts ordinary existing input and new in-root output paths', () => {
    const b = boundary();
    expect(b._requireFileOfType({ file_path: path.join(allowed, 'ok.pdf') }, /\.pdf$/, 'PDF')).toBe(path.join(allowed, 'ok.pdf'));
    expect(b.enforceAllowedRoot(path.join(allowed, 'new', 'nested', 'out.txt'), 'output')).toBe(path.join(allowed, 'new', 'nested', 'out.txt'));
  });
  it('rejects outside/sibling paths and simulated linked input/output ancestors', () => {
    const b = boundary();
    for (const candidate of [path.join(outside, 'private.pdf'), path.join(fixture, 'allowed-other', 'x.pdf'), path.join(allowed, 'linked', 'private.pdf'), path.join(allowed, 'linked', 'new', 'out.txt')]) {
      expect(() => b.enforceAllowedRoot(candidate, 'file')).toThrow();
    }
  });
  it('rejects a configured root that is itself a link', () => {
    expect(() => boundary([path.join(allowed, 'linked')]).enforceAllowedRoot(path.join(allowed, 'linked', 'private.pdf'), 'file')).toThrow();
  });
  it('keeps the explicitly unrestricted configuration when roots are unset', () => {
    expect(boundary([]).enforceAllowedRoot(path.join(outside, 'private.pdf'), 'file')).toBe(path.join(outside, 'private.pdf'));
  });
  it('reads and writes normal files through checked handles', () => {
    const b = boundary(), dest = path.join(allowed, 'result.txt');
    expect(b.authorizedReadFileSync(path.join(allowed, 'ok.pdf'), 'utf8')).toBe('%PDF-synthetic allowed');
    b.authorizedWriteFileSync(dest, 'synthetic output', 'utf8');
    expect(fs.readFileSync(dest, 'utf8')).toBe('synthetic output');
    b.authorizedWriteFileSync(dest, 'short', 'utf8');
    expect(fs.readFileSync(dest, 'utf8')).toBe('short');
  });
  it('rejects a changed opened-file identity before returning bytes or truncating', () => {
    const outsideFile = path.join(outside, 'private.pdf');
    const injected = { ...fs, openSync: (_file, flags, mode) => fs.openSync(outsideFile, flags, mode) };
    const b = boundary([allowed], injected), candidate = path.join(allowed, 'ok.pdf');
    expect(() => b.authorizedReadFileSync(candidate)).toThrow(/changed/);
    expect(() => b.authorizedWriteFileSync(candidate, 'must not write')).toThrow(/changed/);
    expect(fs.readFileSync(outsideFile, 'utf8')).toBe('%PDF-synthetic outside');
  });
  it('rejects a configured root whose identity changes between checks', () => {
    let swapped = false;
    const injected = { ...fs, lstatSync(name, options) {
      const stat = fs.lstatSync(name, options);
      if (name === allowed && swapped) stat.dev += typeof stat.dev === 'bigint' ? 1n : 1;
      return stat;
    } };
    const b = boundary([allowed], injected);
    b.enforceAllowedRoot(path.join(allowed, 'ok.pdf'), 'file');
    swapped = true;
    expect(() => b.enforceAllowedRoot(path.join(allowed, 'ok.pdf'), 'file')).toThrow(/changed/);
  });
  it('rejects simulated linked completion manifests/reports before reading their target bytes', async () => {
    let reads = 0;
    const names = ['linked-manifest.json', 'linked-report.json'].map(name => path.join(allowed, name));
    const injected = { ...fs,
      lstatSync(name, options) {
        if (names.includes(name)) return { ...fs.statSync(path.join(outside, 'private.pdf'), options), isSymbolicLink: () => true, isDirectory: () => false };
        return fs.lstatSync(name, options);
      },
      statSync(name, options) { return fs.statSync(names.includes(name) ? path.join(outside, 'private.pdf') : name, options); },
      readFileSync(name, encoding) { if (names.includes(name)) { reads++; return '{}'; } return fs.readFileSync(name, encoding); },
    };
    const b = boundary([allowed], injected);
    const start = source.indexOf('async function validateCompletionManifest('), end = source.indexOf('\n}', start) + 2;
    vm.runInContext(source.slice(start, end), b);
    expect(await b.validateCompletionManifest(names[0], path.join(allowed, 'ok.pdf'), allowed, {})).toBeNull();
    expect(() => b.authorizedReadFileSync(names[1], 'utf8')).toThrow();
    expect(reads).toBe(0);
  });
});
describe('optional MCP HTTP authentication parsing without a listener', () => {
  function transport() {
    const start = source.indexOf('function startHttpTransport('), end = source.indexOf('\n}', start) + 2;
    let callback;
    const context = vm.createContext({ crypto, Buffer, URL, process: { env: { ALLOFLOW_MCP_HTTP_TOKEN: 'synthetic-token' } },
      log() {}, STDIO_KEEPALIVE: false, HTTP_STATE: {},
      http: { createServer(fn) { callback = fn; return { on() {}, listen() {} }; } },
    });
    vm.runInContext(source.slice(start, end), context); context.startHttpTransport(0);
    return (url, authorization) => {
      const res = { writeHead(status) { this.status = status; }, end() {} };
      callback({ url, method: 'POST', headers: authorization ? { authorization } : {} }, res);
      return res;
    };
  }
  it('rejects malformed URL encodings and unequal UTF-8 token byte lengths without throwing', () => {
    const call = transport();
    expect(call('/mcp/%').status).toBe(400);
    expect(call('/mcp', 'Bearer ' + 'é'.repeat('synthetic-token'.length)).status).toBe(401);
    expect(call('/mcp', 'Bearer wrong').status).toBe(401);
  });
});

describe('headless driver security integration without browser or network', () => {
  const driver = fs.readFileSync(process.env.ALLO_SECURITY_BASELINE === '1' ? 'tmp/security-remediation-20261101/desktop/driver.before.cjs' : 'desktop/mcp/remediation_headless_driver.cjs', 'utf8');
  it('uses immutable internally generated self-test bytes while keeping caller reads guarded', async () => {
    let callerReads = 0, writes = 0, closes = 0;
    const synthetic = Buffer.from('%PDF-synthetic self-test');
    const pdfPath = path.join(evidence, 'mock-self-test', 'self-test.pdf');
    const context = vm.createContext({ Buffer, path, Map, Date, Number,
      options: { readInputFile() { callerReads++; throw Error('outside configured roots'); } },
      fs: { mkdtempSync: () => path.dirname(pdfPath), writeFileSync() { writes++; }, rmSync() {} },
      os: { tmpdir: () => evidence }, process: { env: {} },
      http: { createServer: () => ({ listen(_port, _host, ready) { ready(); }, address: () => ({ port: 0 }), close() { closes++; } }) },
      buildSelfTestPdf: () => synthetic, log() {}, SELFTEST_MARKER: 'synthetic marker', HEADLESS_AUDITOR_COUNT: 3,
      classifySelfTestFailure: () => ({ stage: 'run', hint: 'synthetic' }),
      selfTestReply() {}, pdfPath,
    });
    const setupStart = driver.indexOf('  const o = options || {};', driver.indexOf('function createDriver(options)'));
    const setupEnd = driver.indexOf('  const log =', setupStart);
    vm.runInContext(driver.slice(setupStart, setupEnd), context);
    vm.runInContext(`async function remediate(opts) {
      const first = readInputFile(opts.filePath);
      if (first.toString() !== '%PDF-synthetic self-test') throw Error('incorrect fixture');
      first.fill(0);
      if (readInputFile(opts.filePath).toString() !== '%PDF-synthetic self-test') throw Error('mutable fixture');
      return { accessibleHtml: SELFTEST_MARKER, beforeScore: 50, afterScore: 100,
        auditCoverage: { configuredAuditorCap: 3, requestedAuditors: 3, completedAuditors: 3, sliced: false },
        taggedPdfB64: Buffer.from('%PDF-synthetic').toString('base64'), taggedPdfDelivery: { ok: true, code: 'verified' },
        taggedPdfExportMode: 'original_layout', verificationHtmlBound: true,
        activeContentScanVerified: true, activeContentDetected: false };
    }`, context);
    const start = driver.indexOf('  async function selfTest('), end = driver.indexOf('\n  }', start) + 4;
    vm.runInContext(driver.slice(start, end), context);
    expect((await context.selfTest({})).ok).toBe(true);
    expect(callerReads).toBe(0);
    expect(writes).toBe(1);
    expect(closes).toBe(1);
    expect(() => vm.runInContext('readInputFile(pdfPath)', context)).toThrow(/outside configured roots/);
    expect(callerReads).toBe(1);
    expect(context.process.env).toEqual({});
  });
  it('disables PDF.js dynamic evaluation when rendering synthetic PDF bytes', async () => {
    const call = driver.match(/window\.pdfjsLib\.getDocument\(\{ data: bytes[^\n]*?\}\)\.promise/);
    expect(call).not.toBeNull();
    let received;
    const context = vm.createContext({ bytes: new Uint8Array([37, 80, 68, 70, 45]),
      window: { pdfjsLib: { getDocument(options) { received = options; return { promise: Promise.resolve({}) }; } } } });
    await vm.runInContext(call[0], context);
    expect(received.isEvalSupported).toBe(false);
    expect(Array.from(received.data)).toEqual([37, 80, 68, 70, 45]);
  });
});
