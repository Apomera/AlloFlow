// A tagged SOURCE keeps its own marked content through Stage 4 (2026-10-18). IRS 1040 failed
// veraPDF PDF/UA-1 7.1-1/7.1-2 x282 (source "/Artifact <</MCID n>>" resolved through OUR ParentTree
// to our MCID-n element; every block nested inside a source MCID), 7.1-3 x244 (background fills drawn
// outside any marked content) and 7.2-9 x5 (unmatched flat /TD blocks in the page /Sect); the parent
// guide failed 7.1-2 (a /P block inside the source's footer /Artifact). Runs the real
// _stage4_tryWrapPage, sliced from doc_pipeline_source.jsx, on a one-page fixture with real pdf-lib.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const REPO = process.cwd();
const src = readFileSync(resolve(REPO, 'doc_pipeline_source.jsx'), 'utf8');
const PDFLib = require(resolve(REPO, 'desktop/mcp/vendor/pdf-lib.min.js'));
const pako = require(resolve(REPO, 'desktop/mcp/vendor/pako.min.js'));
const from = src.indexOf('  const _stage4_maskStrings = (s) => {');
const to = src.indexOf('  // Lazy-load Tesseract.js from CDN.', from);
if (from < 0 || to < 0) throw new Error('slice markers missing');
const { tryWrap } = new Function('window', 'const _withTimeout = (p) => p;\n' + src.slice(from, to) + '\nreturn { tryWrap: _stage4_tryWrapPage };')({ pako, PDFLib });

const { PDFDocument, PDFName, PDFString, PDFNumber, PDFHexString } = PDFLib;
const STREAM = [
  '0.86 1 0.98 rg 91.6 738 491.6 30 re f', // background fill outside any marked content
  'BT /Content <</MCID 0 >>BDC /F1 12 Tf 1 0 0 1 72 700 Tm (Form 1040) Tj EMC',
  '/Content <</MCID 1 >>BDC 1 0 0 1 72 650 Tm (b Taxable interest) Tj EMC ET',
  '/Artifact <</MCID 2 >>BDC 0 0 0 RG 0 0 m 0 -24.5 l S EMC', // source artifact carrying an MCID
  '/Artifact <</Type /Pagination /Subtype /Footer >>BDC BT 1 0 0 1 72 160 Tm (   ) Tj ET 72 169 144 0.72 re f EMC',
].join('\n');
const shape = (str, y) => ({ str, x: 72, y, fontScale: 12, fontName: 'F1', width: 60, height: 12, symbolic: false, hasEOL: false });

const run = async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const ctx = doc.context;
  page.node.set(PDFName.of('Contents'), ctx.register(ctx.stream(STREAM)));
  const pdfjsItems = [['Form 1040', 700], ['b Taxable interest', 650]].map(([str, y]) => ({ str, transform: [12, 0, 0, 12, 72, y], width: 60, height: 12, fontName: 'F1' }));
  const pdfjsDoc = { getPage: async () => ({ getTextContent: async () => ({ styles: {}, items: pdfjsItems }) }) };
  // The marked-content probe's per-segment text: three line segments, the footer one blank.
  const probe = new Map([[0, [[shape('Form 1040', 700)], [shape('b Taxable interest', 650)], []]]]);
  const outline = [{ role: 'H1', text: 'Form 1040' }, { role: 'TD', text: 'b Taxable interest' }];
  const res = await tryWrap(page, 0, pdfjsDoc, outline, ctx, { PDFName, PDFString, PDFNumber, PDFHexString }, ctx.nextRef(), new Set(), probe);
  const out = Array.from(ctx.lookup(page.node.get(PDFName.of('Contents'))).getContents(), (c) => String.fromCharCode(c)).join('');
  const roles = ctx.lookup(res.parentArrayRef).asArray().map((r) => String(ctx.lookup(r).get(PDFName.of('S'))));
  return { out, roles };
};

// Marked-content walk: every BDC/BMC with its tag, MCID and ancestors; every path-painting operator
// with its ancestors. Strings are dropped first (the fixture has no parentheses inside them).
const walk = (s) => {
  const toks = s.replace(/\([^)]*\)/g, ' ').match(/<<|>>|\/[^\s\/\[\]<>()]+|[A-Za-z*]+|[-\d.]+/g);
  const stack = [], seqs = [], paints = [];
  let dict = 0, tag = null, mcid = null;
  for (const t of toks) {
    if (t === '<<') { dict++; continue; }
    if (t === '>>') { dict--; continue; }
    if (dict) { if (/^\d+$/.test(t) && mcid === '?') mcid = Number(t); else if (t === '/MCID') mcid = '?'; continue; }
    if (t[0] === '/') { if (tag === null) tag = t; continue; }
    if (/^[-\d.]/.test(t)) continue;
    if (t === 'BDC' || t === 'BMC') { const q = { tag, mcid: typeof mcid === 'number' ? mcid : null, up: stack.slice() }; seqs.push(q); stack.push(q); }
    else if (t === 'EMC') stack.pop();
    else if (/^(S|s|f|F|f\*|B|B\*|b|b\*)$/.test(t)) paints.push(stack.slice());
    tag = null; mcid = null;
  }
  return { seqs, paints };
};

describe('Stage 4 on a source that was already tagged', () => {
  it('every MCID in the page is ours and unique (no source MCID survives)', async () => {
    const { out } = await run();
    const ids = walk(out).seqs.filter((q) => q.mcid !== null).map((q) => q.mcid);
    expect(ids).toEqual([0, 1]);
  });
  it('no tagged content nests in tagged content or in an artifact, and no artifact is tagged (7.1-1/7.1-2)', async () => {
    const { seqs } = walk((await run()).out);
    const bad = seqs.filter((q) => (q.mcid !== null && q.up.some((u) => u.mcid !== null || u.tag === '/Artifact'))
      || (q.tag === '/Artifact' && (q.mcid !== null || q.up.some((u) => u.mcid !== null))));
    expect(bad.length, JSON.stringify(bad.map((q) => q.tag + ' ' + q.mcid))).toBe(0);
  });
  it('every path is drawn inside an artifact or tagged content (7.1-3)', async () => {
    const { paints } = walk((await run()).out);
    expect(paints.length).toBe(3);
    expect(paints.filter((up) => !up.some((u) => u.tag === '/Artifact' || u.mcid !== null)).length).toBe(0);
  });
  it('a flat block whose outline role is a table cell is a /P, not a /TD outside a TR (7.2-9)', async () => {
    expect((await run()).roles).toEqual(['/H1', '/P']);
  });
});
