'use strict';

const crypto = require('crypto');
const vm = require('vm');
const { JSDOM } = require('jsdom');
const {
  EPPP_ARCHIVE_ROOT_RELATIVE,
} = require('./eppp_archive_paths.cjs');

const migrationSourceAsset = (relativePath) => `${EPPP_ARCHIVE_ROOT_RELATIVE}/${relativePath}`;
const VECTOR_FORMAT = 'alloflow-inert-vector-v1';
const GLOSSARY_FORMAT = 'alloflow-native-glossary-v1';

const VECTOR_ELEMENT_TYPES = Object.freeze({
  g: 'group',
  rect: 'rect',
  circle: 'circle',
  ellipse: 'ellipse',
  line: 'line',
  path: 'path',
  polygon: 'polygon',
  text: 'text',
  title: 'accessibility-title',
  desc: 'accessibility-description',
  use: 'use',
  defs: 'definitions',
  lineargradient: 'linear-gradient',
  radialgradient: 'radial-gradient',
  stop: 'gradient-stop',
  marker: 'marker',
  clippath: 'clip-path',
  filter: 'filter',
  fegaussianblur: 'gaussian-blur',
  fecomposite: 'composite',
  fedropshadow: 'drop-shadow',
});

const ELEMENT_ATTRIBUTE_ALLOWLIST = Object.freeze({
  g: ['id', 'transform', 'fill', 'filter', 'font-family', 'font-size', 'font-weight', 'marker-end', 'opacity', 'stroke', 'stroke-dasharray', 'stroke-width', 'text-anchor'],
  rect: ['id', 'x', 'y', 'width', 'height', 'rx', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'filter', 'transform'],
  circle: ['id', 'cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'filter', 'transform'],
  ellipse: ['id', 'cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'filter', 'transform'],
  line: ['id', 'x1', 'x2', 'y1', 'y2', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity', 'marker-start', 'marker-end', 'transform'],
  path: ['id', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity', 'marker-start', 'marker-end', 'clip-path', 'filter', 'transform'],
  polygon: ['id', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'transform'],
  text: ['id', 'x', 'y', 'fill', 'fill-opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'opacity', 'transform'],
  title: ['id'],
  desc: ['id'],
  use: ['id', 'href', 'x', 'y', 'fill', 'stroke', 'opacity', 'transform'],
  defs: ['id'],
  lineargradient: ['id', 'x1', 'x2', 'y1', 'y2', 'gradientunits', 'gradienttransform'],
  radialgradient: ['id', 'cx', 'cy', 'r', 'fx', 'fy', 'gradientunits', 'gradienttransform'],
  stop: ['id', 'offset', 'stop-color', 'stop-opacity'],
  marker: ['id', 'markerwidth', 'markerheight', 'refx', 'refy', 'orient', 'viewbox', 'markerunits'],
  clippath: ['id', 'clippathunits', 'transform'],
  filter: ['id', 'x', 'y', 'width', 'height', 'filterunits'],
  fegaussianblur: ['id', 'in', 'stddeviation', 'result'],
  fecomposite: ['id', 'in', 'in2', 'operator', 'k1', 'k2', 'k3', 'k4', 'result'],
  fedropshadow: ['id', 'dx', 'dy', 'stddeviation', 'flood-color', 'flood-opacity', 'result'],
});

const STATIC_STYLE_PROPERTIES = new Set([
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'marker-start',
  'marker-end',
  'clip-path',
  'filter',
  'rx',
]);

const MOTION_ATTRIBUTES = new Set([
  'cx', 'cy', 'fill', 'opacity', 'r', 'rx', 'ry', 'stroke', 'transform', 'x', 'y',
]);

const FORBIDDEN_VECTOR_ELEMENTS = new Set([
  'script', 'foreignobject', 'iframe', 'object', 'embed', 'image', 'a',
  'audio', 'video', 'canvas', 'form', 'input', 'button',
]);

const LOCAL_REFERENCE_ATTRIBUTES = new Set([
  'clip-path', 'filter', 'marker-start', 'marker-end',
]);

const SAFE_ID = /^[A-Za-z_][A-Za-z0-9_.:-]*$/;
const SAFE_LOCAL_HREF = /^#[A-Za-z_][A-Za-z0-9_.:-]*$/;
const SAFE_LOCAL_URL = /^url\(\s*#[A-Za-z_][A-Za-z0-9_.:-]*\s*\)$/i;
const UNSAFE_VALUE = /(?:javascript\s*:|data\s*:|vbscript\s*:|https?\s*:|\/\/|expression\s*\(|@import|<|>)/i;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function normalizeWhitespace(value) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function normalizeTerm(value) {
  return normalizeWhitespace(value).toLocaleLowerCase('en-US');
}

function slug(value) {
  return normalizeWhitespace(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function stableId(prefix, value) {
  return `${prefix}-${sha256(value).slice(0, 16)}`;
}

function plainText(value) {
  const source = String(value || '');
  const fragment = JSDOM.fragment(source);
  if (fragment.querySelector('*')) {
    for (const element of fragment.querySelectorAll('*')) {
      const tag = element.tagName.toLowerCase();
      if (tag !== 'br' && tag !== 'span' && tag !== 'strong' && tag !== 'em' && tag !== 'sub' && tag !== 'sup') {
        throw new Error(`Unsupported EPPP glossary markup element: ${tag}`);
      }
      for (const attribute of element.getAttributeNames()) {
        if (attribute.toLowerCase().startsWith('on') || attribute.toLowerCase() === 'style') {
          throw new Error(`Unsupported active EPPP glossary attribute: ${attribute}`);
        }
      }
    }
  }
  return normalizeWhitespace(fragment.textContent || source);
}

function parseViewBox(value) {
  const parts = String(value || '').trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part)) || parts[2] <= 0 || parts[3] <= 0) {
    throw new Error(`EPPP native diagram requires a finite positive viewBox: ${value}`);
  }
  return {
    minX: parts[0],
    minY: parts[1],
    width: parts[2],
    height: parts[3],
  };
}

function removeCssAtRules(css) {
  let output = '';
  let index = 0;
  while (index < css.length) {
    if (css[index] !== '@') {
      output += css[index];
      index += 1;
      continue;
    }
    const braceIndex = css.indexOf('{', index);
    const semicolonIndex = css.indexOf(';', index);
    if (semicolonIndex !== -1 && (braceIndex === -1 || semicolonIndex < braceIndex)) {
      index = semicolonIndex + 1;
      continue;
    }
    if (braceIndex === -1) break;
    let depth = 1;
    index = braceIndex + 1;
    while (index < css.length && depth > 0) {
      if (css[index] === '{') depth += 1;
      else if (css[index] === '}') depth -= 1;
      index += 1;
    }
  }
  return output;
}

function validatePresentationValue(property, value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized || UNSAFE_VALUE.test(normalized)) {
    throw new Error(`Unsafe EPPP native diagram presentation value for ${property}: ${value}`);
  }
  if (property === 'href') {
    if (!SAFE_LOCAL_HREF.test(normalized)) throw new Error(`Unsafe EPPP native diagram href: ${value}`);
  } else if (LOCAL_REFERENCE_ATTRIBUTES.has(property)) {
    if (!SAFE_LOCAL_URL.test(normalized)) throw new Error(`Unsafe EPPP native diagram reference: ${value}`);
  } else if (property === 'id') {
    if (!SAFE_ID.test(normalized)) throw new Error(`Unsafe EPPP native diagram id: ${value}`);
  } else if (normalized.length > 8192 || /[{};]/.test(normalized)) {
    throw new Error(`Unsupported EPPP native diagram value for ${property}: ${value}`);
  }
  return normalized;
}

function safeStaticDeclarations(value) {
  const declarations = {};
  for (const rawDeclaration of String(value || '').split(';')) {
    const separator = rawDeclaration.indexOf(':');
    if (separator < 1) continue;
    const property = rawDeclaration.slice(0, separator).trim().toLowerCase();
    const rawValue = rawDeclaration.slice(separator + 1).trim();
    if (!property || !rawValue) continue;
    if (UNSAFE_VALUE.test(rawValue)) {
      throw new Error(`Unsafe EPPP native diagram style value for ${property}: ${rawValue}`);
    }
    if (!STATIC_STYLE_PROPERTIES.has(property)) continue;
    declarations[property] = validatePresentationValue(property, rawValue);
  }
  return declarations;
}

function parseStaticClassStyles(styleElements) {
  const stylesByClass = new Map();
  for (const styleElement of styleElements) {
    const rawCss = String(styleElement.textContent || '');
    if (UNSAFE_VALUE.test(rawCss)) throw new Error('Unsafe URL or executable construct in EPPP native diagram stylesheet.');
    const css = removeCssAtRules(rawCss.replace(/\/\*[\s\S]*?\*\//g, ' '));
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const classNames = match[1].split(',').map((part) => part.trim())
        .map((selector) => selector.match(/^\.([A-Za-z_][A-Za-z0-9_-]*)$/))
        .filter(Boolean)
        .map((classMatch) => classMatch[1]);
      if (!classNames.length) continue;
      const declarations = safeStaticDeclarations(match[2]);
      for (const className of classNames) {
        const current = stylesByClass.get(className) || {};
        stylesByClass.set(className, { ...current, ...declarations });
      }
    }
  }
  return stylesByClass;
}

function sanitizedElementAttributes(element, stylesByClass) {
  const tag = element.tagName.toLowerCase();
  const allowed = new Set(ELEMENT_ATTRIBUTE_ALLOWLIST[tag] || []);
  const attributes = {};
  const classStyles = {};
  for (const className of String(element.getAttribute('class') || '').split(/\s+/).filter(Boolean)) {
    Object.assign(classStyles, stylesByClass.get(className) || {});
  }
  const inlineStyles = safeStaticDeclarations(element.getAttribute('style') || '');
  const presentation = { ...classStyles, ...inlineStyles };
  for (const [name, value] of Object.entries(presentation)) {
    if (allowed.has(name)) attributes[name] = validatePresentationValue(name, value);
  }
  for (const attribute of element.getAttributeNames()) {
    const name = attribute.toLowerCase();
    const value = element.getAttribute(attribute);
    if (name.startsWith('on')) throw new Error(`Event handler is forbidden in EPPP native diagram: ${name}`);
    if (['style', 'class'].includes(name)) continue;
    if (!allowed.has(name)) {
      throw new Error(`Unsupported ${tag} attribute in EPPP native diagram: ${name}`);
    }
    attributes[name] = validatePresentationValue(name, value);
  }
  return Object.fromEntries(Object.entries(attributes).sort(([left], [right]) => left.localeCompare(right)));
}

function migrateLegacySvgDiagram(diagram, metadata = {}) {
  const rawSvg = String(diagram && diagram.svg || '');
  const fragment = JSDOM.fragment(rawSvg);
  const roots = Array.from(fragment.childNodes).filter((node) => (
    node.nodeType === 1 || (node.nodeType === 3 && String(node.nodeValue || '').trim())
  ));
  if (roots.length !== 1 || roots[0].nodeType !== 1 || roots[0].tagName.toLowerCase() !== 'svg') {
    throw new Error('EPPP native diagram source must contain exactly one SVG root.');
  }
  const root = roots[0];
  for (const element of root.querySelectorAll('*')) {
    const tag = element.tagName.toLowerCase();
    if (FORBIDDEN_VECTOR_ELEMENTS.has(tag)) {
      throw new Error(`Forbidden EPPP native diagram element: ${tag}`);
    }
    if (tag !== 'style' && tag !== 'animate' && !VECTOR_ELEMENT_TYPES[tag]) {
      throw new Error(`Unsupported EPPP native diagram element: ${tag}`);
    }
    for (const attribute of element.getAttributeNames()) {
      if (attribute.toLowerCase().startsWith('on')) {
        throw new Error(`Event handler is forbidden in EPPP native diagram: ${attribute}`);
      }
    }
  }
  const stylesByClass = parseStaticClassStyles(Array.from(root.querySelectorAll('style')));
  const readingOrder = [];
  const motion = [];
  const sourceIds = new Set();
  const localReferences = [];
  let nodeCounter = 0;
  let sourceElementCount = 0;

  function project(element) {
    const tag = element.tagName.toLowerCase();
    if (tag === 'style') return null;
    if (tag === 'animate') {
      const attributeName = normalizeWhitespace(element.getAttribute('attributeName')).toLowerCase();
      const duration = normalizeWhitespace(element.getAttribute('dur'));
      const values = normalizeWhitespace(element.getAttribute('values'));
      if (!MOTION_ATTRIBUTES.has(attributeName) || !/^\d+(?:\.\d+)?(?:ms|s)$/i.test(duration) || !values) {
        throw new Error('Unsupported declarative motion in EPPP native diagram.');
      }
      if (UNSAFE_VALUE.test(values) || /[{}]/.test(values)) {
        throw new Error('Unsafe declarative motion values in EPPP native diagram.');
      }
      const parentNodeId = element.parentElement && element.parentElement.__alloflowNodeId;
      motion.push({
        id: `motion-${String(motion.length + 1).padStart(3, '0')}`,
        targetNodeId: parentNodeId || '',
        attribute: attributeName,
        duration,
        values,
        repeatCount: normalizeWhitespace(element.getAttribute('repeatCount')) || '1',
        keyTimes: normalizeWhitespace(element.getAttribute('keyTimes')),
        calculationMode: normalizeWhitespace(element.getAttribute('calcMode')) || 'linear',
        enabledByDefault: false,
      });
      return null;
    }
    sourceElementCount += 1;
    nodeCounter += 1;
    const nodeId = `vector-node-${String(nodeCounter).padStart(4, '0')}`;
    Object.defineProperty(element, '__alloflowNodeId', { value: nodeId });
    const attributes = sanitizedElementAttributes(element, stylesByClass);
    if (attributes.id) {
      if (sourceIds.has(attributes.id)) throw new Error(`Duplicate EPPP native diagram source id: ${attributes.id}`);
      sourceIds.add(attributes.id);
    }
    for (const [name, value] of Object.entries(attributes)) {
      if (name === 'href') localReferences.push(value.slice(1));
      else if (LOCAL_REFERENCE_ATTRIBUTES.has(name)) {
        const match = value.match(/#([A-Za-z_][A-Za-z0-9_.:-]*)/);
        if (match) localReferences.push(match[1]);
      }
    }
    const node = {
      nodeId,
      type: VECTOR_ELEMENT_TYPES[tag],
      attributes,
    };
    if (tag === 'text' || tag === 'title' || tag === 'desc') {
      node.text = normalizeWhitespace(element.textContent);
      if (node.text) {
        readingOrder.push({
          order: readingOrder.length + 1,
          nodeId,
          text: node.text,
        });
      }
    }
    const children = Array.from(element.children).map(project).filter(Boolean);
    if (children.length) node.children = children;
    return node;
  }

  const nodes = Array.from(root.children).map(project).filter(Boolean);
  for (const targetId of localReferences) {
    if (!sourceIds.has(targetId)) throw new Error(`Unresolved local EPPP native diagram reference: #${targetId}`);
  }
  const title = plainText(diagram && diagram.title);
  const caption = plainText(diagram && diagram.caption);
  const description = plainText(diagram && diagram.description);
  const orderedLabels = readingOrder.map((entry) => entry.text);
  const orderedText = [
    title && `Title: ${title}`,
    caption && `Caption: ${caption}`,
    description && `Description: ${description}`,
    orderedLabels.length && `Diagram labels in source reading order:\n${orderedLabels.map(
      (label, index) => `${index + 1}. ${label}`,
    ).join('\n')}`,
  ].filter(Boolean).join('\n\n');
  if (!orderedText) throw new Error('EPPP native diagram requires a complete text alternative.');
  const viewBox = parseViewBox(root.getAttribute('viewBox'));
  const vector = { viewBox, nodes, motion };
  const identity = normalizeWhitespace(metadata.id) || stableId('native-diagram', rawSvg);
  return {
    schemaVersion: 1,
    format: VECTOR_FORMAT,
    id: identity,
    origin: normalizeWhitespace(metadata.origin) || 'legacy',
    templateId: normalizeWhitespace(metadata.templateId) || null,
    templateKey: normalizeWhitespace(metadata.templateKey) || null,
    placementIds: (Array.isArray(metadata.placementIds) ? metadata.placementIds : []).map(normalizeWhitespace),
    legacySource: normalizeWhitespace(metadata.legacySource),
    title,
    caption,
    description,
    vector,
    readingOrder,
    textAlternative: {
      complete: true,
      title,
      caption,
      description,
      orderedLabels,
      orderedText,
    },
    fingerprints: {
      algorithm: 'sha256',
      legacySvg: sha256(rawSvg),
      legacyMetadata: sha256(JSON.stringify({
        title: String(diagram && diagram.title || ''),
        caption: String(diagram && diagram.caption || ''),
        description: String(diagram && diagram.description || ''),
      })),
      nativeVector: sha256(JSON.stringify(vector)),
      orderedLabels: sha256(JSON.stringify(orderedLabels)),
      completeTextAlternative: sha256(orderedText),
    },
    safety: {
      rawMarkupStored: false,
      externalReferencesAllowed: false,
      scriptsAllowed: false,
      eventHandlersAllowed: false,
      foreignObjectsAllowed: false,
      activeStylesStored: false,
      motionEnabledByDefault: false,
      sourceElements: sourceElementCount,
      projectedNodes: nodeCounter,
      strippedStyleBlocks: root.querySelectorAll('style').length,
      isolatedMotionRecords: motion.length,
    },
  };
}

function buildNativeDiagramProjection({
  diagramTemplates,
  chapters,
  diagramCatalog,
  chapterSourceById = new Map(),
}) {
  const templates = Object.entries(diagramTemplates || {});
  const templateKeyByObject = new Map(templates.map(([key, diagram]) => [diagram, key]));
  const templateByKey = new Map(templates);
  const placementByLocation = new Map((diagramCatalog && diagramCatalog.placements || []).map(
    (placement) => [`${placement.chapterId}:${placement.sectionIndex}`, placement],
  ));
  const records = [];

  for (const [key, diagram] of templates) {
    const diagramId = `diagram-${slug(key)}`;
    const placements = (diagramCatalog.placements || []).filter((placement) => placement.templateKey === key);
    records.push(migrateLegacySvgDiagram(diagram, {
      id: diagramId,
      origin: 'shared-template',
      templateId: diagramId,
      templateKey: key,
      placementIds: placements.map((placement) => placement.id),
      legacySource: migrationSourceAsset('js/textbook_diagrams.js'),
    }));
  }

  for (const [chapterIndex, chapter] of (Array.isArray(chapters) ? chapters : []).entries()) {
    const chapterId = String(chapter && chapter.id || `chapter-${chapterIndex + 1}`);
    for (const [sectionIndex, section] of (Array.isArray(chapter && chapter.sections) ? chapter.sections : []).entries()) {
      const diagram = section && section.interactiveDiagram;
      if (!diagram || templateKeyByObject.has(diagram)) continue;
      const placement = placementByLocation.get(`${chapterId}:${sectionIndex + 1}`);
      if (!placement) throw new Error(`Missing native diagram placement for ${chapterId} section ${sectionIndex + 1}.`);
      records.push(migrateLegacySvgDiagram(diagram, {
        id: placement.diagramId,
        origin: 'inline',
        placementIds: [placement.id],
        legacySource: chapterSourceById.get(chapterId) || '',
      }));
    }
  }

  const ids = records.map((record) => record.id);
  if (new Set(ids).size !== ids.length) throw new Error('Native EPPP diagram payload IDs must be unique.');
  const recordById = new Map(records.map((record) => [record.id, record]));
  const placementBindings = (diagramCatalog.placements || []).map((placement) => {
    const payload = recordById.get(placement.diagramId);
    if (!payload) throw new Error(`Missing native EPPP diagram payload for placement ${placement.id}.`);
    if (!payload.placementIds.includes(placement.id)) {
      throw new Error(`Native EPPP diagram payload ${payload.id} omits placement ${placement.id}.`);
    }
    return {
      placementId: placement.id,
      diagramId: placement.diagramId,
      origin: placement.origin,
      templateKey: placement.templateKey,
      legacySvgSha256: payload.fingerprints.legacySvg,
      nativeVectorSha256: payload.fingerprints.nativeVector,
      textAlternativeSha256: payload.fingerprints.completeTextAlternative,
    };
  });
  const sourceManifest = records.map((record) => ({
    id: record.id,
    origin: record.origin,
    templateId: record.templateId,
    templateKey: record.templateKey,
    placementIds: record.placementIds,
    legacySource: record.legacySource,
    legacySvgSha256: record.fingerprints.legacySvg,
    legacyMetadataSha256: record.fingerprints.legacyMetadata,
  }));
  const nativeManifest = records.map((record) => ({
    id: record.id,
    nativeVectorSha256: record.fingerprints.nativeVector,
    orderedLabelsSha256: record.fingerprints.orderedLabels,
    completeTextAlternativeSha256: record.fingerprints.completeTextAlternative,
  }));
  const templatePayloads = records.filter((record) => record.origin === 'shared-template');
  const inlinePayloads = records.filter((record) => record.origin === 'inline');
  return {
    records,
    placementBindings,
    summary: {
      nativeDiagramPayloads: records.length,
      nativeTemplateDiagramPayloads: templatePayloads.length,
      nativeInlineDiagramPayloads: inlinePayloads.length,
      nativeDiagramPlacements: placementBindings.length,
      nativeDiagramTextAlternatives: records.filter((record) => record.textAlternative.complete).length,
      nativeDiagramMotionRecords: records.reduce((sum, record) => sum + record.vector.motion.length, 0),
    },
    migration: {
      schemaVersion: 1,
      status: 'complete-native-projection-expert-pending',
      format: VECTOR_FORMAT,
      legacySources: [
        migrationSourceAsset('js/textbook_diagrams.js'),
        migrationSourceAsset('js/textbook_ch*.js'),
      ],
      sourceDiagramPayloads: records.length,
      nativeDiagramPayloads: records.length,
      learnerVisiblePlacements: placementBindings.length,
      mappedLearnerVisiblePlacements: placementBindings.length,
      missingPlacementMappings: 0,
      duplicatePayloadIds: 0,
      sourceManifestSha256: sha256(JSON.stringify(sourceManifest)),
      nativeManifestSha256: sha256(JSON.stringify(nativeManifest)),
      placementManifestSha256: sha256(JSON.stringify(placementBindings)),
      safety: 'Legacy SVG is parsed into an allowlisted inert primitive tree. Raw SVG/HTML, scripts, event handlers, foreignObject, external references, and active CSS are not stored. Motion declarations are isolated as disabled-by-default data.',
      reviewBoundary: 'Diagram migration parity preserves legacy labels, descriptions, placements, and source fingerprints; it is not independent qualified-expert review or production renderer validation.',
    },
  };
}

const legacyStringLiteralContext = vm.createContext(Object.create(null), {
  name: 'eppp-legacy-string-literal-decoder',
  codeGeneration: { strings: false, wasm: false },
});

function decodeLegacyStringLiteral(quote, body) {
  const literal = `${quote}${body}${quote}`;
  return new vm.Script(literal, { filename: 'eppp-legacy-string-literal.js' })
    .runInContext(legacyStringLiteralContext, { timeout: 1000 });
}

function legacyGlossaryDeclarations(source) {
  const declarations = [];
  const pattern = /^\s*(['"])((?:\\.|(?!\1).)*)\1\s*:/gm;
  for (const match of String(source || '').matchAll(pattern)) {
    declarations.push({
      term: String(decodeLegacyStringLiteral(match[1], match[2])),
      sourceOffset: match.index,
    });
  }
  return declarations;
}

function normalizedOccurrenceCount(normalizedText, normalizedNeedle) {
  if (!normalizedNeedle) return 0;
  const escaped = normalizedNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'gu');
  return Array.from(normalizedText.matchAll(pattern)).length;
}

function occurrenceCount(text, term) {
  return normalizedOccurrenceCount(
    normalizeWhitespace(text).toLocaleLowerCase('en-US'),
    normalizeTerm(term),
  );
}

function buildNativeGlossaryProjection({ legacyDefinitions, legacySource, chapters }) {
  const definitions = legacyDefinitions && typeof legacyDefinitions === 'object'
    && !Array.isArray(legacyDefinitions) ? legacyDefinitions : {};
  const effectiveEntries = Object.entries(definitions);
  const declarations = legacyGlossaryDeclarations(legacySource);
  const declarationIndicesByTerm = new Map();
  for (const [index, declaration] of declarations.entries()) {
    const indices = declarationIndicesByTerm.get(declaration.term) || [];
    indices.push(index + 1);
    declarationIndicesByTerm.set(declaration.term, indices);
  }
  const missingDeclarations = effectiveEntries.filter(([term]) => !declarationIndicesByTerm.has(term));
  if (missingDeclarations.length) {
    throw new Error(`EPPP glossary effective terms missing source declarations: ${missingDeclarations.map(([term]) => term).join(', ')}`);
  }
  const effectiveTermSet = new Set(effectiveEntries.map(([term]) => term));
  const duplicateSourceKeys = [...declarationIndicesByTerm.entries()]
    .filter(([, indices]) => indices.length > 1)
    .map(([term, indices]) => ({ term, declarationIndices: indices }))
    .sort((left, right) => left.term.localeCompare(right.term));
  const duplicateSourceDeclarations = duplicateSourceKeys.reduce(
    (sum, entry) => sum + entry.declarationIndices.length - 1,
    0,
  );
  if (declarations.length - duplicateSourceDeclarations !== effectiveEntries.length) {
    throw new Error('EPPP glossary source declaration/effective-object count mismatch.');
  }
  for (const declaration of declarations) {
    if (!effectiveTermSet.has(declaration.term)) {
      throw new Error(`EPPP glossary source declaration is absent from effective legacy payload: ${declaration.term}`);
    }
  }

  const normalizedTermGroups = new Map();
  const definitionGroups = new Map();
  for (const [term, definition] of effectiveEntries) {
    const normalized = normalizeTerm(term);
    const normalizedDefinition = plainText(definition);
    const termGroup = normalizedTermGroups.get(normalized) || [];
    termGroup.push(term);
    normalizedTermGroups.set(normalized, termGroup);
    const definitionKey = normalizedDefinition.toLocaleLowerCase('en-US');
    const definitionGroup = definitionGroups.get(definitionKey) || [];
    definitionGroup.push(term);
    definitionGroups.set(definitionKey, definitionGroup);
  }
  const normalizedTermCollisions = [...normalizedTermGroups.values()].filter((group) => group.length > 1);
  if (normalizedTermCollisions.length) {
    throw new Error(`EPPP glossary normalized-term collisions: ${normalizedTermCollisions.map((group) => group.join(' / ')).join(', ')}`);
  }

  const searchableSections = (Array.isArray(chapters) ? chapters : []).flatMap((chapter) => (
    (Array.isArray(chapter.sections) ? chapter.sections : []).map((section) => ({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      domainId: chapter.domainNumber,
      domain: chapter.domain,
      sectionId: section.id,
      normalizedSearchText: normalizeWhitespace([
        section.heading,
        section.content,
        ...(Array.isArray(section.keyTerms) ? section.keyTerms : []),
      ].filter(Boolean).join('\n')).toLocaleLowerCase('en-US'),
    }))
  ));

  const records = effectiveEntries.map(([legacyTerm, legacyDefinition], index) => {
    const term = normalizeWhitespace(legacyTerm);
    const normalized = normalizeTerm(term);
    const definition = plainText(legacyDefinition);
    if (!term || !definition) throw new Error(`EPPP glossary term or definition is empty at effective index ${index + 1}.`);
    const sharedDefinitionTerms = (definitionGroups.get(definition.toLocaleLowerCase('en-US')) || [])
      .filter((candidate) => candidate !== legacyTerm)
      .map(normalizeWhitespace)
      .sort((left, right) => left.localeCompare(right));
    const occurrences = [];
    for (const searchableSection of searchableSections) {
      const count = normalizedOccurrenceCount(searchableSection.normalizedSearchText, normalized);
      if (!count) continue;
      occurrences.push({
        chapterId: searchableSection.chapterId,
        chapterTitle: searchableSection.chapterTitle,
        domainId: searchableSection.domainId,
        domain: searchableSection.domain,
        sectionId: searchableSection.sectionId,
        occurrences: count,
      });
    }
    const chapterIds = [...new Set(occurrences.map((entry) => entry.chapterId))];
    const domainIds = [...new Set(occurrences.map((entry) => entry.domainId).filter(Number.isFinite))].sort((a, b) => a - b);
    const declarationIndices = declarationIndicesByTerm.get(legacyTerm);
    const linkage = {
      method: 'case-folded-unicode-normalized-bounded-occurrence',
      occurrenceCount: occurrences.reduce((sum, entry) => sum + entry.occurrences, 0),
      chapterIds,
      domainIds,
      occurrences,
    };
    const id = stableId('eppp-term', normalized);
    return {
      schemaVersion: 1,
      id,
      term,
      normalizedTerm: normalized,
      definition,
      aliases: sharedDefinitionTerms,
      aliasDerivation: sharedDefinitionTerms.length
        ? 'exact-normalized-definition-match-in-legacy-payload'
        : 'none-derived',
      chapterIds,
      domainIds,
      linkage,
      reviewStatus: 'migration-parity-only-expert-pending',
      independentExpertStatus: 'not-started',
      productionStatus: 'not-production-validated',
      sourceMetadata: {
        legacyAsset: migrationSourceAsset('js/textbook_term_defs.js'),
        effectiveObjectIndex: index + 1,
        declarationIndices,
        overwrittenDeclarationsForTerm: Math.max(0, declarationIndices.length - 1),
        provenance: 'Inherited from the effective legacy term-definition payload; no new expert claim is made.',
      },
      fingerprints: {
        algorithm: 'sha256',
        legacyTerm: sha256(String(legacyTerm)),
        legacyDefinition: sha256(String(legacyDefinition)),
        normalizedTerm: sha256(normalized),
        normalizedDefinition: sha256(definition),
        aliases: sha256(JSON.stringify(sharedDefinitionTerms)),
        linkage: sha256(JSON.stringify(linkage)),
      },
    };
  });
  const ids = records.map((record) => record.id);
  if (new Set(ids).size !== ids.length) throw new Error('Native EPPP glossary IDs must be unique.');
  const sourceManifest = effectiveEntries.map(([term, definition], index) => ({
    effectiveObjectIndex: index + 1,
    termSha256: sha256(String(term)),
    definitionSha256: sha256(String(definition)),
    declarationIndices: declarationIndicesByTerm.get(term),
  }));
  const nativeManifest = records.map((record) => ({
    id: record.id,
    normalizedTermSha256: record.fingerprints.normalizedTerm,
    normalizedDefinitionSha256: record.fingerprints.normalizedDefinition,
    aliasesSha256: record.fingerprints.aliases,
    linkageSha256: record.fingerprints.linkage,
  }));
  return {
    records,
    summary: {
      glossaryTerms: records.length,
      glossaryTermsWithAliases: records.filter((record) => record.aliases.length).length,
      glossaryAliasLinks: records.reduce((sum, record) => sum + record.aliases.length, 0),
      glossaryTermsLinkedToChapters: records.filter((record) => record.chapterIds.length).length,
      glossaryTermsLinkedToDomains: records.filter((record) => record.domainIds.length).length,
      glossarySourceDeclarations: declarations.length,
      glossaryDuplicateSourceDeclarations: duplicateSourceDeclarations,
    },
    migration: {
      schemaVersion: 1,
      status: 'complete-native-projection-expert-pending',
      format: GLOSSARY_FORMAT,
      legacySource: migrationSourceAsset('js/textbook_term_defs.js'),
      sourceDeclarations: declarations.length,
      effectiveLegacyTerms: effectiveEntries.length,
      overwrittenDuplicateDeclarations: duplicateSourceDeclarations,
      duplicateSourceKeys,
      nativeTerms: records.length,
      missingMappings: 0,
      duplicateNativeIds: 0,
      duplicateNormalizedTerms: 0,
      sourceAssetSha256: sha256(String(legacySource || '')),
      sourceManifestSha256: sha256(JSON.stringify(sourceManifest)),
      nativeManifestSha256: sha256(JSON.stringify(nativeManifest)),
      semanticManifestSha256: sha256(JSON.stringify(records.map((record) => ({
        id: record.id,
        term: record.term,
        definition: record.definition,
      })))),
      safety: 'Definitions are projected as normalized plain text with stable IDs and inert linkage metadata. Raw HTML and executable markup are not stored.',
      reviewBoundary: 'Glossary projection and fingerprints establish parity with the effective legacy payload only; they do not constitute independent qualified-expert review or production validation.',
    },
  };
}

module.exports = {
  ELEMENT_ATTRIBUTE_ALLOWLIST,
  FORBIDDEN_VECTOR_ELEMENTS,
  GLOSSARY_FORMAT,
  STATIC_STYLE_PROPERTIES,
  VECTOR_ELEMENT_TYPES,
  VECTOR_FORMAT,
  buildNativeDiagramProjection,
  buildNativeGlossaryProjection,
  legacyGlossaryDeclarations,
  migrateLegacySvgDiagram,
  normalizeTerm,
  normalizeWhitespace,
  occurrenceCount,
  sha256,
};
