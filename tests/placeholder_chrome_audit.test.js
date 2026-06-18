// Image-placeholder chrome: leaked-handler repair + apples-to-apples audit scoring (2026-06-18).
// Two real bugs from a live remediation run:
//  (1) the placeholder's giant inline on* handler got corrupted by an AI text-pass and the JS reflowed
//      into VISIBLE body text in the shipped PDF (page 10 of the user's "improved" document);
//  (2) the post-fix deterministic score REGRESSED (e.g. checks 74→58) because the "before" baseline
//      audits a chrome-free minimal doc while the "after" audited the full HTML WITH the preview-only
//      editor chrome (upload buttons / drop zones / handlers) that never ships.
// _repairLeakedImagePlaceholders rebuilds ONLY corrupted placeholders into clean static figures (fixing
// the leak in preview/export); _stripChromeForAudit staticizes ALL placeholders + strips chrome so the
// scoring audits see the EXPORT-EQUIVALENT document.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const s = src.indexOf('var _PLACEHOLDER_HANDLER_SIG =');
const e = src.indexOf('\n// Sanitize an AI-parsed', s);
if (s === -1 || e === -1) throw new Error('extraction markers for placeholder helpers missing');
const { _repairLeakedImagePlaceholders, _stripChromeForAudit } =
  new Function(src.slice(s, e) + '\n; return { _repairLeakedImagePlaceholders, _stripChromeForAudit };')();

const wrap = (b) => `<!DOCTYPE html><html lang="en"><body><main>${b}</main></body></html>`;
const parse = (h) => new DOMParser().parseFromString(h, 'text/html');
// CORRUPTED placeholder — the inline handler reflowed into visible text (the actual bug)
const CORRUPT = wrap('<figure id="ph1-figure" data-img-placeholder="true" style="border:2px dashed"><div id="ph1-container" ondrop="x"><span>Image placeholder</span><span>Drag an extracted image here, or:</span></div>src=dataUrl;if(altText)target.alt=altText;__alloflowOnPdfPreviewMutated();<button>Pick extracted</button><figcaption>A Venn diagram of interview structures.</figcaption></figure>');
// UNCORRUPTED placeholder — handlers live only in attributes, no leaked text
const CLEAN = wrap('<figure id="ph2-figure" data-img-placeholder="true"><div ondragover="a" ondrop="b"><span>Image placeholder</span><span>UNSW logo.</span></div><figcaption>UNSW logo.</figcaption></figure>');

describe('_repairLeakedImagePlaceholders — rebuilds ONLY corrupted placeholders (fixes the JS-in-PDF leak)', () => {
  it('a placeholder with leaked handler text becomes a clean static figure (description kept, no JS)', () => {
    const out = _repairLeakedImagePlaceholders(CORRUPT);
    expect(out).not.toContain('__alloflowOnPdfPreviewMutated');
    expect(out).not.toContain('src=dataUrl');
    expect(out).toContain('A Venn diagram of interview structures.'); // description preserved
    const fig = parse(out).querySelector('figure[data-img-placeholder]');
    expect(fig.querySelector('figcaption').textContent).toContain('Venn');
    expect(fig.getAttribute('role')).toBe('img');
    expect(fig.querySelector('button')).toBeFalsy(); // interactive chrome gone
  });
  it('an UNCORRUPTED placeholder is left byte-identical (preview upload UI preserved)', () => {
    expect(_repairLeakedImagePlaceholders(CLEAN)).toBe(CLEAN);
  });
  it('a document with no placeholders is returned unchanged', () => {
    const plain = wrap('<h1>Title</h1><p>body</p>');
    expect(_repairLeakedImagePlaceholders(plain)).toBe(plain);
  });
  it('A1-HIGH regression: a CLEAN figure whose FIGCAPTION mentions handler-like prose is NOT destroyed', () => {
    // a real educational caption can legitimately say "document.createElement" / "readAsDataURL"; the leak
    // detection must look at LOOSE text nodes only, never figcaption/span prose.
    const html = wrap('<figure data-img-placeholder="true"><div ondragover="a"><span>Image placeholder</span></div><figcaption>Figure 3: calling document.createElement to build a node, then readAsDataURL.</figcaption></figure>');
    expect(_repairLeakedImagePlaceholders(html)).toBe(html);
  });
  it('A1-MED: a PARTIAL handler reflow (loose text OUTSIDE figcaption) is still repaired', () => {
    const html = wrap('<figure data-img-placeholder="true"><div id="c"><span>desc</span></div>var f=document.getElementById("x-figure");if(f)f.remove();_cur=Math.max(25,_cur-25);<figcaption>desc</figcaption></figure>');
    const out = _repairLeakedImagePlaceholders(html);
    expect(out).not.toContain('getElementById');
    expect(out).not.toContain('_cur=Math');
    expect(out).toContain('desc');
  });
});

