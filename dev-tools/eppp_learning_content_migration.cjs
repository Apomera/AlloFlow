'use strict';

const crypto = require('crypto');
const { JSDOM } = require('jsdom');

const FORBIDDEN_ELEMENTS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'video',
  'audio',
  'canvas',
]);

const INLINE_TYPES = new Map([
  ['strong', 'strong'],
  ['b', 'strong'],
  ['em', 'emphasis'],
  ['i', 'emphasis'],
  ['code', 'code'],
  ['sub', 'subscript'],
  ['sup', 'superscript'],
]);

const TEXT_BOUNDARY_ELEMENTS = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'div', 'dl', 'dt',
  'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);

const STRUCTURED_BLOCK_ELEMENTS = new Set([
  'address', 'article', 'aside', 'blockquote', 'div', 'dl', 'figure', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'main', 'nav', 'p', 'pre',
  'section',
]);

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function assertSafeFragment(fragment) {
  for (const element of fragment.querySelectorAll('*')) {
    const tag = element.tagName.toLowerCase();
    if (FORBIDDEN_ELEMENTS.has(tag)) {
      throw new Error(`Unsupported executable EPPP learning-content element: ${tag}`);
    }
    for (const attribute of element.getAttributeNames()) {
      const name = attribute.toLowerCase();
      if (
        name.startsWith('on')
        || ['style', 'src', 'srcset', 'xlink:href', 'action', 'formaction'].includes(name)
      ) {
        throw new Error(`Unsupported active EPPP learning-content attribute: ${name}`);
      }
      if (name === 'href') {
        const href = String(element.getAttribute(attribute) || '');
        if (!/^https:\/\//i.test(href)) {
          throw new Error(`Unsupported EPPP learning-content link: ${href}`);
        }
      }
    }
  }
}

function appendRun(runs, run) {
  if (!run) return;
  if (run.type === 'text' && !run.text) return;
  const previous = runs[runs.length - 1];
  if (run.type === 'text' && previous && previous.type === 'text') {
    previous.text += run.text;
    return;
  }
  runs.push(run);
}

function inlineRuns(nodes) {
  const runs = [];
  for (const node of nodes) {
    if (node.nodeType === 3) {
      appendRun(runs, { type: 'text', text: String(node.nodeValue || '').replace(/\s+/g, ' ') });
      continue;
    }
    if (node.nodeType !== 1) continue;
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') {
      appendRun(runs, { type: 'line-break' });
      continue;
    }
    const childRuns = inlineRuns(Array.from(node.childNodes));
    if (!childRuns.length) continue;
    const hasTextBoundary = TEXT_BOUNDARY_ELEMENTS.has(tag);
    if (hasTextBoundary) appendRun(runs, { type: 'text', text: ' ' });
    if (INLINE_TYPES.has(tag)) {
      appendRun(runs, { type: INLINE_TYPES.get(tag), children: childRuns });
      continue;
    }
    if (tag === 'a') {
      appendRun(runs, {
        type: 'link',
        url: String(node.getAttribute('href') || ''),
        children: childRuns,
      });
      continue;
    }
    for (const childRun of childRuns) appendRun(runs, childRun);
    if (hasTextBoundary) appendRun(runs, { type: 'text', text: ' ' });
  }
  return runs;
}

function textWithBoundaries(node) {
  if (node.nodeType === 3) return String(node.nodeValue || '');
  if (node.nodeType !== 1 && node.nodeType !== 11) return '';
  const text = Array.from(node.childNodes).map(textWithBoundaries).join('');
  if (node.nodeType === 1 && TEXT_BOUNDARY_ELEMENTS.has(node.tagName.toLowerCase())) {
    return ` ${text} `;
  }
  return text;
}

function paragraphFromNodes(nodes, variant) {
  const text = normalizeWhitespace(nodes.map(textWithBoundaries).join(''));
  if (!text) return null;
  const block = {
    type: 'paragraph',
    text,
    runs: inlineRuns(nodes),
  };
  if (variant) block.variant = variant;
  return block;
}

function paragraphBlock(element) {
  const variant = element.tagName
    && element.tagName.toLowerCase() === 'p'
    && element.classList.contains('formula')
    ? 'formula'
    : '';
  return paragraphFromNodes(Array.from(element.childNodes), variant);
}

function listBlock(element) {
  const items = Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((item) => {
      const nestedListElements = Array.from(item.children)
        .filter((child) => ['ul', 'ol'].includes(child.tagName.toLowerCase()));
      const nestedListSet = new Set(nestedListElements);
      const ownNodes = Array.from(item.childNodes).filter((node) => !nestedListSet.has(node));
      const record = {
        text: normalizeWhitespace(ownNodes.map(textWithBoundaries).join('')),
        runs: inlineRuns(ownNodes),
      };
      const children = nestedListElements.map(listBlock).filter(Boolean);
      if (children.length) record.children = children;
      return record;
    })
    .filter((item) => item.text || (item.children && item.children.length));
  if (!items.length) return paragraphBlock(element);
  return {
    type: 'list',
    ordered: element.tagName.toLowerCase() === 'ol',
    items,
  };
}

