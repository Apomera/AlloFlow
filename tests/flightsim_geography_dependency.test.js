import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import { runInNewContext } from 'node:vm';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { indexOfOrThrow, sliceBetween } from './helpers/anchored_slice.js';

// SkySchool's ~10 MB of offline geography ships in its own file so the 2 MB
// simulator, the Tailwind scan and every deploy stop carrying it. These pin the
// contract between that file, the STEM loader and hosts that predate the split.
const TOOL = 'stem_lab/stem_tool_flightsim.js';
const DATA = 'stem_lab/stem_data_skyschool_geo.js';
const NAMES = ['FLIGHT_ELEVATION_DATA', 'FLIGHT_LAKE_LEVEL_DATA', 'FLIGHT_CITY_DISTRICTS', 'LAND_MASK_RLE'];
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const MIRRORS = ['desktop/web-app/public/stem_lab/', 'desktop/app-build/stem_lab/', 'desktop/web-app/build/stem_lab/'];
const toolSource = readFileSync(TOOL, 'utf8');
const dataSource = readFileSync(DATA, 'utf8');
const pin = createHash('sha256').update(readFileSync(DATA)).digest('hex').slice(0, 8);

function evaluatedData() {
  const sandbox = { window: {} };
  runInNewContext(dataSource, sandbox);
  return sandbox.window.__alloSkySchoolGeo;
}

