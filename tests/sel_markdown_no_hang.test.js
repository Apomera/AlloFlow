// _selRenderMarkdown hung forever on a line such as "# " with nothing after it: the heading pattern needs
// text, and the paragraph loop stops at any line starting with "# ", so nothing moved the position on.
// Its only caller passes constant text today. This keeps it safe if a pack or a student's text ever reaches it.

import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const src = fs.readFileSync('sel_hub/sel_hub_module.js', 'utf8').replace(/\r\n/g, '\n');
const a = src.indexOf('function _selRenderMarkdown(React, md) {');
const end = 'return blocks;\n    }';
const fn = src.slice(a, src.indexOf(end, a) + end.length);

function render(md) {
  const script = `${fn}
    var React = { createElement: function (t, p, c) { return { t: t, c: c }; } };
    JSON.stringify(_selRenderMarkdown(React, MD));`;
  return JSON.parse(vm.runInNewContext(script, { MD: md }, { timeout: 2000 }));
}

describe('SEL Hub markdown renderer', () => {
  it.each(['# ', '#\t', '## ', '###### ', '# title\r', 'before\n# \nafter'])('finishes on %j', (md) => {
    expect(Array.isArray(render(md))).toBe(true);
  });

  it('keeps the bare marker as plain text, so nothing is lost', () => {
    expect(render('# ').map((b) => b.t)).toEqual(['p']);
    expect(render('before\n# \nafter').map((b) => b.t)).toEqual(['p', 'p', 'p']);
  });

  it('still renders real headings, lists and paragraphs', () => {
    expect(render('# Title\n\n- one\n- two\n\nSome text').map((b) => b.t)).toEqual(['h1', 'ul', 'p']);
  });
});
