import { describe, expect, it, afterAll } from 'vitest';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const PORTABLE_PY = resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py');
const RENDER_PDF_CJS = resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs');
const SOURCE_PY = resolve(ROOT, 'agent_skills/alloflow-source-remediation/scripts/alloflow_source.py');
const AUDIT_PAGE_CJS = resolve(ROOT, 'agent_skills/alloflow-source-remediation/scripts/audit_page.cjs');
const MCP_SERVER = resolve(ROOT, 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const Driver = require('../desktop/mcp/remediation_headless_driver.cjs');

const scratch = mkdtempSync(join(tmpdir(), 'alloflow-wave3-mcp-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function runPy(code) {
  const out = execFileSync(PYTHON, ['-B', '-c', code], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60_000,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  return JSON.parse(out);
}

function runMcpRequests(requests, envOverrides = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const stateDir = mkdtempSync(join(scratch, 'mcp-state-'));
    const env = { ...process.env, ALLOFLOW_MCP_STATE_DIR: stateDir, ALLOFLOW_MCP_NO_KEY_FILES: '1', ...envOverrides };
    if (!Object.prototype.hasOwnProperty.call(envOverrides, 'GEMINI_API_KEY')) delete env.GEMINI_API_KEY;
    const child = spawn(process.execPath, [MCP_SERVER], { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'], env });
    let buf = '';
    const replies = new Map();
    const timer = setTimeout(() => {
      try { child.kill(); } catch (_) {}
      rejectRun(new Error('MCP server timed out waiting for replies'));
    }, 30_000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined) replies.set(msg.id, msg);
          if (replies.size >= requests.length) {
            clearTimeout(timer);
            try { child.kill(); } catch (_) {}
            resolveRun(replies);
          }
        } catch (_) {}
      }
    });
    child.on('error', (err) => { clearTimeout(timer); rejectRun(err); });
    for (const req of requests) child.stdin.write(JSON.stringify(req) + '\n');
  });
}

describe('Wave 3 W3-M1 — Portable PDF CMap, Surrogates & Balanced Dict Parsing', () => {
  it('_parse_tounicode does not corrupt CMap with array bfrange bodies and guards odd hex / surrogates', () => {
    const res = runPy(`
import importlib.util, json
spec = importlib.util.spec_from_file_location("ap", r"${PORTABLE_PY.replace(/\\/g, '\\\\')}")
ap = importlib.util.module_from_spec(spec); spec.loader.exec_module(ap)

cmap = b"""
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
2 beginbfrange
<0001> <0003> [<0041> <0042> <0043>]
<0010> <0011> <0061>
endbfrange
3 beginbfchar
<0020> <041>
<0021> <D800>
<0022> <D83DDE00>
endbfchar
"""
parsed = ap._parse_tounicode(cmap)
m = parsed["map"]
overflow = ap._bfrange_target(b"DBFFDFFF", 5)
surrogate_range = ap._bfrange_target(b"D7FF", 1)
glyph_surr = ap._glyph_to_unicode("uniD800")
glyph_over = ap._glyph_to_unicode("u110000")
glyph_ok = ap._glyph_to_unicode("uni0041")
print(json.dumps({
    "m1": m.get(1), "m2": m.get(2), "m3": m.get(3),
    "m16": m.get(0x10), "m17": m.get(0x11),
    "corrupted_41": 0x41 in m,
    "surrogate_char_absent": 0x21 not in m,
    "emoji_ok": m.get(0x22) == "\\U0001f600",
    "overflow": overflow,
    "surrogate_range": surrogate_range,
    "glyph_surr": glyph_surr,
    "glyph_over": glyph_over,
    "glyph_ok": glyph_ok,
}))
`);
    expect(res.m1).toBe('A');
    expect(res.m2).toBe('B');
    expect(res.m3).toBe('C');
    expect(res.m16).toBe('a');
    expect(res.m17).toBe('b');
    expect(res.corrupted_41).toBe(false);
    expect(res.surrogate_char_absent).toBe(true);
    expect(res.emoji_ok).toBe(true);
    expect(res.overflow).toBe('');
    expect(res.surrogate_range).toBe('');
    expect(res.glyph_surr).toBeNull();
    expect(res.glyph_over).toBeNull();
    expect(res.glyph_ok).toBe('A');
  });

  it('_balanced_dict skips hex strings <...>, literal strings (a >> b), and PDF comments', () => {
    const res = runPy(`
import importlib.util, json
spec = importlib.util.spec_from_file_location("ap", r"${PORTABLE_PY.replace(/\\/g, '\\\\')}")
ap = importlib.util.module_from_spec(spec); spec.loader.exec_module(ap)

d1 = b"<</A <</T <FEFF0041>>>/B 1>> trailing"
d2 = b"<</Title (Section 1 >> Overview \\\\) still >>)/Pages 2 0 R>> trailing"
d3 = b"<</Key 1 % comment >>\\n/Next 2>> trailing"
print(json.dumps({
    "d1": ap._balanced_dict(d1, 0).decode("latin1"),
    "d2": ap._balanced_dict(d2, 0).decode("latin1"),
    "d3": ap._balanced_dict(d3, 0).decode("latin1"),
}))
`);
    expect(res.d1).toBe('<</A <</T <FEFF0041>>>/B 1>>');
    expect(res.d2).toBe('<</Title (Section 1 >> Overview \\) still >>)/Pages 2 0 R>>');
    expect(res.d3).toBe('<</Key 1 % comment >>\n/Next 2>>');
  });
});

