// Quick Playwright diagnostic — shows exactly what happens when loading the app
const { chromium } = require('C:/Users/Tyler/AlloFlow/local-app/node_modules/playwright-core');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', m => {
        const txt = m.text();
        if (!txt.includes('Download the React DevTools')) // filter noise
            console.log(`[PAGE:${m.type()}]`, txt.slice(0, 200));
    });
    page.on('pageerror', e => console.log('[PAGEERROR]', e.message.slice(0, 300)));
    page.on('requestfailed', r => console.log('[REQFAIL]', r.url(), r.failure()?.errorText));
    page.on('close', () => console.log('[PAGE CLOSED]'));
    page.on('crash', () => console.log('[PAGE CRASHED]'));

    // Check before navigation what scripts might block
    page.on('response', async resp => {
        const url = resp.url();
        if (url.includes('react') || url.includes('app.js') || url.includes('sharedContext')) {
            console.log(`[RESP] ${resp.status()} ${url.split('/').pop()}`);
        }
    });

    console.log('Navigating to app...');
    try {
        const resp = await page.goto('http://127.0.0.1:3730/', {
            waitUntil: 'domcontentloaded',
            timeout: 20_000,
        });
        console.log('goto complete. Status:', resp?.status(), 'URL:', page.url());
    } catch (e) {
        console.log('goto ERROR:', e.message.slice(0, 200));
    }

    await page.waitForTimeout(2000);
    console.log('Page URL after 2s:', page.url());
    console.log('Page closed?', page.isClosed());

    // Poll root children for 8 more seconds
    for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(1000).catch(() => {});
        if (page.isClosed()) { console.log('PAGE CLOSED during poll'); break; }
        const kids = await page.evaluate(() => document.getElementById('root')?.children?.length ?? -1).catch(e => 'err: ' + e.message);
        console.log(`root children at ${2+i+1}s:`, kids);
        if (kids > 0) break;
    }

    // Try force-mounting a test component to prove React works
    try {
        const testMount = await page.evaluate(() => {
            try {
                const root = document.getElementById('root');
                if (!window.React || !window.ReactDOM || !window.ReactDOM.createRoot) {
                    return { ok: false, reason: 'React/ReactDOM missing' };
                }
                const el = window.React.createElement('div', {id:'test-mount'}, 'TEST OK');
                window.ReactDOM.createRoot(root).render(el);
                return { ok: true };
            } catch(e) {
                return { ok: false, reason: e.message };
            }
        });
        console.log('Force-mount test:', JSON.stringify(testMount));
        await page.waitForTimeout(500);
        const afterMount = await page.evaluate(() => document.getElementById('root')?.innerHTML ?? '?');
        console.log('root innerHTML after force-mount:', afterMount.slice(0, 100));
    } catch(e) {
        console.log('Force-mount evaluate error:', e.message);
    }

    try {
        const rootInnerHTML = await page.evaluate(() => document.getElementById('root')?.innerHTML ?? 'no element');
        const hasReact = await page.evaluate(() => typeof window.React);
        const hasReactDOM = await page.evaluate(() => typeof window.ReactDOM);
        const rootKids = await page.evaluate(() => document.getElementById('root')?.children?.length ?? 'no-root');
        const hasAlloShared = await page.evaluate(() => typeof window.__alloShared);
        const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 100) || '(empty)');
        const errors = await page.evaluate(() => window.__pw_diag_errors || []);
        console.log('window.React:', hasReact);
        console.log('window.ReactDOM:', hasReactDOM);
        console.log('root children:', rootKids);
        console.log('root innerHTML length:', rootInnerHTML.length);
        console.log('__alloShared:', hasAlloShared);
        console.log('body text:', bodyText);
    } catch (e) {
        console.log('evaluate ERROR:', e.message.slice(0, 200));
    }

    await browser.close();
    console.log('Done.');
})();
