import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const file = 'stem_lab/stem_tool_autorepair.js';
const source = readFileSync(file, 'utf8');
const search = new Function(source.slice(source.indexOf('  var AR_ACTIVITY_KEYWORDS ='), source.indexOf('  var SHOP_STATIONS = [')) + '\nreturn arActivitySearch;')();
const catalog = [{ id: 'service', name: 'Service', desc: 'Practice', modules: [{ id: 'workshop', label: 'Workshop', desc: 'Hands-on jobs' }, { id: 'tyre', label: 'Change a tyre', desc: 'Wheel practice' }] }, { id: 'other', name: 'Reference', desc: '', modules: [{ id: 'custom', label: 'Café véhicule', desc: 'Inspection' }] }];
function host(extra = {}, theme) { const node = document.createElement('div'); node.innerHTML = renderTool('autoRepair', { autoRepair: extra }, theme); return node; }
function ids(node) { return [...node.querySelectorAll('[data-ar-module-card]')].map(el => el.getAttribute('data-ar-module-card')); }
beforeEach(() => { resetStemLab(); loadTool(file, 'autoRepair'); });
describe('Automobile activity search', () => {
  it('combines words and practical aliases without mutating the catalogue', () => {
    const original = JSON.stringify(catalog);
    expect(search(catalog, 'BATTERY voltage')[0].modules.map(m => m.id)).toEqual(['workshop']);
    expect(search(catalog, 'battery tire')).toEqual([]);
    expect(JSON.stringify(catalog)).toBe(original);
  });
  it('normalizes accents, punctuation, whitespace and tire spelling', () => {
    expect(search(catalog, '  CAFE-VEHICULE ')[0].modules[0].id).toBe('custom');
    expect(search(catalog, 'tires')).toEqual(search(catalog, 'tyres'));
    expect(search(catalog, 'TYRE')[0].modules[0].id).toBe('tyre');
    expect(search(catalog, ' .* [ ] ')).toEqual(catalog);
    expect(search(catalog, null)).toEqual(catalog);
  });
  it('finds oil-change activities whose titles do not mention oil', () => {
    const page = host({ menuSearch: 'oil change', collapsedCats: { owning: true, 'fix-cat': true } });
    expect(ids(page)).toEqual(['workshop', 'maint', 'log', 'repair']);
    expect(page.querySelector('[data-ar-search-count]').getAttribute('data-ar-search-count')).toBe('4');
    expect(page.querySelector('[data-ar-category-toggle="owning"]').getAttribute('aria-expanded')).toBe('true');
  });
  it('preserves normal collapse choices independently from search collapse choices', () => {
    expect(ids(host({ collapsedCats: { owning: true } }))).not.toContain('workshop');
    expect(ids(host({ menuSearch: '3D', collapsedCats: { owning: true } }))).toEqual(['workshop', 'underhood', 'tyre', 'repairbay']);
    expect(ids(host({ menuSearch: '3D', menuSearchCollapsed: { owning: true } }))).toEqual(['repairbay']);
  });
  it('keeps workshop progress on matching cards and leaves other shortcuts available', () => {
    const page = host({ menuSearch: 'battery voltage', shop: { job: 'electrical', step: 2 } });
    expect(page.querySelector('[data-ar-progress="workshop"]').getAttribute('aria-valuenow')).toBe('2');
    expect(page.querySelector('[data-ar-primary-action]').getAttribute('data-ar-primary-action')).toBe('workshop');
    expect(page.querySelectorAll('[data-ar-quick-start]')).toHaveLength(3);
  });
  it('renders an escaped empty state with a clear path back', () => {
    const page = host({ menuSearch: '<script>alert(1)</script>' });
    expect(ids(page)).toEqual([]); expect(page.querySelector('[data-ar-search-count]').textContent).toContain('<script>');
    expect(page.querySelector('script')).toBeNull(); expect(page.querySelector('[data-ar-search-clear]')).not.toBeNull();
    expect(page.querySelector('[data-ar-search-empty]').textContent).toContain('fewer words');
  });
  it.each([{ name: 'light', isDark: false, isContrast: false }, { name: 'dark', isDark: true, isContrast: false }, { name: 'high contrast', isDark: true, isContrast: true }])('renders labeled discovery controls in $name theme', theme => {
    const page = host({ menuSearch: 'repair costs' }, theme);
    expect(page.querySelector('form[role="search"]')).not.toBeNull();
    expect(page.querySelector('label[for="ar-activity-search"]')).not.toBeNull();
    expect(ids(page)).toEqual(['estimate', 'scams', 'roi']);
    expect(page.querySelector('#ar-activity-search-status').getAttribute('aria-live')).toBe('polite');
  });
});
