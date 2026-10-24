import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const {
  DESKTOP_REACT_ENV,
  MODULE_CONTRACTS,
  validateDesktopAppBuild,
} = require('../desktop/scripts/check-desktop-app-build.cjs');
const {
  BUILD_INPUT_FINGERPRINT_FILE,
  copyDesktopPublicAssets,
  shouldFingerprintPath,
} = require('../desktop/scripts/build-desktop-web.cjs');

const temporaryRoots = [];

function write(root, relativePath, content) {
  const target = join(root, ...relativePath.split('/'));
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, content);
}

function makeValidFixture() {
  const root = mkdtempSync(join(tmpdir(), 'alloflow-desktop-parity-'));
  temporaryRoots.push(root);
  const appBuild = join(root, 'desktop', 'app-build');

  for (const [index, contract] of MODULE_CONTRACTS.entries()) {
    const source = `const desktopParityMarker${index} = true;\n`;
    const module = contract.render(source);
    write(root, contract.source, source);
    write(root, contract.file, module);
    write(root, `desktop/web-app/public/${contract.file}`, module);
    write(root, `desktop/app-build/${contract.file}`, module);
  }

  const mainJs = './static/js/main.1234abcd.js';
  const mainCss = './static/css/main.5678cdef.css';
  const injectedEnv = Object.entries(DESKTOP_REACT_ENV)
    .map(([name, value]) => `${name}:${JSON.stringify(value)}`)
    .join(',');
  write(root, 'desktop/app-build/static/js/main.1234abcd.js', `const compiledEnv={${injectedEnv}};\n`);
  write(root, 'desktop/app-build/static/css/main.5678cdef.css', 'body { color: #111; }\n');
  write(root, 'desktop/app-build/alloflow_desktop_bridge.js', 'window.__desktopBridge = true;\n');
  write(root, 'desktop/app-build/asset-manifest.json', JSON.stringify({
    files: {
      'main.css': mainCss,
      'main.js': mainJs,
      'index.html': './index.html',
    },
    entrypoints: [mainCss.replace('./', ''), mainJs.replace('./', '')],
  }, null, 2));
  write(root, 'desktop/app-build/index.html', [
    '<!doctype html><html><head>',
    `<link href="${mainCss}" rel="stylesheet">`,
    '<script>navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });</script>',
    `<script defer src="${mainJs}"></script>`,
    '</head><body><div id="root"></div></body></html>',
  ].join(''));
  write(root, 'desktop/app-build/sw.js', [
    "const CACHE_NAME = 'alloflow-v123456789';",
    `const PRECACHE_PATHS = ${JSON.stringify(['./index.html', './alloflow_desktop_bridge.js', mainJs, mainCss])};`,
    'const scopedUrl = (relativePath) => new URL(relativePath, self.registration.scope).toString();',
    "const SHELL_URL = scopedUrl('./index.html');",
  ].join('\n'));

  return { root, appBuild };
}

afterEach(() => {
  while (temporaryRoots.length) {
    const root = resolve(temporaryRoots.pop());
    if (!root.startsWith(resolve(tmpdir()) + sep) || !basename(root).startsWith('alloflow-')) {
      throw new Error('Refusing to remove a directory outside the test fixtures: ' + root);
    }
    rmSync(root, { recursive: true, force: true });
  }
});

