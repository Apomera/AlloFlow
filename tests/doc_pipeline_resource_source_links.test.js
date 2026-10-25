import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const model = vi.fn(async () => '{}');
const config = { includeTeacherKey: false };
let contract;

beforeAll(() => {
  window.React = window.React || {};
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('doc_pipeline_module.js');
  contract = window.AlloModules.InstructionalContext;
});
beforeEach(() => model.mockClear());

function activity(id = 'activity', alignment) {
  return {
    id, type: 'directions', title: 'Explain a reason', meta: 'Prepared activity',
    data: { body: 'Compare the ideas and explain one reason.', objectives: [] },
    ...(alignment === undefined ? {} : { sourceAlignment: alignment }),
  };
}

function render(items, options = {}) {
  const pipeline = window.AlloModules.createDocPipeline({
    callGemini: model, callGeminiVision: model, callImagen: model,
    addToast: () => {}, t: key => key, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Resource',
    state: { currentUiLanguage: 'English', leveledTextLanguage: 'English' },
  });
  const html = pipeline.generateFullPackHTML(items, 'Prepared resources', true, {}, { ...config, ...options });
  const document = new DOMParser().parseFromString(html, 'text/html');
  return { html, document, block: document.querySelector('.alloflow-resource-source-links') };
}

describe('shared source links for standalone resource printing', () => {
  it('keeps the recorded source with a standalone resource near the document front', () => {
    const item = activity('explain', { sourceUrl: 'https://example.org/reading?part=1&mode=full' });
    const before = structuredClone(item), { document, block } = render([item]);
    expect(block).not.toBeNull();
    expect(block.textContent).toMatch(/related (?:source )?reading/i);
    const link = block.querySelector('a');
    expect(link.getAttribute('href')).toBe(item.sourceAlignment.sourceUrl);
    expect(link.textContent).toContain(item.sourceAlignment.sourceUrl);
    expect(link.hasAttribute('data-alloflow-recorded-source')).toBe(true);
    expect(document.querySelector('.export-header').compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(block.compareDocumentPosition(document.querySelector('[data-alloflow-resource-id="explain"]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(item).toEqual(before);
    expect(model).not.toHaveBeenCalled();
  });

  it('combines the singular and plural URL fields and deduplicates canonical links', () => {
    const { block } = render([activity('sources', {
      sourceUrl: 'https://EXAMPLE.org',
      sourceUrls: ['https://example.org/', 'https://EXAMPLE.ORG', 'https://example.org/another', null, 42, { url: 'https://example.org/not-a-string' }],
    })]);
    expect([...block.querySelectorAll('a')].map(link => link.href)).toEqual(['https://example.org/', 'https://example.org/another']);
    for (const link of block.querySelectorAll('a')) expect(link.textContent).toContain(link.href);
  });

  it('prints recorded links without exposing internal alignment notes or inventing authorship', () => {
    const { block } = render([activity('internal-resource-id', {
      sourceUrl: 'https://example.org/reading',
      anchors: ['PRIVATE-ANCHOR-CODE'], contribution: 'INTERNAL-CONTRIBUTION-NOTE',
    })]);
    expect(block.textContent).not.toContain('PRIVATE-ANCHOR-CODE');
    expect(block.textContent).not.toContain('INTERNAL-CONTRIBUTION-NOTE');
    expect(block.textContent).not.toContain('internal-resource-id');
    expect(block.textContent).not.toMatch(/Katie Novak|endorsed|CC-BY|AlloFlow author/i);
  });

  it('accepts only credential-free HTTPS URLs and rejects literal control characters', () => {
    const { block } = render([activity('safe-links', {
      sourceUrls: [
        'https://example.org/valid', 'http://example.org/insecure', 'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>', 'file:///private/report.pdf', '//example.org/relative',
        'https://name:secret@example.org/private', 'https://name@example.org/private',
        'https://example.org/line\nbreak', 'https://example.org/carriage\rreturn',
        'https://example.org/tab\tinside', 'https://example.org/null\u0000inside',
      ],
    })]);
    expect([...block.querySelectorAll('a')].map(link => link.href)).toEqual(['https://example.org/valid']);
    expect(block.textContent).not.toContain('secret');
    expect(block.querySelector('script,img,svg,iframe,object,embed')).toBeNull();
  });

  it('keeps URL markup inert in both link destinations and visible paper text', () => {
    const url = 'https://example.org/reading?note="/><img src=x onerror=alert(1)>&other=<svg onload=alert(2)>';
    const { block } = render([activity('encoded', { sourceUrl: url })]);
    expect(block.querySelectorAll('a')).toHaveLength(1);
    expect(block.querySelector('script,img,svg,iframe,object,embed,style')).toBeNull();
    for (const node of block.querySelectorAll('*')) expect([...node.attributes].some(attribute => /^on/i.test(attribute.name))).toBe(false);
    expect(block.querySelector('a').href).toBe(new URL(url).href);
    expect(block.querySelector('a').textContent).toContain(new URL(url).href);
  });

  it.each([
    undefined, null, {}, { sourceUrl: '' },
    { sourceUrls: ['javascript:alert(1)', 'https://user:password@example.org/private'] },
  ])('omits an empty or unusable source block (%j)', alignment => {
    const { document, block } = render([activity('no-source', alignment)]);
    expect(block).toBeNull();
    expect(document.querySelector('[data-alloflow-resource-id="no-source"]').textContent).toContain('Compare the ideas');
  });

  it('allows a caller already supplying pack credits to suppress the standalone link block', () => {
    const item = activity('credited-elsewhere', { sourceUrl: 'https://example.org/reading' }), before = structuredClone(item);
    const { document, block } = render([item], { includeResourceSourceLinks: false });
    expect(block).toBeNull();
    expect(document.querySelector('[data-alloflow-resource-id="credited-elsewhere"]')).not.toBeNull();
    expect(item).toEqual(before);
  });

  it('retains uncovered recorded sources when richer caller credits cover only part of the list', () => {
    const item = activity('partially-credited', {
      sourceUrl: 'https://example.org/',
      sourceUrls: ['https://example.org/another', 'https://example.org/third'],
    }), before = structuredClone(item);
    const { block } = render([item], { sourceLinksCoveredBy: ['https://EXAMPLE.org', 'https://example.org/unrelated', 'javascript:ignored()'] });
    expect([...block.querySelectorAll('a')].map(link => link.href)).toEqual(['https://example.org/another', 'https://example.org/third']);
    expect(item).toEqual(before);
    expect(render([item], { sourceLinksCoveredBy: ['https://example.org/', 'https://example.org/another', 'https://example.org/third'] }).block).toBeNull();
  });

  it('preserves authored inline citations without duplicating their recorded URLs', () => {
    const item = activity('already-cited', {
      sourceUrl: 'https://example.org/article', sourceUrls: ['https://example.org/extra'],
    });
    item.data.body += '\n\nRead [the original article](https://example.org/article).';
    const before = structuredClone(item), { document, block } = render([item]);
    expect(document.querySelector('[data-alloflow-resource-id="already-cited"] a[href="https://example.org/article"]')).not.toBeNull();
    expect([...block.querySelectorAll('a')].map(link => link.href)).toEqual(['https://example.org/extra']);
    expect(item).toEqual(before);
    const fullyCited = structuredClone(item);
    fullyCited.data.body += '\n\nRead [the extra source](https://example.org/extra).';
    const next = render([fullyCited]);
    expect(next.block).toBeNull();
    expect(next.document.querySelectorAll('[data-alloflow-resource-id="already-cited"] a[href^="https://example.org/"]')).toHaveLength(2);
  });

  it('avoids repetitive standalone credits in a multiple-resource packet', () => {
    const { document, block } = render([
      activity('first', { sourceUrl: 'https://example.org/first' }),
      activity('second', { sourceUrl: 'https://example.org/second' }),
    ]);
    expect(document.querySelectorAll('[data-alloflow-resource-id]')).toHaveLength(2);
    expect(block).toBeNull();
  });

  it('uses the resources that actually render after export filters', () => {
    const glossary = { id: 'filtered-glossary', type: 'glossary', title: 'Word help', meta: '', data: [{ term: 'Reason', def: 'An explanation.' }], sourceAlignment: { sourceUrl: 'https://example.org/filtered' } };
    const { document, block } = render([activity('remaining', { sourceUrl: 'https://example.org/remaining' }), glossary], { includeGlossary: false });
    expect(document.querySelectorAll('[data-alloflow-resource-id]')).toHaveLength(1);
    expect([...block.querySelectorAll('a')].map(link => link.href)).toEqual(['https://example.org/remaining']);
    expect(render([glossary], { includeGlossary: false }).block).toBeNull();
  });

  it('preserves an original reading and its source snapshot when adding a separate source connection', () => {
    const source = '  **Literal text**\nKeep this original passage unchanged.\n';
    const item = contract.createSupportedReading(source, { format: 'plain-text' });
    item.sourceAlignment = { sourceUrl: 'https://example.org/related-reading' };
    const before = structuredClone(item), { document, block } = render([item], { includeOriginalReading: true });
    expect(block.querySelector('a').href).toBe(item.sourceAlignment.sourceUrl);
    expect(document.querySelector('[data-original-text]').textContent).toBe(source);
    expect(item).toEqual(before);
    expect(contract.isSupportedOriginal(item)).toBe(true);
  });

  it.each([
    ['academic_discourse_reading_space_grade6', 'reading-space-glossary', 1],
    ['reading_decisions_grade6', 'decision-unit-portfolio', 3],
  ])('keeps the actual recorded sources with %s / %s', (filename, id, count) => {
    const pack = JSON.parse(readFileSync(`allopacks/${filename}.allopack.json`, 'utf8'));
    const item = pack.history.find(resource => resource.id === id), before = JSON.stringify(pack);
    const { document, block } = render([item]);
    expect(document.querySelectorAll('[data-alloflow-resource-id]')).toHaveLength(1);
    const links = [...block.querySelectorAll('a')];
    expect(links).toHaveLength(count);
    expect(links.every(link => link.href.startsWith('https://www.novakeducation.com/blog/'))).toBe(true);
    for (const link of links) expect(link.textContent).toContain(link.href);
    expect(JSON.stringify(pack)).toBe(before);
    expect(model).not.toHaveBeenCalled();
  }, 120000);
});
