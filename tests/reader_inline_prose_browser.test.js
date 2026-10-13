import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { buildAppStylesModule } = require('../_build_app_styles_module.js');
const context = { window: { React }, console: { log() {} } };
vm.runInNewContext(buildAppStylesModule(readFileSync('app_styles_source.jsx', 'utf8')), context);
const collectStyles = node => !node || typeof node !== 'object' ? '' : node.type === 'style'
  ? '<style>' + node.props.children + '</style>'
  : React.Children.toArray(node.props?.children).map(collectStyles).join('');
const styles = collectStyles(context.window.AlloModules.AppStyles.AppStyles.type({}));
const utilityCss = readFileSync('app/static/css/' + readdirSync('app/static/css').find(name => /^main\.[a-z0-9]+\.css$/i.test(name)), 'utf8');
const themes = ['default', 'warm', 'sepia', 'blue', 'green', 'rose', 'dyslexia', 'dim', 'dark', 'highContrast'];
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60000);
afterAll(async () => { await browser?.close(); }, 60000);

// Exact words are used by original reading and both comparison panes. Their
// role="button" must retain keyboard access without inheriting toolbar tiles.
// Include a glossary term with the same attributes as the real renderer: its
// dotted underline remains a cue after the generic prose reset removes borders.
const word = id => `<span id="${id}" role="button" tabindex="0" data-exact-word="true" class="cursor-help rounded hover:bg-yellow-100 focus-visible:ring-2 focus-visible:ring-indigo-600">sunlight</span>`;
const glossaryClasses = 'allo-glossary-term cursor-help border-b border-dotted rounded px-0.5 transition-colors inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 text-indigo-600';
const markup = `<div id="shell" class="theme-light"><main class="allo-docsuite"><div id="reading" data-reading-theme="green"><section data-adapted-reader>
  <button id="toolbar" class="rounded border bg-white px-3 py-2">Display</button>
  <button id="display" type="button" data-reader-display aria-expanded="false" class="min-h-11 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"><span id="display-preview" aria-hidden="true" class="font-serif text-base leading-none">Aa</span>Display<svg id="display-icon" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 9 6 6 6-6" /></svg></button>
  <nav data-reading-outline class="rounded-xl border border-indigo-200 bg-white p-3"><ol>
    <li><button id="current-section" aria-current="location" class="flex min-h-11 w-full items-start gap-2 rounded-lg px-3 py-2 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 bg-indigo-50 font-bold text-indigo-950"><span>Photosynthesis</span><span aria-hidden="true">✓</span></button></li>
    <li><button id="next-section" class="flex min-h-11 w-full items-start gap-2 rounded-lg px-3 py-2 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 text-slate-800"><span>What plants need</span></button></li>
  </ol></nav>
  <div data-reading-card class="bg-orange-50 border-l-4 p-4">
    <div data-reading-passage><p>Plants use ${word('original')} to grow.
      <span id="glossary" data-exact-word="true" class="${glossaryClasses}" role="button" tabindex="0">photosynthesis</span>
      <span id="glossary-read" class="${glossaryClasses}" role="button" tabindex="0">chlorophyll</span>
      <span id="adapted-word" data-reading-word="true" role="button" tabindex="0">water</span>
      <span id="sentence" data-exact-sentence="true" role="button" tabindex="0">Plants make food.</span>
    </p></div>
    <div data-compare-version="source">Original ${word('compare-original')}</div>
    <div data-compare-version="adapted">Adapted ${word('compare-adapted')}</div>
  </div>
</section></div></main></div>`;

async function pageFor() {
  const page = await browser.newPage({ viewport: { width: 760, height: 700 }, reducedMotion: 'reduce' });
  await page.route('**/*', route => route.request().url() === 'http://inline-prose.test/'
    ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><style>' + utilityCss + '</style>' + styles + '</head><body>' + markup + '</body></html>' })
    : route.abort());
  await page.goto('http://inline-prose.test/');
  await page.mouse.move(750, 690);
  return page;
}

async function setTheme(page, shell, theme) {
  await page.evaluate(({ shell, theme }) => {
    document.getElementById('shell').className = 'theme-' + shell;
    document.getElementById('reading').dataset.readingTheme = theme;
    document.activeElement?.blur();
  }, { shell, theme });
}

async function proseStyles(page) {
  return page.locator('[data-exact-word], [data-reading-word], [data-exact-sentence], .allo-glossary-term').evaluateAll(words => words.map(word => {
    const style = getComputedStyle(word);
    return { id: word.id, display: style.display, background: style.backgroundColor, border: style.borderTopWidth,
      shadow: style.boxShadow, decoration: style.textDecorationLine, color: style.color };
  }));
}

