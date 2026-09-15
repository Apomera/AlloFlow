import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

loadAlloModule('doc_builder_renderer_module.js');
const Renderer = window.AlloModules.DocBuilderRenderer;

const makeRenderer = () => Renderer.createRenderer({
  docStyle: {
    headingColor: '#0f172a',
    textColor: '#1e293b',
    accentColor: '#2563eb',
    bgColor: '#ffffff',
    sectionBorderColor: '#cbd5e1',
    tableBg: '#1e3a8a',
    headerBg: '#1e3a8a',
  },
  _accessibleHeaderColors: () => null,
  _alloCellRichText: (value, escape) => escape(value),
  _emitAccessibleTableHtml: () => '<table></table>',
  _pipeLog: () => {},
  _sanitizeRawHtmlBlock: (html) => String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ''),
  _validateTableGrid: () => ({ ok: false }),
  renderWordArtHtml: (text) => '<span>' + text + '</span>',
  warnLog: () => {},
});

describe('dedicated document-block renderer module', () => {
  it('renders and escapes structured blocks without mutating the input', () => {
    const blocks = [
      { type: 'h2', text: 'Overview', id: 'overview' },
      { type: 'p', text: '<strong>Safe</strong> <script>bad()</script>' },
      { type: 'link', text: 'Unsafe link', url: 'javascript:alert(1)' },
      { type: 'custom-math', value: 'x + y' },
    ];
    const before = structuredClone(blocks);
    const html = makeRenderer()(blocks);

    expect(html).toContain('<h2');
    expect(html).toContain('<strong>Safe</strong>');
    expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    expect(html).toContain('href="#"');
    expect(html).toContain('x + y');
    expect(blocks).toEqual(before);
  });

  it('keeps the pipeline as an orchestrator and ships identical deployed bytes', () => {
    const pipeline = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
    const source = readFileSync(resolve(process.cwd(), 'doc_builder_renderer_source.jsx'), 'utf8');
    const module = readFileSync(resolve(process.cwd(), 'doc_builder_renderer_module.js'), 'utf8');
    const deployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/doc_builder_renderer_module.js'), 'utf8');

    expect(pipeline).toContain('_rendererModule.createRenderer({');
    expect(pipeline).not.toContain('return blocks.map((block, blockIdx) => {');
    expect(source).toContain('const renderJsonToHtml = (blocks) => {');
    expect(module).toBe(deployed);
  });
});

// The banner card is the document's h1. Models routinely emit an h1 block with the same title
// right after it; the single-h1 net used to demote that duplicate to an h2, so screen-reader
// users heard the title twice (NCES tables pilot, 2026-09-13).
describe('banner title is not repeated as an h1 block', () => {
  const render = makeRenderer();
  const count = (html, re) => (html.match(re) || []).length;
  it('drops an h1 block whose text repeats the banner title, ignoring case, spacing and trailing punctuation', () => {
    const html = render([
      { type: 'banner', title: 'Report on the Condition of Education 2023', subtitle: 'Chapter 2' },
      { type: 'h1', text: '  report on the  Condition of Education 2023.', id: 'report' },
      { type: 'h2', text: 'Preprimary Education', id: 'preprimary' },
    ]);
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(html).toContain('Report on the Condition of Education 2023</h1>');
    expect(html).not.toContain('id="report"');
    expect(html).toContain('<h2 id="preprimary"');
  });
  it('keeps an h1 that differs from the banner title, and keeps every h1 when there is no banner', () => {
    const withBanner = render([{ type: 'banner', title: 'Unit 4 Study Guide' }, { type: 'h1', text: 'Photosynthesis', id: 'photo' }]);
    expect(count(withBanner, /<h1[\s>]/g)).toBe(2);
    expect(withBanner).toContain('id="photo"');
    const noBanner = render([{ type: 'h1', text: 'Photosynthesis', id: 'photo' }, { type: 'p', text: 'Plants make sugar.' }]);
    expect(count(noBanner, /<h1[\s>]/g)).toBe(1);
  });
  it('is idempotent on the same block list', () => {
    const blocks = [{ type: 'banner', title: 'Title' }, { type: 'h1', text: 'Title' }, { type: 'p', text: 'Body.' }];
    expect(render(blocks)).toBe(render(blocks));
  });
});
