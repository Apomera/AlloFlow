import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { TextDecoder, TextEncoder } from 'node:util';

const rootSource = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const mirrorSource = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8');
const appSource = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/App.jsx'), 'utf8');
const phaseOSource = readFileSync(resolve(process.cwd(), 'phase_o_misc_handlers_source.jsx'), 'utf8');
const phaseOModule = readFileSync(resolve(process.cwd(), 'phase_o_misc_handlers_module.js'), 'utf8');
const phaseOPublicModule = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/phase_o_misc_handlers_module.js'), 'utf8');
const sessionModalSource = readFileSync(resolve(process.cwd(), 'view_session_modal_source.jsx'), 'utf8');
const sessionModalModule = readFileSync(resolve(process.cwd(), 'view_session_modal_module.js'), 'utf8');
const sessionModalPublicModule = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_session_modal_module.js'), 'utf8');
const headerSource = readFileSync(resolve(process.cwd(), 'view_header_source.jsx'), 'utf8');
const headerModule = readFileSync(resolve(process.cwd(), 'view_header_module.js'), 'utf8');
const headerPublicModule = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_header_module.js'), 'utf8');

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
    sliceBetween(source, 'const ALLO_QR_BLOCKED_FIREBASE_CONFIG', 'let appCheck = null;'),
    sliceBetween(source, "const liveCode = _alloCleanLiveSessionCode", 'const handleExportPDF'),
    sliceBetween(source, "const assignmentId = _alloCleanQrAssignmentId", "if (activeView === 'adventure'"),
  ].join('\n--- QR SECTION ---\n');
}

