'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const pages = ['remediation.html', 'ways-to-use.html', 'whitepaper.html'];
const errors = [];
const fail = (file, message) => errors.push(file + ': ' + message);
const name = (node) => (node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '').replace(/\s+/g, ' ').trim();

function targetExists(file, raw) {
    if (!raw || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(raw)) return true;
    let value = raw.split('#')[0].split('?')[0];
    if (!value) return true;
    try { value = decodeURIComponent(value); } catch (_) { return false; }
    const resolved = value.startsWith('/')
        ? path.join(root, value.replace(/^[/\\]+/, ''))
        : path.resolve(root, path.dirname(file), value);
    return fs.existsSync(resolved);
}

for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const document = new JSDOM(html).window.document;
    if (document.documentElement.lang.toLowerCase() !== 'en') fail(file, 'expected lang="en"');
    if (!document.title.trim()) fail(file, 'missing title');
    if (!document.querySelector('meta[name="viewport"]')) fail(file, 'missing viewport');
    if (!document.querySelector('meta[name="description"]')?.content.trim()) fail(file, 'missing description');
    if (!document.querySelector('link[rel="canonical"]')?.href) fail(file, 'missing canonical');
    if (document.querySelectorAll('h1').length !== 1) fail(file, 'expected one h1');
    if (document.querySelectorAll('main#main-content').length !== 1) fail(file, 'expected one main#main-content');
    const skipTarget = file === 'whitepaper.html' ? '#paper-title' : '#main-content';
    if (document.querySelectorAll('.skip-link[href="' + skipTarget + '"]').length !== 1) fail(file, 'missing skip link');
    if (!document.querySelector('link[href="shared.css"]')) fail(file, 'missing shared.css');
    if (!document.querySelector('link[href="promotion-wave2.css"]')) fail(file, 'missing expansion CSS');
    if (!document.querySelector('script[src="site.js"]')) fail(file, 'missing site.js');
    if (!document.querySelector('#mobileNav[role="dialog"][aria-modal="true"][aria-hidden="true"][hidden]')) fail(file, 'bad mobile menu initial state');
    if (!document.querySelector('.mobile-menu-btn[aria-controls="mobileNav"][aria-expanded="false"]')) fail(file, 'bad mobile trigger state');
    if (!document.querySelector('#mobileNav .close-btn[aria-label="Close menu"]')) fail(file, 'unnamed close button');

    const ids = new Set();
    document.querySelectorAll('[id]').forEach((node) => {
        if (ids.has(node.id)) fail(file, 'duplicate id "' + node.id + '"');
        ids.add(node.id);
    });
    document.querySelectorAll('script:not([src])').forEach((script, index) => {
        const type = (script.type || '').toLowerCase();
        if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) return;
        try { new vm.Script(script.textContent, { filename: file + ':inline-' + (index + 1) }); }
        catch (error) { fail(file, 'inline script syntax: ' + error.message); }
    });
    document.querySelectorAll('button').forEach((button) => {
        if (!button.hasAttribute('type')) fail(file, 'button missing type: ' + name(button));
        if (!name(button)) fail(file, 'unnamed button');
    });
    document.querySelectorAll('a').forEach((link) => {
        const href = link.getAttribute('href');
        if (!href) fail(file, 'link missing href: ' + name(link));
        if (!name(link)) fail(file, 'unnamed link: ' + (href || '(none)'));
        if (link.target === '_blank' && !(link.rel || '').split(/\s+/).includes('noopener')) fail(file, 'external link missing noopener: ' + href);
    });
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        const id = link.getAttribute('href').slice(1);
        if (!id || !document.getElementById(id)) fail(file, 'broken fragment #' + id);
    });
    document.querySelectorAll('[href], [src]').forEach((node) => {
        const attribute = node.hasAttribute('href') ? 'href' : 'src';
        const value = node.getAttribute(attribute);
        if (!targetExists(file, value)) fail(file, 'broken local ' + attribute + ': ' + value);
    });
    if (/\uFFFD|�|Ã.|Â.|â(?:€|™|œ|†|‡)|ðŸ/.test(html)) fail(file, 'likely encoding damage');
}

function requireText(file, checks) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const [needle, label] of checks) if (!source.includes(needle)) fail(file, 'missing ' + label);
}

requireText('remediation.html', [
    ['April 26, 2027', 'current larger-entity date'],
    ['April 26, 2028', 'current smaller-entity date'],
    ['www.ada.gov/resources/web-rule-first-steps/', 'current DOJ source'],
    ['human judgment', 'human-review boundary'],
    ['The MCPB release is built and published by the repository\'s CI', 'MCP release provenance'],
    ['alloflow-portable-remediation-agent-skill-v0.2.9.zip', 'neutral Skill download']
]);
requireText('ways-to-use.html', [
    ['https://alloflow-cdn.pages.dev/app/', 'browser-app launch'],
    ['no provider billing credential', 'embedded-key boundary'],
    ['Student AI is off by default', 'student-AI default'],
    ['Not publicly deployed', 'remote MCP status'],
    ['not be described as free AI', 'Pages/remediation separation']
]);
requireText('whitepaper.html', [['downloads/AlloFlow-Document-Accessibility-White-Paper.md', 'downloadable white-paper source']]);
if (!fs.existsSync(path.join(root, 'downloads', 'AlloFlow-Document-Accessibility-White-Paper.md'))) fail('downloads', 'white-paper Markdown missing');

for (const file of ['site.js', 'tool-finder.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    try { new vm.Script(source, { filename: file }); } catch (error) { fail(file, 'syntax error: ' + error.message); }
}
requireText('index.html', [
    ['id="homeRemediation"', 'static homepage remediation section'],
    ['href="remediation.html"', 'static remediation navigation'],
    ['href="ways-to-use.html"', 'static ways-to-use navigation'],
    ['href="whitepaper.html"', 'static white-paper navigation']
]);
requireText('tool-finder.js', [["tool.detailHref = 'remediation.html'", 'accessibility-result routing']]);
requireText('sitemap.xml', [
    ['/tools.html</loc>', 'tool directory'],
    ['/remediation.html</loc>', 'remediation page'],
    ['/ways-to-use.html</loc>', 'ways-to-use page'],
    ['/whitepaper.html</loc>', 'white-paper page']
]);

errors.forEach((message) => console.error('ERROR ' + message));
console.log('Promotion expansion audit: ' + pages.length + ' pages, ' + errors.length + ' error(s).');
if (errors.length) process.exit(1);
