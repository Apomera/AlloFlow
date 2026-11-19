import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const PORTABLE_ENGINE = resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py');
const PORTABLE_SOURCE = resolve(ROOT, 'test-assets/multi-column-scrambled.pdf');
const PORTABLE_SOURCE_SHA = createHash('sha256').update(readFileSync(PORTABLE_SOURCE)).digest('hex');

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const scratchDirs = [];
function makeTmp(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  scratchDirs.push(dir);
  return dir;
}
afterEach(() => {
  while (scratchDirs.length) rmSync(scratchDirs.pop(), { recursive: true, force: true });
});

function runPortable(args, timeout = 180_000) {
  const res = spawnSync(PYTHON, ['-B', PORTABLE_ENGINE, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' },
  });
  let json = null;
  try { json = JSON.parse(res.stdout); } catch (_) {}
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, json };
}

describe('W2-M1: zip_writer Uint8Array/ArrayBuffer binary support & ZIP32 guards', () => {
  const { makeZip, zipFileMap } = require('../desktop/mcp/zip_writer.cjs');
  const EpubArchive = require('../desktop/mcp/remediation_epub_archive.cjs');
  const JSZip = require('jszip');

  it('preserves Uint8Array (including nonzero byteOffset subarray) and ArrayBuffer losslessly', async () => {
    const padded = new Uint8Array(PNG_1X1.length + 10);
    padded.fill(0xAA);
    padded.set(PNG_1X1, 4);
    const sub = padded.subarray(4, 4 + PNG_1X1.length);
    const ab = PNG_1X1.buffer.slice(PNG_1X1.byteOffset, PNG_1X1.byteOffset + PNG_1X1.byteLength);

    const zipBytes = zipFileMap({
      mimetype: 'application/epub+zip',
      'OEBPS/images/img-1.png': sub,
      'OEBPS/images/img-2.png': ab,
      'OEBPS/note.txt': 'hello',
    }, 'mimetype');

    const loaded = await JSZip.loadAsync(zipBytes);
    expect(Buffer.from(await loaded.file('OEBPS/images/img-1.png').async('nodebuffer')).equals(PNG_1X1)).toBe(true);
    expect(Buffer.from(await loaded.file('OEBPS/images/img-2.png').async('nodebuffer')).equals(PNG_1X1)).toBe(true);
    expect(await loaded.file('OEBPS/note.txt').async('string')).toBe('hello');

    const dir = makeTmp('w2-zip-archive-');
    const epubPath = join(dir, 'sample.epub');
    writeFileSync(epubPath, zipBytes);
    expect((await EpubArchive.inspect(epubPath)).status).toBe('passed');
  });

  it('rejects plain objects and enforces ZIP32 name/entry bounds', () => {
    expect(() => makeZip([{ name: 'bad.bin', data: { 0: 137, 1: 80 } }])).toThrow(/Buffer, Uint8Array, or ArrayBuffer/);
    expect(() => makeZip([{ name: 'a'.repeat(65536), data: 'x' }])).toThrow(/65535/);
    const tooMany = Array.from({ length: 65536 }, (_, i) => ({ name: 'f' + i, data: '' }));
    expect(() => makeZip(tooMany)).toThrow(/65535/);
  });

  it('bridges EPUB3 externalized binary images losslessly through exportAltFormat IPC + zip_writer + archive preflight', async () => {
    const Driver = require('../desktop/mcp/remediation_headless_driver.cjs');
    const driver = Driver.createDriver({ onLog: () => {} });
    try {
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>EPUB Binary Image</title></head>`
        + `<body><h1 id="h1">EPUB Binary Image</h1><img src="data:image/png;base64,${PNG_1X1.toString('base64')}" alt="Test pixel"></body></html>`;
      const res = await driver.exportAltFormat({ html, title: 'EPUB Binary Image', format: 'epub' });
      expect(res.valid).toBe(true);
      expect(res.entries.some((e) => e.startsWith('OEBPS/images/'))).toBe(true);
      const epubBuf = Buffer.from(res.b64, 'base64');
      const loaded = await JSZip.loadAsync(epubBuf);
      const imgEntry = res.entries.find((e) => e.startsWith('OEBPS/images/'));
      expect(Buffer.from(await loaded.file(imgEntry).async('nodebuffer')).equals(PNG_1X1)).toBe(true);
      const dir = makeTmp('w2-epub-extimg-');
      const epubFile = join(dir, 'extimg.epub');
      writeFileSync(epubFile, epubBuf);
      expect((await EpubArchive.inspect(epubFile)).status).toBe('passed');
    } finally {
      await driver.close();
    }
  }, 60_000);
});

describe('W2-M2: remediation_narration & narration_plan hardening', () => {
  const { planDocument, LABELS } = require('../desktop/mcp/remediation_narration_plan.cjs');
  const generated = readFileSync(resolve(ROOT, 'document_narration_text_module.js'), 'utf8');
  const shared = new Function('DOMParser', generated + ';return AlloNarrationText;')(DOMParser);
  const helpers = { ...shared, sanitize: (html) => html };

  it('excludes decorative SVGs & inline-chart SVGs and rejects whitespace-only aria-label on math/svg', () => {
    const decorativeHtml = '<html lang="en"><body>'
      + '<p>Intro text.</p>'
      + '<svg role="presentation"><circle r="4"/></svg>'
      + '<svg role="none"><rect width="4" height="4"/></svg>'
      + '<div class="alloflow-inline-chart"><svg><rect width="10" height="10"/></svg><p>Chart summary.</p></div>'
      + '</body></html>';
    const okPlan = planDocument({ html: decorativeHtml, mode: 'accessible', labels: LABELS }, helpers);
    expect(okPlan.contentCoverage.status).toBe('matched');
    expect(okPlan.contentCoverage.unresolvedVisuals).toBe(0);
    expect(okPlan.contentCoverage.excluded.decorative_images).toBe(3);

    const blankLabelHtml = '<html lang="en"><body>'
      + '<p>Formula:</p><math aria-label="   "><mfrac><mn>1</mn><mn>2</mn></mfrac></math>'
      + '<svg aria-label=" \t "><circle r="2"/></svg></body></html>';
    const blockedPlan = planDocument({ html: blankLabelHtml, mode: 'accessible', labels: LABELS }, helpers);
    expect(blockedPlan.contentCoverage.status).toBe('blocked');
    expect(blockedPlan.contentCoverage.unresolvedVisuals).toBe(2);
  });

  it('splits CJK sentences at fullwidth punctuation and never splits UTF-16 surrogate pairs', () => {
    const cjkSentence = '这是一个完整的中文句子用于测试朗读分段功能。'.repeat(40);
    const cjkHtml = `<html lang="zh"><body><p>${cjkSentence}</p></body></html>`;
    const cjkPlan = planDocument({ html: cjkHtml, mode: 'natural', labels: LABELS }, helpers);
    expect(cjkPlan.segments.length).toBeGreaterThan(1);
    expect(cjkPlan.segments[0].text.endsWith('。')).toBe(true);

    // Place a surrogate pair (😀 = 2 UTF-16 code units) straddling index 600 (at 599..600).
    const unbroken = 'a'.repeat(599) + '😀' + 'b'.repeat(200);
    const emojiPlan = planDocument({ html: `<html lang="en"><body><p>${unbroken}</p></body></html>`, mode: 'natural', labels: LABELS }, helpers);
    expect(emojiPlan.segments.length).toBe(2);
    for (const seg of emojiPlan.segments) {
      // No lone high/low surrogates
      expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(seg.text)).toBe(false);
    }
    expect(emojiPlan.segments.map((s) => s.text).join('')).toContain('😀');
  });

  it('keeps raw-byte source hashing, WAV temp cleanup, and read-along EPUB hardening in remediation_narration.cjs', () => {
    const src = readFileSync(resolve(ROOT, 'desktop/mcp/remediation_narration.cjs'), 'utf8');
    expect(src).toContain('const sourceBytes=fs.readFileSync(o.filePath),sourceHash=hash(sourceBytes);');
    expect(src).toContain('externalizeImages:false');
    expect(src).toContain('remote-resources');
    expect(src).toContain('await context.close().catch(()=>{})');
    expect(src).toContain('replace(/\\sxmlns="([^"]+)"(?=[^<>]*\\sxmlns="\\1")/g,\'\')');
  });

  it('strips duplicate xmlns attributes on serialized read-along plan.bodyHtml so validateEpub passes', () => {
    const narSrc = readFileSync(resolve(ROOT, 'desktop/mcp/remediation_narration.cjs'), 'utf8');
    const cleanSnippet = sliceBetween(
      narSrc,
      "const bodyDoc=new DOMParser().parseFromString('<!doctype html><html><body>'+plan.bodyHtml+'</body></html>','text/html');",
      "pkg.files['OEBPS/content.xhtml']=",
      { file: 'desktop/mcp/remediation_narration.cjs' },
    );
    // Simulate Chromium Blink XMLSerializer emitting both the implicit element namespace
    // and the parsed literal xmlns attribute when plan.bodyHtml already carried xmlns.
    class BlinkLikeXMLSerializer {
      serializeToString(node) {
        const raw = new XMLSerializer().serializeToString(node);
        return raw.replace(/<(h1|p|div)(\s[^>]*?\sxmlns="http:\/\/www\.w3\.org\/1999\/xhtml")/gi, '<$1 xmlns="http://www.w3.org/1999/xhtml"$2');
      }
    }
    const buildCleanBody = new Function('plan', 'DOMParser', 'XMLSerializer', cleanSnippet + '\nreturn cleanBody;');
    const plan = {
      bodyHtml: '<h1 xmlns="http://www.w3.org/1999/xhtml" id="mo1">Chapter 1</h1>'
        + '<p xmlns="http://www.w3.org/1999/xhtml" id="mo2">Read-along body.</p>',
    };
    const cleanBody = buildCleanBody(plan, DOMParser, BlinkLikeXMLSerializer);
    expect(cleanBody).not.toMatch(/xmlns="([^"]+)"[^<>]*xmlns="\1"/);

    const xhtml = '<?xml version="1.0" encoding="utf-8"?>\n'
      + '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>T</title></head><body>' + cleanBody + '</body></html>';
    const parsed = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
    expect(parsed.querySelector('parsererror')).toBeNull();

    const auditSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
    const start = auditSrc.indexOf('function validateEpubStructure(files) {');
    const end = auditSrc.indexOf('\n// _buildDocxBlobFromSpec:', start);
    const { validateEpubStructure } = new Function(auditSrc.slice(start, end) + '; return { validateEpubStructure };')();
    const res = validateEpubStructure({
      mimetype: 'application/epub+zip',
      'META-INF/container.xml': '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
      'OEBPS/content.xhtml': xhtml,
      'OEBPS/content.smil': '<?xml version="1.0" encoding="utf-8"?><smil xmlns="http://www.w3.org/ns/SMIL" version="3.0"><body><seq>'
        + '<par id="par1"><text src="content.xhtml#mo1"/><audio src="audio/seg1.mp3" clipBegin="0:00:00.000" clipEnd="0:00:01.000"/></par>'
        + '<par id="par2"><text src="content.xhtml#mo2"/><audio src="audio/seg2.mp3" clipBegin="0:00:00.000" clipEnd="0:00:01.000"/></par>'
        + '</seq></body></smil>',
      'OEBPS/content.opf': '<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">x</dc:identifier><dc:title>T</dc:title><dc:language>en</dc:language><meta property="media:duration">0:00:02.000</meta></metadata>'
        + '<manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml" media-overlay="smil"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="smil" href="content.smil" media-type="application/smil+xml"/><item id="aud1" href="audio/seg1.mp3" media-type="audio/mpeg"/><item id="aud2" href="audio/seg2.mp3" media-type="audio/mpeg"/></manifest>'
        + '<spine><itemref idref="content"/></spine></package>',
      'OEBPS/nav.xhtml': '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Nav</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol><li><a href="content.xhtml#mo1">Chapter 1</a></li></ol></nav></body></html>',
      'OEBPS/audio/seg1.mp3': true,
      'OEBPS/audio/seg2.mp3': true,
    });
    expect(res.issues.filter((i) => i.severity === 'error'), JSON.stringify(res.issues)).toEqual([]);
    expect(res.valid).toBe(true);
  });
});

describe('W2-M3: pdf_annotations scan nearText recovery & fuzzy tie-breaker', () => {
  const { fillFromScanReading, matchToOutline, keyWords } = require('../desktop/mcp/pdf_annotations.cjs');

  it('recovers nearText for non-markup scan sticky notes and tolerates malformed words', () => {
    const reading = {
      pages: [{
        pageNum: 1,
        pageW: 612,
        pageH: 792,
        words: [
          null,
          { t: 'bad', x0: NaN, x1: 20, y0: 10, y1: 20 },
          { t: 'Evaporation', x0: 72, y0: 200, x1: 140, y1: 214 },
          { t: 'turns', x0: 146, y0: 200, x1: 180, y1: 214 },
          { t: 'water', x0: 186, y0: 200, x1: 220, y1: 214 },
          { t: 'Footer', x0: 72, y0: 720, x1: 110, y1: 734 },
        ],
      }],
    };
    // y0=200..214 top-left -> center PDF y = 792 - 207 = 585
    const anns = [{ page: 1, kind: 'note', markedText: '', nearText: '', quads: [], rect: [480, 578, 500, 596], pageW: 612, pageH: 792 }];
    expect(fillFromScanReading(anns, reading)).toBe(1);
    expect(anns[0].nearText).toBe('Evaporation turns water');
    expect(anns[0].nearFrom).toBe('scan reading');
  });

  it('breaks fuzzy share ties in favor of the smaller element and splits hyphenated words', () => {
    expect(keyWords('well-known study')).toEqual(['well', 'known', 'study']);
    const items = [
      { id: 'long', kind: 'paragraph', text: 'A very long paragraph mentioning heavy droplets fall as snow plus many extra unrelated background details about storms and oceans.' },
      { id: 'short', kind: 'heading', level: 2, text: 'Heavy droplets fall as snow' },
    ];
    expect(matchToOutline('Heavy droplets fall as hail', items)).toMatchObject({ id: 'short', match: 'shares most of the marked words' });
    expect(matchToOutline('well-known', [{ id: 'p1', kind: 'paragraph', text: 'A well known result.' }])).toMatchObject({ id: 'p1' });
  });
});

describe('W2-M4: scan_reading_corrections outlier trimming & skipped-page recovery', () => {
  const { carryCorrectionsOntoReading: carry } = require('../desktop/mcp/scan_reading_corrections.cjs');
  const SRC = readFileSync(resolve(ROOT, 'doc_pipeline_source.jsx'), 'utf8');
  const align = new Function(sliceBetween(SRC, 'var _alloAlignVisionOntoOcrWords = function', '\n};', { file: 'doc_pipeline_source.jsx' }) + '\n};\nreturn _alloAlignVisionOntoOcrWords;')();

  function mkPage(pageNum, text) {
    const words = text.split(/\s+/).filter(Boolean).map((t, i) => ({
      t, x0: 72 + (i % 10) * 50, y0: 72 + Math.floor(i / 10) * 24,
      x1: 72 + (i % 10) * 50 + 40, y1: 90 + Math.floor(i / 10) * 24, c: 85,
    }));
    return { pageNum, text, words, pageW: 612, pageH: 792 };
  }

  it('trims a stray trailing footer match deep in page 2 so page 2 still aligns and corrects', () => {
    const p1 = mkPage(1, 'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma footerword');
    const filler = Array.from({ length: 120 }, (_, i) => `topicword${i}`).join(' ');
    const p2 = mkPage(2, `Condensatlon ${filler} footerword closing summary notes`);
    const edited = 'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma '
      + `Condensation ${filler} footerword closing summary notes`;
    const { pages, stats } = carry([p1, p2], edited, align);
    expect(stats.skipped).toEqual([]);
    expect(pages[1].words[0].t).toBe('Condensation');
  });

  it('recovers alignment on page 3 after a large skipped intermediate page 2', () => {
    const p1 = mkPage(1, 'Introduction to watershed ecology and freshwater storage in mountain basins.');
    const skippedBody = Array.from({ length: 450 }, (_, i) => `ocrdiagram${i}`).join(' ');
    const editedMiddle = Array.from({ length: 450 }, (_, i) => `rewrittenchart${i}`).join(' ');
    const p2 = mkPage(2, skippedBody);
    const p3 = mkPage(3, 'Precipitatlon falls across alpine ridges and feeds valley rivers throughout spring.');
    const edited = 'Introduction to watershed ecology and freshwater storage in mountain basins. '
      + editedMiddle
      + ' Precipitation falls across alpine ridges and feeds valley rivers throughout spring.';
    const { pages, stats } = carry([p1, p2, p3], edited, align);
    expect(stats.skipped.map((s) => s.page)).toEqual([2]);
    expect(pages[2].words[0].t).toBe('Precipitation');
  });
});

describe('W2-M5: Ace browser data:image/jpg parity & worker signal cleanup', () => {
  const AceBrowser = require('../desktop/mcp/remediation_ace_browser.cjs');

  it('allows passive data:image/jpg URIs while blocking active data URIs and registers worker signal handlers', () => {
    const dir = makeTmp('w2-ace-');
    const policy = AceBrowser.install({ launch: async () => ({}) }, { epubRoot: dir, trustedScriptRoot: dir });
    expect(policy.allowed('data:image/jpg;base64,iVBORw0KGgo=', 'image')).toBe(true);
    expect(policy.allowed('data:image/svg+xml;base64,PHN2Zy8+', 'image')).toBe(false);
    expect(policy.allowed('data:text/html;base64,PGgxPmg8L2gxPg==', 'document')).toBe(false);

    const workerSrc = readFileSync(resolve(ROOT, 'desktop/mcp/remediation_ace_worker.cjs'), 'utf8');
    expect(workerSrc).toContain("process.on('SIGTERM'");
    expect(workerSrc).toContain("process.on('SIGINT'");
  });
});

describe('MCP-B1: Portable multiset recall, inline lang, spanned H43 tables, nested lists, code & formula + veraPDF UA-1', { timeout: 180_000 }, () => {
  it('detects repeated-word omissions via multiset plan_internal_token_recall', () => {
    const dir = makeTmp('w2-b1-recall-');
    const planPath = join(dir, 'plan.json');
    const outDir = join(dir, 'out');
    writeFileSync(planPath, JSON.stringify({
      schema_version: '1.0',
      document: {
        title: 'Repeated Words',
        language: 'en',
        source_page_count: 1,
        source_sha256: PORTABLE_SOURCE_SHA,
        document_type: 'handout',
      },
      source_pages: [{ page: 1, text: 'Repeated Words ' + 'water '.repeat(20) + 'cycle' }],
      blocks: [
        { type: 'heading', level: 1, text: 'Repeated Words', source_page: 1 },
        { type: 'paragraph', text: 'water cycle', source_page: 1 },
      ],
      review_notes: ['Omission test'],
    }));
    const res = runPortable(['remediate', '--source', PORTABLE_SOURCE, '--plan', planPath, '--out-dir', outDir, '--pdf', 'never', '--verapdf', 'never']);
    expect(res.status, res.stderr || res.stdout).toBe(0);
    const report = JSON.parse(readFileSync(join(outDir, 'multi-column-scrambled-accessibility-report.json'), 'utf8'));
    // Old set-based recall returned 1.0 here; multiset catches the 19 dropped copies of "water" (4/23 = 0.1739).
    expect(report.checks.repairPlan.metrics.plan_internal_token_recall).toBeLessThan(0.25);
    expect(report.checks.repairPlan.warnings.join(' ')).toMatch(/Plan-internal token recall/);
  });

  it('rejects invalid inline lang, irregular spanned tables, deep list nesting, and unsafe MathML', () => {
    const dir = makeTmp('w2-b1-invalid-');
    const testReject = (name, blocks, pattern) => {
      const p = join(dir, name + '.json');
      writeFileSync(p, JSON.stringify({
        schema_version: '1.0',
        document: { title: 'Invalid', language: 'en', source_page_count: 1, source_sha256: PORTABLE_SOURCE_SHA, document_type: 'report' },
        blocks: [{ type: 'heading', level: 1, text: 'Invalid', source_page: 1 }, ...blocks],
        review_notes: ['fixture'],
      }));
      const res = runPortable(['remediate', '--source', PORTABLE_SOURCE, '--plan', p, '--out-dir', join(dir, name + '-out'), '--pdf', 'never', '--verapdf', 'never']);
      expect(res.status, name).toBe(3);
      expect(res.json?.error || res.stderr, name).toMatch(pattern);
    };

    testReject('bad-lang', [{ type: 'paragraph', text: 'hi', runs: [{ text: 'hi', lang: 'not valid!' }], source_page: 1 }], /BCP 47/i);
    testReject('bad-rowspan', [{
      type: 'table', caption: 'T', columns: ['A', 'B'],
      rows: [[{ text: 'X', rowspan: 3 }, 'Y']], source_page: 1,
    }], /extends past the last row/i);
    testReject('bad-mathml-xss', [{
      type: 'formula', alt_text: 'x', mathml: '<math><script>alert(1)</script></math>', source_page: 1,
    }], /disallowed element/i);
    testReject('bad-mathml-attr', [{
      type: 'formula', alt_text: 'x', mathml: '<math><mi href="javascript:alert(1)">x</mi></math>', source_page: 1,
    }], /disallowed attribute/i);
    // 7 levels deep exceeds MAX_LIST_DEPTH (6)
    let nested = { ordered: false, items: ['leaf'] };
    for (let i = 0; i < 6; i++) nested = { ordered: false, items: [{ text: 'lvl' + i, children: nested }] };
    testReject('deep-list', [{ type: 'list', ordered: false, items: nested.items, source_page: 1 }], /maximum list nesting depth/i);
  });

  it('renders inline lang, spanned H43 table, nested list, code & MathML formula cleanly and passes real veraPDF PDF/UA-1', () => {
    const dir = makeTmp('w2-b1-pdfua-');
    const planPath = join(dir, 'plan.json');
    const outDir = join(dir, 'out');
    writeFileSync(planPath, JSON.stringify({
      schema_version: '1.0',
      document: {
        title: 'Wave 2 Portable Fidelity Check',
        language: 'en',
        source_page_count: 1,
        source_sha256: PORTABLE_SOURCE_SHA,
        document_type: 'report',
      },
      blocks: [
        { type: 'heading', level: 1, text: 'Wave 2 Portable Fidelity Check', source_page: 1 },
        {
          type: 'paragraph',
          text: 'Hello amigos and مرحبا friends.',
          runs: [
            { text: 'Hello ', style: 'normal' },
            { text: 'amigos', style: 'emphasis', lang: 'es' },
            { text: ' and ', style: 'normal' },
            { text: 'مرحبا', style: 'normal', lang: 'ar' },
            { text: ' friends.', style: 'normal' },
          ],
          source_page: 1,
        },
        {
          type: 'table',
          caption: 'Spanned Support Matrix',
          columns: [{ text: 'Term', colspan: 1 }, { text: 'Offerings', colspan: 2 }],
          rows: [
            [{ text: 'Fall', rowspan: 2, header: true }, 'Tutoring', 'Room 101'],
            ['Captioning', ''],
            [{ text: 'Total', header: true }, { text: 'All rooms accessible', colspan: 2 }],
          ],
          source_page: 1,
        },
        {
          type: 'list',
          ordered: true,
          items: [
            {
              text: 'Prepare sample',
              children: {
                ordered: false,
                items: ['Fill beaker', { text: 'Record temp', runs: [{ text: 'Record ', style: 'strong' }, { text: 'temp', style: 'normal' }] }],
              },
            },
            'Analyze results',
          ],
          source_page: 1,
        },
        { type: 'code', language: 'python', caption: 'Helper', text: 'def double(x):\n    return x * 2', source_page: 1 },
        {
          type: 'formula',
          alt_text: 'One half plus one quarter equals three quarters',
          mathml: '<math xmlns="http://www.w3.org/1998/Math/MathML" lang="en" xml:lang="en"><mfrac><mn>1</mn><mn>2</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>=</mo><mfrac><mn>3</mn><mn>4</mn></mfrac></math>',
          caption: 'Fraction sum',
          source_page: 1,
        },
      ],
      review_notes: ['Wave 2 PDF/UA verification fixture.'],
    }));

    const cap = runPortable(['capabilities', '--json'], 90_000);
    const hasUa = cap.status === 0 && cap.json?.taggedPdfGeneration === true && cap.json?.pdfUaValidation === true;
    const res = runPortable([
      'remediate', '--source', PORTABLE_SOURCE, '--plan', planPath, '--out-dir', outDir,
      '--pdf', hasUa ? 'required' : 'never',
      '--verapdf', hasUa ? 'required' : 'never',
    ]);
    expect(res.status, res.stderr || res.stdout).toBe(0);

    const html = readFileSync(join(outDir, 'multi-column-scrambled-accessible.html'), 'utf8');
    expect(html).toContain('<span lang="es"><em>amigos</em></span>');
    expect(html).toContain('<span lang="ar" dir="rtl">مرحبا</span>');
    expect(html).toContain('colspan="2"');
    expect(html).toContain('rowspan="2"');
    expect(html).toContain('headers="alloflow-tbl-1-c1 alloflow-tbl-1-r0-c0"');
    expect(html).toContain('<ul><li>Fill beaker</li><li><strong>Record </strong>temp</li></ul>');
    expect(html).toContain('<pre aria-describedby="alloflow-codecap-1" data-language="python"><code>def double(x):\n    return x * 2</code></pre>');
    expect(html).toContain('<div data-source-page="1" class="alloflow-formula-block"><div class="alloflow-formula" role="math" aria-label="One half plus one quarter equals three quarters" aria-describedby="alloflow-formulacap-2">');
    expect(html).toContain('</div><p class="alloflow-formula-caption" id="alloflow-formulacap-2">Fraction sum</p></div>');
    expect(html).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"');
    // MathML lang + xml:lang deduplicates to a single lang="en" attribute
    const mathTag = html.match(/<math\b[^>]*>/);
    expect(mathTag).not.toBeNull();
    expect(mathTag[0].match(/\blang="/g)).toHaveLength(1);

    if (hasUa) {
      expect(res.json?.pdfUaCompliant).toBe(true);
      const report = JSON.parse(readFileSync(join(outDir, 'multi-column-scrambled-accessibility-report.json'), 'utf8'));
      expect(report.checks.pdfUaValidation).toMatchObject({ status: 'completed', compliant: true, failedRuleCount: 0, failedChecks: 0 });
    }
  });

  it('wires H43 headers using left-side row headers only and propagates all-header subheader rows until the next all-header row', () => {
    const dir = makeTmp('w2-b1-h43-');
    const planPath = join(dir, 'plan.json');
    const outDir = join(dir, 'out');
    writeFileSync(planPath, JSON.stringify({
      schema_version: '1.0',
      document: {
        title: 'H43 Subheader and Mid-Row Header Check',
        language: 'en',
        source_page_count: 1,
        source_sha256: PORTABLE_SOURCE_SHA,
        document_type: 'report',
      },
      blocks: [
        { type: 'heading', level: 1, text: 'H43 Subheader and Mid-Row Header Check', source_page: 1 },
        {
          type: 'table',
          caption: 'Mid-row Header Table',
          columns: ['A', 'B', 'C', 'D'],
          rows: [
            [{ text: 'Left', header: true }, 'v1', { text: 'Mid', header: true }, 'v2'],
          ],
          source_page: 1,
        },
        {
          type: 'table',
          caption: 'Regional Subheader Table',
          columns: ['Item', 'Q1', 'Q2'],
          rows: [
            [{ text: 'North Region', colspan: 3, header: true }],
            [{ text: 'Sales', header: true }, '10', '20'],
            [{ text: 'South', header: true }, { text: 'First Half', colspan: 2, header: true }],
            [{ text: 'Sales', header: true }, '30', '40'],
          ],
          source_page: 1,
        },
      ],
      review_notes: ['H43 direction and subheader propagation fixture.'],
    }));
    const res = runPortable(['remediate', '--source', PORTABLE_SOURCE, '--plan', planPath, '--out-dir', outDir, '--pdf', 'never', '--verapdf', 'never']);
    expect(res.status, res.stderr || res.stdout).toBe(0);
    const html = readFileSync(join(outDir, 'multi-column-scrambled-accessible.html'), 'utf8');

    // Mid-row header: v1 (col 1) gets only Left (col 0), NOT Mid (col 2); v2 (col 3) gets both.
    expect(html).toContain('<td headers="alloflow-tbl-1-c1 alloflow-tbl-1-r0-c0">v1</td>');
    expect(html).toContain('<td headers="alloflow-tbl-1-c3 alloflow-tbl-1-r0-c0 alloflow-tbl-1-r0-c2">v2</td>');

    // All-header subheader rows: North Region propagates to row 1, then South / First Half replaces it for row 3.
    expect(html).toContain('<th id="alloflow-tbl-2-r0-c0" scope="colgroup" colspan="3">North Region</th>');
    expect(html).toContain('<td headers="alloflow-tbl-2-c1 alloflow-tbl-2-r0-c0 alloflow-tbl-2-r1-c0">10</td>');
    expect(html).toContain('<th id="alloflow-tbl-2-r2-c0" scope="col">South</th><th id="alloflow-tbl-2-r2-c1" scope="colgroup" colspan="2">First Half</th>');
    expect(html).toContain('<td headers="alloflow-tbl-2-c1 alloflow-tbl-2-r2-c1 alloflow-tbl-2-r3-c0">30</td>');
    expect(html).not.toContain('<td headers="alloflow-tbl-2-c1 alloflow-tbl-2-r0-c0 alloflow-tbl-2-r2-c1');
  });
});

describe('MCP-B2 & MCP-B3: capability inventory runtime probes & extended benchmark corpus', { timeout: 120_000 }, () => {
  it('passes all 4 offline runtime smoke probes in mcp_capability_inventory.cjs --assert-parity', () => {
    const dir = makeTmp('w2-b2-inv-');
    const jsonPath = join(dir, 'inventory.json');
    const res = spawnSync(process.execPath, [
      resolve(ROOT, 'dev-tools/mcp_capability_inventory.cjs'),
      '--assert-parity', '--json', jsonPath,
    ], { cwd: ROOT, encoding: 'utf8', timeout: 90_000 });
    expect(res.status, res.stderr || res.stdout).toBe(0);
    expect(existsSync(jsonPath)).toBe(true);
    const report = JSON.parse(readFileSync(jsonPath, 'utf8'));
    expect(report.runtimeProbes).toHaveLength(4);
    expect(report.runtimeProbes.every((p) => p.ok === true)).toBe(true);
  });

  it('passes all 4 cases in manifest-extended.json offline and enforces htmlExcludes in benchmark_alloflow_portable.cjs', () => {
    const benchSrc = readFileSync(resolve(ROOT, 'dev-tools/benchmark_alloflow_portable.cjs'), 'utf8');
    expect(benchSrc).toContain('definition.htmlExcludes');
    expect(benchSrc).toContain('forbidden.length === 0');

    const dir = makeTmp('w2-b3-ext-');
    const outDir = join(dir, 'bench-out');
    const res = spawnSync(process.execPath, [
      resolve(ROOT, 'dev-tools/benchmark_document_remediation.cjs'),
      '--mode', 'local',
      '--manifest', resolve(ROOT, 'tests/fixtures/remediation_benchmark/manifest-extended.json'),
      '--trials', '1',
      '--out-dir', outDir,
    ], { cwd: ROOT, encoding: 'utf8', timeout: 90_000 });
    expect(res.status, res.stderr || res.stdout).toBe(0);
    const report = JSON.parse(readFileSync(join(outDir, 'benchmark-report.json'), 'utf8'));
    expect(report.summary).toEqual({ plannedTrials: 4, completedTrials: 4, passed: 4, failed: 0 });
  });
});
