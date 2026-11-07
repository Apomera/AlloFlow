// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrast theme: the host forces span, div and li ink yellow (app_styles_module.js:1003), so Machine Lab's yellow
// "selected" pills (Start, Halfway, Full stroke, 1 Adjust, 2 Run, 3 Prove, investigation steps) read 1:1.
// Only a browser can prove the pixels (see the contrast_bh report); here the rule is parsed and applied to real markup.
const DIR = process.env.MACHINELAB_HC_DIR || path.join(process.cwd(), 'stem_lab');
const src = fs.readFileSync(path.join(DIR, 'stem_tool_machinelab.js'), 'utf8');
const m = /st\.id = 'allo-machinelab-hc-extra-css';\s*st\.textContent = ("(?:[^"\\]|\\.)*");/.exec(src);
const css = m ? JSON.parse(m[1]) : '';
const scope = '.theme-contrast [data-stem-tool-shell="machineLab"]';

function matchesInk(el) {
  const sel = css.split('{')[0];
  return !!sel && el.matches(sel);
}
function mount(inner) {
  document.body.innerHTML = `<div class="theme-contrast"><div data-stem-tool-shell="machineLab">${inner}</div></div>`;
  return document.body.querySelector('[data-stem-tool-shell]').firstElementChild;
}

describe('Machine Lab contrast theme: yellow pills keep black ink', () => {
  it('carries its own block, scoped to the shell, outside any generated block', () => {
    expect(m, 'allo-machinelab-hc-extra-css is missing').not.toBeNull();
    const rules = css.split('}').filter(Boolean);
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) for (const s of r.split('{')[0].split(/,(?=\.theme-contrast)/)) expect(s.trim().startsWith(scope), s).toBe(true);
  });
  it('turns the ink black on the selected stroke pose pill and the workflow step pill', () => {
    expect(matchesInk(mount('<span style="border-radius: 6px; color: rgb(0, 0, 0); background: rgb(255, 255, 0);">Start</span>'))).toBe(true);
    expect(matchesInk(mount('<li style="background: rgb(255, 255, 0); color: rgb(0, 0, 0);">1 Set up</li>'))).toBe(true);
  });
  it('reaches text nested inside a filled element', () => {
    const el = mount('<div style="background: rgb(255, 255, 0);"><strong>Run</strong></div>');
    expect(matchesInk(el.querySelector('strong'))).toBe(true);
  });
  it('does not black out a button, which the host paints black (app_styles_module.js:1007)', () => {
    const b = mount('<button style="background: rgb(255, 255, 0);"><span>Check calculation</span></button>');
    expect(matchesInk(b)).toBe(false);
    expect(matchesInk(b.querySelector('span'))).toBe(false);
  });
  it('leaves an unfilled label alone', () => {
    expect(matchesInk(mount('<span style="background: transparent;">Halfway</span>'))).toBe(false);
  });
  it('only ever applies inside the contrast theme', () => {
    document.body.innerHTML = '<div data-stem-tool-shell="machineLab"><span id="x" style="background: rgb(255, 255, 0);">Start</span></div>';
    expect(matchesInk(document.getElementById('x'))).toBe(false);
  });
});

// Contrast theme: the host forces every button to the same black fill, green edge and ink (app_styles_module.js:1007), which
// erases the inline accent fill that marks the selected tab, level, machine or view. Pixels at rest before this block,
// selected and unselected alike: fill #000000, edge #00ff00. Selected must now invert, without colour alone carrying it.
function rules() {
  return css.split('}').filter((r) => r.includes('{')).map((r) => {
    const [sel, decl] = r.split('{');
    return { sels: sel.split(/,(?=\.theme-contrast)/).map((x) => x.trim()), decl };
  });
}
function declsFor(el, withPseudo) {
  let out = '';
  for (const r of rules()) {
    for (const raw of r.sels) {
      const hasHover = raw.includes(':hover');
      if (hasHover !== !!withPseudo) continue;
      const sel = raw.replace(/:hover/g, '').replace(/:not\(:focus-visible\)/g, '');
      if (el.matches(sel)) { out += r.decl + ';'; break; }
    }
  }
  return out;
}

