import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const moduleSource=readFileSync('word_practice_module.js','utf8');
const react=readFileSync('desktop/web-app/node_modules/react/umd/react.production.min.js','utf8');
const reactDom=readFileSync('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','utf8');
const suite=readFileSync('annotation_suite_module.js','utf8');
const out='tmp/word-practice-annotations';
let browser;
beforeAll(async()=>{mkdirSync(out,{recursive:true});browser=await chromium.launch({headless:true});},60000);
afterAll(async()=>{await browser?.close();},60000);
async function open(glossaryOwner = false, overrides = {}){
  const page=await browser.newPage({viewport:{width:1200,height:1000},reducedMotion:'reduce'});
  page.setDefaultTimeout(8000); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html><body></body></html>');
  for(const content of [react,reactDom,suite,moduleSource]) await page.addScriptTag({content});
  await page.evaluate(({glossaryOwner,overrides})=>{
    window.fixture={title:'River words',words:[{id:'river',word:'River',definition:'A natural stream of water.',contextSentence:'A river flows toward the sea.',etymology:'From Latin riparia.',roots:[{root:'ripa',meaning:'bank'}]},{id:'forest',word:'Forest',definition:'A large area covered with trees.'}],options:{mode:'vocabulary',shuffle:false,repetitions:1}};
    Object.assign(window.fixture, overrides);
    window.glossaryWrites = [];
    if (glossaryOwner) window.fixture.onSaveCardAnnotations = (id, annotations) => { window.glossaryWrites.push({ id, annotations }); return true; };
    AlloModules.WordPractice.open(fixture);
  }, {glossaryOwner,overrides});
  await page.getByRole('button',{name:'Present',exact:true}).click();
  return {page,errors};
}
async function addNote(page,text){
  await page.getByRole('button',{name:'Annotate',exact:true}).click();
  await page.locator('[data-allo-anno-workspace]').getByRole('button',{name:/Note$/}).click();
  await page.locator('.awp-stage').click({position:{x:65,y:65}});
  await page.getByRole('textbox',{name:'Note content',exact:true}).fill(text);
  await page.locator('[data-allo-anno-workspace]').getByRole('button',{name:/Note$/}).click();
}
async function saveSet(page){
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save word set',exact:true}).click();
  const download=await downloadPromise; await download.path(); await page.getByRole('button',{name:'I saved the file',exact:true}).click();
  return JSON.parse(readFileSync(await download.path(),'utf8'));
}

