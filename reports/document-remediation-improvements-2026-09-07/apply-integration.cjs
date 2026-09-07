const fs = require('node:fs');
function edit(file, transform) {
  const before = fs.readFileSync(file, 'utf8');
  const nl = before.includes('\r\n') ? '\r\n' : '\n';
  const after = transform(before.replace(/\r\n/g, '\n'));
  if (fs.readFileSync(file, 'utf8') !== before) throw new Error('Concurrent change: ' + file);
  fs.writeFileSync(file, nl === '\r\n' ? after.replace(/\n/g, '\r\n') : after);
}
const replace = (text, before, after, count = 1) => {
  if (text.split(before).length - 1 !== count) throw new Error('Unexpected match count: ' + before.slice(0, 100));
  return text.split(before).join(after);
};
edit('tests/ocr_page_identity_behavior.test.js', s => replace(s, "first.trim() + '\\n\\n' + second", "first + '\\n\\n' + second"));
edit('tests/ocr_reconcile_pagenum.test.js', s => replace(s, "expect(src).toContain('pagesOut.push({ pageNum: _rangeStart + startPage + q,');", "expect(src).toContain('_resolveVisionOcrChunk(chunks[ci], startPage, pageCount,');"));
edit('tests/ocr_reconcile_pseudopage.test.js', () => String.raw`import { describe, it, expect, vi } from 'vitest';
import { reconcile, resolveChunk } from './lib/ocr_source_runtime.js';

describe('two-page OCR preserves one physical record per page', () => {
  it('retains a page recovered only by Tesseract instead of replacing the whole source with Vision', () => {
    const rec = reconcile([{ pageNum: 1, text: 'Page one.' }, { pageNum: 2, text: 'Page two score 98.' }],
      [{ pageNum: 1, text: 'Page one with additional detail.' }]);
    expect(rec.fullText).toContain('Page two score 98.');
    expect(rec.fullText.match(/98/g)).toHaveLength(1);
  });
  it('retries a combined Vision blob and avoids duplicating page-two values', async () => {
    const retry = vi.fn(async n => n === 1 ? 'VCI 105' : 'WMI 98');
    const vision = await resolveChunk('VCI 105 WMI 98', 1, 2, retry);
    const result = reconcile([{ pageNum: 1, text: 'VCI 105' }, { pageNum: 2, text: 'WMI 98' }], vision.pages);
    expect(result.fullText).toBe('VCI 105\n\nWMI 98');
    expect(result.fullText.match(/98/g)).toHaveLength(1);
    expect(retry).toHaveBeenCalledTimes(2);
  });
  it('accepts exact markers without additional model calls', async () => {
    const retry = vi.fn();
    const vision = await resolveChunk('VCI 105\n[[PAGE BREAK]]\nWMI 98', 1, 2, retry);
    expect(vision.fullText).toBe('VCI 105\n\nWMI 98');
    expect(retry).not.toHaveBeenCalled();
  });
});
`);
const rejectionFields = owner => `candidateRejectionCount: Math.max(0, Number(${owner}.candidateRejectionCount) || 0),\n      candidateRejections: Array.isArray(${owner}.candidateRejections) ? ${owner}.candidateRejections.slice(0, 100).filter(entry => entry && typeof entry === 'object').map(entry => ({ pass: Number(entry.pass) || 0, chunkId: String(entry.chunkId || '').slice(0, 80), phase: String(entry.phase || '').slice(0, 40), reason: String(entry.reason || '').slice(0, 120) })) : [],`;
for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
  edit(file, s => {
    s = replace(s, 'humanEditsAdopted: Number(cur.humanEditsAdopted) || 0,', 'humanEditsAdopted: Number(cur.humanEditsAdopted) || 0,\n      ' + rejectionFields('cur'));
    s = replace(s, "String(Number(cur.humanEditsAdopted) || 0);", "String(Number(cur.humanEditsAdopted) || 0) + ':' + String(Number(cur.candidateRejectionCount) || 0) + ':' + JSON.stringify((cur.candidateRejections || []).slice(0, 100));");
    return s;
  });
}
edit('view_pdf_audit_source.jsx', s => {
  s = replace(s, 'humanEditsAdopted: Number(project.humanEditsAdopted) || 0,', 'humanEditsAdopted: Number(project.humanEditsAdopted) || 0,\n      ' + rejectionFields('project'), 2);
  s = replace(s, 'ADA Title II rule requires WCAG 2.2 AA digital accessibility', 'ADA Title II rule requires WCAG 2.1 AA digital accessibility');
  return s;
});
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  edit(file, s => {
    s = replace(s, '"deadline_badge": "Deadline: April 24, 2027"', '"deadline_badge": "Deadline: April 26, 2027"');
    return replace(s, '"deadline_50k": "April 24, 2027"', '"deadline_50k": "April 26, 2027"');
  });
}
edit('tests/remediation_human_in_the_loop_rebase.test.js', s => {
  s = replace(s, 'expect(src, name + \' restore\').toContain("humanEditsAdopted: Number(project.humanEditsAdopted) || 0,");',
    'expect(src, name + \' cache restore\').toContain("rehydrateVerificationHtmlBinding(parsed.pdfFixResult)");\n      expect(src, name + \' complete metadata copy\').toContain("const restored = Object.assign({}, saved);");');
  s = replace(s, 'const block = src.slice(at, at + 900);', 'const end = src.indexOf("window.addEventListener(\'alloflow:remediation-progress\', _onEpochHeal)", at);\n      expect(end).toBeGreaterThan(at);\n      const block = src.slice(at, end);');
  s = replace(s, 'const block = host.slice(at, at + 900);', 'const end = host.indexOf("window.addEventListener(\'alloflow:remediation-progress\', _onEpochHeal)", at);\n    expect(end).toBeGreaterThan(at);\n    const block = host.slice(at, end);');
  return s;
});
edit('tests/remediation_pipeline_deep_hardening.test.js', s => replace(s,
  "    expect(host).toContain('const _sanitizedImport = _projectSanitizer(_savedProject);');",
  "    // Project files enter through the two sanitized view import paths above.\n    // Startup cache restore rehydrates the full saved result instead of reimporting a project.\n    expect(host).toContain('rehydrateVerificationHtmlBinding(parsed.pdfFixResult)');"));
console.log('Updated OCR contracts, persisted rejection evidence, standards copy, and obsolete restore/epoch assertions.');
