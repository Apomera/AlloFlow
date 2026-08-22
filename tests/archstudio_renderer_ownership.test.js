import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const hostBundles = [
  path.resolve(process.cwd(), 'stem_lab/stem_lab_module.js'),
  path.resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_lab_module.js'),
];

describe('Architecture Studio renderer ownership', () => {
  it('keeps the legacy shell renderer off the ArchGL-owned canvas', () => {
    for (const file of hostBundles) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("if (cnv.getAttribute('data-arch-gl') === 'true') return;");
    }
  });
});
