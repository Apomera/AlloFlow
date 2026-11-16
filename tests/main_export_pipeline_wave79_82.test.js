// Verification suite for Waves 79-82:
// - Wave 79: transient print/report popups sever window.opener (Assessment Center, Symbol Studio,
//            Word Sounds, Math Fluency, Reading Library, PD catalog, AlloHaven, Doc Pipeline, PDF
//            audit, Memory Palace sheet, and the host crash-log fallback) while the PDF compare
//            broker window keeps its opener bridge.
// - Wave 80: CSV formula-injection parity (| and leading control characters) in the PD hours log,
//            batch accessibility report (+ UTF-8 BOM), School Rewards, and Educator Evaluation
//            (+ UTF-8 BOM on CSV downloads).
// - Wave 81: Leveled-text cloze honors both isSelected:false and selected:false glossary flags.
// - Wave 82: 15 generated assets byte-identical across 4 mirrors and embedded manifests current.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const read = (f) => readFileSync(resolve(ROOT, f), 'utf8');
const { readEmbeddedManifest } = require('../dev-tools/build_browser_delivery_manifest.cjs');
const sha256 = (f) => createHash('sha256').update(readFileSync(resolve(ROOT, f))).digest('hex');

function slice(source, start, end) {
  const a = source.indexOf(start);
  if (a < 0) throw new Error('Missing marker: ' + start);
  const b = source.indexOf(end, a + start.length);
  if (b < 0) throw new Error('Missing end marker: ' + end);
  return source.slice(a, b);
}