const ratio = (a, b) => {
  const luminance = color => {
    const rgb = color.match(/[\d.]+/g).slice(0, 3).map(value => Number(value) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

describe('inline reader prose in the browser', () => {
  it('keeps the current section distinct, readable and keyboard focused across reading and app themes', async () => {
    const page = await pageFor();
    try {
      await page.keyboard.press('Tab');
      for (const shell of ['light', 'dark', 'contrast']) for (const theme of themes) {
        await page.mouse.move(750, 690);
        await setTheme(page, shell, theme);
        const selected = page.locator('#current-section');
        await selected.focus();
        const state = await selected.evaluate(button => {
          const style = getComputedStyle(button), marker = getComputedStyle(button, '::before');
          return { background: style.backgroundColor, color: style.color,
            label: getComputedStyle(button.querySelector('span')).color,
            otherBackground: getComputedStyle(document.getElementById('next-section')).backgroundColor,
            focused: button.matches(':focus-visible'), outline: parseFloat(style.outlineWidth),
            marker: marker.content, markerWidth: parseFloat(marker.borderInlineStartWidth), markerColor: marker.borderInlineStartColor };
        });
        const hint = `${shell}/${theme}/section`;
        expect(state.background, hint).not.toBe(state.otherBackground);
        expect(ratio(state.color, state.background), hint).toBeGreaterThanOrEqual(4.5);
        expect(ratio(state.label, state.background), hint + '/label').toBeGreaterThanOrEqual(4.5);
        expect(state.marker, hint).toBe('""');
        expect(state.markerWidth, hint).toBeGreaterThanOrEqual(3);
        expect(state.markerColor, hint).toBe(state.color);
        expect(state.focused, hint).toBe(true);
        expect(state.outline, hint).toBeGreaterThanOrEqual(2);
        await selected.hover();
        const hovered = await selected.evaluate(button => ({ background: getComputedStyle(button).backgroundColor,
          label: getComputedStyle(button.querySelector('span')).color }));
        expect(ratio(hovered.label, hovered.background), hint + '/hover').toBeGreaterThanOrEqual(4.5);
      }
      await page.locator('[data-reading-outline]').evaluate(nav => { nav.dir = 'rtl'; });
      const marker = await page.locator('#current-section').evaluate(button => {
        const style = getComputedStyle(button, '::before');
        return { left: parseFloat(style.borderLeftWidth), right: parseFloat(style.borderRightWidth) };
      });
      expect(marker.right).toBe(3);
      expect(marker.left).toBe(0);
    } finally { await page.close(); }
  }, 60000);

  it('preserves the current section marker and system highlight in forced colors', async () => {
    const page = await pageFor();
    try {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.keyboard.press('Tab');
      for (const shell of ['light', 'dark', 'contrast']) for (const theme of ['default', 'green', 'highContrast']) {
        await setTheme(page, shell, theme);
        await page.locator('#current-section').focus();
        const state = await page.locator('#current-section').evaluate(button => {
          const style = getComputedStyle(button), marker = getComputedStyle(button, '::before');
          const system = document.createElement('span');
          system.style.cssText = 'color:HighlightText;background:Highlight;forced-color-adjust:none';
          document.body.append(system);
          const sample = getComputedStyle(system);
          const result = { color: style.color, label: getComputedStyle(button.querySelector('span')).color,
            background: style.backgroundColor, outline: parseFloat(style.outlineWidth),
            markerWidth: parseFloat(marker.borderInlineStartWidth), markerColor: marker.borderInlineStartColor,
            expectedColor: sample.color, expectedBackground: sample.backgroundColor };
          system.remove(); return result;
        });
        expect(state.color).toBe(state.expectedColor);
        expect(state.label).toBe(state.expectedColor);
        expect(state.background).toBe(state.expectedBackground);
        expect(state.markerWidth).toBe(3);
        expect(state.markerColor).toBe(state.expectedColor);
        expect(state.outline).toBeGreaterThanOrEqual(2);
      }
    } finally { await page.close(); }
  });

  it('keeps the Display label, preview and icon readable on high-contrast hover in every app theme', async () => {
    const page = await pageFor();
    try {
      for (const shell of ['light', 'dark', 'contrast']) {
        await setTheme(page, shell, 'highContrast');
        await page.locator('#display').hover();
        const colors = await page.locator('#display').evaluate(button => ({
          background: getComputedStyle(button).backgroundColor,
          label: getComputedStyle(button).color,
          preview: getComputedStyle(button.querySelector('span')).color,
          icon: getComputedStyle(button.querySelector('svg')).stroke,
        }));
        for (const part of ['label', 'preview', 'icon']) {
          expect(ratio(colors[part], colors.background), `${shell}/highContrast/hover/${part}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    } finally { await page.close(); }
  });

  it('keeps original and comparison words unboxed in every reading and app theme', async () => {
    const page = await pageFor();
    try {
      for (const shell of ['light', 'dark', 'contrast']) for (const theme of themes) {
        await setTheme(page, shell, theme);
        for (const word of await proseStyles(page)) {
          const hint = `${shell}/${theme}/${word.id}`;
          expect(word.display, hint).toBe('inline');
          expect(word.background, hint).toBe('rgba(0, 0, 0, 0)');
          expect(word.border, hint).toBe('0px');
          expect(word.shadow, hint).toBe('none');
          if (word.id.startsWith('glossary')) expect(word.decoration, hint).toContain('underline');
        }
        const toolbarBorder = await page.locator('#toolbar').evaluate(button => getComputedStyle(button).borderTopWidth);
        expect(parseFloat(toolbarBorder), `${shell}/${theme} toolbar remains a control`).toBeGreaterThan(0);
      }
    } finally { await page.close(); }
  }, 60000);

  it('retains visible keyboard focus and readable highlighting on exact words', async () => {
    const page = await pageFor();
    try {
      await page.keyboard.press('Tab');
      for (const shell of ['light', 'dark', 'contrast']) for (const theme of themes) for (const target of ['compare-original', 'glossary', 'glossary-read']) {
        await setTheme(page, shell, theme);
        await page.locator('#' + target).focus();
        const focused = await page.locator('#' + target).evaluate(word => {
          const style = getComputedStyle(word);
          return { visible: word.matches(':focus-visible'), outline: parseFloat(style.outlineWidth),
            outlineStyle: style.outlineStyle, foreground: style.color, background: style.backgroundColor };
        });
        const hint = `${shell}/${theme}/${target}`;
        expect(focused.visible, hint).toBe(true);
        expect(focused.outline, hint).toBeGreaterThanOrEqual(2);
        expect(focused.outlineStyle, hint).toBe('solid');
        expect(focused.background, hint).not.toBe('rgba(0, 0, 0, 0)');
        expect(ratio(focused.foreground, focused.background), hint).toBeGreaterThanOrEqual(4.5);
      }
    } finally { await page.close(); }
  }, 60000);

  it('prints exact words as black unboxed text in original and comparison passages', async () => {
    const page = await pageFor();
    try {
      await page.emulateMedia({ media: 'print' });
      for (const theme of themes) {
        await setTheme(page, 'contrast', theme);
        for (const word of await proseStyles(page)) {
          expect(word.border, theme + '/' + word.id).toBe('0px');
          expect(word.background, theme + '/' + word.id).toBe('rgba(0, 0, 0, 0)');
          expect(word.color, theme + '/' + word.id).toBe('rgb(0, 0, 0)');
        }
        const section = await page.locator('#current-section').evaluate(button => ({
          background: getComputedStyle(button).backgroundColor,
          color: getComputedStyle(button).color,
          label: getComputedStyle(button.querySelector('span')).color,
          marker: getComputedStyle(button, '::before').content,
          paper: getComputedStyle(document.getElementById('reading')).backgroundColor,
        }));
        expect(['rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)'], theme + '/section').toContain(section.background);
        expect(section.paper, theme + '/paper').toBe('rgb(255, 255, 255)');
        expect(section.color, theme + '/section').toBe('rgb(0, 0, 0)');
        expect(section.label, theme + '/section-label').toBe('rgb(0, 0, 0)');
        expect(section.marker, theme + '/section-marker').toBe('none');
      }
    } finally { await page.close(); }
  });

  it('uses system highlight and keyboard focus when forced colors are enabled', async () => {
    const page = await pageFor();
    try {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.keyboard.press('Tab');
      await page.locator('#compare-original').focus();
      const focused = await page.locator('#compare-original').evaluate(word => {
        const style = getComputedStyle(word);
        const system = document.createElement('span');
        system.style.cssText = 'color:HighlightText;background:Highlight';
        document.body.append(system);
        const sample = getComputedStyle(system);
        const result = { color: style.color, background: style.backgroundColor, outline: parseFloat(style.outlineWidth),
          expectedColor: sample.color, expectedBackground: sample.backgroundColor };
        system.remove();
        return result;
      });
      expect(focused.color).toBe(focused.expectedColor);
      expect(focused.background).toBe(focused.expectedBackground);
      expect(focused.outline).toBeGreaterThanOrEqual(2);
    } finally { await page.close(); }
  });
});