describe('Wave 3 W3-M5 — Portable StructuralAudit & write_json_new', () => {
  it('catches duplicate IDs, broken IDREFs, empty headings, leading h2, and invalid lang', () => {
    const res = runPy(`
import importlib.util, json
spec = importlib.util.spec_from_file_location("ap", r"${PORTABLE_PY.replace(/\\/g, '\\\\')}")
ap = importlib.util.module_from_spec(spec); spec.loader.exec_module(ap)

bad = """<!doctype html>
<html lang="en!!"><head><title>Test</title></head><body>
<main id="main-content">
  <h2>Before H1</h2>
  <h1 id="dup">Title</h1>
  <h2 id="dup">   </h2>
  <p aria-describedby="ghost-desc"><a href="#ghost-anchor">Go</a></p>
  <table><caption>Data</caption><thead><tr><th id="c1" scope="col">Col</th></tr></thead>
  <tbody><tr><td headers="c1 ghost-hdr">Val</td></tr></tbody></table>
</main></body></html>"""
out = ap.audit_html(bad)
print(json.dumps(out))
`);
    expect(res.ok).toBe(false);
    const joined = res.errors.join('\n');
    expect(joined).toContain('valid BCP 47');
    expect(joined).toContain('first heading must be h1');
    expect(joined).toContain('heading element is empty');
    expect(joined).toContain('duplicate id');
    expect(joined).toContain('ghost-desc');
    expect(joined).toContain('ghost-anchor');
    expect(joined).toContain('ghost-hdr');
  });

  it('passes audit_html with 0 errors on full render_html output (complex table, formula, code, links, notes)', () => {
    const res = runPy(`
import importlib.util, json
from pathlib import Path
spec = importlib.util.spec_from_file_location("ap", r"${PORTABLE_PY.replace(/\\/g, '\\\\')}")
ap = importlib.util.module_from_spec(spec); spec.loader.exec_module(ap)

plan = {
  "schema_version": "1.0",
  "document": {
    "title": "Wave 3 Rich Plan",
    "language": "en-US",
    "source_page_count": 1,
    "source_sha256": "a" * 64,
    "document_type": "handout",
  },
  "blocks": [
    {"type": "heading", "level": 1, "text": "Overview", "source_page": 1, "id": "sec-1"},
    {"type": "paragraph", "text": "See footnote one.", "source_page": 1,
     "runs": [{"text": "See ", "style": "normal"}, {"text": "footnote one", "style": "emphasis", "href": "#fn-1"}, {"text": ".", "style": "normal"}]},
    {"type": "table", "caption": "Quarterly Metrics", "source_page": 1,
     "columns": [{"text": "Region", "colspan": 1}, {"text": "Results", "colspan": 2}],
     "rows": [
       [{"text": "North", "header": True, "rowspan": 2}, "10", "20"],
       ["15", "25"],
     ]},
    {"type": "code", "text": "print(42)", "language": "python", "caption": "Sample code", "source_page": 1},
    {"type": "formula", "alt_text": "x squared", "expression": "x^2", "caption": "Eq 1", "source_page": 1},
    {"type": "paragraph", "text": "Footnote text.", "source_page": 1, "id": "fn-1"},
  ],
  "review_notes": ["Checked layout."],
}
validated = ap.validate_plan(plan, Path("."))
assert validated["ok"], validated["errors"]
html = ap.render_html(validated)
audit = ap.audit_html(html)
print(json.dumps(audit))
`);
    expect(res.ok, JSON.stringify(res.errors)).toBe(true);
    expect(res.errors).toEqual([]);
  });
});

