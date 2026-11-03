import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import JSZip from 'jszip';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const initialSize = { width:20, depth:80, height:10 };
const turnedSize = { width:80, depth:20, height:10 };
const printer = { name:'Rectangular bed', bedWidthMm:100, bedDepthMm:50, bedHeightMm:50, planningClearanceMm:5 };
let THREE, makeShape, bundle, printable, inspect, mounted = [];

beforeAll(() => {
  const exports = {};
  new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});
  THREE = exports;
  const core = readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  const shapeFunction = core.slice(core.indexOf('  function createShapeGeometry('), core.indexOf('  // Format fractional volume for display'));
  makeShape = new Function(shapeFunction+'\nreturn createShapeGeometry;')();
});

function rectangularBuild() {
  const blocks = {}, positions = [];
  for (let x = 0; x < 2; x++) {
    for (let z = 0; z < 8; z++) {
      const position = { x, y:1, z };
      const mesh = new THREE.Mesh(makeShape('cube'),new THREE.MeshBasicMaterial());
      mesh.position.set(x+0.5,1.5,z+0.5);
      mesh.userData = { gridPos:position, shape:'cube', rotation:0, blockType:x ? 'stone' : 'wood', _measurementLayer:'student' };
      mesh.updateMatrixWorld(true);
      blocks[[x,1,z].join(',')] = mesh;
      positions.push(position);
    }
  }
  try {
    return window.StemLab.geometryWorldBuilderPure.buildGeometryWorldStl({blocks},positions,{title:'Long classroom model'});
  } finally {
    Object.values(blocks).forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
  }
}

beforeEach(() => {
  const lab = resetStemLab();
  lab.registerTool('geometryWorld',{aliases:[],render(){return null;}});
  if (!document.getElementById('allo-geometryworld-builder-css')) {
    const style = document.createElement('style');
    style.id = 'allo-geometryworld-builder-css';
    document.head.appendChild(style);
  }
  vi.stubGlobal('THREE',THREE);
  vi.stubGlobal('crypto',webcrypto);
  window.AlloModules = {};
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
  new Function(readFileSync('printable_model_module.js','utf8'))();
  new Function(readFileSync('prim3d_module.js','utf8'))();
  new Function(readFileSync('stem_lab/stem_tool_printlab.js','utf8'))();
  printable = window.AlloModules.PrintableModel;
  bundle = rectangularBuild();
  inspect = vi.spyOn(printable,'inspectStl');
});

function unmount(app) {
  if (!app.host.isConnected) return;
  React.act(() => app.root.unmount());
  app.host.remove();
}

afterEach(() => {
  mounted.forEach(unmount);
  mounted = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const key of ['__alloPrintLabPendingHandoff','__alloPrintLabGeometrySession','__alloGeometryWorldPendingBuild','JSZip']) delete window[key];
});

function handoff() {
  return {schema:'alloflow-print-source/1', id:'turn-test', projectId:'same-project', sourceTool:'geometryWorld', format:'STL',
    bytes:new Uint8Array(bundle.buffer), sourceModel:structuredClone(bundle.sourceModel), title:'Long classroom model', unitMm:10};
}

async function mount(slot = handoff(), stored = {profile:printer}) {
  if (slot) window.__alloPrintLabPendingHandoff = slot;
  const ctx = makeCtx({toolData:{printLab:stored}});
  ctx.setStemLabTool = vi.fn();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Host() {
    [ctx.toolData,ctx.setToolData] = React.useState(ctx.toolData);
    return window.StemLab._registry.printLab.render(ctx);
  }
  await React.act(async () => root.render(React.createElement(Host)));
  const app = {ctx,host,root};
  mounted.push(app);
  return app;
}

function button(app,name) {
  const found = [...app.host.querySelectorAll('button')].find(node => node.textContent.trim() === name);
  expect(found,name).toBeTruthy();
  return found;
}
function click(node) { React.act(() => { node.focus();node.click(); }); }
function action(app,name) { click(button(app,name)); }
function draft(input,value) {
  React.act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
}
function lastReport() { return inspect.mock.results.at(-1).value; }
function issueCodes(report) { return report.issues.map(issue => issue.code); }
function assertReportFocus(app) {
  expect(app.host.querySelector('#print-lab-tab-preflight').getAttribute('aria-selected')).toBe('true');
  expect(document.activeElement).toBe(app.host.querySelector('[data-print-report-heading]'));
}
function turn(app) { action(app,'Preview 90° turn');action(app,'Apply 90° turn'); }

