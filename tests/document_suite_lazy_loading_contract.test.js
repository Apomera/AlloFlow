import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const read = file => readFileSync(resolve(ROOT, file), 'utf8');

const SHELLS = [
  // Since the mirror unification, all three shells are byte-identical copies of
  // the root ANTI and load pinned CDN assets (build-desktop-web rewrites for
  // the desktop bundle at build time).
  { file: 'AlloFlowANTI.txt', assetPrefix: 'https://alloflow-cdn.pages.dev/' },
  { file: 'desktop/web-app/src/AlloFlowANTI.txt', assetPrefix: 'https://alloflow-cdn.pages.dev/' },
  { file: 'desktop/web-app/src/App.jsx', assetPrefix: 'https://alloflow-cdn.pages.dev/' },
];

const TARGETS = [
  {
    moduleKey: 'DocPipelineModule',
    fileName: 'doc_pipeline_module.js',
    globalHint: 'DocPipeline',
  },
  {
    moduleKey: 'PdfAuditView',
    fileName: 'view_pdf_audit_module.js',
    globalHint: 'PdfAudit',
    // The on-demand consumer moved into the (itself lazily-loaded) Export
    // Preview module in the 2026-08 modularization.
    consumerFiles: ['view_export_preview_source.jsx'],
  },
  {
    moduleKey: 'ExportPreviewView',
    fileName: 'view_export_preview_module.js',
    globalHint: 'ExportPreview',
  },
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The shell is a large JSX/HTML hybrid, so parsing the whole file as one JS
// program is deliberately avoided. This scanner only finds the end of a
// window-global assignment while respecting strings, comments, and nesting.
function assignmentEnd(source, expressionStart) {
  const stack = [];
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = expressionStart; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n' || char === '\r') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      stack.push(char);
      continue;
    }
    if (char === ')' || char === ']' || char === '}') {
      stack.pop();
      continue;
    }
    if (char === ';' && stack.length === 0) return index + 1;
  }
  return source.length;
}

