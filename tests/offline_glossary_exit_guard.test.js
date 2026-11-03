import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { JSDOM } from 'jsdom';
import { mkdtempSync, readFileSync, writeFileSync, truncateSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const playerModule = process.env.ALLO_WORD_PRACTICE_CANDIDATE || 'word_practice_module.js';
const dir = mkdtempSync(join(tmpdir(), 'allo-offline-word-set-'));
const source = { title: 'River words', language: 'English', options: { mode: 'vocabulary', repetitions: 1, shuffle: false, cardTheme: 'cream', cardFont: 'georgia' },
  words: [{ id: 'river', word: 'River', definition: 'Moving water.', translations: { Spanish: 'Río' } }, { id: 'bank', word: 'Bank', definition: 'The ground beside a river.' }] };
const shell = { title: 'Cloud words', options: { mode: 'popup', repetitions: 1, shuffle: false }, words: ['Cloud', 'Rain', 'Fog'] };
let browser;
beforeAll(async () => {
  const app = new JSDOM('<!doctype html><html></html>', { runScripts: 'outside-only' });
  app.window.eval(readFileSync(playerModule, 'utf8'));
  for (const [name, set] of [['river', source], ['shell', shell]]) writeFileSync(join(dir, name + '.html'), app.window.AlloModules.WordPractice.buildHtml(set, set.options));
  app.window.close();
  browser = await chromium.launch({ headless: true });
}, 90_000);
afterAll(async () => { await browser?.close(); }, 90_000);

async function offline(name) {
  const context = await browser.newContext({ offline: true, viewport: { width: 1000, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), network = [], errors = [];
  page.setDefaultTimeout(12_000);
  page.on('request', req => { if (/^https?:/i.test(req.url())) network.push(req.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(join(dir, name + '.html')).href);
  await page.locator('.awp-card').waitFor();
  return { context, page, network, errors };
}
const btn = (page, name) => page.getByRole('button', { name, exact: true });
async function save(page, filename) {
  const download = page.waitForEvent('download');
  await btn(page, 'Save word set').click();
  const file = await download, path = join(dir, filename); await file.saveAs(path); await btn(page, 'I saved the file').click();
  return { path, data: JSON.parse(readFileSync(path, 'utf8')) };
}
async function select(page, file) {
  const chooser = page.waitForEvent('filechooser');
  await btn(page, 'Open word set').click();
  await (await chooser).setFiles(file);
}
async function note(page, text, x = 60) {
  const workspace = page.locator('[data-allo-anno-workspace]');
  if ((await btn(page, 'Annotate').getAttribute('aria-expanded')) !== 'true') await btn(page, 'Annotate').click();
  await workspace.getByRole('button', { name: /Note$/ }).click();
  await page.locator('.awp-stage').click({ position: { x, y: 60 } });
  await page.getByRole('textbox', { name: 'Note content', exact: true }).fill(text);
  await workspace.getByRole('button', { name: /Note$/ }).click();
}
async function highlightMeaning(page) {
  const workspace = page.locator('[data-allo-anno-workspace]');
  await btn(page, 'Show meaning').click();
  await workspace.getByRole('button', { name: /Highlight$/ }).click();
  await page.locator('.awp-stage .awp-definition').evaluate(field => {
    const range = document.createRange(); range.selectNodeContents(field);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    field.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await workspace.getByRole('button', { name: /Highlight$/ }).click();
}


describe('offline glossary exit protection',()=>{
 it('allows a clean reload, then preserves review marks when leaving is cancelled',async()=>{
  const {context,page,network,errors}=await offline('river');try{
   await page.reload();await page.locator('.awp-card').waitFor();await btn(page,'Add to review').click();
   const event=page.waitForEvent('dialog');const reload=page.reload({timeout:5000}).catch(error=>error);const dialog=await event;expect(dialog.type()).toBe('beforeunload');await dialog.dismiss();await reload;
   expect(await btn(page,'Remove from review').count()).toBe(1);expect(network).toEqual([]);expect(errors).toEqual([]);
  }finally{await context.close();}
 },30000);
 it('protects notes until the word set is saved, and permits exit after save or undo',async()=>{
  const {context,page,errors}=await offline('river');try{
   const blocked=()=>page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;});
   await btn(page,'Add to review').click();expect(await blocked()).toBe(true);await btn(page,'Remove from review').click();expect(await blocked()).toBe(false);
   await page.locator('summary').filter({hasText:'Card appearance'}).click();const size=page.getByRole('combobox',{name:'Card text size',exact:true}),prior=await size.inputValue(),next=await size.evaluate(el=>[...el.options].find(o=>o.value!==el.value&&!o.disabled).value);await size.selectOption(next);expect(await blocked()).toBe(true);await size.selectOption(prior);expect(await blocked()).toBe(false);
   await note(page,'Keep this annotation');expect(await blocked()).toBe(true);const exported=await save(page,'protected-notes.json');expect(JSON.stringify(exported.data)).toContain('Keep this annotation');expect(await blocked()).toBe(false);
   await page.reload();await page.locator('.awp-card').waitFor();expect(errors).toEqual([]);
  }finally{await context.close();}
 },30000);
 it('removes the previous guard when opening a saved replacement set',async()=>{
  const {context,page}=await offline('river');try{
   await btn(page,'Add to review').click();const exported=await save(page,'clean-import.json');await btn(page,'Remove from review').click();await select(page,exported.path);await btn(page,'Open without saving').click();
   await page.getByText('Word set opened.',{exact:true}).waitFor();expect(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})).toBe(false);
   await btn(page,'Remove from review').click();expect(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})).toBe(true);
  }finally{await context.close();}
 },30000);
});
