#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const defaultSiteUrl = 'https://apomera.github.io/AlloFlow/';
const defaultSitemapUrl = defaultSiteUrl + 'sitemap.xml';
const defaultEndpoint = 'https://api.indexnow.org/indexnow';
const args = new Set(process.argv.slice(2));
const allowedArgs = new Set(['--dry-run', '--help']);

function fail(message) {
    throw new Error(message);
}

function printHelp() {
    console.log(`Usage: node dev-tools/submit_indexnow.cjs [--dry-run]

--dry-run  Validate the local sitemap and payload scope without network access.

Live submission requires INDEXNOW_KEY and INDEXNOW_KEY_LOCATION. Optional
overrides: INDEXNOW_SITE_URL, INDEXNOW_SITEMAP_URL, and INDEXNOW_ENDPOINT.`);
}

function decodeXml(value) {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

function parseSitemap(xml) {
    const urls = Array.from(xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi), (match) => decodeXml(match[1].trim()));
    if (!urls.length) fail('The sitemap contains no <loc> entries.');
    if (urls.length > 10000) fail(`The sitemap contains ${urls.length} URLs; IndexNow accepts at most 10,000 per request.`);
    if (new Set(urls).size !== urls.length) fail('The sitemap contains duplicate URL entries.');
    return urls;
}

function normalizedRoot(rawValue) {
    const url = new URL(rawValue);
    if (url.protocol !== 'https:') fail('INDEXNOW_SITE_URL must use HTTPS.');
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    url.search = '';
    url.hash = '';
    return url;
}

function assertInScope(rawUrl, siteRoot, label) {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') fail(`${label} must use HTTPS: ${rawUrl}`);
    if (url.origin !== siteRoot.origin || !url.pathname.startsWith(siteRoot.pathname)) {
        fail(`${label} is outside ${siteRoot.href}: ${rawUrl}`);
    }
    return url;
}

function validateUrls(urls, siteRoot) {
    return urls.map((url) => assertInScope(url, siteRoot, 'Sitemap URL').href);
}

async function responseText(response, label) {
    if (!response.ok) fail(`${label} returned HTTP ${response.status}.`);
    return response.text();
}

async function main() {
    const unknown = Array.from(args).filter((arg) => !allowedArgs.has(arg));
    if (unknown.length) fail(`Unknown argument: ${unknown.join(', ')}`);
    if (args.has('--help')) {
        printHelp();
        return;
    }

    const siteRoot = normalizedRoot(process.env.INDEXNOW_SITE_URL || defaultSiteUrl);

    if (args.has('--dry-run')) {
        const localSitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
        const urls = validateUrls(parseSitemap(localSitemap), siteRoot);
        if (!urls.includes(siteRoot.href + 'about.html')) fail('The official project-facts page is missing from the sitemap.');
        console.log(`INDEXNOW DRY RUN: PASS (${urls.length} URLs under ${siteRoot.href}; no network request sent)`);
        return;
    }

    const key = (process.env.INDEXNOW_KEY || '').trim();
    const keyLocationRaw = (process.env.INDEXNOW_KEY_LOCATION || '').trim();
    if (!key || !keyLocationRaw) {
        fail('Live submission requires INDEXNOW_KEY and INDEXNOW_KEY_LOCATION. Use --dry-run for local validation.');
    }
    if (key.length < 8 || key.length > 128 || !/^[A-Za-z0-9-]+$/.test(key)) {
        fail('INDEXNOW_KEY must be 8-128 characters using only letters, numbers, and hyphens.');
    }

    const keyLocation = assertInScope(keyLocationRaw, siteRoot, 'INDEXNOW_KEY_LOCATION');
    const sitemapUrl = assertInScope(process.env.INDEXNOW_SITEMAP_URL || defaultSitemapUrl, siteRoot, 'INDEXNOW_SITEMAP_URL');
    const endpoint = new URL(process.env.INDEXNOW_ENDPOINT || defaultEndpoint);
    if (endpoint.protocol !== 'https:') fail('INDEXNOW_ENDPOINT must use HTTPS.');

    const keyResponse = await fetch(keyLocation, {headers: {'user-agent': 'AlloFlow-IndexNow/1.0'}});
    const hostedKey = (await responseText(keyResponse, 'The hosted IndexNow key file')).trim();
    if (hostedKey !== key) fail('The hosted IndexNow key file does not match INDEXNOW_KEY.');

    const sitemapResponse = await fetch(sitemapUrl, {headers: {'user-agent': 'AlloFlow-IndexNow/1.0'}});
    const liveSitemap = await responseText(sitemapResponse, 'The live sitemap');
    const urlList = validateUrls(parseSitemap(liveSitemap), siteRoot);
    if (!urlList.includes(siteRoot.href + 'about.html')) fail('The live sitemap does not yet contain about.html; wait for deployment before submitting.');

    const payload = {
        host: siteRoot.hostname,
        key,
        keyLocation: keyLocation.href,
        urlList
    };
    const submission = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'user-agent': 'AlloFlow-IndexNow/1.0'
        },
        body: JSON.stringify(payload)
    });
    if (submission.status !== 200 && submission.status !== 202) {
        fail(`IndexNow returned HTTP ${submission.status}.`);
    }
    console.log(`INDEXNOW SUBMISSION: ACCEPTED (${submission.status}; ${urlList.length} live URLs)`);
}

main().catch((error) => {
    console.error(`INDEXNOW SUBMISSION: FAIL (${error.message})`);
    process.exitCode = 1;
});
