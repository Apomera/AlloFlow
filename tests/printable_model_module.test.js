import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let P;

beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.PrintableModel;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'printable_model_module.js'), 'utf8'))();
  P = window.AlloModules.PrintableModel;
});

function binaryStl(triangles) {
  const buffer = new ArrayBuffer(84 + triangles.length * 50);
  const view = new DataView(buffer);
  view.setUint32(80, triangles.length, true);
  triangles.forEach((vertices, index) => {
    let offset = 84 + index * 50 + 12;
    vertices.forEach(vertex => {
      vertex.forEach(value => { view.setFloat32(offset, value, true); offset += 4; });
    });
  });
  return buffer;
}

function declaredBinaryStl(triangleCount) {
  const buffer = new ArrayBuffer(84 + triangleCount * 50);
  new DataView(buffer).setUint32(80, triangleCount, true);
  return buffer;
}

function printJobTicketInput() {
  return {
    modelHash: 'a'.repeat(64),
    sourceFormat: 'STL',
    unitDeclaration: '1 source unit = 1 mm',
    dimensionsMm: { width: 20, depth: 20, height: 20 },
    material: { key: 'PLA', name: 'PLA', densityGPerCm3: 1.24, reviewed: true },
    printerProfile: { key: 'lab-profile', name: 'Lab printer', bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250, nozzleMm: 0.4, reviewed: true },
    advisoryEstimate: { materialGrams: 12, printMinutes: 60, pointQuote: 40 },
    gcodeMetadataHash: 'b'.repeat(64),
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function minimalGlb(json) {
  const raw = new TextEncoder().encode(JSON.stringify(json));
  const paddedLength = Math.ceil(raw.length / 4) * 4;
  const buffer = new ArrayBuffer(12 + 8 + paddedLength);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, paddedLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  const out = new Uint8Array(buffer, 20, paddedLength);
  out.fill(0x20);
  out.set(raw);
  return buffer;
}

function fakeThree() {
  class BufferAttribute {
    constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; this.count = array.length / itemSize; }
    getX(index) { return this.array[index * this.itemSize]; }
    getY(index) { return this.array[index * this.itemSize + 1]; }
    getZ(index) { return this.array[index * this.itemSize + 2]; }
  }
  class BufferGeometry {
    constructor() { this.attributes = {}; this.index = null; }
    setAttribute(name, value) { this.attributes[name] = value; }
    computeVertexNormals() {}
    computeBoundingBox() {}
  }
  class MeshStandardMaterial { constructor(options) { this.options = options; } }
  class Mesh {
    constructor(geometry, material) { this.geometry = geometry; this.material = material; this.isMesh = true; this.userData = {}; this.matrixWorld = {}; }
    traverse(callback) { callback(this); }
    updateMatrixWorld() {}
  }
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    applyMatrix4() { return this; }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    crossVectors(a, b) { this.x = a.y * b.z - a.z * b.y; this.y = a.z * b.x - a.x * b.z; this.z = a.x * b.y - a.y * b.x; return this; }
    normalize() { const length = Math.hypot(this.x, this.y, this.z) || 1; this.x /= length; this.y /= length; this.z /= length; return this; }
  }
  return { BufferAttribute, BufferGeometry, MeshStandardMaterial, Mesh, Vector3, DoubleSide: 2 };
}

describe('PrintableModel recipe preflight', () => {
  it('reports physical dimensions and keeps a primitive assembly advisory-only', () => {
    const report = P.inspectRecipe({ parts: [
      { shape: 'box', size: [2, 1, 3], position: [0, 0.5, 0], rotation: [0, 0, 0] },
    ] }, 10, { bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250 });
    expect(report.dimensionsMm).toEqual({ width: 20, depth: 30, height: 10 });
    expect(report.triangleCount).toBe(12);
    expect(report.status).toBe('WARN');
    expect(report.issues.map(item => item.code)).toContain('ASSEMBLY_NOT_UNIONED');
  });

  it('fails a recipe that does not fit the configured printer', () => {
    const report = P.inspectRecipe({ parts: [
      { shape: 'box', size: [4, 4, 4], position: [0, 2, 0], rotation: [0, 0, 0] },
    ] }, 100, { bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250 });
    expect(report.status).toBe('FAIL');
    expect(report.issues.map(item => item.code)).toContain('BED_FIT');
  });

  it('applies the whole-recipe Y rotation to physical bounds', () => {
    const report = P.inspectRecipe({ rotY: 90, parts: [
      { shape: 'box', size: [4, 1, 2], position: [2, 0.5, 0], rotation: [0, 0, 0] },
    ] }, 10, { bedWidthMm: 25, bedDepthMm: 60, bedHeightMm: 20 });
    expect(report.dimensionsMm).toEqual({ width: 20, depth: 40, height: 10 });
    expect(report.status).toBe('WARN');
    expect(report.issues.map(item => item.code)).not.toContain('BED_FIT');
  });

  it('matches Three.js XYZ Euler bounds for a mixed-axis rotation', () => {
    const report = P.inspectRecipe({ parts: [
      { shape: 'box', size: [2, 4, 6], position: [0, 0, 0], rotation: [30, 45, 60] },
    ] }, 10, { bedWidthMm: 100, bedDepthMm: 68, bedHeightMm: 100 });

    expect(report.dimensionsMm).toEqual({ width: 73.99, depth: 70.49, height: 44.82 });
    expect(report.status).toBe('FAIL');
    expect(report.issues.map(item => item.code)).toContain('BED_FIT');
  });
});

