/**
 * Preserve CRA's content-hashed assets and identify the complete app release.
 * A wall-clock build time orders releases, but never defines whether the app
 * has changed: rebuilding identical content must not display an update.
 */
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const releaseScriptPattern = /<script\b[^>]*\bid=["']alloflow-release["'][^>]*>[\s\S]*?<\/script>/i;

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
    const htmlPath = path.join(buildDir, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    const previousId = html.match(/window\.__alloReleaseId\s*=\s*["']([a-f0-9]+)["']/)?.[1];
    const previousBuiltAt = Number(html.match(/window\.__alloReleaseBuiltAt\s*=\s*(\d+)/)?.[1]);
    // Remove only our own generated metadata when postbuild is rerun.
    html = html.replace(releaseScriptPattern, '').replace(/(["'])\/static\//g, '$1./static/');

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

    // Main JS contains the version-pinned dynamic module/plugin URLs. Hashing
    // its bytes therefore includes CDN module releases, not just the HTML UI.
    // Also cover un-hashed local boot scripts, styles, and inline font URLs.
    const releaseAssets = new Set([...assetPaths, ...supportPaths]);
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
    for (const placeholder of ['__BUILD_TS__', '__RELEASE_ID__', '__PRECACHE_PATHS__']) {
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
        const filePath = path.resolve(buildDir, asset);
        if (!filePath.startsWith(path.resolve(buildDir) + path.sep)) throw new Error('Asset escapes build directory: ' + asset);
        if (!fs.existsSync(filePath)) throw new Error('Referenced build asset is missing: ' + asset);
        addContent(asset, fs.readFileSync(filePath));
    }
    const releaseId = hash.digest('hex');
    const releaseBuiltAt = previousId === releaseId && previousBuiltAt > 0
        ? previousBuiltAt : (options.now || Date.now)();
    const releaseScript = '<script id="alloflow-release">window.__alloReleaseId=' + JSON.stringify(releaseId)
        + ';window.__alloReleaseBuiltAt=' + releaseBuiltAt + ';</script>';
    if (!/<head\b[^>]*>/i.test(html)) throw new Error('Build HTML is missing its head element');
    // Metadata must exist before the update manager or any deferred app code.
    html = html.replace(/<head\b[^>]*>/i, match => match + releaseScript);
    fs.writeFileSync(htmlPath, html, 'utf8');

    const swContent = swTemplate
        .replace(/__BUILD_TS__/g, String(releaseBuiltAt))
        .replace(/__RELEASE_ID__/g, releaseId)
        .replace('__PRECACHE_PATHS__', JSON.stringify(['./index.html', ...supportPaths, ...assetPaths]));
    fs.writeFileSync(path.join(buildDir, 'sw.js'), swContent, 'utf8');
    console.log('✓ Split shell HTML:', (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB');
    console.log('✓ Preserved hashed assets:', assetPaths.join(', '));
    console.log('✓ App release:', releaseId, '(built ' + releaseBuiltAt + ')');
    if (desktopBuildInputFingerprint !== undefined) console.log('✓ Desktop build inputs:', desktopBuildInputFingerprint);
    console.log('✓ Post-build complete: split shell assets are precached for offline/repeat launch');
    return { releaseId, releaseBuiltAt };
}

if (require.main === module) postbuild();
module.exports = { postbuild };
