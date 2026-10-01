import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const nodeFs = require('node:fs');
const {
  DEFAULT_GRIST_DESKTOP_MANIFEST,
  LOOPBACK_HOST,
  allocateLoopbackPort,
  createAlloSheetEngineManager,
  validateManifest,
  validateRelativeTarget,
} = require(resolve(process.cwd(), 'desktop', 'runtime', 'allosheet-engine-manager.cjs'));

const temporaryRoots = [];
const TEST_ELECTRON_KEY = 'AbCdEfGhIjKlMnOpQrStUv';
const AUTH_MESSAGE_TYPE = 'alloflow-allosheet-grist-auth-v1';

afterEach(() => {
  for (const target of temporaryRoots.splice(0)) {
    rmSync(target, { recursive: true, force: true });
  }
});

function makeAppDataDir() {
  const directory = mkdtempSync(join(tmpdir(), 'allosheet-engine-test-'));
  temporaryRoots.push(directory);
  return directory;
}

function sha256(payload) {
  return createHash('sha256').update(payload).digest('hex');
}

function makeManifest(payload, overrides = {}) {
  return {
    product: 'grist-desktop',
    version: '9.8.7-test',
    license: 'Apache-2.0',
    sourceUrl: 'https://github.com/gristlabs/grist-desktop',
    artifacts: {
      'win32-x64': {
        archiveUrl: 'https://downloads.example.test/grist-desktop-9.8.7-test-win-x64.zip',
        archiveSha256: sha256(payload),
        archiveBytes: payload.length,
        archiveFormat: 'zip',
        executablePath: 'Grist Desktop.exe',
        serverEntrypoint: 'resources/app.asar/core/_build/stubs/app/server/server.js',
        healthPath: '/status',
        ...overrides,
      },
    },
  };
}

function makeFakeChild(pid = 4242) {
  const child = new EventEmitter();
  child.pid = pid;
  child.exitCode = null;
  child.killed = false;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn(() => {
    child.killed = true;
    child.exitCode = 0;
    child.emit('exit', 0, null);
    return true;
  });
  return child;
}

function makeAuthenticatedRootResponse(cookieName) {
  return {
    status: 200,
    ok: true,
    headers: {
      getSetCookie: () => [`${cookieName}=session-value; Path=/; HttpOnly; SameSite=Lax`],
      get: () => null,
    },
    body: { cancel: async () => {} },
  };
}

function makeAsarWithServerEntrypoint() {
  const segments = ['core', '_build', 'stubs', 'app', 'server', 'server.js'];
  let entry = { size: 1, offset: '0' };
  for (const segment of [...segments].reverse()) entry = { files: { [segment]: entry } };
  const headerString = Buffer.from(JSON.stringify(entry), 'utf8');
  const alignedStringBytes = Math.ceil(headerString.length / 4) * 4;
  const payloadSize = 4 + alignedStringBytes;
  const headerPickle = Buffer.alloc(4 + payloadSize);
  headerPickle.writeUInt32LE(payloadSize, 0);
  headerPickle.writeUInt32LE(headerString.length, 4);
  headerString.copy(headerPickle, 8);
  const sizePickle = Buffer.alloc(8);
  sizePickle.writeUInt32LE(4, 0);
  sizePickle.writeUInt32LE(headerPickle.length, 4);
  return Buffer.concat([sizePickle, headerPickle, Buffer.from('x')]);
}

function writeFakePortableGrist(destinationDir) {
  mkdirSync(join(destinationDir, 'resources'), { recursive: true });
  writeFileSync(join(destinationDir, 'Grist Desktop.exe'), 'fake electron executable');
  // The production artifact is an ASAR file.  The manager verifies its header
  // contains the exact server.js path before handing that path to Electron.
  writeFileSync(join(destinationDir, 'resources', 'app.asar'), makeAsarWithServerEntrypoint());
}

