// outline_accessible_html + edit_accessible_html (2026-11-08): a person tells the agent what to change in the accessible
// version ("make that an H3"), the agent does it through these two tools, and pdf_finalize_edited_html builds the tagged PDF
// from the result. Neither tool uses a model or a key. The module's own operations are covered by accessible_html_edit.test.js
// against jsdom; this file drives the real server, the headless page, the files it writes and the hand-off to the tagger.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 300000, hookTimeout: 60000 });
const requireCjs = createRequire(import.meta.url);
const PDFLib = requireCjs(resolve(process.cwd(), 'desktop/mcp/vendor/pdf-lib.min.js'));
const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const tmp = mkdtempSync(join(tmpdir(), 'alloflow-edit-html-'));
const sha = (b) => createHash('sha256').update(b).digest('hex');

let child, nextId = 1, buffer = '';
const pending = new Map();
function onStdout(chunk) {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
    if (!line.trim()) continue;
    let msg; try { msg = JSON.parse(line); } catch (_) { continue; }
    if (msg.id === undefined) continue;
    const r = pending.get(msg.id); if (r) { pending.delete(msg.id); r(msg); }
  }
}
const request = (method, params, ms = 20000) => new Promise((res, rej) => {
  const id = nextId++;
  const t = setTimeout(() => { pending.delete(id); rej(new Error('timeout waiting for ' + method)); }, ms);
  pending.set(id, (m) => { clearTimeout(t); res(m); });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
});
const call = async (name, args, ms = 280000) => (await request('tools/call', { name, arguments: args }, ms)).result;
// the text of a refusal, whichever way the server reports it
const refusal = async (name, args) => { const r = await request('tools/call', { name, arguments: args }, 60000); return r.error ? r.error.message : (r.result.isError ? r.result.content[0].text : null); };

async function makePdf(file) {
  const doc = await PDFLib.PDFDocument.create();
  const regular = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]);
  let y = 720;
  const put = (t, size, font) => { page.drawText(t, { x: 72, y, size, font }); y -= size + 14; };
  put('Water Cycle Guide', 24, bold);
  put('Evaporation', 16, bold);
  put('Heat from the sun turns liquid water into vapor that rises into the air.', 11, regular);
  put('Condensation', 16, bold);
  put('Cooling vapor forms tiny droplets that gather into clouds above the land.', 11, regular);
  put('Precipitation', 16, bold);
  put('Heavy droplets fall as rain or snow and the cycle begins again.', 11, regular);
  doc.setTitle('Water Cycle Guide'); doc.setLanguage('en-US');
  writeFileSync(file, await doc.save());
}
// What a run writes as <name>-accessible.html: Precipitation is a level 2 heading here, and the person wants level 3.
const RUN_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Water Cycle Guide</title></head><body>'
  + '<a href="#main-content" class="skip">Skip to main content</a><main id="main-content">'
  + '<h1>Water Cycle Guide</h1><h2>Evaporation</h2><p>Heat from the sun turns liquid water into vapor that rises into the air.</p>'
  + '<h2>Condensation</h2><p>Cooling vapor forms tiny droplets that gather into clouds above the land.</p>'
  + '<h2>Precipitation</h2><p>Heavy droplets fall as rain or snow and the cycle begins again.</p></main></body></html>';

