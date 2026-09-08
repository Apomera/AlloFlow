#!/usr/bin/env node
'use strict';
// Post-export observations, not screen-reader or user acceptance testing.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const normalize = value => String(value || '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function ordered(text, anchors) {
  let cursor = 0;
  for (const anchor of anchors) {
    const index = normalize(text).indexOf(normalize(anchor), cursor);
    if (index < 0) return false;
    cursor = index + normalize(anchor).length;
  }
  return true;
}
function recorder() {
  const checks = [];
  return { checks, add(id, ok, observed, expected) {
    checks.push({ id, status: ok ? 'passed' : 'failed', observed, ...(expected === undefined ? {} : { expected }) });
  } };
}
async function inspectHtml(browser, file, expected) {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block', viewport: { width: 1100, height: 800 } });
  let blockedNetworkRequests = 0;
  await context.route('**/*', route => { blockedNetworkRequests++; return route.abort('blockedbyclient'); });
  const page = await context.newPage();
  page.setDefaultTimeout(2500);
  const r = recorder();
  try {
    await page.setContent(fs.readFileSync(file, 'utf8'));
    const facts = await page.evaluate(() => ({
      title: document.title, language: document.documentElement.lang,
      text: document.body.innerText,
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e => ({ level: Number(e.tagName[1]), name: e.textContent.trim() })),
      positiveTabIndex: [...document.querySelectorAll('[tabindex]')].filter(e => e.tabIndex > 0).length,
      tables: [...document.querySelectorAll('table')].map(table => ({
        caption: table.caption?.textContent.trim() || '',
        rows: [...table.rows].map(row => [...row.cells].map(cell => ({ text: cell.textContent.trim(), role: cell.tagName, scope: cell.getAttribute('scope') }))),
      })),
    }));
    r.add('html.document-identity', facts.title === expected.title && facts.language === expected.language, { title: facts.title, language: facts.language }, { title: expected.title, language: expected.language });
    r.add('html.main-landmark', await page.getByRole('main').count() === 1, await page.getByRole('main').count(), 1);
    const headings = expected.headings || [];
    const namedHeadings = await Promise.all(headings.map(h => page.getByRole('heading', { name: h.name, level: h.level, exact: true }).count()));
    r.add('html.heading-navigation-semantics', JSON.stringify(facts.headings) === JSON.stringify(headings) && namedHeadings.every(n => n === 1), facts.headings, headings);
    r.add('html.reading-order', ordered(facts.text, expected.readingOrder || []), { anchorsInOrder: ordered(facts.text, expected.readingOrder || []) }, expected.readingOrder || []);
    r.add('html.no-positive-tabindex', facts.positiveTabIndex === 0, facts.positiveTabIndex, 0);
    for (const [i, table] of (expected.tables || []).entries()) {
      const actual = facts.tables[i];
      const matrix = actual?.rows.map(row => row.map(cell => normalize(cell.text)));
      const wanted = [table.headers, ...table.rows];
      const headers = actual?.rows[0];
      const rowHeaders = !table.rowHeaders || actual?.rows.slice(1).every(row => row[0].role === 'TH' && row[0].scope === 'row');
      r.add('html.table-' + (i + 1), !!actual && actual.caption === table.caption && JSON.stringify(matrix) === JSON.stringify(wanted) && headers.every(cell => cell.role === 'TH' && cell.scope === 'col') && rowHeaders,
        actual || null, table);
    }
    r.add('html.table-count', facts.tables.length === (expected.tables || []).length, facts.tables.length, (expected.tables || []).length);
    for (const [i, link] of (expected.links || []).entries()) {
      const target = page.getByRole('link', { name: link.name, exact: true });
      r.add('html.link-' + (i + 1), await target.count() === 1 && await target.getAttribute('href') === link.href, { name: link.name, count: await target.count() }, link);
    }
    for (const [i, step] of (expected.keyboard || []).entries()) {
      await page.keyboard.press('Tab');
      const target = page.getByRole(step.role, { name: step.name, exact: true });
      const matches = await target.count() === 1 && await target.evaluate(el => el === document.activeElement);
      r.add('html.keyboard-order-' + (i + 1), matches, await page.evaluate(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id || null })), { role: step.role, name: step.name });
      if (!matches) break;
      const focus = await target.evaluate(el => {
        const box = el.getBoundingClientRect(), style = getComputedStyle(el);
        const x = Math.max(0, Math.min(innerWidth - 1, box.x + box.width / 2));
        const y = Math.max(0, Math.min(innerHeight - 1, box.y + box.height / 2));
        const hit = document.elementFromPoint(x, y);
        return { inViewport: box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth,
          centerUnobscured: hit === el || el.contains(hit), focusIndicatorStyle: (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none' };
      });
      r.add('html.keyboard-focus-' + (i + 1), focus.inViewport && focus.centerUnobscured && focus.focusIndicatorStyle, focus, 'visible geometry, unobscured center, nonzero outline or shadow');
      if (step.type !== undefined) await page.keyboard.type(step.type);
      if (step.press) await page.keyboard.press(step.press);
      if (step.value !== undefined) r.add('html.keyboard-value-' + (i + 1), await target.inputValue() === step.value, await target.inputValue(), step.value);
      if (step.checked !== undefined) r.add('html.keyboard-state-' + (i + 1), await target.isChecked() === step.checked, await target.isChecked(), step.checked);
      if (step.hash) r.add('html.keyboard-link-activation-' + (i + 1), new URL(page.url()).hash === step.hash, new URL(page.url()).hash, step.hash);
      if (step.focusId) r.add('html.keyboard-link-focus-' + (i + 1), await page.evaluate(() => document.activeElement?.id) === step.focusId, await page.evaluate(() => document.activeElement?.id), step.focusId);
    }
    for (const state of expected.finalControls || []) {
      const control = page.getByRole(state.role, { name: state.name, exact: true });
      const actual = state.checked === undefined ? await control.inputValue() : await control.isChecked();
      r.add('html.final-control-' + state.name, actual === (state.checked ?? state.value), actual, state.checked ?? state.value);
    }
    r.add('html.no-required-network', blockedNetworkRequests === 0, blockedNetworkRequests, 0);
    return { checks: r.checks, limitations: ['Chromium role/name exposure and native keyboard behavior only; no screen reader was run.', 'Focus style/geometry checks do not measure focus contrast or substitute for visual inspection.', 'Export scripts are disabled; script-dependent interactions require a separate manual task.'] };
  } finally { await context.close(); }
}
async function inspectPdf(file, expected) {
  const pdfjs = require(path.join(ROOT, 'desktop/mcp/vendor/pdfjs.min.js'));
  pdfjs.GlobalWorkerOptions.workerSrc = path.join(ROOT, 'desktop/mcp/vendor/pdf.worker.min.js');
  const document = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), isEvalSupported: false, disableFontFace: true }).promise;
  const r = recorder(), roots = [], annotationList = [];
  let untaggedPages = 0;
  try {
    const metadata = await document.getMetadata();
    r.add('pdf.document-title', normalize(metadata.info.Title) === expected.title, normalize(metadata.info.Title), expected.title);
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent({ includeMarkedContent: true });
      const byId = new Map(), stack = [];
      for (const item of content.items) {
        if (item.type === 'beginMarkedContentProps' || item.type === 'beginMarkedContent') stack.push(item.id || null);
        else if (item.type === 'endMarkedContent') stack.pop();
        else if (typeof item.str === 'string') for (const id of stack.filter(Boolean)) byId.set(id, (byId.get(id) || '') + item.str + ' ');
      }
      const tree = await page.getStructTree();
      if (!tree) untaggedPages++;
      const copy = node => ({ role: node.role || null, alt: node.alt || null, page: number,
        objectRef: node.type === 'object' && node.id ? number + ':' + node.id : null,
        text: node.type === 'content' ? normalize(byId.get(node.id)) : '',
        children: (node.children || []).map(copy) });
      if (tree) roots.push(copy(tree));
      annotationList.push(...(await page.getAnnotations()).filter(a => a.subtype === 'Link').map(a => ({ objectRef: number + ':' + a.id, url: a.url || null, destination: a.dest || null })));
      page.cleanup();
    }
    const text = node => normalize([node.text, ...node.children.map(text)].join(' '));
    const all = [], walk = node => { all.push(node); node.children.forEach(walk); };
    roots.forEach(walk);
    r.add('pdf.tagged-reading-order', untaggedPages === 0 && ordered(roots.map(text).join(' '), expected.readingOrder || []), { untaggedPages, anchorsInOrder: ordered(roots.map(text).join(' '), expected.readingOrder || []) }, expected.readingOrder || []);
    const headings = all.filter(n => /^H[1-6]$/.test(n.role)).map(n => ({ level: Number(n.role[1]), name: text(n) }));
    r.add('pdf.heading-navigation-semantics', JSON.stringify(headings) === JSON.stringify(expected.headings || []), headings, expected.headings || []);
    const tables = all.filter(n => n.role === 'Table');
    r.add('pdf.table-count', tables.length === (expected.tables || []).length, tables.length, (expected.tables || []).length);
    const descendants = (node, role) => node.children.flatMap(child => child.role === role ? [child] : descendants(child, role));
    for (const [i, table] of (expected.tables || []).entries()) {
      const rows = tables[i] ? descendants(tables[i], 'TR') : [];
      const cells = rows.map(row => descendants(row, 'TH').concat(descendants(row, 'TD')));
      // Keep sibling order: concatenating TH/TD would hide a misplaced row header.
      const orderedCells = rows.map(row => {
        const collect = node => node.children.flatMap(child => ['TH', 'TD'].includes(child.role) ? [child] : collect(child));
        return collect(row);
      });
      const actual = orderedCells.map(row => row.map(text));
      const wanted = [table.headers, ...table.rows];
      const roles = orderedCells[0]?.every(cell => cell.role === 'TH') && (!table.rowHeaders || orderedCells.slice(1).every(row => row[0]?.role === 'TH'));
      r.add('pdf.table-' + (i + 1), roles && JSON.stringify(actual) === JSON.stringify(wanted), { cells: actual, roles: orderedCells.map(row => row.map(cell => cell.role)) }, table);
    }
    const annotationsByRef = new Map(annotationList.map(annotation => [annotation.objectRef, annotation]));
    const objectRefs = node => [node.objectRef, ...node.children.flatMap(objectRefs)].filter(Boolean);
    for (const [i, link] of (expected.pdfLinks || []).entries()) {
      const named = all.filter(node => node.role === 'Link' && text(node) === normalize(link.name));
      const bindings = named.map(node => {
        const references = [...new Set(objectRefs(node))];
        return { page: node.page, references,
          unresolvedReferences: references.filter(ref => !annotationsByRef.has(ref)),
          annotationUrls: references.map(ref => annotationsByRef.get(ref)?.url || null) };
      });
      // A destination elsewhere in the PDF cannot establish this named link's behavior.
      // Multi-line links may own several annotations; every one must resolve to the expected URL.
      const bound = named.length === 1 && typeof link.url === 'string' && link.url.length > 0
        && bindings[0].references.length > 0 && bindings[0].unresolvedReferences.length === 0
        && bindings[0].annotationUrls.every(url => url === link.url);
      r.add('pdf.link-' + (i + 1), bound, { matchingTags: named.length, bindings }, link);
    }
    return { checks: r.checks, reader: 'PDF.js ' + pdfjs.version, pages: document.numPages,
      limitations: ['Text is followed through PDF.js structure/marked-content associations; this is not a screen-reader session.', 'Native PDF viewer keyboard/form behavior, spoken headers, alternative-text usefulness, OCR correctness, and visual layout require human checks.'] };
  } finally { await document.destroy(); }
}
async function runAcceptance(manifestPath, options = {}) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schema !== 1 || !Array.isArray(manifest.artifacts) || !manifest.artifacts.length) throw Error('Expected a schema-1 manifest with artifacts.');
  const ownBrowser = !options.browser;
  const browser = options.browser || await require('playwright').chromium.launch({ headless: true,
    ...(process.env.ALLOFLOW_CHROMIUM_PATH ? { executablePath: process.env.ALLOFLOW_CHROMIUM_PATH } : {}) });
  const artifacts = [];
  try {
    for (const artifact of manifest.artifacts) {
      const file = path.resolve(path.dirname(manifestPath), artifact.path);
      const bytes = fs.readFileSync(file);
      if (bytes.length > 64 * 1024 * 1024) throw Error('Acceptance artifact exceeds 64 MiB.');
      let observations;
      try {
        observations = artifact.kind === 'html' ? await inspectHtml(browser, file, artifact.expected)
          : artifact.kind === 'pdf' ? await inspectPdf(file, artifact.expected) : (() => { throw Error('Unsupported artifact kind'); })();
      } catch (error) { observations = { checks: [{ id: 'inspection-executed', status: 'failed', observed: String(error.message).slice(0, 500) }] }; }
      artifacts.push({ id: artifact.id, documentKind: artifact.documentKind, kind: artifact.kind, path: file,
        sha256: sha256(bytes), bytes: bytes.length, provenance: artifact.provenance, ...observations,
        automatedStatus: observations.checks.every(c => c.status === 'passed') ? 'passed' : 'failed', manualATStatus: 'not-run' });
    }
  } finally { if (ownBrowser) await browser.close(); }
  return { schema: 1, runAt: new Date().toISOString(), browserVersion: browser.version(), artifacts,
    automatedStatus: artifacts.every(a => a.automatedStatus === 'passed') ? 'passed' : 'failed',
    humanAcceptance: { status: 'not-run', releaseDecision: 'pending-human-at', protocol: 'docs/document-export-at-acceptance.md' } };
}
function manualTemplate(report) {
  return { schema: 1, status: 'not-run', tester: null, testDate: null, assistiveTechnology: null, version: null, operatingSystem: null, readerApplication: null, readerVersion: null,
    artifacts: report.artifacts.map(a => ({ id: a.id, path: a.path, sha256: a.sha256, bytes: a.bytes,
      tasks: ['document-orientation', 'heading-navigation', 'continuous-reading', 'table-navigation', 'links-and-focus', 'forms-and-state', 'figures-and-ocr'].map(id => ({ id, status: 'not-run', observation: null, issue: null })) })),
    decision: 'pending-human-at' };
}
if (require.main === module) {
  const [manifest, output] = process.argv.slice(2);
  if (!manifest || !output) { console.error('Usage: node dev-tools/document_export_at_acceptance.cjs MANIFEST.json NEW_OUTPUT_DIR'); process.exitCode = 2; }
  else (async () => {
    if (fs.existsSync(output)) throw Error('Output directory already exists; choose a new directory to preserve human results.');
    const report = await runAcceptance(path.resolve(manifest));
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'automated-results.json'), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(output, 'manual-results.template.json'), JSON.stringify(manualTemplate(report), null, 2) + '\n');
    console.log(JSON.stringify({ automatedStatus: report.automatedStatus, artifacts: report.artifacts.length, manualATStatus: 'not-run', output: path.resolve(output) }));
    if (report.automatedStatus !== 'passed') process.exitCode = 1;
  })().catch(error => { console.error(error.message); process.exitCode = 2; });
}
module.exports = { runAcceptance, inspectHtml, inspectPdf, manualTemplate };
