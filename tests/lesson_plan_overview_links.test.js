import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, PlanView, root, host, shellHelpers;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('ExternalLink', () => null);
  loadAlloModule('phase_k_helpers_module.js');
  loadAlloModule('view_renderers_module.js');
  loadAlloModule('view_lesson_plan_module.js');
  PlanView = window.AlloModules.LessonPlanView;

  // Exercise the same shell-supplied helpers and formatter as the other plan
  // sections, rather than giving the overview a test-only link parser.
  const source = readFileSync('AlloFlowANTI.txt', 'utf8');
  const slice = (start, end) => {
    const from = source.indexOf(start), to = source.indexOf(end, from);
    if (from < 0 || to < 0) throw new Error('Lesson formatting helper not found: ' + start);
    return source.slice(from, to);
  };
  const helpers = slice('const normalizeResourceLinks =', 'const formatInlineText =')
    + slice('const BilingualFieldRenderer =', 'const REFERENCES_HEADER_RE =');
  const { code } = require('@babel/core').transformSync(helpers, {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
  });
  shellHelpers = new Function('React', 'renderFormattedText', 't', `
    const translationMode = 'English', leveledTextLanguage = 'French', currentUiLanguage = 'English', selectedLanguages = [];
    const resolveTranslationPolicy = () => ({ enabled: true, target: 'English' });
    const translationTargetChoices = () => [];
    ${code}
    return { normalizeResourceLinks, normalizeMaterialItem, BilingualFieldRenderer };
  `);
}, 30000);

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
});
afterAll(() => vi.unstubAllGlobals());

function mount(data, { renderer = true, history } = {}) {
  const target = { id: 'fraction-models', type: 'source', title: 'Fraction models', data: { text: 'Compare equal parts.' } };
  const open = vi.fn(), toast = vi.fn(), t = () => '';
  const inlineDeps = { history: history || [target], handleRestoreView: open, addToast: toast, t,
    highlightGlossaryTerms: text => text, getDefaultTitle: () => 'Resource' };
  let helpers;
  const renderFormattedText = text => window.AlloModules.ViewRenderers.renderFormattedText(text, true, false, {
    sanitizeTruncatedCitations: text => text, normalizeResourceLinks: helpers.normalizeResourceLinks, t,
    formatInlineText: (...args) => window.AlloModules.PhaseKHelpers.formatInlineText(...args, inlineDeps),
  });
  helpers = shellHelpers(React, renderFormattedText, t);
  const props = {
    generatedContent: { id: 'plan', type: 'lesson-plan', data }, isTeacherMode: true, t,
    ...(renderer ? { ...helpers, renderFormattedText } : {}),
  };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(React.createElement(PlanView, props)));
  const overview = host.querySelector('[data-lesson-overview]');
  act(() => overview.querySelector('summary').click());
  return { overview, target, open, toast };
}

function resourceButtons(container) {
  return [...container.querySelectorAll('button')].filter(button => button.textContent.trim() === 'Fraction models');
}

describe('Lesson at a glance resource links', () => {
  const link = '[Fraction models](resource:fraction-models)';

  it('leaves existing material Markdown stable, including links within a sentence', () => {
    const { normalizeMaterialItem } = shellHelpers(React, text => text, () => '');
    for (const text of [link, 'Use ' + link + ' with a partner.', link + ' and ' + link]) {
      expect(normalizeMaterialItem(text)).toBe(text);
      expect(normalizeMaterialItem(normalizeMaterialItem(text))).toBe(text);
    }
  });

  it('opens the same resource from overview objectives, materials and assessment as from the lesson body', () => {
    const { overview, target, open } = mount({
      objectives: ['Compare with ' + link], materialsNeeded: [link],
      assessmentIdeas: ['Explain ' + link], successCriteria: [{ statement: 'I can use ' + link }],
      directInstruction: 'Review ' + link,
    });
    const overviewButtons = resourceButtons(overview);
    expect(overviewButtons).toHaveLength(4);
    expect(overview.textContent).not.toContain('resource:');
    for (const button of overviewButtons) act(() => button.click());
    const bodyButtons = resourceButtons(host).filter(button => !overview.contains(button));
    expect(bodyButtons.length).toBeGreaterThanOrEqual(3);
    for (const button of bodyButtons) act(() => button.click());
    expect(open).toHaveBeenCalledTimes(overviewButtons.length + bodyButtons.length);
    expect(open.mock.calls.every(([resource]) => resource === target)).toBe(true);
  });

  it.each([
    '[SOURCE] "Fraction models" (ID: fraction-models) — one per pair',
    'Fraction models (resource: fraction-models) — one per pair',
    'Fraction models (ID: fraction-models) — one per pair',
  ])('normalizes legacy material links in both places: %s', material => {
    const { overview, target, open } = mount({ materialsNeeded: [{ text: material }] });
    expect(resourceButtons(overview)).toHaveLength(1);
    expect(overview.textContent).toContain('— one per pair');
    expect(overview.textContent).not.toContain('ID:');
    expect(overview.textContent).not.toContain('resource:');
    const buttons = resourceButtons(host);
    expect(buttons).toHaveLength(2);
    for (const button of buttons) act(() => button.click());
    expect(open.mock.calls).toEqual([[target], [target]]);
  });

  it('formats structured saved fields and both halves of bilingual content', () => {
    const { overview } = mount({
      objectives: { en: 'Comparer ' + link + '\n--- ENGLISH TRANSLATION ---\nCompare ' + link, id: 'objective-1' },
      materialsNeeded: { description: link }, assessmentIdeas: { text: 'Explain ' + link },
      successCriteria: [{ id: 'criterion-1', statement: { text: 'I can use ' + link } }],
    });
    expect(resourceButtons(overview)).toHaveLength(5);
    expect(overview.textContent).toContain('English Translation');
    expect(overview.textContent).not.toContain('--- ENGLISH TRANSLATION ---');
    expect(overview.textContent).not.toContain('[object Object]');
    expect(overview.querySelector('[dir="ltr"]').textContent.replace(/\s+/g, ' ')).toContain('Compare Fraction models');
  });

  it('keeps saved text readable when the optional renderer is unavailable', () => {
    const { overview } = mount({
      objectives: { en: 'Compare equal parts' }, materialsNeeded: { text: link },
      assessmentIdeas: { description: 'Explain with a model' },
      successCriteria: [{ statement: { en: 'I can compare halves' } }],
    }, { renderer: false });
    expect(overview.textContent).toContain('Compare equal parts');
    expect(overview.textContent).toContain(link);
    expect(overview.textContent).toContain('Explain with a model');
    expect(overview.textContent).toContain('I can compare halves');
    expect(overview.textContent).not.toContain('[object Object]');
  });
});