async function roleCounts(pdfPath) {
  const { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef } = PDFLib;
  const d = await PDFDocument.load(new Uint8Array(readFileSync(pdfPath)), { updateMetadata: false });
  const look = (x) => (x instanceof PDFRef ? d.context.lookup(x) : x);
  const counts = {};
  const walk = (x) => {
    const n = look(x);
    if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
    if (!(n instanceof PDFDict)) return;
    const s = n.get(PDFName.of('S'));
    if (s) { const r = String(s).slice(1); counts[r] = (counts[r] || 0) + 1; }
    const k = n.get(PDFName.of('K')); if (k != null) walk(k);
  };
  walk(look(d.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
  return counts;
}

// The roles in the saved tag tree, in reading order (what a screen reader walks through).
async function roleOrder(pdfPath) {
  const { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef } = PDFLib;
  const d = await PDFDocument.load(new Uint8Array(readFileSync(pdfPath)), { updateMetadata: false });
  const look = (x) => (x instanceof PDFRef ? d.context.lookup(x) : x);
  const order = [];
  const walk = (x) => {
    const n = look(x);
    if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
    if (!(n instanceof PDFDict)) return;
    const s = n.get(PDFName.of('S'));
    if (s) order.push(String(s).slice(1));
    const k = n.get(PDFName.of('K')); if (k != null) walk(k);
  };
  walk(look(d.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
  return order;
}

let cap;
const needsChromium = (fn) => async () => { if (!cap.chromiumInstalled) return; await fn(); };
// a fresh working folder per test, so the numbered output names are predictable
let n = 0;
function workspace() {
  const dir = join(tmp, 'w' + (++n));
  mkdirSync(dir, { recursive: true });
  const pdf = join(dir, 'guide.pdf');
  const accessible = join(dir, 'guide-accessible.html');
  writeFileSync(accessible, RUN_HTML);
  return { dir, pdf, accessible };
}
const outline = async (file, extra) => (await call('outline_accessible_html', { file_path: file, ...extra })).structuredContent;
const idOfHeading = (o, text) => o.items.find((i) => i.kind === 'heading' && i.text === text).id;

beforeAll(async () => {
  const env = { ...process.env };
  delete env.GEMINI_API_KEY; env.ALLOFLOW_MCP_NO_KEY_FILES = '1'; env.ALLOFLOW_MCP_STATE_DIR = join(tmp, 'state');
  child = spawn(process.execPath, [SERVER], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env });
  child.stdout.setEncoding('utf-8'); child.stdout.on('data', onStdout);
  await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'edit-html', version: '0' } });
  cap = (await call('remediation_capabilities', {})).structuredContent;
});
afterAll(() => { if (child) child.kill(); rmSync(tmp, { recursive: true, force: true }); });

describe('outline_accessible_html and edit_accessible_html: registration and argument checks (no browser)', () => {
  it('are registered, need no key, and are classified as tools that make no network request at all', async () => {
    for (const name of ['outline_accessible_html', 'edit_accessible_html']) {
      expect(cap.keylessToolNames, name).toContain(name);
      expect(cap.geminiRequiredToolNames, name).not.toContain(name);
      expect(cap.dataHandling.offlineToolNames, name).toContain(name);
      expect(cap.dataHandling.publicDependencyDownloadToolNames, name).not.toContain(name);
    }
    const { tools } = (await request('tools/list', {})).result;
    const outlineTool = tools.find((t) => t.name === 'outline_accessible_html');
    const editTool = tools.find((t) => t.name === 'edit_accessible_html');
    expect(outlineTool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, openWorldHint: false });
    expect(editTool.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, openWorldHint: false });
    // no operation can reword text: the schema offers none
    expect(editTool.inputSchema.properties.operations.items.properties.op.enum).toEqual(
      ['set_heading_level', 'make_paragraph', 'set_alt_text', 'set_table_header', 'set_table_caption', 'set_title', 'set_language', 'make_list', 'list_to_paragraphs', 'move_element', 'delete_element']);
    expect(editTool.description).toMatch(/cannot change wording/i);
  });
  it('refuses bad arguments before any browser starts', async () => {
    const w = workspace();
    const base = { file_path: w.accessible, operations: [{ op: 'set_heading_level', id: 'e3', level: 3 }] };
    expect(await refusal('edit_accessible_html', { ...base, operations: [{ op: 'set_text', id: 'e3', text: 'new words' }] })).toMatch(/no operation that rewords text/);
    expect(await refusal('edit_accessible_html', { ...base, operations: [{ op: 'set_heading_level', id: 'e3', level: 3, text: 'x' }] })).toMatch(/text|unknown|additional/i);
    expect(await refusal('edit_accessible_html', { ...base, operations: [] })).toMatch(/1 to 100 operations/);
    expect(await refusal('edit_accessible_html', { ...base, operations: 'make it an h3' })).toMatch(/list of 1 to 100/);
    expect(await refusal('edit_accessible_html', { ...base, expect_sha256: 'abc' })).toMatch(/64-character/);
    expect(await refusal('edit_accessible_html', { ...base, output_path: join(w.dir, 'out.txt') })).toMatch(/end in \.html/);
    expect(await refusal('edit_accessible_html', { ...base, dry_run: 'yes' })).toMatch(/dry_run/);
    expect(await refusal('edit_accessible_html', { ...base, file_path: join(w.dir, 'ghost.html') })).toMatch(/does not exist|unreadable/);
    expect(await refusal('outline_accessible_html', { file_path: w.accessible, kinds: ['text'] })).toMatch(/kinds must be a list/);
    expect(await refusal('outline_accessible_html', { file_path: w.accessible, max_items: 0 })).toMatch(/max_items/);
    expect(await refusal('outline_accessible_html', { file_path: w.accessible, surprise: 1 })).toMatch(/surprise|unknown|additional/i);
    expect(readdirSync(w.dir).sort()).toEqual(['guide-accessible.html']); // nothing was written by any of the refusals
  });
});

