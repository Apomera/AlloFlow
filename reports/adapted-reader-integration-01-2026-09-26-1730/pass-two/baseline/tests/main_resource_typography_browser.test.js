import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { chromium } from 'playwright';
import { parse } from '@babel/parser';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const React = require('../desktop/web-app/node_modules/react');
const { buildAppStylesModule } = require('../_build_app_styles_module.js');
const stylesSource = readFileSync('app_styles_source.jsx', 'utf8');
const stylesCode = buildAppStylesModule(stylesSource);
const context = { window: { React }, console: { log() {} } };
vm.runInNewContext(stylesCode, context);
// Read the actual style children as the client renderer does. React 18 SSR
// escapes quotes inside <style>, which would corrupt attribute selectors.
const styles = (props) => {
  const tree = context.window.AlloModules.AppStyles.AppStyles.type({ disableAnimations: true, ...props });
  const collect = node => {
    if (!node || typeof node !== 'object') return '';
    if (node.type === 'style') return '<style>' + node.props.children + '</style>';
    return React.Children.toArray(node.props?.children).map(collect).join('');
  };
  return collect(tree);
};
const fontCode = readFileSync('ui_font_library_module.js', 'utf8');
const utilityFile = readdirSync('app/static/css').find(file => /^main\.[a-z0-9]+\.css$/i.test(file));
const utilityCss = readFileSync('app/static/css/' + utilityFile, 'utf8');
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60000);
afterAll(async () => { await browser?.close(); }, 60000);
async function pageFor(html = '') {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**/*', route => route.request().url() === 'http://typography.test/' ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><style>' + utilityCss + '</style></head><body>' + html + '</body></html>' }) : route.abort());
  await page.goto('http://typography.test/');
  return page;
}
const sample = `<div data-allo-anno-host="true" class="font-georgia" style="max-width:100%">
<div class="prose"><h2 id="heading">Reading heading</h2><p id="paragraph">Read, explore and explain what you learned.</p></div>
<div id="card" class="text-[12px]" style="line-height:1.1;letter-spacing:-0.02em">Resource card label with enough words to wrap on a narrow screen.</div>
<label id="label" for="answer">Your response</label><textarea id="answer">My explanation</textarea>
<details open><summary id="summary">Read the explanation</summary></details>
<table><tr><th id="th">Evidence</th><td id="td">A supporting detail</td></tr></table>
<div class="katex"><span id="formula" class="text-[12px]" style="font-family:'Cambria Math';font-size:12px;line-height:1;letter-spacing:0">x²</span></div>
<svg width="120" height="30"><text id="diagram" style="font-family:monospace;font-size:12px">Diagram</text></svg>
</div><span id="outside" class="text-[12px]" style="font-size:12px">Outside resource</span>`;

describe('main resource typography in Chromium', () => {
  it('applies selected line/letter spacing to prose, cards, disclosures and response fields', async () => {
    const page = await pageFor(styles({ baseFontSize: 24, lineHeight: 2.2, letterSpacing: 0.12 }) + sample);
    try {
      await page.addScriptTag({ content: fontCode });
      for (const id of ['heading','paragraph','card','label','answer','summary','th','td']) {
        const c = await page.locator('#' + id).evaluate(el => { const s = getComputedStyle(el); return { size: parseFloat(s.fontSize), line: parseFloat(s.lineHeight), spacing: parseFloat(s.letterSpacing), font: s.fontFamily }; });
        expect(c.font, id).toContain('Georgia');
        expect(c.line / c.size, id).toBeCloseTo(2.2, 2);
        expect(c.spacing / c.size, id).toBeCloseTo(0.12, 2);
      }
    } finally { await page.close(); }
  });

  it('scales small resource utility text with the root size without changing diagram or formula metrics', async () => {
    for (const size of [16, 24, 32, 48]) {
      const page = await pageFor(styles({ baseFontSize: size, lineHeight: 2, letterSpacing: 0.1 }) + sample);
      try {
        await page.addScriptTag({ content: fontCode });
        const result = await page.evaluate(() => {
          const css = id => getComputedStyle(document.getElementById(id));
          const card = document.getElementById('card');
          return { card: css('card').fontSize, formula: css('formula').fontSize, mathFont: css('formula').fontFamily, mathLine: css('formula').lineHeight, mathSpacing: css('formula').letterSpacing, diagram: css('diagram').fontSize, diagramFont: css('diagram').fontFamily, outside: css('outside').fontSize, overflow: card.scrollWidth > card.clientWidth + 1 };
        });
        expect(result.card).toBe((size * 0.75) + 'px');
        expect(result.formula).toBe('12px');
        expect(result.mathFont).toContain('Cambria Math');
        expect(result.mathLine).toBe('12px');
        expect(result.mathSpacing).toBe('normal');
        expect(result.diagram).toBe('12px');
        expect(result.diagramFont).toBe('monospace');
        expect(result.outside).toBe('12px');
        expect(result.overflow).toBe(false);
      } finally { await page.close(); }
    }
  });

  it('applies every selectable font family to resource prose and inputs', async () => {
    const page = await pageFor(styles({}) + sample);
    try {
      await page.addScriptTag({ content: fontCode });
      const results = await page.evaluate(() => window.FONT_OPTIONS.filter(o => o.family).map(option => {
        document.querySelector('[data-allo-anno-host]').className = option.cssClass;
        return { id: option.id, expected: option.family.split(',')[0].replaceAll("'", ''), paragraph: getComputedStyle(document.getElementById('paragraph')).fontFamily, input: getComputedStyle(document.getElementById('answer')).fontFamily, formula: getComputedStyle(document.getElementById('formula')).fontFamily };
      }));
      expect(results.length).toBeGreaterThan(30);
      for (const result of results) {
        expect(result.paragraph, result.id).toContain(result.expected);
        expect(result.input, result.id).toContain(result.expected);
        expect(result.formula, result.id).toContain('Cambria Math');
      }
    } finally { await page.close(); }
  });

  it('leaves disabled resource controls disabled when the font library loads', async () => {
    const page = await pageFor('<button id="blocked" disabled>Generate</button><input id="locked" disabled value="Saved answer"><textarea id="locked-text" disabled>Saved response</textarea>');
    try {
      await page.evaluate(() => { window.clicks = 0; document.getElementById('blocked').addEventListener('click', () => window.clicks++); });
      await page.addScriptTag({ content: fontCode });
      const result = await page.evaluate(() => {
        document.getElementById('blocked').click();
        return { clicks: window.clicks, disabled: ['blocked','locked','locked-text'].map(id => document.getElementById(id).disabled) };
      });
      expect(result.disabled).toEqual([true,true,true]);
      expect(result.clicks).toBe(0);
    } finally { await page.close(); }
  });

  it('loads Andika italic first and shares its request with bold italic and regular', async () => {
    const page = await pageFor();
    try {
      await page.addScriptTag({ content: fontCode });
      const result = await page.evaluate(async () => {
        const a = window.__alloEnsureUIFont('andika-italic');
        const b = window.__alloEnsureUIFont('andika-bold-italic');
        const c = window.__alloEnsureUIFont('andika');
        const links = Array.from(document.querySelectorAll('link[data-alloflow-ui-font="andika"]'));
        const href = links[0]?.href;
        links[0]?.dispatchEvent(new Event('load'));
        return { same: a === b && b === c, count: links.length, href, loaded: await a };
      });
      expect(result.same).toBe(true);
      expect(result.count).toBe(1);
      expect(result.href).toContain('Andika:ital,wght@0,400;0,700;1,400;1,700');
      expect(result.loaded).toBe(true);
    } finally { await page.close(); }
  });

  it('restores preferences and immediately applies keyboard range changes through the actual host bindings', async () => {
    const source = readFileSync('AlloFlowANTI.txt', 'utf8');
    const header = readFileSync('view_header_source.jsx', 'utf8');
    let input;
    const walk = node => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'JSXElement' && node.openingElement.attributes.some(a => a.name?.name === 'id' && a.value?.value === 'header-text-font-size')) input = header.slice(node.start, node.end);
      for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
    };
    walk(parse(header, { sourceType: 'script', plugins: ['jsx'] }));
    expect(input).toBeTruthy();
    const declarations = source.split('\n').filter(line => /const \[baseFontSize, setBaseFontSize\]|const sliderFontSize =|const setSliderFontSize =|const \[letterSpacing, setLetterSpacing\]|useEffect\(\(\) => \{ safeSetItem\('allo_(base_font_size|letter_spacing)'/.test(line)).join('\n');
    const code = babel.transformSync(`function Harness() { const {useState,useEffect} = React; ${declarations}
      return <><window.AlloModules.AppStyles.AppStyles baseFontSize={baseFontSize} letterSpacing={letterSpacing} disableAnimations={true}/>${input}<output id="size">{baseFontSize}</output><output id="spacing">{letterSpacing}</output><button onClick={() => setLetterSpacing(0.17)}>Space letters</button></>;
    } ReactDOM.createRoot(document.getElementById('root')).render(<Harness/>);`, { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code;
    const page = await pageFor('<div id="root"></div>');
    try {
      await page.evaluate(() => { localStorage.setItem('allo_base_font_size', '24'); localStorage.setItem('allo_letter_spacing', '0.12'); window.safeGetItem = k => localStorage.getItem(k); window.safeSetItem = (k,v) => localStorage.setItem(k,v); });
      await page.addScriptTag({ path: 'desktop/web-app/node_modules/react/umd/react.development.js' });
      await page.addScriptTag({ path: 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js' });
      await page.addScriptTag({ content: stylesCode });
      await page.addScriptTag({ content: code });
      await page.waitForFunction(() => document.getElementById('size')?.textContent === '24');
      expect(await page.locator('#header-text-font-size').inputValue()).toBe('24');
      expect(await page.locator('#spacing').textContent()).toBe('0.12');
      await page.locator('#header-text-font-size').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => getComputedStyle(document.documentElement).fontSize === '25px');
      expect(await page.locator('#size').textContent()).toBe('25');
      expect(await page.evaluate(() => localStorage.getItem('allo_base_font_size'))).toBe('25');
      await page.getByRole('button', { name: 'Space letters' }).click();
      expect(await page.evaluate(() => localStorage.getItem('allo_letter_spacing'))).toBe('0.17');
    } finally { await page.close(); }
  });

  it('keeps real Anchor Chart headings and editable fields scalable at a narrow viewport', async () => {
    const page = await pageFor(styles({ baseFontSize: 24, lineHeight: 1.8, letterSpacing: 0.05 }) + '<div data-allo-anno-host="true" class="font-georgia"><div id="chart"></div></div>');
    try {
      await page.addScriptTag({ path: 'desktop/web-app/node_modules/react/umd/react.development.js' });
      await page.addScriptTag({ path: 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js' });
      await page.addScriptTag({ content: fontCode });
      await page.addScriptTag({ path: 'anchor_charts_module.js' });
      await page.evaluate(() => {
        ReactDOM.createRoot(document.getElementById('chart')).render(React.createElement(window.AlloModules.AnchorChartView, {
          generatedContent: { id: 'chart-qa', type: 'anchor-chart', data: { title: 'Water cycle', chartType: 'comparison', sections: [{ id: 'evaporation', label: 'Evaporation', bullets: ['Water becomes vapor'] }, { id: 'condensation', label: 'Condensation', bullets: ['Vapor becomes liquid'] }], interactive: { armed: false } } },
          isTeacherMode: true, handleNoteUpdate: () => {}, allowRuntimeAi: false, t: (key, fallback) => fallback || key
        }));
      });
      await page.locator('.ac-title').waitFor();
      expect(await page.locator('.ac-section-layout').first().evaluate(el => getComputedStyle(el).flexDirection)).toBe('column');
      for (const [selector, size] of [['.ac-title',63],['.ac-section-label',33],['.ac-bullets li span:last-child',27]]) {
        const c = await page.locator(selector).first().evaluate(el => { const s = getComputedStyle(el); return { family: s.fontFamily, size: parseFloat(s.fontSize) }; });
        expect(c.family, selector).toContain('Georgia');
        expect(c.size, selector).toBe(size);
      }
      const clippedText = await page.locator('.ac-title, .ac-section-label, .ac-bullets li span:last-child').evaluateAll(elements => elements.filter(el => {
        const limit = el.closest('.ac-root').getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(el);
        return Array.from(range.getClientRects()).some(rect => rect.left < limit.left - 1 || rect.right > limit.right + 1);
      }).map(el => el.textContent));
      expect(clippedText).toEqual([]);
      await page.screenshot({ path: 'scratch/main24-anchor-reading-24px.png', fullPage: true });
      await page.locator('[data-help-key="anchor_chart_edit_toggle"]').click();
      const input = page.locator('.ac-root input').first();
      await input.waitFor();
      expect(await input.evaluate(el => getComputedStyle(el).fontFamily)).toContain('Georgia');
      const overflow = await page.locator('.ac-root').evaluate(el => el.scrollWidth > el.clientWidth + 1);
      expect(overflow).toBe(false);
      await page.screenshot({ path: 'scratch/main24-anchor-typography-24px.png', fullPage: true });
    } finally { await page.close(); }
  });

  it('keeps voice enlargement monotonic throughout the supported size range', () => {
    const source = readFileSync('AlloFlowANTI.txt', 'utf8');
    const bigger = source.match(/fontBigger: (\(\) => \{[^\n]+\}),/)[1];
    const setSize = source.match(/setFontSizeTo: (\(nv\) => \{[^\n]+\}),/)[1];
    for (const [current, expected] of [[16,18],[32,34],[40,42],[48,48]]) {
      const values = [];
      const run = vm.runInNewContext(bigger, { sliderFontSize: current, setSliderFontSize: v => values.push(v) });
      expect(run()).toBe(expected);
      expect(values).toEqual([expected]);
    }
    const values = [];
    const run = vm.runInNewContext(setSize, { setSliderFontSize: v => values.push(v) });
    expect(run(44)).toBe(44);
    expect(run(100)).toBe(48);
    expect(values).toEqual([44,48]);
  });

  it('rejects corrupt stored letter spacing and accepts the full supported range', () => {
    const source = readFileSync('AlloFlowANTI.txt', 'utf8');
    const declaration = source.split('\n').find(line => line.includes('const [letterSpacing, setLetterSpacing]'));
    for (const [stored, expected] of [[null,0],['garbage',0],['Infinity',0],['-0.1',0],['0.3',0],['0',0],['0.2',0.2]]) {
      const result = vm.runInNewContext(`(() => { ${declaration}; return letterSpacing; })()`, { useState: fn => [fn(), () => {}], safeGetItem: () => stored });
      expect(result, String(stored)).toBe(expected);
    }
  });
});
