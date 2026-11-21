import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(process.cwd());
const DESKTOP_PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop', 'package.json'), 'utf8'));

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha512Base64(buf) {
  return crypto.createHash('sha512').update(buf).digest('base64');
}

describe('Phase 22 — Track 1: Desktop Packaging & Verification Scripts Hardening', () => {
  it('verify-desktop-artifacts rejects reversed-key and flow-syntax YAML hash bypasses and directory artifacts', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-p22-verify-'));
    try {
      const ver = DESKTOP_PKG.version;
      const exes = [
        `AlloFlow-Desktop-${ver}-setup.exe`,
        `AlloFlow-Desktop-${ver}-x64-setup.exe`,
        `AlloFlow-Desktop-${ver}-arm64-setup.exe`,
      ];
      const exeBufs = exes.map((_, idx) => Buffer.alloc(1024 * 1024 + 64 + idx, 0x41 + idx));
      const validHashes = exeBufs.map((b) => sha512Base64(b));

      const shaLines = [];
      exes.forEach((name, idx) => {
        fs.writeFileSync(path.join(tmp, name), exeBufs[idx]);
        shaLines.push(`${crypto.createHash('sha256').update(exeBufs[idx]).digest('hex')}  ${name}`);
      });
      fs.writeFileSync(path.join(tmp, 'SHA256SUMS-windows.txt'), `${shaLines.join('\n')}\n`);

      // 1) Reversed key order (- sha512 before url) with a BAD hash must be detected and rejected
      const reversedYaml = [
        `version: ${ver}`,
        'files:',
        ...exes.flatMap((name, idx) => [
          `  - sha512: ${idx === 0 ? 'AAAA_BAD_HASH_AAAA' : validHashes[idx]}`,
          `    url: ${name}`,
          `    size: ${exeBufs[idx].length}`,
        ]),
        `path: ${exes[0]}`,
        `sha512: ${validHashes[0]}`,
      ].join('\n');
      fs.writeFileSync(path.join(tmp, 'latest.yml'), reversedYaml);

      const resReversed = spawnSync(
        process.execPath,
        [path.join(ROOT, 'desktop', 'scripts', 'verify-desktop-artifacts.cjs'), '--platform=win'],
        { env: { ...process.env, ALLOFLOW_DESKTOP_DIST_DIR: tmp, ALLOFLOW_UPDATE_CHANNEL: 'latest' }, encoding: 'utf8' }
      );
      expect(resReversed.status).not.toBe(0);
      expect(resReversed.stderr).toMatch(/wrong or modified artifact/i);

      // 2) Flow-style YAML mapping with a BAD hash must also be detected and rejected
      const flowItems = exes.map((name, idx) =>
        `{ url: "${name}", sha512: "${idx === 1 ? 'BBBB_BAD_FLOW_HASH' : validHashes[idx]}", size: ${exeBufs[idx].length} }`
      ).join(', ');
      const flowYaml = [
        `version: ${ver}`,
        `files: [${flowItems}]`,
        `path: ${exes[0]}`,
        `sha512: ${validHashes[0]}`,
      ].join('\n');
      fs.writeFileSync(path.join(tmp, 'latest.yml'), flowYaml);

      const resFlow = spawnSync(
        process.execPath,
        [path.join(ROOT, 'desktop', 'scripts', 'verify-desktop-artifacts.cjs'), '--platform=win'],
        { env: { ...process.env, ALLOFLOW_DESKTOP_DIST_DIR: tmp, ALLOFLOW_UPDATE_CHANNEL: 'latest' }, encoding: 'utf8' }
      );
      expect(resFlow.status).not.toBe(0);
      expect(resFlow.stderr).toMatch(/wrong or modified artifact/i);

      // 3) Valid YAML passes when all files are regular files, fails if an artifact is replaced with a directory
      const validYaml = [
        `version: ${ver}`,
        'files:',
        ...exes.flatMap((name, idx) => [
          `  - url: ${name}`,
          `    sha512: ${validHashes[idx]}`,
          `    size: ${exeBufs[idx].length}`,
        ]),
        `path: ${exes[0]}`,
        `sha512: ${validHashes[0]}`,
      ].join('\n');
      fs.writeFileSync(path.join(tmp, 'latest.yml'), validYaml);

      const resValid = spawnSync(
        process.execPath,
        [path.join(ROOT, 'desktop', 'scripts', 'verify-desktop-artifacts.cjs'), '--platform=win'],
        { env: { ...process.env, ALLOFLOW_DESKTOP_DIST_DIR: tmp, ALLOFLOW_UPDATE_CHANNEL: 'latest' }, encoding: 'utf8' }
      );
      expect(resValid.status).toBe(0);

      fs.rmSync(path.join(tmp, 'SHA256SUMS-windows.txt'));
      fs.mkdirSync(path.join(tmp, 'SHA256SUMS-windows.txt'));
      const resDirManifest = spawnSync(
        process.execPath,
        [path.join(ROOT, 'desktop', 'scripts', 'verify-desktop-artifacts.cjs'), '--platform=win'],
        { env: { ...process.env, ALLOFLOW_DESKTOP_DIST_DIR: tmp, ALLOFLOW_UPDATE_CHANNEL: 'latest' }, encoding: 'utf8' }
      );
      expect(resDirManifest.status).not.toBe(0);
      expect(resDirManifest.stderr).toMatch(/SHA256SUMS-windows\.txt/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('build-edition rejects prototype keys (constructor / __proto__) and never uses execSync', () => {
    const scriptPath = path.join(ROOT, 'desktop', 'scripts', 'build-edition.cjs');
    const src = fs.readFileSync(scriptPath, 'utf8');
    expect(src).not.toMatch(/\bexecSync\b/);
    expect(src).toContain('spawnSync');
    expect(src).toContain('os.tmpdir()');

    for (const badArg of [['constructor', 'win-x64'], ['__proto__', 'win-x64'], ['desktop', 'constructor'], ['desktop', 'toString']]) {
      const res = spawnSync(process.execPath, [scriptPath, ...badArg], { encoding: 'utf8' });
      expect(res.status).toBe(1);
      expect(res.stderr).toMatch(/Unknown (edition|target)/);
    }
  });

  it('build-desktop-web, electron-builder.json, check-desktop-app-build, verify-packaged-layout, package-windows-safe, and smoke-electron-ui retain Phase 22 hardening invariants', () => {
    const buildWebSrc = fs.readFileSync(path.join(ROOT, 'desktop', 'scripts', 'build-desktop-web.cjs'), 'utf8');
    expect(buildWebSrc).toMatch(/isSymbolicLink\(\)/);
    expect(buildWebSrc).toContain("'.mjs'");
    expect(buildWebSrc).toContain("'.cjs'");
    expect(buildWebSrc).toMatch(/\/\^REACT_APP_\/i\.test/);

    const builderJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop', 'electron-builder.json'), 'utf8'));
    expect(builderJson.files).toContain('!.app-build-stage-*/**');
    expect(builderJson.files).toContain('!electron-builder.*.effective.json');

    const checkAppSrc = fs.readFileSync(path.join(ROOT, 'desktop', 'scripts', 'check-desktop-app-build.cjs'), 'utf8');
    expect(checkAppSrc).toContain('assertRegularArtifactInsideRoot');
    expect(checkAppSrc).toContain('rejectSymlink');

    const layoutSrc = fs.readFileSync(path.join(ROOT, 'desktop', 'scripts', 'verify-packaged-layout.cjs'), 'utf8');
    expect(layoutSrc).toContain('--arch');
    expect(layoutSrc).toMatch(/isSymbolicLink\(\)/);

    const winSafeSrc = fs.readFileSync(path.join(ROOT, 'desktop', 'scripts', 'package-windows-safe.cjs'), 'utf8');
    expect(winSafeSrc).toContain('Atomics.wait');
    expect(winSafeSrc).toContain('publish');
    expect(winSafeSrc).toContain('--arch');

    const smokeSrc = fs.readFileSync(path.join(ROOT, 'desktop', 'scripts', 'smoke-electron-ui.cjs'), 'utf8');
    expect(smokeSrc).toContain('ELECTRON_RUN_AS_NODE');
    expect(smokeSrc).toContain('SIGKILL');
  });
});

describe('Phase 22 — Track 2: Standalone Companion Apps Hardening & 4-Way Mirror Parity', () => {
  const MIRRORED_COMPANIONS = [
    'circuit_shelf/circuit_shelf.html',
    'molecule_shelf/molecule_shelf.html',
    'sim_shelf/sim_shelf.html',
    'access_lens/access_lens.html',
    'alphafold_explorer/alphafold_explorer.html',
    'whiteboard/whiteboard.html',
    'it_coach/it_coach.html',
    'zoom_gallery/zoom_gallery.html',
    'text_inquiry/text_inquiry.html',
    'data_lab/data_lab.html',
    'data_lab/tutor_plugin.html',
    'allo_sheet/host_bridge.js',
    'allo_sheet/transfer_adapter.js',
    'allo_sheet/allo_sheet_adapter.js',
    'allo_sheet/allo_sheet_analysis.js',
    'allo_sheet/allo_sheet.js',
    'video_studio/video_studio.html',
    'video_studio_module.js',
    'music_studio/open_groove_module.js',
  ];

  it('keeps all 19 hardened companion deliverables SHA-256 identical across all 3 desktop mirrors', () => {
    const mirrorRoots = [
      path.join(ROOT, 'desktop', 'web-app', 'public'),
      path.join(ROOT, 'desktop', 'web-app', 'build'),
      path.join(ROOT, 'desktop', 'app-build'),
    ];
    for (const rel of MIRRORED_COMPANIONS) {
      const rootHash = sha256File(path.join(ROOT, rel));
      for (const mRoot of mirrorRoots) {
        const dest = path.join(mRoot, rel);
        expect(fs.existsSync(dest), `Missing mirror ${dest}`).toBe(true);
        expect(sha256File(dest), `Mirror drift in ${dest}`).toBe(rootHash);
      }
    }
  });

  it('allo_sheet modules use null-prototype lookup tables and reject prototype keys safely', () => {
    const ctx = {
      addEventListener() {},
      removeEventListener() {},
      location: { origin: 'https://alloflow.net', href: 'https://alloflow.net/allo_sheet/' },
      console,
    };
    ctx.window = ctx;
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    for (const file of ['allo_sheet/host_bridge.js', 'allo_sheet/transfer_adapter.js', 'allo_sheet/allo_sheet_adapter.js', 'allo_sheet/allo_sheet_analysis.js']) {
      vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
    }
    const transfer = ctx.AlloSheetTransferAdapter;
    const analysis = ctx.AlloSheetAnalysis;
    // Prototype-named calculation/filter operators must not pass truthiness checks
    expect(() => analysis.normalizeSpec(
      { groupColumn: 'a', measureColumn: 'b', calculation: 'toString' },
      ['a', 'b'],
      { a: 'text', b: 'number' }
    )).toThrow(/Choose a supported calculation/);
    expect(() => analysis.normalizeSpec(
      { groupColumn: 'a', filterColumn: 'a', filterOperator: 'toString', calculation: 'count' },
      ['a', 'b'],
      { a: 'text', b: 'number' }
    )).toThrow(/Choose a supported filter condition/);
    // Blocked keys (__proto__, constructor, prototype) are rejected as column IDs,
    // while benign key 'toString' is allowed as an ID but rejected as a column type!
    expect(() => transfer.column('__proto__', 'Evil', 'text')).toThrow();
    expect(() => transfer.column('constructor', 'Evil2', 'text')).toThrow();
    expect(() => transfer.column('prototype', 'Evil3', 'text')).toThrow();
    const fallbackCol = transfer.column('toString', 'ToString', 'toString');
    expect(fallbackCol.key).toBe('toString');
    expect(fallbackCol.type).toBe('text');

    // allo_sheet.js rejects pendingAgent promises on pairing expiry
    const sheetSrc = fs.readFileSync(path.join(ROOT, 'allo_sheet', 'allo_sheet.js'), 'utf8');
    expect(sheetSrc).toMatch(/allosheet-pairing-expired[\s\S]{0,600}state\.pendingAgent = null;/);
    // allo_sheet_adapter.js enforces an AbortController timeout in GristRestAdapter._request
    const adapterSrc = fs.readFileSync(path.join(ROOT, 'allo_sheet', 'allo_sheet_adapter.js'), 'utf8');
    expect(adapterSrc).toContain('AbortController');
  });

  it('data_lab tutor_plugin dsName rejects __proto__/constructor/prototype and data_lab.html bounds delimited parsing', () => {
    const tutorHtml = fs.readFileSync(path.join(ROOT, 'data_lab', 'tutor_plugin.html'), 'utf8');
    const dsSlice = tutorHtml.match(/function dsText\([\s\S]*?function dsName\([\s\S]*?\n\s*\}/);
    expect(dsSlice).toBeTruthy();
    const dsName = new Function(`${dsSlice[0]}; return dsName;`)();
    expect(dsName('__proto__')).toBe('Field');
    expect(dsName('constructor')).toBe('Field');
    expect(dsName('prototype')).toBe('Field');
    expect(dsName('Score')).toBe('Score');

    const dlHtml = fs.readFileSync(path.join(ROOT, 'data_lab', 'data_lab.html'), 'utf8');
    expect(dlHtml).toContain('2 * 1024 * 1024');
    expect(dlHtml).toContain("event.origin !== 'null'");
  });

  it('companion apps harden origin validation, timeouts, prototype maps, CSP, and media cleanup', () => {
    const accessLens = fs.readFileSync(path.join(ROOT, 'access_lens', 'access_lens.html'), 'utf8');
    expect(accessLens).toContain('if (!origin) return false;');
    expect(accessLens).toContain('cameraRequestSeq');

    const itCoach = fs.readFileSync(path.join(ROOT, 'it_coach', 'it_coach.html'), 'utf8');
    expect(itCoach).toContain('http-equiv="Content-Security-Policy"');
    expect(itCoach).toContain('voiceRestartTimer');
    expect(itCoach).toContain('if (bridgeDeclined) return;');

    const zoomGallery = fs.readFileSync(path.join(ROOT, 'zoom_gallery', 'zoom_gallery.html'), 'utf8');
    expect(zoomGallery).toContain('http-equiv="Content-Security-Policy"');
    expect(zoomGallery).toContain('removeHandler');
    expect(zoomGallery).toContain('AbortController');

    const whiteboard = fs.readFileSync(path.join(ROOT, 'whiteboard', 'whiteboard.html'), 'utf8');
    expect(whiteboard).toContain('aiPending = Object.create(null)');
    expect(whiteboard).toContain('mr.onerror');

    const textInquiry = fs.readFileSync(path.join(ROOT, 'text_inquiry', 'text_inquiry.html'), 'utf8');
    expect(textInquiry).toContain('verifySourceSeq');

    const videoStudio = fs.readFileSync(path.join(ROOT, 'video_studio', 'video_studio.html'), 'utf8');
    expect(videoStudio).toContain('Object.assign(Object.create(null)');
    expect(videoStudio).toContain('audioMedia = Object.create(null)');
    expect(videoStudio).toContain('previewAudios = Object.create(null)');
    expect(videoStudio).toContain("typeof confirmUnknownOriginSend === 'function' && !confirmUnknownOriginSend()");
    expect(videoStudio).toContain('mr.onerror');

    const openGroove = fs.readFileSync(path.join(ROOT, 'music_studio', 'open_groove_module.js'), 'utf8');
    expect(openGroove).toContain('15 * 1024 * 1024');
    expect(openGroove).toContain('recordingStartingRef');
    expect(openGroove).toContain('recorder.onerror');
  });
});
