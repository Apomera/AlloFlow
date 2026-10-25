#!/usr/bin/env node
'use strict';
// Bounded first-party source scan. Excludes private credential/env files,
// vendored code, generated builds, git history, tests and arbitrary artifacts.
// Exit 1: critical match; exit 2: incomplete scan/setup error; exit 0: complete
// selected-source scan without critical matches. Never output credential values.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRS = ['src', 'stem_lab', 'sel_hub', 'catalog', 'services', 'desktop/web-app/functions'];
const SOURCE_EXTENSION = /\.(?:js|jsx|ts|tsx|cjs|mjs|py|gs)$/i;
const EXCLUDED_DIRS = new Set([
  'node_modules', 'vendor', 'vendors', 'assets', 'media', 'public', 'build', 'dist',
  'coverage', 'reports', 'artifacts', 'tmp', 'temp', 'scratch', '__pycache__',
  'test', 'tests', 'fixtures',
]);
// The largest current first-party sources (including ui_strings.js) exceed
// 10 MiB. Scan those fully; anything beyond this bound is an explicit failure.
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const PATTERNS = [
  { name: 'Google API key', regex: /AIza[0-9A-Za-z_-]{35}/g, severity: 'critical' },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
  { name: 'Stripe live key', regex: /(?:sk|pk)_live_[0-9a-zA-Z]{24,}/g, severity: 'critical' },
  { name: 'GitHub Personal Access Token', regex: /gh[pousr]_[0-9A-Za-z]{36,}/g, severity: 'critical' },
  { name: 'GitHub fine-grained Personal Access Token', regex: /github_pat_[0-9A-Za-z_]{20,}/g, severity: 'critical' },
  { name: 'Slack token', regex: /xox[bpoars]-[0-9A-Za-z-]{10,}/g, severity: 'critical' },
  { name: 'Private key block', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g, severity: 'critical' },
  {
    name: 'Possible secret assignment',
    regex: /\b(?:api_?key|secret|token|password|passwd|access[_-]?token|bearer)\b['"]?\s*[:=]\s*['"]([A-Za-z0-9+\/=_-]{32,})['"]/gi,
    severity: 'warning',
  },
];

function maskGeographyRows(source, file) {
  if (file !== 'stem_lab/stem_data_skyschool_geo.js') return source;
  const definition = /^[ \t]*var FLIGHT_ELEVATION_DATA = ([^\r\n]+);\r?$/m.exec(source);
  if (!definition) return source;
  const json = definition[1];
  let data;
  try { data = JSON.parse(json); } catch (_) { return source; }
  // This exact generated format stores Base64-encoded row deltas, not source
  // or credentials. Check the parsed grid shape before masking just its rows.
  if (data?.format !== 'skyschool-elevation-row-delta-v1' || !Array.isArray(data.grids)
      || !data.grids.length || !data.grids.every(grid => Number.isInteger(grid.width) && grid.width > 0
        && Number.isInteger(grid.height) && grid.height > 0 && Array.isArray(grid.rows)
        && grid.rows.length === grid.height
        && grid.rows.every(row => typeof row === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(row)))) return source;
  const arrays = [...json.matchAll(/"rows":(\[(?:"[A-Za-z0-9+/=]+"(?:,"[A-Za-z0-9+/=]+")*)\])/g)];
  if (arrays.length !== data.grids.length
      || arrays.some((match, index) => match[1] !== JSON.stringify(data.grids[index].rows))) return source;
  let cursor = 0;
  const pieces = [];
  for (const match of arrays) {
    const start = match.index + '"rows":'.length;
    pieces.push(json.slice(cursor, start), ' '.repeat(match[1].length));
    cursor = start + match[1].length;
  }
  pieces.push(json.slice(cursor));
  const start = definition.index + definition[0].indexOf('= ') + 2;
  return source.slice(0, start) + pieces.join('') + source.slice(start + json.length);
}

function scanText(source, file) {
  // Generated Test Prep packs contain compressed Base64 rather than source.
  // Retain this narrow masking and preserve offsets for accurate line numbers.
  const text = maskGeographyRows(source, file).replace(/TEST_PREP_DECODE_PACK\("[A-Za-z0-9+/=]+"\)/g,
    value => value.replace(/[^\r\n]/g, ' '));
  const findings = [];
  for (const pattern of PATTERNS) {
    for (const match of text.matchAll(new RegExp(pattern.regex.source, pattern.regex.flags))) {
      // Placeholder heuristics apply ONLY to informational assignments. Known
      // credential formats must never be suppressed by words inside the value.
      if (pattern.severity === 'warning'
          && /(?:YOUR_API_KEY|XXXXXXX|placeholder|test|example|sample|demo|fake|mock|todo|fix|change[_-]?me)/i.test(match[1])) continue;
      findings.push({ file, line: source.slice(0, match.index).split('\n').length,
        pattern: pattern.name, severity: pattern.severity });
    }
  }
  return findings;
}