describe('_stripChromeForAudit — scores the EXPORT-EQUIVALENT doc (no preview chrome)', () => {
  it('removes allo-img-controls and staticizes ALL placeholders (even uncorrupted)', () => {
    const html = wrap('<figure data-img-placeholder="true"><div ondrop="x"><span>chart description</span></div><figcaption>chart description</figcaption><div class="allo-img-controls">size 100%</div></figure>');
    const out = _stripChromeForAudit(html);
    expect(out).not.toContain('allo-img-controls');
    expect(out).not.toContain('ondrop');
    const fig = parse(out).querySelector('figure[data-img-placeholder]');
    expect(fig.getAttribute('role')).toBe('img');
    expect(fig.querySelector('figcaption').textContent).toBe('chart description');
  });
  it('also neutralizes leaked-handler text (the audit never sees the JS either)', () => {
    expect(_stripChromeForAudit(CORRUPT)).not.toContain('__alloflowOnPdfPreviewMutated');
  });
});

describe('wiring: both scoring paths audit the chrome-stripped, repaired document', () => {
  it('main blend repairs + chrome-strips before axe/EA, with regression detection', () => {
    expect(src).toContain('accessibleHtml = _repairLeakedImagePlaceholders(accessibleHtml);');
    expect(src).toContain('const _scoreHtml = _stripChromeForAudit(accessibleHtml);');
    expect(src).toContain('runEqualAccessAudit(_scoreHtml)');
    expect(src).toContain('_diffAxeForMiniAudit(_auditResult._baselineAxeAudit, axeResults)');
  });
  it('recovery re-blend also scores the chrome-stripped copy (so it cannot re-introduce the penalty)', () => {
    expect(src).toContain('const _reScoreHtml = _stripChromeForAudit(_repairLeakedImagePlaceholders(accessibleHtml));');
    expect(src).toContain('runAxeAudit(_reScoreHtml)');
    expect(src).toContain('runEqualAccessAudit(_reScoreHtml)');
  });
  it('ROOT CAUSE: the polish + cleanup passes are bracketed with the placeholder strip/restore so the inline ×-remove / Pick-extracted / drop handlers are never corrupted', () => {
    const fn = src.slice(src.indexOf('// ── Polish passes'), src.indexOf('// ── Insert extracted images using placeholder tokens'));
    expect(src).toContain('const _phProtect = _stripImagePlaceholdersForAi(bodyContent);');
    expect(src).toContain('bodyContent = _restoreImagePlaceholdersForAi(bodyContent, _phProtect.map);');
    // the strip is BEFORE the polish, the restore is AFTER the cleanup (so both passes are covered)
    expect(src.indexOf('const _phProtect = _stripImagePlaceholdersForAi(bodyContent);')).toBeLessThan(src.indexOf('// ── Polish passes'));
    expect(src.indexOf('bodyContent = _restoreImagePlaceholdersForAi(bodyContent, _phProtect.map);')).toBeGreaterThan(src.indexOf('remove empty paragraphs created by cleanup'));
  });
});
