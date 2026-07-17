#!/usr/bin/env node
// check_daisy_zedval.cjs — validate the DAISY export against the REAL Z39.86
// validator (ZedVal 2.1, the DAISY Consortium's conformance tool).
//
// Generates a sample package from the PRODUCTION builders in
// view_pdf_audit_source.jsx (same slice-extraction as tests/export_odt_daisy),
// then runs ZedVal on it and fails if the report has any failures or
// processor errors.
//
// ZedVal is Java (like veraPDF/epubcheck): the jar is NOT vendored in the
// repo. The script looks for it at ZEDVAL_HOME, then C:\tmp\zedval\zedval-2.1
// (where the 2026-07-17 session installed it; zedval.sourceforge.net), and
// SKIPS with exit 0 when the jar or java is missing — so CI/deploy machines
// without it are not blocked. Run on a machine that has it before shipping
// DAISY-builder changes.
//
// Java 21 note: ZedVal's bundled Saxon-HE-9.4 has a services file modern
// ServiceLoaders reject; the -Djavax.xml.xpath.XPathFactory override below is
// REQUIRED or ZedVal dies in ExceptionInInitializerError.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'view_pdf_audit_source.jsx');

function findZedval() {
  const candidates = [
    process.env.ZEDVAL_HOME,
    'C:\\tmp\\zedval\\zedval-2.1',
    path.join(os.homedir(), 'zedval', 'zedval-2.1'),
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'lib', 'zedval-2.1.jar'))) return c;
  }
  return null;
}

function haveJava() {
  try { return spawnSync('java', ['-version']).status === 0; } catch (_) { return false; }
}

const zedvalHome = findZedval();
if (!zedvalHome || !haveJava()) {
  console.log('check_daisy_zedval: SKIP — ' + (zedvalHome ? 'java not found' : 'ZedVal not installed (set ZEDVAL_HOME or install to C:\\tmp\\zedval)') + '.');
  process.exit(0);
}

// ── build a sample package from the production builders ──
const src = fs.readFileSync(SRC, 'utf8');
const start = src.indexOf('function _htmlToDocxSpec(html) {');
const end = src.indexOf('\n// _buildDocxBlobFromSpec:', start);
if (start === -1 || end === -1) { console.error('check_daisy_zedval: FAIL — extraction markers missing in view_pdf_audit_source.jsx'); process.exit(1); }
const { JSDOM } = require('jsdom');
const dom = new JSDOM('');
global.DOMParser = dom.window.DOMParser;
global.document = dom.window.document;
global.Node = dom.window.Node;
global.window = dom.window;
const fns = new Function(src.slice(start, end) + '; return { _htmlToDtbookXml, _htmlToDaisyNcx, _htmlToDaisySmil, _DAISY_OPF_XML };')();

const html = '<html lang="en"><head><title>Gate Sample</title></head><body>' +
  '<h1>Alpha</h1><p>First paragraph.</p>' +
  '<h2>Beta</h2><p>Second with <strong>bold</strong> and a <a href="https://example.org">link</a>.</p>' +
  '<ul><li>One</li><li>Two</li></ul>' +
  '<table><tr><th>H</th></tr><tr><td>c</td></tr></table>' +
  '</body></html>';
const uid = 'urn:uuid:00000000-0000-4000-8000-000000000001';
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-daisy-gate-'));
fs.writeFileSync(path.join(outDir, 'dtbook.xml'), fns._htmlToDtbookXml(html, 'en', uid));
fs.writeFileSync(path.join(outDir, 'navigation.ncx'), fns._htmlToDaisyNcx(html, 'Gate Sample', uid));
fs.writeFileSync(path.join(outDir, 'book.smil'), fns._htmlToDaisySmil(html, uid));
fs.writeFileSync(path.join(outDir, 'package.opf'), fns._DAISY_OPF_XML('Gate Sample', 'en', uid));

// ── run ZedVal ──
let report = '';
try {
  report = execFileSync('java', [
    '-Djavax.xml.xpath.XPathFactory:http://java.sun.com/jaxp/xpath/dom=com.sun.org.apache.xpath.internal.jaxp.XPathFactoryImpl',
    '-cp', path.join(zedvalHome, 'lib') + path.sep + '*',
    'org.daisy.zedval.ZedVal',
    path.join(outDir, 'package.opf'),
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 120000 });
} catch (e) {
  console.error('check_daisy_zedval: FAIL — ZedVal did not run: ' + (e.message || e).split('\n')[0]);
  process.exit(1);
}

const failures = (report.match(/<failureCount>(\d+)<\/failureCount>/) || [])[1];
const procErr = (report.match(/<procErrCount>(\d+)<\/procErrCount>/) || [])[1];
const fileCount = (report.match(/<fileCount>(\d+)<\/fileCount>/) || [])[1];
if (failures === undefined || procErr === undefined || fileCount !== '4') {
  console.error('check_daisy_zedval: FAIL — report incomplete (fileCount=' + fileCount + '); raw head:\n' + report.slice(0, 400));
  process.exit(1);
}
if (failures !== '0' || procErr !== '0') {
  const details = [...report.matchAll(/<detail>([^<]*)/g)].map((m) => '  - ' + m[1]);
  console.error('check_daisy_zedval: FAIL — ' + failures + ' failure(s), ' + procErr + ' processor error(s):\n' + [...new Set(details)].join('\n'));
  console.error('Full report: saved next to sample at ' + outDir);
  fs.writeFileSync(path.join(outDir, 'zedval-report.xml'), report);
  process.exit(1);
}
fs.rmSync(outDir, { recursive: true, force: true });
console.log('✓ check_daisy_zedval: DAISY package passes ZedVal 2.1 (Z39.86-2005) — 0 failures, 0 processor errors.');
