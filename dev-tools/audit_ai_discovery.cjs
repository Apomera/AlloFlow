#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const canonicalBase = 'https://apomera.github.io/AlloFlow/';
const shellPages = [
    'index.html', 'about.html', 'tools.html', 'features.html', 'remediation.html',
    'ways-to-use.html', 'for-districts.html', 'students.html', 'library.html',
    'calculator.html', 'accessibility_demo.html', 'whitepaper.html', 'feedback.html',
    'manuals.html'
];
const errors = [];

function read(file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
}

function check(condition, message) {
    if (!condition) errors.push(message);
}

function metaContent(html, name, attributeName = 'name') {
    const pattern = new RegExp(`<meta\\s+${attributeName}="${name}"[^>]*content="([^"]*)"`, 'i');
    const forward = html.match(pattern);
    if (forward) return forward[1];
    const reverse = html.match(new RegExp(`<meta\\s+content="([^"]*)"[^>]*${attributeName}="${name}"`, 'i'));
    return reverse ? reverse[1] : '';
}

function robotsGroups(text) {
    const groups = [];
    let group = null;
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.replace(/#.*$/, '').trim();
        if (!line) continue;
        const splitAt = line.indexOf(':');
        if (splitAt === -1) continue;
        const field = line.slice(0, splitAt).trim().toLowerCase();
        const value = line.slice(splitAt + 1).trim();
        if (field === 'user-agent') {
            if (!group || group.directives.length) {
                group = {agents: [], directives: []};
                groups.push(group);
            }
            group.agents.push(value.toLowerCase());
        } else if (group && (field === 'allow' || field === 'disallow')) {
            group.directives.push({field, value});
        }
    }
    return groups;
}

function hasRobotDirective(groups, agent, field, value) {
    const normalized = agent.toLowerCase();
    return groups.some((group) => group.agents.includes(normalized) &&
        group.directives.some((directive) => directive.field === field && directive.value === value));
}

const robots = read('robots.txt');
const groups = robotsGroups(robots);
['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User', 'Applebot'].forEach((agent) => {
    check(hasRobotDirective(groups, agent, 'allow', '/'), `robots.txt: ${agent} is not explicitly allowed`);
});
['GPTBot', 'ClaudeBot', 'Applebot-Extended'].forEach((agent) => {
    check(hasRobotDirective(groups, agent, 'disallow', '/'), `robots.txt: ${agent} training control is not disallowed`);
});
check(hasRobotDirective(groups, '*', 'allow', '/'), 'robots.txt: standard search crawlers are not allowed');
check(robots.includes(`Sitemap: ${canonicalBase}sitemap.xml`), 'robots.txt: canonical sitemap declaration is missing');

const about = read('about.html');
check((about.match(/<h1(?:\s|>)/gi) || []).length === 1, 'about.html: expected exactly one h1');
check((about.match(/<main(?:\s|>)/gi) || []).length === 1, 'about.html: expected exactly one main landmark');
check(about.includes(`<link rel="canonical" href="${canonicalBase}about.html">`), 'about.html: canonical URL is missing');
check(metaContent(about, 'robots') === 'index, follow', 'about.html: robots directive must be index, follow');
check(metaContent(about, 'og:url', 'property') === `${canonicalBase}about.html`, 'about.html: Open Graph URL is not canonical');
check(about.includes('The canonical upstream repository is'), 'about.html: canonical-upstream explanation is missing');
check(about.includes('Forks are independent snapshots and may lag current releases.'), 'about.html: fork staleness warning is missing');
check(about.includes('Version 1.2'), 'about.html: current version is missing');
check(about.includes('142 plugin files, 143 registered STEM tool IDs, and 70 SEL activities'), 'about.html: verified catalog counts are missing');
check(about.includes('https://github.com/Apomera/AlloFlow/releases'), 'about.html: official releases link is missing');
check(about.includes('CITATION.cff'), 'about.html: citation record is missing');