describe('SkySchool geography ships as a loader dependency', () => {
  it('loads the geography before the simulator, under a content pin, in every host copy', () => {
    for (const host of HOSTS) {
      const source = readFileSync(host, 'utf8');
      expect(source.includes("'stem_lab/stem_tool_flightsim.js': ['stem_lab/stem_data_skyschool_geo.js'],"), host + ' dependency').toBe(true);
      const list = sliceBetween(source, 'var stemToolModules = [', 'var stemModuleDependencies = {', { file: host, label: 'STEM module list' });
      const dataAt = list.indexOf("'" + DATA + "',"), toolAt = list.indexOf("'" + TOOL + "',");
      expect(dataAt, host + ' lists the data file').toBeGreaterThan(0);
      expect(toolAt, host + ' lists the simulator after its data').toBeGreaterThan(dataAt);
      expect(source.includes('if (pluginContentPins[mod]) modeVersion = pluginContentPins[mod];'), host + ' uses the content pin').toBe(true);
      const pinned = /var pluginContentPins = \{[^}]*'stem_lab\/stem_data_skyschool_geo\.js': '([0-9a-f]{8})'/.exec(source);
      expect(pinned && pinned[1], host + ' pin is stale; node build.js rewrites it from the file contents').toBe(pin);
    }
    const build = readFileSync('build.js', 'utf8');
    const plugins = sliceBetween(build, 'const PLUGIN_FILES = [', '\n];', { file: 'build.js', label: 'PLUGIN_FILES' });
    expect(plugins.indexOf("'" + DATA + "',")).toBeGreaterThan(0);
    expect(plugins.indexOf("'" + TOOL + "',")).toBeGreaterThan(plugins.indexOf("'" + DATA + "',"));
    expect(build.includes('const PLUGIN_CONTENT_PINS_RE = /var pluginContentPins = \\{[^}]*\\}/;')).toBe(true);
  });

  it('keeps the geography out of the simulator and every copy identical', () => {
    expect(Buffer.byteLength(toolSource)).toBeLessThan(3 * 1024 * 1024);
    // The longest remaining line is the 67 KB city worker source, not data.
    expect(Math.max(...toolSource.split('\n').map((line) => line.length))).toBeLessThan(100000);
    for (const name of NAMES) {
      expect(toolSource.includes('  var ' + name + ' = FLIGHT_GEO.' + name + ';'), name).toBe(true);
    }
    for (const dir of MIRRORS) {
      for (const file of [TOOL, DATA]) {
        const mirror = dir + file.slice('stem_lab/'.length);
        if (!existsSync(mirror) && !dir.startsWith('desktop/web-app/public')) continue;
        expect(readFileSync(mirror, 'utf8') === readFileSync(file, 'utf8'), mirror + ' matches ' + file).toBe(true);
      }
    }
  });

  it('publishes the geography prerequisite and content pin in the compiled web shells', () => {
    // Updating App.jsx alone left the checked-in web shell on the old loader:
    // it still fetched the 10 MB support file synchronously from the simulator.
    // Read the bundle selected by each real manifest, never a stale spare file.
    const shellDirs = ['app', 'desktop/web-app/public/app', 'desktop/web-app/build'];
    for (const directory of shellDirs) {
      if (!existsSync(join(directory, 'asset-manifest.json'))) continue;
      const manifest = JSON.parse(readFileSync(join(directory, 'asset-manifest.json'), 'utf8'));
      expect(manifest.files['main.js'], directory + ' main bundle').toMatch(/^\.?\/static\/js\/main\.[a-f0-9]+\.js$/);
      const relative = manifest.files['main.js'].replace(/^\.?\//, '');
      const bundlePath = resolve(directory, relative);
      expect(bundlePath.startsWith(resolve(directory) + sep), directory + ' bundle is inside the shell').toBe(true);
      const bundle = readFileSync(bundlePath, 'utf8');
      const hasDependency = /["']stem_lab\/stem_tool_flightsim\.js["']\s*:\s*\[\s*["']stem_lab\/stem_data_skyschool_geo\.js["']\s*\]/.test(bundle);
      expect(hasDependency, directory + ' asynchronous geography dependency; rebuild desktop/web-app').toBe(true);
      const compiledPin = /["']stem_lab\/stem_data_skyschool_geo\.js["']\s*:\s*["']([0-9a-f]{8})["']/.exec(bundle);
      expect(compiledPin && compiledPin[1], directory + ' geography content pin').toBe(pin);
    }
  });

  it('declares one JSON value per line, which hosts without the dependency parse', () => {
    const declared = {};
    for (const line of dataSource.split('\n')) {
      if (!line.startsWith('  var ')) continue;
      expect(line.endsWith(';'), line.slice(0, 40)).toBe(true);
      const equals = indexOfOrThrow(line, ' = ', { file: DATA, label: 'data declaration' });
      declared[line.slice(6, equals)] = JSON.parse(line.slice(equals + 3, -1));
    }
    expect(Object.keys(declared).sort()).toEqual([...NAMES].sort());
    const geo = evaluatedData();
    for (const name of NAMES) expect(JSON.stringify(declared[name]) === JSON.stringify(geo[name]), name).toBe(true);
  });
});

describe('SkySchool startup with and without the loader dependency', () => {
  let requests;
  beforeEach(() => {
    resetStemLab();
    window.__RR_TEST_EXPORTS__ = {};
    delete window.__alloSkySchoolGeo;
    requests = [];
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.currentScript;
    delete window.__alloSkySchoolGeo;
    delete window.__RR_TEST_EXPORTS__;
  });

  function legacyHost(status, body) {
    // An older host (Gemini Canvas paste, cached shell) inserts only the simulator.
    Object.defineProperty(document, 'currentScript', { configurable: true,
      get: () => ({ src: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_flightsim.js?v=4a23d7b91' }) });
    vi.stubGlobal('XMLHttpRequest', class {
      open(method, url, async) { requests.push({ method, url, async }); }
      send() { this.status = status; this.responseText = body; }
    });
  }

  it('reads the geography the STEM loader evaluated first', () => {
    loadTool(TOOL, 'flightSim');
    const api = window.__RR_TEST_EXPORTS__.flightSim;
    expect(api.FLIGHT_CITY_DISTRICTS).toBe(window.__alloSkySchoolGeo.FLIGHT_CITY_DISTRICTS);
    expect(Number.isFinite(api.getFlightTerrainHeight(39.7392, -104.9903))).toBe(true);
  });

  it.each([['LF', '\n'], ['CRLF', '\r\n']])('fetches the sibling data file itself when a host predates the dependency (%s)', (label, eol) => {
    loadTool(TOOL, 'flightSim');
    const denver = window.__RR_TEST_EXPORTS__.flightSim.getFlightTerrainHeight(39.7392, -104.9903);
    resetStemLab();
    window.__RR_TEST_EXPORTS__ = {};
    delete window.__alloSkySchoolGeo;
    legacyHost(200, dataSource.split('\n').join(eol));
    new Function(toolSource)(); // eslint-disable-line no-new-func
    expect(requests).toEqual([{ method: 'GET', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_data_skyschool_geo.js?v=4a23d7b91', async: false }]);
    expect(window.StemLab.isRegistered('flightSim')).toBe(true);
    expect(Object.keys(window.__alloSkySchoolGeo).sort()).toEqual([...NAMES].sort());
    expect(window.__RR_TEST_EXPORTS__.flightSim.getFlightTerrainHeight(39.7392, -104.9903)).toBe(denver);
  });

  it('fails loudly instead of flying over invented terrain when the data cannot be fetched', () => {
    legacyHost(404, 'Not found');
    expect(() => new Function(toolSource)()).toThrow(/could not load its geography data .*HTTP 404/); // eslint-disable-line no-new-func
    expect(window.StemLab.isRegistered('flightSim')).toBe(false);
  });
});
