import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { renderToStaticMarkup } = require('../desktop/web-app/node_modules/react-dom/server');
const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];
const bilingualText = 'Primary passage.\n\n--- ENGLISH TRANSLATION ---\n\nCompanion passage.';
const languageCodes = { English: 'en-US', Spanish: 'es-ES', French: 'fr-FR', Arabic: 'ar-SA', Hebrew: 'he-IL' };
const direction = language => /^(Arabic|Hebrew)$/i.test(language) ? 'rtl' : 'ltr';
const t = key => ({
  'output.english_translation': 'English Translation',
  'output.translation_into': 'Translation ({language})',
}[key] || key);

function renderer(file, generatedContent, currentUiLanguage = 'French') {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('  const BilingualFieldRenderer =');
  const end = source.indexOf('  const REFERENCES_HEADER_RE =', start);
  if (start < 0 || end < start) throw new Error(`${file}: bilingual renderer boundaries changed`);
  const compiled = transformSync(source.slice(start, end) + '\nreturn BilingualFieldRenderer;', {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false, parserOpts: { allowReturnOutsideFunction: true },
  }).code;
  return new Function('React', 'renderFormattedText', 't', 'generatedContent', 'currentUiLanguage',
    'getSpeechLangCode', 'getContentDirection', compiled)(
    React, text => text, t, generatedContent, currentUiLanguage,
    language => languageCodes[language] || 'en-US', direction,
  );
}

function render(file, artifact, props = {}, uiLanguage = 'French') {
  const Component = renderer(file, artifact, uiLanguage);
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderToStaticMarkup(React.createElement(Component, { text: bilingualText, ...props }));
  return { wrapper, companion: wrapper.querySelector('.border-s-4') };
}

describe.each(COPIES)('saved companion language: %s', file => {
  it('keeps an English companion labeled English after the app language changes', () => {
    const { companion } = render(file, { config: { language: 'Arabic', translationTarget: 'English' } });
    expect(companion.textContent).toContain('English Translation');
    expect(companion.textContent).not.toContain('Translation (French)');
    expect(companion.getAttribute('lang')).toBe('en-US');
    expect(companion.getAttribute('dir')).toBe('ltr');
    expect(companion.classList.contains('text-left')).toBe(true);
    expect(companion.previousElementSibling.hasAttribute('dir')).toBe(false);
  });

  it.each(['Arabic', 'Hebrew'])('uses the saved %s direction and language, including before helpers load', language => {
    const { companion } = render(file, { config: { translationPolicy: { target: language } } });
    expect(companion.getAttribute('dir')).toBe('rtl');
    expect(companion.getAttribute('lang')).toBe(languageCodes[language]);
    expect(companion.classList.contains('text-right')).toBe(true);
    expect(companion.classList.contains('text-left')).toBe(false);
    expect(companion.textContent).toContain(`Translation (${language})`);
    const label = companion.firstElementChild;
    expect(label.getAttribute('lang')).toBe('fr-FR');
    expect(label.getAttribute('dir')).toBe('ltr');
  });

  it.each([
    { translationPolicy: { target: 'Spanish' } },
    { translationTarget: 'Spanish' },
    { config: { translationTarget: 'Spanish' } },
    { config: { attachedTranslationTarget: 'Spanish' } },
  ])('reads saved language metadata %j', artifact => {
    const { companion } = render(file, artifact);
    expect(companion.getAttribute('lang')).toBe('es-ES');
    expect(companion.textContent).toContain('Translation (Spanish)');
  });

  it('defaults legacy bilingual content to English without consulting current settings', () => {
    const { companion } = render(file, { config: { translationTarget: 'off' } }, {}, 'Arabic');
    expect(companion.getAttribute('lang')).toBe('en-US');
    expect(companion.getAttribute('dir')).toBe('ltr');
    expect(companion.textContent).toContain('English Translation');
  });

  it('accepts the actual artifact when rendering a resource other than the active one', () => {
    const { companion } = render(file, { translationTarget: 'English' }, { artifact: { translationTarget: 'Arabic' } });
    expect(companion.getAttribute('lang')).toBe('ar-SA');
    expect(companion.getAttribute('dir')).toBe('rtl');
  });

  it('accepts an explicit companion language for isolated fields', () => {
    const { companion } = render(file, { translationTarget: 'English' }, { translationLanguage: 'Hebrew' });
    expect(companion.getAttribute('lang')).toBe('he-IL');
    expect(companion.textContent).toContain('Translation (Hebrew)');
  });

  it('renders single-language content without inventing a second pane', () => {
    const { wrapper, companion } = render(file, { translationTarget: 'Arabic' }, { text: 'One passage only.' });
    expect(companion).toBeNull();
    expect(wrapper.textContent).toBe('One passage only.');
  });
});
