import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import JSZip from 'jszip';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
let THREE, downloads, filenames, reader;
const printingProfile = { name: 'Original printer', bedWidthMm: 100, bedDepthMm: 50, bedHeightMm: 50, planningClearanceMm: 5 };
const receivingProfile = { name: 'Receiving printer', bedWidthMm: 50, bedDepthMm: 100, bedHeightMm: 50, planningClearanceMm: 5 };
const load = path => new Function(readFileSync(path, 'utf8'))();
beforeAll(() => {
  THREE = {};
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
});
beforeEach(() => {
  const lab = resetStemLab();
  lab.registerTool('geometryWorld', { aliases: [], render() {} });
  vi.stubGlobal('THREE', THREE); vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('JSZip', JSZip);
  window.AlloModules = {};
  load('stem_lab/stem_tool_geometryworld_builder.js');
  load('printable_model_module.js'); load('prim3d_module.js'); load('stem_lab/geometry_print_package.js'); load('stem_lab/stem_tool_printlab.js');
  reader = lab.geometryPrintPackage;
  downloads = []; filenames = [];
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(blob) { downloads.push(blob); return 'blob:reopen-test'; }
    static revokeObjectURL() {}
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { filenames.push(this.download); });
});
afterEach(() => {
  for (const app of mounts.splice(0)) app.close();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  vi.useRealTimers();
  for (const key of ['__alloPrintLabPendingHandoff', '__alloPrintLabGeometrySession', '__alloPrintLabPackageEditSession', '__alloGeometryWorldPendingBuild', '__alloEnsureStemPluginLoaded']) delete window[key];
});

function mount(data = {}, ctxOptions = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), ctx = makeCtx({ toolData: { printLab: data }, ...ctxOptions });
  ctx.setToolData = update => { ctx.toolData = typeof update === 'function' ? update(ctx.toolData) : update; };
  React.act(() => root.render(React.createElement(function Host() { return window.StemLab._registry.printLab.render(ctx); })));
  const app = { host, ctx, close() { if (host.isConnected) { React.act(() => root.unmount()); host.remove(); } } };
  mounts.push(app); return app;
}
function button(app, label) {
  const found = [...app.host.querySelectorAll('button')].find(node => node.textContent === label);
  expect(found, label).toBeTruthy(); return found;
}
function click(node) { React.act(() => { node.focus(); node.click(); }); }
const message = app => app.host.querySelector('[data-print-package-open] [role=alert]');
function choose(app, file, selector = '[data-print-package-open] input[type=file]') {
  const input = app.host.querySelector(selector);
  if (selector.startsWith('[data-print-package-open]')) button(app, 'Choose print package').focus();
  React.act(() => { Object.defineProperty(input, 'files', { configurable: true, value: [file] }); input.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function settle(check) {
  await vi.waitFor(async () => { await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); check(); });
}
function bytes(blob) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsArrayBuffer(blob); });
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { resolve, reject, promise }; }
function geometryHandoff(width = 2) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 1, 8), new THREE.MeshBasicMaterial());
  const source = new Uint8Array(window.AlloModules.PrintableModel.exportBinaryStl(THREE, mesh));
  mesh.geometry.dispose(); mesh.material.dispose();
  return { schema: 'alloflow-print-source/1', id: 'reopen', projectId: 'reopen', sourceTool: 'geometryWorld', format: 'STL', bytes: source,
    title: 'Long bridge', description: 'A scale model', aiUse: 'ASSISTED', aiDisclosure: 'AI suggested the starting arrangement.', unitMm: 10,
    sourceModel: { schema: 'alloflow-geometry-world-build/1', coordinateSystem: 'x-right,y-up,z-depth', blocks: Array.from({ length: width * 8 }, (_, index) => ({ x: index % width, y: 1, z: Math.floor(index / width), type: 'wood', shape: 'cube', rotation: 0 })) } };
}

