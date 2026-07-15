/**
 * Post-build: keep the HTML shell small and preserve CRA's content-hashed
 * JavaScript/CSS as separate files. The service worker precaches the complete
 * shell atomically, so repeat launches and offline recovery remain reliable
 * without reparsing a multi-megabyte HTML document.
 */
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, 'build');
const htmlPath = path.join(buildDir, 'index.html');
const swPath = path.join(buildDir, 'sw.js');

let html = fs.readFileSync(htmlPath, 'utf8');
// Relative asset URLs work at both / and the published /app/ scope.
html = html.replace(/(["'])\/static\//g, '$1./static/');

const assetMatches = Array.from(html.matchAll(/["'](\.\/static\/(?:js|css)\/[^"']+\.(?:js|css))["']/g));
const assetPaths = Array.from(new Set(assetMatches.map(match => match[1])));
const mainJs = assetPaths.find(asset => /^\.\/static\/js\/main\.[a-f0-9]+\.js$/.test(asset));
const mainCss = assetPaths.find(asset => /^\.\/static\/css\/main\.[a-f0-9]+\.css$/.test(asset));
if (!mainJs || !mainCss) throw new Error('Hashed main JS/CSS assets were not found in build/index.html');

for (const asset of assetPaths) {
    const filePath = path.join(buildDir, asset.replace(/^\.\//, ''));
    if (!fs.existsSync(filePath)) throw new Error('Referenced build asset is missing: ' + asset);
}

fs.writeFileSync(htmlPath, html, 'utf8');
const htmlBytes = Buffer.byteLength(html, 'utf8');
console.log('✓ Split shell HTML:', (htmlBytes / 1024).toFixed(1) + ' KB');
console.log('✓ Preserved hashed assets:', assetPaths.join(', '));

if (!fs.existsSync(swPath)) throw new Error('build/sw.js is missing');
const desktopBridgePath = path.join(buildDir, 'alloflow_desktop_bridge.js');
if (!fs.existsSync(desktopBridgePath)) {
    throw new Error('build/alloflow_desktop_bridge.js is missing');
}
const buildTs = Date.now();
let swContent = fs.readFileSync(swPath, 'utf8');
if (!swContent.includes('__BUILD_TS__')) throw new Error('Service-worker build timestamp placeholder is missing');
if (!swContent.includes('__PRECACHE_PATHS__')) throw new Error('Service-worker precache placeholder is missing');
swContent = swContent
    .replace(/__BUILD_TS__/g, String(buildTs))
    .replace('__PRECACHE_PATHS__', JSON.stringify(['./index.html', './alloflow_desktop_bridge.js', ...assetPaths]));
fs.writeFileSync(swPath, swContent, 'utf8');
console.log('✓ SW stamped: CACHE_NAME = alloflow-v' + buildTs);
console.log('✓ Post-build complete: split shell assets are precached for offline/repeat launch');