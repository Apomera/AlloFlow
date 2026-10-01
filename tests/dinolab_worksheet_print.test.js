// The printable quiz worksheet had ONE print button, with the answer key in the
// same document. The key did start on its own page, and the card said "followed
// by a separate answer key" - so nothing was inaccurate. But a teacher printing
// copies for students still got the answers in the same job, and had to either
// bin those pages or work out the page range by hand.
//
// Now there are two buttons: worksheet only, or worksheet plus key. The hiding
// is a print-media rule on a body class, so the key stays visible on screen.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

// Recover the worksheet stylesheet the tool actually builds, rather than
// asserting against a retyped copy of it.
function worksheetCss() {
  const h1 = SRC.indexOf('Dino Lab quiz</h1>');
  expect(h1, 'the quiz worksheet was not found').toBeGreaterThan(-1);
  const start = SRC.lastIndexOf('var css =', h1);
  // Bound at the next statement - a fixed window runs into the html assembly.
  const end = SRC.indexOf('var html =', start);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(SRC.slice(start, end) + '\nreturn css;')();
}

describe('a teacher can print the worksheet without the answers', () => {
  it('offers both print choices', () => {
    expect(SRC).toContain('Print worksheet only');
    expect(SRC).toContain('Print with answer key');
  });

  it('adds and then removes the class, so the screen is unchanged', () => {
    // Leaving the class on would blank the key in the open window after
    // printing, which looks like data loss.
    const bar = SRC.slice(SRC.indexOf('Print worksheet only') - 220,
      SRC.indexOf('Print worksheet only') + 240);
    expect(bar).toContain('classList.add');
    expect(bar).toContain('classList.remove');
  });

  it('hides the key only when printing', () => {
    const css = worksheetCss();
    expect(css).toMatch(/@media print\{body\.hide-key h2,body\.hide-key \.k\{display:none\}\}/);
  });

  it('keeps the key on its own page when it IS printed', () => {
    const css = worksheetCss();
    expect(css, 'the answer key no longer breaks to a fresh page')
      .toMatch(/h2\{[^}]*page-break-before:always/);
  });

  it('still hides the on-screen button bar from print', () => {
    const css = worksheetCss();
    expect(css).toMatch(/@media print\{\.no-print\{display:none\}\}/);
  });
});

describe('the rule targets the key and nothing else', () => {
  function hiddenUnder(cls) {
    const dom = new JSDOM('<!doctype html><html><body' + (cls ? ' class="' + cls + '"' : '') + '>' +
      '<div class="bar no-print">bar</div><h1>Dino Lab quiz</h1>' +
      '<div class="q">Q1</div><h2>Answer key</h2><div class="k">A1</div>' +
      '</body></html>');
    return [...dom.window.document.querySelectorAll('body.hide-key h2, body.hide-key .k')]
      .map((n) => n.tagName.toLowerCase() + (n.className ? '.' + n.className : ''));
  }

  it('hides the heading and every key entry', () => {
    const hidden = hiddenUnder('hide-key');
    expect(hidden).toContain('h2');
    expect(hidden).toContain('div.k');
  });

  it('leaves the questions and the title printable', () => {
    const hidden = hiddenUnder('hide-key');
    expect(hidden.some((x) => x.includes('.q')), 'the questions would be hidden too').toBe(false);
    expect(hidden).not.toContain('h1');
  });

  it('does nothing at all without the class', () => {
    expect(hiddenUnder('')).toEqual([]);
  });
});

describe('the card says what the buttons now do', () => {
  it('describes both print paths', () => {
    // The old copy said the key was "separate", which was true of the page
    // break but not of the print job.
    expect(SRC).toContain('Print the worksheet on its own for students');
    expect(SRC).not.toContain('followed by a separate answer key with the explanations');
  });
});
