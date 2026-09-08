#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { materializeFixture } = require('./remediation_benchmark_corpus.cjs');
const ROOT = path.resolve(__dirname, '..');
const run = promisify(execFile);
async function renderPdf(html, pdf) {
  return run(process.execPath, [path.join(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs'), '--html', html, '--pdf', pdf], { cwd: ROOT, windowsHide: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
}
function expectations(plan) {
  const headings = plan.blocks.filter(b => b.type === 'heading').map(b => ({ level: b.level, name: b.text }));
  if (plan.review_notes?.length) headings.push({ level: 2, name: 'Remediation notes' });
  return { title: plan.document.title, language: plan.document.language, headings,
    readingOrder: plan.blocks.flatMap(b => b.type === 'table' ? [b.caption, ...b.columns, ...b.rows.flat()] : b.type === 'list' ? b.items : b.text ? [b.text] : []),
    tables: plan.blocks.filter(b => b.type === 'table').map(b => ({ caption: b.caption, headers: b.columns, rows: b.rows, rowHeaders: b.row_headers === true })),
    links: [{ name: 'Skip to main content', href: '#main-content' }],
    keyboard: [{ role: 'link', name: 'Skip to main content' }] };
}
async function buildFixtureSuite(output) {
  output = path.resolve(output);
  if (fs.existsSync(output)) throw Error('Fixture output already exists; choose a new directory.');
  fs.mkdirSync(output, { recursive: true });
  const artifacts = [];
  for (const [fixtureId, corpusId, documentKind] of [
    ['multi-column-reading-order', 'education-reading', 'reading'],
    ['complex-table', 'education-table', 'table'],
  ]) {
    const fixture = materializeFixture(fixtureId, path.join(output, fixtureId, 'source'));
    const plan = JSON.parse(fs.readFileSync(fixture.planPath, 'utf8'));
    const exported = path.join(output, fixtureId, 'export');
    const result = await run(process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), [
      path.join(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py'), 'remediate',
      '--source', fixture.sourcePath, '--plan', fixture.planPath, '--out-dir', exported, '--pdf', 'required', '--verapdf', 'never',
    ], { cwd: ROOT, windowsHide: true, timeout: 150000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }).catch(error => { throw Error(error.stdout || error.stderr || error.message); });
    fs.writeFileSync(path.join(output, fixtureId, 'export-process.json'), result.stdout);
    const files = fs.readdirSync(exported);
    for (const [kind, file] of [['html', files.find(name => name.endsWith('-accessible.html'))], ['pdf', files.find(name => name.endsWith('.pdf'))]]) {
      if (!file) throw Error('Portable export missing ' + kind + ' for ' + fixtureId);
      artifacts.push({ id: corpusId + '-' + kind, documentKind, kind, path: path.relative(output, path.join(exported, file)),
        provenance: { fixtureId, sourcePath: fixture.sourcePath, planPath: fixture.planPath, exportPath: 'portable remediate with required tagged PDF; independent validator intentionally not rerun' },
        expected: expectations(plan) });
    }
  }
  const form = path.join(output, 'education-form.html');
  fs.copyFileSync(path.join(ROOT, 'tests/fixtures/document-at/worksheet-controls.html'), form);
  artifacts.push({ id: 'education-form-html', documentKind: 'form', kind: 'html', path: path.basename(form),
    provenance: { fixtureId: 'worksheet-native-controls', exportPath: 'hand-authored HTML acceptance fixture; not a portable PDF rebuild' },
    expected: {
      title: 'Water-cycle check-in', language: 'en',
      headings: [{ level: 1, name: 'Water-cycle check-in' }, { level: 2, name: 'Your response' }, { level: 2, name: 'Reference' }],
      readingOrder: ['Water-cycle check-in', 'Your response', 'Name', 'Observation', 'Reference', 'Clouds form when water vapor cools.'],
      tables: [], links: [{ name: 'Skip to worksheet', href: '#worksheet' }, { name: 'Water-cycle reference', href: '#reference' }],
      keyboard: [
        { role: 'link', name: 'Skip to worksheet', press: 'Enter', hash: '#worksheet', focusId: 'worksheet' },
        { role: 'textbox', name: 'Name', type: 'Ada', value: 'Ada' },
        { role: 'combobox', name: 'Observation', press: 'ArrowDown', value: 'clouds' },
        { role: 'checkbox', name: 'I recorded my observation', press: 'Space', checked: true },
        { role: 'button', name: 'Clear response', press: 'Enter' },
        { role: 'link', name: 'Water-cycle reference', press: 'Enter', hash: '#reference', focusId: 'reference' },
      ],
      finalControls: [{ role: 'textbox', name: 'Name', value: '' }, { role: 'combobox', name: 'Observation', value: '' }, { role: 'checkbox', name: 'I recorded my observation', checked: false }],
    } });
  const manifest = path.join(output, 'acceptance-manifest.json');
  fs.writeFileSync(manifest, JSON.stringify({ schema: 1, fixtureScope: 'Synthetic education reading/table sources and native HTML form; not real learner AT results.', artifacts }, null, 2) + '\n');
  return manifest;
}
if (require.main === module) buildFixtureSuite(process.argv[2] || '').then(file => console.log(file)).catch(error => { console.error(error.stderr || error.message); process.exitCode = 1; });
module.exports = { buildFixtureSuite, renderPdf };
