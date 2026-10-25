import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SRC, node, freshTool, renderState, mountState, unmountState, click, change } from './helpers/weldlab_interaction_mount.js';
import { stripModuleFinder } from './helpers/weldlab_module_finder_restore.js';

const UNITS = {
  safety: ['ppeSafety', 'safetyHealth'],
  arc: ['heatInput', 'beadLab', 'speedChallenge', 'metallurgy'],
  process: ['processCompare', 'processSleuth', 'consumables'],
  drawing: ['jointCatalog', 'symbolsReader', 'mathBlueprint'],
  judge: ['defectHunt', 'defectDiagnose', 'defectCatalog', 'inspection'],
  code: ['codes', 'qualPrep', 'pipeWelding'],
  career: ['robotic', 'underwater', 'careerPaths', 'maineEcosystem', 'careerStories'],
};
const ORDER = Object.values(UNITS).flat();
const query = (root = node()) => root.querySelector('[data-weld-module-query]');
const unit = (root = node()) => root.querySelector('[data-weld-module-unit]');
const clear = (root = node()) => root.querySelector('[data-weld-module-clear]');
const results = (root = node()) => root.querySelector('[data-weld-module-results]');
const ids = (root = node()) => [...root.querySelectorAll('[data-weld-module-result]')].map(card => card.dataset.weldModuleResult);
const count = (root = node()) => root.querySelector('[data-weld-module-count]');
const mode = label => [...node().querySelectorAll('[role="radio"]')].find(button => button.textContent.includes(label));
const source = () => stripWeldlabWcagFixes(readFileSync(SRC, 'utf8')).replace(/\r\n/g, '\n');
const menuRegion = value => value.slice(value.indexOf('      function MainMenu() {'), value.indexOf('      function HeatInputCalculator() {'));

beforeEach(freshTool);
afterEach(unmountState);