describe('outline_accessible_html and edit_accessible_html: the real headless page', () => {
  it('outlines the structure with ids and the file hash, and finds a paragraph by its words', needsChromium(async () => {
    const w = workspace();
    const o = await outline(w.accessible);
    expect(o.htmlSha256).toBe(sha(readFileSync(w.accessible)));
    expect(o.document).toMatchObject({ title: 'Water Cycle Guide', lang: 'en' });
    expect(o.items.filter((i) => i.kind === 'heading').map((h) => [h.level, h.text])).toEqual([[1, 'Water Cycle Guide'], [2, 'Evaporation'], [2, 'Condensation'], [2, 'Precipitation']]);
    const found = await outline(w.accessible, { text_contains: 'heavy droplets' });
    expect(found.items).toEqual([expect.objectContaining({ kind: 'paragraph', text: expect.stringContaining('Heavy droplets fall') })]);
    expect(existsSync(join(w.dir, 'guide-accessible-edits.json'))).toBe(false); // read-only: no file written
  }));

  it('writes a NEW numbered file per round plus an edit log, and never changes the input', needsChromium(async () => {
    const w = workspace();
    const o = await outline(w.accessible);
    const r1 = (await call('edit_accessible_html', { file_path: w.accessible, expect_sha256: o.htmlSha256, operations: [{ op: 'set_heading_level', id: idOfHeading(o, 'Precipitation'), level: 3 }] })).structuredContent;
    expect(basename(r1.output)).toBe('guide-accessible-edited.html');
    expect(basename(r1.editLog)).toBe('guide-accessible-edited-edits.json');
    expect(r1.changes.map((c) => c.summary)).toEqual(['Changed the level 2 heading "Precipitation" to a level 3 heading']);
    expect(r1.words.after).toBe(r1.words.before); // the words are exactly the same
    expect(r1.words.removed).toBe(0);
    expect(r1.next).toMatch(/When THEY approve/);
    expect(sha(readFileSync(w.accessible))).toBe(o.htmlSha256); // the run's file is untouched
    expect(readFileSync(r1.output, 'utf8')).toContain('<h3>Precipitation</h3>');
    expect(sha(readFileSync(r1.output))).toBe(r1.htmlSha256);
    // round two on the newest file: the stem stays "guide-accessible", so it is -edited-2, and the stale hash is refused
    const o2 = await outline(r1.output);
    expect(await refusal('edit_accessible_html', { file_path: r1.output, expect_sha256: o.htmlSha256, operations: [{ op: 'set_language', lang: 'en-GB' }] })).toMatch(/does not match this file/);
    const r2 = (await call('edit_accessible_html', { file_path: r1.output, expect_sha256: o2.htmlSha256, operations: [{ op: 'set_language', lang: 'en-GB' }] })).structuredContent;
    expect(basename(r2.output)).toBe('guide-accessible-edited-2.html');
    expect(existsSync(r1.output)).toBe(true); // an earlier round is never lost
    const log2 = JSON.parse(readFileSync(r2.editLog, 'utf8'));
    expect(log2).toMatchObject({ tool: 'edit_accessible_html', baseSha256: r1.htmlSha256, resultSha256: r2.htmlSha256, previousLog: 'guide-accessible-edited-edits.json' });
  }));

  it('is all-or-nothing: one refused operation writes nothing and says which and why', needsChromium(async () => {
    const w = workspace();
    const o = await outline(w.accessible);
    const msg = await refusal('edit_accessible_html', { file_path: w.accessible, operations: [
      { op: 'set_heading_level', id: idOfHeading(o, 'Precipitation'), level: 3 },
      { op: 'set_alt_text', id: idOfHeading(o, 'Evaporation'), alt: 'a picture' },
    ] });
    expect(msg).toMatch(/Nothing was written: 1 of 2 operation\(s\)/);
    expect(msg).toMatch(/operation 2 \(set_alt_text e\d+\): that is a level 2 heading, not an image/);
    expect(readdirSync(w.dir).sort()).toEqual(['guide-accessible.html']);
  }));

  it('dry_run reports the changes and writes nothing; a request that changes nothing writes nothing', needsChromium(async () => {
    const w = workspace();
    const o = await outline(w.accessible);
    const dry = (await call('edit_accessible_html', { file_path: w.accessible, dry_run: true, operations: [{ op: 'set_heading_level', id: idOfHeading(o, 'Precipitation'), level: 3 }] })).structuredContent;
    expect(dry).toMatchObject({ dryRun: true, applied: 1 });
    const noop = (await call('edit_accessible_html', { file_path: w.accessible, operations: [{ op: 'set_heading_level', id: idOfHeading(o, 'Precipitation'), level: 2 }] })).structuredContent;
    expect(noop).toMatchObject({ applied: 0 });
    expect(noop.output).toBeUndefined();
    expect(readdirSync(w.dir).sort()).toEqual(['guide-accessible.html']);
  }));

  it('hands over to pdf_finalize_edited_html: the PDF has the new level, and the report lists what the edit tool changed', needsChromium(async () => {
    const w = workspace(); await makePdf(w.pdf);
    const o = await outline(w.accessible);
    const r1 = (await call('edit_accessible_html', { file_path: w.accessible, operations: [{ op: 'set_heading_level', id: idOfHeading(o, 'Precipitation'), level: 3 }] })).structuredContent;
    const fin = (await call('pdf_finalize_edited_html', { file_path: w.pdf, edited_html_path: r1.output, confirmed_by: 'Ms. Rivera, art teacher', validate_ua: !!cap.javaAvailable })).structuredContent;
    expect(await roleCounts(fin.files.taggedPdf)).toMatchObject({ H1: 1, H2: 2, H3: 1 });
    expect(fin.personEdit.editedWith).toMatchObject({
      tool: 'edit_accessible_html', logMatchesFile: true, rounds: 1, changeCount: 1,
      changes: ['Changed the level 2 heading "Precipitation" to a level 3 heading'],
    });
    const report = JSON.parse(readFileSync(fin.files.report, 'utf8'));
    expect(report.personEdit.editedWith.changes).toEqual(fin.personEdit.editedWith.changes);
    expect(fin.deliveryExplanation.headline).toMatch(/^Built from the accessible version Ms. Rivera, art teacher edited and approved .*1 change made with the edit tool is listed in the report. /);
    expect(fin.verdict.level).not.toBe('ready');
  }));

  it('reading order: a paragraph moved up comes first in the tag tree of the PDF, and the PDF is still verified', needsChromium(async () => {
    const w = workspace(); await makePdf(w.pdf);
    const o = await outline(w.accessible, { kinds: ['heading', 'paragraph'] });
    const heavy = o.items.find((i) => i.kind === 'paragraph' && i.text.startsWith('Heavy droplets')).id;
    const r1 = (await call('edit_accessible_html', { file_path: w.accessible, operations: [{ op: 'move_element', id: heavy, before_id: idOfHeading(o, 'Evaporation') }] })).structuredContent;
    expect(r1.changes[0].summary).toMatch(/^Moved the paragraph "Heavy droplets .*" to just before the level 2 heading "Evaporation"$/);
    expect(r1.words.removed).toBe(0);
    const fin = (await call('pdf_finalize_edited_html', { file_path: w.pdf, edited_html_path: r1.output, confirmed_by: 'Ms. Rivera', validate_ua: !!cap.javaAvailable })).structuredContent;
    expect(fin.taggedPdfDelivery).toEqual({ ok: true, code: 'verified' });
    expect(fin.contentCoverage).toMatchObject({ status: 'matched', missingTokens: 0 });
    const order = await roleOrder(fin.files.taggedPdf);
    expect(order.slice(order.indexOf('H1'), order.indexOf('H1') + 3)).toEqual(['H1', 'P', 'Sect']); // title, the moved paragraph, then the first section
    if (cap.javaAvailable) expect(fin.pdfUa.status).toBe('passed');
  }));

  it('lists every round when the person asked for more than once, oldest first', needsChromium(async () => {
    const w = workspace(); await makePdf(w.pdf);
    const o = await outline(w.accessible);
    const r1 = (await call('edit_accessible_html', { file_path: w.accessible, operations: [{ op: 'set_heading_level', id: idOfHeading(o, 'Precipitation'), level: 3 }] })).structuredContent;
    const r2 = (await call('edit_accessible_html', { file_path: r1.output, operations: [{ op: 'set_language', lang: 'en-GB' }] })).structuredContent;
    const fin = (await call('pdf_finalize_edited_html', { file_path: w.pdf, edited_html_path: r2.output, confirmed_by: 'Ms. Rivera', validate_ua: false })).structuredContent;
    expect(fin.personEdit.editedWith).toMatchObject({ rounds: 2, changeCount: 2, logMatchesFile: true });
    expect(fin.personEdit.editedWith.changes).toEqual(['Changed the level 2 heading "Precipitation" to a level 3 heading', 'Set the language of the whole document to en-GB']);
  }));

  it('says so when the file was changed after the edit tool wrote it, instead of listing changes it cannot vouch for', needsChromium(async () => {
    const w = workspace(); await makePdf(w.pdf);
    const o = await outline(w.accessible);
    const r1 = (await call('edit_accessible_html', { file_path: w.accessible, operations: [{ op: 'set_heading_level', id: idOfHeading(o, 'Precipitation'), level: 3 }] })).structuredContent;
    writeFileSync(r1.output, readFileSync(r1.output, 'utf8').replace('<h3>Precipitation</h3>', '<h3>Precipitation </h3>')); // a hand edit afterwards
    const fin = (await call('pdf_finalize_edited_html', { file_path: w.pdf, edited_html_path: r1.output, confirmed_by: 'Ms. Rivera', validate_ua: false })).structuredContent;
    expect(fin.personEdit.editedWith).toMatchObject({ logMatchesFile: false });
    expect(fin.personEdit.editedWith.changes).toBeUndefined();
    expect(fin.personEdit.editedWith.note).toMatch(/changed after the edit tool wrote it/);
  }));

  it('a file with no edit log gets no editedWith, as before', needsChromium(async () => {
    const w = workspace(); await makePdf(w.pdf);
    const fin = (await call('pdf_finalize_edited_html', { file_path: w.pdf, edited_html_path: w.accessible, confirmed_by: 'Ms. Rivera', validate_ua: false })).structuredContent;
    expect(fin.personEdit.editedWith).toBeUndefined();
  }));
});
