import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  DESKTOP_REACT_ENV,
  MODULE_CONTRACTS,
  validateDesktopAppBuild,
} = require('../desktop/scripts/check-desktop-app-build.cjs');
const {
  BUILD_INPUT_FINGERPRINT_FILE,
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
    rmSync(temporaryRoots.pop(), { recursive: true, force: true });
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
