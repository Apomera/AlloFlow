import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { TextDecoder, TextEncoder } from 'node:util';

const rootSource = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const mirrorSource = readFileSync(resolve(process.cwd(), 'prismflow-deploy/src/AlloFlowANTI.txt'), 'utf8');
const appSource = readFileSync(resolve(process.cwd(), 'prismflow-deploy/src/App.jsx'), 'utf8');

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function createQrRuntime({
  href = 'https://gemini.google.com/canvas',
  env = {},
  injectedConfig,
  appId,
  windowOverride = '',
  storedBase = '',
} = {}) {
  const helperSource = sliceBetween(
    rootSource,
    'const ALLO_QR_STUDENT_AI_OFF_KEY',
    'function _isQrStudentAiDisabled()',
  );
  const location = new URL(href);
  const storage = new Map();
  if (storedBase) storage.set('alloflow_student_base_url', storedBase);
  const fakeWindow = {
    location,
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
  };
  if (windowOverride) fakeWindow.__ALLOFLOW_STUDENT_BASE_URL = windowOverride;

  const returnSource = helperSource + '\nreturn {\n'
    + '  getConfiguredBase: _alloGetConfiguredStudentBaseUrl,\n'
    + '  hostIsUnreachable: _alloShareHostIsNotStudentReachable,\n'
    + '  buildShareUrl: _buildAlloShareUrl,\n'
    + '  readHandoff: _alloReadQrFirebaseHandoff,\n'
    + '  initialHandoff: _alloQrFirebaseHandoff,\n'
    + '  handoffRequiredButMissing: _alloQrFirebaseHandoffRequiredButMissing,\n'
    + '};';
  const factory = new Function(
    'window',
    'process',
    '__firebase_config',
    '__app_id',
    'TextEncoder',
    'TextDecoder',
    'btoa',
    'atob',
    returnSource,
  );

  return factory(
    fakeWindow,
    { env },
    injectedConfig === undefined ? undefined : JSON.stringify(injectedConfig),
    appId,
    TextEncoder,
    TextDecoder,
    (value) => Buffer.from(value, 'binary').toString('base64'),
    (value) => Buffer.from(value, 'base64').toString('binary'),
  );
}

function relevantQrSections(source) {
  return [
    sliceBetween(source, 'const ALLO_QR_STUDENT_AI_OFF_KEY', 'function _isQrStudentAiDisabled()'),
    sliceBetween(source, 'const ALLO_QR_BLOCKED_FIREBASE_CONFIG', 'const firebaseApp = initializeApp(firebaseConfig);'),
    sliceBetween(source, "const liveCode = _alloCleanLiveSessionCode", 'const handleExportPDF'),
    sliceBetween(source, "const assignmentId = _alloCleanQrAssignmentId", "if (activeView === 'adventure'"),
  ].join('\n--- QR SECTION ---\n');
}

