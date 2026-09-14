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

  it('escapes stray ampersands once and leaves well-formed entities the model wrote alone', () => {
    // The extraction prompt asks the model to write HTML inside p/li text, so a model writing
    // "Show &amp; Tell" is doing exactly what it was told. Escaping that "&" again produced
    // "&amp;amp;", which renders and is read aloud as the literal word "amp", and the fix loop
    // could not repair it: dropping the visible "amp" token trips the strict reading-order gate.
    const html = makeRenderer()([
      { type: 'p', text: 'Fiorella &amp; Mayer (2013); Show &amp; Tell' },
      { type: 'ul', items: ['AT&T and R&D', 'caf&eacute; &#233; &#xE9;'] },
      { type: 'p', text: '&lt;script&gt;alert(1)&lt;/script&gt; <script>bad()</script> &lt;img onerror=x&gt;' },
    ]);
    expect(html).toContain('Fiorella &amp; Mayer (2013); Show &amp; Tell');
    expect(html).not.toContain('&amp;amp;');
    // A bare ampersand is still escaped exactly once.
    expect(html).toContain('AT&amp;T and R&amp;D');
    // Named, decimal and hex references survive as written.
    expect(html).toContain('caf&eacute; &#233; &#xE9;');
    // The XSS guard is unchanged: literal markup is escaped and pre-escaped markup stays inert.
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img onerror=x&gt;');
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
