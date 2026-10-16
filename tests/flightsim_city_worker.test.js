import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { Worker as NodeWorker } from 'node:worker_threads';

const source = readFileSync('dev-tools/skyschool-city-worker.js', 'utf8');
let api;
beforeEach(() => {
  api = { Promise, Set, Uint8Array, ArrayBuffer, setTimeout, clearTimeout, AbortController };
  runInNewContext(source, api);
});
afterEach(() => vi.useRealTimers());
const identity = { id: 'paris', name: 'Paris', lat: 48.8566, lon: 2.3522, bbox: [48.8485, 2.3399, 48.8647, 2.3645] };
const tile = () => ({ z: 14, x: 8299, y: 5636, data: new Uint8Array([1, 2, 3]) });
async function flush() { for (let i = 0; i < 5; i++) await Promise.resolve(); }
function harness(extra = {}) {
  const instances = [], blobs = [], convert = vi.fn(() => ({ id: 'fallback' }));
  class FakeWorker {
    constructor(url, options) { this.url = url; this.options = options; this.terminate = vi.fn(); this.postMessage = vi.fn((message, transfer) => { this.message = structuredClone(message, { transfer }); }); instances.push(this); }
    emit(data) { this.onmessage?.({ data }); }
    ready() { this.emit({ type: 'flight-city-vector-ready' }); }
  }
  class FakeBlob { constructor(parts, options) { blobs.push({ parts, options }); } }
  const urlApi = { createObjectURL: vi.fn(() => 'blob:city-worker'), revokeObjectURL: vi.fn() };
  return { instances, blobs, convert, urlApi, options: { Worker: FakeWorker, Blob: FakeBlob, URL: urlApi, source: 'local worker source', convert, ...extra } };
}

