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
