import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const { postbuild } = require('../desktop/web-app/postbuild.js');
const workerTemplate = fs.readFileSync('desktop/web-app/public/sw.js', 'utf8');
const directories = [];
const shell = '<!doctype html><html><head><link href="/static/css/main.12345678.css" rel="stylesheet">'
    + '<style>@font-face{src:url("./fonts/test.woff2")}</style>'
    + '<script id="alloflow-ai-backend-script" src="./ai_backend_module.js" defer></script>'
    + '<script src="/alloflow_update.js"></script>'
    + '<script src="/static/js/main.12345678.js" defer></script>'
    + '</head><body><div id="root"></div></body></html>';

function fixture() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-release-'));
    directories.push(directory);
    const buildDir = path.join(directory, 'build'), templateDir = path.join(directory, 'templates');
    fs.mkdirSync(templateDir);
    fs.mkdirSync(path.join(buildDir, 'static/js'), { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'static/css'), { recursive: true });
    fs.mkdirSync(path.join(buildDir, 'fonts'), { recursive: true });
    fs.writeFileSync(path.join(templateDir, 'sw.js'), workerTemplate);
    fs.writeFileSync(path.join(templateDir, 'alloflow_desktop_bridge.js'), '/* bridge */');
    fs.writeFileSync(path.join(templateDir, 'alloflow_update.js'), '/* update manager */');
    fs.writeFileSync(path.join(buildDir, 'index.html'), shell);
    fs.writeFileSync(path.join(buildDir, 'static/js/main.12345678.js'), 'loadModule("Lab","https://alloflow-cdn.pages.dev/lab.js?v=release-a");');
    fs.writeFileSync(path.join(buildDir, 'static/css/main.12345678.css'), 'body{color:black}');
    fs.writeFileSync(path.join(buildDir, 'ai_backend_module.js'), '/* backend */');
    fs.writeFileSync(path.join(buildDir, 'fonts/test.woff2'), 'font bytes');
    return {
        buildDir, templateDir,
        run: (now = 1000, options = {}) => postbuild({ buildDir, templateDir, now: () => now, ...options }),
        read: name => fs.readFileSync(path.join(buildDir, name), 'utf8'),
        write: (name, value) => fs.writeFileSync(path.join(buildDir, name), value)
    };
}

