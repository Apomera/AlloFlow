import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const appPath = path.join(root, 'desktop', 'web-app', 'src', 'App.jsx');

describe('generated app shell integrity', () => {
  it('keeps the generated desktop shell syntactically complete', () => {
    const source = fs.readFileSync(appPath, 'utf8');

    expect(source.split(/\r?\n/).length).toBeGreaterThan(50000);
    expect(source).toContain('const _alloGenerationHelpersDeps');
    expect(source).toContain('const isToolCatalogItemVisible');
    expect(source).toContain('full-pack-glossary-image-impact');
    expect(source).not.toContain('`"target missing, skip it"');
    expect(() => parse(source, {
      sourceType: 'module',
      plugins: ['jsx', 'flow'],
    })).not.toThrow();
  });
});