describe('turning the Geometry World print copy', () => {
  it('preserves canonical geometry on preview and cancel, then rechecks geometry after applying or restoring', async () => {
    const slot = handoff(), original = slot.bytes.slice(), app = await mount(slot);
    action(app,'2. Preflight');
    action(app,'Run advisory preflight');
    expect(lastReport().dimensionsMm).toEqual(initialSize);
    expect(issueCodes(lastReport())).toContain('BED_FIT');
    action(app,'Preview 90° turn');
    expect(app.host.querySelector('[data-turn-preview]')).toBeTruthy();
    expect(window.__alloPrintLabGeometrySession.printTurn90).toBeFalsy();
    action(app,'Cancel turn preview');
    expect(app.host.querySelector('[data-turn-preview]')).toBeNull();
    expect(lastReport().dimensionsMm).toEqual(initialSize);
    expect(slot.bytes).toEqual(original);

    turn(app);
    assertReportFocus(app);
    expect(lastReport().dimensionsMm).toEqual(turnedSize);
    expect(issueCodes(lastReport())).not.toContain('BED_FIT');
    expect(lastReport().status).not.toBe('FAIL');
    expect(app.ctx.toolData.printLab.unitMm).toBe(10);
    expect(window.__alloPrintLabGeometrySession.bytes).toEqual(original);
    expect(window.__alloPrintLabGeometrySession.sourceModel).toEqual(bundle.sourceModel);

    action(app,'Restore original orientation');
    assertReportFocus(app);
    expect(lastReport().dimensionsMm).toEqual(initialSize);
    expect(issueCodes(lastReport())).toContain('BED_FIT');
    expect(window.__alloPrintLabGeometrySession.printTurn90).toBeFalsy();
    expect(slot.bytes).toEqual(original);
  });

  it('keeps unrelated blocking preflight findings after a successful change of orientation', async () => {
    const slot = handoff();
    // A more finely tessellated version of the same physical box exceeds the
    // printer's file-size limit in either orientation.
    const denseBox = new THREE.Mesh(new THREE.BoxGeometry(2,1,8,16,8,32),new THREE.MeshBasicMaterial());
    denseBox.updateMatrixWorld(true);
    slot.bytes = new Uint8Array(printable.exportBinaryStl(THREE,denseBox));
    denseBox.geometry.dispose();
    denseBox.material.dispose();
    expect(slot.bytes.length).toBeGreaterThan(65536);
    const app = await mount(slot,{profile:{...printer,maxBytes:65536}});
    turn(app);
    assertReportFocus(app);
    expect(issueCodes(lastReport())).toContain('FILE_TOO_LARGE');
    expect(lastReport().status).toBe('FAIL');
    action(app,'4. Submit');
    expect(app.host.querySelector('[data-print-download=package]').disabled).toBe(true);
  });

  it('takes the failed bed-fit report directly to the pending Apply button and back to a checked report', async () => {
    const app = await mount();
    action(app,'2. Preflight');
    action(app,'Run advisory preflight');
    action(app,'Review 90° turn');
    const apply = button(app,'Apply 90° turn');
    expect(document.activeElement).toBe(apply);
    expect(app.host.querySelector('[data-turn-preview]')).toBeTruthy();
    expect(lastReport().dimensionsMm).toEqual(initialSize);
    click(apply);
    assertReportFocus(app);
    expect(lastReport().dimensionsMm).toEqual(turnedSize);
  });

  it.each(['size','printer profile'])('focuses the pending %s edit instead of starting a turn', async change => {
    const app = await mount();
    let input;
    if (change === 'size') {
      input = app.host.querySelector('#print-lab-scale-input');
      draft(input,'9');
      action(app,'Preview 90° turn');
    } else {
      action(app,'2. Preflight');
      action(app,'Run advisory preflight');
      input = app.host.querySelector('#print-lab-profile-bedDepthMm');
      draft(input,'75');
      action(app,'Review 90° turn');
    }
    expect(document.activeElement).toBe(input);
    expect(app.host.querySelector('[data-turn-preview]')).toBeNull();
    expect(window.__alloPrintLabGeometrySession.printTurn90).toBeFalsy();
  });

  it.each(['scale','printer profile','workflow stage','replacement model'])('discards a preview after a change to the %s', async change => {
    const app = await mount();
    if (change === 'printer profile') action(app,'2. Preflight');
    action(app,'Preview 90° turn');
    const oldApply = button(app,'Apply 90° turn');
    if (change === 'scale') draft(app.host.querySelector('#print-lab-scale-input'),'9');
    if (change === 'printer profile') draft(app.host.querySelector('#print-lab-profile-bedDepthMm'),'75');
    if (change === 'workflow stage') action(app,'3. Materials');
    if (change === 'replacement model') {
      const choices = app.host.querySelector('[data-print-alternative-design]');
      click(choices.querySelector('summary'));
      click(choices.querySelector('[aria-label="Add a primitive"] button'));
    }
    expect(app.host.querySelector('[data-turn-preview]')).toBeNull();
    expect([...app.host.querySelectorAll('button')].some(node => node.textContent === 'Apply 90° turn')).toBe(false);
    if (oldApply.isConnected) expect(oldApply.textContent).toBe('Preview 90° turn');
    expect(window.__alloPrintLabGeometrySession?.printTurn90).toBeFalsy();
    expect(app.ctx.toolData.printLab.unitMm).toBe(10);
  });

  it('resumes an applied turn from original session bytes and starts a new handoff in its original orientation', async () => {
    const app = await mount();
    turn(app);
    const canonical = window.__alloPrintLabGeometrySession.bytes.slice();
    const state = app.ctx.toolData.printLab;
    expect(JSON.stringify(state)).not.toContain('sourceModel');
    expect(JSON.stringify(state)).not.toContain('"bytes"');
    unmount(app);
    const resumed = await mount(null,state);
    action(resumed,'Run advisory preflight');
    expect(lastReport().dimensionsMm).toEqual(turnedSize);
    expect(window.__alloPrintLabGeometrySession.bytes).toEqual(canonical);
    action(resumed,'1. Design');
    action(resumed,'Revise in Geometry World');
    expect(window.__alloGeometryWorldPendingBuild.sourceModel).toEqual(bundle.sourceModel);
    expect(window.__alloGeometryWorldPendingBuild.printContext.unitMm).toBe(10);
    unmount(resumed);

    const fresh = await mount(handoff(),state);
    action(fresh,'2. Preflight');
    action(fresh,'Run advisory preflight');
    expect(lastReport().dimensionsMm).toEqual(initialSize);
    expect(issueCodes(lastReport())).toContain('BED_FIT');
    expect(window.__alloPrintLabGeometrySession.printTurn90).toBeFalsy();
  });
});

