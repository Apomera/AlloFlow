#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shellPages = [
    'index.html', 'tools.html', 'features.html', 'remediation.html', 'ways-to-use.html',
    'for-districts.html', 'students.html', 'library.html', 'calculator.html',
    'accessibility_demo.html', 'whitepaper.html', 'feedback.html', 'manuals.html'
];
const socialPages = shellPages.concat(['launch.html', 'changelog.html']);
const expectedPrimary = ['tools.html', 'features.html', 'remediation.html', 'ways-to-use.html', 'for-districts.html', 'manuals.html', 'launch.html'];
const expectedImage = 'https://apomera.github.io/AlloFlow/assets/alloflow-social-preview.png';
const errors = [];

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function check(condition, message) { if (!condition) errors.push(message); }
function attribute(html, selectorPattern, attributeName) {
    const node = html.match(selectorPattern);
    if (!node) return '';
    const match = node[0].match(new RegExp(attributeName + '="([^"]*)"', 'i'));
    return match ? match[1] : '';
}

shellPages.forEach(function (file) {
    const html = read(file);
    const nav = html.match(/<div class="nav-links" data-site-nav="primary">([\s\S]*?)<\/div>/);
    check(Boolean(nav), `${file}: canonical primary navigation missing`);
    if (nav) {
        const hrefs = Array.from(nav[1].matchAll(/href="([^"]+)"/g), (match) => match[1]);
        check(JSON.stringify(hrefs) === JSON.stringify(expectedPrimary), `${file}: primary navigation order drifted (${hrefs.join(', ')})`);
    }
    check(html.includes('<!-- shared mobile nav:start -->'), `${file}: static mobile navigation marker missing`);
    check(html.includes('class="noscript-nav"'), `${file}: no-JavaScript navigation missing`);
    check(html.includes('href="promotion-wave3.css"'), `${file}: promotion-wave3.css is not static`);
    check(html.includes('href="promotion-wave3-shell.css"'), `${file}: shell CSS is not static`);
    check(html.includes('class="footer-links footer-link-groups"'), `${file}: grouped footer navigation missing`);
    check(html.includes('href="feedback.html"'), `${file}: feedback route missing from shell`);
});

socialPages.forEach(function (file) {
    const html = read(file);
    check(attribute(html, /<meta\s+property="og:image"[^>]*>/i, 'content') === expectedImage, `${file}: social preview image is not canonical`);
    check(attribute(html, /<meta\s+name="twitter:image"[^>]*>/i, 'content') === expectedImage, `${file}: Twitter image is not canonical`);
    check(attribute(html, /<meta\s+property="og:image:width"[^>]*>/i, 'content') === '1200', `${file}: og:image width missing`);
    check(attribute(html, /<meta\s+property="og:image:height"[^>]*>/i, 'content') === '630', `${file}: og:image height missing`);
    check(attribute(html, /<meta\s+property="og:image:type"[^>]*>/i, 'content') === 'image/png', `${file}: og:image type missing`);
    check(Boolean(attribute(html, /<meta\s+property="og:image:alt"[^>]*>/i, 'content')), `${file}: og:image alt missing`);
    check(Boolean(attribute(html, /<meta\s+name="twitter:image:alt"[^>]*>/i, 'content')), `${file}: Twitter image alt missing`);
    check(!html.includes('property="twitter:'), `${file}: legacy property=twitter metadata remains`);
});

const preview = fs.readFileSync(path.join(root, 'assets', 'alloflow-social-preview.png'));
check(preview.toString('ascii', 1, 4) === 'PNG', 'social preview asset is not a PNG');
check(preview.readUInt32BE(16) === 1200 && preview.readUInt32BE(20) === 630,
    `social preview is ${preview.readUInt32BE(16)}x${preview.readUInt32BE(20)}, expected 1200x630`);

const siteScript = read('site.js');
['addSiteExpansionStyles', 'addFindToolNavigation', 'addExpansionNavigation', 'addHomepageFinder', 'addHomepageRemediation'].forEach(function (name) {
    check(!siteScript.includes(name), `site.js: obsolete ${name} injection remains`);
});