const jsonBlocks = Array.from(about.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi));
check(jsonBlocks.length > 0, 'about.html: JSON-LD is missing');
const entities = [];
jsonBlocks.forEach((block, index) => {
    try {
        const data = JSON.parse(block[1]);
        if (Array.isArray(data['@graph'])) entities.push(...data['@graph']);
        else entities.push(data);
    } catch (error) {
        errors.push(`about.html: JSON-LD block ${index + 1} is invalid (${error.message})`);
    }
});
const aboutPage = entities.find((entity) => entity['@type'] === 'AboutPage');
const software = entities.find((entity) => entity['@type'] === 'SoftwareApplication');
const faq = entities.find((entity) => entity['@type'] === 'FAQPage');
check(aboutPage?.url === `${canonicalBase}about.html`, 'about.html: AboutPage URL is incorrect');
check(aboutPage?.dateModified === '2026-08-20', 'about.html: AboutPage dateModified is stale');
check(aboutPage?.mainEntity?.['@id'] === `${canonicalBase}#software`, 'about.html: AboutPage does not identify the canonical software entity');
check(software?.['@id'] === `${canonicalBase}#software`, 'about.html: SoftwareApplication identity does not match the homepage');
check(software?.codeRepository === 'https://github.com/Apomera/AlloFlow', 'about.html: codeRepository is not canonical');
check(software?.softwareVersion === '1.2', 'about.html: structured software version is stale');
check(software?.license === 'https://www.gnu.org/licenses/agpl-3.0.html', 'about.html: structured license is incorrect');
check(Array.isArray(software?.sameAs) && software.sameAs.includes('https://github.com/Apomera/AlloFlow'), 'about.html: official repository is absent from sameAs');
check(Array.isArray(faq?.mainEntity) && faq.mainEntity.length >= 4, 'about.html: direct-answer structured data is incomplete');

const sitemap = read('sitemap.xml');
const aboutLoc = `<loc>${canonicalBase}about.html</loc>`;
check((sitemap.match(new RegExp(aboutLoc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length === 1,
    'sitemap.xml: about.html must appear exactly once');

shellPages.forEach((file) => {
    const html = read(file);
    const footer = html.match(/<nav class="footer-links footer-link-groups"[\s\S]*?<\/nav>/i);
    check(Boolean(footer), `${file}: grouped footer navigation is missing`);
    check(Boolean(footer && footer[0].includes('href="about.html"')), `${file}: footer does not link the official project-facts page`);
});
check(read('launch.html').includes('href="about.html" aria-label="Learn about AlloFlow"'), 'launch.html: About AlloFlow route is not authoritative');
check(read('changelog.html').includes('href="about.html">About AlloFlow</a>'), 'changelog.html: About AlloFlow route is not authoritative');
check(read('README.md').includes(`${canonicalBase}about.html`), 'README.md: official project-facts link is missing');

const submitter = read('dev-tools/submit_indexnow.cjs');
const workflow = read('.github/workflows/indexnow.yml');
check(submitter.includes("args.has('--dry-run')"), 'IndexNow submitter: offline dry-run is missing');
check(submitter.includes('INDEXNOW_KEY_LOCATION'), 'IndexNow submitter: hosted-key validation is missing');
check(submitter.includes("live sitemap does not yet contain about.html"), 'IndexNow submitter: deployed facts-page gate is missing');
check(workflow.includes('node dev-tools/submit_indexnow.cjs --dry-run'), 'IndexNow workflow: local validation step is missing');
check(workflow.includes('secrets.INDEXNOW_KEY') && workflow.includes('secrets.INDEXNOW_KEY_LOCATION'), 'IndexNow workflow: guarded secrets are missing');
check(workflow.includes("if: steps.indexnow-config.outputs.configured == 'true'"), 'IndexNow workflow: live submission is not configuration-gated');
check(read('package.json').includes('"audit:ai-discovery": "node dev-tools/audit_ai_discovery.cjs"'), 'package.json: AI-discovery audit command is missing');

if (errors.length) {
    console.error(`AI DISCOVERY AUDIT: FAIL (${errors.length} errors)`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

console.log(`AI DISCOVERY AUDIT: PASS (${shellPages.length} linked pages, ${entities.length} structured entities)`);
