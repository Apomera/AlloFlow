#!/usr/bin/env node
/*
 * mcp_model_call_inventory.cjs — what would it take to run a remediation on model access the
 * HOST provides (MCP sampling), instead of a Gemini API key the user has to supply?
 *
 *   node dev-tools/mcp_model_call_inventory.cjs [file.pdf] [--fix-passes N] [--tagged]
 *
 * WHY: MCP sampling lets a server borrow the client's model access, which would remove the
 * separate API key entirely. But sampling carries text / image / audio content — there is no PDF
 * content type. So the question that decides feasibility is not "is rasterizing lossy" (it is,
 * but the pipeline REBUILDS the document rather than patching its tag tree, and the gates that
 * carry the real guarantee run on the OUTPUT). The question is: of the model calls a real
 * remediation makes, how many actually need PDF bytes, and how many are text-only or would be
 * satisfied by page images?
 *
 * HOW: run a real remediation through the real pipeline in headless Chromium against a loopback
 * model, and record every request the pipeline makes — its prompt family, whether it attached
 * inline data, and what MIME type. No Gemini key, no quota, nothing leaves the machine.
 *
 * The output is an inventory, not a verdict. It says what is transportable over sampling today,
 * what is blocked on PDF bytes, and how big the payloads are (the size objection to any
 * document-content proposal is quantitative, so it deserves a number).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const REPO = path.resolve(__dirname, '..');
const Driver = require(path.join(REPO, 'desktop/mcp/remediation_headless_driver.cjs'));

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  if (i === -1) return dflt;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const INPUT = argv.find((a) => !a.startsWith('--') && /\.(pdf|docx|pptx)$/i.test(a))
  || path.join(REPO, 'tests/e2e/artifacts/remediation-e2e.source.pdf');
const FIX_PASSES = Number(flag('--fix-passes', 1));
const TAGGED = argv.includes('--tagged');
const IMAGES = argv.includes('--images');

// ── Scripted replies, contract-shaped ───────────────────────────────────────
// Same strict-parse contract the shipped self-test and the e2e fixtures encode: issues need
// ruleId/claimKind/count, replies need confidence + the document-metadata booleans, or the
// pipeline discards them as "no evidence" and the run never reaches the stages we want to see.
const AUDIT_PDF = JSON.stringify({
  score: 55, summary: 'inventory run', confidence: 'high', documentLanguage: 'en',
  pageCount: 1, hasSearchableText: true, hasImages: false, hasTables: false, hasForms: false,
  critical: [],
  serious: [{ ruleId: 'document-title', claimKind: 'absence', issue: 'The document has no title entry.', wcag: '2.4.2', count: 1, location: 'document' }],
  moderate: [], minor: [], passes: ['document has a language'],
});
const AUDIT_HTML = JSON.stringify({
  score: 78, summary: 'inventory output audit',
  issues: [{ ruleId: 'document-title', claimKind: 'absence', issue: 'The document has no title entry.', wcag: '2.4.2', count: 1 }],
  passes: ['document has a language'],
});

// Prompt families, in match order. `needs` is the honest answer to "what would this call require
// if it went over MCP sampling?" — 'pdf' means it currently attaches the document itself.
const FAMILIES = [
  { key: 'liveness-probe', needs: 'text', test: (p) => /Reply with exactly: OK/.test(p), reply: () => 'OK' },
  { key: 'source-audit (vision)', needs: 'pdf', test: (p) => /accessibility auditor for educational documents/i.test(p) || /SLICE CONTEXT/i.test(p), reply: () => AUDIT_PDF },
  { key: 'output-audit (HTML)', needs: 'text', test: (p) => /Audit this HTML/i.test(p), reply: () => AUDIT_HTML },
  { key: 'structure-extraction', needs: 'pdf-or-image', test: (p) => /Return ONLY a JSON array/i.test(p), reply: () => JSON.stringify([{ type: 'h1', text: 'Inventory Run', id: 'inventory' }]) },
  { key: 'text-extraction / OCR', needs: 'pdf-or-image', test: (p) => /Extract ALL text content/i.test(p), reply: () => '# Inventory Run' },
  { key: 'html-fix', needs: 'text', test: (p) => /raw HTML only|do NOT wrap in JSON|Return the COMPLETE fixed HTML|Return ONLY the fixed fragment/i.test(p), reply: () => '<p>Inventory run body text.</p>' },
  // The two enrichment vision passes. Both attach the PDF today, and both are asking questions a
  // RENDERED PAGE answers at least as well: "what figures are on it" and "what colours does it
  // use". Naming them matters — they were 2 of the 4 blocked calls hiding in an "other" bucket.
  // Two distinct image passes exist: a light inventory during extraction, and a detailed
  // describe-every-image pass in the fix path. Both ask what a rendered page plainly shows.
  { key: 'image-inventory (vision)', needs: 'image', test: (p) => /List any significant images, diagrams, charts, or figures/i.test(p), reply: () => JSON.stringify({ images: [], totalImages: 0 }) },
  { key: 'image-describe (vision)', needs: 'image', test: (p) => /Identify and extract ALL images from this PDF/i.test(p), reply: () => JSON.stringify({ images: [], totalImages: 0 }) },
  { key: 'style-extraction (vision)', needs: 'image', test: (p) => /headingColor|accentColor|color scheme/i.test(p), reply: () => JSON.stringify({}) },
  { key: 'ocr-language-detect (vision)', needs: 'image', test: (p) => /PRIMARY written language of this document/i.test(p), reply: () => 'en' },
  { key: 'other-json-array', needs: 'text', test: (p) => /JSON array/i.test(p), reply: () => '[]' },
  { key: 'other-json', needs: 'text', test: (p) => /\bJSON\b/i.test(p), reply: () => '{}' },
  { key: 'other', needs: 'text', test: () => true, reply: () => '<p>Inventory run body text.</p>' },
];

const calls = [];

function classify(prompt, parts) {
  const fam = FAMILIES.find((f) => f.test(prompt));
  const inline = parts.filter((p) => p.inline_data);
  return {
    family: fam.key,
    declaredNeeds: fam.needs,
    // What it ACTUALLY sent, which is the fact that matters. A family we guessed needs the PDF
    // but that shipped no attachment is transportable today; the reverse is a blocker.
    attachedMime: inline.length ? inline[0].inline_data.mime_type : null,
    attachedParts: inline.length,
    attachedBytes: inline.reduce((n, p) => n + Math.round(String(p.inline_data.data || '').length * 0.75), 0),
    promptChars: prompt.length,
    // Recorded for anything that fell through to a generic bucket, so an unclassified call can be
    // identified and named rather than staying an anonymous row. The pipeline's prompts change;
    // this tool should make its own blind spots legible instead of quietly miscounting them.
    promptHead: /^other/.test(fam.key)
      ? prompt.replace(/^SECURITY BOUNDARY:[\s\S]*?TRUSTED TASK:\s*/i, '').replace(/\s+/g, ' ').slice(0, 160)
      : undefined,
    reply: fam.reply(),
  };
}

