import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const {
  LOADER_FILES,
  normalizeCommitHash,
  normalizeModuleName,
  run
} = require('../dev-tools/cache_bust_module_urls.cjs');

const tempRoots = [];
const ORIGINAL = [
  "loadModule('PdfAuditView', 'https://alloflow-cdn.pages.dev/view_pdf_audit_module.js?v=1111111');",
  "loadModule('ExportPreviewView', 'https://alloflow-cdn.pages.dev/view_export_preview_module.js?v=2222222');",
  "loadModule('OtherView', 'https://alloflow-cdn.pages.dev/other_module.js?v=3333333');",
  "const unrelated = 'https://alloflow-cdn.pages.dev/not_a_loader_module.js?v=4444444';",
  ''
].join('\n');

function makeFixture(content = ORIGINAL) {
  const root = mkdtempSync(join(tmpdir(), 'alloflow-cdn-stamp-'));
  tempRoots.push(root);
  for (const relativePath of LOADER_FILES) {
    const file = join(root, relativePath);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content, 'utf8');
  }
  return root;
}

function fakeCommitVerifier(hash) {
  return `${hash}${'0'.repeat(40 - hash.length)}`;
}

function runFixture(options) {
  return run({
    verifyCommit: fakeCommitVerifier,
    verifyModules: () => {},
    ...options
  });
}

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function cacheBustArtifacts(root) {
  return LOADER_FILES.flatMap((relativePath) => {
    const directory = dirname(join(root, relativePath));
    return readdirSync(directory)
      .filter((name) => name.includes('.cache-bust-'))
      .map((name) => join(directory, name));
  });
}

afterEach(() => {
  while (tempRoots.length) rmSync(tempRoots.pop(), { recursive: true, force: true });
});

