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

        for (const file of ['index.html', 'about.html', 'tools.html', 'feedback.html', 'manuals.html']) {
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
                'index.html': [['.navbar'], ['.home-page-nav'], ['#teaching-workflow'], ['#slider-container'], ['#classroom-example'], ['#homeEntryPaths'], ['.home-tool-finder-section'], ['#homeRemediation'], ['.community-feedback-band'], ['.footer']],
                'about.html': [['body']],
                'tools.html': [['.navbar'], ['main#main-content'], ['.footer']],
                'feedback.html': [['body']]
            };
            await assertNoSeriousAxe(page, file, axeIncludes[file]);
            assert(runtimeErrors.length === 0, `${file} runtime errors: ${runtimeErrors.join(' | ')}`);
            await page.close();
        }

        const home = await context.newPage();
        await home.addInitScript(() => {
            window.exampleCopyCalls = [];
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
                writeText: async (text) => {
                    if (window.denyExampleCopy) throw new DOMException('Blocked in test', 'NotAllowedError');
                    window.exampleCopyCalls.push(text);
                }
            }});
        });
        await home.goto(origin + '/index.html', { waitUntil: 'networkidle' });
        assert(await home.locator('#homeEntryPaths .home-entry-card').count() === 4, 'homepage does not show four task routes');
        assert(await home.locator('.promo-home-hero a.btn-primary[href="launch.html"]').count() === 1, 'homepage primary launch CTA is wrong');
        const shortcuts = home.locator('.home-page-nav a');
        assert(await shortcuts.count() === 5, 'homepage section shortcuts are incomplete');
        for (const link of await shortcuts.all()) {
            const target = await link.getAttribute('href');
            assert(target.startsWith('#') && await home.locator(target).count() === 1, 'section shortcut has a missing or ambiguous target: ' + target);
            assert(await home.locator(target).getAttribute('tabindex') === '-1', 'section shortcut target cannot receive keyboard focus: ' + target);
        }
        const example = home.locator('#classroom-example');
        assert(await example.isVisible(), 'classroom example is not visible');
        assert((await example.innerText()).includes('not a live AI result'), 'example provenance is missing');
        const glossary = example.locator('details').nth(1);
        await glossary.locator('summary').focus();
        await home.keyboard.press('Enter');
        assert(await glossary.getAttribute('open') !== null, 'sample glossary cannot be opened with the keyboard');
        const exitTicket = example.locator('details').nth(2);
        await exitTicket.locator('summary').focus();
        await home.keyboard.press('Space');
        assert(await exitTicket.getAttribute('open') !== null, 'sample exit ticket cannot be opened with the keyboard');
        await assertNoSeriousAxe(home, 'expanded classroom example', [['#classroom-example']]);
        const sampleResponse = await context.request.get(origin + '/assets/examples/water-cycle-source.txt');
        assert(sampleResponse.ok(), 'downloadable example source is unavailable');
        assert((await sampleResponse.text()).trim() === (await home.locator('#classroom-example-source').innerText()).trim(), 'downloaded source differs from the visible example');
        const copy = home.locator('#copy-example-source');
        assert(await copy.isVisible(), 'sample copy is not available when the clipboard API is supported');
        await copy.focus();
        await home.keyboard.press('Enter');
        await home.waitForFunction(() => document.getElementById('copy-example-status').textContent.startsWith('Copied.'));
        assert(await home.evaluate(() => window.exampleCopyCalls[0] === document.getElementById('classroom-example-source').textContent.trim()), 'copied sample differs from the visible source');
        assert(await copy.evaluate((node) => document.activeElement === node), 'copy action lost keyboard focus');
        await home.evaluate(() => { window.denyExampleCopy = true; });
        await copy.click();
        await home.waitForFunction(() => document.getElementById('copy-example-status').textContent.includes('Download the text file'));
        assert(await copy.getAttribute('aria-disabled') === null, 'copy button stayed disabled after a clipboard error');
        assert(await home.locator('.home-example-download').isVisible(), 'clipboard error hid the download fallback');
        await assertNoSeriousAxe(home, 'sample copy fallback', [['#classroom-example'], ['.home-page-nav']]);
        await home.locator('#homeToolSearch').fill('photosynthesis');
        assert(await home.locator('#homeToolResults a').count() >= 1, 'homepage source-aware finder did not return a result');
        await home.close();

        const noClipboard = await context.newPage();
        await noClipboard.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
        await noClipboard.goto(origin + '/index.html', { waitUntil: 'networkidle' });
        assert(await noClipboard.locator('#copy-example-source').isHidden(), 'unsupported clipboard leaves an unusable copy button');
        assert(await noClipboard.locator('.home-example-download').isVisible(), 'unsupported clipboard lost the sample download');
        await noClipboard.close();

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
            if (width === 390 || width === 1025) {
                const tourDots = page.locator('.slide-dots .dot');
                const totalSlides = await page.locator('#slides-viewport .slide').count();
                assert(await tourDots.count() === totalSlides, 'tour controls do not cover every slide');
                for (let index = 0; index < totalSlides; index++) {
                    await tourDots.nth(index).click();
                    const active = page.locator('#slides-viewport .slide.active');
                    const layout = await active.evaluate((slide) => ({
                        title: slide.querySelector('h3').textContent.replace(/\s+/g, ' ').trim(),
                        clipped: slide.scrollHeight > slide.clientHeight + 2,
                        overflow: document.documentElement.scrollWidth - innerWidth
                    }));
                    assert(!layout.clipped && layout.overflow <= 1, 'tour clips content at ' + width + 'px, slide ' + (index + 1));
                    assert((await page.locator('#slide-title').textContent()).includes(layout.title), 'tour title does not match visible slide ' + (index + 1));
                    assert(await tourDots.nth(index).getAttribute('aria-current') === 'step', 'tour current slide is not identified');
                }
            }
            const privacyShortcut = page.locator('.home-page-nav a[href="#privacy"]');
            await privacyShortcut.focus();
            await page.keyboard.press('Enter');
            await page.waitForFunction(() => location.hash === '#privacy' && document.activeElement.id === 'privacy');
            await page.waitForFunction(() => { const top = document.getElementById('privacy').getBoundingClientRect().top; return top >= 0 && top < 200; });
            await page.close();
        }

        noScriptContext = await configureContext(browser, { viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
        const noScriptHome = await noScriptContext.newPage();
        await noScriptHome.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
        assert(await noScriptHome.locator('.noscript-nav').isVisible(), 'homepage no-JavaScript navigation is not visible');
        assert(!(await noScriptHome.locator('.mobile-menu-btn').isVisible()), 'inert mobile menu trigger remains visible without JavaScript');
        assert(await noScriptHome.locator('#homeEntryPaths').count() === 1, 'homepage task routes disappear without JavaScript');
        assert(await noScriptHome.locator('#homeRemediation').count() === 1, 'homepage remediation disappears without JavaScript');
        assert(await noScriptHome.locator('#classroom-example').isVisible(), 'classroom example disappears without JavaScript');
        await noScriptHome.locator('#classroom-example details').nth(2).locator('summary').click();
        assert(await noScriptHome.locator('#classroom-example details').nth(2).getAttribute('open') !== null, 'sample resources require JavaScript');
        assert(await noScriptHome.locator('#copy-example-source').isHidden(), 'copy button remains inert without JavaScript');
        await noScriptHome.locator('.home-page-nav a[href="#privacy"]').click();
        await noScriptHome.waitForFunction(() => location.hash === '#privacy');
        assert(await noScriptHome.locator('.home-page-nav').isVisible(), 'section shortcuts require JavaScript');
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

        console.log('Promotion wave 3 browser QA: homepage shortcuts, classroom example copy/download and blocked clipboard fallback, 33-tool catalog, feedback context, breakpoints, axe, and no-JavaScript paths passed.');
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