async function exportTurnedZip() {
  window.__alloPrintLabPendingHandoff = geometryHandoff();
  const app = mount({ profile: printingProfile, materialId: 'PETG', studentNote: 'Check the support.' });
  click(button(app, '2. Preflight')); click(button(app, 'Run advisory preflight'));
  click(button(app, 'Review 90° turn')); click(button(app, 'Apply 90° turn')); click(button(app, '4. Submit'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  click(button(app, 'Download print package'));
  await settle(() => expect(downloads).toHaveLength(1));
  const archive = await bytes(downloads.shift());
  app.close(); delete window.__alloPrintLabGeometrySession;
  return archive;
}

async function openEditablePackage() {
  const archive = await exportTurnedZip();
  const app = mount({ profile: printingProfile });
  app.ctx.setStemLabTool = vi.fn();
  choose(app, new File([archive], 'bridge-print-package.zip'));
  await settle(() => expect(app.host.querySelector('[data-print-package-preview]')).toBeTruthy());
  click(button(app, 'Open for preflight')); return app;
}
function changeField(input, value) {
  const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  React.act(() => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}

describe('reopening Geometry World print packages in Print Lab', () => {
  it('previews a real turned ZIP, rechecks its exact final STL on the current printer, and preserves the loose file pair', async () => {
    const archive = await exportTurnedZip();
    const zip = await JSZip.loadAsync(archive), stl = await zip.file('model.stl').async('uint8array');
    const app = mount({ title: 'Previous model', profile: receivingProfile, unitMm: 20, materialId: 'PLA' });
    const inspect = vi.spyOn(window.AlloModules.PrintableModel, 'inspectStl');
    choose(app, new File([archive], 'bridge-print-package.zip'));
    const preview = () => app.host.querySelector('[data-print-package-preview]');
    await settle(() => expect(preview()).toBeTruthy());
    expect(preview().textContent).toContain('80 × 20 × 10 mm');
    expect(preview().textContent).toContain('Editable blocks included');
    expect(document.activeElement).toBe(preview().querySelector('h3'));
    expect(app.ctx.toolData.printLab.title).toBe('Previous model'); expect(inspect).not.toHaveBeenCalled();
    click(button(app, 'Open for preflight'));
    expect(document.activeElement).toBe(app.host.querySelector('#preflight-report-title'));
    expect(inspect.mock.calls.at(-1)[1]).toBe(1);
    expect(inspect.mock.calls.at(-1)[2]).toMatchObject(receivingProfile);
    expect(inspect.mock.results.at(-1).value).toMatchObject({ status: 'FAIL', dimensionsMm: { width: 80, depth: 20, height: 10 } });
    expect(app.ctx.toolData.printLab).toMatchObject({ title: 'Long bridge', description: 'A scale model', studentNote: 'Check the support.', aiUse: 'ASSISTED', aiDisclosure: 'AI suggested the starting arrangement.', materialId: 'PETG', profile: receivingProfile, unitMm: 1, gwProjectId: '', gwDraftId: '', preflight: null });
    expect(app.host.querySelector('[data-print-orientation]')).toBeNull();
    click(button(app, '4. Submit')); expect(button(app, 'Optional STL export').disabled).toBe(true);

    click(button(app, '2. Preflight'));
    const width = app.host.querySelector('#print-lab-profile-bedWidthMm');
    React.act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(width, '100'); width.dispatchEvent(new Event('input', { bubbles: true })); });
    click(button(app, 'Apply printer profile')); click(button(app, 'Run advisory preflight')); click(button(app, '4. Submit'));
    window.StemLab.ensureThree = vi.fn().mockRejectedValue(new Error('3D unavailable'));
    click(button(app, 'Download review handoff')); await settle(() => expect(downloads).toHaveLength(1));
    click(button(app, 'Optional STL export')); await settle(() => expect(downloads).toHaveLength(2));
    const handoff = JSON.parse(new TextDecoder().decode(await bytes(downloads[0]))), downloaded = new Uint8Array(await bytes(downloads[1]));
    expect(downloaded).toEqual(stl);
    expect(handoff).toMatchObject({ title: 'Long bridge', unitDeclaration: '1 STL unit = 1 mm', contentHash: createHash('sha256').update(stl).digest('hex'), preflight: { status: 'PASS', byteSize: stl.length } });
    expect(window.StemLab.ensureThree).not.toHaveBeenCalled();

    // After an intentional size change, both loose downloads must describe
    // the newly scaled copy instead of reusing the package's original hash.
    window.StemLab.ensureThree = () => Promise.resolve(THREE);
    click(button(app, '1. Design'));
    const scale = app.host.querySelector('#print-lab-scale-input');
    React.act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(scale, '0.5'); scale.dispatchEvent(new Event('input', { bubbles: true })); });
    click(button(app, 'Apply scale')); click(button(app, '2. Preflight')); click(button(app, 'Run advisory preflight')); click(button(app, '4. Submit'));
    click(button(app, 'Download review handoff')); await settle(() => expect(downloads).toHaveLength(3));
    click(button(app, 'Optional STL export')); await settle(() => expect(downloads).toHaveLength(4));
    const scaledReview = JSON.parse(new TextDecoder().decode(await bytes(downloads[2])));
    const scaledHash = createHash('sha256').update(new Uint8Array(await bytes(downloads[3]))).digest('hex');
    expect(scaledReview).toMatchObject({ contentHash: scaledHash, preflight: { dimensionsMm: { width: 40, depth: 10, height: 5 } } });
    expect(scaledHash).not.toBe(handoff.contentHash);
  });

  it('opens an older v1 ZIP with neither review JSON nor editable-world JSON', async () => {
    const zip = await JSZip.loadAsync(await exportTurnedZip());
    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    delete manifest.reviewFile; delete manifest.source.printTurnDegrees; manifest.source.editableFile = null;
    zip.remove('review.alloflow-print.json'); zip.remove('editable-world.json'); zip.file('manifest.json', JSON.stringify(manifest));
    const app = mount({ profile: printingProfile });
    choose(app, new File([await zip.generateAsync({ type: 'uint8array' })], 'legacy.zip'));
    await settle(() => expect(app.host.querySelector('[data-print-package-preview]').textContent).toContain('No editable world is included'));
    click(button(app, 'Open for preflight')); expect(app.ctx.toolData.printLab.unitMm).toBe(1);
    expect(app.host.textContent).toContain('Preflight reportPASS');
    expect(app.host.querySelector('[data-edit-package-blocks]')).toBeNull();
  });

  it('returns focus on cancel and never resurrects the slow result when the learner chooses another file', async () => {
    const app = mount({ title: 'Current', unitMm: 8 });
    const slow = deferred(), newer = deferred(); vi.spyOn(reader, 'read').mockReturnValueOnce(slow.promise).mockReturnValueOnce(newer.promise);
    const file = new File(['sample'], 'candidate.zip'); choose(app, file); await settle(() => expect(reader.read).toHaveBeenCalledOnce());
    click(button(app, 'Cancel checking')); expect(document.activeElement).toBe(button(app, 'Choose print package'));
    choose(app, file); await settle(() => expect(reader.read).toHaveBeenCalledTimes(2));
    newer.resolve({ manifest: { title: 'Newest' }, modelBytes: new Uint8Array(0), editableWorld: null, dimensions: { width: 10, depth: 2, height: 1 } });
    await settle(() => expect(app.host.querySelector('[data-print-package-preview]').textContent).toContain('Newest'));
    slow.reject(new Error('Old file error')); await settle(() => expect(message(app)).toBeNull());
    click(button(app, 'Cancel preview')); expect(document.activeElement).toBe(button(app, 'Choose print package'));
    expect(app.ctx.toolData.printLab).toMatchObject({ title: 'Current', unitMm: 8 });
  });

  it.each(['stage', 'size', 'raw import', 'unmount'])('drops a pending package on %s', async reason => {
    const app = mount({ title: 'Current', unitMm: 8 }), pending = deferred();
    vi.spyOn(reader, 'read').mockReturnValue(pending.promise);
    choose(app, new File(['pending'], 'pending.zip')); await settle(() => expect(reader.read).toHaveBeenCalledOnce());
    if (reason === 'stage') { click(button(app, '2. Preflight')); click(button(app, '1. Design')); }
    if (reason === 'size') { const scale = app.host.querySelector('#print-lab-scale-input'); React.act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(scale, '9'); scale.dispatchEvent(new Event('input', { bubbles: true })); }); }
    if (reason === 'raw import') choose(app, new File(['bad'], 'other.txt'), '[aria-labelledby="print-lab-import-title"] input[type=file]');
    if (reason === 'unmount') app.close();
    pending.reject(new Error('Stale import')); await settle(() => expect(message(app)).toBeNull());
    expect(app.host.querySelector('[data-print-package-preview]')).toBeNull();
    expect(app.ctx.toolData.printLab.title).toBe('Current');
  });

  it('displays a damaged-package error without replacing the active model', async () => {
    const app = mount({ title: 'Current', unitMm: 8 });
    choose(app, new File(['not a zip'], 'broken.zip')); await settle(() => expect(message(app)).toBeTruthy());
    expect(message(app).textContent).toMatch(/supported Geometry World print ZIP/);
    expect(document.activeElement).toBe(message(app)); expect(app.ctx.toolData.printLab).toMatchObject({ title: 'Current', unitMm: 8 });
  });

  it('keeps an unapplied scale edit when the learner tries to replace the model from a preview', async () => {
    const app = mount({ title: 'Current', unitMm: 8 });
    const scale = app.host.querySelector('#print-lab-scale-input');
    React.act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(scale, '9'); scale.dispatchEvent(new Event('input', { bubbles: true })); });
    vi.spyOn(reader, 'read').mockResolvedValue({ manifest: { title: 'Candidate' }, modelBytes: new Uint8Array(0), editableWorld: null, dimensions: { width: 10, depth: 2, height: 1 } });
    choose(app, new File(['candidate'], 'candidate.zip')); await settle(() => expect(app.host.querySelector('[data-print-package-preview]')).toBeTruthy());
    click(button(app, 'Open for preflight'));
    expect(document.activeElement).toBe(scale); expect(scale.value).toBe('9'); expect(app.ctx.toolData.printLab).toMatchObject({ title: 'Current', unitMm: 8 });
  });
});