describe('QR student shell URL construction', () => {
  it('defaults Canvas sharing to the Cloudflare /app shell with the teacher Firebase handoff', () => {
    const teacherConfig = {
      apiKey: 'teacher-key',
      authDomain: 'teacher.example',
      projectId: 'teacher-project',
      appId: '1:123:web:teacher',
    };
    const runtime = createQrRuntime({
      injectedConfig: teacherConfig,
      appId: 'canvas-classroom-app',
    });

    const shareUrl = new URL(runtime.buildShareUrl({
      allo_join: 'ABCDE',
      allo_ai: 'off',
    }));

    expect(shareUrl.origin + shareUrl.pathname).toBe('https://alloflow-cdn.pages.dev/app/');
    expect(shareUrl.searchParams.get('allo_join')).toBe('ABCDE');
    expect(shareUrl.searchParams.get('allo_ai')).toBe('off');
    expect(shareUrl.searchParams.get('allo_app')).toBe('canvas-classroom-app');
    expect(shareUrl.searchParams.get('allo_host')).toBe('canvas-classroom-app');

    const encoded = shareUrl.searchParams.get('allo_fb');
    expect(encoded).toBeTruthy();
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    expect(decoded).toEqual(teacherConfig);

    const studentRuntime = createQrRuntime({ href: shareUrl.toString() });
    expect(studentRuntime.handoffRequiredButMissing).toBe(false);
    expect(studentRuntime.initialHandoff).toEqual({
      firebaseConfig: teacherConfig,
      appId: 'canvas-classroom-app',
    });
  });

  it('keeps the explicit override chain ahead of the Cloudflare default', () => {
    expect(createQrRuntime({
      windowOverride: 'https://district.example/student/',
      storedBase: 'https://stored.example/student/',
      env: { REACT_APP_STUDENT_BASE_URL: 'https://env.example/student/' },
    }).getConfiguredBase()).toBe('https://district.example/student/');

    expect(createQrRuntime({
      storedBase: 'https://stored.example/student/',
      env: { REACT_APP_STUDENT_BASE_URL: 'https://env.example/student/' },
    }).getConfiguredBase()).toBe('https://stored.example/student/');

    expect(createQrRuntime({
      env: { REACT_APP_STUDENT_BASE_URL: 'https://env.example/student/' },
    }).getConfiguredBase()).toBe('https://env.example/student/');

    expect(createQrRuntime().getConfiguredBase()).toBe('https://alloflow-cdn.pages.dev/app/');
  });

  it('still rejects Prismflow demo and Canvas hosts as student targets', () => {
    const runtime = createQrRuntime({
      windowOverride: 'https://prismflow-911fe.web.app/',
      injectedConfig: { apiKey: 'x', projectId: 'x', appId: 'x' },
      appId: 'class-app',
    });

    expect(runtime.hostIsUnreachable(new URL('https://prismflow-911fe.web.app/'))).toBe(true);
    expect(runtime.hostIsUnreachable(new URL('https://gemini.google.com/canvas'))).toBe(true);
    expect(runtime.buildShareUrl({ allo_join: 'ABCDE' })).toBe('');
  });

  it('does not classify desktop LAN entry or normal startup as QR Firebase handoff mode', () => {
    expect(createQrRuntime({
      href: 'http://192.168.1.20/app/?allo_lan_join=ABCDE',
    }).handoffRequiredButMissing).toBe(false);
    expect(createQrRuntime({
      href: 'https://alloflow-cdn.pages.dev/app/',
    }).handoffRequiredButMissing).toBe(false);
  });
});

