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

  it('seeds provenance from the adopted pack and keeps what the learner typed', { timeout: 30000 }, async () => {
    mountGIS({ gisTab: 'import', gisBasemap: 'none' });
    const fileInput = findLabeledControl('Region pack file', 'input[type="file"]');
    const pack = tool.testing.serializeGISRegionPack({
      label: 'Otago towns',
      sourceNote: 'Stats NZ 2023 census, collected March 2023.',
      metrics: [{ id: 'population', label: 'Population' }],
      records: [{ name: 'Dunedin', lat: -45.87, lon: 170.5, population: 130000 }]
    });
    delete pack.id;
    const file = new File([JSON.stringify(pack)], 'otago.gispack.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    await React.act(async function () {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(await settle(() => host.textContent.includes('Review before using'))).toBe(true);
    await click(findButton('Use this pack'));
    expect(await settle(() => !!host.querySelector('option[value="custom-otago-towns"]'))).toBe(true);

    await click(findButton('Project'));
    expect(await settle(() => host.textContent.includes('Data provenance manifest'))).toBe(true);
    const title = findLabeledControl('Dataset title', 'input');
    const source = findLabeledControl('Source', 'input');
    expect(title.value).toBe('Otago towns');
    expect(source.value).toBe('Stats NZ 2023 census, collected March 2023.');
  });

  it('shows pack health findings in the preview before the pack is adopted', { timeout: 30000 }, async () => {
    mountGIS({ gisTab: 'import', gisBasemap: 'none' });
    const csv = [
      'Town,Latitude,Longitude,Population',
      'Dunedin,-45.87,170.50,130000',
      'Dunedin,-45.03,168.66,16000',
      'Lost,0,0,900',
      'Typo,45.10,170.97,400'
    ].join('\n');
    const fileInput = findLabeledControl('Region pack file', 'input[type="file"]');
    const file = new File([csv], 'Otago.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    await React.act(async function () {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(await settle(() => host.textContent.includes('Review before using'))).toBe(true);
    expect(host.textContent).toContain('Worth checking before you map this:');
    expect(host.textContent).toContain('appear more than once');
    expect(host.textContent).toContain('Gulf of Guinea');
    expect(host.textContent).toContain('3,000 km from the rest');
    // These are questions, not blockers: the pack can still be adopted.
    await click(findButton('Use this pack'));
    expect(await settle(() => !!host.querySelector('option[value="custom-otago"]'))).toBe(true);
  });

  it('leaves pack boundaries behind when you switch to another region', { timeout: 30000 }, async () => {
    mountGIS({ gisTab: 'import', gisBasemap: 'none' });
    const pack = tool.testing.serializeGISRegionPack({
      label: 'Otago wards',
      metrics: [{ id: 'residents', label: 'Residents' }],
      records: [{ name: 'Dunedin', lat: -45.87, lon: 170.5, residents: 130000 }, { name: 'Oamaru', lat: -45.1, lon: 170.97, residents: 14000 }],
      boundaries: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { name: 'Harbour ward', index: 4 }, geometry: { type: 'Polygon', coordinates: [[[170.2, -46], [170.9, -46], [170.9, -45.2], [170.2, -45.2], [170.2, -46]]] } }]
      }
    });
    delete pack.id;
    const fileInput = findLabeledControl('Region pack file', 'input[type="file"]');
    const file = new File([JSON.stringify(pack)], 'otago.gispack.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    await React.act(async function () {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(await settle(() => host.textContent.includes('Review before using'))).toBe(true);
    await click(findButton('Use this pack'));
    expect(await settle(() => host.textContent.includes('Harbour ward'))).toBe(true);

    // Switch back to a built-in region.
    const select = host.querySelector('option[value="custom-otago-wards"]').closest('select');
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    await React.act(async function () {
      setter.call(select, 'maine');
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(await settle(() => host.textContent.includes('Maine counties'))).toBe(true);

    // The New Zealand ward polygons must not still be sitting on the Maine map.
    expect(host.textContent).not.toContain('Harbour ward');
    expect(host.textContent).toContain('Cumberland');

    // Switching back to the pack brings its own boundaries with it.
    await React.act(async function () {
      setter.call(select, 'custom-otago-wards');
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(await settle(() => host.textContent.includes('Harbour ward'))).toBe(true);
  });

  it('clears a value filter that belongs to the region you left', { timeout: 30000 }, async () => {
    const pack = tool.testing.serializeGISRegionPack({
      label: 'Otago towns',
      metrics: [{ id: 'rainfall', label: 'Rainfall' }],
      records: [
        { name: 'Dunedin', lat: -45.87, lon: 170.5, rainfall: 12 },
        { name: 'Oamaru', lat: -45.1, lon: 170.97, rainfall: 20 }
      ]
    });
    mountGIS({ gisBasemap: 'none', gisCustomRegionPacks: [pack] });

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const minimum = findLabeledControl('Minimum', 'input[type="number"]');
    expect(minimum).toBeTruthy();
    await React.act(async function () {
      setter.call(minimum, '100');
      minimum.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    // Maine densities: a floor of 100 keeps only the densest counties.
    expect(await settle(() => host.textContent.includes('of 16 mapped records shown'))).toBe(true);
    expect(host.textContent).toContain('5 of 16 mapped records shown.');

    const select = host.querySelector('option[value="custom-otago-towns"]').closest('select');
    const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    await React.act(async function () {
      selectSetter.call(select, 'custom-otago-towns');
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(await settle(() => host.textContent.includes('Otago towns'))).toBe(true);

    // Rainfall runs 12 to 20, so a floor of 100 from the previous region would
    // empty the table with no hint that a filter is doing it.
    expect(host.textContent).toContain('2 of 2 mapped records shown.');
    expect(host.textContent).toContain('Dunedin');
    expect(findLabeledControl('Minimum', 'input[type="number"]').value).toBe('');
  });

  it('drops a spatial selection that pointed at the previous dataset', { timeout: 30000 }, async () => {
    mountGIS({ gisTab: 'import', gisBasemap: 'none' });

    // Map the prefilled practice boundaries, then select the sample points inside one.
    await click(findButton('Review layer'));
    expect(await settle(() => !!findButton('Map reviewed layer'))).toBe(true);
    await click(findButton('Map reviewed layer'));
    expect(await settle(() => !!findButton('Select points inside boundary'))).toBe(true);
    await click(findButton('Select points inside boundary'));
    expect(await settle(() => host.textContent.includes('Selected'))).toBe(true);
    const selectedBefore = Array.from(host.querySelectorAll('td')).filter((cell) => cell.textContent.trim() === 'Selected').length;
    expect(selectedBefore).toBeGreaterThan(0);

    // Now map a four-row CSV. The selection was a list of row positions in the
    // sixteen Maine counties, so carried over it would mark the wrong places.
    await click(findButton('Import data'));
    expect(await settle(() => !!findButton('Map this CSV'))).toBe(true);
    await click(findButton('Map this CSV'));
    expect(await settle(() => host.textContent.includes('School garden'))).toBe(true);

    const selectedAfter = Array.from(host.querySelectorAll('td')).filter((cell) => cell.textContent.trim() === 'Selected').length;
    expect(selectedAfter, 'the imported rows inherited a selection made on other data').toBe(0);
    expect(host.textContent).toContain('4 of 4 mapped records shown.');
  });

  it('brings a pack’s boundaries back when the tool reopens on that pack', { timeout: 30000 }, async () => {
    // Adoption and the region selector both load a pack's polygons. Reopening
    // the tool with that pack already active is a third path, and it did not,
    // so a saved session came back with the places but no boundaries.
    const pack = tool.testing.serializeGISRegionPack({
      label: 'Otago wards',
      metrics: [{ id: 'residents', label: 'Residents' }],
      records: [{ name: 'Dunedin', lat: -45.87, lon: 170.5, residents: 130000 }, { name: 'Oamaru', lat: -45.1, lon: 170.97, residents: 14000 }],
      boundaries: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { name: 'Harbour ward', index: 4 }, geometry: { type: 'Polygon', coordinates: [[[170.2, -46], [170.9, -46], [170.9, -45.2], [170.2, -45.2], [170.2, -46]]] } }]
      }
    });
    mountGIS({ gisBasemap: 'none', gisCustomRegionPacks: [pack], gisRegionPack: pack.id });
    expect(await settle(() => host.textContent.includes('Harbour ward'))).toBe(true);
    expect(host.textContent).toContain('Dunedin');
    expect(host.textContent).toContain('GeoJSON choropleth');

    // A pack without boundaries must not conjure a layer.
    if (root) React.act(function () { root.unmount(); });
    root = null;
    const plain = tool.testing.serializeGISRegionPack({
      label: 'Plain pack',
      metrics: [{ id: 'residents', label: 'Residents' }],
      records: [{ name: 'Dunedin', lat: -45.87, lon: 170.5, residents: 130000 }]
    });
    mountGIS({ gisBasemap: 'none', gisCustomRegionPacks: [plain], gisRegionPack: plain.id });
    expect(await settle(() => host.textContent.includes('Plain pack'))).toBe(true);
    expect(host.textContent).not.toContain('GeoJSON choropleth');
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
