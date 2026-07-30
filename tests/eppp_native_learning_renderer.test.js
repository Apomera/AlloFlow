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

function loadNativeRendererApi() {
  const start = source.indexOf('function testPrepSafeHttpsUrl(');
  const end = source.indexOf('\nfunction TestPrepHub(props)', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const helperSource = source.slice(start, end);
  const expose = `
globalThis.__epppNativeRenderer = {
  safeUrl: testPrepSafeHttpsUrl,
  runsAreSafe: testPrepNativeRunsAreSafe,
  blocksAreSafe: testPrepNativeBlocksAreSafe,
  blockText: testPrepNativeBlockText,
  route: testPrepNativeChapterRoute,
  chapterSpeechText: testPrepNativeChapterSpeechText,
  renderBlocks: testPrepRenderNativeBlocks,
  renderField: testPrepRenderNativeField
};`;
  const compiled = transformSync(helperSource + expose, {
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
    globalThis: null,
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(compiled, sandbox, { filename: 'eppp-native-renderer.jsx' });
  return sandbox.__epppNativeRenderer;
}

const api = loadNativeRendererApi();
const textRun = (text) => ({ type: 'text', text });

describe('EPPP complete native learning-library renderer', () => {
  it('selects native content only when both completeness gates pass and otherwise fails closed', () => {
    const chapter = catalog.chapters[0];
    expect(api.route(catalog, chapter, true)).toBe('native-complete');

    const incompleteChapter = {
      ...chapter,
      sections: chapter.sections.map((section, index) => ({ ...section, contentComplete: index !== 0 })),
    };
    expect(api.route(catalog, incompleteChapter, true)).toBe('native-incomplete');
    expect(api.route(catalog, incompleteChapter, false)).toBe('native-basic');

    const incompleteCatalog = {
      ...catalog,
      contentMigration: { ...catalog.contentMigration, completeSections: catalog.contentMigration.sections - 1 },
    };
    expect(api.route(incompleteCatalog, chapter, true)).toBe('native-incomplete');
  });

  it('renders nested lists and semantic tables without crossing list-item boundaries', () => {
    const blocks = [
      {
        type: 'paragraph',
        text: 'Mean < Median < Mode and p < .05',
        runs: [
          textRun('Mean < Median < Mode and '),
          { type: 'strong', children: [textRun('p < .05')] },
          { type: 'line-break' },
          { type: 'emphasis', children: [textRun('comparison retained')] },
        ],
      },
      {
        type: 'list',
        ordered: false,
        items: [
          {
            text: 'Outer item',
            runs: [textRun('Outer item')],
            children: [{
              type: 'list',
              ordered: true,
              items: [
                { text: 'Nested one', runs: [textRun('Nested one')] },
                { text: 'Nested two', runs: [textRun('Nested two')] },
              ],
            }],
          },
          { text: 'Second outer item', runs: [textRun('Second outer item')] },
        ],
      },
      {
        type: 'table',
        rows: [
          { cells: [
            { kind: 'header', text: 'Measure', runs: [textRun('Measure')], columnSpan: 1 },
            { kind: 'header', text: 'Meaning', runs: [textRun('Meaning')], columnSpan: 1 },
          ] },
          { cells: [
            { kind: 'header', text: 'Alpha', runs: [textRun('Alpha')], columnSpan: 1 },
            { kind: 'cell', text: 'Consistency', runs: [textRun('Consistency')], columnSpan: 2 },
          ] },
        ],
      },
    ];

    expect(api.blocksAreSafe(blocks)).toBe(true);
    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(React.Fragment, null, ...api.renderBlocks(blocks, 'fixture', 'Reliability')),
    );
    expect(markup).toContain('Mean &lt; Median &lt; Mode');
    expect(markup).toContain('<strong>p &lt; .05</strong>');
    expect(markup).toContain('<br/>');
    expect(markup).toContain('<ul');
    expect(markup).toContain('<ol');
    expect(markup.indexOf('Nested two')).toBeLessThan(markup.indexOf('</li></ol>'));
    expect(markup).toContain('role="region"');
    expect(markup).toContain('aria-label="Reliability table 1"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('<caption class="sr-only">Reliability table 1</caption>');
    expect(markup).toContain('scope="col"');
    expect(markup).toContain('scope="row"');
    expect(markup).toContain('colSpan="2"');
  });

  it('uses HTTPS-only recursive inline links and never interprets strings as HTML', () => {
    const safeLinkBlocks = [{
      type: 'paragraph',
      text: 'Trusted source',
      runs: [{ type: 'link', url: 'https://example.org/source', children: [textRun('Trusted source')] }],
    }];
    const unsafeLinkBlocks = [{
      type: 'paragraph',
      text: 'Unsafe source',
      runs: [{ type: 'link', url: 'javascript:alert(1)', children: [textRun('Unsafe source')] }],
    }];
    const markupBlocks = [{
      type: 'paragraph',
      text: '<img src=x onerror=alert(1)>',
      runs: [textRun('<img src=x onerror=alert(1)>')],
    }];

    expect(api.blocksAreSafe(safeLinkBlocks)).toBe(true);
    expect(api.blocksAreSafe(unsafeLinkBlocks)).toBe(false);
    expect(api.safeUrl('http://example.org')).toBe('');
    const linkMarkup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(React.Fragment, null, ...api.renderBlocks(safeLinkBlocks, 'link', 'Links')),
    );
    expect(linkMarkup).toContain('href="https://example.org/source"');
    expect(linkMarkup).toContain('rel="noopener noreferrer"');
    const escapedMarkup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(React.Fragment, null, ...api.renderBlocks(markupBlocks, 'markup', 'Markup')),
    );
    expect(escapedMarkup).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapedMarkup).not.toContain('<img');
    expect(source.slice(source.indexOf('function testPrepSafeHttpsUrl('), source.indexOf('\nfunction TestPrepHub(props)')))
      .not.toContain('dangerouslySetInnerHTML');
  });

  it('aggregates blocks, table cells, cases, coda, and references once in logical reading order', () => {
    const chapter = {
      id: 'speech-chapter',
      title: 'Speech order',
      domain: 'Domain label',
      sections: [{
        id: 'speech-section',
        runtimeSectionId: 'speech-section-runtime',
        heading: 'First lesson',
        contentComplete: true,
        content: 'Fallback should not duplicate structured text.',
        contentBlocks: [
          { type: 'paragraph', text: 'Block alpha', runs: [textRun('Block alpha')] },
          { type: 'table', rows: [
            { cells: [{ kind: 'header', text: 'Header beta', runs: [textRun('Header beta')], columnSpan: 1 }] },
            { cells: [{ kind: 'cell', text: 'Cell gamma', runs: [textRun('Cell gamma')], columnSpan: 1 }] },
          ] },
        ],
        expandableCase: {
          title: 'Case delta',
          clinicalDescription: 'Presentation epsilon',
          diagnosis: 'Diagnosis zeta',
          explanation: 'Explanation eta',
        },
      }],
      reflectiveCoda: {
        teaser: 'Teaser theta',
        content: 'Coda iota',
        studyNote: 'Study kappa',
      },
      sourceReferences: [{ text: 'Reference lambda', blocks: [
        { type: 'paragraph', text: 'Reference lambda', runs: [textRun('Reference lambda')] },
      ] }],
    };
    const speechCatalog = { contentMigration: { sections: 1, completeSections: 1 }, diagramPlacements: [] };
    const speech = api.chapterSpeechText(speechCatalog, chapter);
    const ordered = [
      'Block alpha',
      'Header beta',
      'Cell gamma',
      'Case delta',
      'Presentation epsilon',
      'Diagnosis zeta',
      'Explanation eta',
      'Teaser theta',
      'Coda iota',
      'Study kappa',
      'Reference lambda',
    ];
    for (let index = 1; index < ordered.length; index += 1) {
      expect(speech.indexOf(ordered[index - 1])).toBeLessThan(speech.indexOf(ordered[index]));
    }
    for (const value of ordered) expect(speech.split(value)).toHaveLength(2);
    expect(speech).not.toContain('Fallback should not duplicate structured text.');

    const invalidChapter = {
      ...chapter,
      sections: [{
        ...chapter.sections[0],
        content: 'Plain fallback keeps comparison p < .05.',
        contentBlocks: [{ type: 'blockquote', text: 'Unsupported' }],
      }],
    };
    expect(api.chapterSpeechText(speechCatalog, invalidChapter))
      .toContain('Plain fallback keeps comparison p < .05.');
  });

  it('ships accessible disclosure, fail-closed errors, navigation, completion, and no automatic narration', () => {
    expect(source).toContain('<details className="mt-4 rounded-xl border border-violet-300 bg-violet-50 p-4">');
    expect(source).toContain('Clinical vignette: {caseRecord.title');
    expect(source).toContain('Diagnosis or answer');
    expect(source).toContain('Optional study and reflection');
    expect(source).toContain('aria-labelledby="chapter-reflective-coda-title"');
    expect(source).toContain('aria-label="Chapter sections"');
    expect(source).toContain("target.scrollIntoView({ block: 'start' })");
    expect(source).toContain('target.focus({ preventScroll: true })');
    expect(source).toContain('aria-pressed={complete}');
    expect(source).toContain('TEST_PREP_EPPP_TEXTBOOK_PROGRESS_KEY');
    expect(source).toContain("testPrepNativeChapterRoute(learningLibrary, chapter, selectedPack.id === 'eppp-part-one')");
    expect(source).toContain("if (route === 'native-incomplete')");
    expect(source).toContain('aria-labelledby="native-chapter-unavailable-title" role="alert" aria-live="assertive"');
    expect(source).toContain('Chapter temporarily unavailable');
    expect(source).toContain('To protect study accuracy, the chapter has not been displayed.');
    expect(source).not.toContain('eppp_legacy');
    expect(source).not.toContain('<iframe');
    expect(source).not.toContain('legacy chapter fallback');
    expect(source).not.toContain('const auditUrl = selectedPack && selectedPack.legacyAuditUrl');
    expect(source).not.toContain('const inventoryUrl = selectedPack && selectedPack.legacyInventoryUrl');
    expect(source).not.toContain('const [legacyOpen');
    expect(source).toContain('legacyUrl: testPrepNormalizeRepoAssetUrl(input.legacyUrl)');
    expect(source).toContain('legacyAuditUrl: testPrepNormalizeRepoAssetUrl(input.legacyAuditUrl)');
    expect(source).toContain('data-native-chapter-route={route}');
    expect(source).toContain('Read chapter aloud');
    expect(source).toContain('onClick={() => {');
    expect(source).not.toMatch(/React\.useEffect\([\s\S]{0,300}testPrepNativeChapterSpeechText/);
  });
});
