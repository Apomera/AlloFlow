import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { renderToStaticMarkup } = require(resolve('desktop/web-app/node_modules/react-dom/server'));
const transforms = require('../reports/own-source-research-improvements-2026-09-26/citation-renderer-transform.cjs');
const read = path => readFileSync(resolve(path), 'utf8');
const inlineSource = read('phase_n_misc_helpers_source.jsx');
const simplifiedSource = read('view_simplified_source.jsx');

function compileSlice(source, startMarker, endMarker, returnName) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Renderer helper seam missing');
  // Vitest's jsdom Uint8Array realm differs from esbuild's Node TextEncoder.
  // Compile in Node, as production builders do, then evaluate in this DOM.
  const code = execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').transformSync(require('fs').readFileSync(0,'utf8'),{loader:'jsx',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).code)"], {
    input: source.slice(start, end), encoding: 'utf8', windowsHide: true,
  });
  return new Function('React', 'simplifiedText', `${code}\nreturn ${returnName};`)(React, (_key, fallback, params) => {
    return params ? fallback.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '') : fallback;
  });
}

// The integrator applies this report transform to the canonical renderer once.
// Keep these behavior tests usable before and after that application.
const transformedInline = inlineSource.includes(String.raw`const parts = text.split(/(\\[\x21-\x2f`)
  ? inlineSource : transforms.inline(inlineSource);
const transformedSimplified = simplifiedSource.includes(String.raw`return String(text || '').split(/(\\[\x21-\x2f`)
  ? simplifiedSource : transforms.simplified(simplifiedSource);
const format = compileSlice(transformedInline, 'const _SUPERSCRIPT_DIGITS', 'const handleCheckLevel', 'formatInteractiveText');
const originalFormat = compileSlice(inlineSource, 'const _SUPERSCRIPT_DIGITS', 'const handleCheckLevel', 'formatInteractiveText');
const simplified = compileSlice(transformedSimplified, 'function simplifiedLinkLabel(', 'function simplifiedExactBlocks(', 'simplifiedInline');
const originalSimplified = compileSlice(simplifiedSource, 'function simplifiedLinkLabel(', 'function simplifiedExactBlocks(', 'simplifiedInline');

// Entity decoding models downstream glossary/text leaves: splitting an escaped
// ampersand into a literal atom must keep "&not;" from becoming the symbol ¬.
function textLeaf(text) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}
const deps = {
  highlightGlossaryTerms: textLeaf,
  MathSymbol: ({ text }) => React.createElement('span', { 'data-math': true }, text),
  t: key => key,
  focusMode: false,
};

function render(nodes) {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(React.createElement(React.Fragment, null, nodes));
  return host;
}

describe.each([
  ['shared inline', text => format(text, false, false, deps)],
  ['simplified inline', text => simplified(text, textLeaf)],
])('%s escaped document punctuation', (_name, parse) => {
  it.each([
    [String.raw`\*stars\*`, '*stars*'],
    [String.raw`\[link\]\(x\)`, '[link](x)'],
    [String.raw`\&not;`, '&not;'],
    [String.raw`\\`, '\\'],
    [String.raw`\# heading \> quote \_under\_ \{value\} \|`, '# heading > quote _under_ {value} |'],
    [String.raw`\$x\+y\$`, '$x+y$'],
  ])('renders %s literally', (escaped, expected) => {
    const host = render(parse(escaped));
    expect(host.textContent).toBe(expected);
    expect(host.querySelector('a, em, strong, [data-math]')).toBeNull();
  });

  it('renders escaped document citations as text rather than clickable links', () => {
    const host = render(parse(String.raw`\[Document 1\]\(\#allo-doc-passage-1\)`));
    expect(host.textContent).toBe('[Document 1](#allo-doc-passage-1)');
    expect(host.querySelector('a')).toBeNull();
  });

  it('keeps actual document citation anchors inspectable', () => {
    const host = render(parse('[Document 1](#allo-doc-passage-1)'));
    expect(host.querySelector('a').getAttribute('href')).toBe('#allo-doc-passage-1');
    expect(host.querySelector('a').getAttribute('aria-haspopup')).toBe('dialog');
    expect(host.querySelector('a').hasAttribute('target')).toBe(false);
  });
});

describe('unchanged Markdown and math behavior', () => {
  it.each([
    '**Bold** and *italic* and [a link](https://example.org).',
    'Sam had $5 and spent $3.',
    String.raw`Use $\frac{x}{y}$ and $$a^2+b^2=c^2$$.`,
    String.raw`A literal \word and an unescaped &not; entity.`,
  ])('preserves shared inline rendering for %s', text => {
    expect(render(format(text, false, false, deps)).innerHTML).toBe(render(originalFormat(text, false, false, deps)).innerHTML);
  });

  it.each([
    '**Bold** and __also bold__ and *italic* and [a link](https://example.org).',
    '`code \\* stays code`',
    String.raw`Use $\frac{x}{y}$ and a literal \word.`,
  ])('preserves simplified inline rendering for %s', text => {
    expect(render(simplified(text, textLeaf)).innerHTML).toBe(render(originalSimplified(text, textLeaf)).innerHTML);
  });

  it('keeps stored Markdown offsets after consumed escapes', () => {
    const calls = [];
    const leaf = (value, offset) => { if (value) calls.push([value, offset]); return value; };
    expect(render(simplified(String.raw`A \*word\* Z`, leaf, 10)).textContent).toBe('A *word* Z');
    expect(calls).toEqual([['A ', 10], ['*', 13], ['word', 14], ['*', 19], [' Z', 20]]);
  });
});