function tableBlock(element) {
  const rows = Array.from(element.querySelectorAll('tr')).map((row) => ({
    cells: Array.from(row.children)
      .filter((cell) => ['th', 'td'].includes(cell.tagName.toLowerCase()))
      .map((cell) => ({
        kind: cell.tagName.toLowerCase() === 'th' ? 'header' : 'cell',
        text: normalizeWhitespace(Array.from(cell.childNodes).map(textWithBoundaries).join('')),
        runs: inlineRuns(Array.from(cell.childNodes)),
        columnSpan: Math.max(1, Number(cell.getAttribute('colspan')) || 1),
      })),
  })).filter((row) => row.cells.length);
  if (!rows.length) return paragraphBlock(element);
  return { type: 'table', rows };
}

function structuredBlocks(fragment) {
  const blocks = [];
  let inlineNodes = [];
  const flushInlineNodes = () => {
    const block = paragraphFromNodes(inlineNodes);
    if (block) blocks.push(block);
    inlineNodes = [];
  };
  for (const node of fragment.childNodes) {
    if (node.nodeType === 3) {
      inlineNodes.push(node);
      continue;
    }
    if (node.nodeType !== 1) continue;
    const tag = node.tagName.toLowerCase();
    if (tag === 'ul' || tag === 'ol' || tag === 'table' || STRUCTURED_BLOCK_ELEMENTS.has(tag)) {
      flushInlineNodes();
      if (tag === 'ul' || tag === 'ol') {
        const block = listBlock(node);
        if (block) blocks.push(block);
      } else if (tag === 'table') {
        const block = tableBlock(node);
        if (block) blocks.push(block);
      } else if (tag === 'p' || !node.querySelector('p, ul, ol, table')) {
        const block = paragraphBlock(node);
        if (block) blocks.push(block);
      } else {
        blocks.push(...structuredBlocks(node));
      }
      continue;
    }
    inlineNodes.push(node);
  }
  flushInlineNodes();
  return blocks;
}

function plainTextFromBlock(block) {
  if (block.type === 'paragraph') return block.text;
  if (block.type === 'list') {
    return block.items.map((item) => [
      item.text,
      ...(Array.isArray(item.children) ? item.children.map(plainTextFromBlock) : []),
    ].filter(Boolean).join('\n')).join('\n');
  }
  if (block.type === 'table') {
    return block.rows.map((row) => row.cells.map((cell) => cell.text).join(' | ')).join('\n');
  }
  return '';
}

function plainTextFromBlocks(blocks) {
  return blocks.map(plainTextFromBlock).filter(Boolean).join('\n\n');
}

function migrateLegacyHtmlContent(value) {
  const source = String(value || '');
  const fragment = JSDOM.fragment(source);
  assertSafeFragment(fragment);
  const blocks = structuredBlocks(fragment);
  const plainText = plainTextFromBlocks(blocks);
  return {
    source,
    plainText,
    blocks,
    sourceCharacters: source.length,
    plainTextCharacters: plainText.length,
    fingerprints: {
      algorithm: 'sha256',
      legacySource: sha256(source),
      plainText: sha256(plainText),
      structuredBlocks: sha256(JSON.stringify(blocks)),
    },
  };
}

function migrateLegacyTextRecord(record, fields) {
  const sourceRecord = record && typeof record === 'object' ? record : {};
  const rawFields = {};
  const plainFields = {};
  const structuredFields = {};
  let sourceCharacters = 0;
  let plainTextCharacters = 0;
  for (const field of fields) {
    const migration = migrateLegacyHtmlContent(sourceRecord[field]);
    rawFields[field] = migration.source;
    plainFields[field] = migration.plainText;
    structuredFields[field] = migration.blocks;
    sourceCharacters += migration.sourceCharacters;
    plainTextCharacters += migration.plainTextCharacters;
  }
  return {
    schemaVersion: 1,
    ...plainFields,
    structuredFields,
    sourceCharacters,
    plainTextCharacters,
    contentFingerprints: {
      algorithm: 'sha256',
      legacySource: sha256(JSON.stringify(rawFields)),
      plainText: sha256(JSON.stringify(plainFields)),
      structuredFields: sha256(JSON.stringify(structuredFields)),
    },
  };
}

function fingerprintManifest(entries) {
  return sha256(JSON.stringify(entries));
}

module.exports = {
  fingerprintManifest,
  migrateLegacyHtmlContent,
  migrateLegacyTextRecord,
  normalizeWhitespace,
  sha256,
};
