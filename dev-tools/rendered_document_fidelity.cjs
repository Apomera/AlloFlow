#!/usr/bin/env node
'use strict';
// Source-authored checkpoints over isolated Chromium renderings. No score or human attestation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { inspectDocumentDependencies } = require('./document_html_dependencies.cjs');
const PROPERTIES = ['text', 'visible', 'exposed', 'name', 'role', 'disabled', 'value', 'checked', 'selected', 'href', 'targetText', 'language', 'direction'];
const MAX_BYTES = 8 * 1024 * 1024, MAX_CHECKPOINTS = 100;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const normalText = value => String(value || '').normalize('NFC').replace(/\s+/gu, ' ').trim();
const wordSegments = new Intl.Segmenter('und', { granularity: 'word' });
function preservesExposedWords(original, output) {
  const words = text => Array.from(wordSegments.segment(text), part => part.segment).filter(part => part.trim());
  const required = words(original);
  let matched = 0;
  for (const word of words(output)) if (word === required[matched]) matched++;
  return matched === required.length;
}
// Canonical character offsets bind exposure to the original occurrence, even
// when identical text elsewhere in the checkpoint is newly revealed. Grapheme
// normalization spans markup boundaries without compatibility folding.
const graphemes = new Intl.Segmenter('und', { granularity: 'grapheme' });
function textOccurrences(parts, properties) {
  const raw = parts.map(part => part.text).join(''), ranges = {};
  for (const property of properties) ranges[property] = [];
  let text = '', offset = 0, partIndex = 0, partStart = 0, pendingSpace = false;
  for (const item of graphemes.segment(raw)) {
    const start = item.index, end = start + item.segment.length;
    while (partIndex < parts.length && partStart + parts[partIndex].text.length <= start) partStart += parts[partIndex++].text.length;
    let index = partIndex, position = partStart;
    const states = Object.fromEntries(properties.map(property => [property, true]));
    while (index < parts.length && position < end) {
      for (const property of properties) states[property] &&= parts[index][property] === true;
      position += parts[index++].text.length;
    }
    const normalized = item.segment.normalize('NFC');
    if (/^\s+$/u.test(normalized)) { pendingSpace = text.length > 0; continue; }
    if (pendingSpace) { text += ' '; offset++; pendingSpace = false; }
    text += normalized;
    for (const property of properties) if (states[property]) {
      const runs = ranges[property], last = runs[runs.length - 1];
      if (last && last[1] === offset) last[1] += normalized.length;
      else runs.push([offset, offset + normalized.length]);
    }
    offset += normalized.length;
  }
  return { text, ...ranges };
}
function preservesOccurrences(original, output, property) {
  if (!original || !output || !Array.isArray(original[property]) || !Array.isArray(output[property])) return null;
  if (original.text !== output.text) return false;
  let cursor = 0;
  for (const [start, end] of original[property]) {
    while (cursor < output[property].length && output[property][cursor][1] <= start) cursor++;
    const range = output[property][cursor];
    if (!range || range[0] > start || range[1] < end) return false;
  }
  return true;
}
function accessibilityText(rootId, nodes) {
  const byId = new Map(nodes.map(node => [node.nodeId, node]));
  if (!byId.has(rootId)) throw Error('Accessibility subtree unavailable');
  const text = [], pending = [rootId], seen = new Set();
  while (pending.length) {
    const id = pending.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (!node) throw Error('Accessibility subtree incomplete');
    const role = node.role?.value, children = node.childIds || [];
    if (!node.ignored && (role === 'StaticText' || !children.length && role !== 'InlineTextBox')) text.push(node.name?.value || '');
    if (role !== 'StaticText') pending.push(...children.slice().reverse());
  }
  return normalText(text.join(''));
}
function validateCheckpoints(checkpoints) {
  if (!Array.isArray(checkpoints) || !checkpoints.length || checkpoints.length > MAX_CHECKPOINTS) throw Error('Provide 1–100 source-authored checkpoints.');
  const seen = new Set();
  return checkpoints.map(c => {
    if (!c || !/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(c.id || '') || seen.has(c.id)) throw Error('Checkpoint IDs must be unique bounded identifiers.');
    seen.add(c.id);
    for (const selector of [c.sourceSelector, c.candidateSelector || c.sourceSelector]) {
      if (typeof selector !== 'string' || !selector.trim() || selector.length > 500) throw Error('Each checkpoint requires a bounded CSS selector.');
    }
    if (!Array.isArray(c.properties) || !c.properties.length || c.properties.some(p => !PROPERTIES.includes(p)) || new Set(c.properties).size !== c.properties.length) throw Error('Checkpoint properties must be supported and unique.');
    return { id: c.id, sourceSelector: c.sourceSelector, candidateSelector: c.candidateSelector || c.sourceSelector, properties: [...c.properties] };
  });
}
async function snapshot(browser, html, checkpoints, side, viewport, media) {
  let context, page, phase = 'context', scripts = null, resourceReferences = null, activeAnimations = null;
  const observations = [], failures = [];
  let blockedRequests = 0;
  try {
    context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block', viewport });
    phase = 'setup';
    const entry = 'https://rendered-fidelity.invalid/document';
    await context.route('**/*', route => {
      if (route.request().isNavigationRequest() && route.request().url() === entry && route.request().frame() === page.mainFrame() && !served) {
        served = true; return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
      }
      blockedRequests++; return route.abort('blockedbyclient');
    });
    let served = false;
    page = await context.newPage(); page.setDefaultTimeout(5000);
    phase = 'navigation';
    await page.emulateMedia({ media, reducedMotion: 'reduce' });
    await page.goto(entry, { waitUntil: 'load', timeout: 15000 });
    phase = 'accessibility';
    const session = await context.newCDPSession(page);
    await session.send('Accessibility.enable');
    const needsOccurrences = checkpoints.some(checkpoint => checkpoint.properties.includes('text') && checkpoint.properties.includes('exposed'));
    if (needsOccurrences) await session.send('DOM.enable', { includeWhitespace: 'all' });
    const { root } = await session.send('DOM.getDocument', { depth: needsOccurrences ? -1 : 0 });
    const domNodes = new Map(), pendingNodes = [root];
    while (pendingNodes.length) {
      const node = pendingNodes.pop(); domNodes.set(node.nodeId, node);
      pendingNodes.push(...(node.children || []));
    }
    let fullAXTree;
    phase = 'observations';
    for (const checkpoint of checkpoints) {
      const selector = checkpoint[side + 'Selector'];
      try {
        const match = await page.evaluate(selector => document.querySelectorAll(selector).length, selector);
        if (match !== 1) { observations.push({ id: checkpoint.id, status: 'unavailable', reason: match ? 'ambiguous-selector' : 'missing-selector', matches: match }); continue; }
        const dom = await page.evaluate(({ selector, properties }) => {
          const el = document.querySelector(selector), normal = value => String(value || '').normalize('NFC').replace(/\s+/gu, ' ').trim();
          const tag = el.tagName.toLowerCase(), style = getComputedStyle(el), requested = new Set(properties);
          const visibilityOptions = { checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true };
          const textIsVisible = node => {
            const parent = node.parentElement;
            if (!parent || getComputedStyle(parent).visibility !== 'visible') return false;
            let boxParent = parent;
            // display:contents has no box. Text still inherits every ancestor's opacity.
            for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
              const computed = getComputedStyle(ancestor);
              if (Number(computed.opacity) === 0 || computed.display === 'none' || computed.contentVisibility === 'hidden') return false;
            }
            while (boxParent && getComputedStyle(boxParent).display === 'contents') boxParent = boxParent.parentElement;
            if (!boxParent || !boxParent.checkVisibility({ ...visibilityOptions, checkVisibilityCSS: false })) return false;
            const range = document.createRange(); range.selectNodeContents(node);
            return Array.from(range.getClientRects()).some(box => box.width > 0 && box.height > 0);
          };
          const textParts = () => {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), parts = [];
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              const path = [];
              for (let current = node; current !== el; current = current.parentNode) path.unshift(Array.prototype.indexOf.call(current.parentNode.childNodes, current));
              parts.push({ path, text: node.textContent, visible: requested.has('visible') ? textIsVisible(node) : false });
            }
            return parts;
          };
          const visible = () => style.display === 'contents'
            ? Array.from(el.querySelectorAll('*')).some(child => child.checkVisibility(visibilityOptions)) || Array.from(el.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() && textIsVisible(node))
            : el.checkVisibility(visibilityOptions);
          const result = {}, textEvidence = {};
          for (const property of properties) {
            if (property === 'text') result.text = normal(el.textContent);
            else if (property === 'visible') result.visible = visible();
            else if (property === 'disabled') result.disabled = /^(input|select|textarea|button|option|optgroup|fieldset)$/.test(tag) ? el.matches(':disabled') : null;
            else if (property === 'value') result.value = 'value' in el ? String(el.value) : null;
            else if (property === 'checked') result.checked = 'checked' in el ? el.checked : null;
            else if (property === 'selected') result.selected = tag === 'select' ? Array.from(el.selectedOptions).map(option => ({ index: option.index, value: option.value, label: normal(option.label) })) : tag === 'option' ? el.selected : null;
            else if (property === 'href') {
              const literal = el.getAttribute('href');
              // A synthetic origin is not the document's real base. Preserve relative
              // spelling as well as browser resolution, including any authored <base>.
              result.href = tag === 'a' ? literal != null && !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(literal.trim()) ? { relative: literal, resolved: el.href } : el.href : null;
            } else if (property === 'targetText') {
              result.targetText = null;
              if (tag === 'a' && el.hash && el.href.split('#')[0] === location.href.split('#')[0]) {
                try { const target = document.getElementById(decodeURIComponent(el.hash.slice(1))); if (target) result.targetText = normal(target.textContent); } catch (_) {}
              }
            } else if (property === 'language') result.language = el.closest('[lang]')?.getAttribute('lang') || '';
            else if (property === 'direction') result.direction = style.direction;
          }
          const parts = requested.has('text') && (requested.has('visible') || requested.has('exposed')) ? textParts() : null;
          if (requested.has('text') && requested.has('visible')) textEvidence.visibleText = normal(parts.filter(part => part.visible).map(part => part.text).join(''));
          return { values: result, textEvidence, parts };
        }, { selector, properties: checkpoint.properties });
        const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
        const { nodes } = await session.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
        const ax = nodes[0];
        if (!ax) throw Error('Accessibility node unavailable');
        const axValues = { exposed: !ax.ignored, name: normalText(ax.name?.value), role: ax.role?.value ?? null };
        for (const property of checkpoint.properties) if (property in axValues) dom.values[property] = axValues[property];
        dom.textEvidence ||= {};
        if (checkpoint.properties.includes('text') && checkpoint.properties.includes('exposed')) {
          fullAXTree ||= await session.send('Accessibility.getFullAXTree');
          dom.textEvidence.exposedText = ax.ignored ? '' : accessibilityText(ax.nodeId, fullAXTree.nodes);
          const exposedNodes = new Set(fullAXTree.nodes.filter(node => !node.ignored && node.role?.value === 'StaticText').map(node => node.backendDOMNodeId));
          for (const part of dom.parts) {
            let textNode = domNodes.get(nodeId);
            for (const index of part.path) textNode = textNode?.children?.[index];
            if (!textNode || textNode.nodeType !== 3 || textNode.nodeValue !== part.text) throw Error('Text occurrence accessibility mapping unavailable');
            part.exposed = !ax.ignored && exposedNodes.has(textNode.backendNodeId);
          }
        }
        if (dom.parts) dom.textOccurrences = textOccurrences(dom.parts, ['visible', 'exposed'].filter(property => checkpoint.properties.includes(property)));
        // Bound only selected observations (including their derived text evidence).
        // Structured selections are bounded too, so a large multi-select cannot leak
        // an unbounded report through the previous string-only limit.
        const boundedValues = [...checkpoint.properties.map(property => dom.values[property]), ...Object.values(dom.textEvidence), dom.textOccurrences];
        const truncated = boundedValues.some(value => typeof value === 'string' ? value.length > 8192 : value != null && typeof value === 'object' && JSON.stringify(value).length > 8192);
        observations.push(truncated ? { id: checkpoint.id, status: 'unavailable', reason: 'observation-too-large' }
          : { id: checkpoint.id, status: 'observed', values: Object.fromEntries(checkpoint.properties.map(p => [p, dom.values[p]])), textEvidence: dom.textEvidence, textOccurrences: dom.textOccurrences });
      } catch (error) { observations.push({ id: checkpoint.id, status: 'unavailable', reason: 'inspection-failed', message: String(error.message).slice(0, 300) }); }
    }
    phase = 'dependencies';
    const dependencies = await page.evaluate(inspectDocumentDependencies);
    scripts = dependencies.scripts;
    resourceReferences = dependencies.unresolved;
    activeAnimations = dependencies.animations;
  } catch (error) {
    failures.push({ reason: 'browser-inspection-failed', phase, message: String(error.message).slice(0, 300) });
  } finally {
    if (context) try { await context.close(); } catch (error) {
      failures.push({ reason: 'browser-cleanup-failed', phase: 'cleanup', message: String(error.message).slice(0, 300) });
    }
  }
  return { observations: checkpoints.map((checkpoint, index) => observations[index] || { id: checkpoint.id, status: 'unavailable', reason: 'browser-inspection-failed', phase }),
    blockedRequests, scriptsDisabled: scripts, unresolvedResourceReferences: resourceReferences, activeAnimations, failures };
}
async function compareProfile(browser, sourceHtml, candidateHtml, options = {}) {
  const started = performance.now();
  const sourceBytes = Buffer.from(sourceHtml), candidateBytes = Buffer.from(candidateHtml);
  if (sourceBytes.length > MAX_BYTES || candidateBytes.length > MAX_BYTES) throw Error('Rendered comparison exceeds 8 MiB per document.');
  const checkpoints = validateCheckpoints(options.checkpoints);
  const viewport = options.viewport || { width: 1100, height: 800 };
  if (!Number.isInteger(viewport.width) || !Number.isInteger(viewport.height) || viewport.width < 320 || viewport.height < 240 || viewport.width > 3840 || viewport.height > 2160) throw Error('Viewport is outside the bounded inspection range.');
  const media = options.media || 'screen';
  const source = await snapshot(browser, sourceHtml, checkpoints, 'source', viewport, media);
  const candidate = await snapshot(browser, candidateHtml, checkpoints, 'candidate', viewport, media);
  const checks = checkpoints.map((c, i) => {
    const before = source.observations[i], after = candidate.observations[i];
    if (before.status !== 'observed' || after.status !== 'observed') return { id: c.id, sourceSelector: c.sourceSelector, candidateSelector: c.candidateSelector, status: 'unavailable', source: before, candidate: after };
    const properties = c.properties.map(property => {
      const original = before.values[property], output = after.values[property];
      const unavailable = original == null || output == null;
      // Adding exposure or a previously absent name is allowed. Existing content
      // and behavior still require exact matching on explicitly selected properties.
      const preserved = ['visible', 'exposed'].includes(property) ? !original || output === true
        : property === 'name' && original === '' ? true : JSON.stringify(original) === JSON.stringify(output);
      return { property, status: unavailable ? 'unavailable' : preserved ? 'passed' : 'failed', source: original, candidate: output };
    });
    // Preserve each originally visible/exposed occurrence in the complete DOM
    // text, not a matching word sequence borrowed from a newly revealed copy.
    for (const property of Object.keys(before.textEvidence || {})) {
      const original = before.textEvidence[property], output = after.textEvidence?.[property];
      const occurrenceProperty = property === 'visibleText' ? 'visible' : 'exposed';
      const preserved = preservesOccurrences(before.textOccurrences, after.textOccurrences, occurrenceProperty);
      // Native accessible alternatives without DOM text retain the existing
      // additional check; DOM text must independently retain its own positions.
      const textPreserved = property !== 'exposedText' || preservesExposedWords(original, output || '');
      properties.push({ property, status: output == null || preserved == null ? 'unavailable' : preserved && textPreserved ? 'passed' : 'failed', source: original, candidate: output,
        occurrences: { basis: 'canonical-dom-text-offsets', source: before.textOccurrences?.[occurrenceProperty], candidate: after.textOccurrences?.[occurrenceProperty] } });
    }
    return { id: c.id, sourceSelector: c.sourceSelector, candidateSelector: c.candidateSelector, status: properties.some(p => p.status === 'failed') ? 'failed' : properties.some(p => p.status === 'unavailable') ? 'unavailable' : 'passed', properties };
  });
  const reasons = [];
  if ([source, candidate].some(s => s.blockedRequests)) reasons.push('blocked-network-requests');
  if ([source, candidate].some(s => s.scriptsDisabled)) reasons.push('script-dependent-content');
  if ([source, candidate].some(s => s.unresolvedResourceReferences)) reasons.push('unresolved-resources');
  if ([source, candidate].some(s => s.activeAnimations)) reasons.push('active-animations');
  const unavailable = check => check.status === 'unavailable' || (check.properties || []).some(p => p.status === 'unavailable');
  if (checks.some(unavailable)) reasons.push('incomplete-checkpoint');
  for (const [side, snapshot] of [['source', source], ['candidate', candidate]]) {
    for (const failure of snapshot.failures) reasons.push(side + '-' + failure.reason);
  }
  const incomplete = reasons.length > 0;
  return { schemaVersion: 1, kind: 'rendered-html-fidelity', source: { sha256: hash(sourceBytes), bytes: sourceBytes.length }, candidate: { sha256: hash(candidateBytes), bytes: candidateBytes.length },
    execution: { complete: !source.failures.length && !candidate.failures.length },
    browserVersion: browser.version(), viewport, media, profileId: options.id || 'default', durationMs: performance.now() - started,
    status: checks.some(c => c.status === 'failed') ? 'review-required' : incomplete ? 'unavailable' : 'passed',
    coverage: { requested: checkpoints.length, inspected: checks.filter(c => !unavailable(c)).length, complete: !incomplete, wholeDocument: false, reasons },
    resources: { source: { blocked: source.blockedRequests, scripts: source.scriptsDisabled, unresolved: source.unresolvedResourceReferences, animations: source.activeAnimations, failures: source.failures }, candidate: { blocked: candidate.blockedRequests, scripts: candidate.scriptsDisabled, unresolved: candidate.unresolvedResourceReferences, animations: candidate.activeAnimations, failures: candidate.failures } }, checks,
    humanValidation: 'not-run', limitations: ['Only the source-authored checkpoints and selected properties are assessed.', 'Chromium computed state and accessibility-tree evidence are not screen-reader acceptance.', 'Network resources and document scripts are blocked; dependent documents remain unavailable.', 'Visibility does not establish absence of occlusion, correct contrast, or useful alternative text.'] };
}
function validateProfiles(options = {}) {
  if (options.profiles && (options.viewport || options.media)) throw Error('Specify profiles or a single viewport/media, not both.');
  const profiles = options.profiles || [{ id: 'default', viewport: options.viewport, media: options.media }];
  if (!Array.isArray(profiles) || !profiles.length || profiles.length > 4) throw Error('Provide 1–4 rendering profiles.');
  const ids = new Set();
  return profiles.map(profile => {
    if (!profile || !/^[a-z0-9][a-z0-9._-]{0,39}$/i.test(profile.id || '') || ids.has(profile.id)) throw Error('Rendering profile IDs must be unique bounded identifiers.');
    ids.add(profile.id);
    const viewport = profile.viewport || { width: 1100, height: 800 }, media = profile.media || 'screen';
    if (!['screen', 'print'].includes(media)) throw Error('Only screen and print media are supported.');
    if (!Number.isInteger(viewport.width) || !Number.isInteger(viewport.height) || viewport.width < 320 || viewport.height < 240 || viewport.width > 3840 || viewport.height > 2160) throw Error('Viewport is outside the bounded inspection range.');
    return { id: profile.id, viewport, media };
  });
}
async function compareRenderedHtml(browser, sourceHtml, candidateHtml, options = {}) {
  const started = performance.now(), profiles = validateProfiles(options), checkpoints = validateCheckpoints(options.checkpoints), reports = [];
  for (const profile of profiles) reports.push(await compareProfile(browser, sourceHtml, candidateHtml, { ...profile, checkpoints }));
  if (!options.profiles) return reports[0];
  const incomplete = reports.filter(report => !report.coverage.complete);
  return { schemaVersion: 1, kind: 'rendered-html-fidelity', source: reports[0].source, candidate: reports[0].candidate, browserVersion: browser.version(),
    status: reports.some(r => r.status === 'review-required') ? 'review-required' : reports.some(r => r.status === 'unavailable') ? 'unavailable' : 'passed',
    durationMs: performance.now() - started, profiles: reports.map((report, i) => ({ ...report, id: profiles[i].id })),
    coverage: { requested: reports.reduce((n,r) => n + r.coverage.requested, 0), inspected: reports.reduce((n,r) => n + r.coverage.inspected, 0), complete: !incomplete.length, wholeDocument: false,
      profilesRequested: profiles.length, profilesAttempted: reports.length, profilesCompleted: reports.filter(report => report.execution.complete).length, reasons: incomplete.flatMap(r => r.coverage.reasons.map(reason => r.profileId + ':' + reason)) },
    checks: reports.flatMap(report => report.checks.map(check => ({ ...check, id: report.profileId + '/' + check.id, checkpointId: check.id, profileId: report.profileId }))),
    humanValidation: 'not-run', limitations: reports[0].limitations };
}
async function compareFiles(browser, sourcePath, candidatePath, options) {
  const source = fs.readFileSync(sourcePath), candidate = fs.readFileSync(candidatePath);
  const decode = bytes => {
    const html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    for (const meta of html.match(/<meta\b[^>]*>/gi) || []) {
      const charset = meta.match(/charset\s*=\s*[\"']?([^\s\"'/>;]+)/i)?.[1];
      if (charset && !/^(utf-8|utf8)$/i.test(charset)) throw Error('Rendered source comparison requires UTF-8 HTML.');
    }
    return html;
  };
  const report = await compareRenderedHtml(browser, decode(source), decode(candidate), options);
  // Bind the report to exact on-disk bytes, including any noncanonical encoding.
  report.source = { path: path.resolve(sourcePath), sha256: hash(source), bytes: source.length };
  report.candidate = { path: path.resolve(candidatePath), sha256: hash(candidate), bytes: candidate.length };
  for (const profile of report.profiles || []) { profile.source = { ...report.source }; profile.candidate = { ...report.candidate }; }
  let stable = false;
  try { stable = hash(fs.readFileSync(sourcePath)) === report.source.sha256 && hash(fs.readFileSync(candidatePath)) === report.candidate.sha256; } catch { /* Missing files cannot retain complete coverage. */ }
  if (!stable) {
    for (const item of [report, ...(report.profiles || [])]) {
      item.status = 'unavailable'; item.coverage.complete = false; item.artifactChanged = true;
      item.coverage.reasons = [...(item.coverage.reasons || []), 'artifact-changed-or-missing'];
    }
  }
  return report;
}
function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.pairs) || !manifest.pairs.length || manifest.pairs.length > 50) throw Error('Expected 1–50 source/candidate pairs.');
  const ids = new Set();
  for (const pair of manifest.pairs) {
    if (!pair || !/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(pair.id || '') || ids.has(pair.id)) throw Error('Pair IDs must be unique bounded identifiers.');
    ids.add(pair.id);
    for (const field of ['sourcePath', 'candidatePath']) if (typeof pair[field] !== 'string' || !pair[field].trim()) throw Error('Each pair requires source and candidate paths.');
    validateCheckpoints(pair.checkpoints); validateProfiles(pair);
  }
  return manifest;
}
function invalidateReport(report, reason) {
  for (const item of [report, ...(report.profiles || [])]) {
    item.status = 'unavailable'; if (/changed-or-missing$/.test(reason)) item.artifactChanged = true;
    item.coverage.complete = false;
    item.coverage.reasons = [...new Set([...(item.coverage.reasons || []), reason])];
  }
}
async function runRenderedManifest(manifestPath, options = {}) {
  const bytes = fs.readFileSync(manifestPath), manifest = validateManifest(JSON.parse(bytes.toString('utf8')));
  const ownBrowser = !options.browser, browser = options.browser || await require('playwright').chromium.launch({ headless: true });
  const reports = [], executionFailures = [];
  try {
    for (const pair of manifest.pairs) {
      const sourcePath = path.resolve(path.dirname(manifestPath), pair.sourcePath), candidatePath = path.resolve(path.dirname(manifestPath), pair.candidatePath);
      try { reports.push({ id: pair.id, ...await compareFiles(browser, sourcePath, candidatePath, pair) }); }
      catch (error) {
        const profiles = validateProfiles(pair);
        reports.push({ schemaVersion: 1, kind: 'rendered-html-fidelity', id: pair.id, status: 'unavailable',
          source: { path: sourcePath }, candidate: { path: candidatePath }, humanValidation: 'not-run',
          reason: 'file-comparison-failed', message: String(error.message).slice(0, 500),
          coverage: { complete: false, wholeDocument: false, requested: pair.checkpoints.length * profiles.length, inspected: 0, profilesRequested: profiles.length, profilesAttempted: 0, profilesCompleted: 0, reasons: ['file-comparison-failed'] }, checks: [] });
      }
    }
  } finally {
    if (ownBrowser) try { await browser.close(); } catch (error) {
      executionFailures.push({ reason: 'browser-cleanup-failed', message: String(error.message).slice(0, 300) });
      for (const report of reports) invalidateReport(report, 'browser-cleanup-failed');
    }
  }
  // Later pairs must not leave earlier evidence pointing at changed files.
  for (const report of reports) {
    for (const side of ['source', 'candidate']) {
      const artifact = report[side];
      if (!artifact?.sha256) continue;
      let stable = false;
      try { stable = hash(fs.readFileSync(artifact.path)) === artifact.sha256; } catch {}
      if (!stable) invalidateReport(report, side + '-changed-or-missing');
    }
  }
  let manifestStable = false;
  try { manifestStable = hash(fs.readFileSync(manifestPath)) === hash(bytes); } catch {}
  if (!manifestStable) for (const report of reports) invalidateReport(report, 'manifest-changed-or-missing');
  return { schemaVersion: 1, manifest: { path: path.resolve(manifestPath), sha256: hash(bytes), stable: manifestStable }, reports, executionFailures, humanValidation: 'not-run' };
}
if (require.main === module) (async () => {
  const [manifestPath, output] = process.argv.slice(2);
  if (!manifestPath || !output) throw Error('Usage: rendered_document_fidelity.cjs MANIFEST.json NEW_OUTPUT_DIR');
  if (fs.existsSync(output)) throw Error('Output directory exists; preserve previous evidence.');
  const result = await runRenderedManifest(path.resolve(manifestPath));
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'rendered-fidelity.json'), JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'review.html'), require('./rendered_fidelity_review.cjs').renderReview(result));
  console.log(JSON.stringify({ pairs: result.reports.length, passed: result.reports.filter(r => r.status === 'passed').length, output: path.resolve(output) }));
  if (result.reports.some(r => r.status !== 'passed')) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 2; });
module.exports = { compareRenderedHtml, compareFiles, runRenderedManifest, validateManifest, validateCheckpoints, validateProfiles, PROPERTIES };
