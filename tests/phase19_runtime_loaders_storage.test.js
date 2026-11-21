import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

describe('Phase 19: Desktop Runtime, MCP Helpers, Browser Loaders & Storage Hardening', () => {
  it('allosheet-engine-manager.cjs: rejects IPv4-mapped IPv6 and trailing-dot loopback/metadata SSRF hosts', () => {
    const engineMgr = require(path.join(ROOT, 'desktop/runtime/allosheet-engine-manager.cjs'));
    const validate = engineMgr.validateArchiveDownloadUrl || engineMgr._testing?.validateArchiveDownloadUrl;
    if (typeof validate === 'function') {
      for (const bad of [
        'https://[::ffff:127.0.0.1]/grist.zip',
        'https://[::ffff:169.254.169.254]/grist.zip',
        'https://localhost./grist.zip',
        'https://metadata.google.internal./grist.zip',
      ]) {
        expect(() => validate(bad), `expected ${bad} to be rejected`).toThrow();
      }
      expect(() => validate('https://github.com/gristlabs/grist-desktop/releases/download/v1/grist.zip')).not.toThrow();
    }
    const src = fs.readFileSync(path.join(ROOT, 'desktop/runtime/allosheet-engine-manager.cjs'), 'utf8');
    expect(src).toContain("const { isPublicIp } = require('./web-source-fetch.cjs');");
    expect(src).toContain("replace(/\\.+$/, '')");
    expect(src).toContain("child.once('error', onError)");
  });

  it('allosheet-grist-bridge.cjs: rejects "." and ".." docId/tableId path traversal and bounds body reads', async () => {
    const { createAlloSheetGristBridge } = require(path.join(ROOT, 'desktop/runtime/allosheet-grist-bridge.cjs'));
    const bridge = createAlloSheetGristBridge({
      getEngineState: () => ({ baseUrl: 'http://127.0.0.1:8484', apiKey: 'test-key' }),
      fetchImpl: async () => { throw new Error('should not fetch on invalid identifier'); },
    });
    await expect(bridge.handleOperation({ operation: 'listTables', docId: '..' })).rejects.toMatchObject({ statusCode: 400, code: 'invalid-identifier' });
    await expect(bridge.handleOperation({ operation: 'listTables', docId: '.' })).rejects.toMatchObject({ statusCode: 400, code: 'invalid-identifier' });
    await expect(bridge.handleOperation({ operation: 'readRecords', docId: 'doc1', tableId: '..' })).rejects.toMatchObject({ statusCode: 400, code: 'invalid-identifier' });

    const src = fs.readFileSync(path.join(ROOT, 'desktop/runtime/allosheet-grist-bridge.cjs'), 'utf8');
    expect(src).toContain('await response.body.cancel()');
    expect(src).toContain('The managed spreadsheet session returned an invalid redirect.');
  });

  it('alloflow-desktop-runtime.cjs: blocks prototype liveSession.mode, 2-step binarySha256 bypass, prefix-collision cwd, and post-headers crash', () => {
    const rt = require(path.join(ROOT, 'desktop/runtime/alloflow-desktop-runtime.cjs'));
    expect(() => rt.sanitizeConfigPatch({ liveSession: { mode: 'constructor' } })).toThrow(/Unknown live session mode/);
    expect(() => rt.sanitizeConfigPatch({ liveSession: { mode: 'toString' } })).toThrow(/Unknown live session mode/);
    const status = rt.getLiveSessionStatus({ liveSession: { mode: 'constructor' } });
    expect(status.mode).not.toBe('constructor');

    const src = fs.readFileSync(path.join(ROOT, 'desktop/runtime/alloflow-desktop-runtime.cjs'), 'utf8');
    expect(src).toContain('if (!res || res.writableEnded || res.destroyed) return;');
    expect(src).toContain('const relLaunch = path.relative(REPO_ROOT, launch.cwd);');
    expect(src).toContain('const mergedPin = expectedDownloadSha256(merged.localEngine.binaryUrl');
    expect(src).toContain('async function fetchLoopbackProbe(');
    expect(src).toContain("up.on('error',");
    expect(src).toContain('await extractZip(zipPath, destDir);');
  });

  it('local-image-manager.cjs, organizer-reflections.cjs & allosheet-zip-extractor.cjs: prototype guards and close-event buffering', () => {
    const lim = require(path.join(ROOT, 'desktop/runtime/local-image-manager.cjs'));
    expect(() => lim.composePlan('constructor', {
      composeFile: path.resolve('docker-compose.yml'),
      envFile: path.resolve('.env'),
      projectName: 'alloflow-img',
    })).toThrow(/Unsupported image operation/);

    const orgSrc = fs.readFileSync(path.join(ROOT, 'desktop/runtime/organizer-reflections.cjs'), 'utf8');
    expect(orgSrc).toContain('Object.prototype.hasOwnProperty.call(entry.data.roster, auth.uid)');

    const zipSrc = fs.readFileSync(path.join(ROOT, 'desktop/runtime/allosheet-zip-extractor.cjs'), 'utf8');
    expect(zipSrc).toContain("child.once('close',");
    expect(zipSrc).not.toContain("child.once('exit',");
  });

  it('desktop/mcp helpers: explainDelivery resists prototype keys, validateRevisionChanges catches "", epub archive prevents double-close', () => {
    const ver = require(path.join(ROOT, 'desktop/mcp/remediation_verification.cjs'));
    const explained = ver.explainDelivery({
      taggedPdfError: 'tagged_pdf_delivery_unverified (constructor: bad)',
      verification: {
        equalAccess: {
          reviewFindings: [
            { id: '__proto__', description: 'Check item', nodes: 2 },
            { id: 'toString', description: 'Check other', nodes: 1 },
          ],
        },
        ai: {
          issues: [{ severity: 'constructor', issue: 'Test issue', location: 'p.1' }],
        },
      },
    });
    expect(Array.isArray(explained.items)).toBe(true);
    expect(Array.isArray(explained.needsAPerson)).toBe(true);
    expect(typeof explained.headline).toBe('string');

    const mcpSrc = fs.readFileSync(path.join(ROOT, 'desktop/mcp/alloflow-mcp-stdio.cjs'), 'utf8');
    expect(mcpSrc).toContain('if (Object.keys(changes.setDirectives).some(');

    const epubSrc = fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_epub_archive.cjs'), 'utf8');
    expect(epubSrc).toContain('fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0)');
    expect(epubSrc).toContain("path.join(path.resolve(parent), 'epub-expanded-')");
    expect(epubSrc).toContain('const closeHandle = () =>');

    const narSrc = fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_narration.cjs'), 'utf8');
    expect(narSrc).toContain('Object.prototype.hasOwnProperty.call(Planner.LABELS,langKey)');
  });

  it('piper_tts_loader.js, kokoro_tts_loader.js, phonics_g2p_loader.js & sre_loader.js: prototype guards and transient-error resilience', () => {
    // Piper
    const piperWin = { console: { log: () => {}, warn: () => {}, error: () => {} } };
    piperWin.window = piperWin; piperWin.self = piperWin; piperWin.globalThis = piperWin;
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'piper_tts_loader.js'), 'utf8'), {
      window: piperWin, self: piperWin, globalThis: piperWin, console: piperWin.console,
      URL, AbortController, setTimeout, clearTimeout, Promise, Set, Map,
    });
    expect(piperWin._piperTTS.supportsLanguage('constructor')).toBe(false);
    expect(piperWin._piperTTS.supportsLanguage('toString')).toBe(false);
    expect(piperWin._piperTTS.supportsLanguage('es')).toBe(true);
    const piperSrc = fs.readFileSync(path.join(ROOT, 'piper_tts_loader.js'), 'utf8');
    expect(piperSrc).toContain("return (res.status === 404 || res.status === 410) ? 'invalid' : 'transient'");
    expect(piperSrc).toContain("if (configStatus === 'invalid')");

    // Kokoro
    const kokoroSrc = fs.readFileSync(path.join(ROOT, 'kokoro_tts_loader.js'), 'utf8');
    expect(kokoroSrc).toContain('Object.prototype.hasOwnProperty.call(GEMINI_TO_KOKORO, key)');

    // Phonics G2P
    const g2pWin = { console: { log: () => {}, warn: () => {}, error: () => {} } };
    g2pWin.window = g2pWin; g2pWin.self = g2pWin; g2pWin.globalThis = g2pWin;
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'phonics_g2p_loader.js'), 'utf8'), {
      window: g2pWin, self: g2pWin, globalThis: g2pWin, console: g2pWin.console,
      URL, setTimeout, clearTimeout, Promise,
    });
    expect(g2pWin.AlloPhonics.voiceFor('constructor')).toBeNull();
    expect(g2pWin.AlloPhonics.voiceFor('toString-US')).toBeNull();
    expect(g2pWin.AlloPhonics.voiceFor('es')).toBeTruthy();

    // SRE
    const sreSrc = fs.readFileSync(path.join(ROOT, 'sre_loader.js'), 'utf8');
    expect(sreSrc).toContain('Object.prototype.hasOwnProperty.call(LANG_NAME_TO_LOCALE, name)');
    expect(sreSrc).toContain('Object.prototype.hasOwnProperty.call(ALLOWED_MATHML_TAGS, tag)');
    expect(sreSrc).toContain('Object.prototype.hasOwnProperty.call(ALLOWED_MATHML_ATTRS, name)');
  });

  it('allo_device_storage_module.js: memoryBackend never creates phantom "undefined" namespace on estimate/namespaces/get/list', async () => {
    const win = {
      console: { log: () => {}, warn: () => {}, error: () => {} },
      location: { origin: 'null', protocol: 'about:', href: 'about:blank' },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    win.window = win; win.self = win; win.globalThis = win;
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'allo_device_storage_module.js'), 'utf8'), {
      window: win, self: win, globalThis: win, console: win.console,
      URL, setTimeout, clearTimeout, Promise, Object, Array, JSON, Date, Error,
    });
    const api = win.alloDeviceStorage;
    expect(api).toBeTruthy();
    await api.useMemory();
    await api.estimate();
    expect(await api.get('nonexistent_ns', 'k1')).toBeNull();
    expect(await api.list('nonexistent_ns')).toEqual([]);
    const listBefore = await api.namespaces();
    const namesBefore = listBefore.map((x) => (typeof x === 'string' ? x : x.ns));
    expect(namesBefore).not.toContain('undefined');
    expect(namesBefore).not.toContain('nonexistent_ns');
    await api.set('real_ns', 'k1', { ok: true });
    const listAfter = await api.namespaces();
    const namesAfter = listAfter.map((x) => (typeof x === 'string' ? x : x.ns));
    expect(namesAfter).toEqual(['real_ns']);
  });

  it('sd_turbo, liblouis, mathlive, pyodide, packets_voice_engine, word_sounds_take_home & piper_server.py: verified hardening & 4-way/3-host parity', () => {
    expect(fs.readFileSync(path.join(ROOT, 'sd_turbo_loader.js'), 'utf8')).toContain('if (cachedBuf.byteLength > MAX_MODEL_BYTES)');
    expect(fs.readFileSync(path.join(ROOT, 'liblouis_braille_loader.js'), 'utf8')).toContain('timed out loading ');
    expect(fs.readFileSync(path.join(ROOT, 'mathlive_loader.js'), 'utf8')).toContain('Could not read this equation right now.');
    expect(fs.readFileSync(path.join(ROOT, 'pyodide_runtime_module.js'), 'utf8')).toContain('_pyodide = py;');
    const pve = fs.readFileSync(path.join(ROOT, 'packets_voice_engine.js'), 'utf8');
    expect(Buffer.byteLength(pve, 'utf8')).toBeLessThan(10000);
    expect(pve).not.toMatch(/https?:\/\//i);
    expect(pve).toContain('function fetchCatalog()');
    expect(fs.readFileSync(path.join(ROOT, 'word_sounds_take_home_loader.js'), 'utf8')).toContain('if (r && r.ok === false) throw new Error');
    expect(fs.readFileSync(path.join(ROOT, 'tts-server/piper_server.py'), 'utf8')).toContain('with _get_voice_lock(voice_name):');

    // 4-way mirror + 3-host SRI parity
    const manifestMod = require(path.join(ROOT, 'dev-tools/build_browser_delivery_manifest.cjs'));
    const hostPaths = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
    const manifests = hostPaths.map((p) => manifestMod.readEmbeddedManifest(fs.readFileSync(path.join(ROOT, p), 'utf8')));
    expect(manifests[0].releaseId).toBe(manifests[1].releaseId);
    expect(manifests[1].releaseId).toBe(manifests[2].releaseId);

    const webLoaders = [
      'piper_tts_loader.js', 'kokoro_tts_loader.js', 'sd_turbo_loader.js', 'phonics_g2p_loader.js',
      'sre_loader.js', 'liblouis_braille_loader.js', 'mathlive_loader.js', 'pyodide_runtime_module.js',
      'packets_voice_engine.js', 'word_sounds_take_home_loader.js', 'allo_device_storage_module.js',
    ];
    const mirrorRoots = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];
    for (const rel of webLoaders) {
      const rootBuf = fs.readFileSync(path.join(ROOT, rel));
      for (const mr of mirrorRoots) {
        const dest = path.join(ROOT, mr, rel);
        if (fs.existsSync(dest)) {
          expect(fs.readFileSync(dest).equals(rootBuf), `${mr}/${rel} mismatch`).toBe(true);
        }
      }
      if (manifests[0].assets[rel]) {
        const expectedSri = 'sha384-' + crypto.createHash('sha384').update(rootBuf).digest('base64');
        for (let i = 0; i < manifests.length; i++) {
          expect(manifests[i].assets[rel].integrity).toBe(expectedSri);
          expect(manifests[i].assets[rel].bytes).toBe(rootBuf.length);
        }
      }
    }
  });
});
