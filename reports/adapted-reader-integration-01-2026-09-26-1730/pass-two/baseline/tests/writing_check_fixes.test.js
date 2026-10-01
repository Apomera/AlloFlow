// Writing-check UX fixes (2026-06-16, user report) — applied to BOTH copies (pdf-audit results panel
// + doc-builder export preview). Anti-drift over the canonical sources.
//   (a) "Keep as-is" dismiss button so the user can mark wording intentional.
//   (b) Undo bug: apply via execCommand('insertText') so the browser's native undo / toolbar Undo can
//       reverse it (a raw textContent write wasn't recorded), AND shift sibling-card offsets after an
//       apply so the "text changed" guard stops false-tripping on the rest of the block.
//   (c) App-owned spelling suggestions so host iframes never make correction inaccessible.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const files = {
  'pdf-audit': readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8'),
  'export-preview': readFileSync(resolve(process.cwd(), 'view_export_preview_source.jsx'), 'utf8'),
};

for (const [name, src] of Object.entries(files)) {
  describe(`writing-check fixes — ${name}`, () => {
    it('(b) applies via execCommand insertText (undoable) with a direct-write fallback', () => {
      expect(src).toContain('function _applyHarperTextReplacement');
      expect(src).toContain("doc.execCommand?.('insertText', false, String(replacement))");
      expect(src).toContain('textNode.textContent = raw.slice(0, localStart)');
      expect(src).toContain('_applyHarperTextReplacement(doc, hit.node, hit.local, _badLen, replacement)');
    });

    it('(b) shifts sibling-card offsets in the same block after an apply (no more false "text changed")', () => {
      expect(src).toContain('const _delta = replacement.length - _badLen;');
      expect(src).toContain('return { ...x, start: x.start + _delta, end: x.end + _delta };');
      expect(src).toContain('return null; // overlaps the edit');
    });

    it('(a) has a "Keep as-is" dismiss action on each suggestion card', () => {
      expect(src).toContain('const _dismiss = (item) =>');
      expect(src).toContain("t('export_preview.writing.keep') || 'Keep as-is'");
      expect(src).toContain('onClick={() => _dismiss(item)}');
    });

    it('(c) keeps Harper spelling enabled and offers an app-owned correction path', () => {
      expect(src).toContain('SpellCheck: true');
      expect(src).toContain("language: 'plaintext'");
      expect(src).toContain("t('export_preview.writing.spell_hint')");
      expect(src).toContain('Check spelling & grammar (English)');
      expect(src).toContain('spelling corrections here as Apply buttons');
      expect(src).toContain('No spelling or grammar suggestions found.');
      expect(src).not.toContain('right-click the word in the preview');
    });
  });
}

describe('shipped writing-check artifacts', () => {
  const artifacts = [
    ['export-preview', 'view_export_preview_module.js', 'desktop/web-app/public/view_export_preview_module.js'],
    ['pdf-audit', 'view_pdf_audit_module.js', 'desktop/web-app/public/view_pdf_audit_module.js'],
  ];
  for (const [name, rootPath, mirrorPath] of artifacts) {
    it(`${name} ships the app-owned spelling path in a byte-identical mirror`, () => {
      const root = readFileSync(resolve(process.cwd(), rootPath), 'utf8');
      const mirror = readFileSync(resolve(process.cwd(), mirrorPath), 'utf8');
      expect(root).toContain('SpellCheck: true');
      expect(root).toContain('Check spelling & grammar (English)');
      expect(root).toContain('spelling corrections here as Apply buttons');
      expect(mirror).toBe(root);
    });
  }
});
