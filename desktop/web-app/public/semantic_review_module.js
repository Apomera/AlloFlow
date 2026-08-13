(function(){"use strict";
if(window.AlloModules&&window.AlloModules.SemanticReviewModule){console.log("[CDN] SemanticReviewModule already loaded, skipping"); return;}
const SEMANTIC_ID_ATTRIBUTE = 'data-allo-semantic-id';
const EVIDENCE_INVALIDATION_REASON = 'content-modified-pending-reverification';
const MAX_TREE_NODES = 5000;

// Keep this map aligned with doc_pipeline_source.jsx. The Review Studio uses
// the same HTML semantics from which the tagged-PDF structure tree is built.
const TAG_TO_PDF_ROLE = Object.freeze({
  h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6',
  p: 'P', ul: 'L', ol: 'L', li: 'LI', img: 'Figure', figure: 'Figure',
  table: 'Table', tr: 'TR', th: 'TH', td: 'TD', caption: 'Caption',
  thead: 'THead', tbody: 'TBody', tfoot: 'TFoot',
  blockquote: 'BlockQuote', a: 'Link',
  header: 'NonStruct', footer: 'NonStruct',
  section: 'Sect', nav: 'Sect', aside: 'Sect', main: 'Sect',
});

const SEMANTIC_SELECTOR = Object.keys(TAG_TO_PDF_ROLE).join(',');
const RETAG_TARGETS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote']);
const ID_PATTERN = /^sem-[a-z0-9][a-z0-9_-]{2,79}$/i;
const LANGUAGE_PATTERN = /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i;

function parseHtml(html) {
  if (typeof html !== 'string') return null;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc && doc.documentElement && doc.body ? doc : null;
  } catch (_) {
    return null;
  }
}

function serializeDocument(doc) {
  if (!doc || !doc.documentElement) return '';
  const name = doc.doctype && doc.doctype.name ? doc.doctype.name : 'html';
  return '<!DOCTYPE ' + name + '>\n' + doc.documentElement.outerHTML;
}

function normalizedText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength || 120);
}

function fnv1a(value) {
  let hash = 2166136261;
  const source = String(value || '');
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function structuralPath(element) {
  const parts = [];
  let current = element;
  while (current && current.nodeType === 1 && current.tagName.toLowerCase() !== 'body') {
    let ordinal = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) ordinal += 1;
      sibling = sibling.previousElementSibling;
    }
    parts.push(current.tagName.toLowerCase() + ':' + ordinal);
    current = current.parentElement;
  }
  return parts.reverse().join('/');
}

function semanticIdSeed(element) {
  const tag = element.tagName.toLowerCase();
  const text = tag === 'img'
    ? (element.getAttribute('alt') || element.getAttribute('src') || '')
    : normalizedText(element.textContent, 160);
  return structuralPath(element) + '|' + tag + '|' + text;
}

function assignStableNodeIds(doc) {
  const elements = Array.from(doc.body.querySelectorAll(SEMANTIC_SELECTOR)).slice(0, MAX_TREE_NODES);
  const used = new Set();
  let added = 0;
  let replaced = 0;
  elements.forEach((element, index) => {
    const existing = String(element.getAttribute(SEMANTIC_ID_ATTRIBUTE) || '').trim();
    if (ID_PATTERN.test(existing) && !used.has(existing)) {
      used.add(existing);
      return;
    }
    let candidate = 'sem-' + fnv1a(semanticIdSeed(element));
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = 'sem-' + fnv1a(semanticIdSeed(element)) + '-' + suffix;
      suffix += 1;
    }
    element.setAttribute(SEMANTIC_ID_ATTRIBUTE, candidate);
    used.add(candidate);
    if (existing) replaced += 1;
    else added += 1;
  });
  return { added, replaced, count: elements.length };
}

function ensureStableNodeIds(html) {
  const doc = parseHtml(html);
  if (!doc) return { ok: false, html: typeof html === 'string' ? html : '', added: 0, replaced: 0, count: 0, error: 'invalid-html' };
  const result = assignStableNodeIds(doc);
  return { ok: true, html: serializeDocument(doc), ...result };
}

function isArtifact(element) {
  if (!element) return false;
  return element.getAttribute('role') === 'presentation' || element.getAttribute('aria-hidden') === 'true';
}