const POPUP_RX = /window\.open\(\s*(['"])\1\s*,\s*(['"])_blank\2\s*\)/g;

function popupContexts(source) {
  const out = [];
  let m;
  POPUP_RX.lastIndex = 0;
  while ((m = POPUP_RX.exec(source))) {
    // Skip window.open calls that live inside generated-HTML string literals
    // (e.g. the Word Sounds answer-key opener written into a print sheet).
    if (/function wsOpenKey\(/.test(source.slice(Math.max(0, m.index - 400), m.index))) continue;
    out.push(source.slice(m.index, m.index + 320));
  }
  return out;
}

describe('Wave 79: transient popup opener isolation', () => {
  const isolated = [
    ['student_analytics_module.js', 4],
    ['symbol_studio_module.js', 4],
    ['word_sounds_module.js', 2],
    ['math_fluency_module.js', 1],
    ['reading_library_module.js', 1],
    ['catalog_module.js', 1],
    ['allohaven_module.js', 1],
    ['doc_pipeline_module.js', 1],
    ['view_renderers_module.js', 1],
  ];

  it.each(isolated)('%s severs opener on every blank print/report window', (file, minimum) => {
    const contexts = popupContexts(read(file));
    expect(contexts.length).toBeGreaterThanOrEqual(minimum);
    for (const ctx of contexts) expect(ctx, `${file}: ${ctx.slice(0, 90)}`).toMatch(/\.opener\s*=\s*null/);
  });

  it('PDF audit isolates report/summary windows but keeps the compare broker bridge', () => {
    const src = read('view_pdf_audit_module.js');
    const contexts = popupContexts(src);
    const broker = contexts.filter((ctx) => ctx.includes('_compareDocumentEpoch'));
    const others = contexts.filter((ctx) => !ctx.includes('_compareDocumentEpoch'));
    expect(broker).toHaveLength(1);
    expect(broker[0]).not.toMatch(/\.opener\s*=\s*null/);
    expect(src).toContain('window.opener.__alloflowCompareGetTagged');
    expect(others.length).toBeGreaterThanOrEqual(4);
    for (const ctx of others) expect(ctx).toMatch(/\.opener\s*=\s*null/);
  });

  it('host crash-log fallback window is isolated in all three host shells', () => {
    for (const shell of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      expect(read(shell)).toContain("var w = window.open('', '_blank'); if (w) { try { w.opener = null; } catch (_) {} }");
    }
  });

  it('Math Fluency print window runtime: opener severed before content is written', () => {
    const src = read('math_fluency_module.js');
    const idx = src.indexOf("win = window.open('', '_blank');");
    const segment = src.slice(idx, idx + 260);
    const severAt = segment.indexOf('opener = null');
    const writeAt = segment.indexOf('document.write');
    expect(severAt).toBeGreaterThan(-1);
    expect(writeAt).toBeGreaterThan(severAt);
  });

  it('lesson summary and learner progress popups stay compatible with minimal popup documents (no document.open requirement)', () => {
    for (const [file, marker] of [['view_lesson_plan_source.jsx', 'var printLessonSummary'], ['teacher_source.jsx', "Print This Report"]]) {
      const src = read(file);
      const at = src.indexOf(marker);
      const segment = src.slice(at, at + 1200);
      expect(segment, file).toMatch(/\.opener\s*=\s*null/);
      expect(segment, file).not.toMatch(/(?:popup|w)\.document\.open\(\)/);
    }
  });
});

describe('Wave 80: CSV formula-injection parity and UTF-8 BOM', () => {
  let E;
  beforeAll(() => {
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.EducatorEvaluation;
    if (!window.React) {
      window.React = {
        createElement: () => null,
        Fragment: 'Fragment',
        useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
        useEffect: () => {},
        useRef: (value) => ({ current: value }),
        useMemo: (fn) => fn(),
      };
    }
    new Function(read('educator_evaluation_module.js'))();
    E = window.AlloModules.EducatorEvaluation && window.AlloModules.EducatorEvaluation._testing;
  });

  it('PD hours log cell guards formulas, pipes, leading controls, and CR while leaving numbers alone', () => {
    const pdCsvCell = new Function(slice(read('catalog_module.js'), 'function pdCsvCell', 'function exportPdHoursCsv') + '\nreturn pdCsvCell;')();
    expect(pdCsvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(pdCsvCell('|cmd')).toBe("'|cmd");
    expect(pdCsvCell('\tTab')).toBe("'\tTab");
    expect(pdCsvCell('  @sum')).toBe("'  @sum");
    expect(pdCsvCell('a\rb')).toBe('"a\rb"');
    expect(pdCsvCell(-5)).toBe('-5');
    expect(pdCsvCell('Workshop')).toBe('Workshop');
  });

  it('batch accessibility report cell + BOM, School Rewards cell, and Educator Evaluation cell guard pipes and controls', () => {
    const docSrc = read('doc_pipeline_source.jsx');
    const csvLine = docSrc.split(/\r?\n/).find((l) => l.includes('const _csvCell = (s) =>'));
    const docCell = new Function(csvLine.trim() + '\nreturn _csvCell;')();
    expect(docCell('|evil')).toBe('"\'|evil"');
    expect(docCell('\nrow')).toBe('"\'\nrow"');
    expect(docCell(' =1')).toBe('"\' =1"');
    expect(read('doc_pipeline_module.js')).toMatch(/zip\.file\(["']batch_accessibility_report\.csv["'],\s*["']\\uFEFF["']\s*\+/);

    const srCsvCell = new Function(slice(read('school_rewards_source.jsx'), 'function srCsvCell', 'function srRosterTemplateCsv') + '\nreturn srCsvCell;')();
    expect(srCsvCell('|pipe')).toBe("'|pipe");
    expect(srCsvCell('Falcon')).toBe('Falcon');

    expect(E && typeof E.aeCsv).toBe('function');
    expect(E.aeCsv([{ a: '|x', b: '\tTab', c: 'ok' }])).toBe("a,b,c\r\n'|x,'\tTab,ok");
  });

  it('Educator Evaluation CSV downloads gain a single UTF-8 BOM; non-CSV downloads stay untouched', () => {
    const captured = [];
    class MemBlob { constructor(parts, opts) { this.text = parts.map(String).join(''); this.type = opts && opts.type; captured.push(this); } }
    const anchor = { click: vi.fn(), remove: vi.fn() };
    const aeDownload = new Function('Blob', 'URL', 'document', 'setTimeout',
      slice(read('educator_evaluation_source.jsx'), 'function aeDownload', 'function aeAuditEvent') + '\nreturn aeDownload;')(
      MemBlob,
      { createObjectURL: () => 'blob:ae', revokeObjectURL: vi.fn() },
      { createElement: () => anchor, body: { appendChild: vi.fn() } },
      (fn) => fn(),
    );
    aeDownload('roster.csv', 'text/csv;charset=utf-8', 'a,b\r\nÉlise,1');
    aeDownload('again.csv', 'text/csv', '\uFEFFx');
    aeDownload('due.ics', 'text/calendar', 'BEGIN:VCALENDAR');
    expect(captured[0].text).toBe('\uFEFFa,b\r\nÉlise,1');
    expect(captured[1].text).toBe('\uFEFFx');
    expect(captured[2].text).toBe('BEGIN:VCALENDAR');
  });
});

describe('Wave 81: cloze dual-flag glossary curation', () => {
  it('leveled-text cloze availability and masking skip both isSelected:false and selected:false terms', () => {
    const src = read('view_simplified_source.jsx');
    expect(src).toContain('props.latestGlossary.some(item => item && item.term && item.isSelected !== false && item.selected !== false)');
    expect(src).toContain('latestGlossary.some(function (item) { return item && item.term && item.isSelected !== false && item.selected !== false; })');
    expect(src).toContain('if (!item || !item.term || item.isSelected === false || item.selected === false) return;');
    const mod = read('view_simplified_module.js').replace(/\s+/g, '');
    expect((mod.match(/item\.isSelected!==false&&item\.selected!==false/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(mod).toContain('item.isSelected===false||item.selected===false');
  });
});

describe('Wave 82: release mirror and manifest coherence', () => {
  const assets = [
    'student_analytics_module.js', 'symbol_studio_module.js', 'word_sounds_module.js', 'math_fluency_module.js',
    'reading_library_module.js', 'catalog_module.js', 'allohaven_module.js', 'doc_pipeline_module.js',
    'view_pdf_audit_module.js', 'document_narration_text_module.js', 'view_renderers_module.js',
    'school_rewards_module.js', 'educator_evaluation_module.js', 'view_simplified_module.js',
    'educator_evaluation_standalone.js', 'teacher_module.js', 'view_lesson_plan_module.js',
  ];

  it('keeps all 17 Wave 79-82 assets byte-identical across the four release mirrors', () => {
    for (const file of assets) {
      const expected = sha256(file);
      for (const mirror of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
        const target = mirror + '/' + file;
        if (!existsSync(resolve(ROOT, target))) continue;
        expect(sha256(target), target).toBe(expected);
      }
    }
  });

  it('keeps the three host shells identical with current manifest entries for every rebuilt module', () => {
    const shells = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
    const hostSha = sha256(shells[0]);
    for (const shell of shells) {
      expect(sha256(shell), shell).toBe(hostSha);
      const manifest = readEmbeddedManifest(read(shell));
      for (const file of assets.filter((f) => f.endsWith('_module.js'))) {
        const buf = readFileSync(resolve(ROOT, file));
        expect(manifest.assets[file], `${shell}:${file}`).toEqual({ bytes: buf.length, integrity: 'sha384-' + createHash('sha384').update(buf).digest('base64') });
      }
    }
  });
});