describe('PrintableModel file inspection', () => {
  it('reads a binary STL and detects boundary edges', () => {
    const report = P.inspectStl(binaryStl([
      [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
    ]), 10);
    expect(report.triangleCount).toBe(1);
    expect(report.dimensionsMm).toEqual({ width: 10, depth: 10, height: 0 });
    expect(report.openEdges).toBe(3);
    expect(report.status).toBe('WARN');
  });

  it('round-trips conventional Z-up STL coordinates through the Y-up scene', () => {
    const source = binaryStl([[
      [1, 2, 3], [4, 2, 3], [1, 6, 9],
    ]]);
    const THREE = fakeThree();
    const mesh = P.buildStlObject(THREE, source, 1);
    expect(Array.from(mesh.geometry.attributes.position.array)).toEqual([
      1, 3, -2, 4, 3, -2, 1, 9, -6,
    ]);
    const exported = P.exportBinaryStl(THREE, mesh);
    const view = new DataView(exported);
    const vertices = [];
    for (let index = 0; index < 3; index++) {
      const offset = 84 + 12 + index * 12;
      vertices.push([view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)]);
    }
    expect(vertices).toEqual([[1, 2, 3], [4, 2, 3], [1, 6, 9]]);
  });

  it('accepts embedded GLB v2 metadata and rejects external resources', () => {
    const base = {
      accessors: [{ count: 6, min: [0, 0, 0], max: [0.1, 0.2, 0.3] }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    };
    const profile = { bedWidthMm: 400, bedDepthMm: 400, bedHeightMm: 400 };
    const embedded = P.inspectGlb(minimalGlb(base), 1000, profile);
    expect(embedded.triangleCount).toBe(2);
    expect(embedded.dimensionsMm).toEqual({ width: 100, depth: 300, height: 200 });
    expect(embedded.status).toBe('WARN');
    const external = P.inspectGlb(minimalGlb({ ...base, buffers: [{ uri: 'https://example.com/model.bin' }] }), 1000, profile);
    expect(external.status).toBe('FAIL');
    expect(external.issues.map(item => item.code)).toContain('EXTERNAL_RESOURCE');
  });

  it('reports connected components, non-manifold topology, winding, and closed-volume advisories', () => {
    const tetrahedron = binaryStl([
      [[0, 0, 0], [0, 1, 0], [1, 0, 0]],
      [[0, 0, 0], [1, 0, 0], [0, 0, 1]],
      [[0, 0, 0], [0, 0, 1], [0, 1, 0]],
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    ]);
    const report = P.inspectStl(tetrahedron, 10);
    expect(report).toMatchObject({ connectedComponents: 1, openEdges: 0, nonManifoldEdges: 0, windingInconsistencies: 0 });
    expect(report.enclosedVolumeMm3).toBeCloseTo(1000 / 6, 2);
    expect(report.volumeAdvisory).toContain('school slicer');

    const separate = P.inspectStl(binaryStl([
      [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
      [[10, 0, 0], [11, 0, 0], [10, 1, 0]],
    ]), 1);
    expect(separate.connectedComponents).toBe(2);
    expect(separate.issues.map(item => item.code)).toContain('MULTIPLE_SHELLS');
  });

  it('joins topology across a spatial-cell boundary only when vertices are truly within tolerance', () => {
    const report = P.inspectStl(binaryStl([
      [[0.0000049, 0, 0], [1.0000049, 0, 0], [0, 1, 0]],
      [[1.0000051, 0, 0], [0.0000051, 0, 0], [0, -1, 0]],
    ]), 1);

    expect(report).toMatchObject({ connectedComponents: 1, openEdges: 4, windingInconsistencies: 0 });
  });

  it('creates only a conservative STL repair candidate', () => {
    const result = P.repairStl(binaryStl([
      [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
      [[0, 0, 0], [0.000001, 0, 0], [0, 0, 0]],
    ]), { unitMm: 1, weldTolerance: 0.00001 });
    expect(result).toMatchObject({ ok: true, inputTriangleCount: 2, outputTriangleCount: 1, removedDegenerateTriangles: 1, method: 'conservative-stl-repair/1' });
    expect(result.weldedVertexReferences).toBeGreaterThan(0);
    expect(result.advisory).toContain('not claimed to be watertight');
    expect(result.report.issues.map(item => item.code)).toContain('CONSERVATIVE_REPAIR_ONLY');
  });

  it('welds by actual distance rather than rounded bucket identity', () => {
    const acrossBucketBoundary = P.repairStl(binaryStl([
      [[0.0049, 0, 0], [2, 0, 0], [0, 2, 0]],
      [[0.0051, 0, 0], [-2, 0, 0], [0, -2, 0]],
    ]), { unitMm: 1, weldTolerance: 0.01 });
    expect(acrossBucketBoundary).toMatchObject({ ok: true, outputTriangleCount: 2, weldedVertexReferences: 1 });

    const outsideEuclideanTolerance = P.repairStl(binaryStl([
      [[-0.0049, -0.0049, -0.0049], [2, 0, 0], [0, 2, 0]],
      [[0.0049, 0.0049, 0.0049], [-2, 0, 0], [0, -2, 0]],
    ]), { unitMm: 1, weldTolerance: 0.01 });
    expect(outsideEuclideanTolerance).toMatchObject({ ok: true, outputTriangleCount: 2, weldedVertexReferences: 0 });
  });

  it('enforces repair-specific byte and triangle caps even with a permissive printer profile', () => {
    const permissiveProfile = { maxBytes: 50 * 1024 * 1024, maxTriangles: 1000000 };
    const tooManyBytes = P.repairStl(new Uint8Array(P.REPAIR_LIMITS.maxBytes + 1), { profile: permissiveProfile });
    expect(tooManyBytes.ok).toBe(false);
    expect(tooManyBytes.errors.join(' ')).toMatch(/repair-specific local byte limit/i);

    const tooManyTriangles = P.repairStl(declaredBinaryStl(P.REPAIR_LIMITS.maxTriangles + 1), { profile: permissiveProfile });
    expect(tooManyTriangles.ok).toBe(false);
    expect(tooManyTriangles.errors.join(' ')).toMatch(/repair-specific local triangle limit/i);
  });
});

describe('PrintableModel submission package', () => {
  const report = { status: 'WARN', sourceFormat: 'RECIPE', triangleCount: 12, dimensionsMm: { width: 20, depth: 20, height: 20 }, issues: [] };

  it('requires an AI disclosure when AI assisted and strips unrelated fields', () => {
    const invalid = P.validateSubmission({ title: 'Robot', sourceFormat: 'RECIPE', aiUse: 'ASSISTED', recipe: { parts: [{ shape: 'box' }] }, preflight: report });
    expect(invalid.ok).toBe(false);
    const valid = P.validateSubmission({ title: 'Robot', sourceFormat: 'RECIPE', aiUse: 'ASSISTED', aiDisclosure: 'AI suggested the starting primitives; I resized every part.', recipe: { parts: [{ shape: 'box' }] }, preflight: report, studentEmail: 'must-not-survive@example.com' });
    expect(valid.ok).toBe(true);
    expect(valid.value).not.toHaveProperty('studentEmail');
  });

  it('round-trips a versioned package and rejects blocking preflight', () => {
    const json = P.serializeSubmission({ title: 'Bridge model', sourceFormat: 'RECIPE', recipe: { parts: [{ shape: 'box' }] }, preflight: report });
    expect(P.parseSubmission(json)).toMatchObject({ ok: true, value: { version: 'printable/1', title: 'Bridge model' } });
    expect(P.validateSubmission({ title: 'Bad model', sourceFormat: 'RECIPE', recipe: { parts: [{ shape: 'box' }] }, preflight: { ...report, status: 'FAIL' } }).ok).toBe(false);
  });

  it('produces a deterministic advisory material estimate and quote', () => {
    const material = P.estimateMaterial({ volumeMm3UpperBound: 10000 }, { densityGPerCm3: 1.2, infillPercent: 20, supportPercent: 0 });
    expect(material.estimatedGrams).toBeGreaterThan(0);
    expect(P.estimateQuote(material, { pointsPerGram: 2, minimumPoints: 10 })).toBeGreaterThanOrEqual(10);
  });

  it('parses only G-code comments and produces a configurable quote breakdown', () => {
    const parsed = P.parseGcodeMetadata(`G28 ; machine command must be ignored
; generated by PrusaSlicer 2.7.4
; estimated printing time (normal mode) = 1h 2m 3s
; filament used [g] = 12.5
; layer_height = 0.2
; total layer number = 88`);
    expect(parsed).toMatchObject({ ok: true, value: { metadataOnly: true, slicer: 'PrusaSlicer', estimatedTimeSeconds: 3723, filamentGrams: 12.5, layerHeightMm: 0.2, layerCount: 88 } });
    expect(JSON.stringify(parsed.value)).not.toContain('G28');
    const quote = P.estimatePointQuote({ estimatedGrams: 10 }, { basePoints: 2, setupPoints: 3, pointsPerGram: 2, pointsPerHour: 6, estimatedMinutes: 60, complexityMultiplier: 1.5, roundingIncrement: 5, minimumPoints: 1 });
    expect(quote.totalPoints).toBe(50);
    expect(quote.breakdown).toMatchObject({ base: 2, setup: 3, material: 20, time: 6, complexity: 15.5 });
  });

  it('builds privacy-minimized job tickets and keeps physical adapters disabled', async () => {
    const hashA = 'a'.repeat(64), hashB = 'b'.repeat(64);
    const ticket = await P.createPrintJobTicket({
      ...printJobTicketInput(),
      studentEmail: 'must-not-survive@example.com', commands: ['G28'], credentials: { token: 'secret' },
    });
    expect(ticket).toMatchObject({ version: 'alloflow-print-job/1', model: { sha256: hashA }, gcode: { metadataSha256: hashB }, execution: { commandsIncluded: false, credentialsIncluded: false } });
    expect(JSON.stringify(ticket)).not.toMatch(/must-not-survive|G28|secret/);
    expect(P.parsePrintJobTicket(P.serializePrintJobTicket(ticket)).ok).toBe(true);
    expect(P.createPrinterAdapter('OCTOPRINT')).toMatchObject({ enabled: false, executionEnabled: false });
    expect(P.createSlicerAdapter('CURAENGINE')).toMatchObject({ enabled: false, executionEnabled: false });
    expect(P.createGeometryAdapter('WALL_THICKNESS')).toMatchObject({ enabled: false, executionEnabled: false });

    const simulator = P.createPrinterAdapter('SIMULATOR', { printers: [
      { key: 'a', materials: ['PLA'], bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250 },
      { key: 'b', materials: ['PLA'], bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250 },
    ] });
    const queued = simulator.submit(ticket, 'a');
    expect(queued).toMatchObject({ state: 'QUEUED', simulationOnly: true });
    expect(simulator.advance(queued.jobKey).state).toBe('PRINTING');
    simulator.emit({ type: 'JOB_PROGRESS', jobKey: queued.jobKey, printerKey: 'a', progressPercent: 55, atMinute: 30, commands: ['G1'] });
    expect(simulator.snapshot().jobs[queued.jobKey].progressPercent).toBe(55);
    expect(simulator.plan([ticket, ticket, ticket]).assignments).toHaveLength(3);
    expect(P.getEngineCapabilities()).toMatchObject({ slicer: { embeddedSlicing: false }, geometry: { checksWallThickness: false }, printer: { networkExecution: false } });
  });

  it('digests every ticket payload field and detects tampering or a missing digest', async () => {
    const ticket = await P.createPrintJobTicket(printJobTicketInput());
    const duplicate = await P.createPrintJobTicket(printJobTicketInput());

    expect(ticket.integrity).toEqual({
      algorithm: 'SHA-256',
      payloadSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      scope: 'ticket-without-integrity',
    });
    expect(duplicate.integrity.payloadSha256).toBe(ticket.integrity.payloadSha256);
    expect(await P.verifyPrintJobTicketIntegrity(ticket)).toMatchObject({ ok: true, errors: [] });

    const changedMaterial = JSON.parse(JSON.stringify(ticket));
    changedMaterial.review.material.key = 'PETG';
    expect(await P.verifyPrintJobTicketIntegrity(changedMaterial)).toMatchObject({
      ok: false,
      errors: [expect.stringMatching(/digest does not match/i)],
    });

    const changedQuote = JSON.parse(JSON.stringify(ticket));
    changedQuote.advisoryEstimate.pointQuote += 1;
    expect(await P.verifyPrintJobTicketIntegrity(changedQuote)).toMatchObject({
      ok: false,
      errors: [expect.stringMatching(/digest does not match/i)],
    });

    const missingDigest = JSON.parse(JSON.stringify(ticket));
    delete missingDigest.integrity;
    expect(P.validatePrintJobTicket(missingDigest)).toMatchObject({
      ok: false,
      errors: [expect.stringMatching(/payload digest is required/i)],
    });
    expect(P.parsePrintJobTicket(JSON.stringify(missingDigest)).ok).toBe(false);
    expect((await P.verifyPrintJobTicketIntegrity(missingDigest)).ok).toBe(false);
  });

  it('ignores invalid telemetry transitions and never resurrects a terminal job', () => {
    const empty = P.reducePrinterTelemetry();
    expect(P.reducePrinterTelemetry(empty, { type: 'JOB_QUEUED', jobKey: 'job-1', printerKey: 'missing' })).toEqual(empty);

    let state = P.reducePrinterTelemetry(empty, { type: 'PRINTER_REGISTERED', printerKey: 'printer-a', atMinute: 0 });
    const registered = JSON.parse(JSON.stringify(state));
    expect(P.reducePrinterTelemetry(state, { type: 'JOB_PROGRESS', jobKey: 'missing', printerKey: 'printer-a', progressPercent: 50 })).toEqual(registered);
    expect(P.reducePrinterTelemetry(state, { type: 'JOB_QUEUED', jobKey: 'job-1', printerKey: 'printer-b' })).toEqual(registered);

    state = P.reducePrinterTelemetry(state, { type: 'JOB_QUEUED', jobKey: 'job-1', printerKey: 'printer-a', atMinute: 1 });
    const queued = JSON.parse(JSON.stringify(state));
    expect(P.reducePrinterTelemetry(state, { type: 'JOB_READY', jobKey: 'job-1', printerKey: 'printer-a', atMinute: 2 })).toEqual(queued);
    expect(P.reducePrinterTelemetry(state, { type: 'JOB_PROGRESS', jobKey: 'job-1', printerKey: 'printer-b', progressPercent: 50 })).toEqual(queued);

    state = P.reducePrinterTelemetry(state, { type: 'JOB_STARTED', jobKey: 'job-1', printerKey: 'printer-a', atMinute: 2 });
    state = P.reducePrinterTelemetry(state, { type: 'JOB_READY', jobKey: 'job-1', printerKey: 'printer-a', atMinute: 3 });
    expect(state.jobs['job-1']).toMatchObject({ state: 'READY', progressPercent: 100 });
    const terminal = JSON.parse(JSON.stringify(state));
    expect(P.reducePrinterTelemetry(state, { type: 'JOB_STARTED', jobKey: 'job-1', printerKey: 'printer-a', atMinute: 4 })).toEqual(terminal);
  });

  it('requires a configured simulator printer with matching material and build area', async () => {
    const ticket = await P.createPrintJobTicket(printJobTicketInput());
    const simulator = P.createPrinterAdapter('SIMULATOR', { printers: [
      { key: 'wrong-material', materials: ['PETG'], bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250 },
      { key: 'too-small', materials: ['PLA'], bedWidthMm: 19, bedDepthMm: 220, bedHeightMm: 250 },
      { key: 'ready', materials: ['PLA'], bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250 },
    ] });

    expect(() => simulator.submit(ticket)).toThrow(/configured simulated printer/i);
    expect(() => simulator.submit(ticket, 'missing')).toThrow(/configured simulated printer/i);
    expect(() => simulator.submit(ticket, 'wrong-material')).toThrow(/reviewed material/i);
    expect(() => simulator.submit(ticket, 'too-small')).toThrow(/build area/i);
    expect(simulator.submit(ticket, 'ready')).toMatchObject({ state: 'QUEUED', printerKey: 'ready', simulationOnly: true });
  });
});
