import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

const TOOL_PATH = 'stem_lab/stem_tool_gisstudio.js';
let host;
let root;
let tool;

function findButton(label) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.trim() === label);
}

function findLabeledControl(label, selector) {
  const wrapper = Array.from(host.querySelectorAll('label')).find((node) => node.textContent.includes(label));
  return wrapper && wrapper.querySelector(selector);
}

function findLabeledControls(label, selector) {
  return Array.from(host.querySelectorAll('label'))
    .filter((node) => node.textContent.includes(label))
    .map((node) => node.querySelector(selector))
    .filter(Boolean);
}

function watchForLoadingVeil() {
  let seen = host.textContent.includes('Preparing interactive map');
  const observer = new MutationObserver(function () {
    if (host.textContent.includes('Preparing interactive map')) seen = true;
  });
  observer.observe(host, { childList: true, subtree: true, characterData: true });
  return {
    seen: function () { return seen; },
    stop: function () { observer.disconnect(); }
  };
}

function mountGIS(toolData, extraCtx) {
  function Harness() {
    const [sharedData, setSharedData] = React.useState(toolData);
    const ctx = makeCtx(Object.assign({
      toolData: sharedData,
      setToolData: setSharedData
    }, extraCtx || {}));
    return tool.render(ctx);
  }

  root = ReactDOMClient.createRoot(host);
  React.act(function () {
    root.render(React.createElement(Harness));
  });
}

function makeLeafletStub() {
  const tileLayers = [];
  const maps = [];

  function addableLayer() {
    return {
      on: function () { return this; },
      bindTooltip: function () { return this; },
      addTo: function (map) {
        map._layers.push(this);
        return this;
      }
    };
  }

  const api = {
    map: function (node) {
      const map = {
        _container: node,
        _layers: [],
        _events: {},
        setView: function (center, zoom) {
          this._center = Array.isArray(center) ? { lat: center[0], lng: center[1] } : center;
          this._zoom = zoom;
          return this;
        },
        getContainer: function () { return this._container; },
        getCenter: function () { return this._center || { lat: 45.15, lng: -69.05 }; },
        getZoom: function () { return this._zoom || 6; },
        on: function (name, handler) {
          if (!this._events[name]) this._events[name] = [];
          this._events[name].push(handler);
          return this;
        },
        off: function (name, handler) {
          if (!name) {
            this._events = {};
          } else if (!handler) {
            delete this._events[name];
          } else if (this._events[name]) {
            this._events[name] = this._events[name].filter((candidate) => candidate !== handler);
          }
          return this;
        },
        eachLayer: function (callback) { this._layers.slice().forEach(callback); },
        removeLayer: function (layer) {
          this._layers = this._layers.filter((candidate) => candidate !== layer);
          if (layer._moveHandler) this.off('moveend', layer._moveHandler);
          return this;
        },
        hasLayer: function (layer) { return this._layers.includes(layer); },
        invalidateSize: function () { return this; },
        remove: function () {
          this._layers = [];
          this._events = {};
          return this;
        }
      };
      maps.push(map);
      return map;
    },
    tileLayer: function () {
      const layer = addableLayer();
      const addTo = layer.addTo;
      layer.addTo = function (map) {
        addTo.call(this, map);
        this._moveHandler = function leafletTileMoveEnd() {};
        map.on('moveend', this._moveHandler);
        return this;
      };
      tileLayers.push(layer);
      return layer;
    },
    polyline: addableLayer,
    circleMarker: addableLayer,
    circle: addableLayer
  };

  return { api: api, maps: maps, tileLayers: tileLayers };
}

