// After the home chooser is dismissed, can a student still reach Free Build?
import { chromium } from '@playwright/test';
const out = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const bucket = { _introShownOnce: true, worldActive: true, activeLesson: 'volumeExplorer', tutorialDismissed: true, showLessonIntro: false };
await p.goto('http://127.0.0.1:4178/?bucket=' + encodeURIComponent(JSON.stringify(bucket)), { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 40 && !(await p.evaluate(() => !!window.__geoWorldEngine)); i++) await p.waitForTimeout(1000);
await p.waitForTimeout(2000);
const step = async (label, fn) => { const r = await p.evaluate(fn); console.log(label, JSON.stringify(r)); return r; };

await step('1 chooser on entry, with Continue', () => ({ chooser: !!document.querySelector('.gwe-home'), continueBtn: !!document.querySelector('button.gwe-home-continue') }));
await step('2 leave via Continue', async () => { document.querySelector('button.gwe-home-continue').click(); await new Promise(r => setTimeout(r, 500)); return { chooserGone: !document.querySelector('.gwe-home'), lesson: window.__toolData.geometryWorld.activeLesson }; });
await p.screenshot({ path: out + '/freebuild-1-after-continue.png' });
const r3 = await step('3 Free Build button visible in the lesson world', () => { const b = document.querySelector('button.gwe-free-build-launch'); const r = b && b.getBoundingClientRect(); return { present: !!b, text: b && b.textContent.trim(), rect: r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }; });
await step('4 click it: launcher opens', async () => { document.querySelector('button.gwe-free-build-launch').click(); await new Promise(r => setTimeout(r, 500)); const d = document.getElementById('gwe-sandbox-launcher'); return { launcher: !!d, openBtn: !!(d && d.querySelector('button.gwe-open')), openText: d && d.querySelector('button.gwe-open') && d.querySelector('button.gwe-open').textContent.trim() }; });
await p.screenshot({ path: out + '/freebuild-2-launcher.png' });
await step('5 open Free Build: sandbox world with the Studio dock', async () => { document.querySelector('#gwe-sandbox-launcher button.gwe-open').click(); await new Promise(r => setTimeout(r, 1500)); const d = window.__toolData.geometryWorld; return { activeLesson: d.activeLesson, worldActive: d.worldActive, dock: !!document.querySelector('.gwe-builder-dock'), chooser: !!document.querySelector('.gwe-home') }; });
await p.screenshot({ path: out + '/freebuild-3-sandbox.png' });
await step('6 the toolbar title reopens the chooser, and Continue returns to the sandbox', async () => { const t = document.querySelector('#gw-title button') || document.querySelector('button.gw-title'); if (!t) return { titleButton: false }; t.click(); await new Promise(r => setTimeout(r, 500)); const chooser = !!document.querySelector('.gwe-home'); const cont = document.querySelector('button.gwe-home-continue'); const contPresent = !!cont; if (cont) cont.click(); await new Promise(r => setTimeout(r, 500)); return { titleButton: true, chooserReopened: chooser, continuePresent: contPresent, backInSandbox: window.__toolData.geometryWorld.activeLesson === 'builderSandbox' && !document.querySelector('.gwe-home') }; });
await step('7 from the reopened chooser, Build leads to Free Build too', async () => { const t = document.querySelector('#gw-title button'); t.click(); await new Promise(r => setTimeout(r, 400)); const build = Array.from(document.querySelectorAll('.gwe-home button')).find(x => /^Build$|Build\b/.test((x.textContent || '').trim())); const label = build && build.textContent.trim().slice(0, 40); if (build) build.click(); await new Promise(r => setTimeout(r, 500)); const page = window.__toolData.geometryWorld.geometryHomePage; const start = Array.from(document.querySelectorAll('.gwe-home button')).map(x => (x.textContent || '').trim().slice(0, 30)); return { buildLabel: label, homePage: page, buttonsNow: start.slice(0, 8) }; });
await p.screenshot({ path: out + '/freebuild-4-chooser-build.png' });
console.log('errs', errs);
await b.close();