describe('Present & Export full annotation suite',()=>{
  it('separates clue and answer annotations in the live and offline player', async () => {
    const word = { id: 'r', word: 'radio', definition: 'A radio receives broadcasts.', translations: { Spanish: 'radio: Aparato receptor.' },
      picture: { src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aUcUAAAAASUVORK5CYII=', alt:'A radio with two dials', credit:'Radio Museum, CC BY' },
      annotations: [{ id: 'answer', kind: 'note', content: 'Answer: radio', x: 20, y: 20 }, { id: 'match', kind: 'highlight', text: 'radio', color: 'yellow', rects: [{ x: 10, y: 20, w: 30, h: 10 }] }] };
    const {page,errors} = await open(true, { words:[word], options:{mode:'vocabulary', vocabularyFirst:'meaning', shuffle:false, repetitions:1} });
    let offline;
    try {
      const player = page.locator('.awp-player'), notes = page.getByRole('list',{name:'Annotations',exact:true});
      expect(await player.getByRole('button',{name:/Sticky note from/}).count()).toBe(0);
      await addNote(page, 'Describe the dial');
      const stored = await page.evaluate(() => glossaryWrites.at(-1).annotations);
      expect(stored.filter(a=>!a.recallClue)).toHaveLength(2);
      expect(stored.find(a=>a.recallClue)?.content).toBe('Describe the dial');
      await page.getByRole('button',{name:'Toggle annotation list'}).click();
      expect(await notes.innerText()).toContain('Describe the dial'); expect(await notes.innerText()).not.toMatch(/radio/i);
      await page.getByRole('button',{name:'Close annotation list'}).click();
      await player.getByRole('button',{name:'Show word',exact:true}).click();
      await page.getByRole('button',{name:'Toggle annotation list'}).click();
      expect(await notes.innerText()).toContain('Answer: radio'); expect(await notes.innerText()).not.toContain('Describe the dial');
      await page.getByRole('button',{name:'Close annotation list'}).click();
      await player.getByRole('button',{name:'New round',exact:true}).click();
      expect(await player.locator('.awp-card').innerText()).not.toMatch(/radio/i);
      await player.getByRole('button',{name:'Back to setup',exact:true}).click();
      const saved=await saveSet(page);
      expect(saved.items[0].annotations.filter(a=>a.recallClue).map(a=>a.content)).toEqual(['Describe the dial']);
      expect(saved.items[0].annotations.filter(a=>!a.recallClue)).toHaveLength(2);
      const html=await page.evaluate(saved=>AlloModules.WordPractice.buildHtml(saved,saved.options),saved);
      offline=await browser.newPage(); await offline.setContent(html);
      expect(await offline.locator('.awp-card').innerText()).not.toMatch(/radio/i);
      expect(await offline.locator('.awp-card img').getAttribute('alt')).toBe('A ____ with two dials');
      expect(await offline.locator('.awp-player .awp-sr').textContent()).not.toMatch(/radio/i);
      await offline.getByRole('button',{name:'Annotate',exact:true}).click();
      await offline.getByRole('button',{name:'Toggle annotation list'}).click();
      const list=offline.getByRole('list',{name:'Annotations',exact:true});
      expect(await list.innerText()).toContain('Describe the dial'); expect(await list.innerText()).not.toMatch(/radio/i);
      await offline.getByRole('button',{name:'Close annotation list'}).click();
      await offline.getByRole('button',{name:'Show word',exact:true}).click();
      expect(await offline.locator('.awp-stage .awp-translation[lang=es]').textContent()).toBe('radio: Aparato receptor.');
      expect(await offline.locator('.awp-card img').getAttribute('alt')).toBe(word.picture.alt);
      expect(await offline.locator('.awp-card figcaption').textContent()).toBe(word.picture.credit);
      await offline.getByRole('button',{name:'Toggle annotation list'}).click();
      expect(await list.innerText()).toContain('Answer: radio');
      expect(errors).toEqual([]);
    } finally { await offline?.close(); await page.close(); }
  },90000);
  it('detaches imported word sets even when a card ID matches the launching glossary', async () => {
    const {page, errors} = await open(true);
    try {
      await addNote(page, 'Keep with the glossary.');
      await page.getByText('Saved to glossary', {exact:true}).waitFor();
      const before = await page.evaluate(() => window.glossaryWrites);
      expect(before.at(-1).id).toBe('river');
      expect(before.at(-1).annotations.find(a => a.kind === 'note').content).toBe('Keep with the glossary.');
      await page.getByRole('button',{name:'Back to setup',exact:true}).click();
      const other = { title:'Independent pack', words:[{id:'river',word:'Another river'}], options:{repetitions:1,shuffle:false} };
      await page.locator('.awp-dialog input[type=file]').setInputFiles({name:'other.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(other))});
      await page.getByText('Word set opened.', {exact:true}).waitFor();
      await page.getByRole('button',{name:'Present',exact:true}).click();
      await addNote(page, 'Only in the imported set.');
      expect(await page.evaluate(() => window.glossaryWrites)).toEqual(before);
      await page.getByRole('button',{name:'Back to setup',exact:true}).click();
      const independent = await saveSet(page);
      expect(independent.items[0].annotations[0].content).toBe('Only in the imported set.');
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  },45000);
  it('retains notes, stickers, highlights and drawings across navigation and JSON round trips',async()=>{
    const {page,errors}=await open();
    try{
      await page.getByRole('button',{name:'Show meaning',exact:true}).click();
      expect(await page.locator('.awp-stage .awp-example').textContent()).toBe('A river flows toward the sea.');
      await addNote(page,'Check the river bank.');
      const note=page.getByRole('button',{name:/Sticky note from/});
      const before=await note.evaluate(el=>parseFloat(el.style.left));
      await note.press('ArrowRight');
      expect(await note.evaluate(el=>parseFloat(el.style.left))).toBe(before+10);
      expect(await page.locator('.awp-stage .awp-word').textContent()).toBe('River');
      expect(await page.locator('#allo-annotation-move-status').evaluate(el=>getComputedStyle(el).clip)).toBe('rect(0px, 0px, 0px, 0px)');
      await page.locator('[data-allo-anno-workspace]').getByRole('button',{name:/Stickers$/}).click();
      await page.locator('.awp-stage').click({position:{x:320,y:90}});
      await page.locator('[data-allo-anno-workspace]').getByRole('button',{name:/Highlight$/}).click();
      await page.evaluate(()=>{const el=document.querySelector('.awp-definition');const range=document.createRange();range.selectNodeContents(el);const sel=getSelection();sel.removeAllRanges();sel.addRange(range);el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));});
      await page.locator('[data-allo-anno-workspace]').getByRole('button',{name:/Draw$/}).click();
      await page.getByRole('button',{name:'Rectangle',exact:true}).click();
      const stage=await page.locator('.awp-stage').boundingBox();
      await page.mouse.move(stage.x+200,stage.y+100);await page.mouse.down();await page.mouse.move(stage.x+270,stage.y+160,{steps:6});await page.mouse.up();
      await page.locator('[data-allo-anno-workspace]').getByRole('button',{name:/Draw$/}).click();
      await page.getByRole('button',{name:'Toggle annotation list'}).click();
      expect(await page.getByRole('list',{name:'Annotations',exact:true}).getByRole('listitem').count()).toBe(4);
      await page.getByRole('button',{name:'Close annotation list'}).click();
      await page.screenshot({path:out+'/live-desktop.png'});
      await page.locator('.awp-player').getByRole('button',{name:'Next',exact:true}).click();
      expect(await page.getByRole('button',{name:/Sticky note from/}).count()).toBe(0);
      await page.locator('.awp-player').getByRole('button',{name:'Previous',exact:true}).click();
      expect(await page.getByRole('button',{name:/Sticky note from/}).count()).toBe(1);
      await page.getByRole('button',{name:'Back to setup',exact:true}).click();
      const saved=await saveSet(page);
      expect(saved.items[0].annotations.map(a=>a.kind).sort()).toEqual(['draw','highlight','note','sticker']);
      expect(saved.items[0].annotations.find(a=>a.kind==='note').content).toBe('Check the river bank.');
      await page.locator('.awp-dialog input[type=file]').setInputFiles({name:'words.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
      await page.waitForFunction(()=>document.querySelector('.awp-status')?.textContent.includes('Word set opened'));
      await page.getByRole('button',{name:'Present',exact:true}).click();
      expect(await page.getByRole('button',{name:/Sticky note from/}).count()).toBe(1);
      expect(errors).toEqual([]);
    }finally{await page.close();}
  },45000);

  it('embeds the same tools in offline HTML and supports annotation save/import at 320px',async()=>{
    const {page,errors}=await open();
    try{
      await addNote(page,'Offline observation');
      await page.getByRole('button',{name:'Back to setup',exact:true}).click();
      const saved=await saveSet(page);
      const html=await page.evaluate(saved=>AlloModules.WordPractice.buildHtml(saved,saved.options),saved);
      await page.setContent(html);await page.setViewportSize({width:320,height:1000});
      await page.getByRole('button',{name:'Annotate',exact:true}).click();
      await page.locator('[data-allo-anno-workspace]').getByRole('button',{name:/Stickers$/}).waitFor();
      expect(await page.getByRole('button',{name:/Sticky note from/}).count()).toBe(1);
      expect(await page.locator('.awp-player').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
      const downloadPromise=page.waitForEvent('download');
      await page.getByRole('button',{name:'Save annotations',exact:true}).click();
      const download=await downloadPromise;const payload=JSON.parse(readFileSync(await download.path(),'utf8'));
      expect(payload.annotations[0].content).toBe('Offline observation');
      await page.locator('.awp-player').getByRole('button',{name:'Next',exact:true}).click();
      await page.locator('.allo-anno-scope input[type=file]').setInputFiles({name:'notes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
      await page.getByRole('button',{name:/Sticky note from/}).waitFor();
      await page.getByRole('button',{name:/Sticky note from/}).click();
      expect(await page.getByRole('textbox',{name:'Note content',exact:true}).inputValue()).toBe('Offline observation');
      await page.screenshot({path:out+'/offline-320.png'});
      const updated = await saveSet(page);
      expect(updated.items.map(item => item.annotations[0].content)).toEqual(['Offline observation', 'Offline observation']);
      expect(errors).toEqual([]);
    }finally{await page.close();}
  },45000);
});
