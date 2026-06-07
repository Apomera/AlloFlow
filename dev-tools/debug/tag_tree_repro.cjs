// C:/tmp/tag_tree_repro.cjs — Standalone pdf-lib repro for the tag-tree
// content-loss bug from commit b0d24ae3.
//
// Tests three variants of Sect → [H1, P, P] construction to isolate why
// level-0 <p> leaves dangle in createTaggedPdf's tryNested path when MCID
// linkage is added.

let pdfLib;
// AlloFlow loads pdf-lib via CDN at runtime (window.PDFLib), not as a node_modules
// dependency, so this standalone repro looks for it in C:/tmp/node_modules first.
// To install: `cd C:/tmp && npm install pdf-lib@1.17.1 --no-save`
const candidates = [
  'C:/tmp/node_modules/pdf-lib',
  'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/pdf-lib',
  'pdf-lib',
];
for (const p of candidates) {
  try { pdfLib = require(p); console.log('Using pdf-lib from:', p); break; }
  catch (_) {}
}
if (!pdfLib) {
  console.error('pdf-lib not found. Install with: cd C:/tmp && npm install pdf-lib@1.17.1 --no-save');
  process.exit(1);
}
const { PDFDocument, PDFName, PDFNumber, PDFString, PDFOperator, PDFOperatorNames, StandardFonts } = pdfLib;

async function runVariant(name, build) {
  console.log(`\n=== Variant ${name} ===`);
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const context = doc.context;
  const catalog = doc.catalog;

  const structRootRef = context.nextRef();

  let buildResult;
  try {
    buildResult = await build({ doc, page, font, context, structRootRef });
  } catch (e) {
    console.log(`  [CRASH IN BUILD] ${e.message}`);
    return { ok: false, counts: {}, error: e.message };
  }
  const { rootKids, leafRefs } = buildResult;

  const structTreeRoot = context.obj({
    Type: PDFName.of('StructTreeRoot'),
    K: context.obj(rootKids),
    ParentTreeNextKey: PDFNumber.of(1),
    ParentTree: context.obj({ Nums: context.obj([PDFNumber.of(0), context.obj(leafRefs)]) }),
  });
  context.assign(structRootRef, structTreeRoot);
  catalog.set(PDFName.of('StructTreeRoot'), structRootRef);
  catalog.set(PDFName.of('MarkInfo'), context.obj({ Marked: true }));
  page.node.set(PDFName.of('StructParents'), PDFNumber.of(0));

  const bytes = await doc.save({ useObjectStreams: false });
  const reloaded = await PDFDocument.load(bytes);
  const counts = { Sect: 0, H1: 0, P: 0, other: 0 };
  const seenRoles = [];
  for (const [ref, obj] of reloaded.context.enumerateIndirectObjects()) {
    try {
      if (!obj || !obj.get) continue;
      const ty = obj.get(PDFName.of('Type'));
      if (!ty || String(ty) !== '/StructElem') continue;
      const s = obj.get(PDFName.of('S'));
      const role = s ? String(s).replace(/^\//, '') : 'other';
      counts[role] = (counts[role] || 0) + 1;
      seenRoles.push(`${role}(${ref.toString()})`);
    } catch (_) {}
  }
  console.log(`  byteLength:        ${bytes.length}`);
  console.log(`  StructElem counts: ${JSON.stringify(counts)}`);
  console.log(`  seen StructElems:  ${seenRoles.join(' ') || '(none)'}`);
  console.log(`  expected:          {"Sect":1,"H1":1,"P":2}`);
  const ok = counts.Sect === 1 && counts.H1 === 1 && counts.P === 2;
  console.log(ok ? '  [PASS] all 3 leaves serialized' : '  [FAIL] leaves dropped');
  return { ok, counts };
}

function registerLeaf(context, role, parentRef, page, mcid, text) {
  const mcr = context.obj({ Type: PDFName.of('MCR'), Pg: page.ref, MCID: PDFNumber.of(mcid) });
  const d = {
    Type: PDFName.of('StructElem'),
    S: PDFName.of(role),
    P: parentRef,
    Pg: page.ref,
    K: context.obj([mcr]),
    ActualText: PDFString.of(text),
  };
  return context.register(context.obj(d));
}

function drawRun(context, page, font, role, mcid, text, y) {
  // BDC operand 2 is a property-list dict: << /MCID n >>
  const mcidDict = context.obj({ MCID: PDFNumber.of(mcid) });
  const BDC = PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [PDFName.of(role), mcidDict]);
  const EMC = PDFOperator.of(PDFOperatorNames.EndMarkedContent, []);
  page.pushOperators(BDC);
  page.drawText(text, { font, size: 1, opacity: 0, x: 10, y });
  page.pushOperators(EMC);
}

