import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const appPath = path.join(root, 'desktop', 'web-app', 'src', 'App.jsx');

describe('generated app shell integrity', () => {
  it('keeps the generated desktop shell syntactically complete', () => {
    const source = fs.readFileSync(appPath, 'utf8');

    // Waves 3-5 + the command context (c7514f5a5, 4d407aaa7, c31224ee5, f900780bc; 09-13) moved ~11k lines
    // into CDN modules (57,475 -> ~46,400), so the truncation floor drops from 50,000 to 40,000.
    expect(source.split(/\r?\n/).length).toBeGreaterThan(40000);
    expect(source).toContain('const _alloGenerationHelpersDeps');
    expect(source).toContain('const isToolCatalogItemVisible');
    // The full-pack card (and its full-pack-glossary-image-impact block) moved into FullPackRunView
    // (view_full_pack_run_source.jsx, fadeda957, 08-31); the shell keeps its lazy mount.
    expect(source).toContain("const FullPackRunView = _alloCreateFirstWaveCdnView('FullPackRunView'");
    expect(fs.readFileSync(path.join(root, 'view_full_pack_run_source.jsx'), 'utf8')).toContain('full-pack-glossary-image-impact');
    expect(source).not.toContain('`"target missing, skip it"');
    expect(() => parse(source, {
      sourceType: 'module',
      plugins: ['jsx', 'flow'],
    })).not.toThrow();
  });
});
