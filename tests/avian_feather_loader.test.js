import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';

const raptorSource = readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');
const birdSource = readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const raptorLoaderSource = raptorSource.slice(raptorSource.indexOf('  var RAPTOR_MODULE_BASE'), raptorSource.indexOf('  // ─── Three.js loader'));
const birdLoaderStart = birdSource.indexOf('  var BIRDLAB_MODULE_BASE');
const birdLoaderSource = birdSource.slice(birdLoaderStart, birdSource.indexOf('\n  (function() {', birdLoaderStart));
const art = () => loadAvianFeatherArt();
const raptorScripts = () => [...document.querySelectorAll('script[data-raptor-feather-art]')];
const birdScripts = () => [...document.querySelectorAll('script[data-birdlab-3d-script]')];
let previousArt, previousThree, previousBird, previousWoodland, previousMammals;
const woodland = () => { const local = {}; new Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(local); return local.AvianWoodlandBirds; };

function raptorLoader() {
  const script = document.createElement('script');
  script.src = 'https://local.invalid/offline/stem_lab/stem_tool_raptorhunt.js?revision=19';
  script.dataset.avianLoaderFixture = 'true';
  document.head.appendChild(script);
  return new Function('window', 'document', 'URL', raptorLoaderSource + '\nreturn ensureRaptorFeatherArt;')(window, document, URL);
}
function birdLoader() {
  return new Function('window', 'document', 'URL', 'BIRDLAB_HABITAT_ASSET_BASE', birdLoaderSource + '\nreturn loadBirdlab3D;')(
    window, document, URL, 'https://local.invalid/offline/stem_lab/assets/birdlab/habitats/'
  );
}
async function flushLoads() {
  for (let step = 0; step < 32; step++) await Promise.resolve();
}
function finish(script) { script.dispatchEvent(new Event('load')); }

beforeEach(() => {
  vi.useFakeTimers();
  previousArt = window.AvianFeatherArt;
  previousThree = window.THREE;
  previousBird = window.BirdLab3D;
  previousWoodland = window.AvianWoodlandBirds;
  previousMammals = window.BirdLab3DMammals;
  delete window.AvianFeatherArt;
  delete window.THREE;
  delete window.BirdLab3D;
  delete window.AvianWoodlandBirds;
  delete window.BirdLab3DMammals;
});
afterEach(() => {
  document.querySelectorAll('script[data-raptor-feather-art],script[data-birdlab-3d-script],script[data-avian-loader-fixture]').forEach(script => script.remove());
  for (const [key, value] of [['AvianFeatherArt', previousArt], ['THREE', previousThree], ['BirdLab3D', previousBird], ['AvianWoodlandBirds', previousWoodland], ['BirdLab3DMammals', previousMammals]]) {
    if (value === undefined) delete window[key]; else window[key] = value;
  }
  vi.useRealTimers();
});

