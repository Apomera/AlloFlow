import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_pdf_audit_source.jsx', 'utf8');
const built = readFileSync('view_pdf_audit_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/view_pdf_audit_module.js', 'utf8');
const nativePromptPattern = /(?<![\w.])(?:window\.)?prompt\s*\(/;

describe('PDF audit text-entry dialogs', () => {
  it('routes all five native prompts through the hardened shared prompt', () => {
    expect(source).toContain('const promptForPdfText = React.useCallback(async');
    expect(source).toContain('const promptForPdfLink = React.useCallback');
    expect(source).not.toMatch(nativePromptPattern);
  });

  it('labels and bounds signature, template, and image-edit inputs', () => {
    expect(source).toContain("title: 'Sign audit trail'");
    expect(source).toContain("title: 'Save accessible template'");
    expect(source).toContain("title: 'Edit selected image'");
    expect(source).toContain('multiline: true, maxLength: 1000');
    expect(source).toContain('if (promptedSigner === null) return;');
  });

  it('validates links and restores iframe selections for toolbar and keyboard entry', () => {
    expect(source).toContain('Only web (http/https), mailto:, tel:, and internal links are allowed.');
    expect(source.match(/getRangeAt\(0\)\.cloneRange\(\)/g) || []).toHaveLength(2);
    expect(source).toContain("doc.addEventListener('keydown', async function(e)");
  });

  it('keeps generated and deployed PDF-audit modules synchronized', () => {
    expect(built).toBe(deployed);
    expect(built).toContain('promptForPdfText');
    expect(built).not.toMatch(nativePromptPattern);
  });
});
