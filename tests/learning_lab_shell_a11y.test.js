import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab shell and cross-tool navigation accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf("  window.StemLab.registerTool('learningLab'");
  const shell = source.slice(start);
  const routerStart = shell.indexOf('      switch (view) {');
  const errorStart = shell.indexOf('      } catch(e) {', routerStart);
  const router = shell.slice(routerStart, errorStart);
  const errorState = shell.slice(errorStart);

  it('uses accurate, qualified registration copy for the expanded tool collection', () => {
    expect(shell).toContain('Explore optional learning, planning, reflection, accessibility, and education-career resources.');
    expect(shell).toContain('Individual tools explain their purpose, limits, storage, and cited sources where relevant.');
  });

  it('maps internal route identifiers to friendly view names', () => {
    expect(shell).toContain("menu: 'Learning Lab menu'");
    expect(shell).toContain("badges: 'Badge gallery'");
    expect(shell).toContain("mytkHub: 'My Toolkit'");
    expect(shell).toContain("return 'My Toolkit tool'");
    expect(shell).not.toContain("'Now showing: ' + v");
  });

  it('updates the route and its accessible label atomically', () => {
    expect(shell).toContain('updMulti({ view: value, viewLabel: nextLabel })');
    expect(shell).toContain("llAnnounce('Opening ' + nextLabel + '.')");
  });

  it('moves focus according to the destination rather than the page being left', () => {
    expect(shell).toContain('function focusCurrentView(nextView)');
    expect(shell).toContain("nextView === 'menu' ? 'learning-lab-menu-heading' : 'learning-lab-current-view'");
    expect(shell).toContain('focusCurrentView(value)');
    expect(shell).not.toContain('function focusCurrentView()');
  });

  it('wraps routed modules in a named, programmatically focusable main landmark', () => {
    expect(shell).toContain("h('main', { id: 'learning-lab-current-view', tabIndex: -1, 'aria-label': currentViewLabel");
  });

  it('wraps every non-menu router destination in the shell main landmark', () => {
    const cases = [...router.matchAll(/case '([^']+)':\s+return ([^;]+);/g)];
    expect(cases.length).toBeGreaterThan(100);
    expect(cases.filter(([_, view]) => view !== 'menu').every(([_, __, result]) => result.startsWith('wrapShellView('))).toBe(true);
  });

  it('keeps the menu as a main landmark with a focusable page heading', () => {
    expect(shell).toContain("role: 'main', 'aria-label': __alloT('stem.learning_lab.learning_lab_main_menu'");
    expect(shell).toContain("h('h1', { id: 'learning-lab-menu-heading', tabIndex: -1");
  });

  it('provides named shell navigation and a page-level heading for standard modules', () => {
    expect(shell).toContain("h('nav', { 'aria-label': 'Learning Lab navigation'");
    expect(shell).toContain("h('h1', { id: 'learning-lab-view-heading', tabIndex: -1");
    expect(shell).toContain("setView('menu', 'Learning Lab menu')");
  });

  it('provides named navigation and a page-level heading inside My Toolkit', () => {
    expect(shell).toContain("h('nav', { 'aria-label': 'My Toolkit navigation'");
    expect(shell).toContain("setView('mytkHub', 'My Toolkit')");
    expect(shell).toContain('}, currentViewLabel)');
  });

  it('preserves friendly labels when routing from the menu and Toolkit Hub', () => {
    expect(shell).toContain('onClick: function() { setView(m.id, m.label); }');
    expect(shell).toContain('navigate: function(value, label) { setView(value, label); }');
  });

  it('associates category disclosure buttons with named regions', () => {
    expect(shell).toContain("id: 'learning-lab-category-toggle-' + cat.id");
    expect(shell).toContain("'aria-controls': 'learning-lab-category-panel-' + cat.id");
    expect(shell).toContain("id: 'learning-lab-category-panel-' + cat.id, role: 'region'");
    expect(shell).toContain("'aria-labelledby': 'learning-lab-category-toggle-' + cat.id");
  });

  it('uses explicit non-submit module and category buttons', () => {
    expect(shell).toContain("h('button', { type: 'button', id: 'learning-lab-category-toggle-' + cat.id");
    expect(shell).toContain("return h('button', { type: 'button', 'data-ll-focusable': true, key: m.id");
  });

  it('hides decorative category, module, badge, and disclosure symbols', () => {
    expect(shell).toContain("h('span', { 'aria-hidden': 'true', style: { fontSize: 26 } }, cat.icon)");
    expect(shell).toContain("h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, m.icon)");
    expect(shell).toContain("h('span', { 'aria-hidden': 'true' }");
    expect(shell).toContain("h('span', { 'aria-hidden': 'true', style: { fontSize: 14, color: T.dim } }, collapsed");
  });

  it('uses input-neutral wording for opening the badge gallery', () => {
    expect(shell).toContain(' — open gallery →');
    expect(shell).not.toContain(' — tap to view gallery →');
  });

  it('qualifies storage claims in the menu copy', () => {
    expect(shell).toContain('Storage varies by configuration.');
    expect(shell).not.toContain('saves only in your browser');
  });

  it('gives shared shell controls minimum 44 by 44 pixel targets', () => {
    expect(shell).toContain("minWidth: 44, minHeight: 44, padding: '10px 16px'");
    expect(shell).toContain("minWidth: 44, minHeight: 44, padding: '8px 14px'");
    expect(shell).toContain("minWidth: 44, minHeight: 44, padding: '6px 12px'");
    expect(shell).toContain("style: { minHeight: 44, textAlign: 'left', padding: 12");
  });

  it('separates learning-path completion and navigation into valid controls', () => {
    expect(shell).toContain("return h('div', { key: key, role: 'listitem'");
    expect(shell).toContain("'aria-pressed': isDone ? 'true' : 'false'");
    expect(shell).toContain("'aria-label': (isDone ? 'Mark incomplete: ' : 'Mark complete: ') + label");
    expect(shell).toContain("onClick: function() { setView(m.id, label); }");
    expect(shell).not.toContain("return h('button', { key: key, role: 'listitem'");
    expect(shell).not.toContain("h('a', { href: '#', onClick: function(e)");
  });

  it('renders a named assertive error alert without exposing exception details', () => {
    expect(errorState).toContain("role: 'alert', 'aria-live': 'assertive', 'aria-labelledby': 'learning-lab-render-error-heading'");
    expect(errorState).toContain("id: 'learning-lab-render-error-heading', tabIndex: -1");
    expect(errorState).toContain('Your saved data was not changed by this display error.');
    expect(errorState).not.toContain("'Error: ' + (e.message");
  });

  it('focuses the error heading and offers a large recovery control', () => {
    expect(errorState).toContain("document.getElementById('learning-lab-render-error-heading')");
    expect(errorState).toContain("if (typeof setView === 'function') setView('menu', 'Learning Lab menu')");
    expect(errorState).toContain('minWidth: 44, minHeight: 44');
    expect(errorState).toContain('Return to Learning Lab menu');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
