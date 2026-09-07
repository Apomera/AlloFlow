// Mounted-DOM coverage for the region pack loader: a CSV chosen in the file
// input is parsed, previewed (nothing mapped yet), then adopted on confirm,
// after which the map selector lists it and the missions tab offers guided
// inquiry generated from its own attributes.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_PATH = 'stem_lab/stem_tool_gisstudio.js';
let host;
let root;
let tool;
let sharedToolData;

function findButton(label) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.trim() === label);
}

function findLabeledControl(label, selector) {
  const wrapper = Array.from(host.querySelectorAll('label')).find((node) => node.textContent.includes(label));
  return wrapper && wrapper.querySelector(selector);
}

function mountGIS(toolData) {
  function Harness() {
    const [data, setData] = React.useState(toolData);
    sharedToolData = data;
    const ctx = makeCtx({ toolData: data, setToolData: setData });
    return tool.render(ctx);
  }
  root = ReactDOMClient.createRoot(host);
  React.act(function () { root.render(React.createElement(Harness)); });
}

async function settle(predicate, attempts) {
  for (let i = 0; i < (attempts || 40); i++) {
    if (predicate()) return true;
    await React.act(async function () { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
  return predicate();
}

async function click(button) {
  await React.act(async function () { button.click(); await Promise.resolve(); });
}

const CSV = [
  'Town,Latitude,Longitude,Population,Elevation (m)',
  'Dunedin,-45.87,170.50,130000,5',
  'Queenstown,-45.03,168.66,16000,310',
  'Oamaru,-45.10,170.97,14000,20',
  'Broken,,170.00,1,1'
].join('\n');

describe('GIS Studio region pack loader (mounted)', () => {
  beforeEach(() => {
    resetStemLab();
    tool = loadTool(TOOL_PATH, 'gisStudio');
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    if (root) React.act(function () { root.unmount(); });
    root = null;
    host.remove();
  });

  it('previews a chosen CSV, adopts it on confirm, and generates missions from it', { timeout: 30000 }, async () => {
    mountGIS({ gisTab: 'import', gisBasemap: 'none' });
    const fileInput = findLabeledControl('Region pack file', 'input[type="file"]');
    expect(fileInput).toBeTruthy();

    const file = new File([CSV], 'Otago.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    await React.act(async function () {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect(await settle(() => host.textContent.includes('Review before using'))).toBe(true);
    expect(host.textContent).toContain('Review before using: Otago');
    expect(host.textContent).toContain('3 places');
    expect(host.textContent).toContain('Population, Elevation (m)');
    expect(host.textContent).toContain('1 rows skipped');
    expect(host.textContent).toContain('Row 5 (Broken)');
    // Nothing is mapped until the learner confirms.
    expect(host.querySelector('option[value="custom-otago"]')).toBeNull();
    expect(host.textContent).toContain('No custom packs yet.');

    const nameInput = findLabeledControl('Pack name', 'input[type="text"]');
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await React.act(async function () {
      inputSetter.call(nameInput, 'Otago towns');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    const gapsInput = findLabeledControl('Known gaps', 'input[type="text"]');
    await React.act(async function () {
      inputSetter.call(gapsInput, 'Rural Otago, Stewart Island');
      gapsInput.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    await click(findButton('Use this pack'));
    expect(await settle(() => !!host.querySelector('option[value="custom-otago-towns"]'))).toBe(true);
    const select = host.querySelector('option[value="custom-otago-towns"]').closest('select');
    expect(select.value).toBe('custom-otago-towns');
    expect(host.querySelector('optgroup[label="Your region packs"]')).toBeTruthy();
    expect(host.textContent).toContain('Rural Otago; Stewart Island');
    expect(host.textContent).toContain('Dunedin');
    expect(host.querySelector('option[value="population"]')).toBeTruthy();
    expect(host.querySelector('option[value="elevation"]')).toBeTruthy();
    expect(sharedToolData.gisRegionPackLoaded).toBe(true);
    expect(sharedToolData.gisCustomRegionPacks).toHaveLength(1);
    expect(sharedToolData.gisCustomRegionPacks[0].format).toBe('alloflow-gis-region-pack');

    await click(findButton('Guided missions'));
    expect(await settle(() => host.textContent.includes('INQUIRY SERIES'))).toBe(true);
    expect(host.textContent).toContain('OTAGO TOWNS INQUIRY SERIES');
    expect(host.textContent).toContain('Population and Elevation');
    expect(host.textContent).toContain('km service radius');
    expect(host.textContent).toContain('Highest and lowest Population');
    expect(host.textContent).toContain('These missions were built from the attributes and extent of the active region pack.');
    expect(host.textContent).not.toContain('This region pack does not include guided missions.');

    await click(findButton('Prepare and open comparison maps'));
    expect(await settle(() => host.textContent.includes('Left map') || host.textContent.includes('comparison'))).toBe(true);
    expect(sharedToolData.gisTab).toBe('compare');
    expect(sharedToolData.gisMissionProgress['custom-otago-towns:compare'].setup).toBe(true);
  });

  it('adopts a pasted JSON pack with boundaries and offers the boundary mission', { timeout: 30000 }, async () => {
    mountGIS({ gisTab: 'import', gisBasemap: 'none' });
    const textarea = findLabeledControl('Or paste region rows', 'textarea');
    expect(textarea).toBeTruthy();
    const pack = Object.assign(tool.testing.regionPackTemplate(), { label: 'Harbour district', scope: 'Harbour district' });
    delete pack.id;
    const textSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    await React.act(async function () {
      textSetter.call(textarea, JSON.stringify(pack));
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    await click(findButton('Preview pasted region'));
    expect(await settle(() => host.textContent.includes('Review before using'))).toBe(true);
    expect(host.textContent).toContain('Review before using: Harbour district');
    expect(host.textContent).toContain('1 boundary features');
    await click(findButton('Use this pack'));
    expect(await settle(() => !!host.querySelector('option[value="custom-harbour-district"]'))).toBe(true);
    expect(host.textContent).toContain('GeoJSON choropleth');
    expect(host.textContent).toContain('Example district');
    await click(findButton('Guided missions'));
    expect(await settle(() => host.textContent.includes('Inside the boundaries'))).toBe(true);
    const boundaryTab = Array.from(host.querySelectorAll('button[role="tab"]')).find((button) => button.textContent.includes('Inside the boundaries'));
    await click(boundaryTab);
    expect(host.textContent).toContain('1 boundary features in Harbour district');
    await click(findButton('Prepare and open analysis map'));
    expect(await settle(() => sharedToolData.gisTab === 'map')).toBe(true);
    expect(sharedToolData.gisMissionProgress['custom-harbour-district:boundaries'].setup).toBe(true);
    expect(host.textContent).toContain('Example district');
  });

  it('turns a dropped boundary file into a working region with polygons and missions', { timeout: 30000 }, async () => {
    mountGIS({ gisTab: 'import', gisBasemap: 'none' });
    const layer = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { NAME: 'Harbour ward', residents: 4200 }, geometry: { type: 'Polygon', coordinates: [[[170.2, -46.0], [170.8, -46.0], [170.8, -45.6], [170.2, -45.6], [170.2, -46.0]]] } },
        { type: 'Feature', properties: { NAME: 'Hill ward', residents: 1800 }, geometry: { type: 'Polygon', coordinates: [[[170.2, -45.6], [170.8, -45.6], [170.8, -45.2], [170.2, -45.2], [170.2, -45.6]]] } }
      ]
    };
    const fileInput = findLabeledControl('Region pack file', 'input[type="file"]');
    const file = new File([JSON.stringify(layer)], 'Wards.geojson', { type: 'application/geo+json' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    await React.act(async function () {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect(await settle(() => host.textContent.includes('Review before using'))).toBe(true);
    expect(host.textContent).toContain('Review before using: Wards');
    expect(host.textContent).toContain('Built from a boundary layer.');
    expect(host.textContent).toContain('2 places');
    expect(host.textContent).toContain('2 boundary features');
    expect(host.textContent).toContain('Harbour ward');

    await click(findButton('Use this pack'));
    expect(await settle(() => !!host.querySelector('option[value="custom-wards"]'))).toBe(true);
    expect(host.textContent).toContain('GeoJSON choropleth');
    expect(host.querySelector('option[value="residents"]')).toBeTruthy();
    expect(sharedToolData.gisCustomRegionPacks[0].boundaries.features).toHaveLength(2);
    expect(sharedToolData.gisGeoJSONImported).toBe(true);

    await click(findButton('Guided missions'));
    expect(await settle(() => host.textContent.includes('Inside the boundaries'))).toBe(true);
  });

  it('discards a preview without touching the pack list', { timeout: 30000 }, async () => {
    mountGIS({ gisTab: 'import', gisBasemap: 'none' });
    const fileInput = findLabeledControl('Region pack file', 'input[type="file"]');
    const pack = tool.testing.regionPackTemplate();
    const file = new File([JSON.stringify(pack)], 'starter.gispack.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    await React.act(async function () {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(await settle(() => host.textContent.includes('Review before using'))).toBe(true);
    expect(host.textContent).toContain('My region (rename me)');
    await click(findButton('Discard preview'));
    expect(host.textContent).not.toContain('Review before using');
    expect(host.textContent).toContain('No custom packs yet.');
    expect(sharedToolData.gisCustomRegionPacks).toBeUndefined();
  });
});