describe('desktop app-build deployment guard', () => {
  it('builds the desktop flavor in an isolated, explicitly keyless environment', () => {
    const builder = readFileSync('desktop/scripts/build-desktop-web.cjs', 'utf8');
    const postbuild = readFileSync('desktop/web-app/postbuild.js', 'utf8');
    const deploy = readFileSync('deploy.sh', 'utf8');
    const appSource = readFileSync('desktop/web-app/src/App.jsx', 'utf8');
    expect(builder).toContain("const isolatedOutput = args.includes('--isolated-output')");
    expect(builder).toContain("path.join(os.tmpdir(), 'alloflow-desktop-web-')");
    expect(builder).toContain("process.env.FORCE_DESKTOP_BUILD === '1'");
    expect(builder).toContain('computeBuildInputFingerprint()');
    expect(BUILD_INPUT_FINGERPRINT_FILE).toBe('.alloflow-desktop-build-input.json');
    expect(builder).not.toContain('--stage-only');
    expect(builder).toContain("REACT_APP_DESKTOP: '1'");
    expect(builder).toContain("REACT_APP_API_MODE: 'local'");
    expect(builder).toContain("REACT_APP_API_KEY: ''");
    expect(builder).toContain("REACT_APP_PROJECT_ID: ''");
    expect(builder).toContain("REACT_APP_GEMINI_API_KEY: ''");
    expect(builder).toContain("REACT_APP_POCKETBASE_URL: ''");
    expect(builder).toContain("REACT_APP_STUDENT_BASE_URL: ''");
    expect(builder).toContain("REACT_APP_DISALLOWED_STUDENT_HOSTS: ''");
    expect(builder).toContain("text.replace(GOOGLE_API_KEY_PATTERN, '')");
    expect(builder).not.toContain("REACT_APP_API_KEY: 'desktop-user-provided'");
    expect(postbuild).toContain('process.env.BUILD_PATH');
    expect(deploy).toContain('npm run web:build:isolated && npm run verify:web-build');
    const usedReactEnv = Array.from(new Set(appSource.match(/REACT_APP_[A-Z0-9_]+/g) || []));
    expect(usedReactEnv.length).toBeGreaterThan(0);
    for (const name of usedReactEnv) {
      expect(builder, `desktop builder must explicitly set ${name}`).toContain(`${name}:`);
    }
  });

  it('fingerprints desktop inputs without coupling them to the hosted nested app build', () => {
    expect(shouldFingerprintPath(join(process.cwd(), 'desktop', 'web-app', 'src', 'App.jsx'))).toBe(true);
    expect(shouldFingerprintPath(join(process.cwd(), 'desktop', 'web-app', 'public', 'doc_pipeline_module.js'))).toBe(true);
    expect(shouldFingerprintPath(join(process.cwd(), 'desktop', 'web-app', 'public', 'app', 'index.html'))).toBe(false);
  });

  it('restores missing and stale runtime assets without overwriting the compiled desktop shell', () => {
    const root = mkdtempSync(join(tmpdir(), 'alloflow-desktop-public-assets-'));
    temporaryRoots.push(root);
    const publicDir = join(root, 'public');
    const buildRoot = join(root, 'build');
    const compiled = {
      'index.html': '<html>compiled desktop shell</html>',
      'asset-manifest.json': '{"files":{"main.js":"./static/js/main.1234abcd.js"}}',
      'static/js/main.1234abcd.js': 'const desktopBundle = true;',
      'static/css/main.5678cdef.css': 'body { color: #111; }',
    };
    for (const [file, content] of Object.entries(compiled)) {
      write(root, 'build/' + file, content);
      write(root, 'public/' + file, 'stale hosted content');
    }
    write(root, 'public/app/index.html', '<html>nested hosted shell</html>');
    const runtime = {
      'misc_handlers_module.js': 'window.MiscHandlersModule = {};',
      'stem_lab/perception_walk.js': 'window.PerceptionWalk = {};',
      'stem_lab/perception_walk_scene.js': 'window.PerceptionWalkScene = {};',
      'sw.js': 'const CACHE_NAME = "alloflow-v__BUILD_TS__";',
      'alloflow_desktop_bridge.js': 'window.__desktopBridge = true;',
    };
    for (const [file, content] of Object.entries(runtime)) write(root, 'public/' + file, content);
    write(root, 'build/misc_handlers_module.js', 'stale handler');

    copyDesktopPublicAssets(buildRoot, publicDir);

    for (const [file, content] of Object.entries(compiled)) expect(readFileSync(join(buildRoot, file), 'utf8')).toBe(content);
    for (const [file, content] of Object.entries(runtime)) expect(readFileSync(join(buildRoot, file), 'utf8')).toBe(content);
    expect(existsSync(join(buildRoot, 'app'))).toBe(false);
  });

  it('restores missing service-worker and bridge assets before stamping an isolated build', () => {
    const buildRoot = mkdtempSync(join(tmpdir(), 'alloflow-postbuild-missing-sw-'));
    temporaryRoots.push(buildRoot);
    write(buildRoot, 'index.html', [
      '<!doctype html><html><head>',
      '<link href="./static/css/main.5678cdef.css" rel="stylesheet">',
      '<script defer src="./static/js/main.1234abcd.js"></script>',
      '</head><body><div id="root"></div></body></html>',
    ].join(''));
    write(buildRoot, 'static/js/main.1234abcd.js', 'window.__desktopBuild = true;\n');
    write(buildRoot, 'static/css/main.5678cdef.css', 'body { color: #111; }\n');


    execFileSync(process.execPath, [join(process.cwd(), 'desktop', 'web-app', 'postbuild.js')], {
      cwd: process.cwd(),
      env: { ...process.env, BUILD_PATH: buildRoot },
      stdio: 'pipe',
    });

    expect(readFileSync(join(buildRoot, 'alloflow_desktop_bridge.js'), 'utf8')).toBe(
      readFileSync('desktop/web-app/public/alloflow_desktop_bridge.js', 'utf8')
    );
    const stampedWorker = readFileSync(join(buildRoot, 'sw.js'), 'utf8');
    expect(stampedWorker).toMatch(/alloflow-v[0-9a-f]{64}-\d+/);   // release-tagged cache name (postbuild stamps both parts)
    expect(stampedWorker).toContain('./static/js/main.1234abcd.js');
    expect(stampedWorker).toContain('./static/css/main.5678cdef.css');
  });

  // The fixtures above are built WITH contract.render, so they cannot notice a
  // renderer that drops the remediation_review_helpers footer (Step 4.5 rejected
  // the correct module for exactly that). Render the real sources instead.
  it('renders every real source to its committed module byte for byte', () => {
    for (const contract of MODULE_CONTRACTS) {
      const rendered = Buffer.from(contract.render(readFileSync(contract.source, 'utf8')), 'utf8');
      const committed = readFileSync(contract.file);
      expect(rendered.length, `${contract.file} length`).toBe(committed.length);
      expect(rendered.equals(committed), `${contract.file} bytes`).toBe(true);
    }
    const footer = readFileSync('remediation_review_helpers.js', 'utf8');
    expect(footer.length).toBeGreaterThan(1000);
    expect(readFileSync('doc_pipeline_module.js', 'utf8')).toContain(footer.trim());
  });

  it('accepts source/module mirrors and a self-consistent hashed offline shell', () => {
    const fixture = makeValidFixture();
    expect(() => validateDesktopAppBuild({
      repoRoot: fixture.root,
      appBuildDir: fixture.appBuild,
    })).not.toThrow();
  });

  it('rejects a stale packaged remediation module', () => {
    const fixture = makeValidFixture();
    write(fixture.root, 'desktop/app-build/doc_pipeline_module.js', 'stale desktop code\n');
    expect(() => validateDesktopAppBuild({
      repoRoot: fixture.root,
      appBuildDir: fixture.appBuild,
    })).toThrow(/doc_pipeline_module\.js desktop artifact differs/);
  });

  it('accepts the release-tagged cache name postbuild stamps, and rejects an unstamped release id', () => {
    const fixture = makeValidFixture();
    const worker = [
      "const RELEASE_ID = '" + 'a'.repeat(64) + "';",
      'const RELEASE_BUILT_AT = 1792174913907;',
      "const CACHE_NAME = 'alloflow-v" + 'a'.repeat(64) + "-1792174913907';",
      'const PRECACHE_PATHS = ["./index.html","./alloflow_desktop_bridge.js","./static/js/main.1234abcd.js","./static/css/main.5678cdef.css"];',
      'const scopedUrl = (relativePath) => new URL(relativePath, self.registration.scope).toString();',
      "const SHELL_URL = scopedUrl('./index.html');",
    ];
    write(fixture.root, 'desktop/app-build/sw.js', worker.join('\n'));
    expect(() => validateDesktopAppBuild({ repoRoot: fixture.root, appBuildDir: fixture.appBuild })).not.toThrow();
    worker[0] = "const RELEASE_ID = '__RELEASE_ID__';";
    worker[2] = "const CACHE_NAME = 'alloflow-v__RELEASE_ID__-1792174913907';";
    write(fixture.root, 'desktop/app-build/sw.js', worker.join('\n'));
    expect(() => validateDesktopAppBuild({ repoRoot: fixture.root, appBuildDir: fixture.appBuild })).toThrow(/unstamped build placeholder/);
  });

  it('rejects a service worker that omits the hashed main bundle', () => {
    const fixture = makeValidFixture();
    write(fixture.root, 'desktop/app-build/sw.js', [
      "const CACHE_NAME = 'alloflow-v123456789';",
      'const PRECACHE_PATHS = ["./index.html","./alloflow_desktop_bridge.js","./static/css/main.5678cdef.css"];',
      'const scopedUrl = (relativePath) => new URL(relativePath, self.registration.scope).toString();',
      "const SHELL_URL = scopedUrl('./index.html');",
    ].join('\n'));
    expect(() => validateDesktopAppBuild({
      repoRoot: fixture.root,
      appBuildDir: fixture.appBuild,
    })).toThrow(/does not precache .*main\.1234abcd\.js/);
  });

  it('rejects a hosted Firebase project compiled into the desktop main bundle', () => {
    const fixture = makeValidFixture();
    const unsafeEnv = {
      ...DESKTOP_REACT_ENV,
      REACT_APP_PROJECT_ID: 'hosted-school-project',
    };
    const injectedEnv = Object.entries(unsafeEnv)
      .map(([name, value]) => `${name}:${JSON.stringify(value)}`)
      .join(',');
    write(
      fixture.root,
      'desktop/app-build/static/js/main.1234abcd.js',
      `const compiledEnv={${injectedEnv}};\n`
    );
    expect(() => validateDesktopAppBuild({
      repoRoot: fixture.root,
      appBuildDir: fixture.appBuild,
    })).toThrow(/REACT_APP_PROJECT_ID=""; found \["hosted-school-project"\]/);
  });
});
