import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { exportsIn, runtimeUrlIssues } = require('../dev-tools/check_pipeline_integrity.js');

describe('pipeline integrity AST export discovery', () => {
  it('selects the factory return object independent of indentation and ignores helper returns', () => {
    const source = `
      function topLevelHelper() {
        return { topLevelDecoy: true };
      }
      const shorthand = () => {};
      var
      createDocPipeline
      =
      function (deps) {
        if (!deps) return { earlyExitDecoy: true };
        function nestedHelper() {
          return { nestedDecoy: true };
        }
        const sharedExports = { fromSpread: deps.fromSpread };
        const publicApi = {
          alpha: nestedHelper,
          shorthand,
          method() {},
          ['computed-export']: nestedHelper,
          ...sharedExports,
        };
        return (publicApi);
      };
    `;

    expect([...exportsIn(source, 'synthetic-pipeline.jsx')].sort()).toEqual([
      'alpha',
      'computed-export',
      'fromSpread',
      'method',
      'shorthand',
    ]);
  });
});

describe('remediation runtime URL policy', () => {
  it('rejects secret-bearing and mutable executable URLs while allowing exact and owned URLs', () => {
    const source = `
      const exactScript = 'https://cdn.jsdelivr.net/npm/pkg@5.1.2/dist/pkg.min.js';
      const exactModule = 'https://cdn.jsdelivr.net/npm/pkg@5.1.2/+esm';
      const ownedScript = 'https://alloflow-cdn.pages.dev/runtime/worker.js';
      const loopbackScript = 'http://127.0.0.1:32173/runtime.js';
      const documentation = 'https://example.test/runtime-guide.html';
      const majorOnly = 'https://cdn.jsdelivr.net/npm/pkg@5/dist/pkg.min.js';
      const floatingModule = 'https://cdn.jsdelivr.net/npm/pkg/+esm';
      const floatingScript = 'https://cdn.example.test/runtime.min.js';
      const leakedKey = 'https://alloflow-cdn.pages.dev/runtime/worker.js?' + 'api_key=' + apiKey;
      // A comment is not a runtime dependency: https://cdn.example.test/comment-only.js
    `;

    const issues = runtimeUrlIssues(source, 'synthetic-runtime.jsx');
    expect(issues.map(issue => issue.code).sort()).toEqual([
      'api-key-in-url',
      'major-only-package-version',
      'unversioned-esm',
      'unversioned-remote-executable',
    ]);
    const serialized = JSON.stringify(issues);
    expect(serialized).not.toContain('apiKey');
    expect(serialized).not.toContain('api_key=${');
    expect(issues.find(issue => issue.code === 'api-key-in-url')?.url).toContain('[redacted]');
  });

  it('accepts the currently pinned remediation runtime sources', () => {
    for (const relativePath of [
      'doc_pipeline_source.jsx',
      'view_pdf_audit_source.jsx',
      'gemini_api_source.jsx',
    ]) {
      const filename = resolve(process.cwd(), relativePath);
      const source = readFileSync(filename, 'utf8');
      expect(runtimeUrlIssues(source, filename), relativePath).toEqual([]);
    }
  });
});