function makeHarness(payload = Buffer.from('portable-grist-test-archive'), overrideFactory = {}) {
  const appDataDir = makeAppDataDir();
  const child = makeFakeChild();
  const calls = {
    download: [],
    extract: [],
    spawn: [],
    terminate: [],
  };
  const overrides = typeof overrideFactory === 'function'
    ? overrideFactory({ appDataDir, calls, child, payload })
    : overrideFactory;
  const manager = createAlloSheetEngineManager({
    appDataDir,
    platform: 'win32',
    arch: 'x64',
    manifest: makeManifest(payload),
    env: {
      SYSTEMROOT: 'C:\\Windows',
      PATH: 'C:\\Windows\\System32',
      SECRET_FROM_PARENT: 'must-not-reach-sidecar',
      NODE_OPTIONS: '--require=C:\\attacker.cjs',
      GRIST_IGNORE_SESSION: 'true',
      GRIST_FORWARD_AUTH_HEADER: 'X-Forged-User',
      GRIST_INCLUDE_CUSTOM_SCRIPT_URL: 'https://attacker.example/script.js',
    },
    downloadArchive: async (context) => {
      calls.download.push(context);
      writeFileSync(context.destinationPath, payload);
      context.onProgress(payload.length, payload.length);
    },
    extractArchive: async (context) => {
      calls.extract.push(context);
      writeFakePortableGrist(context.destinationDir);
    },
    allocatePort: async ({ host }) => {
      expect(host).toBe(LOOPBACK_HOST);
      return 43123;
    },
    spawnImpl: (command, args, options) => {
      calls.spawn.push({ command, args, options });
      queueMicrotask(() => child.emit('message', {
        type: AUTH_MESSAGE_TYPE,
        version: 1,
        electronKey: TEST_ELECTRON_KEY,
      }));
      return child;
    },
    healthProbe: async ({
      baseUrl, healthPath, host, port, electronKey, sessionCookieName,
    }) => {
      expect(baseUrl).toBe('http://127.0.0.1:43123');
      expect(healthPath).toBe('/status');
      expect(host).toBe(LOOPBACK_HOST);
      expect(port).toBe(43123);
      expect(electronKey).toBe(TEST_ELECTRON_KEY);
      expect(sessionCookieName).toMatch(/^allosheet_[a-f0-9]{24}$/);
      return true;
    },
    terminateProcess: async (target, context) => {
      calls.terminate.push({ target, context });
      target.killed = true;
      target.exitCode = 0;
      target.emit('exit', 0, null);
    },
    ...overrides,
  });
  return { appDataDir, calls, child, manager, payload };
}

