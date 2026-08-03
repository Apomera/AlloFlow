#!/usr/bin/env node
'use strict';

/**
 * Structural benchmark for the no-account portable remediation workflow.
 * It drives the canonical packaged engine; it does not implement remediation.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ENGINE = path.join(ROOT, 'agent_skills', 'alloflow-portable-remediation', 'scripts', 'alloflow_portable.py');
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function fail(message) {
  throw new Error(message);
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function pdfEscape(value) {
  return String(value).replace(/([\\()])/g, '\\$1').replace(/[\r\n]+/g, ' ');
}

function createTextPdf(filePath, text) {
  const stream = text ? 'BT /F1 12 Tf 72 720 Td (' + pdfEscape(text) + ') Tj ET' : '';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + Buffer.byteLength(stream, 'latin1') + ' >>\nstream\n' + stream + '\nendstream',
  ];
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += String(index + 1) + ' 0 obj\n' + objects[index] + '\nendobj\n';
  }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n0 ' + String(objects.length + 1) + '\n0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += String(offsets[index]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += 'trailer\n<< /Size ' + String(objects.length + 1) + ' /Root 1 0 R >>\n';
  pdf += 'startxref\n' + String(xref) + '\n%%EOF\n';
  fs.writeFileSync(filePath, Buffer.from(pdf, 'latin1'));
}

function planText(blocks) {
  const values = [];
  for (const block of blocks) {
    if (['heading', 'paragraph', 'blockquote', 'link'].includes(block.type)) values.push(block.text || '');
    else if (block.type === 'list') values.push(...block.items);
    else if (block.type === 'table') values.push(block.caption, ...block.columns, ...block.rows.flat());
    else if (block.type === 'image') values.push(block.alt || '', block.caption || '');
  }
  return values.filter(Boolean).join(' ');
}

function makePlan(source, title, documentType, blocks, reviewNotes) {
  return {
    schema_version: '1.0',
    document: {
      title,
      language: 'en',
      source_page_count: 1,
      source_sha256: sha256(source),
      document_type: documentType,
    },
    source_pages: [{ page: 1, text: planText(blocks) }],
    blocks,
    review_notes: reviewNotes,
  };
}

function parseJson(text) {
  try { return JSON.parse(text); } catch (_) { return null; }
}

function invoke(args) {
  const env = { ...process.env };
  for (const name of [
    'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY',
    'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID',
  ]) delete env[name];
  const result = spawnSync(PYTHON, [ENGINE, ...args], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    timeout: 120000,
  });
  return { status: result.status, stderr: result.stderr, json: parseJson(result.stdout) };
}

function ensureEmptyDirectory(directory) {
  if (fs.existsSync(directory) && fs.readdirSync(directory).length) {
    fail('Benchmark output directory must be empty: ' + directory);
  }
  fs.mkdirSync(directory, { recursive: true });
}

function acceptedCase(root, definition) {
  const caseRoot = path.join(root, definition.id);
  const output = path.join(caseRoot, 'output');
  fs.mkdirSync(caseRoot, { recursive: true });
  let source;
  let plan;

  if (definition.existingSource) {
    source = definition.existingSource;
    plan = definition.existingPlan;
  } else {
    source = path.join(caseRoot, definition.id + '.pdf');
    createTextPdf(source, definition.pdfText);
    if (definition.image) fs.writeFileSync(path.join(caseRoot, 'plant.png'), PNG_1X1);
    plan = path.join(caseRoot, 'repair-plan.json');
    fs.writeFileSync(
      plan,
      JSON.stringify(makePlan(
        source,
        definition.title,
        definition.documentType || 'handout',
        definition.blocks,
        definition.reviewNotes || [],
      ), null, 2),
      'utf8',
    );
  }

  const result = invoke([
    'remediate', '--source', source, '--plan', plan, '--out-dir', output,
    '--pdf', 'never', '--verapdf', 'never',
  ]);
  if (result.status !== 0 || !result.json || result.json.ok !== true) {
    return {
      id: definition.id,
      passed: false,
      expected: 'accepted',
      exitCode: result.status,
      error: (result.json && result.json.error) || String(result.stderr || 'No structured result').slice(0, 300),
    };
  }

  const stem = path.basename(source, '.pdf');
  const html = fs.readFileSync(path.join(output, stem + '-accessible.html'), 'utf8');
  const report = JSON.parse(fs.readFileSync(path.join(output, stem + '-accessibility-report.json'), 'utf8'));
  const missing = (definition.htmlIncludes || []).filter((value) => !html.includes(value));
  const audit = report.checks && report.checks.staticHtmlAudit;
  const metrics = report.checks && report.checks.repairPlan && report.checks.repairPlan.metrics;
  const recall = metrics ? metrics.plan_internal_token_recall : null;
  const passed = missing.length === 0 && audit && audit.ok === true && recall !== null && recall >= 0.95;

  return {
    id: definition.id,
    passed,
    expected: 'accepted',
    verdict: result.json.verdict,
    staticHtmlAuditPassed: !!(audit && audit.ok),
    planInternalTokenRecall: recall,
    humanReviewRequired: result.json.humanReviewRequired === true,
    missingExpectedHtml: missing,
    artifacts: [
      stem + '-accessible.html',
      stem + '-accessibility-report.json',
      stem + '-privacy-receipt.json',
    ],
  };
}

function blockedFormCase(root) {
  const id = 'interactive-form-blocked';
  const caseRoot = path.join(root, id);
  fs.mkdirSync(caseRoot, { recursive: true });
  const source = path.join(caseRoot, id + '.pdf');
  createTextPdf(source, 'Student response form Name Date Answer');
  const blocks = [
    { type: 'heading', level: 1, text: 'Student response form', source_page: 1 },
    { type: 'paragraph', text: 'Name Date Answer', source_page: 1 },
  ];
  const plan = path.join(caseRoot, 'repair-plan.json');
  fs.writeFileSync(
    plan,
    JSON.stringify(makePlan(source, 'Student response form', 'form', blocks, [
      'Interactive field behavior requires the responsible document owner.',
    ]), null, 2),
    'utf8',
  );
  const output = path.join(caseRoot, 'output');
  const result = invoke([
    'remediate', '--source', source, '--plan', plan, '--out-dir', output,
    '--pdf', 'never', '--verapdf', 'never',
  ]);
  const message = result.json && result.json.error ? result.json.error : '';
  return {
    id,
    passed: result.status === 3 && /blocked for forms/i.test(message) && !fs.existsSync(output),
    expected: 'blocked',
    exitCode: result.status,
    reasonMatched: /blocked for forms/i.test(message),
    partialArtifactsPublished: fs.existsSync(output),
  };
}

function definitions(root) {
  return [
    {
      id: 'multi-column-reading-order',
      existingSource: path.join(root, 'test-assets', 'multi-column-scrambled.pdf'),
      existingPlan: path.join(root, 'tests', 'fixtures', 'alloflow-portable-plan.json'),
      htmlIncludes: ['<ol data-source-page="1">', 'Evaporation:', 'Human impact:'],
    },
    {
      id: 'complex-table',
      title: 'Course support schedule',
      pdfText: 'Course support schedule Day Service Location Monday Tutoring Library Tuesday Captioning Room 204',
      blocks: [
        { type: 'heading', level: 1, text: 'Course support schedule', source_page: 1 },
        {
          type: 'table',
          caption: 'Weekly support services',
          columns: ['Day', 'Service', 'Location'],
          rows: [['Monday', 'Tutoring', 'Library'], ['Tuesday', 'Captioning', 'Room 204']],
          row_headers: true,
          source_page: 1,
        },
      ],
      htmlIncludes: ['<caption>Weekly support services</caption>', '<th scope="row">Monday</th>', '<th scope="col">Service</th>'],
    },
    {
      id: 'meaningful-image',
      title: 'Plant growth diagram',
      pdfText: 'Plant growth diagram Seed Sprout Sunlight',
      image: true,
      blocks: [
        { type: 'heading', level: 1, text: 'Plant growth diagram', source_page: 1 },
        { type: 'paragraph', text: 'A seed becomes a sprout with sunlight.', source_page: 1 },
        {
          type: 'image',
          alt: 'Three stages show a seed, a sprout, and a leafy plant under sunlight.',
          decorative: false,
          path: 'plant.png',
          caption: 'Growth from seed to plant',
          source_page: 1,
        },
      ],
      // Captions are <p class="alloflow-figure-caption"> associated by
      // aria-describedby, NOT <figure>/<figcaption>: Chromium's tagged-PDF
      // export turns a <figure> element into a second /Figure structure
      // element that carries no /Alt, which fails PDF/UA-1 clause 7.3-1.
      htmlIncludes: [
        'alt="Three stages show a seed, a sprout, and a leafy plant under sunlight."',
        'class="alloflow-figure-caption"',
        'Growth from seed to plant',
        'aria-describedby=',
        'data:image/png;base64,',
      ],
      htmlExcludes: ['<figure', '<figcaption'],
    },
    {
      id: 'scanned-page-review',
      title: 'Scanned worksheet reconstruction',
      pdfText: '',
      blocks: [
        { type: 'heading', level: 1, text: 'Scanned worksheet reconstruction', source_page: 1 },
        { type: 'paragraph', text: 'The legible prompt asks students to compare evaporation and condensation.', source_page: 1 },
      ],
      reviewNotes: [
        'The source is a simulated image-only page; OCR wording and reading order require human comparison.',
      ],
      htmlIncludes: ['compare evaporation and condensation', 'data-source-page="1"'],
    },
  ];
}

function runBenchmark(outputDirectory) {
  const preserve = !!outputDirectory;
  const root = outputDirectory
    ? path.resolve(outputDirectory)
    : fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-portable-benchmark-'));
  ensureEmptyDirectory(root);
  try {
    const cases = definitions(ROOT).map((definition) => acceptedCase(root, definition));
    cases.push(blockedFormCase(root));
    const passed = cases.filter((item) => item.passed).length;
    const report = {
      schemaVersion: '1.0',
      benchmark: 'alloflow-portable-structural',
      networkPolicy: 'deny',
      alloflowServiceUsed: false,
      modelApiKeyRequired: false,
      cases,
      summary: {
        total: cases.length,
        passed,
        failed: cases.length - passed,
        acceptedCases: cases.filter((item) => item.expected === 'accepted').length,
        safetyBlocks: cases.filter((item) => item.expected === 'blocked' && item.passed).length,
      },
      evidenceScope: [
        'Runs the canonical portable remediation engine; it does not reimplement remediation.',
        'Checks plan validation, semantic HTML structure, static audit, plan-internal token recall, privacy-scoped output, and blocked-form behavior.',
      ],
      limitations: [
        'Host AI document reading and vision are not exercised by this deterministic runner.',
        'Plan-internal token recall compares host-supplied source_pages with host-supplied blocks; it is not independent source-PDF fidelity proof.',
        'Human comparison remains required for wording, reading order, tables, images, equations, and scanned pages.',
        'Tagged-PDF generation and veraPDF are covered by the portable core suite rather than repeated here.',
        'The corpus uses one repository PDF fixture plus generated privacy-safe structural cases; add reviewed, licensed real-world documents before publishing quality claims.',
      ],
    };
    if (preserve) {
      fs.writeFileSync(path.join(root, 'portable-benchmark-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
    }
    return report;
  } finally {
    if (!preserve) fs.rmSync(root, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  const outputIndex = argv.indexOf('--out-dir');
  return {
    outDir: outputIndex >= 0 ? argv[outputIndex + 1] : null,
  };
}

if (require.main === module) {
  try {
    const args = parseArguments(process.argv.slice(2));
    if (process.argv.includes('--out-dir') && !args.outDir) fail('--out-dir requires a path');
    const report = runBenchmark(args.outDir);
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (report.summary.failed) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(String(error && error.stack || error) + '\n');
    process.exitCode = 1;
  }
}

module.exports = { runBenchmark };