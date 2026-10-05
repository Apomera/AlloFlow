// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const source = readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8');
const css = source.match(/var GEOMETRY_ACTIVITY_GUIDE_CSS = `([\s\S]*?)`;/)[1];
const parsed = postcss.parse(css);
let root, style;
const computed = selector => getComputedStyle(root.querySelector(selector));
const declared = (selector, property) => parsed.nodes
  .find(rule => rule.type === 'rule' && rule.selector === '#geoworld-fs-workspace .gwe-activity-guide' + selector)
  .nodes.find(declaration => declaration.prop === property).value;

beforeEach(() => {
  style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  root = document.createElement('div');
  root.id = 'geoworld-fs-workspace';
  root.innerHTML = `<div class="gwe-activity-backdrop"><section class="gwe-activity-guide">
    <header><div><p class="gwe-activity-eyebrow">Your exploration journal</p><h2>Area and Surface Area</h2></div><button type="button">Close</button></header>
    <details class="gwe-activity-route"><summary>See the lesson route</summary></details>
    <label>Choose an activity</label><select><option>One layer becomes a solid</option></select>
    <article class="gwe-activity-card"><h3>One layer becomes a solid</h3>
      <div class="gwe-activity-check"><h4>Check your work</h4></div>
      <div class="gwe-activity-evidence"><div class="gwe-activity-goal">Numeric target</div><figure class="gwe-journal-snapshot"><figcaption>Before</figcaption></figure></div>
      <textarea>My explanation draft</textarea><label class="gwe-activity-review"><input type="checkbox">I have reviewed my work</label>
      <div class="gwe-milestone-note">Bring this stop to life</div>
    </article><footer><button type="button">Worksheet</button></footer>
  </section></div>`;
  document.body.appendChild(root);
});
afterEach(() => { root.remove(); style.remove(); });

describe('Geometry World exploration journal visual contracts', () => {
  it('uses a scoped paper reading surface without changing other tool panels', () => {
    expect(computed('.gwe-activity-guide').backgroundColor).toBe('rgb(255, 255, 255)');
    expect(declared('', 'border-radius')).toBe('8px');
    const outside = document.createElement('button');
    root.appendChild(outside);
    expect(getComputedStyle(outside).minHeight).not.toBe('44px');
  });
  it('keeps the close header sticky and its control at least 44px high', () => {
    expect(computed('.gwe-activity-guide>header').position).toBe('sticky');
    expect(computed('.gwe-activity-guide>header').top).toBe('-20px');
    expect(computed('header>button').minHeight).toBe('44px');
    expect(computed('header>button').minWidth).toBe('44px');
  });
  it('renders the active challenge as an unframed section', () => {
    const card = computed('.gwe-activity-card');
    expect(card.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(parseFloat(declared(' .gwe-activity-card', 'border-radius'))).toBe(0);
    expect(parseFloat(declared(' .gwe-activity-card', 'border'))).toBe(0);
    expect(card.borderTopWidth).toBe('1px');
  });
  it('does not place framed evidence, goal, or check cards inside the challenge', () => {
    for (const selector of ['.gwe-activity-check', '.gwe-activity-evidence', '.gwe-activity-goal', '.gwe-milestone-note']) {
      const section = computed(selector);
      expect(section.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(parseFloat(declared(' :is(.gwe-activity-check,.gwe-activity-evidence,.gwe-activity-goal,.gwe-milestone-note)', 'border-radius'))).toBe(0);
      expect(parseFloat(declared(' :is(.gwe-activity-check,.gwe-activity-evidence,.gwe-activity-goal,.gwe-milestone-note)', 'border'))).toBe(0);
    }
  });
  it('keeps native controls readable and at stable touch dimensions', () => {
    for (const selector of ['header>button', 'select', 'summary', 'footer>button']) {
      expect(computed(selector).minHeight).toBe('44px');
    }
    expect(computed('select').fontSize).toBe('13px');
    expect(computed('textarea').minHeight).toBe('110px');
    expect(computed('textarea').fontSize).toBe('14px');
    expect(root.querySelector('textarea').value).toBe('My explanation draft');
  });
  it('only frames individual snapshot items and keeps their corners restrained', () => {
    expect(declared(' .gwe-journal-snapshot', 'border-radius')).toBe('6px');
    expect(computed('.gwe-journal-snapshot').backgroundColor).toBe('rgb(255, 255, 255)');
    expect(computed('footer').borderTopWidth).toBe('1px');
    expect(computed('footer').display).toBe('grid');
  });
  it('supports high contrast without losing the sticky reading header', () => {
    root.setAttribute('data-stem-theme', 'contrast');
    expect(computed('.gwe-activity-guide').backgroundColor).toBe('rgb(0, 0, 0)');
    expect(computed('header').backgroundColor).toBe('rgb(0, 0, 0)');
    expect(computed('h2').color).toBe('rgb(255, 255, 255)');
    expect(computed('header>button').color).toBe('rgb(0, 255, 0)');
    expect(computed('header').position).toBe('sticky');
  });
  it('provides explicit forced-colors and narrow-phone layout rules', () => {
    expect(css).toContain('@media(forced-colors:active)');
    expect(css).toContain('outline-color:Highlight!important');
    expect(css).toContain('@media(max-width:520px)');
    expect(css).toContain('.gwe-activity-guide .gwe-activity-intro{display:none}');
    expect(css).toContain('scroll-padding-top:120px');
    expect(css).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
  });
});
