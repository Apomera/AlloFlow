// C:/tmp/tag_tree_repro.cjs — Standalone pdf-lib repro for the tag-tree
// content-loss bug from commit b0d24ae3.
//
// Tests three variants of Sect → [H1, P, P] construction to isolate why
// level-0 <p> leaves dangle in createTaggedPdf's tryNested path when MCID
// linkage is added.

let pdfLib;
try {
  pdfLib = require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/pdf-lib');
  console.log('Using AlloFlow-installed pdf-lib');
} catch (_) {
  try { pdfLib = require('pdf-lib'); console.log('Using globally-resolved pdf-lib'); }
  catch (e) { console.error('pdf-lib not found'); process.exit(1); }
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

async function main() {
  const A = await runVariant('A (openSect-mirror: reserve Sect first, assign last)', variantA);
  const B = await runVariant('B (Sect registered first with empty K, patched later)', variantB);
  const C = await runVariant('C (no Sect wrapper — flat leaves under StructTreeRoot)', variantC);

  console.log('\n=== Diagnosis ===');
  const results = { A: A.ok, B: B.ok, C: C.ok };
  console.log('Results:', JSON.stringify(results));
  if (!A.ok && B.ok) {
    console.log('→ Variant B works, A fails. The openSect reserved-ref pattern IS the cause.');
    console.log('→ Apply Rank 2/3 fix: register Sect first with empty K, patch K later.');
  } else if (A.ok && B.ok && C.ok) {
    console.log('→ All 3 variants PASS. The nested-build ref pattern works in isolation.');
    console.log('→ The b0d24ae3 bug is in Slice-1-specific orchestration (NOT in openSect).');
  } else if (!A.ok && !B.ok && C.ok) {
    console.log('→ Only C (no Sect) works. The Sect wrapper itself is dropping its kids on save.');
    console.log('→ Investigate pdf-lib Sect-with-children serialization OR our MCR shape inside K.');
  } else if (!A.ok && !B.ok && !C.ok) {
    console.log('→ ALL fail — MCR construction in registerLeaf is wrong. Investigate the MCR dict shape.');
  } else {
    console.log('→ Unexpected pattern. Inspect bytes manually.');
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
