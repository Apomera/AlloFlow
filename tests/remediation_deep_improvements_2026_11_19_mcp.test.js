import { afterAll, afterEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { JSDOM } from 'jsdom';

const requireCjs = createRequire(import.meta.url);
const ROOT = process.cwd();
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

const Driver = requireCjs(resolve(ROOT, 'desktop/mcp/remediation_headless_driver.cjs'));
const Verification = requireCjs(resolve(ROOT, 'desktop/mcp/remediation_verification.cjs'));
const { accessibleHtmlTool } = requireCjs(resolve(ROOT, 'desktop/mcp/accessible_html_edit.cjs'));
const Validation = requireCjs(resolve(ROOT, 'dev-tools/remediation_validation.cjs'));

const PORTABLE_ENGINE = resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py');
const PORTABLE_RENDERER = resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs');
const SOURCE_ENGINE = resolve(ROOT, 'agent_skills/alloflow-source-remediation/scripts/alloflow_source.py');
const AUDIT_PAGE = resolve(ROOT, 'agent_skills/alloflow-source-remediation/scripts/audit_page.cjs');

const tempDirs = [];
const spawnedChildren = [];

function makeTempDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const child of spawnedChildren.splice(0)) {
    try { child.kill(); } catch (_) {}
  }
});

afterAll(() => {
  for (const dir of tempDirs.splice(0)) {
    try { rmSync(dir, { recursive: true, force: true }); } catch (_) {}
  }
});

// Minimal ZIP entry name reader (End of Central Directory / Central Directory headers).
function listZipEntries(buf) {
  const names = [];
  for (let i = 0; i < buf.length - 46; i += 1) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x01 && buf[i + 3] === 0x02) {
      const nameLen = buf.readUInt16LE(i + 28);
      const extraLen = buf.readUInt16LE(i + 30);
      const commentLen = buf.readUInt16LE(i + 32);
      names.push(buf.subarray(i + 46, i + 46 + nameLen).toString('utf8'));
      i += 45 + nameLen + extraLen + commentLen;
    }
  }
  return names;
}

function readZipEntryUtf8(buf, targetName) {
  const zlib = requireCjs('node:zlib');
  for (let i = 0; i < buf.length - 30; i += 1) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x03 && buf[i + 3] === 0x04) {
      const method = buf.readUInt16LE(i + 8);
      const compSize = buf.readUInt32LE(i + 18);
      const nameLen = buf.readUInt16LE(i + 26);
      const extraLen = buf.readUInt16LE(i + 28);
      const name = buf.subarray(i + 30, i + 30 + nameLen).toString('utf8');
      const dataStart = i + 30 + nameLen + extraLen;
      const raw = buf.subarray(dataStart, dataStart + compSize);
      if (name === targetName) {
        return (method === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8');
      }
    }
  }
  return null;
}

function startStdioConformanceClient() {
  const server = resolve(ROOT, 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
  const driverPath = resolve(ROOT, 'desktop/mcp/remediation_headless_driver.cjs');
  const dir = makeTempDir('alloflow-mcp-deep-');
  const seen = join(dir, 'seen.json');
  const bootstrap = `const fs=require('fs');const D=require(${JSON.stringify(driverPath)});D.createDriver=()=>({buildConformanceReport:async(o)=>{fs.writeFileSync(${JSON.stringify(seen)},JSON.stringify(o));return '<html></html>';},close:async()=>{}});require(${JSON.stringify(server)});`;
  const env = { ...process.env, ALLOFLOW_MCP_NO_KEY_FILES: '1', ALLOFLOW_MCP_STATE_DIR: join(dir, 'state') };
  delete env.GEMINI_API_KEY;
  const child = spawn(process.execPath, ['-e', bootstrap], { env, stdio: ['pipe', 'pipe', 'pipe'] });
  spawnedChildren.push(child);
  let seq = 0;
  let buffer = '';
  let errors = '';
  const pending = new Map();
  child.stderr.on('data', (d) => { errors += d; });
  child.stdout.on('data', (d) => {
    buffer += d;
    let n;
    while ((n = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, n);
      buffer = buffer.slice(n + 1);
      if (!line.trim()) continue;
      const m = JSON.parse(line);
      pending.get(m.id)?.(m);
      pending.delete(m.id);
    }
  });
  const rpc = (method, params) => new Promise((res, rej) => {
    const id = ++seq;
    const timer = setTimeout(() => rej(new Error('RPC timed out: ' + errors)), 20000);
    pending.set(id, (m) => { clearTimeout(timer); res(m); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const file = (name, body) => {
    const p = join(dir, name);
    writeFileSync(p, body);
    return p;
  };
  return {
    dir,
    file,
    seen: () => JSON.parse(readFileSync(seen, 'utf8')),
    init: () => rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'deep-test', version: '1' } }),
    call: async (name, args) => {
      const m = await rpc('tools/call', { name, arguments: args });
      if (m.error) throw new Error(m.error.message);
      if (m.result.isError) throw new Error(JSON.stringify(m.result.content));
      return m.result.structuredContent;
    },
  };
}

describe('M-A1: readDocBase64 input family & magic-byte validation', () => {
  it('accepts supported PDF, Office/spreadsheet, raster image, and text-family inputs and rejects bad magic or unsafe extensions', () => {
    const dir = makeTempDir('alloflow-ma1-');
    const driver = Driver.createDriver({ log: () => {} });

    const validFixtures = [
      ['doc.pdf', Buffer.from('%PDF-1.7\n%%EOF\n')],
      ['doc.docx', Buffer.from('PK\x03\x04dummy-docx')],
      ['deck.pptx', Buffer.from('PK\x03\x04dummy-pptx')],
      ['sheet.xlsx', Buffer.from('PK\x03\x04dummy-xlsx')],
      ['sheet.xlsb', Buffer.from('PK\x03\x04dummy-xlsb')],
      ['sheet.ods', Buffer.from('PK\x03\x04dummy-ods')],
      ['legacy.xls', Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0x00, 0x01])],
      ['photo.png', Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00])],
      ['photo.jpg', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00])],
      ['photo.jpeg', Buffer.from([0xFF, 0xD8, 0xFF, 0xE1, 0x00])],
      ['photo.webp', Buffer.from('RIFF\x10\x00\x00\x00WEBPVP8 ')],
      ['notes.md', Buffer.from('# Heading\n\nAccessible markdown.\n')],
      ['notes.markdown', Buffer.from('Hello markdown')],
      ['plain.txt', Buffer.from('Plain text syllabus')],
      ['grades.csv', Buffer.from('Name,Score\nAda,98\n')],
      ['grades.tsv', Buffer.from('Name\tScore\nAda\t98\n')],
    ];

    for (const [name, buf] of validFixtures) {
      const p = join(dir, name);
      writeFileSync(p, buf);
      expect(driver._readDocBase64(p)).toBe(buf.toString('base64'));
    }

    const badMagic = [
      ['bad.png', Buffer.from('not-a-png-header')],
      ['bad.jpg', Buffer.from('not-a-jpeg')],
      ['bad.webp', Buffer.from('RIFF1234NOTW')],
      ['bad.xlsx', Buffer.from('not-a-zip')],
      ['bad.xls', Buffer.from('not-ole2-or-zip')],
      ['bad.txt', Buffer.from([0x41, 0x00, 0x42])],
      ['empty.md', Buffer.alloc(0)],
    ];
    for (const [name, buf] of badMagic) {
      const p = join(dir, name);
      writeFileSync(p, buf);
      expect(() => driver._readDocBase64(p), name).toThrow();
    }

    for (const name of ['malware.exe', 'page.html', 'vector.svg']) {
      const p = join(dir, name);
      writeFileSync(p, Buffer.from('<svg></svg>'));
      expect(() => driver._readDocBase64(p), name).toThrow(/Unsupported file type/);
    }
  });
});

