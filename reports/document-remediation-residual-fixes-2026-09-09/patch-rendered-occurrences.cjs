'use strict';
const fs = require('node:fs');
const file = 'dev-tools/rendered_document_fidelity.cjs';
let source = fs.readFileSync(file, 'utf8');
function replace(before, after) {
  if (!source.includes(before)) throw Error('Missing patch anchor: ' + before.slice(0, 100));
  source = source.replace(before, after);
}
replace('function accessibilityText(rootId, nodes) {', `// Canonical character offsets bind exposure to the original occurrence, even
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
    if (/^\\s+$/u.test(normalized)) { pendingSpace = text.length > 0; continue; }
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
function accessibilityText(rootId, nodes) {`);
replace("    const { root } = await session.send('DOM.getDocument', { depth: 0 });", `    const needsOccurrences = checkpoints.some(checkpoint => checkpoint.properties.includes('text') && checkpoint.properties.includes('exposed'));
    if (needsOccurrences) await session.send('DOM.enable', { includeWhitespace: 'all' });
    const { root } = await session.send('DOM.getDocument', { depth: needsOccurrences ? -1 : 0 });
    const domNodes = new Map(), pendingNodes = [root];
    while (pendingNodes.length) {
      const node = pendingNodes.pop(); domNodes.set(node.nodeId, node);
      pendingNodes.push(...(node.children || []));
    }
    let fullAXTree;`);
replace(`          const descendantText = () => {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), text = [];
            for (let node = walker.nextNode(); node; node = walker.nextNode()) if (textIsVisible(node)) text.push(node.textContent);
            return normal(text.join(''));
          };`, `          const textParts = () => {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), parts = [];
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              const path = [];
              for (let current = node; current !== el; current = current.parentNode) path.unshift(Array.prototype.indexOf.call(current.parentNode.childNodes, current));
              parts.push({ path, text: node.textContent, visible: requested.has('visible') ? textIsVisible(node) : false });
            }
            return parts;
          };`);
replace(`          if (requested.has('text') && requested.has('visible')) textEvidence.visibleText = descendantText();
          return { values: result, textEvidence };`, `          const parts = requested.has('text') && (requested.has('visible') || requested.has('exposed')) ? textParts() : null;
          if (requested.has('text') && requested.has('visible')) textEvidence.visibleText = normal(parts.filter(part => part.visible).map(part => part.text).join(''));
          return { values: result, textEvidence, parts };`);
replace(`          const tree = await session.send('Accessibility.getFullAXTree');
          dom.textEvidence.exposedText = ax.ignored ? '' : accessibilityText(ax.nodeId, tree.nodes);`, `          fullAXTree ||= await session.send('Accessibility.getFullAXTree');
          dom.textEvidence.exposedText = ax.ignored ? '' : accessibilityText(ax.nodeId, fullAXTree.nodes);
          const exposedNodes = new Set(fullAXTree.nodes.filter(node => !node.ignored && node.role?.value === 'StaticText').map(node => node.backendDOMNodeId));
          for (const part of dom.parts) {
            let textNode = domNodes.get(nodeId);
            for (const index of part.path) textNode = textNode?.children?.[index];
            if (!textNode || textNode.nodeType !== 3 || textNode.nodeValue !== part.text) throw Error('Text occurrence accessibility mapping unavailable');
            part.exposed = !ax.ignored && exposedNodes.has(textNode.backendNodeId);
          }`);
replace(`        // Bound only selected observations (including their derived text evidence).`, `        if (dom.parts) dom.textOccurrences = textOccurrences(dom.parts, ['visible', 'exposed'].filter(property => checkpoint.properties.includes(property)));
        // Bound only selected observations (including their derived text evidence).`);
replace(`        const boundedValues = [...checkpoint.properties.map(property => dom.values[property]), ...Object.values(dom.textEvidence)];`, `        const boundedValues = [...checkpoint.properties.map(property => dom.values[property]), ...Object.values(dom.textEvidence), dom.textOccurrences];`);
replace(`values: Object.fromEntries(checkpoint.properties.map(p => [p, dom.values[p]])), textEvidence: dom.textEvidence });`, `values: Object.fromEntries(checkpoint.properties.map(p => [p, dom.values[p]])), textEvidence: dom.textEvidence, textOccurrences: dom.textOccurrences });`);
replace(`    // Pairing text with visibility/exposure preserves the words within the
    // checkpoint, not just the container's box or accessibility node.`, `    // Preserve each originally visible/exposed occurrence in the complete DOM
    // text, not a matching word sequence borrowed from a newly revealed copy.`);
replace(`      properties.push({ property, status: output == null ? 'unavailable' : preservesExposedWords(original, output) ? 'passed' : 'failed', source: original, candidate: output });`, `      const occurrenceProperty = property === 'visibleText' ? 'visible' : 'exposed';
      const preserved = preservesOccurrences(before.textOccurrences, after.textOccurrences, occurrenceProperty);
      // Native accessible alternatives without DOM text retain the existing
      // additional check; DOM text must independently retain its own positions.
      const textPreserved = property !== 'exposedText' || preservesExposedWords(original, output || '');
      properties.push({ property, status: output == null || preserved == null ? 'unavailable' : preserved && textPreserved ? 'passed' : 'failed', source: original, candidate: output,
        occurrences: { basis: 'canonical-dom-text-offsets', source: before.textOccurrences?.[occurrenceProperty], candidate: after.textOccurrences?.[occurrenceProperty] } });`);
fs.writeFileSync(file, source);
const docs = 'docs/rendered-document-fidelity.md';
let doc = fs.readFileSync(docs, 'utf8');
const before = 'Pairing `text` with `visible` also checks the visible descendant words, and pairing `text` with `exposed` checks descendant text in Chromium’s accessibility tree. Reports include these derived checks as `visibleText` and `exposedText`. Existing words must remain in order; revealing words already present but hidden in the source is allowed. Container visibility or exposure alone does not establish preservation of every word. These observations are not a screen reader transcript.';
if (!doc.includes(before)) throw Error('Missing documentation anchor');
doc = doc.replace(before, 'Pairing `text` with `visible` also checks visible descendant text, and pairing `text` with `exposed` checks descendant text in Chromium’s accessibility tree. Reports include these derived checks as `visibleText` and `exposedText`, with occurrence ranges anchored to offsets in the complete NFC-normalized checkpoint text. Each originally visible or exposed occurrence must survive at its original text position; revealing a duplicate cannot compensate for losing a word from the original instruction. Harmless markup rewrapping, canonical Unicode equivalents, and restoration of previously hidden text remain allowed. Native accessibility text nodes are associated with their DOM text nodes; unavailable mappings prevent a complete pass. Accessible alternatives without DOM text retain an additional ordered-text check; use explicit `name` checkpoints when those alternatives require occurrence-level identity. Container visibility or exposure alone does not establish preservation of every word. These observations are not a screen reader transcript.');
fs.writeFileSync(docs, doc);