// ── VARIANT A: openSect-mirror — reserve Sect ref first, register leaves between, assign Sect last ──
async function variantA(ctx) {
  const { context, page, font, structRootRef } = ctx;
  const sectRef = context.nextRef();
  const rootKids = [sectRef];
  const sectKids = [];

  drawRun(context, page, font, 'H1', 0, 'Chapter One', 700);
  sectKids.push(registerLeaf(context, 'H1', sectRef, page, 0, 'Chapter One'));

  drawRun(context, page, font, 'P', 1, 'Paragraph one.', 680);
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 1, 'Paragraph one.'));

  drawRun(context, page, font, 'P', 2, 'Paragraph two.', 660);
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 2, 'Paragraph two.'));

  context.assign(sectRef, context.obj({
    Type: PDFName.of('StructElem'),
    S: PDFName.of('Sect'),
    P: structRootRef,
    K: context.obj(sectKids),
  }));
  return { rootKids, leafRefs: sectKids };
}

// ── VARIANT B: Register Sect FIRST with empty K, register leaves AFTER, patch Sect's K via lookup ──
async function variantB(ctx) {
  const { context, page, font, structRootRef } = ctx;
  const sectDict = context.obj({
    Type: PDFName.of('StructElem'),
    S: PDFName.of('Sect'),
    P: structRootRef,
    K: context.obj([]),
  });
  const sectRef = context.register(sectDict);
  const rootKids = [sectRef];
  const sectKids = [];

  drawRun(context, page, font, 'H1', 0, 'Chapter One', 700);
  sectKids.push(registerLeaf(context, 'H1', sectRef, page, 0, 'Chapter One'));

  drawRun(context, page, font, 'P', 1, 'Paragraph one.', 680);
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 1, 'Paragraph one.'));

  drawRun(context, page, font, 'P', 2, 'Paragraph two.', 660);
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 2, 'Paragraph two.'));

  const sectLookup = context.lookup(sectRef);
  sectLookup.set(PDFName.of('K'), context.obj(sectKids));
  return { rootKids, leafRefs: sectKids };
}

// ── VARIANT C: register leaves FIRST (no Sect at all), put refs directly in rootKids ──
// If C passes but A+B fail, the bug is something about wrapping leaves under a Sect.
async function variantC(ctx) {
  const { context, page, font, structRootRef } = ctx;
  const rootKids = [];
  const leafRefs = [];

  drawRun(context, page, font, 'H1', 0, 'Chapter One', 700);
  const h1 = registerLeaf(context, 'H1', structRootRef, page, 0, 'Chapter One');
  rootKids.push(h1); leafRefs.push(h1);

  drawRun(context, page, font, 'P', 1, 'Paragraph one.', 680);
  const p1 = registerLeaf(context, 'P', structRootRef, page, 1, 'Paragraph one.');
  rootKids.push(p1); leafRefs.push(p1);

  drawRun(context, page, font, 'P', 2, 'Paragraph two.', 660);
  const p2 = registerLeaf(context, 'P', structRootRef, page, 2, 'Paragraph two.');
  rootKids.push(p2); leafRefs.push(p2);

  return { rootKids, leafRefs };
}

// ── VARIANT D: multi-Sect cycle (matches a 2-heading/2-paragraph fixture mentioned in the design doc) ──
// Two Sects, each containing [H, P]. First Sect is CLOSED via context.assign BEFORE the second
// Sect opens. Tests whether close-then-open invalidates leaves of the first Sect.
async function variantD(ctx) {
  const { context, page, font, structRootRef } = ctx;
  const rootKids = [];
  const allLeafRefs = [];

  // First Sect cycle
  const sect1Ref = context.nextRef();
  rootKids.push(sect1Ref);
  const sect1Kids = [];
  drawRun(context, page, font, 'H1', 0, 'Heading One', 720);
  sect1Kids.push(registerLeaf(context, 'H1', sect1Ref, page, 0, 'Heading One'));
  allLeafRefs.push(sect1Kids[sect1Kids.length - 1]);
  drawRun(context, page, font, 'P', 1, 'Paragraph one.', 700);
  sect1Kids.push(registerLeaf(context, 'P', sect1Ref, page, 1, 'Paragraph one.'));
  allLeafRefs.push(sect1Kids[sect1Kids.length - 1]);
  // Close Sect 1 (assign)
  context.assign(sect1Ref, context.obj({
    Type: PDFName.of('StructElem'), S: PDFName.of('Sect'), P: structRootRef, K: context.obj(sect1Kids),
  }));

  // Second Sect cycle (mimics the closeTo + openSect pattern between iterations)
  const sect2Ref = context.nextRef();
  rootKids.push(sect2Ref);
  const sect2Kids = [];
  drawRun(context, page, font, 'H1', 2, 'Heading Two', 680);
  sect2Kids.push(registerLeaf(context, 'H1', sect2Ref, page, 2, 'Heading Two'));
  allLeafRefs.push(sect2Kids[sect2Kids.length - 1]);
  drawRun(context, page, font, 'P', 3, 'Paragraph two.', 660);
  sect2Kids.push(registerLeaf(context, 'P', sect2Ref, page, 3, 'Paragraph two.'));
  allLeafRefs.push(sect2Kids[sect2Kids.length - 1]);
  context.assign(sect2Ref, context.obj({
    Type: PDFName.of('StructElem'), S: PDFName.of('Sect'), P: structRootRef, K: context.obj(sect2Kids),
  }));

  return { rootKids, leafRefs: allLeafRefs };
}

