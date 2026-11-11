// Seasonal lists, the print table and shower advice follow the chosen place. A Sydney student was
// shown the northern autumn list in their spring, every shower carried a "From Maine" note, and a
// school name was written into text shipped to every user.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
let sky;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); sky = window.__alloAstroPure; });
const fixed = { obsLive: false, obsDate: '2026-11-09', obsTime: '21:00' };
const doc = state => new DOMParser().parseFromString(renderTool('astronomy', { astronomy: { observingList: [], ...fixed, ...state } }), 'text/html');

describe('seasonalSky', () => {
  it('names the season of the hemisphere the place is in', () => {
    expect(sky.seasonalSky(11, 43.66)).toEqual({ hemisphere: 'north', season: 'fall' });
    expect(sky.seasonalSky(11, -33.87)).toEqual({ hemisphere: 'south', season: 'spring' });
    expect(sky.seasonalSky(1, -33.87)).toEqual({ hemisphere: 'south', season: 'summer' });
    expect(sky.seasonalSky(7, -33.87)).toEqual({ hemisphere: 'south', season: 'winter' });
    expect(sky.seasonalSky(4, -33.87)).toEqual({ hemisphere: 'south', season: 'fall' });
    expect(sky.seasonalSky(12, 51.5).season).toBe('winter');
    expect(sky.seasonalSky(2, 51.5).season).toBe('winter');
    expect(sky.seasonalSky(3, 51.5).season).toBe('spring');
  });
});

describe('Tonight', () => {
  it('gives Sydney its own spring sky in November, not the northern autumn list', () => {
    const d = doc({ tab: 'tonight', obsSite: 'sydney' });
    const card = d.querySelector('[data-astronomy-seasonal]');
    expect(card.getAttribute('data-astronomy-seasonal')).toBe('south-spring');
    expect(card.textContent).toContain('from the Southern Hemisphere this season (spring)');
    expect(card.textContent).toContain('Fomalhaut (overhead)');
    expect(card.textContent).toContain('Magellanic Clouds');
    expect(card.textContent).not.toContain('Cassiopeia');
    expect(d.body.textContent).not.toContain('Northern Hemisphere this season');
  });
  it('keeps the northern list for a northern place on the same date', () => {
    const card = doc({ tab: 'tonight', obsSite: 'portland' }).querySelector('[data-astronomy-seasonal]');
    expect(card.getAttribute('data-astronomy-seasonal')).toBe('north-fall');
    expect(card.textContent).toContain('from the Northern Hemisphere this season (fall)');
    expect(card.textContent).toContain('Cassiopeia (overhead)');
  });
  it('uses the calendar month AT the place, and tells an equatorial observer they see both skies', () => {
    const july = doc({ tab: 'tonight', obsSite: 'sydney', obsDate: '2026-07-10' }).querySelector('[data-astronomy-seasonal]');
    expect(july.getAttribute('data-astronomy-seasonal')).toBe('south-winter');
    expect(july.textContent).toContain('Scorpius with Antares (overhead)');
    expect(doc({ tab: 'tonight', obsSite: 'quito' }).querySelector('[data-astronomy-seasonal]').textContent).toContain('Near the equator');
    expect(doc({ tab: 'tonight', obsSite: 'portland' }).querySelector('[data-astronomy-seasonal]').textContent).not.toContain('Near the equator');
  });
});

describe('print kit', () => {
  it('prints the southern seasonal table for a southern place', () => {
    const d = doc({ tab: 'print', obsSite: 'sydney' });
    const heading = d.querySelector('#astro-seasonal-heading');
    expect(heading.getAttribute('data-astronomy-print-hemisphere')).toBe('south');
    expect(heading.textContent).toBe('Naked-eye seasonal sky (Southern Hemisphere)');
    const table = d.querySelector('table[aria-labelledby="astro-seasonal-heading"]').textContent;
    expect(table).toContain('Summer (Dec-Feb)');
    expect(table).toContain('Southern Cross');
    expect(table).not.toContain('Summer Triangle');
    expect(d.body.textContent).not.toContain('especially in Maine');
  });
  it('prints the northern table for a northern place', () => {
    const d = doc({ tab: 'print', obsSite: 'london' });
    expect(d.querySelector('#astro-seasonal-heading').textContent).toBe('Naked-eye seasonal sky (Northern Hemisphere)');
    expect(d.querySelector('table[aria-labelledby="astro-seasonal-heading"]').textContent).toContain('Summer Triangle');
  });
});

describe('meteor shower advice', () => {
  it('computes how high the radiant climbs from a latitude', () => {
    expect(sky.meteorRadiantView('perseids', -33.87)).toMatchObject({ view: 'never' });
    expect(sky.meteorRadiantView('perseids', 51.51)).toMatchObject({ view: 'high', circumpolar: true, maxAlt: 84 });
    expect(sky.meteorRadiantView('etaaqu', -33.87)).toMatchObject({ view: 'high', circumpolar: false, maxAlt: 57 });
    expect(sky.meteorRadiantView('ursids', 0)).toMatchObject({ view: 'low', maxAlt: 14 });
    expect(sky.meteorRadiantView('geminids', -33.87)).toMatchObject({ view: 'fair', maxAlt: 23 });
    expect(sky.meteorRadiantView('nope', 10)).toBeNull();
  });
  it('recognises Maine places only', () => {
    expect(sky.isMaineLocation(45.58, -69.72)).toBe(true);
    expect(sky.isMaineLocation(43.66, -70.26)).toBe(true);
    expect(sky.isMaineLocation(40.71, -74.01)).toBe(false);
    expect(sky.isMaineLocation(-33.87, 151.21)).toBe(false);
  });
  it('shows the Maine note in Maine and a latitude note everywhere else', () => {
    const maine = doc({ tab: 'meteors', obsSite: 'moosehead', selectedShower: 'perseids' }).body.textContent;
    expect(maine).toContain('From Maine:');
    expect(maine).toContain('BEST SHOWER OF THE YEAR from Maine');
    const sydney = doc({ tab: 'meteors', obsSite: 'sydney', selectedShower: 'perseids' });
    expect(sydney.body.textContent).not.toContain('From Maine');
    expect(sydney.body.textContent).not.toContain('BEST SHOWER OF THE YEAR from Maine');
    expect(sydney.querySelector('[data-astronomy-radiant-view]').getAttribute('data-astronomy-radiant-view')).toBe('never');
    expect(sydney.body.textContent).toContain('From Sydney, Australia: The radiant never rises from your latitude');
    const london = doc({ tab: 'meteors', obsSite: 'london', selectedShower: 'perseids' }).body.textContent;
    expect(london).toContain('From London: The radiant climbs high from your latitude (about 84° up)');
    expect(london).toContain('It never sets, so meteors are possible all night.');
  });
});

describe('no school name ships in the tool text', () => {
  it('has no school name outside the file header comment', () => {
    const lines = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8').split('\n');
    const hits = lines.map((line, i) => (/King Middle/.test(line) && !/^\s*\/\//.test(line)) ? i + 1 : 0).filter(Boolean);
    expect(hits).toEqual([]);
  });
});
