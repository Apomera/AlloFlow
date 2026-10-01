import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = fs.readFileSync(path.resolve(process.cwd(), 'view_pdf_audit_module.js'), 'utf8');

describe('PDF audit media instructions accessibility', () => {
  it('names the custom media instructions textarea independently of its visual label', () => {
    const anchor = 'placeholder: t("pdf_audit.media.instructions_ph") ||';
    const index = SOURCE.indexOf(anchor);
    expect(index).toBeGreaterThan(-1);
    const preceding = SOURCE.slice(Math.max(0, index - 220), index);
    expect(preceding).toContain('"aria-label": t("pdf_audit.media.instructions_label") || "Custom instructions (optional)"');
  });
});
