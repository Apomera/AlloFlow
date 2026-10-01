// Shared structural-invariant checker for tagged-PDF outputs (deep dive 2026-07-09, goldens item 2).
//
// Every tagged-PDF e2e golden used to assert its own narrow slice (one marker present, one absent).
// The H1 class of bug — duplicate MCID claims when a draw path re-emits, dangling MCRs on pages that
// degraded to artifact-only, unbalanced BDC/EMC from a mid-emission throw — cuts ACROSS specs, so the
// checks live here once and every spec that produces tagged bytes runs the full set:
//
//   dup-claim                     — an MCID claimed by more than one marked-content sequence on a page
//                                   (ISO 32000 §14.7.4 — the exact PAC/Acrobat flag the per-leaf path
//                                   was shipped to retire)
//   dangling-mcr                  — a StructElem MCR pointing at marked content that was never emitted
//                                   (unresolvable reference: hard veraPDF/PAC failure)
//   unbalanced-marked-content     — BDC+BMC vs EMC mismatch in a page's content (broken nesting)
//   artifact-only-structparents   — a page whose content is all /Artifact but which still declares
//                                   StructParents (there is no tagged content to map)
//
// Usage (inside a Playwright spec whose page has window.PDFLib AND window.pako loaded):
//   import { TAGGED_PDF_INVARIANTS_JS } from './_tagged_pdf_invariants';
//   await page.addScriptTag({ content: TAGGED_PDF_INVARIANTS_JS });
//   // ... inside page.evaluate, with `bytes` = the tagged-PDF Uint8Array:
//   const report = await (window as any).__alloTaggedPdfInvariants(bytes);
//   // ... back in Node:
//   expect(report.violations, JSON.stringify(report.violations)).toEqual([]);
//
// pdf-lib Flate-compresses the pushOperators content streams, so raw-byte grepping CANNOT see BDC
// claims (only the uncompressed _mkCS wrapper markers) — the checker inflates every stream via pako.

export const TAGGED_PDF_INVARIANTS_JS = `
window.__alloTaggedPdfInvariants = async function (bytes) {
  const NS = window.PDFLib;
  const pako = window.pako;
  if (!NS || !pako) throw new Error('__alloTaggedPdfInvariants needs window.PDFLib and window.pako');
  const nm = (s) => NS.PDFName.of(s);
  const doc = await NS.PDFDocument.load(bytes, { updateMetadata: false });
  const ctx = doc.context;
  const pages = doc.getPages();
  const pageByObj = new Map();
  pages.forEach((p, i) => pageByObj.set(p.ref.objectNumber, i));
  const deref = (o) => (o instanceof NS.PDFRef ? ctx.lookup(o) : o);
  const decodeStream = (s) => {
    if (!s || !s.contents) return '';
    let b = s.contents;
    try {
      const filter = s.dict && s.dict.get ? String(s.dict.get(nm('Filter')) || '') : '';
      if (filter.indexOf('Flate') !== -1) b = pako.inflate(b);
    } catch (e) { return ''; }
    let txt = '';
    for (let i = 0; i < b.length; i += 8192) txt += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
    return txt;
  };
  // ── Per-page content-stream analysis ──
  const pageReports = pages.map((p, idx) => {
    const contents = deref(p.node.get(nm('Contents')));
    const refs = [];
    if (contents instanceof NS.PDFArray) { for (let k = 0; k < contents.size(); k++) refs.push(contents.get(k)); }
    else if (contents) refs.push(contents);
    let decoded = '';
    for (const r of refs) decoded += '\\n' + decodeStream(deref(r));
    const claims = {};
    const re = /\\/MCID[\\s\\r\\n]+(\\d+)[\\s\\r\\n]*>>[\\s\\r\\n]*BDC/g;
    let m; while ((m = re.exec(decoded))) claims[m[1]] = (claims[m[1]] || 0) + 1;
    const bdc = (decoded.match(/\\bBDC\\b/g) || []).length;
    const bmc = (decoded.match(/\\bBMC\\b/g) || []).length;
    const emc = (decoded.match(/\\bEMC\\b/g) || []).length;
    const structParents = p.node.get(nm('StructParents')) !== undefined;
    const artifactOnly = decoded.indexOf('/Artifact BMC') !== -1 && Object.keys(claims).length === 0;
    return { idx, claims, bdc, bmc, emc, structParents, artifactOnly };
  });
  // ── Collect every MCR the structure tree declares (K: number | MCR dict | array of either;
  //     the MCR dicts our tagger builds are DIRECT objects inside K arrays, so walk StructElems) ──
  const mcrs = [];
  const collectK = (k, elemPgObjNum) => {
    if (k == null) return;
    const kk = deref(k);
    if (kk == null) return;
    if (kk instanceof NS.PDFNumber) { mcrs.push({ pg: elemPgObjNum, mcid: kk.asNumber() }); return; }
    if (kk instanceof NS.PDFArray) { for (let i = 0; i < kk.size(); i++) collectK(kk.get(i), elemPgObjNum); return; }
    if (kk instanceof NS.PDFDict) {
      const t = String(kk.get(nm('Type')) || '');
      if (t === '/MCR') {
        const pgRef = kk.get(nm('Pg'));
        const pg = (pgRef instanceof NS.PDFRef) ? pgRef.objectNumber : elemPgObjNum;
        const mc = deref(kk.get(nm('MCID')));
        mcrs.push({ pg, mcid: (mc instanceof NS.PDFNumber) ? mc.asNumber() : Number(String(mc)) });
      }
      // child StructElems reached via indirect refs are covered by the enumerate loop below
    }
  };
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof NS.PDFDict)) continue;
    if (String(obj.get(nm('Type')) || '') !== '/StructElem') continue;
    const pgRef = obj.get(nm('Pg'));
    const pgObjNum = (pgRef instanceof NS.PDFRef) ? pgRef.objectNumber : null;
    collectK(obj.get(nm('K')), pgObjNum);
  }
  // ── Violations ──
  const violations = [];
  pageReports.forEach((pr) => {
    Object.keys(pr.claims).forEach((mcid) => {
      if (pr.claims[mcid] > 1) violations.push('dup-claim: page ' + (pr.idx + 1) + ' MCID ' + mcid + ' claimed ' + pr.claims[mcid] + ' times');
    });
    if ((pr.bdc + pr.bmc) !== pr.emc) violations.push('unbalanced-marked-content: page ' + (pr.idx + 1) + ' BDC+BMC=' + (pr.bdc + pr.bmc) + ' EMC=' + pr.emc);
    if (pr.artifactOnly && pr.structParents) violations.push('artifact-only-structparents: page ' + (pr.idx + 1));
  });
  mcrs.forEach((r) => {
    if (r.pg == null) { violations.push('mcr-no-page: MCID ' + r.mcid); return; }
    const idx = pageByObj.get(r.pg);
    if (idx === undefined) { violations.push('mcr-unknown-page: obj ' + r.pg + ' MCID ' + r.mcid); return; }
    if (!pageReports[idx].claims[String(r.mcid)]) violations.push('dangling-mcr: page ' + (idx + 1) + ' MCID ' + r.mcid + ' has no content claim');
  });
  return { violations, mcrCount: mcrs.length, pages: pageReports };
};
`;

export const PAKO_CDN = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
