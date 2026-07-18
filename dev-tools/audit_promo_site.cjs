'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const sharedPages = ['index.html', 'features.html', 'for-districts.html', 'library.html', 'students.html', 'calculator.html', 'accessibility_demo.html'];
const pages = sharedPages.concat(['launch.html', 'changelog.html']);
const errors = [];
const warnings = [];

function fail(file, message) {
    errors.push(file + ': ' + message);
}

function warn(file, message) {
    warnings.push(file + ': ' + message);
}

function textName(element) {
    return (element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent || '').replace(/\s+/g, ' ').trim();
}

function localTargetExists(file, rawValue) {
    if (!rawValue || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(rawValue)) return true;
    let value = rawValue.split('#')[0].split('?')[0];
    if (!value) return true;
    try {
        value = decodeURIComponent(value);
    } catch (_) {
        return false;
    }
    const resolved = value.startsWith('/')
        ? path.join(root, value.replace(/^[/\\]+/, ''))
        : path.resolve(root, path.dirname(file), value);
    return fs.existsSync(resolved);
}

for (const file of pages) {
    const absolute = path.join(root, file);
    const html = fs.readFileSync(absolute, 'utf8');
    const dom = new JSDOM(html);
    const document = dom.window.document;

    if ((document.documentElement.lang || '').toLowerCase() !== 'en') fail(file, 'expected html lang="en"');
    if (!document.querySelector('meta[name="viewport"]')) fail(file, 'missing viewport metadata');
    if (!document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()) fail(file, 'missing meta description');
    if (!document.title.trim()) fail(file, 'missing document title');
    if (document.querySelectorAll('h1').length !== 1) fail(file, 'expected exactly one h1');
    if (document.querySelectorAll('main').length !== 1) fail(file, 'expected exactly one main landmark');

    const ids = new Map();
    document.querySelectorAll('[id]').forEach(function (element) {
        const id = element.id;
        ids.set(id, (ids.get(id) || 0) + 1);
    });
    ids.forEach(function (count, id) {
        if (count > 1) fail(file, 'duplicate id "' + id + '"');
    });

    document.querySelectorAll('script:not([src])').forEach(function (script, index) {
        const type = (script.getAttribute('type') || '').toLowerCase();
        if (type && type !== 'text/javascript' && type !== 'application/javascript' && type !== 'module') return;
        try { new vm.Script(script.textContent, { filename: file + ':inline-script-' + (index + 1) }); }
        catch (error) { fail(file, 'inline script does not parse: ' + error.message); }
    });

    document.querySelectorAll('img').forEach(function (image) {
        if (!image.hasAttribute('alt')) fail(file, 'image missing alt attribute: ' + (image.getAttribute('src') || '(inline)'));
    });

    document.querySelectorAll('button').forEach(function (button) {
        if (!button.hasAttribute('type')) fail(file, 'button missing explicit type: ' + (textName(button) || '(unnamed)'));
        if (!textName(button)) fail(file, 'button has no accessible name');
    });

    document.querySelectorAll('a').forEach(function (link) {
        const href = link.getAttribute('href');
        if (!href) fail(file, 'anchor missing href: ' + (textName(link) || '(unnamed)'));
        if (!textName(link) && !link.querySelector('img[alt]:not([alt=""])')) fail(file, 'link has no accessible name: ' + (href || '(no href)'));
        if (link.getAttribute('target') === '_blank') {
            const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
            if (!rel.has('noopener')) fail(file, 'target="_blank" link missing rel="noopener": ' + href);
        }
    });

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        const target = link.getAttribute('href').slice(1);
        if (!target || !document.getElementById(target)) fail(file, 'broken fragment target: ' + link.getAttribute('href'));
    });

    document.querySelectorAll('[href], [src]').forEach(function (element) {
        const attribute = element.hasAttribute('href') ? 'href' : 'src';
        const value = element.getAttribute(attribute);
        if (!localTargetExists(file, value)) fail(file, 'broken local ' + attribute + ': ' + value);
    });

    if (sharedPages.includes(file)) {
        const skips = document.querySelectorAll('.skip-link[href="#main-content"]');
        if (skips.length !== 1) fail(file, 'expected exactly one skip link to #main-content');
        if (!document.querySelector('link[rel="stylesheet"][href="shared.css"]')) fail(file, 'missing shared stylesheet');
        if (!document.querySelector('main#main-content')) fail(file, 'main landmark missing #main-content');
        const opener = document.querySelector('.mobile-menu-btn[aria-controls="mobileNav"][aria-expanded]');
        if (!opener) fail(file, 'mobile menu trigger missing state/control attributes');
        const menu = document.querySelector('#mobileNav[role="dialog"][aria-modal="true"][aria-hidden="true"]');
        if (!menu || !menu.hasAttribute('hidden')) fail(file, 'mobile navigation is not initially hidden as a labeled modal dialog');
        if (!document.querySelector('script[src="site.js"]')) fail(file, 'missing shared site controller');
        if (!document.querySelector('#mobileNav .close-btn[aria-label="Close menu"]')) fail(file, 'mobile menu close button needs an explicit label');
    }

    if (html.includes('    const banned = [')) fail(file, 'contains a literal replacement token');

    const banned = [
        /720\+/i,
        /111 STEM tool files/i,
        /116 registered STEM/i,
        /FERPA Compliant/i,
        /Compliant by design/i,
        /Zero Cloud/i,
        /no mouse-required/i,
        /Audio never hits cloud/i,
        /Google injects key/i,
        /1,500 Flash requests/i,
        /\$23\.5K/i
    ];
    banned.forEach(function (pattern) {
        if (pattern.test(html)) fail(file, 'stale or absolute promotional claim: ' + pattern);
    });
}

