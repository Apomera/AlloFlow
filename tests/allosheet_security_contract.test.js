import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const require = createRequire(import.meta.url);

const hostBridge = read('allo_sheet/host_bridge.js');
const companion = read('allo_sheet/allo_sheet.js');
const html = read('allo_sheet/allo_sheet.html');
const runtime = read('desktop/runtime/alloflow-desktop-runtime.cjs');
const electron = read('desktop/electron/main.cjs');
const build = read('build.js');
const engineManager = read('desktop/runtime/allosheet-engine-manager.cjs');
const gristBridge = read('desktop/runtime/allosheet-grist-bridge.cjs');
const gristBootstrap = read('desktop/runtime/allosheet-grist-bootstrap.cjs');
const requestAuth = read('desktop/electron/allosheet-request-auth.cjs');
const allosheetReadme = read('allo_sheet/README.md');
const dockerReadme = read('docker/allosheet-grist/README.md');
const electronBuilder = JSON.parse(read('desktop/electron-builder.json'));
const engineContract = require(path.join(
  root,
  'desktop/runtime/allosheet-engine-manager.cjs',
));

describe('AlloSheet security and deployment contracts', () => {
  it('binds bridge messages to source, origin, protocol version, and a random capability', () => {
    expect(hostBridge).toContain('event.source !== popup');
    expect(hostBridge).toContain('event.origin !== pageOrigin');
    expect(hostBridge).toContain('data.version !== 1');
    expect(hostBridge).toContain('data.bridgeToken !== bridgeToken');
    expect(hostBridge).toContain('window.crypto.getRandomValues');
    expect(companion).toContain('event.source !== window.opener');
    expect(companion).toContain('event.origin !== state.hostOrigin');
    expect(companion).toContain('data.bridgeToken !== state.bridgeToken');
    expect(companion).not.toContain("state.hostOrigin || '*'");
    expect(hostBridge).not.toContain("pageOrigin : '*'");
  });

  it('rejects forged bridge handshakes in executable behavior', () => {
    let messageListener;
    let openedUrl = '';
    const launcher = {
      focus: vi.fn(),
    };
    const popup = {
      closed: false,
      focus: vi.fn(),
      postMessage: vi.fn(),
    };
    const fakeWindow = {
      location: new URL('http://localhost:32173/app/'),
      document: {
        activeElement: launcher,
        contains: (element) => element === launcher,
      },
      _isDesktopBundledApp: true,
      crypto: {
        getRandomValues(bytes) {
          bytes.fill(7);
          return bytes;
        },
      },
      addEventListener(type, listener) {
        if (type === 'message') messageListener = listener;
      },
      open(url) {
        openedUrl = url;
        return popup;
      },
      alert: vi.fn(),
      focus: vi.fn(),
      setTimeout: (callback) => { callback(); return 1; },
      callGemini: vi.fn(),
    };
    const load = new Function('window', `${hostBridge}\nreturn window.AlloSheetHostBridge;`);
    const bridge = load(fakeWindow);
    bridge.open({ theme: 'contrast' });

    const launch = new URL(openedUrl);
    const bootstrap = new URLSearchParams(launch.hash.slice(1));
    const token = bootstrap.get('bridgeToken');
    expect(launch.pathname).toBe('/app/allo_sheet/allo_sheet.html');
    expect(launch.origin).toBe('http://127.0.0.1:32173');
    expect(launch.searchParams.get('v')).toBe('4');
    expect(launch.searchParams.get('theme')).toBe('contrast');
    expect(token).toMatch(/^[a-f0-9]{32}$/);
    expect(bootstrap.get('hostOrigin')).toBe('http://localhost:32173');

    messageListener({
      source: popup,
      origin: launch.origin,
      data: { type: 'allosheet-hello', version: 1, bridgeToken: '0'.repeat(32) },
    });
    messageListener({
      source: popup,
      origin: 'https://attacker.example',
      data: { type: 'allosheet-hello', version: 1, bridgeToken: token },
    });
    expect(popup.postMessage).not.toHaveBeenCalled();

    messageListener({
      source: popup,
      origin: launch.origin,
      data: { type: 'allosheet-hello', version: 1, bridgeToken: token },
    });
    expect(popup.postMessage).toHaveBeenCalledTimes(1);
    expect(popup.postMessage.mock.calls[0][0]).toMatchObject({
      type: 'allosheet-ready',
      version: 1,
      bridgeToken: token,
    });
    expect(popup.postMessage.mock.calls[0][1]).toBe(launch.origin);

    messageListener({
      source: popup,
      origin: launch.origin,
      data: {
        type: 'allosheet-closed',
        version: 1,
        bridgeToken: token,
      },
    });
    expect(fakeWindow.focus).toHaveBeenCalledTimes(1);
    expect(launcher.focus).toHaveBeenCalledTimes(1);
  });

  it('keeps credentials server-side and exposes only fixed same-origin routes', () => {
    expect(runtime).toContain("'/api/allosheet/config'");
    expect(runtime).toContain("'/api/allosheet/grist'");
    expect(runtime).toContain('readRequestJson(req, 512 * 1024)');
    expect(runtime).toContain('bootstrapSession: true');
    expect(runtime).toContain('await alloSheetGristBridge.ensureManagedWorkbook()');
    expect(runtime).toContain('docId: workbook.docId');
    expect(runtime).not.toContain('allowUnauthenticated: true');
    expect(gristBridge).toContain('Cookie: cookie');
    expect(gristBridge).toContain('next.origin !== origin');
    expect(gristBridge).toContain('Unauthenticated managed Grist access is not supported.');
    expect(gristBridge).toContain('editorUrl.origin !== baseUrl.origin');
    expect(companion).not.toMatch(/Authorization\s*:|Bearer\s+/);
    expect(hostBridge).not.toMatch(/Authorization\s*:|Bearer\s+/);
    expect(html).not.toMatch(/name=["']apiKey["']/i);
  });

  it('allows only the exact tokenized AlloSheet child in packaged Electron', () => {
    expect(electron).toContain("parsed.pathname !== '/app/allo_sheet/allo_sheet.html'");
    expect(electron).toContain("parsed.searchParams.get('v') !== '4'");
    expect(electron).toContain("if (!/^[a-f0-9]{32}$/i.test(token)) return false;");
    expect(electron).toContain('if (isAllowedAlloSheetPopup(url))');
    expect(electron).toContain('contextIsolation: true');
    expect(electron).toContain('nodeIntegration: false');
    expect(electron).toContain('nodeIntegrationInSubFrames: false');
    expect(electron).toContain('sandbox: true');
    expect(electron).toContain("childWindow.webContents.on('will-navigate'");
    expect(electron).toContain('devTools: false');
    expect(electron).toContain('isAllowedPrivateApiRequest(details.url, privateApiOrigins)');
    expect(electron).toContain('isTrustedAlloSheetGristFrameRequest(');
    expect(electron).toContain("'https://127.0.0.1/*'");
    expect(electron).toContain("'wss://127.0.0.1/*'");
    expect(electron.match(/onBeforeSendHeaders/g)).toHaveLength(1);
    expect(requestAuth).toContain('target.pathname.startsWith(\'/api/\')');
    expect(requestAuth).toContain("resourceType === 'subFrame'");
    expect(hostBridge).toContain("'_blank'");
    expect(electron).toContain('app.requestSingleInstanceLock()');
    expect(electron).toContain("app.on('second-instance', focusMainWindow)");
    expect(electron).toContain('if (!hasSingleInstanceLock) return;');
    expect(electron).toContain('if (mainWindow.isMinimized()) mainWindow.restore()');
  });

  it('ships the companion folder and uses only external page scripts', () => {
    expect(build).toMatch(/COMPANION_ASSET_DIRS\s*=\s*\[[\s\S]*'allo_sheet'/);
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(Array.from(document.querySelectorAll('script'))).toHaveLength(2);
    expect(Array.from(document.querySelectorAll('script')).every((script) => Boolean(script.src))).toBe(true);
    expect(Array.from(document.querySelectorAll('script')).every((script) => script.src.includes('?v=4'))).toBe(true);
    expect(document.querySelector('link[rel="stylesheet"]').href).toContain('?v=4');
    expect(document.querySelector('iframe').getAttribute('sandbox')).toContain('allow-scripts');
    expect(document.querySelector('[role="tablist"]')).not.toBeNull();
  });

  it('pins, verifies, and isolates the managed local Grist sidecar', () => {
    const manifest = JSON.stringify(engineContract.DEFAULT_GRIST_DESKTOP_MANIFEST);
    expect(manifest).toContain('0.3.13');
    expect(manifest).toContain('Apache-2.0');
    expect(manifest).toContain('https://github.com/gristlabs/grist-desktop');
    expect(manifest).toContain('grist-desktop-0.3.13-win-x64.zip');
    expect(manifest).toContain('c85f49625cfd355b9c445a77bc5e4df6a8a6ea2e4c54597ccca3faa322a4b1cc');
    expect(() => engineContract.validateRelativeTarget('../escape.zip')).toThrow(/unsafe|relative/);
    const insecureManifest = JSON.parse(JSON.stringify(
      engineContract.DEFAULT_GRIST_DESKTOP_MANIFEST,
    ));
    insecureManifest.artifacts['win32-x64'].archiveUrl = 'http://downloads.example/grist.zip';
    expect(() => engineContract.validateManifest(insecureManifest, 'win32-x64'))
      .toThrow(/HTTPS/);
    expect(engineManager).toMatch(/createHash\(['"]sha256['"]\)/);
    expect(engineManager).toContain('GRIST_HOST');
    expect(engineManager).toContain('127.0.0.1');
    expect(engineManager).toContain('GRIST_SANDBOX_FLAVOR');
    expect(engineManager).toContain('pyodide');
    expect(engineManager).toContain('GRIST_DESKTOP_USE_UPDATE');
    expect(engineManager).toContain('GRIST_ALLOW_AUTOMATIC_VERSION_CHECKING');
    expect(engineManager).toContain('GRIST_TELEMETRY_LEVEL');
    expect(engineManager).toContain("GRIST_DESKTOP_AUTH: 'strict'");
    expect(engineManager).not.toContain("GRIST_DESKTOP_AUTH: 'none'");
    expect(engineManager).toContain('GRIST_SESSION_SECRET');
    expect(engineManager).toContain('GRIST_SESSION_COOKIE');
    expect(engineManager).toContain('selectChildEnvironment(baseEnv)');
    expect(engineManager).not.toContain('...baseEnv');
    expect(engineManager).toContain("stdio: ['ignore', 'pipe', 'pipe', 'ipc']");
    expect(engineManager).toContain('allosheet-grist-bootstrap.cjs');
    expect(gristBootstrap).toContain('ElectronLoginSystem.instance');
    expect(gristBootstrap).toContain('process.send({');
    expect(gristBootstrap).toContain("process.once('disconnect'");
    expect(gristBootstrap).not.toContain('process.env.ELECTRON_KEY');
    expect(engineManager).toContain('windowsHide: true');
    expect(engineManager).toContain('shell: false');
    expect(engineManager).toContain('isSymbolicLink()');
    expect(runtime).toMatch(/['"]\/api\/allosheet\/engine\/status['"]/);
    expect(runtime).toMatch(/['"]\/api\/allosheet\/engine\/start['"]/);
  });

  it('documents first-use local mode without assuming a packaged Grist binary', () => {
    expect(allosheetReadme).toContain('Default: local popup, no Docker');
    expect(allosheetReadme).toContain('Grist Desktop v0.3.13');
    expect(allosheetReadme).toContain('expected SHA-256 digest');
    expect(allosheetReadme).toContain('Windows import acceptance check');
    expect(dockerReadme).toMatch(/not required for the\s+normal AlloSheet desktop/);
    expect(electronBuilder.extraResources).toContainEqual({
      from: '../allo_sheet/THIRD_PARTY_NOTICES.md',
      to: 'ALLOSHEET_THIRD_PARTY_NOTICES.md',
    });
    const packagedGristBinaries = electronBuilder.extraResources.filter((entry) =>
      /grist-desktop.*\.(?:zip|exe|dmg|appimage)$/i.test(String(entry.from || '')),
    );
    expect(packagedGristBinaries).toEqual([]);
  });

  it('retains the attributed pinned Docker recipe as an optional server deployment', () => {
    const notices = read('allo_sheet/THIRD_PARTY_NOTICES.md');
    const compose = read('docker/allosheet-grist/docker-compose.yml');
    expect(notices).toContain('Grist Desktop');
    expect(notices).toContain('Version: 0.3.13');
    expect(notices).toContain('Copyright 2014-2022 Grist Labs Inc.');
    expect(notices).toContain('Apache License, Version 2.0');
    expect(dockerReadme).toContain('optional deployment recipe');
    expect(compose).toContain('gristlabs/grist-oss:1.7.13');
    expect(compose).toContain('127.0.0.1:8484:8484');
    expect(compose).toContain('GRIST_SANDBOX_FLAVOR: "gvisor"');
  });
});