function scanSources({ root = ROOT, fileSystem = fs, maxFileBytes = MAX_FILE_BYTES } = {}) {
  const files = new Set();
  const omissions = [];
  const relative = file => path.relative(root, file).replace(/\\/g, '/') || '.';
  const omit = (file, reason) => omissions.push({ file: relative(file), reason });
  const sourceFile = name => (SOURCE_EXTENSION.test(name) && !name.startsWith('_build_')
    && !/\.(?:test|spec)\.[^.]+$/i.test(name)) || name === 'AlloFlowANTI.txt';
  function visit(dir, recurse) {
    let entries;
    try {
      const stat = fileSystem.lstatSync(dir);
      if (!stat.isDirectory() || stat.isSymbolicLink()) { omit(dir, 'source directory is not a regular directory'); return; }
      entries = fileSystem.readdirSync(dir, { withFileTypes: true });
    }
    catch (_) { omit(dir, 'directory enumeration failed'); return; }
    for (const entry of entries) {
      // These directories and private dotfiles are deliberately outside scope.
      if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name.toLowerCase())) continue;
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) { omit(file, 'symbolic link is not scanned'); continue; }
      if (entry.isDirectory()) { if (recurse) visit(file, true); }
      else if (entry.isFile() && sourceFile(entry.name)) files.add(file);
      else if (sourceFile(entry.name)) omit(file, 'source is not a regular file');
    }
  }
  visit(root, false);
  for (const dir of SOURCE_DIRS) visit(path.join(root, dir), true);
  // The canonical host is mandatory, even if an enumeration race removes it.
  files.add(path.join(root, 'AlloFlowANTI.txt'));
  const findings = [];
  let scannedFiles = 0;
  for (const file of [...files].sort()) {
    try {
      const stat = fileSystem.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink()) { omit(file, 'source is not a regular file'); continue; }
      if (stat.size > maxFileBytes) { omit(file, 'source exceeds scan size limit'); continue; }
      const source = fileSystem.readFileSync(file, 'utf8');
      if (Buffer.byteLength(source, 'utf8') > maxFileBytes) { omit(file, 'source exceeds scan size limit'); continue; }
      findings.push(...scanText(source, relative(file)));
      scannedFiles++;
    } catch (_) { omit(file, 'source metadata/read failed'); }
  }
  const critical = findings.filter(finding => finding.severity === 'critical');
  const warnings = findings.filter(finding => finding.severity === 'warning');
  return { scannedFiles, findings, critical, warnings, omissions,
    exitCode: omissions.length ? 2 : critical.length ? 1 : 0 };
}

function report(result, { quiet = false, verbose = false, write = console.log } = {}) {
  if (!quiet || result.critical.length || result.omissions.length) {
    write('AlloFlow secret scan: ' + result.scannedFiles + ' first-party source files scanned.');
  }
  for (const finding of result.critical) write('CRITICAL [' + finding.pattern + '] ' + finding.file + ':' + finding.line + ' [value redacted]');
  if (result.warnings.length && (verbose || !result.critical.length)) {
    for (const finding of result.warnings.slice(0, verbose ? undefined : 20)) {
      write('WARNING [' + finding.pattern + '] ' + finding.file + ':' + finding.line + ' [value redacted]');
    }
    if (!verbose && result.warnings.length > 20) write('Additional warnings omitted; use --verbose.');
  }
  for (const omission of result.omissions) write('INCOMPLETE ' + omission.file + ': ' + omission.reason);
  write(result.critical.length + ' critical / ' + result.warnings.length + ' warnings / ' + result.omissions.length + ' incomplete.');
}

module.exports = { scanText, scanSources, report, SOURCE_DIRS };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--quiet', '--verbose'].includes(arg))) {
    console.error('Usage: node dev-tools/check_secrets.cjs [--quiet] [--verbose]');
    process.exitCode = 2;
  } else {
    const result = scanSources();
    report(result, { quiet: args.includes('--quiet'), verbose: args.includes('--verbose') });
    process.exitCode = result.exitCode;
  }
}
