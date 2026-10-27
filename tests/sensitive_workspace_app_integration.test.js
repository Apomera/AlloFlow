import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';
const require = createRequire(import.meta.url);
const parser = require('@babel/parser');
const deliveryBuilder = require('../dev-tools/build_browser_delivery_manifest.cjs');
const files = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const protectedAssets = ['sensitive_workspace_module.js', 'behavior_lens_module.js', 'behavior_lens_workspace_module.js',
  'dynamic_assessment_module.js', 'report_writer_module.js', 'utils_pure_module.js',
  'mailbox_script_source_module.js', 'view_share_session_surfaces_module.js'];
const digest = (algorithm, bytes, encoding) => createHash(algorithm).update(bytes).digest(encoding);

for (const file of files) describe(file + ' protected record host integration', () => {
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  function roleHarness(records, studentEntry = false) {
    const setter = vi.fn(), toast = vi.fn(), win = { AlloModules: { SensitiveWorkspace: records } };
    const deps = { useRef: v => ({ current: v }), useEffect: fn => fn(), useCallback: fn => fn,
      isTeacherMode: true, _isCanvasEnv: true, window: win,
      _alloHasAnyStudentEntry: () => studentEntry,
      requestReadingSupportTransition: fn => fn(), _setIsTeacherMode: setter,
      addToastRef: { current: toast } };
    const block = sliceBetween(source, '  const teacherModeRef = useRef(isTeacherMode);', '  const [studentAiConfigRevision', { file });
    const result = new Function(...Object.keys(deps), block + '\nreturn { setIsTeacherMode, teacherModeRef };')(...Object.values(deps));
    return { ...result, setter, toast, win };
  }
  it('does not require a password for ordinary student activities', () => {
    const h = roleHarness(undefined); h.setIsTeacherMode(false);
    expect(h.setter).toHaveBeenCalledWith(false);
  });
  it('waits for protected work to save before switching to student mode', async () => {
    let finish; const lock = vi.fn(() => new Promise(r => { finish = r; }));
    const h = roleHarness({ getStatus: () => ({ phase: 'ready' }), lock });
    const task = h.setIsTeacherMode(false);
    expect(h.setter).not.toHaveBeenCalled();
    expect(lock).toHaveBeenCalledWith('learner-transition');
    finish(); await task; expect(h.setter).toHaveBeenCalledWith(false);
  });
  it('preserves the staff view when the encrypted save fails', async () => {
    const h = roleHarness({ getStatus: () => ({ phase: 'ready' }), lock: () => Promise.reject(new Error('synthetic save failure')) });
    await h.setIsTeacherMode(false);
    expect(h.setter).not.toHaveBeenCalled(); expect(h.toast).toHaveBeenCalledOnce();
  });
  it('passes the actual deployment and learner-entry context to the protection layer', () => {
    const h = roleHarness(undefined, true);
    expect(h.win.__alloSensitiveWorkspaceContext()).toEqual({ isCanvas: true, learner: true });
    h.teacherModeRef.current = false;
    expect(h.win.__alloSensitiveWorkspaceContext().learner).toBe(true);
    expect(source).toContain('_alloGetRecoveryVaultStack(), _alloGetCanvasDeviceStorage()');
    expect(source).toContain("loadModule('SensitiveWorkspace'");
    expect(source).toContain('<SensitiveWorkspaceIndicator />');
  });
  it('parses the complete application source after the bounded edits', () => {
    expect(() => parser.parse(source, { sourceType: 'module', plugins: ['jsx'] })).not.toThrow();
  });
  it('approves the exact mirrored protected-workspace assets in its embedded delivery manifest', () => {
    const manifest = deliveryBuilder.readEmbeddedManifest(source);
    const { releaseId, ...body } = manifest;
    expect(releaseId).toBe(digest('sha256', deliveryBuilder.canonical(body), 'hex'));
    for (const asset of protectedAssets) {
      const bytes = readFileSync(asset);
      expect(readFileSync('desktop/web-app/public/' + asset).equals(bytes), asset + ' public mirror').toBe(true);
      expect(manifest.assets[asset], asset + ' approved bytes').toEqual({ bytes: bytes.length, integrity: 'sha384-' + digest('sha384', bytes, 'base64') });
    }
  });
  it('accepts each content-pinned clinical loader through the actual delivery policy', () => {
    const manifest = deliveryBuilder.readEmbeddedManifest(source);
    const sandbox = { URL };
    vm.runInNewContext(readFileSync('browser_delivery_policy.js', 'utf8') + '\nthis.factory = _alloCreateBrowserDeliveryPolicy;', sandbox);
    const desktop = file !== 'AlloFlowANTI.txt';
    const policy = sandbox.factory(manifest, { baseUrl: desktop ? 'http://localhost:3210/app/index.html' : 'https://alloflow-cdn.pages.dev/',
      isDesktopBundledApp: desktop, usesLocalModuleAssets: desktop });
    for (const asset of protectedAssets) {
      const literals = [...source.matchAll(/loadModule\('[^']+', '([^']+)'\)/g)].map(match => match[1]).filter(url => url.split('?')[0].endsWith('/' + asset));
      expect(literals.length, asset + ' loader count').toBe(1);
      const raw = literals[0];
      // Packaged local files use the reviewed byte-integrity manifest and do
      // not need an HTTP cache identity. Remote URLs must remain content-pinned.
      // A dev build pins the content hash (build.js CONTENT_HASH_PINNED uses 8 hex digits);
      // deploy.sh's production build pins the release commit (pluginCdnVersion). Each
      // changes whenever the bytes do; the sha384 integrity below is what guards them.
      const sha = digest('sha256', readFileSync(asset), 'hex');
      const releasePin = (source.match(/pluginCdnVersion\s*=\s*'([0-9a-f]{40})'/) || [])[1];
      const pins = ['v=' + sha.slice(0, 10), 'v=' + sha.slice(0, 8)].concat(releasePin ? ['v=' + releasePin] : []);
      if (!raw.startsWith('./') || raw.includes('?')) expect(pins, asset + ' cache identity').toContain(raw.split('?')[1]);
      // The shared loader converts CDN URLs to bundled paths on Desktop;
      // the explicit protected-workspace bootstrap already uses ./ there.
      const url = desktop ? raw.replace(/^https:\/\/alloflow-cdn\.pages\.dev\//, './') : raw;
      const script = {};
      expect(() => policy.configureScript(script, url)).not.toThrow();
      expect(script.integrity).toBe(manifest.assets[asset].integrity);
      expect(script.crossOrigin).toBe('anonymous');
      expect(script.referrerPolicy).toBe('no-referrer');
      if (desktop) expect(script.src).toContain('http://localhost:3210/app/' + asset);
    }
  });
});
