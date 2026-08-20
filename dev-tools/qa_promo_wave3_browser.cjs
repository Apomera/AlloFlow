'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const axePath = require.resolve('axe-core/axe.min.js');
const mime = {
    '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml; charset=utf-8'
};

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function createServer() {
    return http.createServer((request, response) => {
        const requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
        const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
        const resolved = path.resolve(root, relative);
        if (resolved !== root && !resolved.startsWith(root + path.sep)) {
            response.writeHead(403).end('Forbidden');
            return;
        }
        fs.stat(resolved, (error, stat) => {
            if (error || !stat.isFile()) {
                response.writeHead(404).end('Not found');
                return;
            }
            response.writeHead(200, {
                'Content-Type': mime[path.extname(resolved).toLowerCase()] || 'application/octet-stream',
                'Cache-Control': 'no-store'
            });
            fs.createReadStream(resolved).pipe(response);
        });
    });
}

async function configureContext(browser, options) {
    const context = await browser.newContext(options);
    await context.route('https://unpkg.com/**', (route) => route.fulfill({
        contentType: 'text/javascript', body: 'window.lucide={createIcons:function(){}};'
    }));
    await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }));
    await context.route('https://fonts.gstatic.com/**', (route) => route.abort());
    return context;
}

async function assertNoSeriousAxe(page, label, include) {
    await page.addScriptTag({ path: axePath });
    const violations = await page.evaluate(async (includeSelectors) => {
        const context = includeSelectors ? { include: includeSelectors } : document;
        const report = await window.axe.run(context, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
        });
        return report.violations
            .filter((violation) => ['serious', 'critical'].includes(violation.impact))
            .map((violation) => ({
                id: violation.id,
                nodes: violation.nodes.slice(0, 5).map((node) => node.target.join(' '))
            }));
    }, include);
    assert(violations.length === 0, label + ' serious/critical axe findings: ' + JSON.stringify(violations));
}

