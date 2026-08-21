import { createHash, webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const {
    buildMailboxScriptSourceModule,
    buildMailboxScriptInlineFallback,
} = require(path.join(ROOT, '_build_mailbox_script_source_module.js'));

const canonicalSource = fs.readFileSync(path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs'), 'utf8');
const publicSource = fs.readFileSync(path.join(ROOT, 'desktop', 'web-app', 'public', 'apps_script', 'session_mailbox', 'Code.gs'), 'utf8');
const rootModuleSource = fs.readFileSync(path.join(ROOT, 'mailbox_script_source_module.js'), 'utf8');
const publicModuleSource = fs.readFileSync(path.join(ROOT, 'desktop', 'web-app', 'public', 'mailbox_script_source_module.js'), 'utf8');
const hostSource = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const buildSource = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8');

const canonicalVersion = Number((canonicalSource.match(/var VERSION = (\d+);/) || [])[1]);
const canonicalSha256 = createHash('sha256').update(canonicalSource, 'utf8').digest('hex');
const canonicalBytes = Buffer.byteLength(canonicalSource, 'utf8');

function stringConstant(source, name) {
    const match = source.match(new RegExp("const " + name + " = '([^']*)';"));
    if (!match) throw new Error('string constant not found: ' + name);
    return match[1];
}

function numberConstant(source, name) {
    const match = source.match(new RegExp('const ' + name + ' = (\\d+);'));
    if (!match) throw new Error('number constant not found: ' + name);
    return Number(match[1]);
}

function sliceBetween(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    if (start === -1) throw new Error('start marker not found: ' + startMarker);
    const end = source.indexOf(endMarker, start);
    if (end === -1) throw new Error('end marker not found: ' + endMarker);
    return source.slice(start, end);
}

function executeModule(source, initialModules = {}) {
    const logs = [];
    const sandbox = {
        window: { AlloModules: initialModules },
        console: { log: message => logs.push(message) },
    };
    vm.runInNewContext(source, sandbox, { filename: 'mailbox_script_source_module.js' });
    return { modules: sandbox.window.AlloModules, logs };
}

describe('mailbox script source extraction', () => {
    it('keeps Code.gs, both generated module mirrors, and builder output byte-identical', () => {
        expect(publicSource).toBe(canonicalSource);
        expect(rootModuleSource).toBe(publicModuleSource);
        expect(buildMailboxScriptSourceModule(canonicalSource)).toBe(rootModuleSource);

        const { modules, logs } = executeModule(rootModuleSource);
        const registered = modules.MailboxScriptSource;
        expect(registered.source).toBe(canonicalSource);
        expect(registered.version).toBe(canonicalVersion);
        expect(registered.sha256).toBe(canonicalSha256);
        expect(Buffer.byteLength(registered.source, 'utf8')).toBe(canonicalBytes);
        expect(Object.isFrozen(registered)).toBe(true);
        expect(logs).toContain('[CDN] MailboxScriptSource loaded');
    });

    it('preserves a matching registration but replaces stale or malformed entries', () => {
        const matching = Object.freeze({ source: 'already-loaded', version: canonicalVersion, sha256: canonicalSha256 });
        const { modules, logs } = executeModule(rootModuleSource, { MailboxScriptSource: matching });
        expect(modules.MailboxScriptSource).toBe(matching);
        expect(logs).toContain('[CDN] MailboxScriptSource already loaded, skipping');
        expect(logs).not.toContain('[CDN] MailboxScriptSource loaded');

        const staleEntries = [
            Object.freeze({ source: 'old-version', version: canonicalVersion - 1, sha256: canonicalSha256 }),
            Object.freeze({ source: 'wrong-hash', version: canonicalVersion, sha256: '0'.repeat(64) }),
            Object.freeze({ malformed: true }),
        ];
        staleEntries.forEach(previous => {
            const result = executeModule(rootModuleSource, { MailboxScriptSource: previous });
            expect(result.modules.MailboxScriptSource).not.toBe(previous);
            expect(result.modules.MailboxScriptSource.source).toBe(canonicalSource);
            expect(result.modules.MailboxScriptSource.version).toBe(canonicalVersion);
            expect(result.modules.MailboxScriptSource.sha256).toBe(canonicalSha256);
            expect(result.logs).toContain('[CDN] MailboxScriptSource loaded');
            expect(result.logs).not.toContain('[CDN] MailboxScriptSource already loaded, skipping');
        });
    });

    it('keeps the deterministic gzip fallback byte-identical to Code.gs and its metadata', () => {
        const hostFallback = stringConstant(hostSource, 'ALLO_MB_SCRIPT_FALLBACK_GZIP');
        const builtFallback = buildMailboxScriptInlineFallback(canonicalSource);

        expect(hostFallback).toBe(builtFallback);
        expect(gunzipSync(Buffer.from(hostFallback, 'base64')).toString('utf8')).toBe(canonicalSource);
        expect(numberConstant(hostSource, 'ALLO_MB_SCRIPT_VERSION')).toBe(canonicalVersion);
        expect(numberConstant(hostSource, 'ALLO_MB_SCRIPT_BYTES')).toBe(canonicalBytes);
        expect(stringConstant(hostSource, 'ALLO_MB_SCRIPT_SHA256')).toBe(canonicalSha256);
        expect(Buffer.byteLength(hostFallback, 'utf8')).toBeLessThan(canonicalBytes / 2);
    });

    it('rejects stale, mislabeled, and tampered sources before exposing copy state', async () => {
        const validatorSource = sliceBetween(
            hostSource,
            'const _alloValidateMailboxScriptSource = async (candidate) => {',
            'const _alloDecodeMailboxScriptFallback = async () => {',
        );
        const validator = vm.runInNewContext(
            [
                'const ALLO_MB_SCRIPT_VERSION = ' + canonicalVersion + ';',
                "const ALLO_MB_SCRIPT_SHA256 = '" + canonicalSha256 + "';",
                'const ALLO_MB_SCRIPT_BYTES = ' + canonicalBytes + ';',
                validatorSource,
                '_alloValidateMailboxScriptSource;',
            ].join('\n'),
            { TextEncoder, crypto: webcrypto },
        );
        const valid = { source: canonicalSource, version: canonicalVersion, sha256: canonicalSha256 };

        await expect(validator(valid)).resolves.toBe(canonicalSource);
        await expect(validator({ ...valid, version: canonicalVersion - 1 })).resolves.toBe('');
        await expect(validator({ ...valid, sha256: '0'.repeat(64) })).resolves.toBe('');
        await expect(validator({ ...valid, source: canonicalSource.replace('var VERSION', 'var VERSI0N') })).resolves.toBe('');
        await expect(validator({ ...valid, source: canonicalSource.slice(0, -1) + 'x' })).resolves.toBe('');
    });

    it('registers the module in build inputs and queues it through the shared loader', () => {
        expect(buildSource.match(/name: 'MailboxScriptSource'/g)).toHaveLength(2);
        expect(buildSource).toContain("filename: 'mailbox_script_source_module.js'");
        expect(buildSource).toContain("srcPath: path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs')");
        expect(buildSource).toContain("modPath: path.join(ROOT, 'mailbox_script_source_module.js')");
        expect(buildSource).toContain("publicPath: path.join(ROOT, 'desktop/web-app', 'public', 'mailbox_script_source_module.js')");
        expect(buildSource).toContain("require('./_build_mailbox_script_source_module.js').buildMailboxScriptSourceModule(src)");
        expect(hostSource).toMatch(/loadModule\('MailboxScriptSource', 'https:\/\/alloflow-cdn\.pages\.dev\/mailbox_script_source_module\.js(?:\?v=[a-z0-9]+)?'\)/);
        expect(hostSource).toContain("window.dispatchEvent(new CustomEvent('alloflow:module-registry-changed'))");
    });

    it('hydrates validated module, cache, then fallback state in priority order', () => {
        const hydration = sliceBetween(
            hostSource,
            "const [mailboxScriptState, setMailboxScriptState] = useState",
            '// child views using window.AlloIcons',
        );
        const moduleAt = hydration.indexOf("await commit(runtime, 'module')");
        const cacheAt = hydration.indexOf("await commit({ source: cached");
        const fallbackAt = hydration.indexOf("await commit({ source, version: ALLO_MB_SCRIPT_VERSION");
        const errorAt = hydration.indexOf("status: 'error'");

        expect(moduleAt).toBeGreaterThan(-1);
        expect(cacheAt).toBeGreaterThan(moduleAt);
        expect(fallbackAt).toBeGreaterThan(cacheAt);
        expect(errorAt).toBeGreaterThan(fallbackAt);
        expect(hydration.indexOf('_alloValidateMailboxScriptSource(candidate)')).toBeLessThan(
            hydration.indexOf('localStorage.setItem(cacheKey, source)'),
        );
        expect(hydration).toContain("const cacheKey = 'alloflow_mailbox_script_' + ALLO_MB_SCRIPT_SHA256");
        expect(hydration).toContain("window.addEventListener('alloflow:module-registry-changed', onModuleChange)");
        expect(hydration).toContain("window.removeEventListener('alloflow:module-registry-changed', onModuleChange)");
        expect(hydration).toContain('cancelled = true;');
        expect(hydration).toContain('}, [mailboxScriptRetry]);');
    });

    it('copies only ready validated state and exposes loading, failure, and retry semantics', () => {
        const copyHelpers = sliceBetween(
            hostSource,
            'const copyMailboxScriptSource = async () => {',
            'const [isProcessing, setIsProcessing] = useState(false);',
        );

        expect(copyHelpers).toContain("mailboxScriptState.status !== 'ready' || !mailboxScriptState.source");
        expect(copyHelpers).toContain("typeof window.alloCopyText === 'function'");
        expect(copyHelpers).toContain('if (await window.alloCopyText(mailboxScriptState.source))');
        expect(copyHelpers).toContain("addToast(t('toasts.copied'), 'success')");
        expect(copyHelpers).toContain("addToast(t('toasts.copy_failed'), 'error')");
        expect(copyHelpers).toContain("mailboxScriptState.status === 'loading'");
        expect(copyHelpers).toContain("setMailboxScriptState({ status: 'loading', source: '', origin: '' })");
        expect(copyHelpers).toContain('setMailboxScriptRetry(value => value + 1)');
        expect(copyHelpers).toContain('window.__alloRetryFailedModules?.()');

        expect(hostSource).not.toContain('copyToClipboard(ALLO_MB_SCRIPT_SOURCE)');
        expect(hostSource.match(/onClick=\{copyMailboxScriptSource\}/g)?.length || 0).toBeGreaterThanOrEqual(2);
        expect(hostSource.match(/disabled=\{mailboxScriptState\.status !== 'ready'\}/g)?.length || 0).toBeGreaterThanOrEqual(2);
        expect(hostSource).toContain("mailboxScriptState.status === 'loading'");
        expect(hostSource).toContain("mailboxScriptState.status === 'error'");
        expect(hostSource).toContain('onClick={retryMailboxScriptSource}');
    });

    it('fails builder generation when Code.gs is empty or missing VERSION', () => {
        expect(() => buildMailboxScriptSourceModule('')).toThrow(/empty or missing VERSION/);
        expect(() => buildMailboxScriptSourceModule('function doGet() {}')).toThrow(/empty or missing VERSION/);
    });
});