describe('WeldLab local module finder', () => {
  it.each(['path', 'all'])('keeps the default %s cards, portfolio and unit order while exposing one finder', selectedMode => {
    const root = renderState({ menu_mode: selectedMode });
    expect(root.querySelectorAll('[data-weld-module-finder]')).toHaveLength(1);
    expect(root.querySelector('[data-weld-module-workspace] [data-weld-module-finder]')).toBeTruthy();
    expect(results(root)).toBeNull();
    expect(root.querySelector('[data-weld-portfolio]')).toBeTruthy();
    expect(query(root).value).toBe('');
    expect(unit(root).value).toBe('all');
    expect([...unit(root).options].map(option => option.value)).toEqual(['all', ...Object.keys(UNITS)]);
    expect(count(root).textContent).toBe('All 24 modules available.');
    expect(clear(root).disabled).toBe(true);
    expect(root.querySelectorAll(selectedMode === 'path' ? 'ol[aria-label="WeldLab learning path"] section ul button' : 'button[aria-disabled]')).toHaveLength(24);
    expect(root.querySelectorAll('ol[aria-label="WeldLab learning path"]')).toHaveLength(selectedMode === 'path' ? 1 : 0);
  });

  it.each(['path', 'all'])('uses every normalized query token across existing metadata in %s mode', async selectedMode => {
    await mountState({ menu_mode: selectedMode });
    await change(query(), '  CoOlInG  \n ZoNeS  ');
    expect(ids()).toEqual(['metallurgy']);
    expect(count().textContent).toBe('1 of 24 modules match.');
    expect(node().querySelector('ol[aria-label="WeldLab learning path"]')).toBeNull();
    expect(node().textContent).not.toContain('Core Simulators');
    expect(node().querySelector('[data-weld-module-result] svg[data-weld-preview]')).toBeTruthy();
    await change(query(), 'MIG TIG');
    expect(ids()).toEqual(['processCompare']);
    await change(query(), 'pin-and-compare');
    expect(ids()).toEqual(['beadLab']);
    await change(query(), 'zones notaweldingtopic');
    expect(ids()).toEqual([]);
    expect(node().querySelector('[data-weld-module-empty]').textContent).toContain('No modules match these filters.');
    expect(count().textContent).toBe('0 of 24 modules match.');
    expect(node().querySelector('[data-weld-portfolio]')).toBeTruthy();
  });

  it('uses the same seven units as the learning path and retains path order across big and small cards', async () => {
    await mountState({});
    for (const [key, expected] of Object.entries(UNITS)) {
      await change(unit(), key);
      expect(ids(), key).toEqual(expected);
      expect(count().dataset.weldModuleCount).toBe(String(expected.length));
    }
    await change(unit(), 'arc');
    expect(ids()).toEqual(['heatInput', 'beadLab', 'speedChallenge', 'metallurgy']);
    expect(node().querySelector('[data-weld-module-result="heatInput"] button').textContent).toContain('Core');
    expect(node().querySelector('[data-weld-module-result="metallurgy"] button').textContent).toContain('Lab');
    await change(query(), 'cooling');
    expect(ids()).toEqual(['beadLab', 'metallurgy']);
    await change(unit(), 'safety');
    expect(ids()).toEqual([]);
    await change(query(), '');
    expect(ids()).toEqual(UNITS.safety);
  });

  it('finds every authored destination without creating another learning path or hiding the original navigation modes', async () => {
    const original = renderState({ menu_mode: 'all' });
    const cards = [...original.querySelectorAll('button[aria-disabled]')];
    await mountState({});
    const found = new Set();
    for (const card of cards) {
      const title = card.querySelector('h2').textContent;
      await change(query(), title);
      const match = [...node().querySelectorAll('[data-weld-module-result]')].find(result => result.querySelector('h2').textContent === title);
      expect(match, title).toBeTruthy();
      found.add(match.dataset.weldModuleResult);
    }
    expect([...found].sort()).toEqual([...ORDER].sort());
    expect(node().querySelectorAll('[role="radiogroup"][aria-label="How to show the modules"]')).toHaveLength(1);
    expect(node().querySelector('[data-weld-module-results] ol')).toBeNull();
  });

  it.each(['path', 'all'])('clears both local filters and restores the original %s card markup and order', async selectedMode => {
    await mountState({ menu_mode: selectedMode });
    const selector = selectedMode === 'path' ? 'ol[aria-label="WeldLab learning path"]' : 'button[aria-disabled]';
    const originalCards = [...node().querySelectorAll(selector)].map(card => card.outerHTML);
    await change(query(), 'welding');
    await change(unit(), 'arc');
    await click(clear());
    expect(query().value).toBe('');
    expect(unit().value).toBe('all');
    expect(results()).toBeNull();
    expect([...node().querySelectorAll(selector)].map(card => card.outerHTML)).toEqual(originalCards);
    expect(document.activeElement).toBe(query());
    expect(clear().disabled).toBe(true);
  });

  it('keeps filters local and preserves portfolio and progress until an existing module button is opened', async () => {
    const initial = { menu_mode: 'path', weldBadges: { ppeSafety: true }, arc_run: [11, 12, 13], bl_V: 22, bl_A: 180, bl_TS: 12 };
    const app = await mountState(initial);
    const writesBefore = app.writes.slice(), storageBefore = { ...localStorage };
    const portfolioBefore = node().querySelector('[data-weld-portfolio]').outerHTML;
    await change(query(), 'cooling');
    await change(unit(), 'arc');
    expect(app.latest()).toEqual(initial);
    expect(app.writes).toEqual(writesBefore);
    expect({ ...localStorage }).toEqual(storageBefore);
    expect(node().querySelector('[data-weld-portfolio]').outerHTML).toBe(portfolioBefore);
    expect(node().textContent).toContain('1 / 24 modules');
    await click(clear());
    expect(app.latest()).toEqual(initial);
    expect(app.writes).toEqual(writesBefore);
    expect({ ...localStorage }).toEqual(storageBefore);
    await change(query(), 'cooling');
    await change(unit(), 'arc');
    await click(node().querySelector('[data-weld-module-result="metallurgy"] > button'));
    expect(app.latest().view).toBe('metallurgy');
    expect(app.latest().weldBadges.ppeSafety).toBe(true);
    expect(Object.keys(app.latest()).some(key => /^menu8_|menu_(query|unit|filter)/.test(key))).toBe(false);
  });

  it('keeps the same matching grid while the original path/all switch changes the saved display mode', async () => {
    const app = await mountState({});
    await change(query(), 'cooling');
    await change(unit(), 'arc');
    const before = ids();
    await click(mode('All modules'));
    expect(app.latest().menu_mode).toBe('all');
    expect(ids()).toEqual(before);
    expect(query().value).toBe('cooling');
    await click(clear());
    expect(node().textContent).toContain('Core Simulators');
    expect(node().querySelectorAll('button[aria-disabled]')).toHaveLength(24);
  });

  it('treats whitespace as an inactive search and renders entered markup as ordinary input text', async () => {
    await mountState({});
    await change(query(), ' \n\t ');
    expect(results()).toBeNull();
    expect(node().querySelector('ol[aria-label="WeldLab learning path"]')).toBeTruthy();
    expect(clear().disabled).toBe(false);
    await change(query(), '<img src=x onerror=alert(1)>');
    expect(ids()).toEqual([]);
    expect(node().querySelector('[data-weld-module-finder] img')).toBeNull();
    expect(query().value).toBe('<img src=x onerror=alert(1)>');
  });

  it.each([false, true])('provides native 44px controls, associated labels, live HTML counts and visible focus (contrast=%s)', contrast => {
    const root = renderState({}, contrast), finder = root.querySelector('[data-weld-module-finder]');
    expect(query(root).tagName).toBe('INPUT');
    expect(query(root).type).toBe('search');
    expect(query(root).maxLength).toBe(160);
    expect(unit(root).tagName).toBe('SELECT');
    expect(clear(root).type).toBe('button');
    for (const control of [query(root), unit(root), clear(root)]) {
      expect(parseInt(control.style.minHeight)).toBeGreaterThanOrEqual(44);
      expect(control.style.fontSize).toBe('16px');
      expect(control.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
      expect(control.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    }
    for (const control of [query(root), unit(root)]) expect(finder.querySelector('label[for="' + control.id + '"]')).toBeTruthy();
    expect(count(root).getAttribute('aria-live')).toBe('polite');
    expect(count(root).getAttribute('aria-atomic')).toBe('true');
    expect(finder.querySelector('style').textContent).toContain('outline:3px solid ' + (contrast ? '#ffff00' : '#9a3412') + '!important');
    expect(finder.querySelector('.grid').className).toContain('grid-cols-1 md:grid-cols-2');
    expect(finder.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    expect(finder.querySelector('svg, canvas')).toBeNull();
  });

  it('places high-contrast matching results on an explicit dark surface', async () => {
    await mountState({}, true);
    await change(unit(), 'drawing');
    expect(results().style.background).toBe('rgb(0, 0, 0)');
    expect(results().style.color).toBe('rgb(255, 255, 255)');
    expect(ids()).toEqual(UNITS.drawing);
  });

  it('reverses only finder additions to recover the complete original MainMenu byte content', () => {
    const menu = menuRegion(source()), restored = stripModuleFinder(menu);
    expect(restored).not.toBe(menu);
    expect(createHash('sha256').update(restored).digest('hex')).toBe('fcb551b560b38206202b2c1357600c17877199d7321cbdfb8498c1bd790620f4');
    expect(stripModuleFinder(restored)).toBe(restored);
    const helpers = menu.slice(menu.indexOf('        // BEGIN MODULE FINDER HELPERS'), menu.indexOf('        // END MODULE FINDER HELPERS'));
    expect(helpers).not.toMatch(/usePersisted|\bupd\(|setToolData|lsSet|setTimeout|setInterval|requestAnimationFrame/);
    expect(menu.match(/var menuQueryState = useState\(''\);/g)).toHaveLength(1);
    expect(menu.match(/var menuUnitState = useState\('all'\);/g)).toHaveLength(1);
  });
});