function windowGlobalAssignments(source) {
  const assignments = [];
  const pattern = /window\s*(?:\.\s*(__allo[A-Za-z0-9_$]+)|\[\s*(['"])(__allo[A-Za-z0-9_$]+)\2\s*\])\s*=/g;
  for (const match of source.matchAll(pattern)) {
    const name = match[1] || match[3];
    const start = match.index;
    const expressionStart = start + match[0].length;
    const end = assignmentEnd(source, expressionStart);
    assignments.push({ name, start, end, text: source.slice(start, end) });
  }
  return assignments;
}

function expandReferencedGlobals(seed, assignments) {
  const byName = new Map(assignments.map(assignment => [assignment.name, assignment]));
  const seen = new Set();
  const queue = [seed];
  let expanded = '';

  while (queue.length) {
    const assignment = queue.shift();
    if (!assignment || seen.has(assignment.name)) continue;
    seen.add(assignment.name);
    expanded += `\n${assignment.text}`;
    for (const match of assignment.text.matchAll(/\b(__allo[A-Za-z0-9_$]+)\b/g)) {
      if (!seen.has(match[1]) && byName.has(match[1])) queue.push(byName.get(match[1]));
    }
  }
  return expanded;
}

function findTargetContract(source, shell, target) {
  const assignments = windowGlobalAssignments(source);
  const key = escapeRegExp(target.moduleKey);
  const file = escapeRegExp(target.fileName);
  const prefix = escapeRegExp(shell.assetPrefix);
  const targetCall = new RegExp(`\\bloadModule\\s*\\(\\s*(['"])${key}\\1\\s*,`, 'g');
  const calls = [...source.matchAll(targetCall)];

  expect(calls, `${shell.file}: ${target.moduleKey} must have exactly one literal loadModule call`).toHaveLength(1);

  const literalCall = new RegExp(
    `\\bloadModule\\s*\\(\\s*(['"])${key}\\1\\s*,\\s*(['"])${prefix}${file}(?:\\?v=[^'"]+)?\\2\\s*\\)`,
  );
  expect(source, `${shell.file}: ${target.moduleKey} must keep a cache-bustable literal asset URL`).toMatch(literalCall);

  const callIndex = calls[0].index;
  const lazyMatches = assignments.filter(assignment => (
    /^__alloLazy/.test(assignment.name)
    && assignment.start <= callIndex
    && assignment.end > callIndex
  ));
  expect(lazyMatches, `${shell.file}: ${target.moduleKey} loadModule call must be inside one lazy global`).toHaveLength(1);
  const lazy = lazyMatches[0];
  expect(lazy.name, `${shell.file}: lazy global should identify ${target.globalHint}`).toMatch(new RegExp(target.globalHint, 'i'));

  const ensureMatches = assignments.filter(assignment => (
    /^__alloEnsure/.test(assignment.name)
    && new RegExp(target.globalHint, 'i').test(assignment.name)
  ));
  expect(ensureMatches, `${shell.file}: ${target.moduleKey} needs one public ensure global`).toHaveLength(1);
  const ensure = ensureMatches[0];
  const expandedEnsure = expandReferencedGlobals(ensure, assignments);

  expect(expandedEnsure, `${shell.file}: ${ensure.name} must start its matching lazy loader`).toContain(lazy.name);
  expect(expandedEnsure, `${shell.file}: ${ensure.name} must target the correct registry entry`).toContain(target.moduleKey);
  expect(expandedEnsure, `${shell.file}: ${ensure.name} must retry a failed registry entry`).toMatch(/\b__alloRetryModule\b/);
  expect(expandedEnsure, `${shell.file}: ${ensure.name} must expose awaited readiness`).toMatch(/\bPromise\b|\basync\b/);
  expect(expandedEnsure, `${shell.file}: ${ensure.name} must settle from registry readiness, not a fire-and-forget call`).toMatch(
    /alloflow:module-registry-changed|__alloModuleSnapshot|\bset(?:Timeout|Interval)\s*\(/,
  );
  expect(expandedEnsure, `${shell.file}: ${ensure.name} must recognize already-loaded modules`).toMatch(/\bAlloModules\b/);

  const withoutEnsureDefinition = source.slice(0, ensure.start) + source.slice(ensure.end);
  const consumerPool = withoutEnsureDefinition + (target.consumerFiles || [])
    .map(file => readFileSync(resolve(process.cwd(), file), 'utf8')).join('\n');
  // Since the 2026-08 refactor a consumer may also route through the generic
  // __alloEnsureLazyModule('<ModuleKey>', ...) ensure instead of the named one.
  const consumerPattern = new RegExp(
    `\\b${escapeRegExp(ensure.name)}\\b|__alloEnsureLazyModule\\(\\s*(['"])${escapeRegExp(target.moduleKey)}\\1|\\b${escapeRegExp(lazy.name)}\\s*\\(`,
  );
  expect(consumerPool, `${shell.file}: ${ensure.name} must be wired to an on-demand consumer`).toMatch(consumerPattern);

  return { lazy, ensure };
}

function coreBootList(source) {
  return source.match(/\bCORE_BOOT_MODULES\s*=\s*\[([\s\S]*?)\]/)?.[1] || '';
}

function exportGateSlice(source) {
  const end = source.indexOf('<CDNModuleGate moduleKey="StemLab"');
  expect(end, 'Export gate must remain before the STEAM Lab gate').toBeGreaterThan(0);
  const render = source.lastIndexOf('ExportPreviewView', end);
  expect(render, 'ExportPreviewView render seam must exist').toBeGreaterThan(0);
  const condition = source.lastIndexOf('showExportPreview', render);
  expect(condition, 'Export preview open condition must exist').toBeGreaterThan(0);
  return source.slice(Math.max(0, condition - 2500), end);
}

describe('document-suite heavy modules are safely demand-loaded', () => {
  it('keeps DocPipeline, PDF Audit, and Export Preview out of unconditional boot in every shell', () => {
    for (const shell of SHELLS) {
      const source = read(shell.file);
      const core = coreBootList(source);
      for (const target of TARGETS) {
        findTargetContract(source, shell, target);
        expect(core, `${shell.file}: ${target.moduleKey} must not be first-paint critical`).not.toContain(target.moduleKey);
      }
    }
  });

  it('keeps the Export Preview open state recoverable while its module loads or fails', () => {
    for (const shell of SHELLS) {
      const gate = exportGateSlice(read(shell.file));
      expect(gate, `${shell.file}: gate must retain the user's open intent`).toMatch(/showExportPreview\s*&&/);
      expect(gate, `${shell.file}: gate must render the loaded module`).toContain('ExportPreviewView');
      expect(gate, `${shell.file}: gate must distinguish a failed load`).toMatch(
        /moduleLoadInfo[\s\S]{0,240}ExportPreviewView|exportPreview[A-Za-z0-9_$]*Failed|failed[A-Za-z0-9_$]*ExportPreview/i,
      );
      expect(gate, `${shell.file}: gate must show a loading state`).toMatch(/\b(?:loading|preparing)\b/i);
      expect(gate, `${shell.file}: gate must explain a failed load`).toMatch(/could(?: not|n't) load|failed|unavailable|problem loading/i);
      expect(gate, `${shell.file}: gate must offer a targeted retry`).toMatch(/\bRetry\b/i);
      expect(gate, `${shell.file}: retry must call an Export Preview retry/ensure path`).toMatch(
        /__alloEnsure[A-Za-z0-9_$]*ExportPreview|(?:retry|ensure)[A-Za-z0-9_$]*ExportPreview/i,
      );
      expect(gate, `${shell.file}: the fallback must expose a visible close/back action`).toMatch(/\b(?:Close|Back)\b/);
      expect(gate, `${shell.file}: a failed load must still be closable`).toMatch(
        /setShowExportPreview(?:Wrapped)?\s*\(\s*false\s*\)/,
      );
    }
  });

  it('awaits PDF-audit registration before a visible Office export resolves its API', () => {
    const source = read('view_export_preview_source.jsx');
    const officeControlsAreVisible = /runOfficeExport\s*\(\s*['"](?:docx|pptx)['"]\s*\)/i.test(source);
    if (!officeControlsAreVisible) return;

    const start = source.indexOf('const runOfficeExport');
    expect(start, 'visible Office controls require a runOfficeExport callback').toBeGreaterThan(0);
    const expressionStart = source.indexOf('=', start) + 1;
    const end = assignmentEnd(source, expressionStart);
    const callback = source.slice(start, end);

    const root = read(SHELLS[0].file);
    const pdfContract = findTargetContract(root, SHELLS[0], TARGETS[1]);
    const ensureName = pdfContract.ensure.name;
    const ensureIndex = callback.indexOf(ensureName);
    // The callback may fast-path an already-registered API before the ensure;
    // the invariant is that after awaiting readiness it RE-resolves the API.
    const apiAfterEnsure = callback.indexOf('AccessibleOfficeExport', ensureIndex);

    expect(ensureIndex, 'Office export must invoke the PDF-audit ensure global').toBeGreaterThan(0);
    expect(apiAfterEnsure, 'Office export must re-resolve AccessibleOfficeExport after readiness').toBeGreaterThan(ensureIndex);
    expect(callback.slice(Math.max(0, ensureIndex - 300), ensureIndex + ensureName.length + 300), 'Office export must await readiness').toMatch(/\bawait\b/);
  });
});