function imageForNode(element) {
  if (!element) return null;
  return element.tagName.toLowerCase() === 'img' ? element : element.querySelector('img');
}

function tableProperties(table) {
  const rows = Array.from(table.querySelectorAll('tr'));
  const headers = Array.from(table.querySelectorAll('th'));
  const firstRowCells = rows[0] ? Array.from(rows[0].children).filter((cell) => /^(TD|TH)$/.test(cell.tagName)) : [];
  const firstColumnCells = rows.map((row) => row.children[0]).filter((cell) => cell && /^(TD|TH)$/.test(cell.tagName));
  return {
    rowCount: rows.length,
    columnCount: rows.reduce((count, row) => Math.max(count, Array.from(row.children).filter((cell) => /^(TD|TH)$/.test(cell.tagName)).length), 0),
    headerCellCount: headers.length,
    missingScopeCount: headers.filter((header) => !header.getAttribute('scope')).length,
    firstRowHeaders: firstRowCells.length > 0 && firstRowCells.every((cell) => cell.tagName === 'TH' && cell.getAttribute('scope') === 'col'),
    firstColumnHeaders: firstColumnCells.length > 0 && firstColumnCells.every((cell) => cell.tagName === 'TH' && cell.getAttribute('scope') === 'row'),
  };
}

function nodeWarnings(element, previousHeadingLevel) {
  const warnings = [];
  const tag = element.tagName.toLowerCase();
  const headingMatch = /^h([1-6])$/.exec(tag);
  if (headingMatch) {
    const level = Number(headingMatch[1]);
    if (previousHeadingLevel > 0 && level - previousHeadingLevel > 1) warnings.push('Skipped heading level (h' + previousHeadingLevel + ' to h' + level + ')');
    if (!normalizedText(element.textContent, 1)) warnings.push('Empty heading');
  }
  if (tag === 'img' || tag === 'figure') {
    const image = imageForNode(element);
    const caption = tag === 'figure' ? normalizedText(element.querySelector('figcaption')?.textContent, 120) : '';
    if (!isArtifact(image || element) && !normalizedText(image?.getAttribute('alt'), 120) && !caption) warnings.push('Missing alt text or caption');
  }
  if (tag === 'table') {
    const properties = tableProperties(element);
    if (properties.headerCellCount === 0) warnings.push('No header cells (<th>)');
    else if (properties.missingScopeCount > 0) warnings.push(properties.missingScopeCount + ' header cell(s) missing scope');
  }
  return warnings;
}

function nodeText(element) {
  const tag = element.tagName.toLowerCase();
  if (tag === 'img') return normalizedText(element.getAttribute('alt') || '(no alt)', 120);
  if (tag === 'table') return tableProperties(element).rowCount + ' row(s)';
  if (tag === 'ul' || tag === 'ol') return Array.from(element.children).filter((child) => child.tagName === 'LI').length + ' item(s)';
  return normalizedText(element.textContent, 120);
}

function nodeAttributes(element) {
  const result = {};
  ['id', 'role', 'aria-hidden', 'alt', 'lang', 'scope', 'href'].forEach((name) => {
    if (element.hasAttribute(name)) result[name] = element.getAttribute(name);
  });
  return result;
}

function nodeProperties(element) {
  const tag = element.tagName.toLowerCase();
  const headingMatch = /^h([1-6])$/.exec(tag);
  const image = tag === 'img' || tag === 'figure' ? imageForNode(element) : null;
  const properties = {
    artifact: isArtifact(image || element),
    language: element.getAttribute('lang') || '',
    headingLevel: headingMatch ? Number(headingMatch[1]) : null,
  };
  if (image) properties.alt = image.getAttribute('alt') || '';
  if (tag === 'th') properties.scope = element.getAttribute('scope') || '';
  if (tag === 'table') properties.table = tableProperties(element);
  return properties;
}

