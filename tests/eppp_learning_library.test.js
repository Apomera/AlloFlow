import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('EPPP learning-library shared interactions', () => {
  const source = read('test_prep/eppp_legacy/js/textbook_renderer.js');

  it('provides keyboard-operable chapter, case, and section progress controls', () => {
    expect(source).toContain('class="chapter-header" aria-expanded="false"');
    expect(source).toContain('class="case-header" aria-expanded="false"');
    expect(source).toContain('data-section-complete');
    expect(source).toContain('alloflow_eppp_textbook_progress_v1');
    expect(source).toContain("role=\"status\" aria-live=\"polite\"");
  });

  it('gives diagrams accessible alternatives and learner-controlled motion', () => {
    expect(source).toContain('role="img" aria-label="');
    expect(source).toContain('diagram-text-alternative');
    expect(source).toContain('data-textbook-action="diagrams"');
    expect(source).toContain('data-textbook-action="motion"');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps the deployed renderer byte-identical', () => {
    expect(read('prismflow-deploy/public/test_prep/eppp_legacy/js/textbook_renderer.js')).toBe(source);
  });
});