describe('M-A2: 100% offline export_alt_format & export_accessible_office', { timeout: 90_000 }, () => {
  it('produces valid EPUB, DAISY, BRF, ODT, and DOCX bytes with ALLOFLOW_MCP_OFFLINE_ASSETS unset', async () => {
    const prevOffline = process.env.ALLOFLOW_MCP_OFFLINE_ASSETS;
    delete process.env.ALLOFLOW_MCP_OFFLINE_ASSETS;
    const driver = Driver.createDriver({ log: () => {} });
    const html = [
      '<!doctype html>',
      '<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Offline Test</title></head>',
      '<body><main>',
      '<h1>Offline Export Heading</h1>',
      '<p>Paragraph with <strong>bold</strong> and <a href="https://example.org">reference link</a>.</p>',
      '<ul><li>Bullet one</li><li>Bullet two</li></ul>',
      '<ol><li>Step one</li><li>Step two</li></ol>',
      '<table><thead><tr><th scope="col">Col A</th><th scope="col">Col B</th></tr></thead>',
      '<tbody><tr><td>Val 1</td><td>Val 2</td></tr></tbody></table>',
      '</main></body></html>',
    ].join('');

    try {
      const epub = await driver.exportAltFormat({ html, title: 'Offline Test', format: 'epub' });
      const epubBytes = Buffer.from(epub.b64, 'base64');
      expect(epubBytes.subarray(0, 2).toString('latin1')).toBe('PK');
      expect(listZipEntries(epubBytes)).toContain('mimetype');

      const daisy = await driver.exportAltFormat({ html, title: 'Offline Test', format: 'daisy' });
      const daisyBytes = Buffer.from(daisy.b64, 'base64');
      expect(daisyBytes.subarray(0, 2).toString('latin1')).toBe('PK');
      expect(listZipEntries(daisyBytes).length).toBeGreaterThan(2);

      const brf = await driver.exportAltFormat({ html, title: 'Offline Test', format: 'brf' });
      expect(Buffer.from(brf.b64, 'base64').toString('utf8').trim().length).toBeGreaterThan(0);

      const odt = await driver.exportAccessibleOffice({ html, title: 'Offline Test', format: 'odt' });
      const odtBytes = Buffer.from(odt.b64, 'base64');
      expect(odtBytes.subarray(0, 2).toString('latin1')).toBe('PK');
      const odtNames = listZipEntries(odtBytes);
      expect(odtNames[0]).toBe('mimetype');
      expect(odtNames).toEqual(expect.arrayContaining(['META-INF/manifest.xml', 'content.xml', 'styles.xml', 'meta.xml']));
      expect(readZipEntryUtf8(odtBytes, 'content.xml')).toContain('Offline Export Heading');

      const docx = await driver.exportAccessibleOffice({ html, title: 'Offline Test', format: 'docx' });
      const docxBytes = Buffer.from(docx.b64, 'base64');
      expect(docxBytes.subarray(0, 2).toString('latin1')).toBe('PK');
      const docxNames = listZipEntries(docxBytes);
      expect(docxNames).toEqual(expect.arrayContaining([
        '[Content_Types].xml',
        '_rels/.rels',
        'docProps/core.xml',
        'word/document.xml',
        'word/_rels/document.xml.rels',
        'word/styles.xml',
        'word/numbering.xml',
      ]));
      const docXml = readZipEntryUtf8(docxBytes, 'word/document.xml');
      const stylesXml = readZipEntryUtf8(docxBytes, 'word/styles.xml');
      expect(docXml).toContain('Heading1');
      expect(docXml).toContain('Offline Export Heading');
      expect(docXml).toContain('<w:tblGrid><w:gridCol');
      expect(docXml).toContain('<w:tblHeader/>');
      expect(docXml).toContain('<w:bidi/>');
      expect(docXml).toContain('<w:rtl/>');
      expect(docXml).toContain('<w:hyperlink');
      expect(stylesXml).toContain('w:val="ar"');

      // Phase 3b polish (1A + 1B): footnote links route to word/_rels/footnotes.xml.rels,
      // XML 1.0 illegal control chars are stripped, and empty decorative alt stays empty.
      const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const polishHtml = [
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Polish\x07Test</title></head><body><main>',
        '<h1>Footnote &amp; Control\x08Check</h1>',
        '<p>Claim with note<sup class="allo-fn-ref" data-fn-uid="fn1"><a href="#fn-1">1</a></sup>.</p>',
        `<p><img src="${tinyPng}" alt=""></p>`,
        '<section class="allo-footnotes"><ol><li id="fn-1" data-fn-uid="fn1">See <a href="https://footnote.example/source">footnote source</a>.</li></ol></section>',
        '</main></body></html>',
      ].join('');
      const polishDocx = await driver.exportAccessibleOffice({ html: polishHtml, title: 'Polish\x07Test', format: 'docx' });
      const polishBytes = Buffer.from(polishDocx.b64, 'base64');
      const polishNames = listZipEntries(polishBytes);
      const polishDocXml = readZipEntryUtf8(polishBytes, 'word/document.xml');
      const polishDocRels = readZipEntryUtf8(polishBytes, 'word/_rels/document.xml.rels');
      const polishCore = readZipEntryUtf8(polishBytes, 'docProps/core.xml');
      expect(polishDocXml).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
      expect(polishCore).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
      if (polishNames.includes('word/footnotes.xml')) {
        expect(polishNames).toContain('word/_rels/footnotes.xml.rels');
        const fnRels = readZipEntryUtf8(polishBytes, 'word/_rels/footnotes.xml.rels');
        expect(fnRels).toContain('https://footnote.example/source');
        expect(polishDocRels).not.toContain('https://footnote.example/source');
      }
      // Verify decorative alt="" never gets turned into "Image" when OFFLINE_DOCX_SHIM receives empty strings
      const driverSrc = readFileSync(resolve(ROOT, 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
      expect(driverSrc).toContain("alt.description != null ? alt.description : (alt.title != null ? alt.title : 'Image')");
    } finally {
      await driver.close();
      if (prevOffline === undefined) delete process.env.ALLOFLOW_MCP_OFFLINE_ASSETS;
      else process.env.ALLOFLOW_MCP_OFFLINE_ASSETS = prevOffline;
    }
  });
});

describe('M-A3 & M-A11: selfTest born-digital + env isolation + validatePdfUaCli stderr', { timeout: 90_000 }, () => {
  it('passes selfTest 11/11 without mutating global process.env', async () => {
    const prevKey = process.env.GEMINI_API_KEY;
    const prevBase = process.env.ALLOFLOW_MCP_GEMINI_BASE;
    process.env.GEMINI_API_KEY = 'sentinel-untouched-key';
    process.env.ALLOFLOW_MCP_GEMINI_BASE = 'https://sentinel.example.invalid/v1beta/models';
    const seenEnvDuringRun = [];
    const driver = Driver.createDriver({
      log: () => {
        seenEnvDuringRun.push({
          key: process.env.GEMINI_API_KEY,
          base: process.env.ALLOFLOW_MCP_GEMINI_BASE,
        });
      },
    });
    try {
      const res = await driver.selfTest({});
      expect(res.ok, JSON.stringify(res)).toBe(true);
      expect(Object.values(res.checks).every(Boolean)).toBe(true);
      expect(seenEnvDuringRun.length).toBeGreaterThan(0);
      expect(seenEnvDuringRun.every((s) => s.key === 'sentinel-untouched-key' && s.base === 'https://sentinel.example.invalid/v1beta/models')).toBe(true);
    } finally {
      await driver.close();
      if (prevKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = prevKey;
      if (prevBase === undefined) delete process.env.ALLOFLOW_MCP_GEMINI_BASE; else process.env.ALLOFLOW_MCP_GEMINI_BASE = prevBase;
    }
  });

  it('captures bounded stderr from validatePdfUaCli when veraPDF exits without JSON', async () => {
    const dir = makeTempDir('alloflow-stderr-');
    const pdfPath = join(dir, 'sample.pdf');
    const jarPath = join(dir, 'verapdf-greenfield.jar');
    writeFileSync(pdfPath, '%PDF-1.7\n%%EOF\n');
    writeFileSync(jarPath, 'PK\x03\x04fakejar');
    const prevJava = process.env.ALLOFLOW_VERAPDF_JAVA;
    const prevJar = process.env.ALLOFLOW_VERAPDF_JAR;
    process.env.ALLOFLOW_VERAPDF_JAVA = process.execPath;
    process.env.ALLOFLOW_VERAPDF_JAR = jarPath;

    const fakeSpawn = () => {
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = () => {};
      process.nextTick(() => {
        child.stderr.emit('data', 'java.lang.OutOfMemoryError: Java heap space\n');
        child.emit('close', 1);
      });
      return child;
    };
    const driver = Driver.createDriver({ log: () => {}, spawnProcess: fakeSpawn });
    try {
      await expect(driver.validatePdfUaCli({ filePath: pdfPath })).rejects.toThrow(/OutOfMemoryError: Java heap space/);
    } finally {
      if (prevJava === undefined) delete process.env.ALLOFLOW_VERAPDF_JAVA; else process.env.ALLOFLOW_VERAPDF_JAVA = prevJava;
      if (prevJar === undefined) delete process.env.ALLOFLOW_VERAPDF_JAR; else process.env.ALLOFLOW_VERAPDF_JAR = prevJar;
    }
  });
});

describe('M-A4 & M-A5: audit_page.cjs trap/containment/unnamed-radio & alloflow_source.py compare', { timeout: 90_000 }, () => {
  function runAuditPage(htmlPath, outPath, extraArgs = []) {
    try {
      const raw = execFileSync(process.execPath, [AUDIT_PAGE, '--html', htmlPath, '--out', outPath, ...extraArgs], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 45_000,
      });
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(`audit_page.cjs failed (status ${err.status}): stdout=${String(err.stdout || '').slice(0, 500)} stderr=${String(err.stderr || '').slice(0, 500)}`);
    }
  }

  it('detects real keyboard traps, avoids false positives on normal pages, blocks file:// escapes, and keeps unnamed radios separate', () => {
    const dir = makeTempDir('alloflow-ma4-');
    const siteDir = join(dir, 'site');
    const secretPath = join(dir, 'secret.txt');
    writeFileSync(secretPath, 'TOP_SECRET_OUTSIDE_ROOT');
    const fs = requireCjs('node:fs');
    fs.mkdirSync(siteDir, { recursive: true });

    // 1. Real keyboard trap (two buttons trapped in cycle, third unreachable)
    const trapHtml = join(siteDir, 'trap.html');
    writeFileSync(trapHtml, [
      '<!doctype html><html lang="en"><head><title>Trap</title></head><body><main>',
      '<button id="a">A</button><button id="b">B</button><button id="c">Outside</button>',
      '<script>',
      'document.getElementById("b").addEventListener("keydown", (e) => { if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); document.getElementById("a").focus(); } });',
      '</script></main></body></html>',
    ].join(''));
    const trapAudit = runAuditPage(trapHtml, join(siteDir, 'trap.json'));
    expect(trapAudit.audit.keyboard.suspectedTrap).toBe(true);
    expect(trapAudit.audit.keyboard.unreachable.length).toBeGreaterThanOrEqual(1);

    // 2. Normal pages (0, 1, and 2 buttons + unreachable click-only div): NEVER false-positive
    for (const [name, body] of [
      ['zero.html', '<p>No controls here</p>'],
      ['one.html', '<button>Only control</button>'],
      ['normal_with_div.html', '<button>One</button><button>Two</button><div onclick="void 0">Click div</div>'],
    ]) {
      const p = join(siteDir, name);
      writeFileSync(p, `<!doctype html><html lang="en"><head><title>${name}</title></head><body><main>${body}</main></body></html>`);
      const res = runAuditPage(p, join(siteDir, name + '.json'));
      expect(res.audit.keyboard.suspectedTrap, name).toBe(false);
    }

    // 3. file:// escape outside audited root is blocked
    const escapeHtml = join(siteDir, 'escape.html');
    const secretUrl = 'file:///' + secretPath.replace(/\\/g, '/').replace(/^\/+/, '');
    writeFileSync(escapeHtml, [
      '<!doctype html><html lang="en"><head><title>Escape</title></head><body><main>',
      `<img src="${secretUrl}" alt="escape">`,
      '</main></body></html>',
    ].join(''));
    const escapeAudit = runAuditPage(escapeHtml, join(siteDir, 'escape.json'), ['--root', siteDir]);
    expect(escapeAudit.blockedNetworkRequests).toBeGreaterThanOrEqual(1);

    // 4. Unnamed radios are NOT collapsed into one group; named radio groups ARE
    const radioHtml = join(siteDir, 'radios.html');
    writeFileSync(radioHtml, [
      '<!doctype html><html lang="en"><head><title>Radios</title></head><body><main>',
      '<label><input type="radio" name="grp" value="1">Named 1</label>',
      '<label><input type="radio" name="grp" value="2">Named 2</label>',
      '<label><input type="radio" value="u1">Unnamed 1</label>',
      '<label><input type="radio" tabindex="-1" value="u2">Unnamed unreachable</label>',
      '</main></body></html>',
    ].join(''));
    const radioAudit = runAuditPage(radioHtml, join(siteDir, 'radios.json'));
    expect(radioAudit.audit.keyboard.unreachable.length).toBe(1);
    expect(radioAudit.audit.keyboard.suspectedTrap).toBe(false);

    // 5. Phase 3b polish (4A + 4B): audit_page.cjs checks lstatSync directly without existsSync guard
    //    (blocks dangling symlinks) and precomputes expectedTabStops for named radio groups.
    const auditPageSrc = readFileSync(AUDIT_PAGE, 'utf8');
    expect(auditPageSrc).toContain('for (const candidateOut of [resolvedOut, finalOutPath])');
    expect(auditPageSrc).not.toContain('fs.existsSync(resolvedOut) && fs.lstatSync(resolvedOut)');
    expect(auditPageSrc).toContain('expectedTabStops');
  });

  it('alloflow_source.py compare fails closed on unavailable axe and detects node regressions & keyboard traps', () => {
    const dir = makeTempDir('alloflow-ma5-');
    const mkAudit = (file, { axeAvailable = true, violations = [], unreachable = [], trap = false } = {}) => {
      const p = join(dir, file);
      writeFileSync(p, JSON.stringify({
        ok: true,
        audit: {
          axe: { available: axeAvailable, violations, incomplete: 0 },
          keyboard: { interactiveElements: 3, reached: 3 - unreachable.length, unreachable, suspectedTrap: trap },
          outline: { title: 't', lang: 'en', headings: [], landmarks: [], imagesWithoutAlt: 0, unlabeledControls: 0 },
          text: { sha256: 'a'.repeat(64), chars: 20 },
        },
      }));
      return p;
    };
    const compare = (b, a) => JSON.parse(execFileSync(PYTHON, ['-B', SOURCE_ENGINE, 'compare', '--before', b, '--after', a], { cwd: ROOT, encoding: 'utf8' }));

    // Unavailable after.axe must NEVER claim "improved"
    const b1 = mkAudit('b1.json', { violations: [{ id: 'image-alt', nodes: 2 }] });
    const a1 = mkAudit('a1.json', { axeAvailable: false, violations: [] });
    const r1 = compare(b1, a1);
    expect(r1.verdict).toBe('incomplete');
    expect(r1.axe.fixed).toEqual([]);
    expect(r1.axe.availableAfter).toBe(false);

    // Node-count regression on existing rule ID
    const b2 = mkAudit('b2.json', { violations: [{ id: 'color-contrast', nodes: 2 }] });
    const a2 = mkAudit('a2.json', { violations: [{ id: 'color-contrast', nodes: 5 }] });
    const r2 = compare(b2, a2);
    expect(r2.verdict).toBe('regressed');
    expect(r2.nodeRegressions).toEqual([{ id: 'color-contrast', before: 2, after: 5, delta: 3 }]);

    // Introduced keyboard trap
    const b3 = mkAudit('b3.json', { violations: [], trap: false });
    const a3 = mkAudit('a3.json', { violations: [], trap: true });
    const r3 = compare(b3, a3);
    expect(r3.verdict).toBe('regressed');
    expect(r3.problems.join(' ')).toMatch(/keyboard trap/i);
  });
});

describe('M-A6, M-A12 & M-A13: portable normalize_verapdf, env sanitization, RTL, render_tagged_pdf /LI, diagnostics', () => {
  it('enforces fail-closed normalize_verapdf checks, Java env sanitization, RTL HTML, and exception class diagnostics', () => {
    const pyScript = `
import importlib.util, json, os, sys
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("portable_mod", ${JSON.stringify(PORTABLE_ENGINE)})
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def mk_report(compliant=True, job_end="normal", profile="PDF/UA-1 validation profile", passed_rules=10, failed_rules=0, passed_checks=25, failed_checks=0, summaries=None):
    return {"report": {"jobs": [{"validationResult": [{
        "compliant": compliant,
        "jobEndStatus": job_end,
        "profileName": profile,
        "details": {
            "passedRules": passed_rules,
            "failedRules": failed_rules,
            "passedChecks": passed_checks,
            "failedChecks": failed_checks,
            "ruleSummaries": summaries if summaries is not None else ([] if compliant else [{"ruleStatus": "FAILED", "clause": "7.1", "testNumber": 1, "description": "bad", "failedChecks": failed_checks}]),
        }
    }]}]}}

out = {}
out["valid_pass"] = mod.normalize_verapdf(mk_report(), exit_code=0)
out["valid_fail"] = mod.normalize_verapdf(mk_report(compliant=False, failed_rules=1, failed_checks=2), exit_code=1)

bad_cases = {
    "non_normal_job": (mk_report(job_end="timeout"), 0),
    "zero_checks": (mk_report(passed_rules=0, failed_rules=0, passed_checks=0, failed_checks=0), 0),
    "wrong_profile": (mk_report(profile="PDF/A-1b validation profile"), 0),
    "exit_mismatch": (mk_report(compliant=True), 1),
    "contradictory_counts": (mk_report(compliant=True, failed_rules=1, failed_checks=1), 0),
}
out["rejected"] = {}
for name, (rep, code) in bad_cases.items():
    try:
        mod.normalize_verapdf(rep, exit_code=code)
        out["rejected"][name] = "ACCEPTED"
    except mod.PortableError as e:
        out["rejected"][name] = str(e)

os.environ["JAVA_TOOL_OPTIONS"] = "-Xmx1m"
os.environ["_JAVA_OPTIONS"] = "-Xmx1m"
os.environ["JDK_JAVA_OPTIONS"] = "-Xmx1m"
os.environ["GEMINI_API_KEY"] = "secret-test"
sanitized = mod._sanitized_java_env()
out["env_stripped"] = all(k not in sanitized for k in ("JAVA_TOOL_OPTIONS", "_JAVA_OPTIONS", "JDK_JAVA_OPTIONS", "GEMINI_API_KEY"))

rtl_html = mod.render_html({
    "document": {"title": "Arabic Test", "language": "ar-EG", "subject": ""},
    "blocks": [{"type": "heading", "level": 1, "text": "مرحبا", "source_page": 1}],
    "review_notes": [],
})
out["rtl_has_dir"] = '<html lang="ar-EG" dir="rtl">' in rtl_html
out["rtl_logical_css"] = ("border-inline-start:" in rtl_html) and ("text-align: start;" in rtl_html) and ("border-left:" not in rtl_html)
print(json.dumps(out))
`;
    const parsed = JSON.parse(execFileSync(PYTHON, ['-B', '-c', pyScript], { cwd: ROOT, encoding: 'utf8' }));
    expect(parsed.valid_pass.compliant).toBe(true);
    expect(parsed.valid_pass.passedChecks).toBe(25);
    expect(parsed.valid_fail.compliant).toBe(false);
    expect(parsed.valid_fail.failedChecks).toBe(2);
    for (const [name, msg] of Object.entries(parsed.rejected)) {
      expect(msg, name).not.toBe('ACCEPTED');
    }
    expect(parsed.env_stripped).toBe(true);
    expect(parsed.rtl_has_dir).toBe(true);
    expect(parsed.rtl_logical_css).toBe(true);
  });

  it('preserves direct integer MCIDs in mixed /LI /K arrays, wraps single-ref /LI /K, and parses single-quoted hrefs', () => {
    const src = readFileSync(PORTABLE_RENDERER, 'utf8').replace(/^#!.*\r?\n/, '');
    // Load helper functions directly from render_tagged_pdf.cjs via Function wrapper (avoiding CLI main() execution).
    const cut = src.indexOf('async function main()');
    const exportsFn = new Function('require', src.slice(0, cut) + '\nreturn { extractAnchorTexts, finalizeTaggedPdf };');
    const { extractAnchorTexts, finalizeTaggedPdf } = exportsFn(requireCjs);

    const anchors = extractAnchorTexts(`<a href='https://single.example/a'>Single Quoted</a> <a href="https://double.example/b">Double Quoted</a>`);
    expect(anchors.get('https://single.example/a')).toBe('Single Quoted');
    expect(anchors.get('https://double.example/b')).toBe('Double Quoted');

    // Build a minimal classic-xref PDF with both a mixed /LI /K [8 0 R 0 9 0 R] and single-ref /LI /K 11 0 R.
    const dir = makeTempDir('alloflow-li-');
    const pdfPath = join(dir, 'li.pdf');
    const objs = [
      null,
      '<</Type /Catalog /Pages 2 0 R /StructTreeRoot 5 0 R /MarkInfo <</Marked true>>>>',
      '<</Type /Pages /Kids [3 0 R] /Count 1>>',
      '<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>>',
      '<</Length 4>>\nstream\nBT\n\nendstream',
      '<</Type /StructTreeRoot /K [6 0 R]>>',
      '<</Type /StructElem /S /L /P 5 0 R /K [7 0 R 10 0 R 12 0 R 14 0 R]>>',
      '<</Type /StructElem /S /LI /P 6 0 R /Pg 3 0 R /K [8 0 R 0 9 0 R]>>',
      '<</Type /StructElem /S /Lbl /P 7 0 R /K 1>>',
      '<</Type /StructElem /S /Em /P 7 0 R /K 2>>',
      '<</Type /StructElem /S /LI /P 6 0 R /Pg 3 0 R /K 11 0 R>>',
      '<</Type /StructElem /S /Strong /P 10 0 R /K 3>>',
      '<</Type /StructElem /S /LI /P 6 0 R /Pg 3 0 R /K [13 0 R <</Type /MCR /Pg 3 0 R /MCID 5>>]>>',
      '<</Type /StructElem /S /Lbl /P 12 0 R /K 6>>',
      '<</Type /StructElem /S /LI /P 6 0 R /Pg 3 0 R /K [15 0 R 7]>>',
      '<</Type /StructElem /S /Lbl /P 14 0 R /K 8>>',
    ];
    const parts = ['%PDF-1.7\n'];
    const offsets = [0];
    let pos = parts[0].length;
    for (let i = 1; i < objs.length; i += 1) {
      offsets.push(pos);
      const chunk = `${i} 0 obj\n${objs[i]}\nendobj\n`;
      parts.push(chunk);
      pos += chunk.length;
    }
    const xrefPos = pos;
    let xref = `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < offsets.length; i += 1) {
      xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    const trailer = `trailer\n<</Size ${objs.length} /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF\n`;
    writeFileSync(pdfPath, parts.join('') + xref + trailer, 'latin1');

    finalizeTaggedPdf(pdfPath, 'LI Test', 1, anchors);
    const updated = readFileSync(pdfPath, 'latin1');
    // Mixed /LI: new LBody must keep BOTH direct integer MCID `0` and ref `9 0 R`, AND copy `/Pg 3 0 R`.
    expect(updated).toMatch(/\/S \/LBody[\s\S]*?\/P 7 0 R[\s\S]*?\/Pg 3 0 R[\s\S]*?\/K \[0 9 0 R\]/);
    // Single-ref /LI: new LBody wraps `11 0 R` and re-parents `11 0 R`.
    expect(updated).toMatch(/\/S \/LBody[\s\S]*?\/P 10 0 R[\s\S]*?\/K 11 0 R/);
    // Inline MCR dict /LI (obj 12): bails safely — never wrapped or shredded, Page 3 untouched.
    const incrementalTail = updated.slice(updated.indexOf('%%EOF') + 5);
    expect(updated).not.toMatch(/\/S \/LBody[\s\S]*?\/P 12 0 R/);
    expect(incrementalTail).not.toMatch(/(?:^|\n)3 0 obj\b/);
    // Bare-MCID /LI with /Lbl (obj 14): wrapped in /LBody preserving MCID `7` and `/Pg 3 0 R`.
    expect(updated).toMatch(/\/S \/LBody[\s\S]*?\/P 14 0 R[\s\S]*?\/Pg 3 0 R[\s\S]*?\/K \[7\]/);
  });

  it('includes exception class name in portable unexpected error output and supports configurable worker count', () => {
    const pyErr = `
import importlib.util, sys
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("portable_err", ${JSON.stringify(PORTABLE_ENGINE)})
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
def boom(): raise ValueError("")
mod.capabilities = boom
sys.argv = ["alloflow_portable.py", "capabilities"]
raise SystemExit(mod.main())
`;
    let errOut = null;
    try {
      execFileSync(PYTHON, ['-B', '-c', pyErr], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
      errOut = { code: e.status, body: JSON.parse(String(e.stdout || '{}')) };
    }
    expect(errOut).not.toBeNull();
    expect(errOut.code).toBe(1);
    expect(errOut.body.error).toContain('ValueError');

    const prevWorkers = process.env.REMEDIATION_VALIDATION_WORKERS;
    try {
      delete process.env.REMEDIATION_VALIDATION_WORKERS;
      expect(Validation.resolveMaxWorkers()).toBe(2);
      process.env.REMEDIATION_VALIDATION_WORKERS = '1';
      expect(Validation.resolveMaxWorkers()).toBe(1);
      expect(Validation.resolveMaxWorkers('3')).toBe(3);
      expect(() => Validation.resolveMaxWorkers('0')).toThrow(/Invalid worker count/);
      expect(() => Validation.resolveMaxWorkers('abc')).toThrow(/Invalid worker count/);
    } finally {
      if (prevWorkers === undefined) delete process.env.REMEDIATION_VALIDATION_WORKERS;
      else process.env.REMEDIATION_VALIDATION_WORKERS = prevWorkers;
    }
  });
});

describe('M-A7, M-A8, M-A9, M-A10 & M-A11 committed/remaining MCP regressions', { timeout: 60_000 }, () => {
  it('accepts browser veraPDF & case-insensitive SHA-256 and rejects zero-check evidence in remediation_verification.cjs', () => {
    const sha = 'a'.repeat(64);
    const okBrowser = Verification.pdfUaEvidence({
      validator: 'veraPDF browser',
      profile: 'ua1',
      inputSha256: sha.toUpperCase(),
      inputBytes: 1234,
      compliant: true,
      passedChecks: 42,
      failedChecks: 0,
      failedRuleCount: 0,
      failedRules: [],
    }, { hasPdf: true, requested: true, sha256: sha, bytes: 1234 });
    expect(okBrowser.status).toBe('passed');
    expect(okBrowser.inputSha256).toBe(sha);

    const zeroChecks = Verification.pdfUaEvidence({
      validator: 'veraPDF CLI',
      profile: 'ua1',
      inputSha256: sha,
      inputBytes: 1234,
      compliant: true,
      passedChecks: 0,
      failedChecks: 0,
      failedRuleCount: 0,
      failedRules: [],
    }, { hasPdf: true, requested: true, sha256: sha, bytes: 1234 });
    expect(zeroChecks.status).toBe('unavailable');
  });

  it('never inflates crashed/incomplete veraPDF JSON to 95% in generate_conformance_report', async () => {
    const c = startStdioConformanceClient();
    await c.init();
    const audit = c.file('audit.json', JSON.stringify({ afterScore: 100, axe: { score: 100, totalViolations: 0, violations: [] } }));
    const pdfBytes = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
    const pdfSha = createHash('sha256').update(pdfBytes).digest('hex');

    // Crashed/empty non-compliant veraPDF -> 0% (NOT 95%)
    await c.call('generate_conformance_report', {
      audit_json: audit,
      verapdf_json: c.file('crashed.json', JSON.stringify({ compliant: false, failedRules: [] })),
      output_path: join(c.dir, 'out-crashed.html'),
    });
    expect(c.seen().pdfUa.summary.conformancePct).toBe(0);

    // Timed-out veraPDF even with clause 5 test 1 only -> 0% (NOT 95%)
    await c.call('generate_conformance_report', {
      audit_json: audit,
      verapdf_json: c.file('timeout.json', JSON.stringify({
        compliant: false,
        jobEndStatus: 'timeout',
        failedRules: [{ clause: '5', testNumber: 1, count: 1 }],
      })),
      output_path: join(c.dir, 'out-timeout.html'),
    });
    expect(c.seen().pdfUa.summary.conformancePct).toBe(0);

    // Valid completed warn-only clause 5 test 1 withheld run -> 95%
    await c.call('generate_conformance_report', {
      audit_json: audit,
      verapdf_json: c.file('warn.json', JSON.stringify({
        compliant: false,
        failedRules: [{ clause: '5', testNumber: 1, message: 'Withheld', count: 1 }],
      })),
      output_path: join(c.dir, 'out-warn.html'),
    });
    expect(c.seen().pdfUa.summary.conformancePct).toBe(95);

    // Missing inputSha256 when tagged_pdf supplied -> rejected
    await expect(c.call('generate_conformance_report', {
      audit_json: audit,
      verapdf_json: c.file('unbound.json', JSON.stringify({ compliant: true, failedRules: [], passedChecks: 50 })),
      tagged_pdf: c.file('doc.pdf', pdfBytes),
      output_path: join(c.dir, 'out-unbound.html'),
    })).rejects.toThrow(/inputSha256/i);

    // Case-insensitive uppercase inputSha256 -> accepted (100%)
    await c.call('generate_conformance_report', {
      audit_json: audit,
      verapdf_json: c.file('upper.json', JSON.stringify({ compliant: true, failedRules: [], passedChecks: 50, inputSha256: pdfSha.toUpperCase() })),
      tagged_pdf: c.file('doc2.pdf', pdfBytes),
      output_path: join(c.dir, 'out-upper.html'),
    });
    expect(c.seen().pdfUa.summary.conformancePct).toBe(100);
  });

  it('covers M-A8 accessible_html_edit.cjs alt/decorative, chained set_table_header, and RTL set_language', () => {
    const DP = new JSDOM('').window.DOMParser;
    const html = '<html lang="en"><body><img src="x.png" alt="" role="presentation" aria-hidden="true"><img src="y.png" alt="Old" aria-label="Old label" title="Old title"><table><tr><td lang="en">Header A</td><td>Header B</td></tr><tr><td>Row 1</td><td>Val 1</td></tr></table></body></html>';
    const outlined = accessibleHtmlTool(html, 'outline', { kinds: ['image', 'table', 'language'] }, DP);
    const images = outlined.items.filter((item) => item.kind === 'image');
    const table = outlined.items.find((item) => item.kind === 'table');
    const cellLang = outlined.items.find((item) => item.kind === 'language' && item.tag === 'td');
    expect(images.length).toBe(2);
    expect(table).toBeTruthy();
    expect(cellLang).toBeTruthy();

    const edited = accessibleHtmlTool(html, 'edit', {
      operations: [
        { op: 'set_alt_text', id: images[0].id, alt: 'Bar chart of scores' },
        { op: 'set_alt_text', id: images[1].id, decorative: true },
        { op: 'set_table_header', id: table.id, first_row: true, first_column: true },
        { op: 'set_language', id: cellLang.id, lang: 'ar' },
        { op: 'set_language', lang: 'ar' },
      ],
    }, DP);
    expect(edited.ok).toBe(true);
    expect(edited.applied).toBe(5);
    expect(edited.html).toContain('alt="Bar chart of scores"');
    expect(edited.html).not.toContain('role="presentation"');
    expect(edited.html).not.toContain('aria-hidden="true"');
    expect(edited.html).not.toContain('aria-label="Old label"');
    expect(edited.html).not.toContain('title="Old title"');
    expect(edited.html).toMatch(/<th\b(?=[^>]*scope="col")(?=[^>]*lang="ar")(?=[^>]*dir="rtl")[^>]*>Header A<\/th>/);
    expect(edited.html).toContain('<th scope="row">Row 1</th>');
    expect(edited.html).toMatch(/<html[^>]*lang="ar"[^>]*dir="rtl"/);

    const backToEn = accessibleHtmlTool(edited.html, 'edit', { operations: [{ op: 'set_language', lang: 'en' }] }, DP);
    expect(backToEn.html).toMatch(/<html[^>]*lang="en"[^>]*dir="ltr"/);
  });

  it('verifies M-A9 det.pages, M-A10 zero NUL bytes + held-for-review exclusion, and M-A11 epub/narration hardening', () => {
    const stdioBytes = readFileSync(resolve(ROOT, 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'));
    expect(stdioBytes.includes(0)).toBe(false);
    const stdioText = stdioBytes.toString('utf8');
    expect(stdioText).toContain("update('\\x00')");
    expect(stdioText).toContain('held-for-review');
    expect(/-tagged(?:-(?:review-required|held-for-review))?(?:-\d+)?\.pdf$/i.test('lesson-tagged-held-for-review.pdf')).toBe(true);
    expect(/-tagged(?:-(?:review-required|held-for-review))?(?:-\d+)?\.pdf$/i.test('lesson-tagged-held-for-review-2.pdf')).toBe(true);

    const driverText = readFileSync(resolve(ROOT, 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
    expect(driverText).toContain('Array.isArray(det && det.pages) ? det.pages : null');

    const epubValText = readFileSync(resolve(ROOT, 'desktop/mcp/remediation_epub_validation.cjs'), 'utf8');
    expect(epubValText).toContain('taskkill.exe');
    expect(epubValText).toContain('/T');

    const narrationText = readFileSync(resolve(ROOT, 'desktop/mcp/remediation_narration.cjs'), 'utf8');
    expect(narrationText).toContain('const mp3Temp=mp3Out+');
    expect(narrationText).toContain('fs.renameSync(mp3Temp,mp3Out)');
    expect(narrationText).toContain('audioAuditVerified:false');
  });
});