// ── VARIANT E: plain-object BDC operand (suspected silent-fail in pdf-lib) ──
// Tests whether passing { MCID: PDFNumber.of(n) } (a plain JS object, NOT a PDFDict made
// via context.obj()) to PDFOperator.of(BDC, [PDFName, object]) silently fails to serialize
// and corrupts the surrounding tag tree.
function drawRunPlainObj(context, page, font, role, mcid, text, y) {
  const BDC = PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [
    PDFName.of(role),
    { MCID: PDFNumber.of(mcid) }, // <-- plain object, not PDFDict
  ]);
  const EMC = PDFOperator.of(PDFOperatorNames.EndMarkedContent, []);
  page.pushOperators(BDC);
  page.drawText(text, { font, size: 1, opacity: 0, x: 10, y });
  page.pushOperators(EMC);
}
async function variantE(ctx) {
  const { context, page, font, structRootRef } = ctx;
  const sectRef = context.nextRef();
  const rootKids = [sectRef];
  const sectKids = [];
  drawRunPlainObj(context, page, font, 'H1', 0, 'Chapter One', 700);
  sectKids.push(registerLeaf(context, 'H1', sectRef, page, 0, 'Chapter One'));
  drawRunPlainObj(context, page, font, 'P', 1, 'Paragraph one.', 680);
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 1, 'Paragraph one.'));
  drawRunPlainObj(context, page, font, 'P', 2, 'Paragraph two.', 660);
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 2, 'Paragraph two.'));
  context.assign(sectRef, context.obj({
    Type: PDFName.of('StructElem'), S: PDFName.of('Sect'), P: structRootRef, K: context.obj(sectKids),
  }));
  return { rootKids, leafRefs: sectKids };
}

// ── VARIANT F: draw-AFTER-register ordering ──
// Mimics the createTaggedPdf flow where _buildOutlineStructElems() runs FIRST (registering
// all StructElems with /K → MCR refs to MCIDs that don't exist yet), THEN the page loop
// draws BDC/EMC for those MCIDs.
async function variantF(ctx) {
  const { context, page, font, structRootRef } = ctx;
  const sectRef = context.nextRef();
  const rootKids = [sectRef];
  const sectKids = [];
  // PHASE 1: register all StructElems with MCRs pointing to MCIDs that don't yet exist
  sectKids.push(registerLeaf(context, 'H1', sectRef, page, 0, 'Chapter One'));
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 1, 'Paragraph one.'));
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 2, 'Paragraph two.'));
  context.assign(sectRef, context.obj({
    Type: PDFName.of('StructElem'), S: PDFName.of('Sect'), P: structRootRef, K: context.obj(sectKids),
  }));
  // PHASE 2: page loop draws BDC/EMC after registration is complete
  drawRun(context, page, font, 'H1', 0, 'Chapter One', 700);
  drawRun(context, page, font, 'P', 1, 'Paragraph one.', 680);
  drawRun(context, page, font, 'P', 2, 'Paragraph two.', 660);
  return { rootKids, leafRefs: sectKids };
}

