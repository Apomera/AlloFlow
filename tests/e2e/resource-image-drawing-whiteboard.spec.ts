import { test, expect, type BrowserContext, type Page, type FrameLocator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// "Draw with Excalidraw" (Resource images) and the Educator Hub Whiteboard, run
// from a Gemini-Canvas-style origin. Both origins are routed to the WORKING TREE
// (image_asset_editor_module.js, whiteboard/whiteboard.html), so this measures
// local edits, not the deployed CDN. Excalidraw itself loads from jsdelivr.
//
// 2026-10-29: the image-slot path opened ./whiteboard/ relative to the page, a 404
// on Canvas's origin, and its handshake was same-origin only. The page-level
// 404 route below keeps that regression visible.

const HOST = 'https://abc123-scf.usercontent.goog';
const CDN = 'https://alloflow-cdn.pages.dev';
const read = (p: string) => readFileSync(resolve(process.cwd(), p));
const reactUmd = read('desktop/web-app/node_modules/react/umd/react.production.min.js').toString('utf8');

const slotPage = `<!doctype html><meta charset="utf-8"><script>${reactUmd.split('</script').join('<\\/script')}</script>
<script src="${HOST}/image_asset_editor_module.js"></script>
<button id="go">Draw</button><pre id="out"></pre>
<script>
window.__scene = null;
document.getElementById('go').onclick = () => {
  document.getElementById('out').textContent = '';
  window.AlloModules.ResourceImageTools.openResourceDrawing({ scene: window.__scene, title: 'River',
    onSave: r => { window.__scene = r.scene; document.getElementById('out').textContent = 'SAVED ' + r.dataUrl.slice(0, 15) + ' els=' + r.scene.elements.length; return true; },
    onError: e => { document.getElementById('out').textContent = 'ERROR ' + e.message; } });
};
</script>`;

// The Educator Hub's half of the standalone handshake (AlloFlowANTI.txt openWhiteboard).
const hubPage = (declare: boolean) => `<!doctype html><meta charset="utf-8"><button id="go">Whiteboard</button>
<script>
window.addEventListener('message', ev => {
  if (ev.origin !== '${CDN}' || !ev.data || ev.data.type !== 'allocwb-hello') return;
  ev.source.postMessage({ type: 'allocwb-ack' }, '${CDN}');
});
document.getElementById('go').onclick = () => window.open('${CDN}/whiteboard/whiteboard.html?v=4' + (${declare} ? '&host=' + encodeURIComponent(window.origin || location.origin) : ''), 'alloflow-whiteboard', 'width=1280,height=860');
</script>`;

const sandboxed = (inner: string) =>
  `<!doctype html><iframe id="f" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" style="width:600px;height:300px"></iframe><script>document.getElementById('f').srcdoc=${JSON.stringify(inner).split('</').join('<\\u002f')};</script>`;

async function routeOrigins(context: BrowserContext, page: string) {
  await context.route(HOST + '/**', (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/image_asset_editor_module.js') return route.fulfill({ contentType: 'text/javascript', body: read('image_asset_editor_module.js') });
    if (pathname.startsWith('/whiteboard/')) return route.fulfill({ status: 404, body: 'not here' });
    return route.fulfill({ contentType: 'text/html', body: page });
  });
  await context.route(CDN + '/whiteboard/**', (route) => route.fulfill({ contentType: 'text/html', body: read('whiteboard/whiteboard.html') }));
}

async function openPopup(context: BrowserContext, frame: Page | FrameLocator, linkedLabel: string) {
  const [popup] = await Promise.all([context.waitForEvent('page'), frame.locator('#go').click()]);
  await popup.waitForLoadState('domcontentloaded');
  await expect(popup.locator('#saveBtn')).toHaveText(linkedLabel, { timeout: 60000 });
  await popup.locator('.excalidraw canvas').last().waitFor({ timeout: 60000 });
  await popup.waitForTimeout(1000);
  return popup;
}

for (const mode of ['real origin', 'opaque frame'] as const) {
  test(`resource image drawing round-trips from a Canvas ${mode}`, async ({ context }) => {
    test.setTimeout(180000);
    await routeOrigins(context, mode === 'opaque frame' ? sandboxed(slotPage) : slotPage);
    const page = await context.newPage();
    await page.goto(HOST + '/');
    const frame = mode === 'opaque frame' ? page.frameLocator('#f') : page;
    const out = frame.locator('#out');

    // New drawing: one rectangle, then Use drawing.
    let popup = await openPopup(context, frame, 'Use drawing');
    expect(new URL(popup.url()).origin).toBe(CDN);
    const box = (await popup.locator('.excalidraw canvas').last().boundingBox())!;
    await popup.locator('[data-testid=toolbar-rectangle]').first().click({ force: true });
    await popup.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2 - 60);
    await popup.mouse.down();
    await popup.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 60, { steps: 8 });
    await popup.mouse.up();
    let closed = popup.waitForEvent('close');
    await popup.locator('#saveBtn').click();
    await expect(out).toHaveText(/^SAVED data:image\/png; els=1$/);
    await closed;

    // Edit drawing: the saved scene comes back and saves again.
    popup = await openPopup(context, frame, 'Use drawing');
    closed = popup.waitForEvent('close');
    await popup.locator('#saveBtn').click();
    await expect(out).toHaveText(/^SAVED data:image\/png; els=1$/);
    await closed;
  });
}

test('Educator Hub Whiteboard links to a Canvas origin only when the app declares it', async ({ context }) => {
  test.setTimeout(180000);
  for (const declare of [true, false]) {
    await context.unrouteAll();
    await routeOrigins(context, hubPage(declare));
    const page = await context.newPage();
    await page.goto(HOST + '/');
    const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('#go').click()]);
    const save = popup.locator('#saveBtn');
    await popup.locator('.excalidraw canvas').last().waitFor({ timeout: 60000 });
    if (declare) await expect(save).toHaveAttribute('aria-disabled', 'false', { timeout: 30000 });
    else { await popup.waitForTimeout(3000); await expect(save).toHaveAttribute('aria-disabled', 'true'); }
    await popup.close(); await page.close();
  }
});