describe('scoped CDN module cache-bust helper', () => {
  it('updates only selected loadModule URLs and keeps all loader mirrors exact', () => {
    const root = makeFixture();
    const hash = 'abcdef1';

    runFixture({
      root,
      argv: [`--hash=${hash}`, 'view_pdf_audit_module.js'],
      log: () => {}
    });

    const expected = ORIGINAL.replace(
      'view_pdf_audit_module.js?v=1111111',
      `view_pdf_audit_module.js?v=${hash}`
    );
    const copies = LOADER_FILES.map((file) => readFileSync(join(root, file), 'utf8'));
    expect(copies).toEqual([expected, expected, expected]);
    expect(copies[0]).toContain('view_export_preview_module.js?v=2222222');
    expect(copies[0]).toContain('other_module.js?v=3333333');
    expect(copies[0]).toContain('not_a_loader_module.js?v=4444444');
    expect(cacheBustArtifacts(root)).toEqual([]);
  });

  it('supports multiple explicit modules without running the full builder', () => {
    const root = makeFixture();
    const hash = '1234abc';

    runFixture({
      root,
      argv: [
        '--hash', hash,
        'view_pdf_audit_module.js',
        'view_export_preview_module.js'
      ],
      log: () => {}
    });

    const result = readFileSync(join(root, LOADER_FILES[0]), 'utf8');
    expect(result).toContain(`view_pdf_audit_module.js?v=${hash}`);
    expect(result).toContain(`view_export_preview_module.js?v=${hash}`);
    expect(result).toContain('other_module.js?v=3333333');
  });

  it('makes dry-run a zero-write preview', () => {
    const root = makeFixture();
    const messages = [];

    const plan = runFixture({
      root,
      argv: ['--hash=7654321', '--dry-run', 'view_pdf_audit_module.js'],
      log: (message) => messages.push(message)
    });

    expect(plan.dryRun).toBe(true);
    expect(plan.changed).toBe(true);
    for (const file of LOADER_FILES) {
      expect(readFileSync(join(root, file), 'utf8')).toBe(ORIGINAL);
    }
    expect(messages.at(-1)).toMatch(/no files written/i);
    expect(cacheBustArtifacts(root)).toEqual([]);
  });

  it('rejects malformed hashes and unsafe module selectors', () => {
    for (const hash of ['', '123456', 'xyz1234', 'a'.repeat(41), '../abcdef1']) {
      expect(() => normalizeCommitHash(hash)).toThrow(/commit hash/i);
    }
    for (const moduleName of ['../view_pdf_audit_module.js', 'view_pdf_audit_module.js?v=x', 'app.js', '*.js']) {
      expect(() => normalizeModuleName(moduleName)).toThrow(/module selector/i);
    }
  });

  it('rejects a valid commit when the selected working module does not match it', () => {
    const root = makeFixture();
    const moduleName = 'view_pdf_audit_module.js';
    writeFileSync(join(root, moduleName), 'committed module\n', 'utf8');
    git(root, ['init', '--quiet']);
    git(root, ['config', 'user.email', 'cache-bust-test@alloflow.invalid']);
    git(root, ['config', 'user.name', 'AlloFlow test']);
    git(root, ['add', '--', moduleName]);
    git(root, ['commit', '--quiet', '-m', 'module fixture']);
    const hash = git(root, ['rev-parse', 'HEAD']);
    writeFileSync(join(root, moduleName), 'different working module\n', 'utf8');

    expect(() => run({
      root,
      argv: [`--hash=${hash}`, moduleName],
      log: () => {}
    })).toThrow(/does not match commit/);

    for (const file of LOADER_FILES) {
      expect(readFileSync(join(root, file), 'utf8')).toBe(ORIGINAL);
    }
    expect(cacheBustArtifacts(root)).toEqual([]);
  }, 30000);

  it('rolls back replaced loaders and cleans temporary files after a write failure', () => {
    const root = makeFixture();
    let replacementCount = 0;
    const failingFs = {
      ...fs,
      renameSync(source, target) {
        if (String(source).endsWith('.tmp')) {
          replacementCount += 1;
          if (replacementCount === 2) {
            const error = new Error('simulated replacement failure');
            error.code = 'EIO';
            throw error;
          }
        }
        return fs.renameSync(source, target);
      }
    };

    expect(() => runFixture({
      root,
      argv: ['--hash=abcdef1', 'view_pdf_audit_module.js'],
      atomicOptions: { fs: failingFs, token: 'rollback-test' },
      log: () => {}
    })).toThrow(/Atomic loader update failed.*simulated replacement failure/);

    expect(replacementCount).toBe(2);
    for (const file of LOADER_FILES) {
      expect(readFileSync(join(root, file), 'utf8')).toBe(ORIGINAL);
    }
    expect(cacheBustArtifacts(root)).toEqual([]);
  });

  it('refuses to overwrite generated mirrors that already drifted', () => {
    const root = makeFixture();
    writeFileSync(join(root, LOADER_FILES[2]), `${ORIGINAL}// drift\n`, 'utf8');

    expect(() => runFixture({
      root,
      argv: ['--hash=abcdef1', 'view_pdf_audit_module.js'],
      log: () => {}
    })).toThrow(/differs from AlloFlowANTI\.txt/);

    expect(readFileSync(join(root, LOADER_FILES[0]), 'utf8')).toBe(ORIGINAL);
  });

  it('requires the selected URL to be an exact, unique loadModule entry', () => {
    const root = makeFixture(`${ORIGINAL}${ORIGINAL}`);

    expect(() => runFixture({
      root,
      argv: ['--hash=abcdef1', 'view_pdf_audit_module.js'],
      log: () => {}
    })).toThrow(/exactly one CDN loadModule\(\) URL/);
  });
});

describe('deploy freshness coverage', () => {
  it('post-deploy MD5 verification includes both Writing Check modules', () => {
    const deploy = readFileSync(resolve(process.cwd(), 'deploy.sh'), 'utf8');
    const modules = deploy.match(/CDN_MODULES=\(([^)]*)\)/)?.[1] || '';
    expect(modules).toContain('view_pdf_audit_module.js');
    expect(modules).toContain('view_export_preview_module.js');
  });
});