async function main() {
    const server = createServer();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const origin = 'http://127.0.0.1:' + server.address().port;
    const browser = await chromium.launch({ headless: true });
    let context;
    let noScriptContext;
    try {
        context = await configureContext(browser, { viewport: { width: 1440, height: 1000 } });

        for (const file of ['index.html', 'tools.html', 'feedback.html', 'manuals.html']) {
            const page = await context.newPage();
            const runtimeErrors = [];
            page.on('pageerror', (error) => runtimeErrors.push(error.message));
            page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
            const response = await page.goto(origin + '/' + file, { waitUntil: 'networkidle' });
            assert(response && response.ok(), `${file} did not return HTTP 200`);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            assert(overflow <= 1, `${file} has ${overflow}px desktop overflow`);
            assert(await page.locator('[data-site-nav="primary"] a').count() === 7, `${file} primary navigation is not compact`);
            const axeIncludes = {
                'index.html': [['.navbar'], ['#homeEntryPaths'], ['.home-tool-finder-section'], ['#homeRemediation'], ['.community-feedback-band'], ['.footer']],
                'tools.html': [['.navbar'], ['main#main-content'], ['.footer']],
                'feedback.html': [['body']]
            };
            await assertNoSeriousAxe(page, file, axeIncludes[file]);
            assert(runtimeErrors.length === 0, `${file} runtime errors: ${runtimeErrors.join(' | ')}`);
            await page.close();
        }

        const home = await context.newPage();
        await home.goto(origin + '/index.html', { waitUntil: 'networkidle' });
        assert(await home.locator('#homeEntryPaths .home-entry-card').count() === 4, 'homepage does not show four task routes');
        assert(await home.locator('a.btn-primary[href="launch.html"]').count() === 1, 'homepage primary launch CTA is wrong');
        await home.locator('#homeToolSearch').fill('photosynthesis');
        assert(await home.locator('#homeToolResults a').count() >= 1, 'homepage source-aware finder did not return a result');
        await home.close();

        const tools = await context.newPage();
        await tools.goto(origin + '/tools.html?q=WCAG', { waitUntil: 'networkidle' });
        const filteredCards = tools.locator('#toolResults .tool-result-card');
        assert(await filteredCards.count() >= 3, 'WCAG query returned fewer than three relevant tools');
        assert(await tools.locator('#toolResults .tool-feedback-link').count() === await filteredCards.count(), 'filtered cards lost feedback routes');
        const feedbackHref = await tools.locator('[data-tool-id="documentRemediation"] .tool-feedback-link').getAttribute('href');
        assert(feedbackHref && feedbackHref.startsWith('feedback.html?tool='), 'document remediation feedback route is missing context');
        await tools.close();

        const feedback = await context.newPage();
        await feedback.goto(origin + '/feedback.html?tool=Water%20Cycle%20Lab', { waitUntil: 'networkidle' });
        assert((await feedback.locator('#feedbackContext').textContent()).includes('Water Cycle Lab'), 'feedback page did not show tool context');
        assert(!(await feedback.locator('#feedbackContext').isHidden()), 'feedback context remained hidden');
        const issueHref = await feedback.locator('#ideaFeedback').getAttribute('href');
        assert(issueHref && issueHref.includes('Water+Cycle+Lab'), 'public issue URL was not prefilled with the tool name');
        assert((await feedback.locator('.feedback-guardrails').textContent()).includes('student names'), 'feedback guardrails are not visible');
        await feedback.close();

        for (const width of [1025, 1024, 390, 320]) {
            const page = await context.newPage();
            await page.setViewportSize({ width, height: width <= 390 ? 800 : 900 });
            await page.goto(origin + '/index.html', { waitUntil: 'networkidle' });
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            assert(overflow <= 1, `homepage has ${overflow}px overflow at ${width}px`);
            const desktopVisible = await page.locator('[data-site-nav="primary"]').isVisible();
            const mobileVisible = await page.locator('.mobile-menu-btn').isVisible();
            if (width === 1025) assert(desktopVisible && !mobileVisible, '1025px breakpoint should show compact desktop navigation');
            if (width === 1024) assert(!desktopVisible && mobileVisible, '1024px breakpoint should show mobile navigation trigger');
            await page.close();
        }

        noScriptContext = await configureContext(browser, { viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
        const noScriptHome = await noScriptContext.newPage();
        await noScriptHome.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
        assert(await noScriptHome.locator('.noscript-nav').isVisible(), 'homepage no-JavaScript navigation is not visible');
        assert(!(await noScriptHome.locator('.mobile-menu-btn').isVisible()), 'inert mobile menu trigger remains visible without JavaScript');
        assert(await noScriptHome.locator('#homeEntryPaths').count() === 1, 'homepage task routes disappear without JavaScript');
        assert(await noScriptHome.locator('#homeRemediation').count() === 1, 'homepage remediation disappears without JavaScript');
        await noScriptHome.close();

        const noScriptTools = await noScriptContext.newPage();
        await noScriptTools.goto(origin + '/tools.html', { waitUntil: 'domcontentloaded' });
        assert(await noScriptTools.locator('#toolResults .tool-result-card').count() === 33, 'static catalog does not preserve all 33 tools without JavaScript');
        assert(await noScriptTools.locator('#toolCatalogNoScript').isVisible(), 'catalog no-JavaScript guidance is not visible');
        assert(await noScriptTools.locator('.noscript-nav').isVisible(), 'catalog no-JavaScript navigation is not visible');
        await noScriptTools.close();

        const imageResponse = await context.request.get(origin + '/assets/alloflow-social-preview.png');
        assert(imageResponse.ok(), 'social preview image did not return HTTP 200');
        assert((await imageResponse.body()).length > 100000, 'social preview image appears unexpectedly small');

        console.log('Promotion wave 3 browser QA: homepage, 33-tool catalog, feedback context, breakpoints, axe, and no-JavaScript paths passed.');
    } finally {
        if (noScriptContext) await noScriptContext.close();
        if (context) await context.close();
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
});
