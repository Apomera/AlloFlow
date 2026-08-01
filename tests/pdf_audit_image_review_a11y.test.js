import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = fs.readFileSync(path.resolve(process.cwd(), 'view_pdf_audit_module.js'), 'utf8');

describe('PDF audit image review accessibility', () => {
  it('names the image-description textarea independently of its visual label', () => {
    const anchor = 'value: imgReviewDraft, onChange: (e) => setImgReviewDraft(e.target.value)';
    const index = SOURCE.indexOf(anchor);
    expect(index).toBeGreaterThan(-1);
    const following = SOURCE.slice(index, index + 280);
    expect(following).toContain('"aria-label": t("pdf_audit.imgreview.alt_label") || "Description (what a screen reader says)"');
  });
});