describe('Machine Lab contrast theme: selected tab and selected level differ from their peers', () => {
  const tab = (on) => `<button role="tab" aria-selected="${on}" style="background: rgb(255, 255, 0);"><span>Build</span></button>`;
  const level = (on) => `<button aria-pressed="${on}" style="background: rgb(255, 255, 0);">Grades 3-5</button>`;

  it('inverts the selected view tab and level button to a yellow fill with black ink', () => {
    for (const html of [tab('true'), level('true')]) {
      const d = declsFor(mount(html));
      expect(d, html).toMatch(/background-color:#ff0(?:ff00)?!important/i);
      expect(d, html).toMatch(/background-image:none!important/i);
      expect(d, html).toMatch(/(?:^|;)color:#000(?:000)?!important/i);
    }
  });
  it('leaves unselected peers to the host button rule', () => {
    for (const html of [tab('false'), level('false'), '<button>Reset</button>']) {
      expect(declsFor(mount(html)), html).not.toMatch(/background-color/i);
    }
  });
  it('turns nested labels black too, because the host forces span yellow, and flattens nested fills', () => {
    const b = mount(tab('true'));
    const d = declsFor(b.querySelector('span'));
    expect(d).toMatch(/(?:^|;)color:#000(?:000)?!important/i);
    expect(d).toMatch(/background-color:transparent!important/i);
    expect(declsFor(mount(tab('false')).querySelector('span'))).toBe('');
  });
  it('does not repaint inside an svg: the art reads its own stroke', () => {
    const b = mount('<button aria-pressed="true"><svg><circle r="3"></circle></svg></button>');
    expect(declsFor(b.querySelector('circle'))).not.toMatch(/background-color/i);
  });
  it('repaints art drawn in the palette yellow or white, which would vanish on the new fill', () => {
    const b = mount('<button aria-pressed="true"><svg><path id="a" stroke="#ffff00" fill="#ffff00"></path><path id="w" stroke="#ffffff" fill="none"></path><path id="k" stroke="#000000"></path></svg></button>');
    const a = declsFor(b.querySelector('#a'));
    expect(a).toMatch(/stroke:#000!important/);
    expect(a).toMatch(/fill:#000!important/);
    expect(declsFor(b.querySelector('#w'))).toMatch(/stroke:#000!important/);
    expect(declsFor(b.querySelector('#k'))).toBe('');
    const off = mount('<button aria-pressed="false"><svg><path id="a" stroke="#ffff00"></path></svg></button>');
    expect(declsFor(off.querySelector('#a'))).toBe('');
  });
  it('keeps a hover response on the selected control without taking the focus ring', () => {
    const hover = rules().filter((r) => /box-shadow/i.test(r.decl)).flatMap((r) => r.sels).filter((x) => x.includes(':hover'));
    expect(hover.length).toBeGreaterThan(0);
    for (const h of hover) {
      expect(h, 'a :hover box-shadow would beat the host :focus-visible ring').toContain(':not(:focus-visible)');
      expect(/aria-(?:selected|pressed)="true"/.test(h), h).toBe(true);
    }
    expect(declsFor(mount(tab('true')), true)).toMatch(/box-shadow:inset/i);
    expect(declsFor(mount(tab('false')), true)).not.toMatch(/box-shadow/i);
  });
  it('sets no resting box-shadow or outline, which would clobber the host focus ring (app_styles_module.js:1025)', () => {
    const d = declsFor(mount(tab('true')));
    expect(d).not.toMatch(/box-shadow|outline/i);
  });
  it('every rule stays scoped to the shell and the contrast theme', () => {
    for (const r of rules()) for (const x of r.sels) expect(x.startsWith(scope), x).toBe(true);
    document.body.innerHTML = '<div data-stem-tool-shell="machineLab"><button id="x" aria-pressed="true">On</button></div>';
    expect(declsFor(document.getElementById('x'))).toBe('');
    document.body.innerHTML = '<div class="theme-contrast"><div data-stem-tool-shell="otherTool"><button id="x" aria-pressed="true">On</button></div></div>';
    expect(declsFor(document.getElementById('x'))).toBe('');
  });
  it('the markup still states selection: view tab aria-selected, level aria-pressed', () => {
    expect(src.includes("key: v.id, id: 'machinelab-tab-' + v.id, role: 'tab'")).toBe(true);
    expect(/var on = \(d\.view \|\| 'machines'\) === v\.id;[\s\S]{0,160}'aria-selected': on \? 'true' : 'false'/.test(src)).toBe(true);
    expect(/var on = bnd === band;[\s\S]{0,120}'aria-pressed': on \? 'true' : 'false'/.test(src)).toBe(true);
  });
});
