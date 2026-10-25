/**
 * Preserve CRA's content-hashed assets and identify the complete app release.
 * A wall-clock build time orders releases, but never defines whether the app
 * has changed: rebuilding identical content must not display an update.
 */
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { assertBuiltDelivery } = require('../../dev-tools/build_browser_delivery_manifest.cjs');
const { assertOptionalHost } = require('../../dev-tools/build_optional_browser_delivery_policy.cjs');
const { assertRuntimeHost } = require('../../dev-tools/build_runtime_graph_delivery_policy.cjs');

const releaseScriptPattern = /<script\b[^>]*\bid=["']alloflow-release["'][^>]*>[\s\S]*?<\/script>/i;
const MAX_RELEASE_ASSET_BYTES = 64 * 1024 * 1024;

function normalizeShellHtml(html) {
    return html
        .replace(/(<(?:script|link)\b[^>]*\b(?:src|href)=["'])\/(?!\/)/gi, '$1./')
        .replace(/navigator\.serviceWorker\.register\(\s*(["'])(?:\/|\.\/)?sw\.js\1\s*(?:,\s*\{([^{}]*)\})?\s*\)/g, (expression, quote, options) => {
            const normalized = (options || '').replace(/\s/g, '');
            if (normalized && !/^(?:scope:["']\.\/["'],)?updateViaCache:["']none["'](?:,scope:["']\.\/["'])?,?$/.test(normalized)) {
                throw new Error('Service-worker registration has unsupported shell options');
            }
            return "navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })";
        });
}

function assetBytes(buildDir, reference) {
    const relative = reference.split(/[?#]/, 1)[0];
    const file = path.resolve(buildDir, relative);
    if (!file.startsWith(path.resolve(buildDir) + path.sep)) throw new Error('Asset escapes build directory: ' + reference);
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > MAX_RELEASE_ASSET_BYTES) throw new Error('Release asset is not a bounded file: ' + reference);
    return fs.readFileSync(file);
}

function integrityRecord(bytes) {
    return { sha384: createHash('sha384').update(bytes).digest('hex'), bytes: bytes.length };
}

function staticCodePaths(buildDir) {
    const assets = [];
    const visit = relative => {
        const directory = path.join(buildDir, relative);
        if (!fs.existsSync(directory)) return;
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const asset = relative + '/' + entry.name;
            if (entry.isSymbolicLink()) throw new Error('Generated static assets must not be symbolic links: ' + asset);
            if (entry.isDirectory()) visit(asset);
            else if (entry.isFile() && /\.(?:js|css)$/i.test(asset)) assets.push('./' + asset);
        }
    };
    visit('static/js'); visit('static/css');
    return assets.sort();
}

function postbuild(options = {}) {
    const desktopBuildInputFingerprint = Object.prototype.hasOwnProperty.call(options, 'desktopBuildInputFingerprint')
        ? options.desktopBuildInputFingerprint : process.env.ALLOFLOW_DESKTOP_BUILD_INPUT_FINGERPRINT;
    if (desktopBuildInputFingerprint !== undefined
        && (typeof desktopBuildInputFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(desktopBuildInputFingerprint))) {
        throw new Error('Desktop build input fingerprint must be a 64-character lowercase SHA-256 value');
    }
    // Desktop packaging supplies an isolated BUILD_PATH so it cannot overwrite
    // the hosted artifact produced by deploy.sh.
    const buildDir = options.buildDir || (process.env.BUILD_PATH
        ? path.resolve(__dirname, process.env.BUILD_PATH)
        : path.join(__dirname, 'build'));
    const templateDir = options.templateDir || path.join(__dirname, 'public');
    // Explicit isolated fixtures can exercise release stamping without claiming
    // that they contain the full application. The real CLI always validates the
    // trusted App.jsx manifest and all copied dynamic module bytes; no environment
    // variable can disable this gate.
    const isolatedFixture = Object.prototype.hasOwnProperty.call(options, 'buildDir')
        && Object.prototype.hasOwnProperty.call(options, 'templateDir');
    const delivery = !isolatedFixture || Object.prototype.hasOwnProperty.call(options, 'deliveryRoot')
        ? assertBuiltDelivery({
            root: options.deliveryRoot || path.resolve(__dirname, '../..'),
            buildDir,
            hostFile: options.deliveryHostFile || 'desktop/web-app/src/App.jsx',
        }) : null;
    const optionalDelivery = !isolatedFixture || Object.prototype.hasOwnProperty.call(options, 'optionalDeliveryRoot')
        ? assertOptionalHost({ root: options.optionalDeliveryRoot || path.resolve(__dirname, '../..'), buildDir,
            hostFile: options.deliveryHostFile || 'desktop/web-app/src/App.jsx' }) : null;
    const optionalPaths = optionalDelivery ? optionalDelivery.records.map(record => './' + record.asset) : [];
    const runtimeDelivery = !isolatedFixture || Object.prototype.hasOwnProperty.call(options, 'runtimeDeliveryRoot')
        ? assertRuntimeHost({ root: options.runtimeDeliveryRoot || path.resolve(__dirname, '../..'), buildDir,
            hostFile: options.deliveryHostFile || 'desktop/web-app/src/App.jsx' }) : null;
    const runtimePaths = runtimeDelivery ? runtimeDelivery.records.map(record => './' + record.asset) : [];
    const htmlPath = path.join(buildDir, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    const previousId = html.match(/window\.__alloReleaseId\s*=\s*["']([a-f0-9]+)["']/)?.[1];
    const previousBuiltAt = Number(html.match(/window\.__alloReleaseBuiltAt\s*=\s*(\d+)/)?.[1]);
    // Remove only our own generated metadata when postbuild is rerun.
    html = normalizeShellHtml(html.replace(releaseScriptPattern, ''));

    const assetPaths = Array.from(new Set(Array.from(
        html.matchAll(/["'](\.\/static\/(?:js|css)\/[^"']+\.(?:js|css))["']/g), match => match[1]
    )));
    if (!assetPaths.some(asset => /^\.\/static\/js\/main\.[a-f0-9]+\.js$/.test(asset))
        || !assetPaths.some(asset => /^\.\/static\/css\/main\.[a-f0-9]+\.css$/.test(asset))) {
        throw new Error('Hashed main JS/CSS assets were not found in build/index.html');
    }

    // OneDrive/CRA can omit these public files from an otherwise complete
    // isolated output. Restore missing files from the tracked templates.
    const supportPaths = ['./alloflow_desktop_bridge.js', './alloflow_update.js'];
    for (const asset of supportPaths) {
        const target = path.join(buildDir, asset);
        if (!fs.existsSync(target)) fs.copyFileSync(path.join(templateDir, asset), target);
    }

    // Pin the AI backend preload to its content (sha256-8), as the host pins its
    // CDN copy: a release that changes the reviewed search policy must not be
    // answered from a cached older module (tests/maine_sld_state_search_policy).
    html = html.replace(/<script\b[^>]*\bid=["']alloflow-ai-backend-script["'][^>]*>/i, (tag) => {
        const backendPath = path.join(buildDir, 'ai_backend_module.js');
        if (!fs.existsSync(backendPath)) throw new Error('AI backend preload has no ai_backend_module.js in the build');
        const version = createHash('sha256').update(fs.readFileSync(backendPath)).digest('hex').slice(0, 8);
        const backendSrc = /\bsrc=(["'])\.\/ai_backend_module\.js(?:\?v=[a-f0-9]+)?\1/;
        if (!backendSrc.test(tag)) throw new Error('AI backend preload has an unexpected src: ' + tag);
        return tag.replace(backendSrc, 'src=$1./ai_backend_module.js?v=' + version + '$1');
    });

    // The trusted HTML anchors boot code and styles even before a worker has
    // installed. A query stamp names a cache entry; SRI verifies its bytes.
    const bootPaths = new Set([...supportPaths, ...assetPaths]);
    html = html.replace(/<(script|link)\b[^>]*>/gi, (tag, kind) => {
        if (kind.toLowerCase() === 'link' && !/\brel=["'][^"']*\bstylesheet\b[^"']*["']/i.test(tag)) return tag;
        const attribute = kind.toLowerCase() === 'script' ? 'src' : 'href';
        const pattern = new RegExp('\\b' + attribute + '=(["\'])([^"\']+)\\1', 'i');
        const match = tag.match(pattern);
        if (!match || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(match[2])) return tag;
        const reference = match[2].replace(/^\//, './').split('#', 1)[0];
        const bytes = assetBytes(buildDir, reference);
        const sri = 'sha384-' + createHash('sha384').update(bytes).digest('base64');
        bootPaths.add(reference);
        return tag.replace(pattern, attribute + '="' + reference + '"')
            .replace(/\s(?:integrity|crossorigin)=(?:"[^"]*"|'[^']*')/gi, '')
            .replace(/>$/, ' integrity="' + sri + '" crossorigin="anonymous">');
    });

    // Main JS contains the version-pinned dynamic module/plugin URLs. Hashing
    // its bytes therefore includes CDN module releases, not just the HTML UI.
    // Also cover un-hashed local boot scripts, styles, and inline font URLs.
    const releaseAssets = new Set([...assetPaths, ...supportPaths, ...optionalPaths, ...runtimePaths]);
    // CRA's lazy chunks need approved digests too, without forcing every tool
    // to download during worker installation.
    const staticPaths = staticCodePaths(buildDir);
    for (const asset of staticPaths) releaseAssets.add(asset);
    const references = [
        ...Array.from(html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g), match => match[1]),
        ...Array.from(html.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g), match => match[1])
    ];
    for (const reference of references) {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) continue;
        const pathname = reference.split(/[?#]/, 1)[0].replace(/^\//, './');
        if (/\.(?:m?js|css|woff2?|png|jpe?g|svg|ico|json)$/i.test(pathname)) releaseAssets.add(pathname);
    }
    const swTemplate = fs.readFileSync(path.join(templateDir, 'sw.js'), 'utf8');
    for (const placeholder of ['__BUILD_TS__', '__RELEASE_ID__', '__PRECACHE_PATHS__', '__PRECACHE_DIGESTS__']) {
        if (!swTemplate.includes(placeholder)) throw new Error('Service-worker placeholder is missing: ' + placeholder);
    }
    const hash = createHash('sha256');
    const addContent = (name, bytes) => hash.update(name + '\0' + bytes.length + '\0').update(bytes);
    // Dynamic local modules need a new release cache even when the compiled
    // shell is unchanged. The desktop builder already hashes these inputs.
    if (desktopBuildInputFingerprint !== undefined) {
        addContent('desktop-build-input.sha256', Buffer.from(desktopBuildInputFingerprint));
    }
    addContent('index.html', Buffer.from(html));
    addContent('sw.js', Buffer.from(swTemplate));
    for (const asset of Array.from(releaseAssets).sort()) {
        addContent(asset, assetBytes(buildDir, asset));
    }
    const releaseId = hash.digest('hex');
    const releaseBuiltAt = previousId === releaseId && previousBuiltAt > 0
        ? previousBuiltAt : (options.now || Date.now)();
    const releaseScript = '<script id="alloflow-release">window.__alloReleaseId=' + JSON.stringify(releaseId)
        + ';window.__alloReleaseBuiltAt=' + releaseBuiltAt + ';</script>';
    if (!/<head\b[^>]*>/i.test(html)) throw new Error('Build HTML is missing its head element');
    // Metadata must exist before the update manager or any deferred app code.
    html = html.replace(/<head\b[^>]*>/i, match => match + releaseScript);

    // Hash the final HTML, including its release marker. Keeping this in the
    // emitted worker avoids a circular HTML/release identity and a fetched
    // manifest that could be changed together with the code it authenticates.
    const precachePaths = ['./index.html', ...bootPaths];
    // Runtime code/WASM/data is approved for lazy verified caching. It is not
    // a cold-start precache dependency and does not trigger model downloads.
    const precacheDigests = Object.fromEntries([...new Set([...precachePaths, ...staticPaths, ...optionalPaths, ...runtimePaths])].map(asset => [asset,
        integrityRecord(asset === './index.html' ? Buffer.from(html) : assetBytes(buildDir, asset))]));

    const swContent = swTemplate
        .replace(/__BUILD_TS__/g, String(releaseBuiltAt))
        .replace(/__RELEASE_ID__/g, releaseId)
        .replace('__PRECACHE_PATHS__', JSON.stringify(precachePaths))
        .replace('__PRECACHE_DIGESTS__', JSON.stringify(precacheDigests));
    fs.writeFileSync(htmlPath, html, 'utf8');
    fs.writeFileSync(path.join(buildDir, 'sw.js'), swContent, 'utf8');
    console.log('✓ Split shell HTML:', (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB');
    console.log('✓ Preserved hashed assets:', assetPaths.join(', '));
    console.log('✓ App release:', releaseId, '(built ' + releaseBuiltAt + ')');
    if (desktopBuildInputFingerprint !== undefined) console.log('✓ Desktop build inputs:', desktopBuildInputFingerprint);
    console.log('✓ Post-build complete: split shell assets are precached for offline/repeat launch');
    return { releaseId, releaseBuiltAt, deliveryValidated: delivery !== null, deliveryReleaseId: delivery?.releaseId || null,
        optionalDeliveryValidated: optionalDelivery !== null, optionalDeliveryId: optionalDelivery?.id || null,
        runtimeDeliveryValidated: runtimeDelivery !== null, runtimeDeliveryId: runtimeDelivery?.id || null };
}

function assertReleaseDigests(buildDir) {
    const root = path.resolve(buildDir);
    if (fs.lstatSync(root).isSymbolicLink() || !fs.statSync(root).isDirectory()) throw new Error('Release root must be a regular directory');
    const read = reference => {
        if (typeof reference !== 'string' || !reference.startsWith('./') || /[\s\\%#]/.test(reference)) throw new Error('Noncanonical release asset: ' + reference);
        const relative = reference.split('?', 1)[0].slice(2);
        const parts = relative.split('/');
        if (parts.some(part => !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(part) || ['__proto__', 'constructor', 'prototype'].includes(part))) throw new Error('Invalid release asset path: ' + reference);
        let file = root;
        for (const part of parts) {
            file = path.join(file, part);
            if (fs.lstatSync(file).isSymbolicLink()) throw new Error('Release asset traverses a symbolic link: ' + reference);
        }
        const stat = fs.statSync(file);
        if (!stat.isFile() || stat.size > MAX_RELEASE_ASSET_BYTES) throw new Error('Release asset is not a bounded regular file: ' + reference);
        return fs.readFileSync(file);
    };
    const worker = read('./sw.js').toString('utf8'), html = read('./index.html').toString('utf8');
    const jsonConstant = name => {
        const matches = [...worker.matchAll(new RegExp('^const ' + name + ' = ([^\\r\\n]+);[\\t ]*$', 'gm'))];
        if (matches.length !== 1) throw new Error('Worker must have one emitted ' + name + ' JSON constant');
        try {
            const parsed = JSON.parse(matches[0][1]);
            if (JSON.stringify(parsed) !== matches[0][1]) throw new Error('not canonical emitted JSON');
            return parsed;
        }
        catch (_) { throw new Error('Worker ' + name + ' must contain JSON only'); }
    };
    const records = jsonConstant('PRECACHE_DIGESTS'), precache = jsonConstant('PRECACHE_PATHS');
    if (!records || typeof records !== 'object' || Array.isArray(records)
        || !Object.keys(records).length || Object.keys(records).length > 10000) throw new Error('Invalid emitted release digest map');
    if (!Array.isArray(precache) || !precache.length || new Set(precache).size !== precache.length) throw new Error('Invalid emitted release precache paths');
    const has = key => Object.prototype.hasOwnProperty.call(records, key);
    const required = new Set(['./index.html', './alloflow_desktop_bridge.js', './alloflow_update.js', ...staticCodePaths(root), ...precache]);
    for (const tag of html.match(/<(?:script|link)\b[^>]*>/gi) || []) {
        if (/^<link\b/i.test(tag) && !/\brel=["'][^"']*\bstylesheet\b[^"']*["']/i.test(tag)) continue;
        const reference = tag.match(/\b(?:src|href)=(["'])([^"']+)\1/i)?.[2];
        if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) continue;
        required.add(reference);
        const sri = 'sha384-' + createHash('sha384').update(read(reference)).digest('base64');
        if (tag.match(/\bintegrity=(["'])([^"']+)\1/i)?.[2] !== sri
            || !/\bcrossorigin=["']anonymous["']/i.test(tag)) throw new Error('Boot asset SRI does not match final bytes: ' + reference);
    }
    for (const asset of required) if (!has(asset)) throw new Error('Required release digest is missing: ' + asset);
    for (const [asset, expected] of Object.entries(records)) {
        if (!expected || typeof expected !== 'object' || Array.isArray(expected)
            || Object.keys(expected).sort().join(',') !== 'bytes,sha384'
            || !Number.isSafeInteger(expected.bytes) || expected.bytes < 0 || expected.bytes > MAX_RELEASE_ASSET_BYTES
            || !/^[a-f0-9]{96}$/.test(expected.sha384)) throw new Error('Invalid emitted release digest record: ' + asset);
        const actual = integrityRecord(read(asset));
        if (actual.bytes !== expected.bytes || actual.sha384 !== expected.sha384) throw new Error('Final release asset bytes differ: ' + asset);
    }
    const release = [...worker.matchAll(/^const RELEASE_ID = ['"]([a-f0-9]{64})['"];[\t ]*$/gm)];
    const marker = html.match(/<script\b[^>]*\bid=["']alloflow-release["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
    if (release.length !== 1 || marker?.match(/window\.__alloReleaseId=["']([a-f0-9]{64})["']/)?.[1] !== release[0][1]) throw new Error('Final shell release does not match its worker');
    return { checkedFiles: Object.keys(records).length, releaseId: release[0][1] };
}

if (require.main === module) postbuild();
module.exports = { postbuild, normalizeShellHtml, assertReleaseDigests };