describe('QR student shell URL construction', () => {
  it('boots the Canvas Firebase configuration without a Node process global', () => {
    const envReader = sliceBetween(rootSource, 'function _alloReadEnv(name)', 'function _alloNormalizeShareBaseUrl');
    const firebaseBootstrap = sliceBetween(
      rootSource,
      'const ALLO_QR_BLOCKED_FIREBASE_CONFIG',
      'let appCheck = null;',
    );
    expect(firebaseBootstrap).not.toMatch(/\bprocess(?:\.|\?\.)env/);

    const factory = new Function(
      'process',
      'initializeApp',
      'getAuth',
      'getFirestore',
      '__app_id',
      '__firebase_config',
      '_alloQrFirebaseHandoff',
      '_alloQrFirebaseHandoffRequiredButMissing',
      `${envReader}\n${firebaseBootstrap}\nreturn { firebaseConfig, appId: _alloRuntimeAppId, configuredProject: _alloConfiguredFirebaseProject, appCheckSiteKey: _alloAppCheckSiteKey };`,
    );
    const teacherConfig = {
      apiKey: 'teacher-key',
      authDomain: 'teacher.example',
      projectId: 'teacher-project',
      appId: '1:123:web:teacher',
    };
    const runtime = factory(
      undefined,
      (config) => ({ config }),
      () => ({}),
      () => ({}),
      'canvas-classroom-app',
      JSON.stringify(teacherConfig),
      null,
      false,
    );

    expect(runtime.firebaseConfig).toEqual(teacherConfig);
    expect(runtime.appId).toBe('canvas-classroom-app');
    expect(runtime.configuredProject).toBe('');
    expect(runtime.appCheckSiteKey).toBe('');
  });
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

describe('Canvas-managed QR auth sequencing', () => {
  it('serializes Firebase sign-in and waits for an ID token', () => {
    const helper = sliceBetween(rootSource, 'let _alloAuthSignInPromise = null;', 'let appCheck = null;');
    expect(helper).toContain('if (auth.currentUser?.uid) return auth.currentUser;');
    expect(helper).toContain('await signInWithCustomToken(auth, __initial_auth_token)');
    expect(helper).toContain('await signInAnonymously(auth)');
    expect(helper).toContain('await signedInUser.getIdToken()');

    const authEffect = sliceBetween(rootSource, 'const initAuth = async (retryCount = 0)', 'const unsubscribe = onAuthStateChanged');
    expect(authEffect).toContain('await _alloEnsureAuthenticatedUser()');
    expect(authEffect).not.toContain('await signInAnonymously(auth)');
    expect(authEffect).not.toContain('await signInWithCustomToken(auth');
  });

  it('authenticates teacher creation and student join before touching a session', () => {
    const teacherStart = sliceBetween(rootSource, 'const startClassSession = async () => {', 'const toggleSessionMode = async () => {');
    expect(teacherStart.indexOf('await _alloEnsureAuthenticatedUser()')).toBeLessThan(teacherStart.indexOf('_m.startClassSession'));
    expect(teacherStart).toContain('user: sessionUser');

    const join = sliceBetween(rootSource, "const joinClassSession = async (code, hostOverride = '')", '// Desktop LAN classroom auto-join:');
    const auth = join.indexOf('await _alloEnsureAuthenticatedUser()');
    const read = join.indexOf('await getDoc(sessionRef)');
    const roster = join.indexOf('await updateDoc(sessionRef');
    const activate = join.indexOf('setActiveSessionCode(cleanCode)');
    expect(auth).toBeGreaterThanOrEqual(0);
    expect(read).toBeGreaterThan(auth);
    expect(roster).toBeGreaterThan(read);
    expect(activate).toBeGreaterThan(roster);
    expect(join).toContain('uid: authenticatedUser.uid');
    expect(join).toContain('[`roster.${authenticatedUser.uid}`]');
    expect(join).not.toContain("'anon-' + Date.now()");
    expect(join.slice(join.indexOf('} catch(e)'))).not.toContain("t('session.error_not_found')");
    expect(join).toContain('return true;');
    expect(join).toContain('return false;');
    expect(join).toContain('Use Retry below without reloading.');
  });

  it('authenticates homework reads and never shares local-preview fallback codes', () => {
    const assignment = sliceBetween(
      rootSource,
      "const assignmentId = _alloCleanQrAssignmentId",
      "if (activeView === 'adventure'",
    );
    expect(assignment.indexOf('await _alloEnsureAuthenticatedUser()')).toBeLessThan(assignment.indexOf('await getDoc(assignmentRef)'));

    expect(phaseOSource).toContain('isLocalOnly: true');
    expect(phaseOSource).toContain("transport: 'local-preview'");
    expect(sessionModalSource).toContain("if (isLocalOnly || !activeSessionCode || typeof window === 'undefined') return '';");
    expect(sessionModalSource).toContain('if (mailboxJoinUrl) return mailboxJoinUrl;');
    expect(sessionModalSource).toContain("isMailboxSession ? 'Class Mailbox QR join' : 'Student QR join'");
    expect(sessionModalSource).toContain("typeof onRequestEndSession === 'function'");
    expect(sessionModalSource).toContain('{!isProjectionMode && !isMailboxSession && (');
    expect(sessionModalSource).toContain('aria-labelledby="alloflow-session-modal-title"');
    expect(sessionModalSource).toContain('<button');
    expect(sessionModalSource).toContain('text-5xl sm:text-7xl');
    expect(sessionModalSource).toContain('flex flex-col sm:flex-row');
    expect(sessionModalSource).toContain('This code was not saved to Firebase, so students cannot join it.');
    expect(rootSource).toContain('aria-labelledby="alloflow-homework-qr-title"');
    expect(rootSource).toContain('Take-home assignment');
    expect(rootSource).toContain("qrShareModal.aiPolicy === 'student-byok' ? 'Personal AI optional' : 'Student AI off'");
    expect(rootSource).toContain('This QR does not join your class, show a session code, or connect to live pacing.');
    expect(rootSource).toContain("_makeAlloQrSvg(url, 'AlloFlow homework assignment QR')");
    expect(phaseOModule).toBe(phaseOPublicModule);
    expect(sessionModalModule).toBe(sessionModalPublicModule);
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
    // v3: backend-free boots (mailbox/pack/landing, no allo_fb) also skip the
    // data provider via the placeholder-config flag.
    expect(rootSource).toContain("if (!_alloQrFirebaseHandoffRequiredButMissing && !_alloFirebaseIsPlaceholder) _initAlloData();");
    const apiKeyBlock = sliceBetween(rootSource, 'const apiKey =', 'const fisherYatesShuffle');
    expect(apiKeyBlock).not.toContain('REACT_APP_GEMINI_API_KEY');
    expect(
      apiKeyBlock.includes('const apiKey = "";')
      || apiKeyBlock.includes('_alloQrFirebaseHandoffRequiredButMissing'),
    ).toBe(true);

    const authStart = rootSource.indexOf("Firebase auth skipped: QR link has no valid teacher handoff.");
    const guardedSignIn = rootSource.indexOf('await _alloEnsureAuthenticatedUser();', authStart);
    expect(authStart).toBeGreaterThanOrEqual(0);
    expect(guardedSignIn).toBeGreaterThan(authStart);
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
    expect(live).toContain('setLiveJoinStatus');
    expect(live).toContain('setLiveJoinRetryable(true)');
    expect(live).toContain('await joinClassSession(liveCode, hostId)');
    expect(live).toContain('[liveJoinAttempt]');
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

describe('Prismflow demo isolation', () => {
  it('does not route production launchers, citations, or deployment defaults to the demo', () => {
    const productionFiles = [
      'lms_bookmarklet.js',
      'garden_demo.html',
      'desktop/web-app/postbuild.js',
      'stem_lab/stem_tool_printingpress.js',
      'ui_strings.js',
      'deploy.sh',
      'architecture.md',
    ];

    for (const file of productionFiles) {
      const contents = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(contents, file).not.toContain('https://prismflow-911fe.web.app');
    }
  });

  it('keeps the demo hosts in the QR denylist', () => {
    expect(rootSource).toContain("const ALLOFLOW_DEMO_STUDENT_HOSTS = ['prismflow-911fe.web.app', 'prismflow-911fe.firebaseapp.com']");
  });

  it('makes unconfigured Firebase an explicit skip and follows Cloudflare redirects', () => {
    const deployScript = readFileSync(resolve(process.cwd(), 'deploy.sh'), 'utf8');
    expect(deployScript).toContain('no school-owned Firebase project is configured');
    expect(deployScript).toContain('Firebase intentionally skipped; no maintainer/demo project was touched');
    expect(deployScript).toContain('HCODE=$(curl -sL');
  });
});
describe('Cloudflare student shell build wiring', () => {
  it('keeps the committed /app artifact split, precached, and Cloudflare-sized', () => {
    const shellDir = resolve(process.cwd(), 'desktop/web-app/public/app');
    const cdnShellDir = resolve(process.cwd(), 'app');
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

    expect(index.length).toBeGreaterThan(1024);
    expect(index.length).toBeLessThan(100 * 1024);
    expect(readFileSync(resolve(cdnShellDir, 'index.html'), 'utf8')).toBe(index);
    expect(readFileSync(resolve(cdnShellDir, 'sw.js'), 'utf8')).toBe(serviceWorker);
    expect(index).toContain("navigator.serviceWorker.register('./sw.js', { scope: './'");
    expect(index).toMatch(/\.\/static\/js\/main\.[a-f0-9]+\.js/);
    expect(index).toMatch(/\.\/static\/css\/main\.[a-f0-9]+\.css/);
    const mainJsFile = files.find((file) => /static[\\/]js[\\/]main\.[a-f0-9]+\.js$/.test(file));
    expect(mainJsFile).toBeTruthy();
    const mainJs = readFileSync(mainJsFile, 'utf8');
    expect(mainJs).toContain('https://alloflow-cdn.pages.dev/app/');
    expect(mainJs).toContain('This QR link is incomplete');
    expect(serviceWorker).toContain("const CACHE_NAME = 'alloflow-student-shell-v");
    expect(serviceWorker).toContain("keys.filter(k => k.startsWith('alloflow-student-shell-v')");
    expect(serviceWorker).toContain('const PRECACHE_PATHS = [');
    expect(serviceWorker).toMatch(/\.\/static\/js\/main\.[a-f0-9]+\.js/);
    expect(serviceWorker).toMatch(/\.\/static\/css\/main\.[a-f0-9]+\.css/);
    expect(serviceWorker).toContain("const SHELL_URL = scopedUrl('./index.html')");
    expect(serviceWorker).not.toContain('self.skipWaiting()');
    expect(files.length).toBeGreaterThanOrEqual(7);
    expect(files.some((file) => statSync(file).size >= 25 * 1024 * 1024)).toBe(false);
    expect(files.some((file) => /alloflow_intro_(teacher|family)\.mp4$/.test(file))).toBe(false);
  });
  it('publishes the postbuild shell automatically and excludes the oversized asset tree', () => {
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'desktop/web-app/package.json'), 'utf8'));
    const buildScript = readFileSync(resolve(process.cwd(), 'build.js'), 'utf8');

    expect(packageJson.scripts.build).toContain('node ../build.js --copy-student-shell');
    expect(buildScript).toContain("const STUDENT_SHELL_PUBLIC_DIR = path.join(ROOT, 'desktop/web-app', 'public', 'app')");
    expect(buildScript).toContain("const STUDENT_SHELL_CDN_DIR = path.join(ROOT, 'app')");
    expect(buildScript).toContain("'index.html'");
    expect(buildScript).toContain("'static'");
    expect(buildScript).not.toContain("'alloflow_intro_teacher.mp4',");
    expect(buildScript).not.toContain("'alloflow_intro_family.mp4',");
  });
});

describe('homework QR hardening', () => {
  it('keeps homework payloads separate from live-session joins and exposes teacher verification controls', () => {
    const creator = sliceBetween(rootSource, 'const createHomeworkAssignmentLink = useCallback', 'const testHomeworkAsStudent');
    expect(creator).toContain('allo_assignment: assignmentId');
    expect(creator).not.toContain('allo_join:');
    expect(rootSource).toContain("window.open(url, '_blank')");
    expect(rootSource).toContain('Revoke homework link');
    expect(rootSource).toContain("throw new Error('Assignment expired')");
    expect(rootSource).toContain('function _alloAssignmentIsExpired(packet)');
    expect(rootSource).toContain('expiresAt: new Date(Date.now() + homeworkExpiryDays * 24 * 60 * 60 * 1000),');
    expect(rootSource).toContain('ref={homeworkQrDialogRef} tabIndex={-1}');
    expect(rootSource).toContain('const printQrSheet = useCallback');
    expect(rootSource).toContain("printQrSheet(qrShareSvg, 'AlloFlow homework assignment'");
    expect(rootSource).toContain("openStudentQrPreview(mbLive.joinUrl, 'live-session link as a student')");
    expect(rootSource).toContain("mbLive.aiPolicy === 'student-byok' ? 'Personal AI optional' : 'AI tools off'");
    expect(rootSource).toContain('This homework link was revoked or is no longer available.');
    expect(rootSource).toContain('This homework link has expired.');
    expect(rootSource).toContain('It may be damaged or truncated');    expect(rootSource).toContain("safeGetItem('allo_recent_qr_shares')");
    expect(rootSource).toContain('showRecentQrShares &&');
    expect(rootSource).toContain('homeworkExpiryDays * 24 * 60 * 60 * 1000');
    expect(rootSource).toContain('Selectable homework link');
    expect(rootSource).toContain('Homework ready ·');
    expect(sessionModalSource).toContain('isProjectionMode');
    expect(sessionModalSource).toContain('Live session readiness');
    expect(sessionModalSource).toContain('Selectable student join link');
    expect(headerSource).toContain('Homework link length');
    expect(headerSource).toContain('Recent homework links');
    expect(headerSource).toContain('<option value={1}>1 day</option>');
    expect(headerSource).toContain('<option value={30}>30 days</option>');
    expect(headerPublicModule).toBe(headerModule);
  });
});