async function settleMapEffects() {
  await React.act(async function () {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function expectTileMoveHandler(map, tileLayer) {
  expect(map._events.moveend || []).toContain(tileLayer._moveHandler);
}

beforeEach(function () {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  delete window.L;
  delete window.__alloGISLeaflet;
  delete window._geoLibsLoaded;
  resetStemLab();
  tool = loadTool(TOOL_PATH, 'gisStudio');
  host = document.createElement('div');
  document.body.appendChild(host);
  root = null;
});

afterEach(function () {
  if (root) React.act(function () { root.unmount(); });
  host.remove();
  window.localStorage.clear();
  document.querySelectorAll('[data-gis-leaflet]').forEach((node) => node.remove());
  delete window.L;
  delete window.__alloGISLeaflet;
  delete window._geoLibsLoaded;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  vi.restoreAllMocks();
});

describe('GIS Studio mounted interactions', function () {
  it('opens navigation workspaces without an invalid hook call', async function () {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(function () {});
    mountGIS({ gisBasemap: 'none' });

    const importButton = findButton('Import data');
    expect(importButton).toBeTruthy();

    await React.act(async function () {
      importButton.click();
      await Promise.resolve();
    });

    expect(findButton('Map this CSV')).toBeTruthy();
    expect(errorSpy.mock.calls.flat().join(' ')).not.toMatch(/invalid hook call/i);
  });

  it('searches, filters, sorts, and resets the accessible Data Explorer locally', async function () {
    mountGIS({ gisBasemap: 'none' });

    const table = () => host.querySelector('#gis-data-explorer-table');
    const rows = () => Array.from(table().querySelectorAll('tbody tr'));
    expect(rows()).toHaveLength(16);
    expect(host.textContent).toContain('16 of 16 mapped records shown.');

    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const search = findLabeledControl('Search locations', 'input[type="search"]');
    await React.act(async function () {
      inputSetter.call(search, 'york');
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('York');
    expect(host.textContent).toContain('1 of 16 mapped records shown.');

    await React.act(async function () {
      findButton('Reset table view').click();
      await Promise.resolve();
    });
    expect(rows()).toHaveLength(16);

    const sort = findLabeledControl('Sort table rows', 'select');
    await React.act(async function () {
      sort.value = 'name-desc';
      sort.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(rows()[0].querySelector('th').textContent).toBe('York');

    const minimum = findLabeledControl('Minimum Population density', 'input[type="number"]');
    await React.act(async function () {
      inputSetter.call(minimum, '200');
      minimum.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(rows()).toHaveLength(3);
    expect(host.textContent).toContain('3 of 16 mapped records shown.');
    expect(host.textContent).toContain('The map, analysis, project, and exports retain the complete mapped dataset.');
  });
  it('previews arbitrary UTM columns and maps the reviewed WGS84 conversion', async function () {
    mountGIS({ gisBasemap: 'none' });

    await React.act(async function () {
      findButton('Import data').click();
      await Promise.resolve();
    });

    const textarea = findLabeledControl('Or paste CSV data', 'textarea');
    const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    await React.act(async function () {
      textareaSetter.call(textarea, 'Site,Easting,Northing,Reading\nEiffel Tower,448251,5411932,7.5');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    const crs = findLabeledControl('Coordinate reference system', 'select');
    await React.act(async function () {
      crs.value = 'UTM';
      crs.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    const zone = findLabeledControl('UTM zone', 'input');
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await React.act(async function () {
      inputSetter.call(zone, '31');
      zone.dispatchEvent(new Event('input', { bubbles: true }));
      zone.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    await React.act(async function () {
      findButton('Preview + map columns').click();
      await Promise.resolve();
    });

    expect(host.textContent).toContain('Review column mapping');
    expect(host.textContent).toContain('Source data preview');
    expect(findLabeledControl('Location name column', 'select').value).toBe('0');
    expect(findLabeledControl('First coordinate column', 'select').value).toBe('1');
    expect(findLabeledControl('Second coordinate column', 'select').value).toBe('2');
    expect(findLabeledControl('Numeric value column', 'select').value).toBe('3');

    await React.act(async function () {
      findButton('Map reviewed data').click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(host.textContent).toContain('Eiffel Tower');
    expect(host.textContent).toContain('48.858');
    expect(host.textContent).toContain('2.294');
  });
  it('preserves local controls when persistence rerenders the host bridge', async function () {
    mountGIS({ gisBasemap: 'none' });

    let grid = findLabeledControl('Coordinate grid', 'input[type="checkbox"]');
    expect(grid.checked).toBe(false);

    React.act(function () { grid.click(); });
    expect(grid.checked).toBe(true);

    const units = findLabeledControl('Units', 'select');
    await React.act(async function () {
      units.value = 'imperial';
      units.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    grid = findLabeledControl('Coordinate grid', 'input[type="checkbox"]');
    expect(grid.checked).toBe(true);
  });

  it('keeps the main basemap and loading veil stable during overlay changes', async function () {
    const leaflet = makeLeafletStub();
    window.L = leaflet.api;
    mountGIS({ gisBasemap: 'street' });
    await settleMapEffects();

    const mapNode = host.querySelector('[role="application"]');
    expect(mapNode).toBeTruthy();
    expect(leaflet.tileLayers).toHaveLength(1);
    const veil = watchForLoadingVeil();

    const grid = findLabeledControl('Coordinate grid', 'input[type="checkbox"]');
    await React.act(async function () {
      grid.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    veil.stop();

    expect(host.querySelector('[role="application"]')).toBe(mapNode);
    expect(leaflet.tileLayers).toHaveLength(1);
    expectTileMoveHandler(leaflet.maps[0], leaflet.tileLayers[0]);
    expect(veil.seen()).toBe(false);
  });

  it('keeps comparison basemaps and Leaflet listeners during layer changes', async function () {
    const leaflet = makeLeafletStub();
    window.L = leaflet.api;
    mountGIS({ gisTab: 'compare' });
    await settleMapEffects();

    const mapNodes = Array.from(host.querySelectorAll('[role="application"]'));
    expect(mapNodes).toHaveLength(2);
    expect(leaflet.tileLayers).toHaveLength(2);
    const veil = watchForLoadingVeil();

    const layerSelects = findLabeledControls('Data layer', 'select');
    await React.act(async function () {
      layerSelects[0].value = 'point:access';
      layerSelects[0].dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    veil.stop();

    expect(Array.from(host.querySelectorAll('[role="application"]'))).toEqual(mapNodes);
    expect(leaflet.tileLayers).toHaveLength(2);
    expectTileMoveHandler(leaflet.maps[0], leaflet.tileLayers[0]);
    expectTileMoveHandler(leaflet.maps[1], leaflet.tileLayers[1]);
    expect(veil.seen()).toBe(false);
  });

  it('keeps timeline basemaps and Leaflet listeners during year changes', async function () {
    const leaflet = makeLeafletStub();
    window.L = leaflet.api;
    mountGIS({ gisTab: 'timeline' });
    await settleMapEffects();

    const mapNodes = Array.from(host.querySelectorAll('[role="application"]'));
    expect(mapNodes).toHaveLength(2);
    expect(leaflet.tileLayers).toHaveLength(2);
    const veil = watchForLoadingVeil();

    const focus = findLabeledControl('Focus year:', 'input[type="range"]');
    const current = Number(focus.value);
    const next = current > Number(focus.min) ? current - 1 : current + 1;
    await React.act(async function () {
      focus.value = String(next);
      focus.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    veil.stop();

    expect(Array.from(host.querySelectorAll('[role="application"]'))).toEqual(mapNodes);
    expect(leaflet.tileLayers).toHaveLength(2);
    expectTileMoveHandler(leaflet.maps[0], leaflet.tileLayers[0]);
    expectTileMoveHandler(leaflet.maps[1], leaflet.tileLayers[1]);
    expect(veil.seen()).toBe(false);
  });
});