(async () => {
  if (!fs.existsSync(INPUT)) { console.error('No such file: ' + INPUT); process.exit(1); }

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let parts = [];
      try { parts = (((JSON.parse(body).contents || [])[0] || {}).parts) || []; } catch (_) {}
      const prompt = parts.map((p) => p.text || '').join('\n');
      const rec = classify(prompt, parts);
      calls.push(rec);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: rec.reply }] }, finishReason: 'STOP' }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));

  const prevKey = process.env.GEMINI_API_KEY;
  const prevBase = process.env.ALLOFLOW_MCP_GEMINI_BASE;
  process.env.GEMINI_API_KEY = 'inventory-loopback-key';
  process.env.ALLOFLOW_MCP_GEMINI_BASE = 'http://127.0.0.1:' + server.address().port + '/v1beta/models';

  const driver = Driver.createDriver({ log: () => {} });
  let failed = null;
  const t0 = Date.now();
  try {
    process.stderr.write('running a real remediation against a loopback model: ' + path.basename(INPUT) + '\n');
    await driver.remediate({
      filePath: INPUT, targetScore: 100,
      fixPasses: FIX_PASSES, polishPasses: 0, taggedPdf: TAGGED, autoContinue: false,
      // --images renders the PDF to page PNGs and sends those instead of the document, which is
      // what running over MCP sampling would require. The inventory then shows whether anything
      // still attaches application/pdf.
      visionMode: IMAGES ? 'images' : undefined,
    });
  } catch (e) {
    failed = (e && e.message) || String(e);
  } finally {
    await driver.close();
    server.close();
    if (prevKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = prevKey;
    if (prevBase === undefined) delete process.env.ALLOFLOW_MCP_GEMINI_BASE; else process.env.ALLOFLOW_MCP_GEMINI_BASE = prevBase;
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const byFamily = new Map();
  for (const c of calls) {
    const f = byFamily.get(c.family) || { family: c.family, needs: c.declaredNeeds, n: 0, withPdf: 0, bytes: 0, promptChars: 0 };
    f.n++;
    if (c.attachedMime === 'application/pdf') { f.withPdf++; f.bytes += c.attachedBytes; }
    f.promptChars += c.promptChars;
    byFamily.set(c.family, f);
  }
  const rows = Array.from(byFamily.values()).sort((a, b) => b.n - a.n);
  const pdfCalls = calls.filter((c) => c.attachedMime === 'application/pdf').length;
  const pdfBytes = calls.reduce((n, c) => n + (c.attachedMime === 'application/pdf' ? c.attachedBytes : 0), 0);
  const imgCalls = calls.filter((c) => c.attachedMime === 'image/png').length;
  const imgBytes = calls.reduce((n, c) => n + (c.attachedMime === 'image/png' ? c.attachedBytes : 0), 0);

  const pad = (s, n) => String(s).padEnd(n);
  console.log('\n═══ Model-call inventory: ' + path.basename(INPUT)
    + ' (fix_passes=' + FIX_PASSES + ', tagged=' + TAGGED + ', vision=' + (IMAGES ? 'PAGE IMAGES' : 'pdf') + ') ═══');
  if (failed) console.log('run ended early: ' + failed + '\n(the inventory below still covers every call it made)');
  console.log('duration        : ' + Math.round((Date.now() - t0) / 1000) + 's');
  console.log('total calls     : ' + calls.length);
  console.log('carrying the PDF: ' + pdfCalls + ' (' + (calls.length ? Math.round((pdfCalls / calls.length) * 100) : 0) + '%), '
    + Math.round(pdfBytes / 1024) + ' KB of document bytes uploaded in total');
  console.log('carrying images : ' + imgCalls + ', ' + Math.round(imgBytes / 1024) + ' KB of page PNGs');
  console.log('');
  console.log(pad('FAMILY', 26) + pad('CALLS', 7) + pad('SENDS PDF', 11) + pad('NEEDS', 15) + 'PROMPT CHARS');
  console.log('-'.repeat(74));
  for (const r of rows) {
    console.log(pad(r.family, 26) + pad(r.n, 7) + pad(r.withPdf, 11) + pad(r.needs, 15) + r.promptChars);
  }
  const unclassified = calls.filter((c) => c.promptHead);
  if (unclassified.length) {
    console.log('\nUnclassified (name these in FAMILIES so they stop hiding in a generic bucket):');
    for (const c of unclassified) console.log('  · ' + (c.attachedMime || 'text') + ' — ' + c.promptHead);
  }

  const transportable = calls.length - pdfCalls;
  console.log('\n── What this means for MCP sampling ──');
  if (IMAGES) {
    const srcKb = Math.round(fs.statSync(INPUT).size / 1024);
    console.log('PAGE-IMAGE MODE: ' + pdfCalls + ' of ' + calls.length + ' calls attach a PDF.');
    console.log(imgCalls + ' carry page images instead, which sampling CAN transport. At zero PDF');
    console.log('attachments the whole run is expressible over host-provided model access — no user key.');
    console.log('');
    console.log('Payload cost, which is the honest tradeoff: the source is ' + srcKb + ' KB; this run pushed');
    console.log(Math.round(imgBytes / 1024) + ' KB of PNGs (' + (srcKb ? (imgBytes / 1024 / srcKb).toFixed(1) : '?') + 'x), because every vision call re-sends every page.');
    console.log('Text-native PDFs inflate the most; scans inflate least, since a scan is already pictures.');
    console.log('Caching rendered pages per run is done; caching them ACROSS calls to one model session is not.');
  } else {
    const blocked = rows.filter((r) => r.withPdf > 0);
    console.log(transportable + ' of ' + calls.length + ' calls attach no document: text content, transportable over sampling today.');
    console.log(pdfCalls + ' attach the PDF. Sampling carries text/image/audio and has no PDF type, so those are blocked as-is.');
    console.log('');
    console.log('Of the blocked set, these would be served by PAGE IMAGES (sampling CAN carry those):');
    for (const r of blocked.filter((r) => r.needs === 'image' || r.needs === 'pdf-or-image')) console.log('  · ' + r.family + ' (' + r.withPdf + ')');
    console.log('Genuinely wants the document itself:');
    for (const r of blocked.filter((r) => r.needs === 'pdf')) console.log('  · ' + r.family + ' (' + r.withPdf + ')');
    console.log('\nRe-run with --images to see the same pipeline with the PDF swapped for rendered pages.');
  }
  console.log('');
  console.log('Either way: every document-attaching call is INPUT UNDERSTANDING. None writes the');
  console.log('deliverable. The gates carrying the real guarantee — axe-core on the produced HTML,');
  console.log('veraPDF on the exported bytes — are deterministic and need no model, so a rougher');
  console.log('source reading costs the "before" number and the fix-hint list, not the accessibility');
  console.log('of what comes out, provided the honesty surfaces keep saying which is which.');

  const outPath = path.join(REPO, 'a11y-audit', 'mcp_model_call_inventory.json');
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({
      input: INPUT, fixPasses: FIX_PASSES, tagged: TAGGED, failed,
      totalCalls: calls.length, pdfCalls, transportableCalls: transportable, pdfKilobytes: Math.round(pdfBytes / 1024),
      families: rows, calls: calls.map(({ reply, ...rest }) => rest),
    }, null, 2), 'utf8');
    console.log('\nrecord: ' + outPath);
  } catch (e) { console.log('\n(could not write the record: ' + ((e && e.message) || e) + ')'); }
})();