const home = read('index.html');
check(home.includes('id="homeEntryPaths"'), 'index.html: task entry paths are not static');
check(home.includes('id="homeToolFinder"') && home.includes('action="tools.html"') && home.includes('name="q"'), 'index.html: progressive finder form is incomplete');
check(home.includes('id="homeRemediation"'), 'index.html: remediation overview is not static');
check(home.includes('class="community-feedback-band"'), 'index.html: feedback invitation is not static');
check(home.includes('data-target="142"'), 'index.html: STEM count is not synchronized to 142');
check(!home.includes('id="hero-copy-btn"'), 'index.html: old copy-link hero CTA remains');
check(home.includes('src="tool-catalog-data.js"') && home.includes('src="tool-finder.js"'), 'index.html: finder enhancement scripts are not static');

const tools = read('tools.html');
const cards = (tools.match(/class="tool-result-card"/g) || []).length;
check(cards >= 33, `tools.html: only ${cards} static cards found`);
check(tools.includes('id="toolCatalogNoScript"'), 'tools.html: no-JavaScript catalog guidance missing');
check((tools.match(/class="tool-feedback-link"/g) || []).length >= cards, 'tools.html: not every static tool has a feedback link');
check(tools.includes('id="toolCatalogSchema"'), 'tools.html: catalog structured data missing');

['index.html', 'tools.html', 'feedback.html', 'launch.html', 'manuals.html'].forEach(function (file) {
    const html = read(file);
    const blocks = Array.from(html.matchAll(/<script(?:\s+id="[^"]+")?\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi));
    check(blocks.length > 0, `${file}: JSON-LD missing`);
    blocks.forEach(function (block, index) {
        try { JSON.parse(block[1]); }
        catch (error) { errors.push(`${file}: JSON-LD block ${index + 1} is invalid (${error.message})`); }
    });
});

const feedback = read('feedback.html');
const feedbackScript = read('feedback.js');
['student names', 'API keys', 'copyrighted source text', 'response is not guaranteed'].forEach(function (phrase) {
    check(feedback.toLowerCase().includes(phrase.toLowerCase()), `feedback.html: guardrail phrase missing: ${phrase}`);
});
check(feedbackScript.includes('URLSearchParams') && feedbackScript.includes('textContent'), 'feedback.js: safe tool-context enhancement missing');
check(!feedbackScript.includes('innerHTML'), 'feedback.js: innerHTML should not be used for feedback context');

const sitemap = read('sitemap.xml');
check(sitemap.includes('https://apomera.github.io/AlloFlow/feedback.html'), 'sitemap.xml: feedback page missing');
check(sitemap.includes('https://apomera.github.io/AlloFlow/manuals.html'), 'sitemap.xml: manuals hub missing');
check(sitemap.includes('https://apomera.github.io/AlloFlow/docs/dynamic_assessment_guide.html'), 'sitemap.xml: Dynamic Assessment guide missing');
const manuals = read('manuals.html');
check((manuals.match(/data-manual-card/g) || []).length >= 13, 'manuals.html: public guide catalog is incomplete');
check(manuals.includes('data-manual-controls hidden'), 'manuals.html: progressive guide finder missing');
check(manuals.includes('id="family-mode-guide"') && manuals.includes('id="multilingual-support-guide"'), 'manuals.html: family or multilingual audience path missing');
check(read('launch.html').includes('href="index.html"'), 'launch.html: About AlloFlow route missing');
check(read('changelog.html').includes('href="index.html"'), 'changelog.html: About AlloFlow route missing');
check(read('README.md').includes('https://apomera.github.io/AlloFlow/tools.html'), 'README.md: tool finder discovery link missing');

if (errors.length) {
    console.error(`PROMO WAVE 3 AUDIT: FAIL (${errors.length} errors)`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

console.log(`PROMO WAVE 3 AUDIT: PASS (${shellPages.length} shells, ${socialPages.length} social pages, ${cards} static tools)`);
