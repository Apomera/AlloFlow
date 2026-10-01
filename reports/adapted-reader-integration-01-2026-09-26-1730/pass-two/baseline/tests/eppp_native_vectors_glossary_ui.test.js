import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const source = fs.readFileSync(resolve(root, 'test_prep_hub_source.jsx'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(resolve(root, 'test_prep/eppp_learning_library.json'), 'utf8'));
const modulesDir = resolve(root, 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMServer = require(resolve(modulesDir, 'react-dom/server'));
const { transformSync } = require(resolve(modulesDir, '@babel/core'));
const transformReactJsx = require(resolve(modulesDir, '@babel/plugin-transform-react-jsx'));

function loadApi() {
  const start = source.indexOf('function testPrepSafeHttpsUrl(');
  const end = source.indexOf('\nfunction TestPrepHub(props)', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const expose = `
globalThis.__nativeLearningApi = {
  primitives: TEST_PREP_NATIVE_VECTOR_PRIMITIVES,
  attributeMap: TEST_PREP_NATIVE_VECTOR_ATTRIBUTE_MAP,
  prepare: testPrepPrepareNativeDiagram,
  renderNodes: testPrepRenderNativeVectorNodes,
  diagramText: testPrepNativeDiagramText,
  diagramRecords: testPrepNativeChapterDiagramRecords,
  chapterSpeechText: testPrepNativeChapterSpeechText,
  glossaryView: testPrepBuildNativeGlossaryView,
  glossarySpeechText: testPrepNativeGlossarySpeechText,
  Diagram: TestPrepNativeDiagramPlacement,
  Glossary: TestPrepNativeGlossaryLibrary
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
  vm.runInNewContext(compiled, sandbox, { filename: 'eppp-native-vectors-glossary.jsx' });
  return sandbox.__nativeLearningApi;
}

const api = loadApi();

function flatten(nodes) {
  return (nodes || []).flatMap((node) => [node].concat(flatten(node.children)));
}

function minimalPayload(nodes, orderedText = 'Complete ordered fallback') {
  return {
    schemaVersion: 1,
    format: 'alloflow-inert-vector-v1',
    id: 'fixture-diagram',
    title: 'Fixture diagram',
    description: 'Fixture description',
    vector: {
      viewBox: { minX: 0, minY: 0, width: 100, height: 50 },
      nodes,
      motion: [],
    },
    readingOrder: [{ order: 1, nodeId: 'node-1', text: 'Fixture label' }],
    textAlternative: { complete: true, orderedText },
  };
}

describe('EPPP native vector runtime', () => {
  it('uses a closed primitive and per-type attribute map that accepts every generated payload', () => {
    expect(Object.keys(api.primitives).sort()).toEqual(Object.keys(api.attributeMap).sort());
    expect(Object.values(api.primitives)).not.toContain('script');
    expect(Object.values(api.primitives)).not.toContain('foreignObject');
    expect(Object.values(api.attributeMap).flatMap(Object.keys)).not.toContain('style');
    expect(Object.values(api.attributeMap).flatMap(Object.keys).some((name) => /^on/i.test(name))).toBe(false);

    const prepared = catalog.nativeDiagrams.map((diagram, index) => api.prepare(diagram, `catalog-${index}`));
    expect(prepared.every((result) => result.ok)).toBe(true);
    expect(source.slice(source.indexOf('const TEST_PREP_NATIVE_VECTOR_PRIMITIVES'), source.indexOf('\nfunction TestPrepHub(props)')))
      .not.toContain('dangerouslySetInnerHTML');
  });

  it('namespaces every local ID and rewrites local href, paint, filter, clip, and marker references', () => {
    const diagram = catalog.nativeDiagrams.find((entry) => {
      const serialized = JSON.stringify(entry.vector.nodes);
      return serialized.includes('"id"') && (serialized.includes('url(#') || serialized.includes('"href"'));
    });
    expect(diagram).toBeTruthy();
    const first = api.prepare(diagram, 'first-instance');
    const second = api.prepare(diagram, 'second-instance');
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const firstNodes = flatten(first.nodes);
    const secondNodes = flatten(second.nodes);
    const firstIds = new Set(firstNodes.map((node) => node.attributes.id).filter(Boolean));
    const secondIds = new Set(secondNodes.map((node) => node.attributes.id).filter(Boolean));
    expect(firstIds.size).toBeGreaterThan(0);
    expect([...firstIds].some((id) => secondIds.has(id))).toBe(false);

    for (const node of firstNodes) {
      for (const [name, value] of Object.entries(node.attributes)) {
        if (name === 'href') expect(firstIds.has(String(value).slice(1))).toBe(true);
        const localUrl = String(value).match(/^url\(#([^)]+)\)$/);
        if (localUrl) expect(firstIds.has(localUrl[1])).toBe(true);
        expect(String(value)).not.toMatch(/https?:|data:|javascript:/i);
      }
    }
  });

  it('fails closed for unknown primitives, attributes, unresolved/external refs, and raw injection', () => {
    const unknownPrimitive = minimalPayload([{ nodeId: 'node-1', type: 'image', attributes: { href: 'https://example.org/x.svg' } }]);
    const unknownAttribute = minimalPayload([{ nodeId: 'node-1', type: 'rect', attributes: { x: '0', y: '0', width: '10', height: '10', style: 'fill:red' } }]);
    const externalHref = minimalPayload([
      { nodeId: 'node-def', type: 'definitions', attributes: {}, children: [{ nodeId: 'node-target', type: 'rect', attributes: { id: 'target', x: '0', y: '0', width: '5', height: '5' } }] },
      { nodeId: 'node-1', type: 'use', attributes: { href: 'https://example.org/x.svg#target', x: '0', y: '0' } },
    ]);
    const unresolved = minimalPayload([{ nodeId: 'node-1', type: 'path', attributes: { d: 'M0 0 L1 1', 'marker-end': 'url(#missing)' } }]);
    expect(api.prepare(unknownPrimitive, 'unsafe').ok).toBe(false);
    expect(api.prepare(unknownAttribute, 'unsafe').ok).toBe(false);
    expect(api.prepare(externalHref, 'unsafe').ok).toBe(false);
    expect(api.prepare(unresolved, 'unsafe').ok).toBe(false);

    const fallbackPayload = minimalPayload(
      [{ nodeId: 'node-1', type: 'foreign-object', attributes: {} }],
      '<img src=x onerror=alert(1)> ordered fallback',
    );
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(api.Diagram, {
      placement: { id: 'unsafe-placement', sectionHeading: '<script>alert(1)</script>' },
      payload: fallbackPayload,
      index: 0,
    }));
    expect(markup).toContain('data-native-diagram-status="text-fallback"');
    expect(markup).toContain('&lt;img src=x onerror=alert(1)&gt; ordered fallback');
    expect(markup).not.toContain('<script>');
    expect(markup).not.toContain('<img');
  });

  it('renders complete ordered text and stays static when reduced motion is preferred', () => {
    const motionDiagram = catalog.nativeDiagrams.find((entry) => entry.vector.motion.length > 0);
    expect(motionDiagram).toBeTruthy();
    const prepared = api.prepare(motionDiagram, 'motion-fixture');
    expect(prepared.ok).toBe(true);
    expect(prepared.motionRecordsIgnored).toBeGreaterThan(0);
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(api.Diagram, {
      placement: { id: 'motion-placement', sectionHeading: 'Motion fixture' },
      payload: motionDiagram,
      index: 0,
      onReadAloud: () => {},
      readAloudActive: false,
    }));
    expect(markup).toContain(`viewBox="${prepared.viewBox}"`);
    expect(markup).toContain('Complete text alternative in diagram reading order');
    expect(markup).toContain('data-motion-policy="reduced-motion-static"');
    expect(markup).toContain('Reduced motion · static');
    expect(markup).not.toMatch(/<animate|<animateMotion|<animateTransform/i);
    expect(markup).toContain('Read diagram aloud');
  });

  it('resolves section-native IDs and narrates each complete diagram alternative once', () => {
    const chapter = catalog.chapters.find((entry) => entry.sections.some((section) => section.nativeDiagramId));
    const section = chapter.sections.find((entry) => entry.nativeDiagramId);
    const records = api.diagramRecords(catalog, chapter, section);
    expect(records).toHaveLength(1);
    expect(records[0].payload.id).toBe(section.nativeDiagramId);

    const speechCatalog = {
      nativeDiagrams: [records[0].payload],
      diagramPlacements: [records[0].placement],
    };
    const speechChapter = {
      id: chapter.id,
      title: 'Diagram speech',
      domain: chapter.domain,
      sections: [{
        id: section.id,
        runtimeSectionId: section.runtimeSectionId,
        heading: section.heading,
        content: 'Lesson text',
        nativeDiagramId: section.nativeDiagramId,
        diagramId: section.diagramId,
        diagramPlacementId: section.diagramPlacementId,
      }],
    };
    const speech = api.chapterSpeechText(speechCatalog, speechChapter);
    expect(speech.split(records[0].payload.textAlternative.orderedText)).toHaveLength(2);
  });
});

describe('EPPP native glossary UI', () => {
  it('derives counts and filters only from occurrences while preserving aliases', () => {
    const total = api.glossaryView(catalog.glossary, catalog.chapters, {});
    expect(total.total).toBe(catalog.summary.glossaryTerms);
    expect(total.chapterOptions.length).toBeGreaterThan(0);
    expect(total.domainOptions.length).toBeGreaterThan(0);

    const linked = catalog.glossary.find((record) => record.linkage.occurrences.length > 0);
    const occurrence = linked.linkage.occurrences[0];
    const filtered = api.glossaryView(catalog.glossary, catalog.chapters, {
      query: linked.term,
      chapterId: occurrence.chapterId,
      domainId: String(occurrence.domainId),
    });
    expect(filtered.matching).toBeGreaterThan(0);
    expect(filtered.items.every((record) => record.occurrenceRecords.some((entry) =>
      entry.chapterId === occurrence.chapterId && String(entry.domainId) === String(occurrence.domainId)))).toBe(true);

    const withAlias = catalog.glossary.find((record) => record.aliases.length > 0);
    const aliasResult = api.glossaryView(catalog.glossary, catalog.chapters, { query: withAlias.aliases[0] });
    expect(aliasResult.items.some((record) => record.id === withAlias.id && record.aliases.includes(withAlias.aliases[0]))).toBe(true);
  });

  it('renders plain text, accessible controls/status, aliases, and the expert-pending boundary', () => {
    const glossary = [{
      id: 'term-fixture',
      term: '<script>Term</script>',
      definition: '<img src=x onerror=alert(1)> is inert text.',
      aliases: ['Alias A', 'Alias B'],
      linkage: { occurrences: [{ chapterId: 'ch-1', chapterTitle: 'Chapter One', domainId: 1, domain: 'Assessment', occurrences: 2 }] },
      reviewStatus: 'migration-parity-only-expert-pending',
    }];
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(api.Glossary, {
      glossary,
      chapters: [{ id: 'ch-1', title: 'Chapter One' }],
      query: '',
      chapterId: 'all',
      domainId: 'all',
      visibleCount: 100,
      onQueryChange: () => {},
      onChapterChange: () => {},
      onDomainChange: () => {},
      onShowMore: () => {},
      onReadAloud: () => {},
      readAloudActive: false,
    }));
    expect(markup).toContain('role="search"');
    expect(markup).toContain('aria-controls="native-glossary-results"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain('Also listed as:');
    expect(markup).toContain('Alias A, Alias B');
    expect(markup).toContain('Source-parity reviewed · independent qualified-expert review pending · not production validated');
    expect(markup).toContain('an occurrence is not evidence that a definition was expert reviewed');
    expect(markup).toContain('Read term aloud');
    expect(markup).toContain('&lt;script&gt;Term&lt;/script&gt;');
    expect(markup).toContain('&lt;img src=x onerror=alert(1)&gt; is inert text.');
    expect(markup).not.toContain('<script>');
    expect(markup).not.toContain('<img');
    expect(markup).not.toMatch(/expert (?:approved|validated|released)/i);
  });

  it('indexes diagrams and glossary entries once and routes both result types', () => {
    expect(source).toContain("(Array.isArray(library.nativeDiagrams) ? library.nativeDiagrams : []).forEach((diagram)");
    expect(source).toContain("add('diagram', diagram.id");
    expect(source).toContain("(Array.isArray(library.glossary) ? library.glossary : []).forEach((term)");
    expect(source).toContain("add('glossary', term.id");
    expect(source).toContain("if (searchResult.type === 'diagram')");
    expect(source).toContain("if (searchResult.type === 'glossary')");
    expect(source).toContain("setLibraryMode('glossary')");
    expect(api.glossarySpeechText({ term: 'Reliability', definition: 'Consistency.', aliases: ['Precision'] }))
      .toBe('Glossary term. Reliability. Definition. Consistency.. Also listed as: Precision');
  });
});