describe('incomplete QR privacy guard', () => {
  it('marks a QR without allo_fb as blocked', () => {
    const runtime = createQrRuntime({
      href: 'https://alloflow-cdn.pages.dev/app/?allo_join=ABCDE&allo_app=class-app',
    });
    expect(runtime.readHandoff()).toBeNull();
    expect(runtime.handoffRequiredButMissing).toBe(true);
  });

  it('blocks auth/data startup and uses an inert Firebase identity', () => {
    expect(rootSource).toContain("projectId: 'alloflow-incomplete-qr'");
    expect(rootSource).toContain("if (!_alloQrFirebaseHandoffRequiredButMissing) _initAlloData();");
    const apiKeyBlock = sliceBetween(rootSource, 'const apiKey =', 'const fisherYatesShuffle');
    expect(apiKeyBlock).not.toContain('REACT_APP_GEMINI_API_KEY');
    expect(
      apiKeyBlock.includes('const apiKey = "";')
      || apiKeyBlock.includes('_alloQrFirebaseHandoffRequiredButMissing'),
    ).toBe(true);

    const authStart = rootSource.indexOf("Firebase auth skipped: QR link has no valid teacher handoff.");
    const anonymousSignIn = rootSource.indexOf('await signInAnonymously(auth);', authStart);
    expect(authStart).toBeGreaterThanOrEqual(0);
    expect(anonymousSignIn).toBeGreaterThan(authStart);
  });

  it('shows the incomplete-link error before live join can run', () => {
    const live = sliceBetween(rootSource, "const liveCode = _alloCleanLiveSessionCode", 'const handleExportPDF');
    const guard = live.indexOf('if (!firebaseHandoff)');
    const error = live.indexOf("addToast(ALLO_QR_INCOMPLETE_MESSAGE, 'error')");
    const join = live.indexOf('joinClassSession(liveCode, hostId)');

    expect(guard).toBeGreaterThanOrEqual(0);
    expect(error).toBeGreaterThan(guard);
    expect(join).toBeGreaterThan(error);
    expect(live.slice(error, join)).toContain('return undefined;');
  });

  it('shows the incomplete-link error before homework can read Firestore', () => {
    const assignment = sliceBetween(
      rootSource,
      "const assignmentId = _alloCleanQrAssignmentId",
      "if (activeView === 'adventure'",
    );
    const guard = assignment.indexOf('if (!firebaseHandoff)');
    const error = assignment.indexOf("addToast(ALLO_QR_INCOMPLETE_MESSAGE, 'error')");
    const firestoreRead = assignment.indexOf('const snap = await getDoc(assignmentRef)');

    expect(guard).toBeGreaterThanOrEqual(0);
    expect(error).toBeGreaterThan(guard);
    expect(firestoreRead).toBeGreaterThan(error);
    expect(assignment.slice(error, firestoreRead)).toContain('return undefined;');
  });

  it('keeps the QR/privacy sections synchronized across all three app copies', () => {
    expect(relevantQrSections(mirrorSource)).toBe(relevantQrSections(rootSource));
    expect(relevantQrSections(appSource)).toBe(relevantQrSections(rootSource));
  });
});

describe('Cloudflare student shell build wiring', () => {
  it('keeps the committed /app artifact self-contained and Cloudflare-sized', () => {
    const shellDir = resolve(process.cwd(), 'prismflow-deploy/public/app');
    const indexPath = resolve(shellDir, 'index.html');
    const index = readFileSync(indexPath, 'utf8');
    const serviceWorker = readFileSync(resolve(shellDir, 'sw.js'), 'utf8');
    const pending = [shellDir];
    const files = [];
    while (pending.length) {
      const dir = pending.pop();
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const entryPath = resolve(dir, entry.name);
        if (entry.isDirectory()) pending.push(entryPath);
        else if (entry.isFile()) files.push(entryPath);
      }
    }

    expect(index.length).toBeGreaterThan(100 * 1024);
    expect(index).toContain('https://alloflow-cdn.pages.dev/app/');
    expect(index).toContain('This QR link is incomplete');
    expect(index).toContain('navigator.serviceWorker.register("./sw.js",{scope:"./"');
    expect(serviceWorker).toContain("const CACHE_NAME = 'alloflow-student-shell-v");
    expect(serviceWorker).toContain("keys.filter(k => k.startsWith('alloflow-student-shell-v')");
    expect(serviceWorker).toContain('/app/index.html');
    expect(serviceWorker).not.toContain("cache.add('/index.html')");
    expect(files.length).toBeGreaterThanOrEqual(4);
    expect(files.some((file) => statSync(file).size >= 25 * 1024 * 1024)).toBe(false);
    expect(files.some((file) => /alloflow_intro_(teacher|family)\.mp4$/.test(file))).toBe(false);
  });
  it('publishes the postbuild shell automatically and excludes the oversized asset tree', () => {
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'prismflow-deploy/package.json'), 'utf8'));
    const buildScript = readFileSync(resolve(process.cwd(), 'build.js'), 'utf8');

    expect(packageJson.scripts.build).toContain('node ../build.js --copy-student-shell');
    expect(buildScript).toContain("const STUDENT_SHELL_PUBLIC_DIR = path.join(ROOT, 'prismflow-deploy', 'public', 'app')");
    expect(buildScript).toContain("'index.html'");
    expect(buildScript).toContain("'static'");
    expect(buildScript).not.toContain("'alloflow_intro_teacher.mp4',");
    expect(buildScript).not.toContain("'alloflow_intro_family.mp4',");
  });
});