describe('AlloSheet managed Grist Desktop engine', () => {
  it('pins the official Windows portable release and supply-chain metadata', () => {
    expect(DEFAULT_GRIST_DESKTOP_MANIFEST).toMatchObject({
      product: 'grist-desktop',
      version: '0.3.13',
      license: 'Apache-2.0',
      sourceUrl: 'https://github.com/gristlabs/grist-desktop',
      artifacts: {
        'win32-x64': {
          archiveUrl: 'https://github.com/gristlabs/grist-desktop/releases/download/v0.3.13/grist-desktop-0.3.13-win-x64.zip',
          archiveSha256: 'c85f49625cfd355b9c445a77bc5e4df6a8a6ea2e4c54597ccca3faa322a4b1cc',
          archiveBytes: 387242145,
          archiveFormat: 'zip',
          executablePath: 'Grist Desktop.exe',
          serverEntrypoint: 'resources/app.asar/core/_build/stubs/app/server/server.js',
        },
      },
    });
    expect(Object.isFrozen(DEFAULT_GRIST_DESKTOP_MANIFEST)).toBe(true);
    expect(Object.isFrozen(DEFAULT_GRIST_DESKTOP_MANIFEST.artifacts['win32-x64'])).toBe(true);
  });

  it('uses the pinned x64 portable release through Windows ARM64 emulation', () => {
    const manager = createAlloSheetEngineManager({
      appDataDir: makeAppDataDir(),
      platform: 'win32',
      arch: 'arm64',
      extractArchive: async () => {},
    });
    expect(manager.status()).toMatchObject({
      installed: false,
      platformKey: 'win32-x64',
      version: '0.3.13',
    });
    expect(manager.manifest.artifact.archiveUrl).toContain('-win-x64.zip');
  });

  it('rejects unpinned, insecure, unsupported, and traversing manifest targets', () => {
    const payload = Buffer.from('manifest-validation');
    expect(() => validateManifest(makeManifest(payload, { archiveUrl: 'http://example.test/grist.zip' }), 'win32-x64'))
      .toThrow(/HTTPS/);
    expect(() => validateManifest(makeManifest(payload, { archiveSha256: '' }), 'win32-x64'))
      .toThrow(/pinned SHA-256/);
    expect(() => validateManifest(makeManifest(payload, { executablePath: '..\\outside.exe' }), 'win32-x64'))
      .toThrow(/unsafe path segment/);
    expect(() => validateManifest(makeManifest(payload, { archiveFormat: 'exe' }), 'win32-x64'))
      .toThrow(/portable ZIP/);
    expect(() => validateRelativeTarget('C:\\Windows\\system32\\cmd.exe', 'target'))
      .toThrow(/absolute/);
    expect(() => validateRelativeTarget('safe/../../outside', 'target'))
      .toThrow(/unsafe path segment/);
  });

  it('downloads, verifies, extracts, and starts the server entrypoint on random IPv4 loopback', async () => {
    const { appDataDir, calls, child, manager, payload } = makeHarness();
    const started = await manager.start();

    expect(started).toMatchObject({
      phase: 'running',
      installed: true,
      running: true,
      pid: child.pid,
      version: '9.8.7-test',
      platformKey: 'win32-x64',
      host: '127.0.0.1',
      port: 43123,
      baseUrl: 'http://127.0.0.1:43123',
      lastError: null,
    });
    expect(calls.download).toHaveLength(1);
    expect(calls.download[0]).toMatchObject({
      url: 'https://downloads.example.test/grist-desktop-9.8.7-test-win-x64.zip',
      expectedBytes: payload.length,
    });
    expect(calls.extract).toHaveLength(1);
    expect(calls.extract[0]).toMatchObject({ format: 'zip' });
    expect(() => calls.extract[0].resolveEntryPath('../escape.exe')).toThrow(/unsafe path segment/);

    expect(calls.spawn).toHaveLength(1);
    const launch = calls.spawn[0];
    expect(relative(appDataDir, launch.command)).not.toMatch(/^\.\./);
    expect(launch.command).toMatch(/Grist Desktop\.exe$/);
    expect(launch.args[0]).toMatch(/desktop[\\/]runtime[\\/]allosheet-grist-bootstrap\.cjs$/);
    expect(launch.options).toMatchObject({
      windowsHide: true,
      shell: false,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    expect(relative(appDataDir, launch.options.cwd)).not.toMatch(/^\.\./);
    expect(launch.options.env).toMatchObject({
      ELECTRON_RUN_AS_NODE: '1',
      PORT: '43123',
      GRIST_PORT: '43123',
      GRIST_HOST: '127.0.0.1',
      GRIST_SANDBOX_FLAVOR: 'pyodide',
      GRIST_DESKTOP_USE_UPDATE: 'false',
      GRIST_ALLOW_AUTOMATIC_VERSION_CHECKING: 'false',
      GRIST_TELEMETRY_LEVEL: 'off',
      GRIST_DESKTOP_AUTH: 'strict',
      GRIST_FORCE_LOGIN: 'true',
    });
    expect(launch.options.env.ALLOFLOW_GRIST_SERVER_ENTRYPOINT)
      .toMatch(/resources[\\/]app\.asar[\\/]core[\\/]_build[\\/]stubs[\\/]app[\\/]server[\\/]server\.js$/);
    expect(launch.options.env.GRIST_SESSION_SECRET).toMatch(/^[a-f0-9]{64}$/);
    expect(launch.options.env.GRIST_SESSION_COOKIE).toMatch(/^allosheet_[a-f0-9]{24}$/);
    expect(launch.options.env).not.toHaveProperty('SECRET_FROM_PARENT');
    expect(launch.options.env).not.toHaveProperty('NODE_OPTIONS');
    expect(launch.options.env).not.toHaveProperty('GRIST_IGNORE_SESSION');
    expect(launch.options.env).not.toHaveProperty('GRIST_FORWARD_AUTH_HEADER');
    expect(launch.options.env).not.toHaveProperty('GRIST_INCLUDE_CUSTOM_SCRIPT_URL');
    expect(launch.options.env.PATH).toBe('C:\\Windows\\System32');
    expect(launch.options.env.SYSTEMROOT).toBe('C:\\Windows');
    expect(manager.getPrivateAuth()).toMatchObject({
      origin: 'http://127.0.0.1:43123',
      electronKey: TEST_ELECTRON_KEY,
      sessionCookieName: launch.options.env.GRIST_SESSION_COOKIE,
    });
    expect(JSON.stringify(started)).not.toContain(TEST_ELECTRON_KEY);
    for (const key of ['GRIST_DATA_DIR', 'GRIST_USER_ROOT', 'GRIST_INST_DIR', 'TYPEORM_DATABASE']) {
      expect(relative(appDataDir, launch.options.env[key])).not.toMatch(/^\.\./);
    }
    expect(launch.options.env.NODE_PATH).toContain('resources');
    expect(launch.options.env.NODE_PATH).toContain('app.asar');

    child.stdout.write('server ready\n');
    child.stderr.write('bounded diagnostic\n');
    expect(manager.logs(10).logs.some((entry) => entry.line.includes('Managed Grist server is ready'))).toBe(true);

    const stopped = await manager.stop();
    expect(calls.terminate).toHaveLength(1);
    expect(stopped).toMatchObject({ phase: 'stopped', installed: true, running: false, port: null, baseUrl: null });
  });

  it('checks the pinned SHA-256 before invoking the extractor or process launcher', async () => {
    const payload = Buffer.from('tampered-download');
    const appDataDir = makeAppDataDir();
    const extractArchive = vi.fn();
    const spawnImpl = vi.fn();
    const manager = createAlloSheetEngineManager({
      appDataDir,
      platform: 'win32',
      arch: 'x64',
      manifest: makeManifest(Buffer.from('different-content-with-same-len').subarray(0, payload.length)),
      downloadArchive: async ({ destinationPath }) => writeFileSync(destinationPath, payload),
      extractArchive,
      spawnImpl,
      allocatePort: async () => 44001,
      healthProbe: async () => true,
    });

    await expect(manager.start()).rejects.toThrow(/SHA-256 integrity check/);
    expect(extractArchive).not.toHaveBeenCalled();
    expect(spawnImpl).not.toHaveBeenCalled();
    expect(manager.status()).toMatchObject({ phase: 'error', installed: false, running: false });

    const downloadsDir = manager.getPaths().downloadsDir;
    expect(readdirSync(downloadsDir).filter((name) => name.endsWith('.partial'))).toEqual([]);
  });

  it('reuses an installed verified version without another download or extraction', async () => {
    const first = makeHarness();
    await first.manager.start();
    await first.manager.stop();

    const secondChild = makeFakeChild(5252);
    const second = createAlloSheetEngineManager({
      appDataDir: first.appDataDir,
      platform: 'win32',
      arch: 'x64',
      manifest: makeManifest(first.payload),
      downloadArchive: vi.fn(async () => {
        throw new Error('download should not run');
      }),
      extractArchive: vi.fn(async () => {
        throw new Error('extract should not run');
      }),
      allocatePort: async () => 43124,
      spawnImpl: () => {
        queueMicrotask(() => secondChild.emit('message', {
          type: AUTH_MESSAGE_TYPE,
          version: 1,
          electronKey: TEST_ELECTRON_KEY,
        }));
        return secondChild;
      },
      healthProbe: async () => true,
      terminateProcess: async (target) => {
        target.killed = true;
        target.exitCode = 0;
        target.emit('exit', 0, null);
      },
    });

    await expect(second.start()).resolves.toMatchObject({ phase: 'running', installed: true, port: 43124 });
    await second.stop();
  });

  it('caches ASAR validation until a cheap file signature changes', async () => {
    const { manager } = makeHarness();
    await manager.start();
    const openSpy = vi.spyOn(nodeFs, 'openSync');
    try {
      for (let index = 0; index < 20; index += 1) {
        expect(manager.status().installed).toBe(true);
      }
      const asarOpensBeforeChange = openSpy.mock.calls.filter(([filePath]) =>
        String(filePath).endsWith('app.asar')
      );
      expect(asarOpensBeforeChange).toHaveLength(0);

      const asarPath = join(manager.getPaths().installDir, 'resources', 'app.asar');
      nodeFs.appendFileSync(asarPath, 'signature-change');
      expect(manager.status().installed).toBe(true);
      expect(openSpy.mock.calls.filter(([filePath]) =>
        String(filePath).endsWith('app.asar')
      )).toHaveLength(1);
      expect(manager.status().installed).toBe(true);
      expect(openSpy.mock.calls.filter(([filePath]) =>
        String(filePath).endsWith('app.asar')
      )).toHaveLength(1);
    } finally {
      openSpy.mockRestore();
      await manager.stop();
    }
  });

  it('requires HTTP 200 with a JSON array before declaring the Grist API ready', async () => {
    const healthResponses = [
      { status: 404, json: vi.fn(async () => []) },
      { status: 200, json: vi.fn(async () => ({ orgs: [] })) },
      { status: 200, json: vi.fn(async () => []) },
    ];
    let fetchImpl;
    const healthUrls = [];
    let rootRequests = 0;
    const payload = Buffer.from('strict-health-probe');
    const { manager } = makeHarness(payload, ({ calls }) => {
      fetchImpl = vi.fn(async (url) => {
        const parsed = new URL(String(url));
        if (parsed.pathname === '/') {
          rootRequests += 1;
          if (rootRequests === 1) {
            return makeAuthenticatedRootResponse('unrelated_cookie');
          }
          return makeAuthenticatedRootResponse(calls.spawn[0].options.env.GRIST_SESSION_COOKIE);
        }
        healthUrls.push(String(url));
        return healthResponses.shift();
      });
      return {
        healthProbe: undefined,
        fetchImpl,
        sleep: async () => {},
        startupTimeoutMs: 1000,
        probeIntervalMs: 10,
        probeTimeoutMs: 100,
        manifest: makeManifest(payload, { healthPath: '/api/orgs' }),
      };
    });

    await expect(manager.start()).resolves.toMatchObject({ phase: 'running', running: true });
    expect(fetchImpl).toHaveBeenCalledTimes(7);
    expect(rootRequests).toBe(4);
    expect(healthUrls).toEqual([
      'http://127.0.0.1:43123/api/orgs',
      'http://127.0.0.1:43123/api/orgs',
      'http://127.0.0.1:43123/api/orgs',
    ]);
    expect(healthResponses).toHaveLength(0);
    await manager.stop();
  });

  it('aborts a hung readiness request at the per-probe timeout and retries', async () => {
    let firstProbeAborted = false;
    let fetchImpl;
    let healthRequestCount = 0;
    const payload = Buffer.from('timed-health-probe');
    const { manager } = makeHarness(payload, ({ calls }) => {
      fetchImpl = vi.fn((url, options) => {
        if (new URL(String(url)).pathname === '/') {
          return Promise.resolve(
            makeAuthenticatedRootResponse(calls.spawn[0].options.env.GRIST_SESSION_COOKIE)
          );
        }
        healthRequestCount += 1;
        if (healthRequestCount === 1) {
          return new Promise((resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              firstProbeAborted = true;
              const error = new Error('probe aborted');
              error.name = 'AbortError';
              reject(error);
            }, { once: true });
          });
        }
        return Promise.resolve({ status: 200, json: async () => [] });
      });
      return {
        healthProbe: undefined,
        fetchImpl,
        sleep: async () => {},
        startupTimeoutMs: 1000,
        probeIntervalMs: 10,
        probeTimeoutMs: 15,
        manifest: makeManifest(payload, { healthPath: '/api/orgs' }),
      };
    });

    await expect(manager.start()).resolves.toMatchObject({ phase: 'running', running: true });
    expect(firstProbeAborted).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    await manager.stop();
  });

  it('waits for the managed child to exit after successful Windows taskkill', async () => {
    const { calls, child, manager } = makeHarness(
      Buffer.from('verified-windows-stop'),
      ({ calls: harnessCalls, child: managedChild }) => ({
        terminateProcess: undefined,
        terminationTimeoutMs: 50,
        spawnImpl(command, args, options) {
          harnessCalls.spawn.push({ command, args, options });
          if (command !== 'taskkill.exe') {
            queueMicrotask(() => managedChild.emit('message', {
              type: AUTH_MESSAGE_TYPE,
              version: 1,
              electronKey: TEST_ELECTRON_KEY,
            }));
            return managedChild;
          }
          const killer = new EventEmitter();
          killer.exitCode = null;
          killer.kill = vi.fn();
          queueMicrotask(() => {
            killer.exitCode = 0;
            killer.emit('exit', 0, null);
            managedChild.exitCode = 0;
            managedChild.emit('exit', 0, null);
          });
          return killer;
        },
      })
    );

    await manager.start();
    await expect(manager.stop()).resolves.toMatchObject({ phase: 'stopped', running: false });
    expect(child.exitCode).toBe(0);
    const taskkill = calls.spawn.find(({ command }) => command === 'taskkill.exe');
    expect(taskkill).toMatchObject({
      args: ['/PID', String(child.pid), '/T', '/F'],
      options: {
        windowsHide: true,
        shell: false,
        stdio: ['ignore', 'ignore', 'ignore'],
      },
    });
  });

  it('rejects shutdown when taskkill succeeds but the managed child remains alive', async () => {
    const { child, manager } = makeHarness(
      Buffer.from('unverified-windows-stop'),
      ({ calls, child: managedChild }) => ({
        terminateProcess: undefined,
        terminationTimeoutMs: 15,
        spawnImpl(command, args, options) {
          calls.spawn.push({ command, args, options });
          if (command !== 'taskkill.exe') {
            queueMicrotask(() => managedChild.emit('message', {
              type: AUTH_MESSAGE_TYPE,
              version: 1,
              electronKey: TEST_ELECTRON_KEY,
            }));
            return managedChild;
          }
          const killer = new EventEmitter();
          killer.exitCode = null;
          killer.kill = vi.fn();
          queueMicrotask(() => {
            killer.exitCode = 0;
            killer.emit('exit', 0, null);
          });
          return killer;
        },
      })
    );

    await manager.start();
    await expect(manager.stop()).rejects.toThrow(/did not exit after taskkill/);
    await expect(manager.start()).rejects.toThrow(/previous managed Grist process is still running/i);
    expect(child.killed).toBe(false);
    expect(manager.status()).toMatchObject({
      phase: 'error',
      lastError: expect.stringMatching(/did not exit after taskkill/),
    });
    expect(child.exitCode).toBeNull();
    child.exitCode = 0;
    child.emit('exit', 0, null);
  });

  it('rejects shutdown when Windows taskkill reports a failure', async () => {
    const { child, manager } = makeHarness(
      Buffer.from('failed-windows-taskkill'),
      ({ calls, child: managedChild }) => ({
        terminateProcess: undefined,
        terminationTimeoutMs: 15,
        spawnImpl(command, args, options) {
          calls.spawn.push({ command, args, options });
          if (command !== 'taskkill.exe') {
            queueMicrotask(() => managedChild.emit('message', {
              type: AUTH_MESSAGE_TYPE,
              version: 1,
              electronKey: TEST_ELECTRON_KEY,
            }));
            return managedChild;
          }
          const killer = new EventEmitter();
          killer.exitCode = null;
          killer.kill = vi.fn();
          queueMicrotask(() => {
            killer.exitCode = 5;
            killer.emit('exit', 5, null);
          });
          return killer;
        },
      })
    );

    await manager.start();
    await expect(manager.stop()).rejects.toThrow(/taskkill failed.*code 5/);
    expect(child.exitCode).toBeNull();
    child.exitCode = 0;
    child.emit('exit', 0, null);
  });

  it('requires an application-owned absolute directory and a safe external extractor', async () => {
    const payload = Buffer.from('extractor-required');
    expect(() => createAlloSheetEngineManager({
      appDataDir: 'relative-data',
      platform: 'win32',
      arch: 'x64',
      manifest: makeManifest(payload),
    })).toThrow(/absolute application-owned directory/);

    const manager = createAlloSheetEngineManager({
      appDataDir: makeAppDataDir(),
      platform: 'win32',
      arch: 'x64',
      manifest: makeManifest(payload),
      downloadArchive: async ({ destinationPath }) => writeFileSync(destinationPath, payload),
    });
    await expect(manager.start()).rejects.toThrow(/safe extractArchive implementation/);
  });

  it('allocates an ephemeral port exclusively on IPv4 loopback', async () => {
    const port = await allocateLoopbackPort();
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThanOrEqual(65535);
    await expect(allocateLoopbackPort({ host: '0.0.0.0' })).rejects.toThrow(/only on IPv4 loopback/);
  });
});
