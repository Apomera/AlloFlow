// A bilingual reading's second references list is not read as body text.
//
// WHY (2026-09-24): splitReferencesFromBody took only the first references
// heading. When the model ended each language with its own list ("## Referencias"
// and then "## References" after the English translation), the English list
// stayed in the body: it was shown as reading text and read aloud.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase, split;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  if (window.AlloModules) delete window.AlloModules.TextPipelineHelpersModule;
  loadAlloModule(process.env.ALLO_TPH_CANDIDATE || 'text_pipeline_helpers_module.js');
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js'); loadAlloModule('view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
  split = window.AlloModules.TextPipelineHelpers.splitReferencesFromBody;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });

const LIST = '1. [Water facts](https://example.org/water)\n2. [Rain guide](https://example.org/rain)';
const BILINGUAL = 'El agua se mueve.[⁽¹⁾](https://example.org/water)\n\n## Referencias\n' + LIST + '\n\n--- ENGLISH TRANSLATION ---\n\nWater moves.[⁽¹⁾](https://example.org/water)\n\n## References\n' + LIST;

describe('splitting references from a bilingual reading', () => {
  it('takes the list after the translation out of the body', () => {
    const { body, references } = split(BILINGUAL);
    expect(body).toContain('--- ENGLISH TRANSLATION ---');
    expect(body).toContain('Water moves.');
    expect(body).not.toMatch(/## References|Rain guide/);
    expect(references).toContain('## Referencias');
    expect(references).not.toContain('## References'); // the same sources, listed once
  });
  it('keeps the second list when it names a source the first does not', () => {
    const { body, references } = split(BILINGUAL + '\n3. [Cloud atlas](https://example.org/clouds)');
    expect(body).not.toMatch(/Cloud atlas/);
    expect(references).toMatch(/Cloud atlas/);
  });
  it('a single list after the translation is unchanged', () => {
    const text = 'El agua se mueve.\n\n--- ENGLISH TRANSLATION ---\n\nWater moves.\n\n## References\n' + LIST;
    const { body, references } = split(text);
    expect(body).toBe('El agua se mueve.\n\n--- ENGLISH TRANSLATION ---\n\nWater moves.');
    expect(references).toBe('## References\n' + LIST);
  });
  it('a one-language reading is unchanged', () => {
    const { body, references } = split('Water moves.\n\n## References\n' + LIST);
    expect(body).toBe('Water moves.');
    expect(references).toBe('## References\n' + LIST);
  });
});

describe('the reader', () => {
  it('neither shows nor reads the English references list', () => {
    const handleSpeak = vi.fn();
    const sideBySide = text => {
      const [source, target] = text.split('--- ENGLISH TRANSLATION ---').map(part => part.trim());
      return target === undefined ? null : { source: source.split(/\n{2,}/), target: target.split(/\n{2,}/) };
    };
    const props = { ComplexityGauge: () => null, t: k => k, generatedContent: { id: 'b', type: 'simplified', data: BILINGUAL, config: { language: 'Spanish' } }, leveledTextLanguage: 'Spanish', isTeacherMode: false, isZenMode: true, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), splitReferencesFromBody: split, getSideBySideContent: sideBySide, handleSpeak, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex: () => {} };
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    act(() => root.render(React.createElement(View, props)));
    const body = host.querySelector('[data-simplified-reading-body]');
    expect(body.textContent).toContain('Water moves.');
    expect(body.textContent).not.toMatch(/Rain guide|References/);
    act(() => host.querySelector('[data-reader-listen]').click());
    expect(handleSpeak.mock.calls[0][0]).not.toMatch(/Rain guide|References/);
  });
});