function workerHarness(source, fetchShell) {
    const events = new Map(), put = vi.fn(() => Promise.resolve()), skipWaiting = vi.fn();
    const self = { registration: { scope: 'https://example.test/app/' }, addEventListener: (name, handler) => events.set(name, handler), skipWaiting };
    vm.runInNewContext(source, {
        self, URL, Response, console: { log() {} },
        caches: { open: async () => ({ put }) },
        fetch: async url => new Response(url.endsWith('/index.html') ? fetchShell : '/* asset */')
    });
    return { events, put, skipWaiting };
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    for (const directory of directories.splice(0)) {
        if (!path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep)
            || !path.basename(directory).startsWith('alloflow-release-')) throw new Error('Unexpected fixture cleanup path');
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

describe('desktop module content in the app release identity', () => {
    const environmentKey = 'ALLOFLOW_DESKTOP_BUILD_INPUT_FINGERPRINT';
    const firstFingerprint = 'a'.repeat(64), secondFingerprint = 'b'.repeat(64);
    const withFingerprint = fingerprint => ({ desktopBuildInputFingerprint: fingerprint });

    beforeEach(() => {
        vi.stubEnv(environmentKey, undefined);
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('changes the worker release when a dynamic module changes while the compiled shell stays identical', () => {
        const app = fixture();
        fs.mkdirSync(path.join(app.buildDir, 'stem_lab'));
        app.write('stem_lab/stem_tool_flightsim.js', '/* original mission implementation */');
        const fingerprint = () => createHash('sha256').update(app.read('stem_lab/stem_tool_flightsim.js')).digest('hex');
        const shellMain = app.read('static/js/main.12345678.js');
        const initial = app.run(1000, withFingerprint(fingerprint()));
        const initialWorker = app.read('sw.js');

        // This lazy-loaded file is absent from HTML and the compiled main JS.
        // The desktop builder supplies its content through the input fingerprint.
        app.write('stem_lab/stem_tool_flightsim.js', '/* corrected mission implementation */');
        const changedFingerprint = fingerprint();
        const changed = app.run(2000, withFingerprint(changedFingerprint));
        expect(app.read('static/js/main.12345678.js')).toBe(shellMain);
        expect(changed.releaseId).not.toBe(initial.releaseId);
        expect(changed.releaseBuiltAt).toBe(2000);
        expect(app.read('sw.js')).not.toBe(initialWorker);
        const changedWorker = app.read('sw.js');
        expect(app.run(3000, withFingerprint(changedFingerprint))).toEqual(changed);
        expect(app.read('sw.js')).toBe(changedWorker);
    });

    it('keeps identical desktop inputs stable across clean builds and timestamp-only reruns', () => {
        const first = fixture(), second = fixture();
        const initial = first.run(1000, withFingerprint(firstFingerprint));
        expect(second.run(2000, withFingerprint(firstFingerprint)).releaseId).toBe(initial.releaseId);
        expect(first.run(3000, withFingerprint(firstFingerprint))).toEqual(initial);
    });

    it('preserves the ordinary hosted identity when the optional desktop fingerprint is absent', () => {
        const app = fixture(), ordinary = app.run(1000);
        expect(app.run(2000, withFingerprint(firstFingerprint)).releaseId).not.toBe(ordinary.releaseId);
        expect(app.run(3000).releaseId).toBe(ordinary.releaseId);
    });

    it('accepts the desktop environment input while giving an explicit option precedence', () => {
        const expectedFirst = fixture().run(1000, withFingerprint(firstFingerprint));
        const expectedSecond = fixture().run(1000, withFingerprint(secondFingerprint));
        vi.stubEnv(environmentKey, secondFingerprint);
        expect(fixture().run().releaseId).toBe(expectedSecond.releaseId);
        vi.stubEnv(environmentKey, 'invalid-environment-fingerprint');
        expect(fixture().run(1000, withFingerprint(firstFingerprint)).releaseId).toBe(expectedFirst.releaseId);
        vi.stubEnv(environmentKey, firstFingerprint);
        expect(() => fixture().run(1000, withFingerprint('invalid-option'))).toThrow(/fingerprint/i);
    });

    it.each(['', 'short', 'A'.repeat(64), 'g'.repeat(64), 42, {}, null])('rejects invalid desktop input without writing a release: %j', fingerprint => {
        const app = fixture(), initialHtml = app.read('index.html');
        expect(() => app.run(1000, withFingerprint(fingerprint))).toThrow(/fingerprint/i);
        expect(app.read('index.html')).toBe(initialHtml);
        expect(fs.existsSync(path.join(app.buildDir, 'sw.js'))).toBe(false);
    });

    it.each(['', 'short', 'A'.repeat(64)])('rejects invalid desktop environment input before writing: %j', fingerprint => {
        const app = fixture(), initialHtml = app.read('index.html');
        vi.stubEnv(environmentKey, fingerprint);
        expect(() => app.run()).toThrow(/fingerprint/i);
        expect(app.read('index.html')).toBe(initialHtml);
        expect(fs.existsSync(path.join(app.buildDir, 'sw.js'))).toBe(false);
    });
});

describe('app release identity', () => {
    it('keeps the identity stable across clean identical builds with different timestamps', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const first = fixture().run(1000), second = fixture().run(2000);
        expect(first.releaseId).toMatch(/^[a-f0-9]{64}$/);
        expect(second.releaseId).toBe(first.releaseId);
        expect(second.releaseBuiltAt).toBe(2000);
    });

    it('reruns postbuild with an already-pinned backend without changing metadata or worker bytes', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const app = fixture(), initial = app.run(1000);
        const initialHtml = app.read('index.html'), initialWorker = app.read('sw.js');
        const backendPin = createHash('sha256').update(app.read('ai_backend_module.js')).digest('hex').slice(0, 8);
        expect(initialHtml).toContain('src="./ai_backend_module.js?v=' + backendPin + '"');
        expect(app.run(3000)).toEqual(initial);
        expect(app.read('index.html')).toBe(initialHtml);
        expect(app.read('sw.js')).toBe(initialWorker);
        expect(initialHtml.indexOf('window.__alloReleaseId')).toBeLessThan(initialHtml.indexOf('src="/alloflow_update.js"'));
        expect(initialWorker).toContain("'" + initial.releaseId + "'");
        expect(initialWorker).toContain('const RELEASE_BUILT_AT = 1000;');
        expect(initialWorker).toContain('"./alloflow_update.js"');
    });

    it('rejects an unexpected backend preload URL before writing release metadata', () => {
        const app = fixture();
        const unexpected = shell.replace('src="./ai_backend_module.js"', 'src="https://example.test/backend.js"');
        app.write('index.html', unexpected);
        expect(() => app.run()).toThrow('AI backend preload has an unexpected src');
        expect(app.read('index.html')).toBe(unexpected);
    });

    it.each([
        ['static/js/main.12345678.js', 'loadModule("Lab","https://alloflow-cdn.pages.dev/lab.js?v=release-b");'],
        ['static/css/main.12345678.css', 'body{color:purple}'],
        ['ai_backend_module.js', '/* new backend */'],
        ['alloflow_update.js', '/* new update manager */'],
        ['fonts/test.woff2', 'new font bytes'],
        ['index.html', shell.replace('<body>', '<body class="new-layout">')]
    ])('changes identity when %s changes, including dynamic CDN pins', (file, content) => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const app = fixture(), initial = app.run(1000);
        app.write(file, content);
        const changed = app.run(2000);
        expect(changed.releaseId).not.toBe(initial.releaseId);
        expect(changed.releaseBuiltAt).toBe(2000);
    });

    it('includes worker behavior and restores omitted support assets from templates', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const app = fixture(), initial = app.run(1000);
        expect(app.read('alloflow_update.js')).toBe('/* update manager */');
        fs.appendFileSync(path.join(app.templateDir, 'sw.js'), '\n// changed worker behavior\n');
        expect(app.run(2000).releaseId).not.toBe(initial.releaseId);
    });

    it('reports worker release metadata through the request MessagePort without activating', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const app = fixture(), release = app.run();
        const { events, skipWaiting } = workerHarness(app.read('sw.js'), app.read('index.html'));
        const postMessage = vi.fn();
        events.get('message')({ data: { type: 'ALLOFLOW_GET_RELEASE' }, ports: [{ postMessage }] });
        expect(postMessage).toHaveBeenCalledWith({ type: 'ALLOFLOW_RELEASE', ...release });
        expect(skipWaiting).not.toHaveBeenCalled();
    });

    it('only installs a release when the fetched HTML belongs to that worker', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const app = fixture(); app.run();
        for (const [html, accepted] of [[app.read('index.html'), true], [shell, false],
            [app.read('index.html').replace(/window\.__alloReleaseId="[^"]+"/, 'window.__alloReleaseId="ffff"'), false]]) {
            const { events, put } = workerHarness(app.read('sw.js'), html);
            let install;
            events.get('install')({ waitUntil: promise => { install = promise; } });
            if (accepted) {
                await expect(install).resolves.toBeDefined();
                expect(put).toHaveBeenCalledWith('https://example.test/app/index.html', expect.any(Response));
            } else {
                await expect(install).rejects.toThrow('shell release does not match worker');
                expect(put.mock.calls.some(([url]) => url.endsWith('/index.html'))).toBe(false);
            }
        }
    });
});
