import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const files = [
  path.resolve(process.cwd(), 'stem_lab/stem_tool_archstudio.js'),
  path.resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'),
];

describe('ArchStudio accessibility parity', () => {
  it('names share, authoring, and color controls', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("'aria-label': t('stem.archstudio.share_code', 'Share code to copy')");
      expect(source).toContain("'aria-label': t('stem.archstudio.custom_color', 'Custom color')");
      expect(source).toContain("'aria-label': t('stem.archstudio.hypothesis', 'Structural stability hypothesis')");
      expect(source).toContain("'aria-label': t('stem.archstudio.explanation', 'Explain structural stability')");
    }
  });

  it('gives each glyph-only replay transport button a localized accessible name', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const key of ['replay_first', 'replay_previous', 'replay_next', 'replay_last']) {
        expect(source).toContain(`'aria-label': t('stem.archstudio.${key}'`);
      }
    }
  });

  it('keeps the source and public bundles byte-identical', () => {
    const hashes = files.map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    expect(hashes[0]).toBe(hashes[1]);
  });
});
