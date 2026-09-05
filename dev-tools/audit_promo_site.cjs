'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const sharedPages = ['index.html', 'about.html', 'features.html', 'for-districts.html', 'library.html', 'students.html', 'calculator.html', 'accessibility_demo.html'];
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
        /\$23\.5K/i,
        /MIT-licensed/i,
        /Student data should never/i,
        /Zero-Knowledge Architecture/i,
        /WCAG 2\.1 AA/i,
        /Interactive parity offline/i,
        /You only need a Google account/i,
        /No-Profit, Pro-Teacher/i,
        /MIT License Badge/i,
        /Forever Free/i,
        /Cost to educators/i,
        /same license as Linux/i,
        /No vendor lock-in/i,
        /Prevents hallucinations/i,
        /piggybacks entirely/i,
        /the safest AI-assisted clinical report tool/i,
        /ensures every claim is traceable/i
    ];
    if (file === 'index.html') {
        // Include text split across lines, inline tags, and SVG labels in the tour.
        const copy = document.body.textContent.replace(/\s+/g, ' ');
        const slides = document.querySelectorAll('#slides-viewport .slide');
        const dots = document.querySelectorAll('.slide-dots .dot');
        const counter = document.querySelector('#slide-counter');
        if (dots.length !== slides.length) fail(file, 'static tour controls do not match the slide count');
        if (!counter || counter.textContent.trim() !== 'Slide 1 of ' + slides.length) fail(file, 'static tour counter is stale');
        const languageManifest = JSON.parse(fs.readFileSync(path.join(root, 'lang', 'manifest.json'), 'utf8'));
        const languageFiles = fs.readdirSync(path.join(root, 'lang')).filter(name => name.endsWith('.js')).length;
        if (languageManifest.count !== languageFiles || languageManifest.available.length !== languageFiles) fail(file, 'language file inventory and manifest disagree');
        if (!new RegExp('\\b' + languageFiles + '\\s+language-pack files', 'i').test(copy)) fail(file, 'homepage language-file count is stale');

        const unsupported = [
            /without security risk/i,
            /no access to the parent application, student data, or external networks/i,
            /Every button, menu, tooltip, and instruction translates automatically/i,
            /complete clinical research infrastructure/i,
            /Scores are extracted as immutable facts/i,
            /creating intrinsic motivation to read deeply/i,
            /all students read independently and comfortably/i,
            /giving every learner a pathway that matches/i,
            /AI-generated distractors ensure/i,
            /Grade \d+ \((?:ESL|IEP|RTI)\)/i,
            /assessment design in seconds/i,
            /in under 60 seconds/i,
            /no student data ever leaves the device/i,
            /PII is scrubbed from all AI-facing pipelines/i,
            /clinically-accurate narrative/i,
            /ensuring lesson accuracy/i,
            /Zero impact on the core app/i,
            /Every contribution is reviewed and merged/i,
            /All Data.*localStorage Only/i,
            /keeping learner identities private by default/i
        ];
        unsupported.forEach(function (pattern) {
            if (pattern.test(copy)) fail(file, 'unsupported homepage claim: ' + pattern);
        });
    }

    const visibleCopy = document.body.textContent.replace(/\s+/g, ' ');
    const unsupportedShared = [
        /Supports any language via Gemini/i,
        /self-healing accuracy audit/i,
        /full transcript automatically/i,
        /Instant source material from any public video/i,
        /Python, React, and p5\.js coding sandboxes/i,
        /Generate unlimited custom symbols/i,
        /Load any JSON file/i,
        /Verify curriculum rigor instantly/i
    ];
    unsupportedShared.forEach(function (pattern) {
        if (pattern.test(visibleCopy)) fail(file, 'unsupported shared-page claim: ' + pattern);
    });
    if (file === 'library.html') {
        const cards = Array.from(document.querySelectorAll('.lesson-card'));
        const categories = new Set(cards.map(card => card.dataset.category));
        document.querySelectorAll('#filters button').forEach(function (button) {
            if (button.dataset.category !== 'all' && !categories.has(button.dataset.category)) fail(file, 'subject filter has no available packs');
        });
        const topic = value => String(value).toLowerCase().replace(/^(?:title:|#)\s*/i, '').replace(/\b(?:the|american)\b/g, '').replace(/[^a-z0-9]/g, '');
        cards.forEach(function (card) {
            const link = card.querySelector('a[download]');
            if (!link) return fail(file, 'lesson card has no downloadable pack');
            try {
                const pack = JSON.parse(fs.readFileSync(path.resolve(root, link.getAttribute('href')), 'utf8'));
                if (!Array.isArray(pack.history) || !pack.history.length) throw new Error('missing saved resources');
                const source = pack.history.find(item => item.type === 'analysis')?.data?.originalText;
                const sourceTitle = typeof source === 'string' ? source.split(/\r?\n/)[0] : '';
                if (!sourceTitle || topic(sourceTitle) !== topic(card.querySelector('h2').textContent)) fail(file, 'card topic differs from downloaded source: ' + link.getAttribute('href'));
                const count = card.textContent.match(/(\d+) saved resources/);
                if (!count || Number(count[1]) !== pack.history.length) fail(file, 'saved-resource count differs from download: ' + link.getAttribute('href'));
            } catch (error) { fail(file, 'invalid lesson pack: ' + error.message); }
        });
    }

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
if (!/STEM Lab \(\d+ Plugin Files \/ \d+ Registered Tool IDs\)/i.test(readme)) fail('README.md', 'developer inventory does not show a STEM file/registration summary');
if (!/built toward \*\*WCAG 2\.2 AA\*\*/i.test(readme)) fail('README.md', 'accessibility posture should remain qualified');
if (!/a11y-audit\/WCAG-2\.2-current-audit\.md/i.test(readme)) fail('README.md', 'README should link the current limited-scope WCAG 2.2 audit');
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
    if (!stem || !sel) {
        fail('registry', 'registry output did not include STEM and SEL counts');
    } else {
        const stemCount = Number(stem[1]);
        const selCount = Number(sel[1]);
        if (!Number.isInteger(stemCount) || stemCount < 1) fail('registry', 'invalid STEM registration count');
        if (!Number.isInteger(selCount) || selCount < 1) fail('registry', 'invalid SEL registration count');
        if (!Number.isInteger(stemFiles) || stemFiles < 1) fail('registry', 'invalid STEM plugin-file count');
        const readmeHasCurrentFiles = new RegExp('\\b' + stemFiles + '\\b[\\s\\S]{0,100}(?:plugin files|stem_tool)', 'i').test(readme);
        const readmeHasCurrentRegistrations = new RegExp('\\b' + stemCount + '\\b[\\s\\S]{0,100}(?:registered STEM|STEM tool registrations)', 'i').test(readme);
        if (!readmeHasCurrentFiles || !readmeHasCurrentRegistrations) {
            fail('README.md', 'developer inventory does not show current STEM counts (' + stemFiles + ' files / ' + stemCount + ' registrations)');
        }
    }
} catch (error) {
    fail('registry', 'registry check failed: ' + error.message);
}

warnings.forEach(function (message) { console.warn('WARN  ' + message); });
errors.forEach(function (message) { console.error('ERROR ' + message); });
console.log('');
console.log('Promotion-site audit: ' + pages.length + ' pages, ' + warnings.length + ' warning(s), ' + errors.length + ' error(s).');
if (errors.length) process.exit(1);