describe('Wave 3 W3-M2 — Source Remediation verify-check, UTF-8 safety & audit_page.cjs keyboard/label fixes', () => {
  it('verify-check rejects truncated/tampered worksheets and empty verifier.model', () => {
    const dir = mkdtempSync(join(scratch, 'src-verify-'));
    const htmlFile = join(dir, 'page.html');
    writeFileSync(htmlFile, '<!doctype html><html><body><h1>Hi</h1></body></html>', 'utf8');
    const sha = createHash('sha256').update(readFileSync(htmlFile)).digest('hex');
    const planPath = join(dir, 'plan.json');
    writeFileSync(planPath, JSON.stringify({
      schema_version: '0.1',
      target: { files: [{ path: 'page.html', sha256: sha }] },
      patches: [
        { file: 'page.html', find: '<html>', replace: '<html lang="en">', rationale: 'Declare document language for screen readers (WCAG 3.1.1).' },
      ],
      review_notes: [],
    }));
    const auditObj = {
      ok: true,
      audit: {
        axe: { available: true, violations: [], incomplete: 0 },
        keyboard: { interactiveElements: 0, reached: 0, unreachable: [], suspectedTrap: false },
        outline: { title: 't', lang: 'en', headings: [], landmarks: [], imagesWithoutAlt: 0, unlabeledControls: 0 },
        text: { sha256: 'b'.repeat(64), chars: 2 },
      },
    };
    const beforePath = join(dir, 'before.json');
    const afterPath = join(dir, 'after.json');
    writeFileSync(beforePath, JSON.stringify(auditObj));
    writeFileSync(afterPath, JSON.stringify(auditObj));
    const wsPath = join(dir, 'ws.json');
    execFileSync(PYTHON, [SOURCE_PY, 'verify-init', '--plan', planPath, '--before', beforePath, '--after', afterPath, '--out', wsPath], { cwd: ROOT });

    // 1. Truncated worksheet (deleted 4 of 5 items) must be refused
    const ws = JSON.parse(readFileSync(wsPath, 'utf8'));
    const truncated = {
      ...ws,
      items: [{ id: 'patch-000', kind: 'patch', status: 'verified', note: '' }],
      verifier: {
        model: 'auditor-1',
        context_isolation: 'fresh-context',
        read_source_directly: true,
        statement: 'I read the patched source and audits directly in a fresh session.',
      },
    };
    writeFileSync(wsPath, JSON.stringify(truncated));
    let failedTrunc = null;
    try {
      execFileSync(PYTHON, [SOURCE_PY, 'verify-check', '--worksheet', wsPath, '--plan', planPath, '--before', beforePath, '--after', afterPath], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) { failedTrunc = JSON.parse(e.stdout); }
    expect(failedTrunc?.ok).toBe(false);
    expect(failedTrunc?.error).toContain('do not match the bound patch plan');

    // 2. Empty verifier.model with full items must be refused
    const emptyModel = {
      ...ws,
      items: ws.items.map((item) => ({ ...item, status: 'verified' })),
      verifier: {
        model: '   ',
        context_isolation: 'fresh-context',
        read_source_directly: true,
        statement: 'I read the patched source and audits directly in a fresh session.',
      },
    };
    writeFileSync(wsPath, JSON.stringify(emptyModel));
    let failedModel = null;
    try {
      execFileSync(PYTHON, [SOURCE_PY, 'verify-check', '--worksheet', wsPath, '--plan', planPath, '--before', beforePath, '--after', afterPath], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) { failedModel = JSON.parse(e.stdout); }
    expect(failedModel?.ok).toBe(false);
    expect(failedModel?.error).toContain('verifier.model');
  });

  it('validate-plan rejects non-UTF-8 files and absolute target paths without corrupting bytes', () => {
    const dir = mkdtempSync(join(scratch, 'src-utf8-'));
    const latinFile = join(dir, 'legacy.html');
    // Latin-1 byte 0xE9 ('é') is invalid UTF-8
    writeFileSync(latinFile, Buffer.from('<p>caf\xe9</p>', 'latin1'));
    const sha = createHash('sha256').update(readFileSync(latinFile)).digest('hex');
    const planPath = join(dir, 'plan.json');
    writeFileSync(planPath, JSON.stringify({
      schema_version: '0.1',
      target: { files: [{ path: 'legacy.html', sha256: sha }, { path: '/etc/passwd', sha256: 'a'.repeat(64) }] },
      patches: [
        { file: 'legacy.html', find: '<p>', replace: '<p lang="fr">', rationale: 'Add language tag to paragraph element for assistive technology.' },
      ],
      review_notes: [],
    }));
    let failed = null;
    try {
      execFileSync(PYTHON, [SOURCE_PY, 'validate-plan', '--plan', planPath, '--root', dir], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) { failed = JSON.parse(e.stdout); }
    expect(failed?.ok).toBe(false);
    const errs = (failed?.errors || []).join('\n');
    expect(errs).toContain('non-UTF-8');
    expect(errs).toContain('relative path');
  });

  it('audit_page.cjs excludes tabindex="-1" skip targets & disabled controls from unreachable, and hardens controlHasName', () => {
    const dir = mkdtempSync(join(scratch, 'audit-page-'));
    const htmlPath = join(dir, 'accessible-skip.html');
    const outPath = join(dir, 'audit.json');
    writeFileSync(htmlPath, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Skip Target & Labels</title></head>
<body>
  <a href="#main-content">Skip to main content</a>
  <main id="main-content" tabindex="-1">
    <h1>Course</h1>
    <button type="button">Active Save</button>
    <button type="button" disabled>Disabled Action</button>
    <fieldset disabled>
      <legend><input id="legend-toggle" type="checkbox" aria-label="Unlock group"> Locked</legend>
      <a href="#help">Fieldset help link</a>
      <input type="text" aria-label="Locked field">
    </fieldset>
    <label for="empty-lbl">   </label><input id="empty-lbl" type="text">
    <input id="ws-aria" type="text" aria-label="   ">
    <input id="bad-ref" type="text" aria-labelledby="missing-id">
    <input id="empty-btn" type="button">
    <input id="good-btn" type="button" value="Apply">
    <input id="good-img" type="image" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Submit icon">
  </main>
</body></html>`, 'utf8');
    const raw = execFileSync(process.execPath, [AUDIT_PAGE_CJS, '--html', htmlPath, '--out', outPath], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120_000,
    });
    const report = JSON.parse(raw);
    expect(report.ok).toBe(true);
    // <main tabindex="-1">, <button disabled>, and <fieldset disabled><input> must NOT be unreachable or trigger trap;
    // first-<legend> checkbox and <a href> inside <fieldset disabled> MUST remain live interactive controls (HTML5 §4.10.16).
    expect(report.audit.keyboard.unreachable).toEqual([]);
    expect(report.audit.keyboard.suspectedTrap).toBe(false);
    // Live tabbable controls: skip link, Active Save button, #legend-toggle, Fieldset help link,
    // empty-lbl, ws-aria, bad-ref, empty-btn, good-btn, good-img = 10 (excludes disabled button & locked input).
    expect(report.audit.keyboard.interactiveElements).toBe(10);
    expect(report.audit.keyboard.reached).toBe(10);
    // Exactly the 4 genuinely unlabeled controls must be caught: empty-lbl, ws-aria, bad-ref, empty-btn
    // (good-btn with value="Apply" and good-img with alt="Submit icon" must pass).
    expect(report.audit.outline.unlabeledControls).toBe(4);
    expect(report.audit.outline.unlabeledControlTargets.join(' ')).toContain('#empty-lbl');
    expect(report.audit.outline.unlabeledControlTargets.join(' ')).toContain('#ws-aria');
    expect(report.audit.outline.unlabeledControlTargets.join(' ')).toContain('#bad-ref');
    expect(report.audit.outline.unlabeledControlTargets.join(' ')).toContain('#empty-btn');
    expect(report.audit.outline.unlabeledControlTargets.join(' ')).not.toContain('#good-btn');
    expect(report.audit.outline.unlabeledControlTargets.join(' ')).not.toContain('#good-img');
  }, 120_000);
});

describe('Wave 3 W3-M3 — Multi-Format MCP Flow, Batch Exclusion, Root-Check Order & Provider Parity', () => {
  it('driver.extractDocumentText handles .md/.csv offline without launching Chromium, and readDocBase64 accepts .xlsm', async () => {
    const dir = mkdtempSync(join(scratch, 'mcp-multi-'));
    const mdPath = join(dir, 'syllabus.md');
    const csvPath = join(dir, 'grades.csv');
    const xlsmPath = join(dir, 'macro.xlsm');
    writeFileSync(mdPath, '# Biology 101\n\nLab schedule.\n', 'utf8');
    writeFileSync(csvPath, 'Name,Score\nAda,98\n', 'utf8');
    writeFileSync(xlsmPath, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]));
    const driver = Driver.createDriver({ log: () => {} });
    const mdOut = await driver.extractDocumentText({ filePath: mdPath });
    expect(mdOut.kind).toBe('md');
    expect(mdOut.method).toBe('utf8-text');
    expect(mdOut.text).toContain('# Biology 101');
    const csvOut = await driver.extractDocumentText({ filePath: csvPath });
    expect(csvOut.kind).toBe('csv');
    expect(csvOut.text).toContain('Ada,98');
    // Invalid-header .xlsm must hit readDocBase64's Office ZIP header check (proving .xlsm is recognized)
    const badXlsm = join(dir, 'bad.xlsm');
    writeFileSync(badXlsm, Buffer.from('not-a-zip-file'));
    await expect(driver.extractDocumentText({ filePath: badXlsm })).rejects.toThrow(/missing ZIP header/i);
  });

  it('MCP stdio extract_document_text supports .md/.csv, listBatchInputs ignores scoreboard CSV, and scoreboard root-check runs before existsSync', async () => {
    const allowed = mkdtempSync(join(scratch, 'mcp-allowed-'));
    const outside = mkdtempSync(join(scratch, 'mcp-outside-'));
    const mdPath = join(allowed, 'notes.md');
    writeFileSync(mdPath, '# Accessibility Notes\n\nAll headings are ordered.\n', 'utf8');

    // Folder with ONLY accessibility-audit-scoreboard.csv (AlloFlow's own output) must be treated as empty
    const boardOnlyDir = join(allowed, 'board-only');
    mkdirSync(boardOnlyDir, { recursive: true });
    writeFileSync(join(boardOnlyDir, 'accessibility-audit-scoreboard.csv'), 'name,file,band\n', 'utf8');
    writeFileSync(join(boardOnlyDir, 'doc-tagged-held-for-review.pdf'), '%PDF-1.4\n%%EOF\n', 'latin1');

    // Scoreboard pointing at a NON-EXISTENT path outside ALLOWED_ROOTS must fail with -32602 (allowed-roots),
    // NOT probe fs.existsSync and report "missingFromDisk"!
    const outOfRootGhost = join(outside, 'secret-ghost.pdf');
    const boardPath = join(allowed, 'accessibility-audit-scoreboard.json');
    writeFileSync(boardPath, JSON.stringify({
      generatedFor: allowed,
      documents: 1,
      files: [{ file: outOfRootGhost, ok: true, score: 40, isScanned: false }],
    }));

    const replies = await runMcpRequests([
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'w3', version: '0' } } },
      { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'extract_document_text', arguments: { file_path: mdPath } } },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'pdf_batch_audit_start', arguments: { dir_path: boardOnlyDir } } },
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'pdf_remediate_from_scoreboard_start', arguments: { scoreboard_path: boardPath } } },
    ], { ALLOFLOW_MCP_ALLOWED_ROOTS: allowed });

    const r2 = replies.get(2).result;
    expect(r2.isError).toBe(false);
    expect(r2.structuredContent.kind).toBe('md');
    expect(r2.structuredContent.text).toContain('Accessibility Notes');

    const r3 = replies.get(3);
    expect(r3.error?.code).toBe(-32602);
    expect(r3.error?.message).toContain('No supported document files found');

    const r4 = replies.get(4);
    expect(r4.error?.code).toBe(-32602);
    expect(r4.error?.message).toContain('outside the folders');
  });

  it('writeRunArtifacts strips non-PDF extensions and audit_html degrades cleanly on misconfigured non-Gemini backend', async () => {
    const src = readFileSync(MCP_SERVER, 'utf8');
    expect(src).toContain('replace(/\\.(pdf|docx|pptx|png|jpe?g|webp|md|markdown|txt|csv|tsv|xlsx|xlsm|xls|xlsb|ods)$/i');
    expect(src).toContain('Driver.resolveModelTransportConfig()');

    const dir = mkdtempSync(join(scratch, 'mcp-audit-html-'));
    const htmlPath = join(dir, 'sample.html');
    writeFileSync(htmlPath, '<!doctype html><html lang="en"><head><title>Probe</title></head><body><main><h1>Hello</h1><p>World.</p></main></body></html>', 'utf8');
    // Misconfigured non-Gemini backend must NOT silently fall back to Gemini even when GEMINI_API_KEY is present.
    const replies = await runMcpRequests([
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'w3', version: '0' } } },
      { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'audit_html', arguments: { file_path: htmlPath } } },
    ], {
      ALLOFLOW_MCP_ALLOWED_ROOTS: dir,
      ALLOFLOW_MCP_MODEL_BACKEND: 'bogus-provider',
      GEMINI_API_KEY: 'AIzaSyFakeKeyMustNotBeUsedWhenNonGeminiFails',
    });
    const r2 = replies.get(2).result;
    expect(r2.isError).toBe(false);
    expect(r2.structuredContent.aiEngine).toBe('not-run');
    expect(r2.structuredContent.note).toMatch(/Model backend unavailable/i);
    expect(r2.structuredContent.note).not.toMatch(/No Gemini key on this host/i);
  }, 60_000);
});

describe('Wave 3 W3-M4 — Portable render_tagged_pdf.cjs Link /Contents, Numeric Entities, XMP Control Chars & Real veraPDF PDF/UA-1', () => {
  it('renders HTML with #anchor link, &amp; query URI, numeric entities & control char in <title> and passes real veraPDF PDF/UA-1', () => {
    const dir = mkdtempSync(join(scratch, 'render-ua-'));
    const htmlPath = join(dir, 'w3-rich.html');
    const pdfPath = join(dir, 'w3-rich.pdf');
    writeFileSync(htmlPath, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Wave 3 Guide &#8212; Notes &#x2019; Demo\x07</title>
<style>
@page { size: Letter; margin: 0.75in; }
body { font: 12pt/1.5 Arial, sans-serif; color: #111827; background: #ffffff; }
</style>
</head>
<body>
<main id="main-content">
  <h1>Wave 3 Tagged PDF Verification</h1>
  <p>Jump directly to <a href="#sec-2">Section Two Details</a> or read the <a href="https://example.org/docs?a=1&amp;b=2">Query Resource Guide</a>.</p>
  <h2 id="sec-2">Section Two Details</h2>
  <p>This section verifies internal anchor link descriptions, query-string link descriptions, and clean XMP title metadata.</p>
</main>
</body>
</html>`, 'utf8');

    const renderRaw = execFileSync(process.execPath, [RENDER_PDF_CJS, '--html', htmlPath, '--pdf', pdfPath, '--pdfua-id', '1'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120_000,
    });
    const rendered = JSON.parse(renderRaw);
    expect(rendered.ok, JSON.stringify(rendered)).toBe(true);
    expect(rendered.blockedNetworkRequests).toBe(0);
    expect(rendered.pdfUaFinalization.metadataAdded).toBe(true);
    expect(rendered.pdfUaFinalization.linkContentsAdded).toBeGreaterThanOrEqual(2);

    const pdfBytes = readFileSync(pdfPath);
    const pdfUtf8 = pdfBytes.toString('utf8');
    const xmpMatch = /<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/.exec(pdfUtf8);
    expect(xmpMatch).not.toBeNull();
    // XMP dc:title must have decoded entities and zero control characters (no &amp;#8212;, no \x07)
    expect(xmpMatch[0]).toContain('<rdf:li xml:lang="x-default">Wave 3 Guide \u2014 Notes \u2019 Demo</rdf:li>');
    expect(xmpMatch[0]).not.toContain('&amp;#8212;');
    expect(xmpMatch[0]).not.toContain('\x07');

    // Verify UTF-16BE /Contents hex strings contain the real anchor texts ("Query Resource Guide" and "Section Two Details")
    const toPdfHex = (str) => {
      const b = Buffer.from('\uFEFF' + str, 'utf16le');
      b.swap16();
      return '<' + b.toString('hex').toUpperCase() + '>';
    };
    const pdfLatin1 = pdfBytes.toString('latin1');
    expect(pdfLatin1).toContain('/Contents ' + toPdfHex('Query Resource Guide'));
    // Chromium emits either /Dest or /D for internal #sec-2 links; if emitted with a name, verify it resolved to visible text
    if (/\/(?:Dest|D)\s*(?:\(#?sec-2\)|\/#?sec-2\b)/.test(pdfLatin1)) {
      expect(pdfLatin1).toContain('/Contents ' + toPdfHex('Section Two Details'));
    }

    // Run real veraPDF PDF/UA-1 CLI validation via alloflow_portable.py validate_pdf_ua!
    const ua = runPy(`
import importlib.util, json
from pathlib import Path
spec = importlib.util.spec_from_file_location("ap", r"${PORTABLE_PY.replace(/\\/g, '\\\\')}")
ap = importlib.util.module_from_spec(spec); spec.loader.exec_module(ap)
print(json.dumps(ap.validate_pdf_ua(Path(r"${pdfPath.replace(/\\/g, '\\\\')}"))))
`);
    expect(ua.status).toBe('completed');
    expect(ua.compliant, JSON.stringify(ua.failedRules)).toBe(true);
    expect(ua.failedRuleCount).toBe(0);
    expect(ua.failedChecks).toBe(0);
  }, 180_000);
});