function buildSemanticTree(html) {
  const doc = parseHtml(html);
  if (!doc) return { ok: false, html: typeof html === 'string' ? html : '', roots: [], flat: [], document: { language: '', title: '' }, error: 'invalid-html' };
  const idResult = assignStableNodeIds(doc);
  const elements = Array.from(doc.body.querySelectorAll(SEMANTIC_SELECTOR)).slice(0, MAX_TREE_NODES);
  const nodeByElement = new Map();
  const roots = [];
  const flat = [];
  let previousHeadingLevel = 0;
  elements.forEach((element) => {
    const tag = element.tagName.toLowerCase();
    const headingMatch = /^h([1-6])$/.exec(tag);
    const node = {
      id: element.getAttribute(SEMANTIC_ID_ATTRIBUTE),
      role: TAG_TO_PDF_ROLE[tag] || 'P',
      tag,
      text: nodeText(element),
      warnings: nodeWarnings(element, previousHeadingLevel),
      attributes: nodeAttributes(element),
      properties: nodeProperties(element),
      children: [],
    };
    if (headingMatch) previousHeadingLevel = Number(headingMatch[1]);
    let ancestor = element.parentElement;
    while (ancestor && !nodeByElement.has(ancestor)) ancestor = ancestor.parentElement;
    if (ancestor) nodeByElement.get(ancestor).children.push(node);
    else roots.push(node);
    nodeByElement.set(element, node);
    flat.push(node);
  });
  return {
    ok: true,
    html: serializeDocument(doc),
    roots,
    flat,
    document: {
      language: doc.documentElement.getAttribute('lang') || '',
      title: normalizedText(doc.querySelector('title')?.textContent || doc.querySelector('h1')?.textContent, 200),
    },
    ...idResult,
    truncated: elements.length >= MAX_TREE_NODES,
  };
}

function findSemanticNode(doc, nodeId) {
  if (!nodeId) return null;
  return Array.from(doc.body.querySelectorAll('[' + SEMANTIC_ID_ATTRIBUTE + ']'))
    .find((element) => element.getAttribute(SEMANTIC_ID_ATTRIBUTE) === nodeId) || null;
}

function replaceTag(element, doc, newTag) {
  const replacement = doc.createElement(newTag);
  Array.from(element.attributes).forEach((attribute) => replacement.setAttribute(attribute.name, attribute.value));
  while (element.firstChild) replacement.appendChild(element.firstChild);
  element.replaceWith(replacement);
  return replacement;
}

function setCellHeader(doc, cell, scope) {
  let header = cell;
  if (cell.tagName !== 'TH') header = replaceTag(cell, doc, 'th');
  header.setAttribute('scope', scope);
}

function applyTableHeaders(doc, table, mode) {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (!rows.length) return false;
  if (mode === 'first-row' || mode === 'both') {
    Array.from(rows[0].children).filter((cell) => /^(TD|TH)$/.test(cell.tagName)).forEach((cell) => setCellHeader(doc, cell, 'col'));
  }
  if (mode === 'first-column' || mode === 'both') {
    rows.forEach((row, rowIndex) => {
      const cell = row.children[0];
      if (!cell || !/^(TD|TH)$/.test(cell.tagName)) return;
      // In a two-axis table the corner cell describes its column first.
      setCellHeader(doc, cell, mode === 'both' && rowIndex === 0 ? 'col' : 'row');
    });
  }
  return true;
}

function commandFailure(html, command, error, targetId) {
  return { ok: false, changed: false, html, entry: null, summary: '', targetId: targetId || '', reason: '', error, command: command || null };
}

