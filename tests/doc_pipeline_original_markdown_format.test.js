import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let contract, pipeline;
const model = vi.fn(async () => '{}');
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const cfg = { isWorksheet: true, includeOriginalReading: true, includeTeacherKey: false };

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('doc_pipeline_module.js');
  contract = window.AlloModules.InstructionalContext;
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: model, callGeminiVision: model, callImagen: model,
    addToast: () => {}, t: key => key, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Reading',
    state: { leveledTextLanguage: 'English', currentUiLanguage: 'English', exportConfig: {} },
  });
});

describe('explicit original-source formatting in printable readings', () => {
  it('renders recorded Markdown without editing the canonical source or snapshot', () => {
    const source = '# Our goal\n\n**Explain a reason.** Read [the source](https://example.test/article).\n\n- Compare ideas\n- Keep a question';
    const item = contract.createSupportedReading(source, { format: 'markdown' }), before = JSON.stringify(item);
    const doc = parse(pipeline.generateResourceHTML(item, false, {}, cfg)), body = doc.querySelector('[data-original-text]');
    expect(body.getAttribute('data-original-format')).toBe('markdown');
    expect(body.style.whiteSpace).toBe('normal');
    expect(body.querySelector('h1').textContent).toBe('Our goal');
    expect(body.querySelector('strong').textContent).toBe('Explain a reason.');
    expect(body.querySelector('a').getAttribute('href')).toBe('https://example.test/article');
    expect(body.querySelectorAll('li')).toHaveLength(2);
    expect(body.textContent).not.toMatch(/\*\*|\[the source\]/);
    expect(JSON.stringify(item)).toBe(before);
    expect(contract.isSupportedOriginal(item)).toBe(true);
    expect(model).not.toHaveBeenCalled();
  });

  it.each([undefined, 'plain-text', 'html', 'Markdown'])('keeps genuine or unrecognized plain originals character-exact (%s)', format => {
    const source = '  **Literal stars**\r\n[Link notation](https://example.test/)\r\n<strange> & text 😀\r\n';
    const item = contract.createSupportedReading(source, format ? { format } : {}), before = JSON.stringify(item);
    const doc = parse(pipeline.generateResourceHTML(item, false, {}, cfg)), body = doc.querySelector('[data-original-text]');
    expect(body.getAttribute('data-original-format')).toBe('plain-text');
    expect(body.textContent).toBe(source);
    expect(body.querySelector('strong,a,strange')).toBeNull();
    expect(body.style.whiteSpace).toBe('pre-wrap');
    expect(JSON.stringify(item)).toBe(before);
  });

  it('renders the Case Sheet and all four Katie readings with headings, emphasis and real source links while preserving their packs', () => {
    const pack = JSON.parse(readFileSync('allopacks/reading_decisions_grade6.allopack.json', 'utf8')), before = JSON.stringify(pack);
    const readings = pack.history.filter(item => item.type === 'simplified');expect(readings).toHaveLength(5);
    for (const item of readings) {
      expect(item.sourceSnapshot.format).toBe('markdown');
      const doc = parse(pipeline.generateResourceHTML(item, false, {}, cfg)), body = doc.querySelector('[data-original-text]');
      expect(body.querySelectorAll('h2,h3').length).toBeGreaterThan(1);
      expect(body.querySelectorAll('strong').length).toBeGreaterThan(2);
      expect(body.textContent).not.toMatch(/\*\*|\[Communicating High Expectations|\[Beyond Turn|\[It’s Always Time/);
      expect([...body.querySelectorAll('a')].some(link => link.href.startsWith('https://www.novakeducation.com/blog/'))).toBe(true);
      expect(contract.isSupportedOriginal(item)).toBe(true);
    }
    expect(JSON.stringify(pack)).toBe(before);
  });

  it('keeps authored HTML, event attributes, encoded markup and unsafe links inert', () => {
    const source = '# Read safely\n\n<script>alert(1)</script> <img src=x onerror="alert(2)">\n\n[bad](javascript:alert(3)) [other](data:text/html,bad)\n\n[quoted](https://example.test/"onclick="alert(4)) &lt;svg onload=evil&gt;';
    const item = contract.createSupportedReading(source, { format: 'markdown' });
    const doc = parse(pipeline.generateResourceHTML(item, false, {}, cfg)), body = doc.querySelector('[data-original-text]');
    expect(body.querySelector('script,img,svg,iframe,object,embed,style')).toBeNull();
    for (const node of body.querySelectorAll('*')) expect([...node.attributes].some(attribute => /^on/i.test(attribute.name))).toBe(false);
    for (const link of body.querySelectorAll('a')) expect(link.getAttribute('href')).toMatch(/^(?:https?:|mailto:|tel:|resource:|#|\/|\.)/i);
    expect(item.data).toBe(source);expect(item.sourceSnapshot.text).toBe(source);
  });
});
