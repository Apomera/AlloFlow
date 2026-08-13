'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = { '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' };

const server = http.createServer((request, response) => {
    const relative = new URL(request.url, 'http://127.0.0.1').pathname.replace(/^\/+/, '') || 'index.html';
    const resolved = path.resolve(root, relative);
    if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
        response.writeHead(404).end('Not found');
        return;
    }
    response.writeHead(200, { 'Content-Type': mime[path.extname(resolved)] || 'application/octet-stream' });
    fs.createReadStream(resolved).pipe(response);
});

async function main() {
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const origin = 'http://127.0.0.1:' + server.address().port;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route('https://**', (route) => route.abort());
    try {
        await page.goto(origin + '/remediation.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => window.scrollTo(0, 1500));
        await page.waitForTimeout(100);
        const navTop = await page.locator('.navbar').evaluate((node) => node.getBoundingClientRect().top);
        if (Math.abs(navTop) > 1) throw new Error('sticky navbar top is ' + navTop);

        await page.goto(origin + '/whitepaper.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => window.scrollTo(0, 1500));
        await page.waitForTimeout(100);
        const tocTop = await page.locator('.paper-toc').evaluate((node) => node.getBoundingClientRect().top);
        if (tocTop < 80 || tocTop > 96) throw new Error('sticky contents top is ' + tocTop);
        console.log('Promotion sticky QA: navbar and white-paper contents remain fixed after scroll.');
    } finally {
        await page.close();
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
});