describe('Raptor shared feather artwork startup', () => {
  it('can register during server rendering without a page origin', () => {
    const renderDocument = { currentScript: null, querySelector: () => null, baseURI: 'about:blank' };
    const base = new Function('window', 'document', 'URL', raptorLoaderSource + '\nreturn RAPTOR_MODULE_BASE;')(window, renderDocument, URL);
    expect(base).toBe('stem_lab/');
  });
  it('shares one concurrent request and resolves beside a nested tool script', async () => {
    const load = raptorLoader(), first = load(), second = load();
    expect(first).toBe(second);
    expect(raptorScripts()).toHaveLength(1);
    const script = raptorScripts()[0];
    expect(script.src).toBe('https://local.invalid/offline/stem_lab/avian_feather_art.js');
    expect(script.async).toBe(true);
    window.AvianFeatherArt = art();
    finish(script);
    await first;
    expect(script.onload).toBeNull();
    expect(script.onerror).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('skips fetching artwork already loaded by the other lab', async () => {
    window.AvianFeatherArt = art();
    await raptorLoader()();
    expect(raptorScripts()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('removes a failed request and makes the next attempt independently retryable', async () => {
    const load = raptorLoader(), first = load();
    const rejected = expect(first).rejects.toThrow('could not load');
    const failedScript = raptorScripts()[0];
    failedScript.dispatchEvent(new Event('error'));
    await rejected;
    expect(failedScript.isConnected).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    const retry = load();
    expect(retry).not.toBe(first);
    expect(raptorScripts()).toHaveLength(1);
    window.AvianFeatherArt = art();
    finish(raptorScripts()[0]);
    await retry;
  });

  it('times out a stalled request without allowing a late callback to settle its retry', async () => {
    const load = raptorLoader(), first = load(), stalledScript = raptorScripts()[0], lateLoad = stalledScript.onload;
    const rejected = expect(first).rejects.toThrow('too long');
    await vi.advanceTimersByTimeAsync(20000);
    await rejected;
    expect(stalledScript.isConnected).toBe(false);
    const retry = load();
    let settled = false;
    retry.then(() => { settled = true; });
    window.AvianFeatherArt = art();
    lateLoad();
    await flushLoads();
    expect(settled).toBe(false);
    finish(raptorScripts()[0]);
    await retry;
    expect(settled).toBe(true);
  });

  it('rejects scripts that load without the complete shared API and retries them', async () => {
    const load = raptorLoader(), first = load();
    const rejected = expect(first).rejects.toThrow('unavailable');
    // A cached older module may still have both texture methods but lack the
    // shader detail now required by either consumer.
    window.AvianFeatherArt = { createFlightFeatherCanvas() {}, createVaneDetailCanvases() {} };
    finish(raptorScripts()[0]);
    await rejected;
    expect(raptorScripts()).toHaveLength(0);
    const retry = load();
    window.AvianFeatherArt = art();
    finish(raptorScripts()[0]);
    await retry;
  });
});

describe('BirdLab shared feather dependency ordering', () => {
  it('rejects an incomplete woodland mammal module and retries before mounting the scene', async () => {
    window.THREE={};window.AvianFeatherArt=art();window.AvianWoodlandBirds=woodland();
    const load=birdLoader(),pending=load(),rejected=expect(pending).rejects.toThrow('Woodland animals are unavailable');
    for(const file of ['birdlab_3d_bird.js','birdlab_3d_habitat.js','birdlab_3d_wildlife.js']) {
      await flushLoads();const script=birdScripts().at(-1);expect(script.getAttribute('data-birdlab-3d-script')).toBe(file);finish(script);
    }
    await flushLoads();const failed=birdScripts().at(-1);expect(failed.getAttribute('data-birdlab-3d-script')).toBe('birdlab_3d_mammals.js');
    window.BirdLab3DMammals={};finish(failed);await rejected;expect(failed.isConnected).toBe(false);
    const retry=load();await flushLoads();const script=birdScripts().at(-1);expect(script.getAttribute('data-birdlab-3d-script')).toBe('birdlab_3d_mammals.js');
    window.BirdLab3DMammals={create(){}};finish(script);await flushLoads();
    const engine=birdScripts().at(-1);expect(engine.getAttribute('data-birdlab-3d-script')).toBe('birdlab_3d_engine.js');
    window.BirdLab3D={mount(){}};finish(engine);await retry;expect(vi.getTimerCount()).toBe(0);
  });
  it('can register the illustrated lab when its asset base is relative', () => {
    const base = new Function('window', 'document', 'URL', 'BIRDLAB_HABITAT_ASSET_BASE', birdLoaderSource + '\nreturn BIRDLAB_MODULE_BASE;')(
      window, document, URL, 'stem_lab/assets/birdlab/habitats/'
    );
    expect(base).toBe('stem_lab/');
    expect(birdScripts()).toHaveLength(0);
  });
  it('loads artwork before the bird builder and waits for the full scene before resolving', async () => {
    window.THREE = {};
    const load = birdLoader(), pending = load();
    expect(load()).toBe(pending);
    await flushLoads();
    expect(birdScripts().map(script => script.getAttribute('data-birdlab-3d-script'))).toEqual(['avian_feather_art.js']);
    expect(birdScripts()[0].src).toBe('https://local.invalid/offline/stem_lab/avian_feather_art.js');
    window.AvianFeatherArt = art();
    finish(birdScripts()[0]);
    for (const file of ['birdlab_3d_bird.js', 'birdlab_3d_habitat.js', 'avian_woodland_birds.js', 'birdlab_3d_wildlife.js', 'birdlab_3d_mammals.js', 'birdlab_3d_engine.js']) {
      await flushLoads();
      const current = birdScripts().at(-1);
      expect(current.getAttribute('data-birdlab-3d-script')).toBe(file);
      if (file === 'birdlab_3d_engine.js') window.BirdLab3D = { mount() {} };
      if (file === 'birdlab_3d_mammals.js') window.BirdLab3DMammals = { create() {} };
      if (file === 'avian_woodland_birds.js') window.AvianWoodlandBirds = woodland();
      finish(current);
    }
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not start loading bird geometry when the shared script has no valid API', async () => {
    window.THREE = {};
    const load = birdLoader(), first = load();
    const rejected = expect(first).rejects.toThrow('unavailable');
    await flushLoads();
    window.AvianFeatherArt = { createFlightFeatherCanvas() {}, createVaneDetailCanvases() {} };
    finish(birdScripts()[0]);
    await rejected;
    expect(birdScripts()).toHaveLength(0);
    const retry = load();
    const retryRejected = expect(retry).rejects.toThrow('could not load');
    await flushLoads();
    expect(birdScripts().map(script => script.getAttribute('data-birdlab-3d-script'))).toEqual(['avian_feather_art.js']);
    birdScripts()[0].dispatchEvent(new Event('error'));
    await retryRejected;
  });
});
