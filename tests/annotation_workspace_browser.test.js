import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { transformSync } from '@babel/core';

const scripts = [
  readFileSync('desktop/web-app/node_modules/react/umd/react.production.min.js', 'utf8'),
  readFileSync('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'utf8'),
  transformSync(readFileSync('annotation_suite_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'] }).code,
];
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
afterAll(async () => { await browser?.close(); });
async function open() {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.setDefaultTimeout(7000);
  await page.setContent(`<style>
    #host {position:relative; width:700px; height:500px; border:1px solid; margin-top:30px}
    #layer {position:absolute; inset:0; pointer-events:none} #layer>* {pointer-events:auto}
    .relative{position:relative}.w-6{width:24px}.h-6{height:24px}.absolute {position:absolute} .inset-0{inset:0} .flex{display:flex} .flex-wrap{flex-wrap:wrap}
    button {min-height:28px} #tools{min-height:40px} .fixed{position:fixed;top:100px;right:0}
    .pointer-events-none{pointer-events:none!important} .pointer-events-auto{pointer-events:auto!important}
  </style><div id="tools"></div><div id="host" data-allo-anno-host="true" tabindex="0"><p id="text">A tree grows near the river.</p><div id="layer"></div></div><div id="sidebar"></div>`);
  for (const content of scripts) await page.addScriptTag({ content });
  await page.evaluate(() => {
    const labels = { 'toolbar.stickers_label':'Stickers', 'toolbar.clear_stickers':'Clear all annotations', 'a11y.note_content':'Note content', 'a11y.stop_save_recording':'Stop and save recording', 'a11y.cancel_recording':'Cancel recording', 'a11y.note_template':'Note template' };
    window.cards = new Map([['a', []], ['b', []]]); window.currentKey = 'a'; window.toasts = [];
    window.workspace = AlloModules.AnnotationSuite.mountWorkspace(document.querySelector('#tools'), {
      hostEl: document.querySelector('#host'), layerEl: document.querySelector('#layer'), sidebarEl: document.querySelector('#sidebar'),
      showTools: true, annotations: [], documentKey: 'a', t: key => labels[key] || key,
      onExport: payload => { window.exported = payload; }, onToast: message => window.toasts.push(message),
      onChange: (list, key) => { cards.set(key, list); if (key === currentKey) workspace.update({ annotations:list }); },
    });
    window.switchCard = key => { currentKey = key; workspace.update({ annotations: cards.get(key), documentKey:key }); };
  });
  await page.getByRole('button', { name: /Stickers$/ }).waitFor();
  return { page, errors };
}
const cardData = (page, key = 'a') => page.evaluate(key => cards.get(key), key);
async function place(page, x = 180, y = 150) { await page.locator('#host').click({ position: { x,y } }); }