describe('revising a reopened Geometry World print package', () => {
  it('previews the current scale and details in memory, restores them on Cancel, then checks newly revised blocks', async () => {
    const app = await openEditablePackage();
    click(button(app, '4. Submit'));
    changeField(app.host.querySelector('#print-lab-model-title'), 'Revised classroom bridge');
    const note = [...app.host.querySelectorAll('label')].find(label => label.textContent.includes('Design note for the reviewer')).querySelector('textarea');
    changeField(note, 'Review the new width.');
    click(button(app, '1. Design')); changeField(app.host.querySelector('#print-lab-scale-input'), '0.5'); click(button(app, 'Apply scale'));
    click(button(app, '2. Preflight')); click(button(app, 'Run advisory preflight'));
    const worldState = vi.fn(); app.ctx.updateMulti = worldState;
    click(button(app, 'Edit blocks in Geometry World'));
    const intent = window.__alloGeometryWorldPendingBuild;
    expect(intent).toMatchObject({ schema: 'alloflow-geometry-world-intent/1', intent: 'reviewPrintPackage', packageName: 'bridge-print-package.zip', dimensions: { width: 40, depth: 10, height: 5 }, printTurnDegrees: 90,
      printContext: { unitMm: 5, aiUse: 'ASSISTED', aiDisclosure: 'AI suggested the starting arrangement.', packageReview: { revisionId: intent.id, revisionNumber: 2, title: 'Revised classroom bridge', description: 'A scale model', studentNote: 'Review the new width.', materialId: 'PETG', previousBlockCount: 16, previousDimensions: { width: 40, depth: 10, height: 5 } } } });
    expect(intent.editableWorld.blocks).toHaveLength(16); expect(intent).not.toHaveProperty('sourceModel');
    expect(worldState).not.toHaveBeenCalled(); expect(app.ctx.setStemLabTool).toHaveBeenCalledWith('geometryWorld');
    expect(app.ctx.toolData.printLab.packageEditId).toBe(intent.id); expect(app.ctx.toolData.printLab).not.toHaveProperty('editableWorld');
    const saved = { ...app.ctx.toolData.printLab }; app.close(); delete window.__alloGeometryWorldPendingBuild;

    const resumed = mount(saved);
    expect(resumed.host.textContent).toContain('Preflight reportPASS');
    expect(resumed.ctx.toolData.printLab).toMatchObject({ unitMm: 0.5, title: 'Revised classroom bridge', studentNote: 'Review the new width.', materialId: 'PETG' });
    await settle(() => expect(document.activeElement).toBe(button(resumed, 'Edit blocks in Geometry World')));
    resumed.ctx.setStemLabTool = vi.fn(); click(button(resumed, 'Edit blocks in Geometry World'));
    const nextIntent = window.__alloGeometryWorldPendingBuild, nextSaved = { ...resumed.ctx.toolData.printLab };
    expect(nextIntent.id).not.toBe(intent.id); resumed.close(); delete window.__alloGeometryWorldPendingBuild;
    const selection = geometryHandoff(3);
    window.__alloPrintLabPendingHandoff = { ...selection, unitMm: nextIntent.printContext.unitMm, title: 'Generic selection title', packageReview: nextIntent.printContext.packageReview };
    const revised = mount(nextSaved);
    expect(window.__alloPrintLabPackageEditSession).toBeUndefined();
    expect(revised.ctx.toolData.printLab).toMatchObject({ packageEditId: '', printStage: 'Preflight', unitMm: 5, title: 'Revised classroom bridge', studentNote: 'Review the new width.', description: 'A scale model', materialId: 'PETG', preflight: null });
    expect(document.activeElement).toBe(revised.host.querySelector('#preflight-report-title'));
    expect(revised.host.textContent).toContain('Preflight reportPASS'); expect(revised.host.textContent).toContain('40 × 15 × 5 mm');
    expect(window.__alloPrintLabGeometrySession.bytes).toEqual(selection.bytes); expect(window.__alloPrintLabGeometrySession.printTurn90).toBe(true);
    expect(window.__alloPrintLabGeometrySession.packageReview).toMatchObject({ revisionNumber: 2, previousBlockCount: 16 });

    click(button(revised, 'Prepare revised files')); expect(document.activeElement).toBe(button(revised,'Download revised print package'));
    for (const kind of ['package', 'handoff', 'stl']) {
      const before = downloads.length;
      click(revised.host.querySelector('[data-print-download="'+kind+'"]'));
      await settle(() => expect(downloads.length).toBe(before + 1));
    }
    const archive = await JSZip.loadAsync(await bytes(downloads[0]));
    const manifest = JSON.parse(await archive.file('manifest.json').async('string'));
    expect(manifest.source).toMatchObject({ revisionNumber: 2, millimetersPerBlock: 5, printTurnDegrees: 90 });
    const handoff = JSON.parse(new TextDecoder().decode(await bytes(downloads[1])));
    const revisedMesh = new Uint8Array(await bytes(downloads[2]));
    expect(revisedMesh).toEqual(await archive.file('model.stl').async('uint8array'));
    expect(filenames.slice(-3)).toEqual(['Revised classroom bridge-v2-print-package.zip', 'Revised classroom bridge-v2.alloflow-print.json', 'Revised classroom bridge-v2.stl']);
    expect(handoff).toMatchObject({ title: 'Revised classroom bridge', originalFilename: filenames.at(-1), contentHash: createHash('sha256').update(revisedMesh).digest('hex'), preflight: { dimensionsMm: { width: 40, depth: 15, height: 5 } } });
    expect(manifest.model.sha256).toBe(handoff.contentHash);

    click(button(revised, '1. Design')); revised.ctx.setStemLabTool = vi.fn(); click(button(revised, 'Revise in Geometry World'));
    const iteration = window.__alloGeometryWorldPendingBuild;
    expect(iteration.schema).toBe('alloflow-geometry-world-build/1');
    expect(iteration.printContext).toMatchObject({ unitMm: 5, packageReview: { revisionNumber: 3, previousBlockCount: 24, previousDimensions: { width: 40, depth: 15, height: 5 }, printTurnDegrees: 90, title: 'Revised classroom bridge' } });
    expect(iteration.sourceModel.blocks).toEqual([...selection.sourceModel.blocks].sort((left, right) => left.x - right.x || left.z - right.z));
  });

  it('keeps pending size/profile edits and refuses an unrepresentable millimeters-per-block conversion', async () => {
    const app = await openEditablePackage();
    const bed = app.host.querySelector('#print-lab-profile-bedWidthMm'); changeField(bed, ''); click(button(app, 'Edit blocks in Geometry World'));
    expect(document.activeElement).toBe(bed); expect(window.__alloGeometryWorldPendingBuild).toBeUndefined();
    click(button(app, 'Discard profile edit')); click(button(app, '1. Design'));
    const size = app.host.querySelector('#print-lab-scale-input'); changeField(size, '101'); click(button(app, 'Edit blocks in Geometry World'));
    expect(document.activeElement).toBe(size); expect(window.__alloGeometryWorldPendingBuild).toBeUndefined();
    click(button(app, 'Apply scale')); click(button(app, 'Edit blocks in Geometry World'));
    expect(document.activeElement).toBe(size); expect(app.host.textContent).toContain('between 0.01 and 1000 millimeters per block'); expect(app.ctx.setStemLabTool).not.toHaveBeenCalled();
  });

  it('supersedes the saved package when a different handoff arrives', async () => {
    const app = await openEditablePackage(); click(button(app, 'Edit blocks in Geometry World'));
    const saved = { ...app.ctx.toolData.printLab }; app.close();
    window.__alloPrintLabPendingHandoff = { ...geometryHandoff(), title: 'Independent selection', packageReview: { revisionId: 'different-id', title: 'Incorrect revision', materialId: 'PETG', printTurnDegrees: 90 } };
    const independent = mount(saved);
    expect(independent.ctx.toolData.printLab).toMatchObject({ title: 'Independent selection', printStage: 'Design', studentNote: '', materialId: 'PLA', packageEditId: '', preflight: null });
    expect(window.__alloPrintLabPackageEditSession).toBeUndefined(); expect(window.__alloPrintLabGeometrySession.printTurn90).toBe(false);
  });

  it.each(['ignored','throw'])('revokes a failed %s navigation without arming a later world replacement', async mode => {
    const app = await openEditablePackage(); vi.useFakeTimers(); window.__alloEnsureStemPluginLoaded = vi.fn().mockResolvedValue(true);
    if (mode === 'throw') app.ctx.setStemLabTool.mockImplementation(() => { throw new Error('Unavailable'); });
    click(button(app, 'Edit blocks in Geometry World'));
    if (mode === 'ignored') { expect(window.__alloGeometryWorldPendingBuild).toBeTruthy(); React.act(() => vi.advanceTimersByTime(1500)); }
    expect(window.__alloEnsureStemPluginLoaded).toHaveBeenCalled(); expect(window.__alloGeometryWorldPendingBuild).toBeUndefined(); expect(window.__alloPrintLabPackageEditSession).toBeUndefined();
    expect(app.ctx.toolData.printLab.packageEditId).toBe(''); expect(app.host.textContent).toContain('Try Edit blocks again'); expect(button(app, 'Edit blocks in Geometry World')).toBeTruthy();
  });
});

