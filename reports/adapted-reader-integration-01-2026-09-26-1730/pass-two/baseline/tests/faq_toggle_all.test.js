// One Show all / Hide all toggle in the FAQ.
//
// WHY (2026-09-24 audit): "Show all" and "Hide all" were two buttons side by
// side, each named differently from what it showed. One button now does the
// job that fits: Show all until every answer is open, then Hide all.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule(process.env.ALLO_FAQ_CANDIDATE || 'view_faq_module.js');
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });

const t = key => key;
const faqs = [{ question: 'What is a root?', answer: 'It holds the plant.' }, { question: 'What is a leaf?', answer: 'It makes food.' }];
function mount() {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(window.AlloModules.FaqView, { t, isTeacherMode: false, generatedContent: { id: 'f', type: 'faq', data: faqs }, history: [], isEditingFaq: false, splitTextToSentences: text => [text], formatInteractiveText: text => text, renderFormattedText: text => text, formatInlineText: text => text })));
}
const toggles = () => [...host.querySelectorAll('[data-faq-toggle-all]')];

describe('the FAQ show/hide toggle', () => {
  it('is one button that switches between Show all and Hide all', () => {
    mount();
    expect(toggles()).toHaveLength(1);
    expect(toggles()[0].textContent).toContain('Show all');
    expect(toggles()[0].getAttribute('aria-label')).toBeNull();
    act(() => toggles()[0].click());
    expect(toggles()).toHaveLength(1);
    expect(toggles()[0].textContent).toContain('Hide all');
    act(() => toggles()[0].click());
    expect(toggles()[0].textContent).toContain('Show all');
  });
});