// ── VARIANT H: TRUE "continue past Stage-3 flat-/P" — per-leaf BDC/EMC only, no outer wrap ──
// b0d24ae3's design doc explicitly says it `continue`d past the flat-/P path. That means
// (a) the per-page /P StructElem from Stage 3 was NOT created, (b) page.node.set(StructParents, pi)
// was likely NOT called for the unify page, (c) the ParentTree.Nums entry for that page was
// populated DIFFERENTLY — as an array indexed by per-leaf MCID rather than a single ref.
// Tests whether this entire "skip Stage 3, replace with per-leaf wrap" pattern is the cause.
async function variantH(ctx) {
  const { context, page, font, structRootRef } = ctx;
  const sectRef = context.nextRef();
  const rootKids = [sectRef];
  const sectKids = [];

  // Per-leaf draw with unique MCIDs starting at 0 (no Stage-3 outer wrap).
  drawRun(context, page, font, 'H1', 0, 'Chapter One', 700);
  sectKids.push(registerLeaf(context, 'H1', sectRef, page, 0, 'Chapter One'));
  drawRun(context, page, font, 'P', 1, 'Paragraph one.', 680);
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 1, 'Paragraph one.'));
  drawRun(context, page, font, 'P', 2, 'Paragraph two.', 660);
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 2, 'Paragraph two.'));

  context.assign(sectRef, context.obj({
    Type: PDFName.of('StructElem'), S: PDFName.of('Sect'), P: structRootRef, K: context.obj(sectKids),
  }));

  // NOTE: do NOT push to a per-page pageElemRef. NO Stage-3 /P. NO Stage-3 wrap.
  // ParentTree.Nums for this page = array indexed by MCID (entries 0, 1, 2).
  // The shared registerLeaf returns leaf refs in document order; runVariant's
  // outer code uses `leafRefs` as the ParentTree.Nums second element.
  // So leafRefs ordering matters here — must match MCID assignment.
  return { rootKids, leafRefs: sectKids };
}

// ── VARIANT I: like H but combines a per-page /P StructElem (Stage-3 style) AS WELL AS per-leaf ──
// Tests whether mixing the two patterns — keeping the per-page /P for ParentTree wiring AND adding
// per-leaf BDC/EMC for granularity — causes one of the patterns to invalidate the other on save.
async function variantI(ctx) {
  const { context, page, font, structRootRef } = ctx;
  const sectRef = context.nextRef();
  const rootKids = [sectRef];
  const sectKids = [];

  // Per-leaf MCIDs 0, 1, 2 (same as H).
  drawRun(context, page, font, 'H1', 0, 'Chapter One', 700);
  sectKids.push(registerLeaf(context, 'H1', sectRef, page, 0, 'Chapter One'));
  drawRun(context, page, font, 'P', 1, 'Paragraph one.', 680);
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 1, 'Paragraph one.'));
  drawRun(context, page, font, 'P', 2, 'Paragraph two.', 660);
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 2, 'Paragraph two.'));

  context.assign(sectRef, context.obj({
    Type: PDFName.of('StructElem'), S: PDFName.of('Sect'), P: structRootRef, K: context.obj(sectKids),
  }));

  // ALSO create a per-page /P StructElem like Stage 3 does (claiming MCID 99 to avoid collision).
  const outerMcr = context.obj({ Type: PDFName.of('MCR'), Pg: page.ref, MCID: PDFNumber.of(99) });
  const pageElemRef = context.register(context.obj({
    Type: PDFName.of('StructElem'), S: PDFName.of('P'), P: structRootRef, Pg: page.ref, K: context.obj([outerMcr]),
  }));
  rootKids.push(pageElemRef);

  // Outer BDC/EMC for MCID 99 (the Stage-3 page-wrap mimic) — separate from per-leaf MCIDs.
  drawRun(context, page, font, 'P', 99, 'Page-wrap outer text', 100);

  return { rootKids, leafRefs: sectKids.concat([pageElemRef]) };
}

// ── VARIANT G: like F but ALSO mimics page-content-stream interaction with Stage 3 flat /P wrap ──
// The failed attempt `continue`d past the flat-/P wrap. Tests whether having BOTH the per-leaf
// BDC/EMC wrap AND an outer /P <</MCID 99>> BDC wrap interferes. If we have to choose one,
// the per-leaf is what unifies the tag tree; the flat-/P would be redundant + might double-tag.
async function variantG(ctx) {
  const { context, page, font, structRootRef } = ctx;
  const sectRef = context.nextRef();
  const rootKids = [sectRef];
  const sectKids = [];
  sectKids.push(registerLeaf(context, 'H1', sectRef, page, 0, 'Chapter One'));
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 1, 'Paragraph one.'));
  sectKids.push(registerLeaf(context, 'P', sectRef, page, 2, 'Paragraph two.'));
  context.assign(sectRef, context.obj({
    Type: PDFName.of('StructElem'), S: PDFName.of('Sect'), P: structRootRef, K: context.obj(sectKids),
  }));
  // Per-leaf BDC/EMC for the unified MCIDs
  drawRun(context, page, font, 'H1', 0, 'Chapter One', 700);
  drawRun(context, page, font, 'P', 1, 'Paragraph one.', 680);
  drawRun(context, page, font, 'P', 2, 'Paragraph two.', 660);
  // Also wrap the entire page content with /P <</MCID 99>> BDC ... EMC like Stage 3 does
  // when the `continue` is NOT taken. This is what would happen if the unify path runs
  // but the Stage 3 wrap also runs (double-tag).
  const BDC_outer = PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [
    PDFName.of('P'), context.obj({ MCID: PDFNumber.of(99) }),
  ]);
  const EMC_outer = PDFOperator.of(PDFOperatorNames.EndMarkedContent, []);
  page.pushOperators(BDC_outer);
  page.pushOperators(EMC_outer);
  return { rootKids, leafRefs: sectKids };
}

