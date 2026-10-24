import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let pipeline;
const logo = 'data:image/png;base64,iVBORw0KGgo=';
const brand = {
  id: 'wall-brand-review', name: 'School wall identity',
  colors: { heading: '#123456', accent: '#234567', body: '#17212e', bg: '#ffffff', cardBg: '#ffffff', cardBorder: '#cbd5e1' },
  header: { text: 'Example School · Science', showLogo: true },
  footer: { text: 'Example School classroom resources', showPageNumber: false },
  logo: { src: logo, alt: 'Example School logo', width: 40, height: 40 },
};
const glossary = { id: 'wall', type: 'glossary', title: 'Science', data: Array.from({ length: 8 }, (_, index) => ({ term: `Word ${index + 1}`, def: `Meaning ${index + 1}.` })) };
beforeAll(() => {
  window.React ||= createRequire(import.meta.url)(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('brand_profile_module.js');
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Vocabulary', state: {} });
});
afterEach(() => vi.restoreAllMocks());
function render(items = [glossary], config = {}) {
  return new DOMParser().parseFromString(pipeline.generateFullPackHTML(items, 'Vocabulary', false, {}, {
    includeGlossary: true, includeTeacherKey: false, annotations: [], glossaryDisplayMode: 'word-wall', glossaryWordWallPerPage: 4, ...config,
  }), 'text/html');
}
function hiddenEconomyChrome(doc) {
  const css = [...doc.querySelectorAll('style')].map(style => style.textContent).join('\n');
  const rule = css.match(/body\[data-alloflow-word-wall-print="economical"\] :is\(([^)]*)\)\s*\{\s*display:none !important;/);
  expect(rule).not.toBeNull();
  // Evaluate the actual generated suppression selector on the exported DOM.
  return [...doc.querySelectorAll('body[data-alloflow-word-wall-print="economical"] :is(' + rule[1] + ')')];
}
function economyRuleStyle(doc, suffix) {
  const css = [...doc.querySelectorAll('style')].map(style => style.textContent).join('\n');
  const selector = 'body[data-alloflow-word-wall-print="economical"] ' + suffix;
  const start = css.indexOf(selector + ' {');
  expect(start).toBeGreaterThanOrEqual(0);
  const brace = css.indexOf('{', start);
  const node = doc.createElement('div');
  node.style.cssText = css.slice(brace + 1, css.indexOf('}', brace));
  return node.style;
}
describe('Word Wall economical print keeps selected brand identity', () => {
  it('reserves first-page room for school identity by tightening spacing without shrinking text or logo', () => {
    vi.spyOn(window.AlloModules.BrandProfile, 'getActiveBrandProfile').mockReturnValue(brand);
    const doc = render();
    const title = economyRuleStyle(doc, '.export-header');
    const resource = economyRuleStyle(doc, '.alloflow-word-wall-section > .resource-header');
    const bands = economyRuleStyle(doc, ':is(.brand-header, .brand-footer)');
    const imageStyle = economyRuleStyle(doc, '.brand-header img');
    expect(title.marginBottom).toBe('2pt');
    expect(resource.marginBottom).toBe('2pt');
    expect(bands.paddingTop).toBe('2pt');
    expect(bands.paddingBottom).toBe('2pt');
    // CSSOM may serialize font sizes in CSS pixels (9pt = 12px).
    expect(bands.fontSize).toMatch(/^(9pt|12px)$/);
    expect(imageStyle.maxHeight).toBe('16pt');
    expect(doc.querySelectorAll('.alloflow-word-wall-page')).toHaveLength(2);
    expect(doc.querySelector('.brand-header-text').textContent).toBe(brand.header.text);
    expect(doc.querySelector('.brand-footer-text').textContent).toBe(brand.footer.text);
  });
  it('suppresses only the generic closing footer, retaining branded header, logo and footer', () => {
    vi.spyOn(window.AlloModules.BrandProfile, 'getActiveBrandProfile').mockReturnValue(brand);
    const doc = render();
    expect(doc.body.getAttribute('data-alloflow-word-wall-print')).toBe('economical');
    expect(doc.querySelector('.brand-header-text').textContent).toBe(brand.header.text);
    expect(doc.querySelector('.brand-header img').getAttribute('src')).toBe(logo);
    expect(doc.querySelector('.brand-header img').getAttribute('alt')).toBe(brand.logo.alt);
    expect(doc.querySelector('.brand-footer-text').textContent).toBe(brand.footer.text);
    const hidden = hiddenEconomyChrome(doc);
    expect(hidden).toContain(doc.querySelector('.alloflow-export-footer'));
    expect(hidden).not.toContain(doc.querySelector('.brand-footer'));
    expect(hidden).not.toContain(doc.querySelector('.brand-header'));
    expect(doc.querySelectorAll('.alloflow-word-wall-card')).toHaveLength(8);
  });
  it('keeps the normal unbranded wall footer reference in the file while excluding it from paper', () => {
    vi.spyOn(window.AlloModules.BrandProfile, 'getActiveBrandProfile').mockReturnValue(null);
    const doc = render();
    expect(doc.querySelectorAll('.alloflow-export-footer')).toHaveLength(1);
    expect(doc.querySelector('.brand-footer')).toBeNull();
    expect(hiddenEconomyChrome(doc)).toContain(doc.querySelector('.alloflow-export-footer'));
    expect(doc.querySelector('.alloflow-word-wall-print-attribution')).not.toBeNull();
  });
  it('keeps the original brand markup and full print policy in mixed-resource documents', () => {
    vi.spyOn(window.AlloModules.BrandProfile, 'getActiveBrandProfile').mockReturnValue(brand);
    const doc = render([glossary, { id: 'reading', type: 'simplified', title: 'Reading', data: 'A science passage.' }]);
    expect(doc.body.hasAttribute('data-alloflow-word-wall-print')).toBe(false);
    expect(doc.querySelector('.brand-footer-text').textContent).toBe(brand.footer.text);
    expect(doc.querySelector('#reading')).not.toBeNull();
    expect(hiddenEconomyChrome(doc)).toEqual([]);
  });
  it('never suppresses a material teacher answer key in a branded wall pack', () => {
    vi.spyOn(window.AlloModules.BrandProfile, 'getActiveBrandProfile').mockReturnValue(brand);
    const withKey = { ...glossary, gameData: { grid: [['W']], solutions: ['0-0'], words: ['Word'] } };
    const doc = render([withKey], { includeTeacherKey: true });
    expect(doc.body.hasAttribute('data-alloflow-word-wall-print')).toBe(false);
    expect(doc.querySelector('.teacher-view #wall-key')).not.toBeNull();
    expect(doc.querySelector('.brand-footer-text').textContent).toBe(brand.footer.text);
    expect(hiddenEconomyChrome(doc)).toEqual([]);
  });
});
