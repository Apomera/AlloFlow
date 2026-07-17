#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  inspectPdModule,
  inspectPdCatalog,
  formatPdPublishReport,
  MANUAL_REVIEW,
} = require('./lib/pd_publish_pipeline.cjs');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_ROOT = path.join(ROOT, 'reports', 'pd');
const OUTPUT_CONTROL_RE = /[\u0000-\u001F\u007F]/;

function usage() {
  return [
    'AlloFlow PD prepublish checker',
    '',
    'Usage:',
    '  node dev-tools/check_pd_publish.cjs --catalog [--json] [--out reports/pd/NAME.json] [--quiet]',
    '  node dev-tools/check_pd_publish.cjs --module FILE [--json] [--out reports/pd/NAME.json] [--quiet]',
    '',
    'The command never edits a module or catalog. --out creates one new content-free JSON report',
    'strictly below reports/pd; existing files and linked/reparse paths are rejected.',
    'Exit codes: 0 automated gates passed, 1 blocking findings, 2 usage/setup/report error.',
  ].join('\n') + '\n';
}

function parseArgs(argv) {
  const options = { catalog: false, module: null, json: false, out: null, quiet: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--catalog') options.catalog = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--quiet') options.quiet = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--module') {
      if (!argv[index + 1]) throw new Error('--module requires a file path.');
      options.module = argv[++index];
    } else if (arg.startsWith('--module=')) options.module = arg.slice('--module='.length);
    else if (arg === '--out') {
      if (!argv[index + 1]) throw new Error('--out requires a file path.');
      options.out = argv[++index];
    } else if (arg.startsWith('--out=')) options.out = arg.slice('--out='.length);
    else throw new Error('Unknown argument.');
  }
  if (options.catalog && options.module) throw new Error('Choose either --catalog or --module, not both.');
  if (!options.catalog && !options.module) options.catalog = true;
  return options;
}

function pathInside(base, target, allowEqual = false) {
  const relative = path.relative(path.resolve(base), path.resolve(target));
  if (relative === '') return allowEqual;
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

function realpathNative(filePath) {
  const implementation = fs.realpathSync.native || fs.realpathSync;
  return implementation(filePath);
}

function lstatOrNull(filePath) {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function assertRegularDirectory(filePath) {
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error('--out path contains a linked, reparse, or non-directory component.');
  }
}

function ensureRegularDirectoryChain(root, directory) {
  const rootAbsolute = path.resolve(root);
  const directoryAbsolute = path.resolve(directory);
  if (!pathInside(rootAbsolute, directoryAbsolute, true)) {
    throw new Error('--out directory is outside the workspace.');
  }
  assertRegularDirectory(rootAbsolute);
  const relative = path.relative(rootAbsolute, directoryAbsolute);
  let current = rootAbsolute;
  for (const segment of (relative ? relative.split(path.sep) : [])) {
    current = path.join(current, segment);
    const existing = lstatOrNull(current);
    if (!existing) {
      try {
        fs.mkdirSync(current, { mode: 0o700 });
      } catch (error) {
        if (!error || error.code !== 'EEXIST') throw error;
      }
    }
    assertRegularDirectory(current);
  }
}

function prepareOutputPath(output) {
  const raw = String(output || '');
  if (!raw || OUTPUT_CONTROL_RE.test(raw)) {
    throw new Error('--out must be a control-free JSON path below reports/pd.');
  }
  if (raw.split(/[\\/]+/).some((segment) => segment === '..')) {
    throw new Error('--out cannot contain parent traversal.');
  }

  const absolute = path.resolve(ROOT, raw);
  if (!pathInside(REPORTS_ROOT, absolute, false) || path.extname(absolute).toLowerCase() !== '.json') {
    throw new Error('--out must be a JSON file strictly below reports/pd.');
  }

  const parent = path.dirname(absolute);
  ensureRegularDirectoryChain(ROOT, parent);
  const reportsReal = realpathNative(REPORTS_ROOT);
  const parentReal = realpathNative(parent);
  const rootReal = realpathNative(ROOT);
  if (!pathInside(rootReal, reportsReal, false) || !pathInside(reportsReal, parentReal, true)) {
    throw new Error('--out real path must remain below reports/pd.');
  }

  if (lstatOrNull(absolute)) {
    throw new Error('--out refuses to overwrite an existing filesystem entry.');
  }
  return absolute;
}

function writeReportExclusive(output, jsonText) {
  const outputFile = prepareOutputPath(output);
  fs.writeFileSync(outputFile, jsonText, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write('PD prepublish setup error: ' + error.message + '\n\n' + usage());
    return 2;
  }

  if (options.help) {
    process.stdout.write(usage());
    return 0;
  }

  let report;
  try {
    if (options.module) {
      const moduleFile = path.resolve(ROOT, options.module);
      const moduleReport = inspectPdModule({
        root: ROOT,
        filePath: moduleFile,
        moduleText: fs.readFileSync(moduleFile),
      });
      report = {
        schema_version: 'pd-publish-report-1.0',
        kind: 'pd_publish_report',
        targetStandard: 'WCAG 2.2 AA',
        conformanceClaim: false,
        scope: 'module',
        summary: {
          modules: 1,
          checks: moduleReport.checks.length,
          passed: moduleReport.checks.filter((item) => item.status === 'pass').length,
          blockingFailures: moduleReport.checks.filter((item) => item.status === 'fail').length,
          warnings: moduleReport.checks.filter((item) => item.status === 'warning').length,
          manualReviewRequired: true,
          readinessStatus: moduleReport.readinessStatus,
          releaseStatus: moduleReport.releaseStatus,
        },
        catalog: null,
        runtime: null,
        modules: [moduleReport],
        manualReview: MANUAL_REVIEW.map((item) => ({ ...item })),
      };
    } else {
      report = inspectPdCatalog({ root: ROOT });
    }
  } catch (error) {
    process.stderr.write('PD prepublish setup error: ' + error.message + '\n');
    return 2;
  }

  const jsonText = JSON.stringify(report, null, 2) + '\n';
  if (options.out) {
    try {
      writeReportExclusive(options.out, jsonText);
    } catch (error) {
      process.stderr.write('PD prepublish report error: ' + error.message + '\n');
      return 2;
    }
  }

  const blocked = report.summary.blockingFailures > 0;
  if (!options.quiet) process.stdout.write(options.json ? jsonText : formatPdPublishReport(report));
  else if (blocked) process.stderr.write(formatPdPublishReport(report));
  return blocked ? 1 : 0;
}

process.exitCode = main();
