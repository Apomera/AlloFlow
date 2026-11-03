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

describe('standalone word set import on file://', () => {
  it('offers one finish action, then the actual marked review or a fresh round', async () => {
    const { context, page, network, errors } = await offline('shell');
    try {
      await btn(page, 'Add to review').click();
      await btn(page, 'Next').click(); await btn(page, 'Add to review').click();
      await btn(page, 'Next').click();
      expect(await btn(page, 'Finish round').isEnabled()).toBe(true);
      await btn(page, 'Finish round').click();
      const heading = page.getByRole('heading', { name: 'Round complete' });
      expect(await heading.count()).toBe(1);
      expect(await heading.evaluate(node => node === document.activeElement)).toBe(true);
      await page.keyboard.press('ArrowRight');
      expect(await heading.count()).toBe(1);
      expect(await btn(page, 'Review 2 marked words').count()).toBe(1);
      expect((await save(page, 'completed-set.json')).data.reviewItemIds).toEqual(['w1', 'w2']);
      await btn(page, 'Review 2 marked words').click();
      expect(await page.locator('.awp-progress').textContent()).toBe('Card 1 of 2');
      await btn(page, 'Next').click(); await btn(page, 'Remove from review').click();
      await page.keyboard.press('ArrowRight');
      await btn(page, 'Review 1 marked word').click();
      expect(await page.locator('.awp-word').textContent()).toBe('Cloud');
      expect(await page.locator('.awp-progress').textContent()).toBe('Card 1 of 1');
      await page.keyboard.press('Space');
      expect(await heading.isVisible()).toBe(true);
      await btn(page, 'New round').click();
      expect(await heading.count()).toBe(0);
      expect(await page.locator('.awp-progress').textContent()).toBe('Card 1 of 3');
      expect(await btn(page, 'Start review (1)').isEnabled()).toBe(true);
      expect(network).toEqual([]); expect(errors).toEqual([]);
    } finally { await context.close(); }
  }, 90_000);
  it('passes review marks from the offline player into the app and back', async () => {
    const first = await offline('river');
    let offlineFile;
    try {
      await btn(first.page, 'Next').click();
      await btn(first.page, 'Add to review').click();
      offlineFile = await save(first.page, 'marked-offline.json');
    } finally { await first.context.close(); }

    const app = await browser.newContext({ offline: true });
    let appFile;
    try {
      const page = await app.newPage();
      await page.setContent('<main></main>');
      await page.addScriptTag({ content: readFileSync(playerModule, 'utf8') });
      await page.evaluate(() => window.AlloModules.WordPractice.open({ words: ['Cloud'] }));
      await select(page, offlineFile.path);
      await page.getByText('Word set opened.', { exact: true }).waitFor();
      await btn(page, 'Present').click();
      await btn(page, 'Start review (1)').click();
      expect(await page.locator('.awp-word').textContent()).toBe('Bank');
      await btn(page, 'Remove from review').click();
      await btn(page, 'New round').click();
      await btn(page, 'Add to review').click();
      await btn(page, 'Back to setup').click();
      appFile = await save(page, 'marked-app.json');
      expect(appFile.data.reviewItemIds).toEqual(['river']);
    } finally { await app.close(); }

    const second = await offline('shell');
    try {
      await select(second.page, appFile.path);
      await btn(second.page, 'Start review (1)').click();
      expect(await second.page.locator('.awp-word').textContent()).toBe('River');
      expect(await second.page.locator('.awp-progress').textContent()).toBe('Card 1 of 1');
      expect(second.network).toEqual([]); expect(second.errors).toEqual([]);
    } finally { await second.context.close(); }
  }, 90_000);
  it('resumes a saved multi-card set, then saves and opens it again without the app or network', async () => {
    const first = await offline('river');
    let saved;
    try {
      await note(first.page, 'Trace the river.'); await highlightMeaning(first.page);
      await btn(first.page, 'Next').click(); await note(first.page, 'Locate the bank.');
      await btn(first.page, 'Add to review').click();
      saved = await save(first.page, 'student.json');
      expect(saved.data.reviewItemIds).toEqual(['bank']);
      expect(saved.data.items[0].annotations.map(a => a.kind)).toContain('highlight');
      expect(saved.data.items[1].annotations[0].content).toBe('Locate the bank.');
      expect(first.network).toEqual([]); expect(first.errors).toEqual([]);
    } finally { await first.context.close(); }

    const second = await offline('shell'), page = second.page;
    try {
      expect(await page.locator('h1').textContent()).toBe('Cloud words');
      await select(page, saved.path);
      await page.waitForFunction(() => document.title === 'River words' && document.activeElement === document.querySelector('h1'));
      expect(await page.locator('.awp-progress').textContent()).toBe('Card 1 of 2');
      expect(await btn(page, 'Start review (1)').isEnabled()).toBe(true);
      expect(await page.locator('.awp-stage').getAttribute('data-awp-card-font')).toBe('georgia');
      await btn(page, 'Show meaning').click(); expect(await page.locator('.awp-stage .awp-definition').textContent()).toBe('Moving water.');
      expect(await page.locator('.awp-stage .awp-translation[lang=es]').textContent()).toBe('Río');
      await btn(page, 'Annotate').click(); await btn(page, 'Toggle annotation list').click();
      expect(await page.getByRole('list', {name:'Annotations'}).innerText()).toContain('Trace the river.');
      expect(await page.getByRole('list', {name:'Annotations'}).innerText()).toContain('Moving water.');
      await btn(page, 'Close annotation list').click();
      await btn(page, 'Next').click(); expect(await page.locator('.awp-word').textContent()).toBe('Bank');
      await btn(page, 'Toggle annotation list').click();
      expect(await page.getByRole('list', {name:'Annotations'}).innerText()).toContain('Locate the bank.');
      await btn(page, 'Close annotation list').click();
      await note(page, 'Connect it to the shoreline.', 310);
      const again = await save(page, 'revised.json');
      expect(again.data.items[1].annotations.map(a => a.content)).toEqual(['Locate the bank.', 'Connect it to the shoreline.']);
      expect(again.data.options).toEqual(saved.data.options);
      expect(again.data.reviewItemIds).toEqual(saved.data.reviewItemIds);
      await select(page, again.path);
      await page.waitForFunction(() => document.activeElement === document.querySelector('h1'));
      await page.keyboard.press('ArrowRight');
      expect(await page.locator('.awp-progress').textContent()).toBe('Card 2 of 2');
      expect((await save(page, 'roundtrip.json')).data.items[1].annotations).toEqual(again.data.items[1].annotations);
      await btn(page, 'Start review (1)').click();
      expect(await page.locator('.awp-progress').textContent()).toBe('Card 1 of 1');
      expect(await page.locator('.awp-word').textContent()).toBe('Bank');
      await btn(page, 'Remove from review').click();
      expect((await save(page, 'unmarked.json')).data.reviewItemIds).toBeUndefined();
      expect(second.network).toEqual([]); expect(second.errors).toEqual([]);
    } finally { await second.context.close(); }
  }, 90_000);

  it('protects app marks when returning from practice to setup and opening a file', async () => {
    const context = await browser.newContext({ offline:true });
    try {
      const page = await context.newPage(); await page.setContent('<main></main>');
      await page.addScriptTag({ content: readFileSync(playerModule, 'utf8') });
      await page.evaluate(() => window.AlloModules.WordPractice.open({ title: 'Cloud words', words: ['Cloud'] }));
      await btn(page, 'Present').click(); await btn(page, 'Add to review').click(); await btn(page, 'Back to setup').click();
      const file = { name: 'river.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(source)) };
      await select(page, file);
      await page.getByRole('dialog', { name: /Save changes/ }).waitFor();
      await page.keyboard.press('Escape');
      await btn(page, 'Present').click(); expect(await btn(page, 'Start review (1)').isEnabled()).toBe(true);
      await btn(page, 'Back to setup').click(); await select(page, file);
      const download = page.waitForEvent('download');
      await btn(page, 'Save and open').click();
      const saved = join(dir, 'app-save-before-replace.json'); await (await download).saveAs(saved); await btn(page, 'I saved the file').click();
      const snapshot = JSON.parse(readFileSync(saved, 'utf8'));
      expect(snapshot.items[0].word).toBe('Cloud');
      expect(snapshot.reviewItemIds).toEqual([snapshot.items[0].id]);
      await page.getByText('Word set opened.', { exact: true }).waitFor();
      await btn(page, 'Present').click(); expect(await page.locator('.awp-word').textContent()).toBe('River');
    } finally { await context.close(); }
  }, 90000);

  it('offers all three replacements only for changed marks or notes and downloads the old set before opening', async () => {
    const { context, page, errors } = await offline('shell');
    const file = { name: 'river.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(source)) };
    try {
      await btn(page, 'Add to review').click();
      await select(page, file);
      const prompt = page.getByRole('dialog', { name: /Save changes/ });
      await prompt.waitFor();
      await btn(page, 'Cancel').click();
      expect(await page.title()).toBe('Cloud words');
      expect(await btn(page, 'Start review (1)').isEnabled()).toBe(true);
      await note(page, 'Keep this offline note.');
      await select(page, file);
      const download = page.waitForEvent('download');
      await btn(page, 'Save and open').click();
      const saved = join(dir, 'save-before-replace.json'); await (await download).saveAs(saved); await btn(page, 'I saved the file').click();
      const snapshot = JSON.parse(readFileSync(saved, 'utf8'));
      expect(snapshot.title).toBe('Cloud words');
      expect(snapshot.reviewItemIds).toHaveLength(1);
      expect(snapshot.items[0].annotations.some(entry => entry.content === 'Keep this offline note.')).toBe(true);
      await page.waitForFunction(() => document.title === 'River words');
      await note(page, 'A change on the replacement.');
      await select(page, { name: 'cloud.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(shell)) });
      await btn(page, 'Open without saving').click();
      await page.waitForFunction(() => document.title === 'Cloud words');
      expect(await btn(page, 'Start review (0)').isEnabled()).toBe(false);
      await btn(page, 'Add to review').click(); await btn(page, 'Remove from review').click();
      await btn(page, 'Next').click();
      await select(page, file);
      await page.waitForFunction(() => document.title === 'River words');
      expect(await page.getByRole('dialog', { name: /Save changes/ }).count()).toBe(0);
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  }, 90000);

  it('keeps the old set and its edits if Save and open cannot create the download', async () => {
    const { context, page } = await offline('shell');
    try {
      await btn(page, 'Add to review').click();
      await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Download unavailable'); }; });
      await select(page, { name:'river.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(source)) });
      await btn(page, 'Save and open').click();
      await page.waitForFunction(() => document.querySelector('.awp-status').textContent.includes('Download unavailable'));
      expect(await page.title()).toBe('Cloud words');
      expect(await btn(page, 'Start review (1)').isEnabled()).toBe(true);
    } finally { await context.close(); }
  }, 90000);

  it('preserves the current card and unsaved annotations after cancellation or invalid inputs', async () => {
    const { context, page, network, errors } = await offline('shell');
    try {
      await btn(page, 'Next').click(); await note(page, 'Still on Rain.');
      await page.evaluate(() => { window.originalHost = document.querySelector('#practice'); });
      const before = (await save(page, 'before-failed-imports.json')).data;
      await select(page, []);
      for (const [name, text, error] of [
        ['corrupt.json', '<script>alert(1)</script>', 'Choose a valid word set JSON file.'],
        ['empty.json', '{"items":[]}', 'This file does not contain a word list.'],
        ['partial.json', '{"items":[{"word":"valid"},{"oops":1}]}', 'Choose a valid word set JSON file.'],
        ['unplayable.json', '{"options":{"mode":"sentence"},"words":["Cloud"]}', 'Prepare a Finish the Sentence activity'],
      ]) {
        await select(page, { name, mimeType: 'application/json', buffer: Buffer.from(text) });
        await page.waitForFunction(message => document.querySelector('.awp-status').textContent.includes(message), error);
        expect(await page.evaluate(() => document.querySelector('#practice') === window.originalHost && document.activeElement.textContent === 'Open word set')).toBe(true);
      }
      const oversized = join(dir, 'oversize.json'); writeFileSync(oversized, ''); truncateSync(oversized, 32 * 1024 * 1024 + 1);
      await select(page, oversized);
      await page.waitForFunction(() => document.querySelector('.awp-status').textContent.includes('32 MB'));
      expect(await page.locator('.awp-word').textContent()).toBe('Rain'); expect((await save(page, 'after-failed-imports.json')).data).toEqual(before);
      await btn(page, 'Next').click(); expect(await page.locator('.awp-word').textContent()).toBe('Fog');
      expect(network).toEqual([]); expect(errors).toEqual([]);
    } finally { await context.close(); }
  }, 90_000);

  it('keeps a strict original image policy when a replacement contains web picture links', async () => {
    const { context, page, network, errors } = await offline('shell');
    try {
      const linked = { ...source, words: [{ word: 'Marsh', definition: 'Wet ground.', picture: { src: 'https://example.org/marsh.png', alt: 'Grasses beside water', credit: 'Class photo' } }] };
      await select(page, { name: 'link.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(linked)) });
      await page.getByText('This offline file shows descriptions and credits instead of linked pictures.').waitFor();
      await btn(page, 'Show meaning').click();
      expect(await page.locator('.awp-picture').innerText()).toContain('Grasses beside water');
      expect(await page.locator('.awp-picture figcaption').textContent()).toBe('Class photo');
      expect((await save(page, 'linked.json')).data.items[0].picture.src).toBe(linked.words[0].picture.src);
      expect(network).toEqual([]); expect(errors).toEqual([]);
    } finally { await context.close(); }
  }, 90_000);

  it('ignores an obsolete file read and removes the old playback and document listeners on replacement', async () => {
    const { context, page, errors } = await offline('shell');
    try {
      await page.evaluate(() => {
        const listeners = new Map();
        for (const [target, name] of [[document, 'visibilitychange'], [document, 'fullscreenchange'], [window, 'pagehide']]) {
          const active = new Set(); listeners.set(name, active);
          const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
          target.addEventListener = (type, fn, ...rest) => { if (type === name) active.add(fn); return add(type, fn, ...rest); };
          target.removeEventListener = (type, fn, ...rest) => { if (type === name) active.delete(fn); return remove(type, fn, ...rest); };
        }
        window.listenerCounts = () => [...listeners.values()].map(set => set.size);
        const read = File.prototype.text;
        File.prototype.text = function () {
          if (this.name !== 'delayed.json') return read.call(this);
          return new Promise(resolve => { window.finishDelayed = () => resolve(read.call(this)); });
        };
        window.playback = { played: 0, stopped: 0 };
        window.Audio = class { play() { playback.played++; return Promise.resolve(); } pause() { playback.stopped++; } load() {} removeAttribute() {} };
      });
      await select(page, { name: 'delayed.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(source)) });
      await page.waitForFunction(() => typeof window.finishDelayed === 'function');
      const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
      const timed = { title: 'Timed practice', words: [{ word: 'Cloud', wordAudio: wav }, 'Rain'], options: { mode: 'popup', autoAdvance: true, intervalSeconds: 1, shuffle: false, repetitions: 1 } };
      await select(page, { name: 'timed.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(timed)) });
      await page.getByRole('heading', { name: timed.title }).waitFor();
      await page.evaluate(() => finishDelayed());
      await btn(page, 'Hear word').click(); await btn(page, 'Start timer').click();
      await page.waitForFunction(() => playback.played === 1);
      expect(await page.evaluate(() => listenerCounts())).toEqual([1, 1, 1]);
      await select(page, { name: 'replacement.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(shell)) });
      await page.getByRole('heading', { name: shell.title }).waitFor();
      expect(await page.evaluate(() => playback.stopped)).toBeGreaterThan(0);
      expect(await page.evaluate(() => listenerCounts())).toEqual([1, 1, 1]);
      expect(await btn(page, 'Start timer').isVisible()).toBe(false);
      await page.keyboard.press('ArrowRight');
      expect(await page.locator('.awp-word').textContent()).toBe('Rain');
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  }, 90_000);
});

describe('unsaved glossary close and content edits', () => {
 it('protects title and word edits through Escape, Cancel and Save and close',async()=>{
  const context=await browser.newContext({offline:true});
  try{
   const page=await context.newPage();await page.setContent('<main></main>');await page.addScriptTag({content:readFileSync(playerModule,'utf8')});
   await page.evaluate(()=>window.AlloModules.WordPractice.open({title:'Cloud words',words:['Cloud']}));
   await page.getByRole('textbox',{name:'Practice title',exact:true}).fill('Sky words');
   await page.getByRole('textbox',{name:'Words (one per line)',exact:true}).fill('Cloud\nRain');
   await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Save changes to this word set before closing?'}).waitFor();
   await btn(page,'Cancel').click();expect(await page.getByRole('textbox',{name:'Practice title',exact:true}).inputValue()).toBe('Sky words');
   await btn(page,'Close').click();const pending=page.waitForEvent('download');await btn(page,'Save and close').click();
   const file=join(dir,'close-with-edits.json');await(await pending).saveAs(file); await btn(page, 'I saved the file').click();
   const saved=JSON.parse(readFileSync(file,'utf8'));expect(saved.title).toBe('Sky words');expect(saved.items.map(x=>x.word)).toEqual(['Cloud','Rain']);
   expect(await page.locator('.awp-overlay').count()).toBe(0);
  }finally{await context.close();}
 },90000);
 it('keeps failed close saves open, allows discard, and does not prompt for reverted content',async()=>{
  const context=await browser.newContext({offline:true});
  try{
   const page=await context.newPage();await page.setContent('<main></main>');await page.addScriptTag({content:readFileSync(playerModule,'utf8')});
   const launch=()=>page.evaluate(()=>{window.AlloModules.WordPractice.open({title:'Cloud words',words:['Cloud']});});await launch();
   const title=page.getByRole('textbox',{name:'Practice title',exact:true});await title.fill('Changed');await title.fill('Cloud words');
   await btn(page,'Close').click();expect(await page.locator('.awp-overlay').count()).toBe(0);await launch();
   await btn(page,'Present').click();await btn(page,'Add to review').click();
   await page.evaluate(()=>{URL.createObjectURL=()=>{throw new Error('Download unavailable');};});
   await page.keyboard.press('Escape');await btn(page,'Save and close').click();
   await page.getByRole('alert').filter({hasText:'Download unavailable'}).waitFor();expect(await page.locator('.awp-overlay').count()).toBe(1);
   await page.keyboard.press('Escape');await btn(page,'Close without saving').click();expect(await page.locator('.awp-overlay').count()).toBe(0);
  }finally{await context.close();}
 },90000);
 it.each(['title','words'])('asks before replacing a %s edit and resets the baseline after import',async field=>{
  const context=await browser.newContext({offline:true});
  try{
   const page=await context.newPage();await page.setContent('<main></main>');await page.addScriptTag({content:readFileSync(playerModule,'utf8')});
   await page.evaluate(()=>window.AlloModules.WordPractice.open({title:'Cloud words',words:['Cloud']}));
   if(field==='title') await page.getByRole('textbox',{name:'Practice title',exact:true}).fill('Changed title');
   else await page.getByRole('textbox',{name:'Words (one per line)',exact:true}).fill('Cloud\nSnow');
   await select(page,{name:'river.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
   await btn(page,'Open without saving').click();await page.getByText('Word set opened.',{exact:true}).waitFor();
   await btn(page,'Close').click();expect(await page.locator('.awp-overlay').count()).toBe(0);
  }finally{await context.close();}
 },90000);
});