function captureDownloads() {
  const blobs = new Map(), downloads = new Map();
  vi.stubGlobal('URL',class extends URL {
    static createObjectURL(blob) { const url = 'blob:test-'+blobs.size;blobs.set(url,blob);return url; }
    static revokeObjectURL() {}
  });
  vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){ downloads.set(this.download,blobs.get(this.href)); });
  return downloads;
}

async function readBlob(blob) {
  if (blob.arrayBuffer) return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}
async function download(app,kind,extension,downloads) {
  click(app.host.querySelector('[data-print-download='+kind+']'));
  await React.act(async () => {
    await vi.waitFor(() => expect([...downloads.keys()].some(name => name.endsWith(extension)),app.host.querySelector('[data-print-download-feedback]')?.textContent).toBe(true));
  });
  return readBlob([...downloads.entries()].find(([name]) => name.endsWith(extension))[1]);
}

it('exports the same turned physical mesh to STL and ZIP, with matching review hash and editable source', async () => {
  const slot = handoff(), original = slot.bytes.slice(), app = await mount(slot);
  turn(app);
  action(app,'4. Submit');
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  window.JSZip = JSZip;
  const downloads = captureDownloads();
  const loose = await download(app,'stl','.stl',downloads);
  const looseReview = JSON.parse(new TextDecoder().decode(await download(app,'handoff','.alloflow-print.json',downloads)));
  const zipBytes = await download(app,'package','.zip',downloads);
  const zip = await JSZip.loadAsync(zipBytes);
  const packed = await zip.file('model.stl').async('uint8array');
  expect(printable.inspectStl(loose,1,printer).dimensionsMm).toEqual(turnedSize);
  expect(packed).toEqual(loose);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  const review = JSON.parse(await zip.file(manifest.reviewFile).async('string'));
  const hash = createHash('sha256').update(packed).digest('hex');
  expect(manifest.model).toMatchObject({sha256:hash,dimensionsMm:turnedSize,units:'mm'});
  expect(manifest.source.millimetersPerBlock).toBe(10);
  expect(manifest.source.printTurnDegrees).toBe(90);
  expect(review.contentHash).toBe(hash);
  expect(review.preflight.dimensionsMm).toEqual(turnedSize);
  expect(looseReview.contentHash).toBe(hash);
  expect(looseReview.preflight.dimensionsMm).toEqual(turnedSize);
  expect(looseReview.unitDeclaration).toBe('1 STL unit = 1 mm');
  expect(JSON.parse(await zip.file('block-source.json').async('string'))).toEqual(bundle.sourceModel);
  expect(window.__alloPrintLabGeometrySession.bytes).toEqual(original);
});
