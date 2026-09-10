#!/usr/bin/env node
'use strict';
// Post-export observations, not screen-reader or user acceptance testing.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { inspectDocumentDependencies } = require('./document_html_dependencies.cjs');
const ROOT = path.resolve(__dirname, '..');
const normalize = value => String(value || '').normalize('NFC').replace(/\s+/gu, ' ').trim();
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const HTML_LIMITATIONS = ['Chromium role/name exposure and native keyboard behavior only; no screen reader was run.', 'Focus style/geometry checks do not measure focus contrast or substitute for visual inspection.', 'Only the source-authored acceptance contract is assessed; whole-document fidelity is not established.', 'Document scripts and network requests are blocked. Unsupported encoding or dependent content leaves inspection coverage unavailable.'];
function unavailableEncoding(reason, observed = {}) {
  return { checks: [{ id: 'html.utf8-encoding', status: 'unavailable', observed: { reason, ...observed } }],
    coverage: { complete: false, wholeDocument: false, reasons: [reason] }, limitations: HTML_LIMITATIONS };
}
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
async function inspectHtml(browser, file, expected, capturedBytes = null) {
  let html;
  try { html = new TextDecoder('utf-8', { fatal: true }).decode(capturedBytes ?? fs.readFileSync(file)); }
  catch (error) {
    if (error.code !== 'ERR_ENCODING_INVALID_ENCODED_DATA') throw error;
    return unavailableEncoding('invalid-utf8');
  }
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block', viewport: { width: 1100, height: 800 } });
  let blockedNetworkRequests = 0;
  const r = recorder();
  try {
    // A fulfilled document origin makes relative CSS resource requests observable.
    // Only this first navigation is served; all document dependencies stay blocked.
    const entry = 'https://export-acceptance.invalid/artifacts/document.html';
    let servedDocument = false;
    await context.route('**/*', route => {
      const request = route.request();
      if (!servedDocument && request.url() === entry && request.isNavigationRequest()) {
        servedDocument = true;
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
      }
      blockedNetworkRequests++;
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.setDefaultTimeout(2500);
    await page.goto(entry, { waitUntil: 'load' });
    const charsets = await page.evaluate(() => Array.from(document.querySelectorAll('meta')).flatMap(meta => {
      const direct = meta.getAttribute('charset');
      if (direct !== null) return [direct.trim().toLowerCase()];
      if ((meta.getAttribute('http-equiv') || '').trim().toLowerCase() !== 'content-type') return [];
      const match = (meta.getAttribute('content') || '').match(/\bcharset\s*=\s*["']?\s*([^;"'\s]+)/i);
      return match ? [match[1].toLowerCase()] : [];
    }));
    if (charsets.some(charset => !/^(utf-8|utf8)$/i.test(charset))) return unavailableEncoding('incompatible-charset', { declaredCharsets: charsets.slice(0, 20).map(charset => charset.slice(0, 80)) });
    r.add('html.utf8-encoding', true, { declaredCharsets: charsets.slice(0, 20) }, 'valid UTF-8 with compatible declarations');
    const facts = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('th,td')], rows = [...document.querySelectorAll('tr')];
      return {
        title: document.title, language: document.documentElement.lang,
        text: document.body.innerText,
        headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e => ({ level: Number(e.tagName[1]), name: e.textContent.trim() })),
        positiveTabIndex: [...document.querySelectorAll('[tabindex]')].filter(e => e.tabIndex > 0).length,
        tables: [...document.querySelectorAll('table')].map(table => ({
          caption: table.caption?.textContent.trim() || '',
          rowIndices: [...table.rows].map(row => rows.indexOf(row)),
          rows: [...table.rows].map(row => [...row.cells].map(cell => ({ text: cell.textContent.trim(), role: cell.tagName, scope: cell.getAttribute('scope'), cellIndex: cells.indexOf(cell) }))),
        })),
      };
    });
    // Match native accessibility nodes back to their DOM identities. Name-only
    // lookup lets an unrelated exposed element stand in for a hidden target and
    // exact string lookup does not account for canonical Unicode equivalence.
    let native = { headings: [], tables: [], rows: [], cells: [], all: [] };
    if (facts.headings.length || facts.tables.length) {
      const session = await context.newCDPSession(page);
      try {
        await session.send('Accessibility.enable');
        const { root } = await session.send('DOM.getDocument', { depth: -1 });
        const domById = new Map();
        const visit = node => { domById.set(node.nodeId, node.backendNodeId); (node.children || []).forEach(visit); };
        visit(root);
        const { nodes } = await session.send('Accessibility.getFullAXTree');
        const axById = new Map(nodes.map(node => [node.nodeId, node]));
        const axByDom = new Map(nodes.filter(node => !node.ignored).map(node => [node.backendDOMNodeId, node]));
        const ancestor = (node, roles) => {
          const seen = new Set();
          for (let parent = axById.get(node?.parentId); parent && !seen.has(parent.nodeId); parent = axById.get(parent.parentId)) {
            seen.add(parent.nodeId);
            if (!parent.ignored && roles.includes(parent.role?.value)) return parent.backendDOMNodeId ?? null;
          }
          return null;
        };
        const observation = (node, backendDOMNodeId) => ({
          backendDOMNodeId, exposed: !!node, role: node?.role?.value || null, name: normalize(node?.name?.value),
          level: node?.properties?.find(property => property.name === 'level')?.value?.value ?? null,
          row: ancestor(node, ['row']), table: ancestor(node, ['table', 'grid', 'treegrid']),
        });
        for (const [kind, selector] of [['headings', 'h1,h2,h3,h4,h5,h6'], ['tables', 'table'], ['rows', 'tr'], ['cells', 'th,td']]) {
          const { nodeIds } = await session.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
          native[kind] = nodeIds.map(id => { const backend = domById.get(id); return observation(axByDom.get(backend), backend); });
        }
        native.all = nodes.filter(node => !node.ignored).map(node => observation(node, node.backendDOMNodeId));
      } finally { await session.detach(); }
    }
    r.add('html.document-identity', facts.title === expected.title && facts.language === expected.language, { title: facts.title, language: facts.language }, { title: expected.title, language: expected.language });
    r.add('html.main-landmark', await page.getByRole('main').count() === 1, await page.getByRole('main').count(), 1);
    const headings = (expected.headings || []).map(heading => ({ level: heading.level, name: normalize(heading.name) }));
    const observedHeadings = facts.headings.map(heading => ({ level: heading.level, name: normalize(heading.name) }));
    const namedHeadings = headings.map(heading => native.all.filter(node => node.role === 'heading' && node.name === heading.name && node.level === heading.level).length);
    const ownHeadingNames = observedHeadings.every((heading, index) => native.headings[index]?.role === 'heading' && native.headings[index]?.level === heading.level && native.headings[index]?.name === heading.name);
    r.add('html.heading-navigation-semantics', JSON.stringify(observedHeadings) === JSON.stringify(headings) && namedHeadings.every(n => n === 1) && ownHeadingNames, observedHeadings, headings);
    r.add('html.reading-order', ordered(facts.text, expected.readingOrder || []), { anchorsInOrder: ordered(facts.text, expected.readingOrder || []) }, expected.readingOrder || []);
    r.add('html.no-positive-tabindex', facts.positiveTabIndex === 0, facts.positiveTabIndex, 0);
    for (const [i, table] of (expected.tables || []).entries()) {
      const actual = facts.tables[i], nativeTable = native.tables[i];
      const wanted = [table.headers, ...table.rows].map(row => row.map(normalize));
      if (actual) {
        actual.accessibility = actual.rows.map((row, rowIndex) => row.map((cell, columnIndex) => {
          const node = native.cells[cell.cellIndex], nativeRow = native.rows[actual.rowIndices[rowIndex]];
          const requiredRole = rowIndex === 0 ? 'columnheader' : table.rowHeaders && columnIndex === 0 ? 'rowheader' : 'cell';
          return { exposed: !!node?.exposed, role: node?.role || null, name: node?.name || '', requiredRole,
            inRow: !!node?.row && node.row === nativeRow?.backendDOMNodeId && nativeRow?.role === 'row',
            inTable: !!node?.table && node.table === nativeTable?.backendDOMNodeId && nativeRow?.table === nativeTable?.backendDOMNodeId };
        }));
        actual.exposure = { table: nativeTable?.role === 'table',
          columnHeaders: actual.accessibility[0]?.map(cell => cell.exposed && cell.role === 'columnheader') || [],
          rowHeaders: actual.accessibility.slice(1).map(row => !!row[0]?.exposed && row[0]?.role === 'rowheader') };
        delete actual.rowIndices;
        actual.rows.forEach(row => row.forEach(cell => { delete cell.cellIndex; }));
      }
      // Image-only headers have no DOM text. Their native name is valid header
      // content; any nonempty authored text must still match independently.
      const matrix = actual?.rows.map((row, rowIndex) => row.map((cell, columnIndex) => normalize(cell.text) || (cell.role === 'TH' ? actual.accessibility[rowIndex][columnIndex].name : '')));
      const headers = actual?.rows[0];
      const rowHeaders = !table.rowHeaders || actual?.rows.slice(1).every(row => row[0]?.role === 'TH' && row[0]?.scope === 'row');
      const exposed = actual?.exposure.table && actual.accessibility.every((row, rowIndex) => row.every((cell, columnIndex) =>
        cell.exposed && cell.role === cell.requiredRole && cell.inRow && cell.inTable && cell.name === wanted[rowIndex]?.[columnIndex]));
      r.add('html.table-' + (i + 1), !!actual && normalize(actual.caption) === normalize(table.caption) && JSON.stringify(matrix) === JSON.stringify(wanted) && headers?.length > 0 && headers.every(cell => cell.role === 'TH' && cell.scope === 'col') && rowHeaders && exposed,
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
    const dependencies = await page.evaluate(inspectDocumentDependencies);
    const resources = { blocked: blockedNetworkRequests, ...dependencies }, reasons = [];
    if (resources.blocked) reasons.push('blocked-network-requests');
    if (resources.scripts) reasons.push('script-dependent-content');
    if (resources.unresolved) reasons.push('unresolved-resource-references');
    if (resources.animations) reasons.push('active-animations');
    r.checks.push({ id: 'html.no-required-network', status: resources.blocked ? 'unavailable' : 'passed', observed: resources.blocked, expected: 0 });
    r.checks.push({ id: 'html.inspection-coverage', status: reasons.length ? 'unavailable' : 'passed', observed: { reasons, resources } });
    return { checks: r.checks, coverage: { complete: !reasons.length, wholeDocument: false, reasons }, resources, limitations: HTML_LIMITATIONS };
  } finally { await context.close(); }
}
async function inspectPdf(file, expected, capturedBytes = null) {
  const pdfjs = require(path.join(ROOT, 'desktop/mcp/vendor/pdfjs.min.js'));
  pdfjs.GlobalWorkerOptions.workerSrc = path.join(ROOT, 'desktop/mcp/vendor/pdf.worker.min.js');
  const document = await pdfjs.getDocument({ data: new Uint8Array(capturedBytes ?? fs.readFileSync(file)), isEvalSupported: false, disableFontFace: true }).promise;
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
      const wanted = [table.headers, ...table.rows].map(row => row.map(normalize));
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
        observations = artifact.kind === 'html' ? await inspectHtml(browser, file, artifact.expected, bytes)
          : artifact.kind === 'pdf' ? await inspectPdf(file, artifact.expected, bytes) : (() => { throw Error('Unsupported artifact kind'); })();
      } catch (error) {
        observations = { checks: [{ id: 'inspection-executed', status: 'unavailable', observed: String(error.message).slice(0, 500) }],
          coverage: { complete: false, wholeDocument: false, reasons: ['inspection-failed'] } };
      }
      // Optional source-authored whole-artifact comparison. It may require review
      // or remain unavailable; it never promotes human acceptance or delivery.
      if (artifact.sourceFidelity) {
        try {
          if (artifact.kind !== 'html') throw Error('Rendered source fidelity currently supports HTML artifacts only.');
          const source = path.resolve(path.dirname(manifestPath), artifact.sourceFidelity.sourcePath);
          const rendered = await require('./rendered_document_fidelity.cjs').compareFiles(browser, source, file, artifact.sourceFidelity);
          if (rendered.candidate.sha256 !== sha256(bytes) || sha256(fs.readFileSync(file)) !== sha256(bytes)) throw Error('Candidate changed during acceptance inspection.');
          observations.renderedFidelity = rendered;
          observations.checks.push({ id: 'html.rendered-source-fidelity', status: rendered.status === 'passed' ? 'passed' : rendered.status === 'unavailable' ? 'unavailable' : 'failed', observed: { status: rendered.status, coverage: rendered.coverage } });
        } catch (error) {
          observations.renderedFidelity = { status: 'unavailable', reason: String(error.message).slice(0, 500), humanValidation: 'not-run' };
          observations.checks.push({ id: 'html.rendered-source-fidelity', status: 'unavailable', observed: observations.renderedFidelity.reason });
        }
      }
      artifacts.push({ id: artifact.id, documentKind: artifact.documentKind, kind: artifact.kind, path: file,
        sha256: sha256(bytes), bytes: bytes.length, provenance: artifact.provenance, ...observations,
        automatedStatus: observations.checks.every(c => c.status === 'passed') ? 'passed' : 'failed', manualATStatus: 'not-run' });
    }
  } finally { if (ownBrowser) await browser.close(); }
  // Inspect exactly the captured bytes, then bind every published artifact to
  // its current file. Defer this pass so later inspections cannot leave an
  // earlier artifact's report bound to bytes that have since changed.
  for (const artifact of artifacts) {
    let observed;
    try {
      const currentHash = sha256(fs.readFileSync(artifact.path));
      observed = currentHash === artifact.sha256 ? { reason: 'artifact-unchanged' }
        : { reason: 'artifact-changed', currentSha256: currentHash };
    } catch (error) { observed = { reason: 'artifact-unreadable', code: String(error.code || 'read-failed').slice(0, 80) }; }
    const stable = observed.reason === 'artifact-unchanged';
    artifact.checks.push({ id: 'artifact.byte-stability', status: stable ? 'passed' : 'unavailable', observed });
    const bindingFailures = stable ? [] : [observed.reason];
    const renderedSource = artifact.renderedFidelity?.source;
    if (renderedSource?.path && renderedSource.sha256) {
      let sourceObserved;
      try {
        const currentHash = sha256(fs.readFileSync(renderedSource.path));
        sourceObserved = currentHash === renderedSource.sha256 ? { reason: 'source-unchanged' }
          : { reason: 'source-changed', currentSha256: currentHash };
      } catch (error) { sourceObserved = { reason: 'source-unreadable', code: String(error.code || 'read-failed').slice(0, 80) }; }
      const sourceStable = sourceObserved.reason === 'source-unchanged';
      artifact.checks.push({ id: 'html.rendered-source-byte-stability', status: sourceStable ? 'passed' : 'unavailable', observed: sourceObserved });
      if (!sourceStable) bindingFailures.push(sourceObserved.reason);
    }
    if (bindingFailures.length && artifact.renderedFidelity) {
      for (const rendered of [artifact.renderedFidelity, ...(artifact.renderedFidelity.profiles || [])]) {
        rendered.status = 'unavailable';
        rendered.artifactChanged = true;
        if (rendered.coverage) {
          rendered.coverage.complete = false;
          rendered.coverage.reasons = [...new Set([...(rendered.coverage.reasons || []), ...bindingFailures])];
        }
      }
      const check = artifact.checks.find(check => check.id === 'html.rendered-source-fidelity');
      if (check) { check.status = 'unavailable'; check.observed = { status: 'unavailable', reasons: bindingFailures }; }
    }
    artifact.automatedStatus = artifact.checks.every(check => check.status === 'passed') ? 'passed' : 'failed';
  }
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
    const renderedReports = report.artifacts.filter(artifact => artifact.renderedFidelity).map(artifact => ({ id: artifact.id, ...artifact.renderedFidelity }));
    if (renderedReports.length) fs.writeFileSync(path.join(output, 'rendered-fidelity-review.html'), require('./rendered_fidelity_review.cjs').renderReview({ reports: renderedReports }));
    console.log(JSON.stringify({ automatedStatus: report.automatedStatus, artifacts: report.artifacts.length, manualATStatus: 'not-run', output: path.resolve(output) }));
    if (report.automatedStatus !== 'passed') process.exitCode = 1;
  })().catch(error => { console.error(error.message); process.exitCode = 2; });
}
module.exports = { runAcceptance, inspectHtml, inspectPdf, manualTemplate };
