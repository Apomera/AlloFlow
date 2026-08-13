'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const axePath = require.resolve('axe-core/axe.min.js');
const mime = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.xml': 'application/xml; charset=utf-8',
    '.zip': 'application/zip'
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
        fs.stat(resolved, (statError, stat) => {
            if (statError || !stat.isFile()) {
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

async function main() {
    const server = createServer();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    const origin = 'http://127.0.0.1:' + address.port;
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route('https://unpkg.com/**', (route) => route.fulfill({
        contentType: 'text/javascript',
        body: 'window.lucide={createIcons:function(){}};'
    }));
    await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }));
    await context.route('https://fonts.gstatic.com/**', (route) => route.abort());

    try {
        for (const file of ['remediation.html', 'ways-to-use.html', 'whitepaper.html']) {
            const page = await context.newPage();
            const runtimeErrors = [];
            page.on('pageerror', (error) => runtimeErrors.push(error.message));
            page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
            const response = await page.goto(origin + '/' + file, { waitUntil: 'networkidle' });
            assert(response && response.ok(), file + ' did not return HTTP 200');
            assert(await page.locator('h1').count() === 1, file + ' does not render exactly one h1');
            assert(await page.locator('main#main-content').count() === 1, file + ' main landmark missing');
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            assert(overflow <= 1, file + ' has ' + overflow + 'px horizontal overflow at desktop width');
            await page.addScriptTag({ path: axePath });
            const axe = await page.evaluate(async () => {
                const report = await window.axe.run(document, {
                    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
                });
                return report.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))
                    .map((violation) => violation.id + ': ' + violation.nodes.length);
            });
            assert(axe.length === 0, file + ' serious/critical axe findings: ' + axe.join(', '));
            assert(runtimeErrors.length === 0, file + ' runtime errors: ' + runtimeErrors.join(' | '));
            await page.close();
        }

        const home = await context.newPage();
        await home.goto(origin + '/index.html', { waitUntil: 'networkidle' });
        await home.locator('#homeRemediation').waitFor();
        await home.locator('#homeToolFinder').waitFor();
        assert(await home.locator('#homeRemediation a[href="remediation.html"]').count() >= 1, 'homepage remediation CTA missing');
        assert(await home.locator('.nav-links a[href="remediation.html"]').count() === 1, 'homepage remediation nav missing');
        await home.locator('#homeToolSearch').fill('WCAG');
        assert(await home.locator('#homeToolResults a').count() >= 1, 'homepage WCAG search returned no compact result');
        await home.close();

        const tools = await context.newPage();
        await tools.goto(origin + '/tools.html', { waitUntil: 'networkidle' });
        await tools.locator('#toolResults .tool-result-card').first().waitFor();
        await tools.locator('#toolSearch').fill('WCAG');
        await tools.waitForTimeout(100);
        const remediationLink = tools.locator('[data-tool-id="documentRemediation"] .tool-detail-link');
        assert(await remediationLink.getAttribute('href') === 'remediation.html', 'document remediation finder result has wrong detail route');
        await tools.close();

        const mobile = await context.newPage();
        await mobile.setViewportSize({ width: 390, height: 844 });
        await mobile.goto(origin + '/remediation.html', { waitUntil: 'networkidle' });
        const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert(mobileOverflow <= 1, 'remediation page has ' + mobileOverflow + 'px horizontal overflow on mobile');
        const menuButton = mobile.locator('.mobile-menu-btn');
        await menuButton.click();
        assert(await menuButton.getAttribute('aria-expanded') === 'true', 'mobile menu did not expose expanded state');
        assert(await mobile.locator('#mobileNav').getAttribute('aria-hidden') === 'false', 'mobile menu did not expose visible state');
        await mobile.keyboard.press('Escape');
        assert(await menuButton.getAttribute('aria-expanded') === 'false', 'Escape did not close mobile menu');
        assert(await menuButton.evaluate((node) => node === document.activeElement), 'mobile menu did not restore trigger focus');
        await mobile.close();

        const printPage = await context.newPage();
        await printPage.goto(origin + '/whitepaper.html', { waitUntil: 'networkidle' });
        await printPage.emulateMedia({ media: 'print' });
        assert(await printPage.locator('.navbar').evaluate((node) => getComputedStyle(node).display) === 'none', 'print layout leaves navbar visible');
        assert(await printPage.locator('.paper').evaluate((node) => getComputedStyle(node).display) !== 'none', 'print layout hides white paper');
        await printPage.close();

        console.log('Promotion browser QA: 3 pages + homepage + finder + mobile menu + print layout passed.');
    } finally {
        await context.close();
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
});