describe('reusable annotation workspace', () => {
  it('keeps editable notes, movement, undo and histories scoped to each card', async () => {
    const { page, errors } = await open();
    try {
      await page.getByRole('button', { name: /Note$/ }).click(); await place(page);
      await page.getByRole('textbox', { name:'Note content' }).fill('First observation');
      await page.getByRole('button', { name: /Note$/ }).click();
      expect((await cardData(page))[0].content).toBe('First observation');
      await page.getByRole('button', { name:/Sticky note from/ }).press('ArrowRight');
      expect((await cardData(page))[0].x).toBe(191);
      await page.getByRole('button', { name:'Undo last annotation' }).click();
      expect((await cardData(page))[0].x).toBe(181);
      await page.evaluate(() => switchCard('b'));
      await page.getByRole('button', { name: /Stickers$/ }).click(); await place(page,300,200);
      expect(await cardData(page,'b')).toHaveLength(1); expect((await cardData(page))[0].content).toBe('First observation');
      await page.evaluate(() => switchCard('a'));
      await page.getByRole('button', { name:'Undo last annotation' }).click();
      expect((await cardData(page))[0].content).toBe('');
      await page.getByRole('button', { name:/Sticky note from/ }).click();
      expect(await page.getByRole('textbox', { name:'Note content' }).inputValue()).toBe('');
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 30000);

  it('creates highlights, drawings and eraser marks, then saves and imports all kinds', async () => {
    const { page, errors } = await open();
    try {
      await page.getByRole('button', { name: /Highlight$/ }).click();
      await page.evaluate(() => { const range=document.createRange(); range.selectNodeContents(document.querySelector('#text')); const sel=getSelection(); sel.removeAllRanges(); sel.addRange(range); document.querySelector('#host').dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); });
      expect((await cardData(page))[0].kind).toBe('highlight');
      await page.getByRole('button', { name: /Draw$/ }).click();
      await page.getByRole('button', { name:'Rectangle', exact:true }).click();
      const rect=await page.locator('#host').boundingBox();
      await page.mouse.move(rect.x+150, rect.y+180); await page.mouse.down(); await page.mouse.move(rect.x+250,rect.y+280,{steps:5}); await page.mouse.up();
      expect((await cardData(page))[1].shape).toBe('rect');
      await page.getByRole('button', { name:'Eraser', exact:true }).click(); await place(page,160,190);
      expect(await cardData(page)).toHaveLength(1);
      await page.getByRole('button', { name:'Undo last annotation' }).click(); expect(await cardData(page)).toHaveLength(2);
      await page.getByRole('button', { name:'Save annotations', exact:true }).click();
      const exported=await page.evaluate(()=>window.exported); expect(exported.documentKey).toBe('a'); expect(exported.annotations).toHaveLength(2);
      await page.evaluate(()=>switchCard('b'));
      await page.locator('input[type=file]').setInputFiles({ name:'annotations.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(exported)) });
      await page.waitForFunction(()=>cards.get('b').length===2);
      await page.getByRole('button', { name:'Toggle annotation list' }).click();
      expect(await page.getByRole('list', { name:'Annotations' }).getByRole('listitem').count()).toBe(2);
      await page.locator('input[type=file]').setInputFiles({ name:'invalid.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify([{kind:'note',x:10,y:10,content:{bad:true}}])) });
      await page.waitForFunction(()=>toasts.length===1); expect(await cardData(page,'b')).toHaveLength(2);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 30000);

  it('invalidates pending microphone permission when navigating or closing tools', async () => {
    const { page, errors } = await open();
    try {
      await page.evaluate(()=>{
        window.trackStops=0; window.requests=[]; window.recorderStarts=0;
        Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(resolve=>requests.push(resolve))}});
        window.MediaRecorder=class { constructor(){this.state='inactive';} start(){recorderStarts++;} stop(){} };
      });
      await page.getByRole('button', {name: /Voice$/}).click(); await place(page); await place(page,200,200);
      expect(await page.evaluate(()=>requests.length)).toBe(1);
      await page.evaluate(()=>switchCard('b'));
      await page.evaluate(()=>requests[0]({getTracks:()=>[{stop:()=>trackStops++}]}));
      await page.waitForFunction(()=>trackStops===1);
      expect(await cardData(page)).toEqual([]); expect(await cardData(page,'b')).toEqual([]);
      expect(await page.evaluate(()=>recorderStarts)).toBe(0);
      await page.getByRole('button', {name: /Voice$/}).click(); await place(page);
      await page.evaluate(()=>workspace.update({showTools:false}));
      await page.evaluate(()=>requests[1]({getTracks:()=>[{stop:()=>trackStops++}]}));
      await page.waitForFunction(()=>trackStops===2);
      expect(await page.evaluate(()=>recorderStarts)).toBe(0); expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 30000);

  it('preserves the recorder MIME type and cancels recordings on card changes without leaking placeholders', async () => {
    const { page, errors } = await open();
    try {
      await page.evaluate(()=>{
        window.trackStops=0;
        Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>trackStops++}]})}});
        window.MediaRecorder=class { constructor(){this.mimeType='audio/mp4';this.state='inactive';} start(){this.state='recording';} stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['recorded'],{type:this.mimeType})});setTimeout(()=>this.onstop?.(),0);} };
      });
      await page.getByRole('button', {name: /Voice$/}).click(); await place(page);
      await page.getByRole('button',{name:'Stop and save recording'}).click();
      await page.waitForFunction(()=>cards.get('a')[0] && !cards.get('a')[0].pending);
      expect((await cardData(page))[0].mimeType).toBe('audio/mp4');
      await place(page,400,300); await page.getByRole('region',{name:'Voice note recording in progress'}).waitFor();
      await page.evaluate(()=>switchCard('b'));
      await page.waitForFunction(()=>cards.get('a').length===1);
      expect(await cardData(page,'b')).toEqual([]);
      await page.evaluate(()=>switchCard('a'));
      await page.getByRole('button',{name:'Undo last annotation'}).click();
      expect((await cardData(page)).some(a=>a.pending)).toBe(false);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 30000);
});