describe('actionable findings for a revised print', () => {
  function revised(report) {
    const packageEditId = 'revised-findings';
    window.__alloPrintLabPackageEditSession = { id: packageEditId };
    window.__alloPrintLabPendingHandoff = { ...geometryHandoff(), packageReview: { revisionId: packageEditId, title: 'Revised bridge', materialId: 'PLA', revisionNumber: 2 } };
    vi.spyOn(window.AlloModules.PrintableModel, 'inspectStl').mockReturnValue(report);
    return mount({ packageEditId, profile: printingProfile }, { setStemLabTool: vi.fn() });
  }
  const dimensionsMm = { width: 20, depth: 80, height: 10 };
  const group = (app, name) => app.host.querySelector('[data-print-finding-group="'+name+'"]');

  it('prioritizes blockers and gives each finding a single appropriate action', () => {
    const app = revised({ status: 'FAIL', dimensionsMm, triangleCount: 12, issues: [
      { code: 'MULTIPLE_SHELLS', severity: 'WARNING', message: 'Separate parts found.' },
      { code: 'BED_FIT', severity: 'ERROR', message: 'Outside the bed.' },
      { code: 'INFO_EXAMPLE', severity: 'INFO', message: 'An inspection note.' },
      { code: 'TOO_MANY_TRIANGLES', severity: 'ERROR', message: 'Too many triangles.' }
    ] });
    expect([...app.host.querySelectorAll('[data-print-finding-group]')].map(node => node.dataset.printFindingGroup)).toEqual(['blocking', 'review', 'notes']);
    expect(group(app,'blocking').textContent).toContain('Depth is 80 mm');
    expect(group(app,'review').textContent).toContain('Inspect each separate part in the sliced layers');
    expect(app.host.textContent.match(/Separate parts found\./g)).toHaveLength(1);
    expect([...app.host.querySelectorAll('button')].filter(node => node.textContent === 'Revise selected blocks')).toHaveLength(1);
    expect(group(app,'blocking').contains(button(app,'Revise selected blocks'))).toBe(true);
    expect(group(app,'review').contains(button(app,'Inspect connections in Geometry World'))).toBe(true);
    expect(app.host.querySelector('[data-print-repair-tools]')).toBeNull();
    expect(app.host.querySelector('[data-print-revision-next]')).toBeNull();
    expect(app.host.textContent).not.toContain('Review model & scale');
    click(button(app,'4. Submit')); expect(app.host.querySelector('[data-print-download="package"]').disabled).toBe(true);
    click(button(app,'2. Preflight')); click(button(app,'Review 90° turn')); expect(document.activeElement).toBe(button(app,'Apply 90° turn'));
    click(button(app,'Cancel turn preview')); click(button(app,'Adjust physical size')); expect(document.activeElement).toBe(app.host.querySelector('#print-lab-scale-input'));
    click(button(app,'2. Preflight')); click(button(app,'Revise selected blocks'));
    expect(app.ctx.setStemLabTool).toHaveBeenCalledWith('geometryWorld'); expect(window.__alloGeometryWorldPendingBuild.printContext.packageReview.title).toBe('Revised bridge');
  });

  it('inspects live connection warnings in the current revision without changing its baseline',()=>{
    const app=revised({status:'WARN',dimensionsMm,triangleCount:12,issues:[
      {code:'MULTIPLE_SHELLS',severity:'WARNING',message:'Separate parts found.'},
      {code:'ASSEMBLY_NOT_UNIONED',severity:'WARNING',message:'Review joining surfaces.'}
    ]});
    const actions=app.host.querySelectorAll('[data-print-inspect-connections]');expect(actions).toHaveLength(1);
    expect([...app.host.querySelectorAll('button')].filter(node=>node.textContent==='Revise selected blocks')).toHaveLength(0);
    click(actions[0]);
    expect(app.ctx.setStemLabTool).toHaveBeenCalledWith('geometryWorld');
    expect(window.__alloGeometryWorldPendingBuild).toMatchObject({projectId:'reopen',printContext:{inspect:{kind:'connections'},packageReview:{revisionId:'revised-findings',revisionNumber:2}}});
    expect(window.__alloPrintLabPackageEditSession.id).toBe('revised-findings');
  });

  it('keeps an unapplied printer profile edit before navigating to inspect connections',()=>{
    const app=revised({status:'WARN',dimensionsMm,triangleCount:12,issues:[{code:'MULTIPLE_SHELLS',severity:'WARNING',message:'Separate parts found.'}]});
    const width=app.host.querySelector('#print-lab-profile-bedWidthMm');changeField(width,'');
    click(app.host.querySelector('[data-print-inspect-connections]'));
    expect(document.activeElement).toBe(width);expect(width.value).toBe('');
    expect(app.ctx.setStemLabTool).not.toHaveBeenCalled();expect(window.__alloGeometryWorldPendingBuild).toBeUndefined();
  });

  it('offers a conservative candidate only for a relevant triangle warning and focuses its new report on apply', async () => {
    const issue = { code: 'DEGENERATE_TRIANGLES', severity: 'WARNING', message: 'One zero-area triangle.' };
    const app = revised({ status: 'WARN', dimensionsMm, triangleCount: 13, issues: [issue] });
    const candidateReport = { status: 'WARN', dimensionsMm, triangleCount: 12, meshCount: 1, issues: [{ code: 'CONSERVATIVE_REPAIR_ONLY', severity: 'WARNING', message: 'Inspect the repaired copy.' }] };
    const repair = vi.spyOn(window.AlloModules.PrintableModel,'repairStl').mockReturnValue({ ok: true, buffer: geometryHandoff().bytes.buffer, report: candidateReport, removedDegenerateTriangles: 1, weldedVertexReferences: 0 });
    expect(group(app,'review').querySelector('[data-print-repair-tools]')).toBeTruthy();
    expect(app.host.querySelectorAll('[data-print-repair-tools]')).toHaveLength(1);
    expect(app.host.textContent).toContain('Check the reported warnings');
    click(button(app,'Create conservative repair candidate'));
    expect(repair).toHaveBeenCalledOnce(); expect(app.host.textContent).toContain('Removed 1 degenerate triangle');
    expect(group(app,'review').textContent).toContain(issue.message);
    click(button(app,'Use repaired candidate locally'));
    await settle(() => expect(group(app,'review').textContent).toContain('Inspect the repaired copy.'));
    expect(document.activeElement).toBe(app.host.querySelector('#preflight-report-title'));
    expect(app.host.querySelector('[data-print-repair-tools]')).toBeNull();
    click(button(app,'Prepare revised files')); expect(document.activeElement).toBe(app.host.querySelector('[data-print-download="package"]'));
  });

  it('does not offer mesh repair, scaling or block edits for an unknown finding', () => {
    const app = revised({ status: 'FAIL', dimensionsMm, triangleCount: 12, issues: [{ code: 'NEW_INSPECTOR_LIMIT', severity: 'ERROR', message: 'This new condition requires review.' }] });
    expect(group(app,'blocking').textContent).toContain('This new condition requires review.'); expect(group(app,'blocking').querySelector('button')).toBeNull();
    expect(app.host.querySelector('[data-print-repair-tools]')).toBeNull(); expect(app.host.querySelector('[data-print-revision-next]')).toBeNull();
  });

  it('keeps profile draft guards on recovery actions', () => {
    const app = revised({ status: 'FAIL', dimensionsMm, triangleCount: 12, issues: [{ code: 'BED_FIT', severity: 'ERROR', message: 'Does not fit.' }, { code: 'OPEN_EDGES', severity: 'WARNING', message: 'Open edges.' }] });
    const bed = app.host.querySelector('#print-lab-profile-bedWidthMm'); changeField(bed,'');
    for (const name of ['Review 90° turn','Adjust physical size','Revise selected blocks']) {
      click(button(app,name)); expect(document.activeElement).toBe(bed); expect(app.host.querySelector('#print-lab-profile-error').textContent).toContain('Apply or discard');
    }
    expect(app.ctx.setStemLabTool).not.toHaveBeenCalled(); expect(app.host.querySelector('[data-turn-preview]')).toBeNull();
  });

  it.each([true, false])('rechecks a versioned ZIP on the receiving bed and only offers editing when block source exists (%s)', async (editable) => {
    const handoff = geometryHandoff();
    const object = new THREE.Group();
    for (const x of [0, 7]) {
      const part = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 8), new THREE.MeshBasicMaterial());
      part.position.set(x + 0.5, 1.5, 4);
      object.add(part);
    }
    handoff.bytes = new Uint8Array(window.AlloModules.PrintableModel.exportBinaryStl(THREE, object));
    object.children.forEach(part => { part.geometry.dispose(); part.material.dispose(); });
    handoff.sourceModel.blocks.forEach(block => { if (block.x) block.x = 7; });
    const packageEditId = 'two-piers';
    window.__alloPrintLabPackageEditSession = { id: packageEditId };
    window.__alloPrintLabPendingHandoff = { ...handoff, packageReview: { revisionId: packageEditId, title: 'Two piers', materialId: 'PETG', revisionNumber: 3 } };
    const producer = mount({ packageEditId, profile: { ...printingProfile, bedDepthMm: 100 } });
    expect(producer.host.textContent).toContain('Preflight reportWARN');
    click(button(producer, 'Prepare revised files'));
    window.StemLab.ensureThree = () => Promise.resolve(THREE);
    click(producer.host.querySelector('[data-print-download="package"]'));
    await settle(() => expect(downloads).toHaveLength(1));
    const zip = await JSZip.loadAsync(await bytes(downloads.shift()));
    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    expect(manifest.preflight.status).toBe('WARN');
    expect(manifest.source.revisionNumber).toBe(3);
    if (!editable) {
      zip.remove('editable-world.json'); manifest.source.editableFile = null; zip.file('manifest.json', JSON.stringify(manifest));
    }
    producer.close(); delete window.__alloPrintLabGeometrySession;
    const app = mount({ profile: receivingProfile }, { setStemLabTool: vi.fn() });
    choose(app, new File([await zip.generateAsync({ type: 'uint8array' })], 'two-piers-v3.zip'));
    await settle(() => expect(app.host.querySelector('[data-print-package-preview]')).toBeTruthy());
    click(button(app, 'Open for preflight'));
    expect(app.host.textContent).toContain('Preflight reportFAIL');
    expect(group(app, 'blocking').textContent).toContain('Width is 80 mm, 30 mm over the 50 mm printer limit.');
    expect(group(app, 'blocking').contains(button(app, 'Adjust physical size'))).toBe(true);
    expect(group(app, 'review').textContent).toContain('Inspect each separate part in the sliced layers');
    expect(app.host.textContent).not.toContain('Review 90° turn');
    expect(app.host.querySelectorAll('[data-edit-package-blocks]')).toHaveLength(0);
    expect(app.host.querySelectorAll('[data-print-inspect-connections]')).toHaveLength(editable ? 1 : 0);
    click(button(app,'4. Submit')); expect(button(app,'Optional STL export').disabled).toBe(true);
    click(button(app,'2. Preflight'));
    if (editable) {
      const edit = button(app, 'Inspect connections in Geometry World'); expect(group(app, 'review').contains(edit)).toBe(true);
      click(edit); expect(app.ctx.setStemLabTool).toHaveBeenCalledWith('geometryWorld');
      expect(window.__alloGeometryWorldPendingBuild.intent).toBe('reviewPrintPackage');
      expect(window.__alloGeometryWorldPendingBuild.printContext.inspect).toEqual({kind:'connections'});
      expect(window.__alloGeometryWorldPendingBuild.editableWorld.blocks).toHaveLength(16);
      expect(window.__alloGeometryWorldPendingBuild.printContext.packageReview).toMatchObject({revisionNumber:4,referencePrint:{basis:'package',dimensions:{width:80,depth:80,height:10}}});
      const saved={...app.ctx.toolData.printLab};app.close();delete window.__alloGeometryWorldPendingBuild;
      const resumed=mount(saved,{setStemLabTool:vi.fn()});
      expect(resumed.host.textContent).toContain('Preflight reportFAIL');
      await settle(() => expect(document.activeElement).toBe(button(resumed,'Inspect connections in Geometry World')));
    } else {
      click(button(app, 'Adjust physical size')); const scale = app.host.querySelector('#print-lab-scale-input');
      expect(document.activeElement).toBe(scale); changeField(scale, '0.5'); click(button(app, 'Apply scale'));
      click(button(app, '2. Preflight')); click(button(app, 'Run advisory preflight'));
      expect(group(app, 'blocking')).toBeNull(); expect(group(app, 'review').textContent).toContain('separation was intended');
      expect(button(app, 'Continue to Materials').disabled).toBe(false);
    }
  });
});