async function main() {
  const A = await runVariant('A (openSect-mirror)', variantA);
  const B = await runVariant('B (register-Sect-first-patch-later)', variantB);
  const C = await runVariant('C (flat leaves, no Sect)', variantC);
  const D = await runVariant('D (multi-Sect cycle: 2 Sects, each [H,P])', variantD);
  const E = await runVariant('E (plain-object BDC operand, NOT PDFDict)', variantE);
  const F = await runVariant('F (register ALL leaves first, draw BDC/EMC after)', variantF);
  const G = await runVariant('G (per-leaf BDC/EMC + outer Stage-3 /P wrap = double-tag)', variantG);
  const H = await runVariant('H (TRUE continue-past-Stage-3: per-leaf only, NO Stage-3 /P)', variantH);
  const I = await runVariant('I (per-leaf MCIDs 0/1/2 + per-page /P at MCID 99 = mixed pattern)', variantI);

  console.log('\n=== Full Diagnosis ===');
  // Per-variant expected counts (some variants intentionally produce different shapes).
  const expected = {
    A: { Sect: 1, H1: 1, P: 2 },
    B: { Sect: 1, H1: 1, P: 2 },
    C: { Sect: 0, H1: 1, P: 2 },         // no Sect by design
    D: { Sect: 2, H1: 2, P: 2 },         // 2 Sects each [H, P]
    E: { Sect: 1, H1: 1, P: 2 },
    F: { Sect: 1, H1: 1, P: 2 },
    G: { Sect: 1, H1: 1, P: 2 },
    H: { Sect: 1, H1: 1, P: 2 },
    I: { Sect: 1, H1: 1, P: 3 },         // extra page-/P StructElem
  };
  const all = { A, B, C, D, E, F, G, H, I };
  const trueResults = {};
  for (const [k, v] of Object.entries(all)) {
    const exp = expected[k];
    trueResults[k] = exp.Sect === v.counts.Sect && exp.H1 === v.counts.H1 && exp.P === v.counts.P;
  }
  console.log('True pass map (per-variant expected counts):', JSON.stringify(trueResults));
  const truefails = Object.entries(trueResults).filter(([k, v]) => !v).map(([k]) => k);
  if (truefails.length === 0) {
    console.log('→ ALL 9 variants PASS per their own expected shape.');
    console.log('→ The b0d24ae3 content-loss bug is NOT in any of these surfaces:');
    console.log('   - openSect reserved-ref pattern (A)');
    console.log('   - register-Sect-first-then-patch pattern (B)');
    console.log('   - flat leaves under StructTreeRoot (C)');
    console.log('   - multi-Sect close-and-reopen cycles (D)');
    console.log('   - plain-object vs PDFDict BDC operand encoding (E)');
    console.log('   - register-then-draw vs draw-then-register ordering (F)');
    console.log('   - per-leaf + outer-Stage-3 double-tag (G)');
    console.log('   - TRUE continue-past-Stage-3 (per-leaf only, no flat /P) (H)');
    console.log('   - mixed per-leaf MCIDs + per-page /P at separate MCID (I)');
    console.log('→ Next session: extend the repro with IDTree (for TH cells), RoleMap, the combined');
    console.log('   StructTreeRoot.K array (semantic refs + pageElemRefs + fieldElemRefs concatenated),');
    console.log('   AND/OR instrument the live createTaggedPdf with trace logs. The bug is in');
    console.log('   something specific to the full pipeline context that isolated variants do not reach.');
  } else {
    console.log('→ Variants that produced UNEXPECTED counts: ' + truefails.join(', '));
    for (const k of truefails) {
      console.log('   ' + k + ': got ' + JSON.stringify(all[k].counts) + ', expected ' + JSON.stringify(expected[k]));
    }
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
