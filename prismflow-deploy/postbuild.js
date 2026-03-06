/**
 * Post-build script: INLINES EVERYTHING into a single self-contained HTML.
 * 
 * Problem: Chrome's network pipeline to prismflow-911fe.web.app is completely
 * broken on reload - even the HTML document request hangs with "Provisional 
 * headers are shown" and 0 bytes transferred. The ONLY reason the loading 
 * screen appears is because Chrome has a cached version.
 * 
 * Fix: Inline ALL assets (CSS + JS) into the HTML file itself, and use
 * stale-while-revalidate caching so Chrome serves the cached self-contained
 * page immediately on reload. Since everything is inline, zero additional
 * network requests are needed.
 */
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, 'build');
const htmlPath = path.join(buildDir, 'index.html');

let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Find and inline the CSS file
const cssMatch = html.match(/<link href="(\/static\/css\/[^"]+\.css)" rel="stylesheet">/);
if (cssMatch) {
    const cssPath = path.join(buildDir, cssMatch[1]);
    if (fs.existsSync(cssPath)) {
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        html = html.replace(cssMatch[0], '<style>' + cssContent + '</style>');
        console.log('✓ Inlined CSS (' + (cssContent.length / 1024).toFixed(1) + ' KB)');
    }
}

// 2. Find and inline the JS file
const jsMatch = html.match(/<script defer="defer" src="(\/static\/js\/[^"]+\.js)"><\/script>/);
if (jsMatch) {
    const jsPath = path.join(buildDir, jsMatch[1]);
    if (fs.existsSync(jsPath)) {
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        // Use a deferred inline approach: put JS at the end of body
        // Remove the script tag from head
        html = html.replace(jsMatch[0], '');
        // Add inline script at the end of body, before </body>
        html = html.replace('</body>', '<script>' + jsContent + '</script></body>');
        console.log('✓ Inlined JS (' + (jsContent.length / 1024).toFixed(1) + ' KB)');
    }
} else {
    console.log('⚠ No deferred JS tag found - checking for dynamic loader...');
    // If postbuild was run before, there might be the dynamic loader instead
    // Let's find the JS file directly
    const jsDir = path.join(buildDir, 'static', 'js');
    if (fs.existsSync(jsDir)) {
        const jsFiles = fs.readdirSync(jsDir).filter(f => f.startsWith('main.') && f.endsWith('.js') && !f.endsWith('.map'));
        if (jsFiles.length > 0) {
            const jsContent = fs.readFileSync(path.join(jsDir, jsFiles[0]), 'utf8');
            // Remove any existing dynamic loader script
            html = html.replace(/<script>\s*\(function\(\)\s*\{[\s\S]*?loadScript[\s\S]*?\}\)\(\);\s*<\/script>/, '');
            html = html.replace('</body>', '<script>' + jsContent + '</script></body>');
            console.log('✓ Inlined JS from', jsFiles[0], '(' + (jsContent.length / 1024).toFixed(1) + ' KB)');
        }
    }
}

const finalSize = Buffer.byteLength(html, 'utf8');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✓ Final HTML size:', (finalSize / 1024 / 1024).toFixed(2) + ' MB');
console.log('✓ Post-build complete: zero external resource requests needed');
