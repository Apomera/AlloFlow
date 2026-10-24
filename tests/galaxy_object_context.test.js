import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 30000 });
const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const block = source.split('// BEGIN GALAXY OBJECT CONTEXT')[1].split('// END GALAXY OBJECT CONTEXT')[0];
const { context, render } = new Function(block + ';return {context:galaxyObjectContext,render:renderGalaxyObjectContext};')();
const bands = ['visible', 'infrared', 'radio', 'xray', 'gravity'];
const star = spectralClass => ({ kind: 'star', spectralClass });
const nebula = nebulaType => ({ kind: 'nebula', nebulaType });
const nebulaTypes = ['Emission', 'Dark', 'Planetary', 'Supernova Remnant'];

describe('Galaxy selected-object science context', () => {
  it('covers each represented stellar class and nebula family in every model signal', () => {
    const objects = ['O', 'B', 'A', 'F', 'G', 'K', 'M'].map(star).concat(nebulaTypes.map(nebula));
    for (const object of objects) for (const band of bands) {
      const result = context(object, band);
      expect(result).toMatchObject({ band });
      for (const field of ['object', 'signal', 'scope', 'prompt']) {
        expect(typeof result[field]).toBe('string');
        expect(result[field].length).toBeGreaterThan(20);
        expect(result[field]).not.toMatch(/undefined|\{class\}/);
      }
      const url = new URL(result.source.url);
      expect(url.protocol).toBe('https:');
      expect(url.hostname.endsWith('.nasa.gov')).toBe(true);
      expect(result.source.label).toContain('NASA');
      expect(result.scope).toMatch(/not (measurements|measured flux)/);
    }
  });

  it.each([null, undefined, [], 'M', {}, { kind: 'star', spectralClass: 'L' }, { kind: 'nebula', nebulaType: 'constructor' }, { kind: 'nebula', nebulaType: '__proto__' }])('does not fabricate context for unsupported selection %j', selection => {
    expect(context(selection, 'visible')).toBeNull();
  });

  it.each(['ultraviolet', '', null, undefined, 1])('rejects unsupported model signal %j', band => {
    expect(context(star('M'), band)).toBeNull();
  });

  it('separates stellar activity from the photospheric temperature sequence', () => {
    const cool = context(star('M'), 'xray');
    const hot = context(star('O'), 'xray');
    expect(cool.signal).toMatch(/coronae/);
    expect(cool.signal).toContain('alone does not determine X-ray brightness');
    expect(cool.signal).toBe(hot.signal);
    expect(cool.object).toContain('M-type');
    expect(cool.source.url).toContain('stars2.html');
  });

  it('distinguishes Crab synchrotron from the galaxy atomic-hydrogen model', () => {
    const result = context(nebula('Supernova Remnant'), 'radio');
    expect(result.signal).toMatch(/synchrotron.*energetic particles.*magnetic fields/);
    expect(result.signal).toMatch(/differs.*21 cm/);
    expect(result.signal).toContain('not a measured radio image');
    expect(result.source.url).toBe('https://heasarc.gsfc.nasa.gov/docs/xte/learning_center/universe/crabneb.html');
    expect(context(nebula('Supernova Remnant'), 'infrared').signal).toContain('need not mean newly forming stars');
  });

  it('keeps object origin explicit when switching dying-star shells to infrared', () => {
    const result = context(nebula('Planetary'), 'infrared');
    expect(result.object).toMatch(/dying star.*not a birthplace of planets/);
    expect(result.signal).toContain('Different infrared wavelengths');
    expect(result.source.url).toContain('dying-stars-final-performance');
    expect(context(nebula('Dark'), 'infrared').signal).toContain('Some infrared light is still absorbed');
  });

  it('never locates dark matter inside the selected star or nebula', () => {
    for (const object of [star('G'), ...nebulaTypes.map(nebula)]) {
      const result = context(object, 'gravity');
      expect(result.signal).toContain('host galaxy');
      expect(result.signal).toContain('not light from this object or dark matter detected inside it');
      expect(result.prompt).toContain('motion measurements');
    }
  });

  it('is pure and supports localization without inventing source data', () => {
    const selection = Object.freeze(star('K'));
    const seen = [];
    const translated = context(selection, 'visible', (key, fallback) => { seen.push(key); return 'Translated: ' + fallback; });
    expect(translated.object).toContain('Translated: K-type');
    expect(seen.every(key => key.startsWith('stem.galaxy.context_'))).toBe(true);
    expect(selection).toEqual(star('K'));
    translated.source.url = 'changed';
    expect(context(selection, 'visible').source.url).toBe('https://science.nasa.gov/universe/stars/');
    expect(translated).not.toHaveProperty('flux');
    expect(translated).not.toHaveProperty('measuredBrightness');
  });
});

describe('Galaxy selected-object context disclosure', () => {
  let root, host;
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    if (host) host.remove();
    root = host = null;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });
  function view(selection, band, name = 'Selected object') {
    return render({ React, context: context(selection, band), name, bandLabel: band });
  }

  it('is closed by default, has a named summary and a 44px NASA source target', () => {
    const holder = document.createElement('div');
    holder.innerHTML = ReactDOMServer.renderToStaticMarkup(view(nebula('Dark'), 'infrared', 'Horsehead Nebula'));
    const details = holder.querySelector('details[data-galaxy-object-context]');
    expect(details.open).toBe(false);
    expect(details.querySelector('summary[data-galaxy-object-context-summary]').style.minHeight).toBe('44px');
    expect(details.querySelector('[data-galaxy-object-context-name]').textContent).toBe('Horsehead Nebula · infrared');
    const link = details.querySelector('a[data-galaxy-object-context-source]');
    expect(link.style.minHeight).toBe('44px');
    expect(link.rel).toContain('noopener');
    expect(link.textContent).toContain('opens in a new tab');
    for (const field of ['signal', 'scope', 'prompt']) expect(details.querySelector('[data-galaxy-object-context-' + field + ']').textContent).toBeTruthy();
    expect(render({ React, context: null })).toBeNull();
  });

  it('updates the open disclosure in place across signal and object changes', async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(view(star('M'), 'visible', 'M-type star')));
    const details = host.querySelector('[data-galaxy-object-context]');
    details.open = true;
    await React.act(async () => root.render(view(star('M'), 'xray', 'M-type star')));
    expect(host.querySelector('[data-galaxy-object-context]')).toBe(details);
    expect(details.open).toBe(true);
    expect(details.querySelector('[data-galaxy-object-context-signal]').textContent).toContain('coronae');
    await React.act(async () => root.render(view(nebula('Supernova Remnant'), 'radio', 'Crab Nebula')));
    expect(host.querySelector('[data-galaxy-object-context]')).toBe(details);
    expect(details.open).toBe(true);
    expect(details.querySelector('[data-galaxy-object-context-name]').textContent).toBe('Crab Nebula · radio');
    expect(details.querySelector('[data-galaxy-object-context-signal]').textContent).toContain('synchrotron');
    await React.act(async () => root.render(render({ React, context: null })));
    expect(host.querySelector('[data-galaxy-object-context]')).toBeNull();
  });
});
