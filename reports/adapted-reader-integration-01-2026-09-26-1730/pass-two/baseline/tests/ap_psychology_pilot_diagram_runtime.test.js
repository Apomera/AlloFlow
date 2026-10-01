import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const source = fs.readFileSync(resolve(root, 'test_prep_hub_source.jsx'), 'utf8');
const library = JSON.parse(
  fs.readFileSync(resolve(root, 'test_prep/ap_psychology_pilot_learning_library.json'), 'utf8')
);
const modulesDir = resolve(root, 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMServer = require(resolve(modulesDir, 'react-dom/server'));
const { transformSync } = require(resolve(modulesDir, '@babel/core'));
const transformReactJsx = require(resolve(modulesDir, '@babel/plugin-transform-react-jsx'));

function loadDiagramApi() {
  const start = source.indexOf('function testPrepSafeHttpsUrl(');
  const end = source.indexOf('\nfunction TestPrepHub(props)', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const expose = `
globalThis.__apDiagramApi = {
  payloads: testPrepLearningLibraryDiagramPayloads,
  diagramText: testPrepNativeDiagramText,
  prepareNative: testPrepPrepareNativeDiagram,
  prepareConcept: testPrepPrepareConceptDiagram,
  records: testPrepNativeChapterDiagramRecords,
  chapterSpeechText: testPrepNativeChapterSpeechText,
  Diagram: TestPrepNativeDiagramPlacement
};`;
  const compiled = transformSync(source.slice(start, end) + expose, {
    babelrc: false,
    configFile: false,
    plugins: [[transformReactJsx, {
      runtime: 'classic',
      pragma: 'React.createElement',
      pragmaFrag: 'React.Fragment',
    }]],
  }).code;
  const sandbox = {
    React,
    URL,
    localStorage: { getItem: () => null },
    testPrepSlug(value, fallback = 'item') {
      const normalized = String(value == null ? '' : value).trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return normalized || fallback;
    },
    window: { matchMedia: () => ({ matches: true }) },
    globalThis: null,
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(compiled, sandbox, { filename: 'ap-psychology-diagram-runtime.jsx' });
  return sandbox.__apDiagramApi;
}

const api = loadDiagramApi();

function minimalNativePayload(id) {
  return {
    schemaVersion: 1,
    format: 'alloflow-inert-vector-v1',
    id,
    title: 'Native compatibility fixture',
    description: 'Native fixture description',
    vector: {
      viewBox: { minX: 0, minY: 0, width: 100, height: 50 },
      nodes: [{
        nodeId: 'node-1',
        type: 'text',
        attributes: { x: '5', y: '25', fill: '#ffffff' },
        text: 'Native fixture',
      }],
      motion: [],
    },
    readingOrder: [{ order: 1, nodeId: 'node-1', text: 'Native fixture' }],
    textAlternative: { complete: true, orderedText: 'Native fixture ordered text.' },
  };
}

describe('AP Psychology learning-library diagram runtime adapter', () => {
  it('resolves every AP concept diagram through its declared chapter placement', () => {
    const payloads = api.payloads(library);
    expect(payloads).toHaveLength(5);
    expect(payloads.map((payload) => payload.id)).toEqual(library.diagrams.map((diagram) => diagram.id));

    for (const placement of library.diagramPlacements) {
      const chapter = library.chapters.find((entry) => entry.id === placement.chapterId);
      const section = chapter.sections.find((entry) => entry.id === placement.sectionId);
      const records = api.records(library, chapter, section);
      expect(records).toHaveLength(1);
      expect(records[0].placement.id).toBe(placement.id);
      expect(records[0].payload.id).toBe(placement.diagramId);
    }
  });

  it('renders a safe static concept map with complete text and speech alternatives', () => {
    for (const diagram of library.diagrams) {
      const prepared = api.prepareConcept(diagram);
      expect(prepared.ok, prepared.reason).toBe(true);
      expect(prepared.nodes.map((node) => node.id)).toEqual(diagram.accessibility.readingOrder);
      expect(prepared.orderedText).toBe(diagram.accessibility.textEquivalent.join('\n'));
    }

    const placement = library.diagramPlacements[0];
    const diagram = library.diagrams.find((entry) => entry.id === placement.diagramId);
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(api.Diagram, {
      placement,
      payload: diagram,
      index: 0,
      onReadAloud: () => {},
      readAloudActive: false,
    }));
    expect(markup).toContain('data-native-diagram-status="concept-rendered"');
    expect(markup).toContain('data-learning-diagram-format="alloflow-diagram-v1"');
    expect(markup).toContain('Concept map: ' + diagram.accessibility.shortAlt);
    expect(markup).toContain('Concepts in diagram reading order');
    expect(markup).toContain('Connections');
    expect(markup).toContain('Complete text alternative in diagram reading order');
    expect(markup).toContain('Read diagram aloud');
    expect(markup).not.toContain('<svg');
    for (const node of diagram.spec.nodes) {
      expect(markup).toContain(node.label);
      expect(markup).toContain(node.detail);
    }
    for (const edge of diagram.spec.edges) expect(markup).toContain(edge.label);

    const chapter = library.chapters.find((entry) => entry.id === placement.chapterId);
    const speech = api.chapterSpeechText(library, chapter);
    expect(speech).toContain('Diagram. ' + diagram.accessibility.textEquivalent.join('\n'));
  });

  it('fails closed for invalid concept relationships and escapes concept labels as text', () => {
    const invalid = structuredClone(library.diagrams[0]);
    invalid.spec.edges[0].to = 'missing-node';
    expect(api.prepareConcept(invalid).ok).toBe(false);
    const fallbackMarkup = ReactDOMServer.renderToStaticMarkup(React.createElement(api.Diagram, {
      placement: library.diagramPlacements[0],
      payload: invalid,
      index: 0,
    }));
    expect(fallbackMarkup).toContain('data-native-diagram-status="text-fallback"');
    expect(fallbackMarkup).toContain('The diagram visual could not be rendered safely.');
    expect(fallbackMarkup).not.toContain('data-concept-node-id');

    const escaped = structuredClone(library.diagrams[0]);
    escaped.spec.nodes[0].label = '<img src=x onerror=alert(1)>';
    expect(api.prepareConcept(escaped).ok).toBe(true);
    const escapedMarkup = ReactDOMServer.renderToStaticMarkup(React.createElement(api.Diagram, {
      placement: library.diagramPlacements[0],
      payload: escaped,
      index: 0,
    }));
    expect(escapedMarkup).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapedMarkup).not.toContain('<img');
  });

  it('keeps inert native vectors authoritative when both schemas reuse an ID', () => {
    const duplicateId = library.diagrams[0].id;
    const native = minimalNativePayload(duplicateId);
    const payloads = api.payloads({ nativeDiagrams: [native], diagrams: [library.diagrams[0]] });
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toBe(native);
    expect(api.prepareNative(payloads[0], 'native-precedence').ok).toBe(true);

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(api.Diagram, {
      placement: { id: 'native-precedence-placement', diagramId: duplicateId },
      payload: native,
      index: 0,
    }));
    expect(markup).toContain('data-native-diagram-status="rendered"');
    expect(markup).toContain('data-learning-diagram-format="alloflow-inert-vector-v1"');
    expect(markup).toContain('<svg');
  });

  it('indexes both supported schemas and uses release-truthful learner copy', () => {
    expect(source).toContain('(Array.isArray(library.nativeDiagrams) ? library.nativeDiagrams : []).forEach((diagram) => {');
    expect(source).toContain('(Array.isArray(library.diagrams) ? library.diagrams : []).forEach((diagram) => {');
    expect(source).toContain('const payloads = testPrepLearningLibraryDiagramPayloads(catalog);');

    expect(source).not.toContain('Search the complete released pack');
    expect(source).not.toContain('search all released content in this pack');
    expect(source).not.toContain('No released questions or learning resources match that search.');
    expect(source).not.toContain(' released memory aids</p>');
    expect(source).toContain("Search this pack's available content");
    expect(source).toContain('search all available content in this pack');
    expect(source).toContain('source-reviewed memory aids</p>');
  });
});