describe('SkySchool nonblocking city conversion', () => {
  it('waits for local worker startup, then transfers tile buffers exactly once', async () => {
    const test = harness(), input = [tile()], buffer = input[0].data.buffer;
    const task = api.convertFlightCityVectorTilesAsync(input, identity, test.options), worker = test.instances[0];
    expect(worker.postMessage).not.toHaveBeenCalled(); expect(buffer.byteLength).toBe(3);
    worker.ready();
    expect(buffer.byteLength).toBe(0); expect(Array.from(worker.message.tiles[0].data)).toEqual([1, 2, 3]);
    expect(worker.message.identity).toEqual(identity); expect(worker.postMessage).toHaveBeenCalledTimes(1);
    worker.emit({ type: 'flight-city-vector-result', pack: { id: 'mapped' } });
    await expect(task).resolves.toEqual({ id: 'mapped' });
    expect(test.convert).not.toHaveBeenCalled(); expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(test.urlApi.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:city-worker');
    expect(test.blobs).toEqual([{ parts: ['local worker source'], options: { type: 'text/javascript' } }]);
  });
  it('copies subviews and duplicate buffers without detaching unrelated bytes', async () => {
    const test = harness(), shared = new Uint8Array([7, 1, 2, 3, 8]), whole = tile();
    const task = api.convertFlightCityVectorTilesAsync([{ ...tile(), data: shared.subarray(1, 4) }, whole, { ...whole }], identity, test.options);
    const worker = test.instances[0]; worker.ready();
    expect([...shared]).toEqual([7, 1, 2, 3, 8]);
    expect(worker.message.tiles.map(item => [...item.data])).toEqual([[1, 2, 3], [1, 2, 3], [1, 2, 3]]);
    const transfer = worker.postMessage.mock.calls[0][1]; expect(new Set(transfer).size).toBe(3);
    worker.emit({ type: 'flight-city-vector-result', pack: {} }); await task;
  });
  it('uses the embedded source and native constructors without requiring caller configuration', async () => {
    const test = harness(); Object.assign(api, { FLIGHT_CITY_WORKER_SOURCE: 'embedded source', Worker: test.options.Worker, Blob: test.options.Blob, URL: test.options.URL });
    const task = api.convertFlightCityVectorTilesAsync([tile()], identity), worker = test.instances[0]; worker.ready();
    worker.emit({ type: 'flight-city-vector-result', pack: {} }); await task;
    expect(test.blobs[0].parts).toEqual(['embedded source']);
  });
  it.each([{ Worker: null }, { Blob: null }, { URL: null }, { source: '' }])('falls back when local worker support is unavailable: %j', async disabled => {
    const test = harness(disabled), input = [tile()];
    await expect(api.convertFlightCityVectorTilesAsync(input, identity, test.options)).resolves.toEqual({ id: 'fallback' });
    expect(test.convert).toHaveBeenCalledExactlyOnceWith(input, identity); expect(input[0].data.byteLength).toBe(3); expect(test.instances).toHaveLength(0);
  });
  it('falls back for blocked construction and revokes the unused object URL', async () => {
    const test = harness({ Worker: class { constructor() { throw new Error('Blocked by CSP'); } } });
    await expect(api.convertFlightCityVectorTilesAsync([tile()], identity, test.options)).resolves.toEqual({ id: 'fallback' });
    expect(test.urlApi.revokeObjectURL).toHaveBeenCalledTimes(1); expect(test.convert).toHaveBeenCalledTimes(1);
  });
  it('can recover from an asynchronous startup block before transferring input', async () => {
    const test = harness(), input = [tile()], task = api.convertFlightCityVectorTilesAsync(input, identity, test.options), worker = test.instances[0];
    const event = { preventDefault: vi.fn() }; worker.onerror(event);
    await expect(task).resolves.toEqual({ id: 'fallback' });
    expect(input[0].data.byteLength).toBe(3); expect(event.preventDefault).toHaveBeenCalledTimes(1); expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
  it('rejects pre-cancelled work without starting a worker or fallback', async () => {
    const controller = new AbortController(); controller.abort(); const test = harness({ signal: controller.signal });
    await expect(api.convertFlightCityVectorTilesAsync([tile()], identity, test.options)).rejects.toMatchObject({ name: 'AbortError' });
    expect(test.instances).toHaveLength(0); expect(test.convert).not.toHaveBeenCalled();
  });
  it.each([false, true])('terminates cancelled work and ignores late completion (transferred=%s)', async ready => {
    const controller = new AbortController(), test = harness({ signal: controller.signal });
    const task = api.convertFlightCityVectorTilesAsync([tile()], identity, test.options), worker = test.instances[0];
    if (ready) worker.ready(); const staleMessage = worker.onmessage; controller.abort();
    await expect(task).rejects.toMatchObject({ name: 'AbortError' });
    staleMessage({ data: { type: 'flight-city-vector-result', pack: { id: 'late' } } });
    expect(worker.terminate).toHaveBeenCalledTimes(1); expect(test.urlApi.revokeObjectURL).toHaveBeenCalledTimes(1); expect(test.convert).not.toHaveBeenCalled();
  });
  it('does not retry an expensive conversion on the main thread after worker failure', async () => {
    const test = harness(), task = api.convertFlightCityVectorTilesAsync([tile()], identity, test.options), worker = test.instances[0]; worker.ready();
    worker.onerror({ preventDefault() {} });
    await expect(task).rejects.toThrow('preparation failed'); expect(test.convert).not.toHaveBeenCalled(); expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
  it.each(['messageerror', 'reported-error', 'unexpected-message'])('cleans up failed worker messages: %s', async kind => {
    const test = harness(), task = api.convertFlightCityVectorTilesAsync([tile()], identity, test.options), worker = test.instances[0]; worker.ready();
    if (kind === 'messageerror') worker.onmessageerror({});
    else worker.emit(kind === 'reported-error' ? { type: 'flight-city-vector-error', message: 'Truncated city vector data.' } : { type: 'unexpected' });
    await expect(task).rejects.toThrow(); expect(test.convert).not.toHaveBeenCalled(); expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])('bounds worker lifetime and clears timers (transferred=%s)', async ready => {
    vi.useFakeTimers(); api.setTimeout = setTimeout; api.clearTimeout = clearTimeout;
    const test = harness(), task = api.convertFlightCityVectorTilesAsync([tile()], identity, test.options), caught = task.catch(error => error.message), worker = test.instances[0];
    if (ready) worker.ready(); await vi.advanceTimersByTimeAsync(20000);
    expect(await caught).toContain('timed out'); expect(worker.terminate).toHaveBeenCalledTimes(1); expect(test.convert).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it('clears the deadline after successful work', async () => {
    vi.useFakeTimers(); api.setTimeout = setTimeout; api.clearTimeout = clearTimeout;
    const test = harness(), task = api.convertFlightCityVectorTilesAsync([tile()], identity, test.options), worker = test.instances[0]; worker.ready(); worker.emit({ type: 'flight-city-vector-result', pack: {} });
    await task; expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects invalid or oversized tile input before transfer', async () => {
    for (const input of [[], [tile(), ...Array(9).fill(tile())], [{ ...tile(), data: new Uint8Array(4194305) }]]) {
      const test = harness(), task = api.convertFlightCityVectorTilesAsync(input, identity, test.options), worker = test.instances[0]; worker.ready();
      await expect(task).rejects.toThrow(); expect(worker.postMessage).not.toHaveBeenCalled(); expect(worker.terminate).toHaveBeenCalledTimes(1);
    }
  });
  it('treats transfer failure as an error without rerunning conversion', async () => {
    const test = harness(), task = api.convertFlightCityVectorTilesAsync([tile()], identity, test.options), worker = test.instances[0];
    worker.postMessage.mockImplementation(() => { throw new Error('DataCloneError'); }); worker.ready();
    await expect(task).rejects.toThrow('DataCloneError'); expect(test.convert).not.toHaveBeenCalled();
  });
  it('honors cancellation before an unavailable-worker fallback starts', async () => {
    const controller = new AbortController(), test = harness({ Worker: null, signal: controller.signal });
    const task = api.convertFlightCityVectorTilesAsync([tile()], identity, test.options); controller.abort();
    await expect(task).rejects.toMatchObject({ name: 'AbortError' }); expect(test.convert).not.toHaveBeenCalled();
  });
});

describe('SkySchool bundled worker entry point', () => {
  it('announces readiness, validates geometry and closes after returning one district', () => {
    const pack = { id: 'mapped' }, self = { postMessage: vi.fn(), close: vi.fn() };
    api.self = self; api.convertFlightCityVectorTiles = vi.fn(() => pack); api.validateFlightCityPack = vi.fn(() => pack);
    api.flightCityVectorWorkerMain(); expect(self.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'flight-city-vector-ready' });
    const tiles = [tile()]; self.onmessage({ data: { type: 'flight-city-vector-convert', tiles, identity } });
    expect(api.convertFlightCityVectorTiles).toHaveBeenCalledExactlyOnceWith(tiles, identity); expect(api.validateFlightCityPack).toHaveBeenCalledExactlyOnceWith(pack);
    expect(self.postMessage).toHaveBeenLastCalledWith({ type: 'flight-city-vector-result', pack }); expect(self.close).toHaveBeenCalledTimes(1);
  });
  it('returns a bounded diagnostic when geometry conversion fails', () => {
    const self = { postMessage: vi.fn(), close: vi.fn() }; api.self = self;
    api.convertFlightCityVectorTiles = () => { throw new Error('bad data '.repeat(100)); }; api.validateFlightCityPack = vi.fn(); api.flightCityVectorWorkerMain();
    self.onmessage({ data: { type: 'flight-city-vector-convert', tiles: [tile()], identity } });
    expect(self.postMessage.mock.calls[1][0]).toMatchObject({ type: 'flight-city-vector-error' });
    expect(self.postMessage.mock.calls[1][0].message).toHaveLength(240); expect(self.close).toHaveBeenCalledTimes(1);
  });
  it('converts a genuine Paris tile in a separate thread while the caller remains responsive', async () => {
    const shared = {}; runInNewContext(readFileSync('dev-tools/skyschool-city-online.js', 'utf8'), shared);
    const workerSource = ['vendor/skyschool-vector/decoder.js', 'dev-tools/skyschool-city-converter.js', 'dev-tools/skyschool-city-vector.js'].map(path => readFileSync(path, 'utf8')).join('\n') + '\n' +
      ['flightCityText', 'flightCityTarget', 'validateFlightCityPack'].map(name => shared[name].toString()).join('\n') + '\n(' + api.flightCityVectorWorkerMain.toString() + ')();';
    let workerSourceText, nodeWorker, terminated = false;
    class BlobSource { constructor(parts) { workerSourceText = parts.join(''); } }
    class ThreadWorker {
      constructor() {
        nodeWorker = new NodeWorker("const {parentPort}=require('node:worker_threads'); global.self={postMessage:v=>parentPort.postMessage(v),close:()=>parentPort.close()}; parentPort.on('message',data=>self.onmessage({data}));\n" + workerSourceText, { eval: true });
        nodeWorker.on('message', data => this.onmessage?.({ data })); nodeWorker.on('error', error => this.onerror?.(error));
      }
      postMessage(message, transfer) { nodeWorker.postMessage(message, transfer); }
      terminate() { terminated = true; nodeWorker.terminate(); }
    }
    const fixture = new Uint8Array(readFileSync('tests/fixtures/skyschool_openfreemap_paris_14_8299_5636.pbf'));
    let completed = false, callerTicked = false;
    const task = api.convertFlightCityVectorTilesAsync([{ z: 14, x: 8299, y: 5636, data: fixture }], { ...identity, source: 'OpenStreetMap via OpenFreeMap' }, {
      Worker: ThreadWorker, Blob: BlobSource, URL: { createObjectURL: () => 'blob:local', revokeObjectURL() {} }, source: workerSource,
      convert: () => { throw new Error('Unexpected synchronous fallback'); },
    }).then(pack => { completed = true; return pack; });
    await new Promise(resolve => setTimeout(() => { callerTicked = !completed; resolve(); }, 0));
    const pack = await task;
    expect(callerTicked).toBe(true); expect(pack.buildings.length).toBeGreaterThan(500); expect(pack.roads.length).toBeGreaterThan(50);
    expect(pack.buildings.some(building => building.rings.length > 1)).toBe(true); expect(fixture.byteLength).toBe(0); expect(terminated).toBe(true);
  }, 30000);
});
