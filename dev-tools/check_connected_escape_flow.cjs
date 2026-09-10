const fs = require('fs'), { chromium } = require('playwright'), { expect } = require('@playwright/test');
const { source, makeRoom } = require('./fixtures/connected_escape_room.cjs');
const out = 'docs/connected-escape-room-flow'; fs.mkdirSync(out, { recursive: true });
const serial = makeRoom(); serial.nodes[5].requires = ['device-found', 'ledger-found'];
const discovery = makeRoom(); discovery.nodes[5].requires.push('wall-found');
(async () => {
 const browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [], audits = [];
 page.on('pageerror', error => errors.push(error.message));
 try {
  await page.route('http://flow.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Escape room connection review</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui}</style></head><body><main id="root"></main></body></html>' }));
  await page.goto('http://flow.test/');
  await page.addScriptTag({ path: 'desktop/web-app/node_modules/react/umd/react.development.js' });
  await page.addScriptTag({ path: 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js' });
  await page.addScriptTag({ path: 'connected_escape_room_module.js' });
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  await page.evaluate(({ source, serial, room, discovery }) => {
   window.flowCalls = []; window.liveWrites = 0; window.replies = [serial, room]; window.serial = serial; window.discovery = discovery; window.originalRoom = room;
   window.__alloFirebase = { db: {}, doc: () => { throw Error('No live reads from flow review'); }, updateDoc: () => { liveWrites++; throw Error('No live writes from flow review'); } };
   window.root = ReactDOM.createRoot(document.getElementById('root')); root.render(React.createElement(AlloModules.ConnectedEscapeRoomSetup, { inputText: source, language: 'English', appId: 'flow-browser', user: { uid: 'teacher' }, allowLive: false, onClose: () => {}, t: key => key, callGemini: async prompt => { flowCalls.push(prompt); return JSON.stringify(replies.shift()); } }));
  }, { source, serial, room: makeRoom(), discovery });
  const button = name => page.getByRole('button', { name, exact: true });
  await button('Generate connected room').click();
  const flow = page.locator('[data-room-flow]');
  await expect(flow.locator('summary').first()).toContainText('2 independent puzzle paths'); expect(await page.evaluate(() => flowCalls.length)).toBe(2);
  await expect(flow).not.toHaveAttribute('open', '');
  await flow.locator('summary').first().focus(); await page.keyboard.press('Enter');
  await expect(flow.locator('[data-flow-object]')).toHaveCount(7);
  await page.locator('[data-flow-object="device"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-edit-object="device"] textarea').first()).toBeFocused();
  await button('Back to room connections').focus(); await page.keyboard.press('Enter'); await expect(flow.locator('summary').first()).toBeFocused();
  for (const [name, width, dark, large, forced] of [['desktop',1280,false,false,false],['mobile',320,false,false,false],['dark',390,true,false,false],['large-text',320,false,true,false],['forced-colors',390,false,false,true]]) {
   await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ forcedColors: forced ? 'active' : 'none', reducedMotion: 'reduce' });
   await page.evaluate(({ dark, large }) => { document.documentElement.classList.toggle('dark', dark); document.documentElement.style.fontSize = large ? '200%' : ''; document.getElementById('spacing')?.remove(); if (large) { const style = document.createElement('style'); style.id='spacing'; style.textContent='.cer *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.cer p{margin-bottom:2em!important}'; document.head.appendChild(style); } }, { dark, large });
   await flow.scrollIntoViewIfNeeded();
   const result = await page.evaluate(async () => { const dialog=document.querySelector('[role="dialog"]'), flow=document.querySelector('[data-room-flow]'); return { overflow: dialog.scrollWidth > dialog.clientWidth + 1 || flow.scrollWidth > flow.clientWidth + 1, smallestTarget: Math.min(...[...flow.querySelectorAll('button')].map(button => button.getBoundingClientRect().height)), violations: (await axe.run(dialog, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) }; });
   audits.push({ name, width, dark, large, forced, ...result }); expect(result.overflow).toBe(false); expect(result.violations).toEqual([]); expect(result.smallestTarget).toBeGreaterThanOrEqual(44);
   await page.screenshot({ path: out + '/flow-' + name + '.png', fullPage: true });
  }
  await page.emulateMedia({ forcedColors: 'none' }); await page.setViewportSize({ width: 1280, height: 900 }); await page.evaluate(() => { document.documentElement.className=''; document.documentElement.style.fontSize=''; document.getElementById('spacing')?.remove(); replies=[originalRoom,discovery]; });
  await page.getByRole('combobox', { name: 'Room structure', exact: true }).selectOption('discovery'); await button('Generate another room').click();
  await expect(flow).toContainText('A tool discovery opens the puzzle paths: Faded wall diagram'); expect(await page.evaluate(() => flowCalls.length)).toBe(4);
  expect(await page.evaluate(() => flowCalls[3])).toContain('one use-tool discovery');
  await button('Play solo').click(); await expect(page.locator('[data-room-flow]')).toHaveCount(0); await expect(page.locator('[data-submit-object="lens"]')).toBeVisible(); await button('Back to room setup').click();
  const before = await flow.innerText(); await page.evaluate(() => { replies = [serial, serial]; }); await button('Generate another room').click();
  await expect(page.getByRole('alert')).toContainText('independent reasoning paths'); expect(await flow.innerText()).toBe(before); await expect(button('Play solo')).toBeEnabled(); expect(await page.evaluate(() => flowCalls.length)).toBe(6);
  // Import a structurally valid v1 sequential room. New quality rules apply only to new AI generation.
  await page.locator('[data-room-transfer] > summary').click();
  const file = { format: 'alloflow-connected-escape', version: 1, language: 'English', source, room: serial };
  await page.locator('input[type="file"]').setInputFiles({ name: 'legacy.alloroom.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await page.locator('[data-open-imported]').click(); await expect(flow.locator('[data-flow-concern]')).toContainText('remains playable'); await expect(button('Play solo')).toBeEnabled();
  expect(await page.evaluate(() => liveWrites)).toBe(0); expect(errors).toEqual([]);
  fs.writeFileSync(out + '/browser-verification.json', JSON.stringify({ passed: true, ai: 'Deterministic provider fixtures through production generation and repair', providerRequests: 6, liveWrites: 0, scenarios: ['sequential generation repaired once','native keyboard flow expansion','exact editor focus and return','discovery structure repaired to shared tool gate','solo view excludes teacher flow','failed repair preserves previous room','legacy sequential import remains playable'], audits, errors }, null, 2));
  console.log('Room flow browser checks passed: keyboard navigation, generation repair, legacy import, five accessibility/reflow views, zero live writes.');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
