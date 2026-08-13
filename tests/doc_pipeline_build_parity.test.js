import { execFileSync } from 'node:child_process';
import {
  copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(process.cwd());

describe('document pipeline generated artifacts', function () {
  it('match a fresh source build byte for byte in both shipping locations', function () {
    const scratch = mkdtempSync(join(tmpdir(), 'alloflow-doc-pipeline-build-'));
    try {
      mkdirSync(join(scratch, 'desktop', 'web-app', 'public'), { recursive: true });
      for (const name of [
        '_build_doc_pipeline_module.js',
        '_build_simple_iife_module.js',
        'doc_pipeline_source.jsx',
      ]) copyFileSync(join(ROOT, name), join(scratch, name));

      execFileSync(process.execPath, [join(scratch, '_build_doc_pipeline_module.js')], {
        cwd: scratch,
        stdio: 'pipe',
      });
      const expected = readFileSync(join(scratch, 'doc_pipeline_module.js'));
      expect(readFileSync(join(ROOT, 'doc_pipeline_module.js'))).toEqual(expected);
      expect(readFileSync(join(ROOT, 'desktop', 'web-app', 'public', 'doc_pipeline_module.js')))
        .toEqual(expected);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