function applySemanticCommand(html, command) {
  const doc = parseHtml(html);
  if (!doc) return commandFailure(typeof html === 'string' ? html : '', command, 'invalid-html', command?.nodeId);
  if (!command || typeof command !== 'object' || typeof command.type !== 'string') return commandFailure(serializeDocument(doc), command, 'invalid-command', command?.nodeId);
  assignStableNodeIds(doc);
  const type = command.type;
  let targetId = String(command.nodeId || '');
  let target = targetId ? findSemanticNode(doc, targetId) : null;
  if (type !== 'set-language' && !target) return commandFailure(serializeDocument(doc), command, 'node-not-found', targetId);
  if (type === 'set-language' && targetId && !target) return commandFailure(serializeDocument(doc), command, 'node-not-found', targetId);
  const before = serializeDocument(doc);
  let summary = '';

  if (type === 'retag') {
    const newTag = String(command.tag || '').toLowerCase();
    if (!RETAG_TARGETS.has(newTag)) return commandFailure(before, command, 'unsupported-tag', targetId);
    if (!RETAG_TARGETS.has(target.tagName.toLowerCase())) return commandFailure(before, command, 'target-cannot-be-retagged', targetId);
    if (target.tagName.toLowerCase() !== newTag) replaceTag(target, doc, newTag);
    summary = 'Retagged ' + targetId + ' as ' + newTag.toUpperCase();
  } else if (type === 'move') {
    const direction = command.direction;
    if (direction !== 'up' && direction !== 'down') return commandFailure(before, command, 'invalid-direction', targetId);
    const sibling = direction === 'up' ? target.previousElementSibling : target.nextElementSibling;
    if (sibling && target.parentNode) {
      if (direction === 'up') target.parentNode.insertBefore(target, sibling);
      else target.parentNode.insertBefore(sibling, target);
    }
    summary = 'Moved ' + targetId + ' ' + direction + ' in reading order';
  } else if (type === 'set-artifact') {
    const tag = target.tagName.toLowerCase();
    if (tag !== 'img' && tag !== 'figure') return commandFailure(before, command, 'target-is-not-an-image', targetId);
    const image = imageForNode(target);
    const artifactTarget = image || target;
    if (command.artifact === true) {
      artifactTarget.setAttribute('role', 'presentation');
      artifactTarget.setAttribute('aria-hidden', 'true');
      if (image) image.setAttribute('alt', '');
    } else if (command.artifact === false) {
      artifactTarget.removeAttribute('role');
      artifactTarget.removeAttribute('aria-hidden');
    } else return commandFailure(before, command, 'artifact-must-be-boolean', targetId);
    summary = (command.artifact ? 'Marked ' : 'Restored ') + targetId + (command.artifact ? ' as an artifact' : ' as content');
  } else if (type === 'set-alt') {
    const image = imageForNode(target);
    if (!image) return commandFailure(before, command, 'target-is-not-an-image', targetId);
    if (typeof command.alt !== 'string') return commandFailure(before, command, 'alt-must-be-string', targetId);
    image.setAttribute('alt', normalizedText(command.alt, 1000));
    if (normalizedText(command.alt, 1000)) {
      image.removeAttribute('role');
      image.removeAttribute('aria-hidden');
    }
    summary = 'Updated alternative text for ' + targetId;
  } else if (type === 'set-language') {
    const language = String(command.language || '').trim();
    if (!LANGUAGE_PATTERN.test(language)) return commandFailure(before, command, 'invalid-language', targetId || 'document');
    const languageTarget = target || doc.documentElement;
    languageTarget.setAttribute('lang', language);
    targetId = targetId || 'document';
    summary = 'Set language for ' + targetId + ' to ' + language;
  } else if (type === 'set-table-headers') {
    if (target.tagName.toLowerCase() !== 'table') return commandFailure(before, command, 'target-is-not-a-table', targetId);
    const aliases = { firstRowHeader: 'first-row', firstColHeader: 'first-column' };
    const mode = aliases[command.mode] || command.mode;
    if (!['first-row', 'first-column', 'both'].includes(mode)) return commandFailure(before, command, 'invalid-table-header-mode', targetId);
    applyTableHeaders(doc, target, mode);
    summary = 'Applied ' + mode + ' headers to ' + targetId;
  } else {
    return commandFailure(before, command, 'unsupported-command', targetId);
  }

  const output = serializeDocument(doc);
  const changed = output !== before;
  const entry = {
    type,
    targetId,
    summary,
    details: Object.fromEntries(Object.entries(command).filter(([key]) => key !== 'type' && key !== 'nodeId')),
  };
  return {
    ok: true,
    changed,
    html: output,
    entry,
    summary,
    targetId,
    reason: changed ? EVIDENCE_INVALIDATION_REASON : 'no-change',
    error: '',
    command,
  };
}

window.AlloModules = window.AlloModules || {};
window.AlloModules.SemanticReview = Object.freeze({
  SEMANTIC_ID_ATTRIBUTE,
  EVIDENCE_INVALIDATION_REASON,
  TAG_TO_PDF_ROLE,
  ensureStableNodeIds,
  buildSemanticTree,
  applySemanticCommand,
});
window.AlloModules.SemanticReviewModule = true;
})();