const css = fs.readFileSync(path.join(root, 'shared.css'), 'utf8');
if (!/\.skip-link:focus/.test(css)) fail('shared.css', 'skip link lacks visible focus treatment');
if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)) fail('shared.css', 'missing reduced-motion support');
if (!/\.back-to-top\s*\{[\s\S]*?visibility:\s*hidden/.test(css)) fail('shared.css', 'hidden back-to-top control remains keyboard-visible');
if (!/@media\s*\(forced-colors:\s*active\)/.test(css)) warn('shared.css', 'no forced-colors treatment');

const matrixRows = fs.readFileSync(path.join(root, 'docs', 'feature_by_feature_competitive_matrix_2026-07-03.csv'), 'utf8').trim().split(/\r?\n/).length - 1;
if (matrixRows < 400) fail('feature matrix', '400+ capability claim is not supported by the documented matrix');

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const markdownLink = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
let match;
while ((match = markdownLink.exec(readme))) {
    const target = match[1].replace(/^<|>$/g, '');
    if (!localTargetExists('README.md', target)) fail('README.md', 'broken local link: ' + target);
}
if (!/122 plugin files \/ 123 registered IDs/i.test(readme)) fail('README.md', 'developer inventory does not show current STEM counts');
if (!/built toward \*\*WCAG 2\.1 AA\*\*/i.test(readme)) fail('README.md', 'accessibility posture should remain qualified');
if (/every game and tool accessible/i.test(readme)) fail('README.md', 'contains an unverified universal keyboard claim');
if (/\\u[0-9a-f]{4}/i.test(readme)) fail('README.md', 'contains a literal Unicode escape sequence');

try {
    const output = childProcess.execFileSync(process.execPath, ['dev-tools/check_tool_registry.cjs'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });
    const stem = output.match(/StemLab tools:\s+(\d+)/);
    const sel = output.match(/SelHub tools:\s+(\d+)/);
    const stemFiles = fs.readdirSync(path.join(root, 'stem_lab')).filter(function (name) {
        return /^stem_tool_.*\.js$/i.test(name);
    }).length;
    if (!stem || Number(stem[1]) !== 123) fail('registry', 'expected 123 STEM registrations');
    if (!sel || Number(sel[1]) !== 70) fail('registry', 'expected 70 SEL registrations');
    if (stemFiles !== 122) fail('registry', 'expected 122 STEM plugin files, found ' + stemFiles);
} catch (error) {
    fail('registry', 'registry check failed: ' + error.message);
}

warnings.forEach(function (message) { console.warn('WARN  ' + message); });
errors.forEach(function (message) { console.error('ERROR ' + message); });
console.log('');
console.log('Promotion-site audit: ' + pages.length + ' pages, ' + warnings.length + ' warning(s), ' + errors.length + ' error(s).');
if (errors.length) process.exit(1);

