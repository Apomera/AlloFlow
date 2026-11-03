import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const scripts = ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'annotation_suite_module.js'].map(path => readFileSync(path, 'utf8'));
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60000);
afterAll(async () => { await browser?.close(); }, 60000);
const phrase = 'flowing river keeps a quiet rhythm';
const example = `The ${phrase}. The ${phrase}. The ${phrase}.`;
async function openCard() {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.setContent(`<style>
    html {font:20px/1.45 Arial} #host {position:relative; width:min(580px,calc(100vw - 30px)); overflow:auto; height:330px; border:2px solid}
    #card {padding:24px} #layer {position:absolute; inset:0; pointer-events:none} .absolute{position:absolute} .pointer-events-auto{pointer-events:auto}
  </style><div id="tools"></div><div id="host" data-allo-anno-host="true"><div id="card"><h2 data-allo-highlight-field="word">Stream</h2><p data-allo-highlight-field="example"></p></div><div id="layer"></div></div>`);
  for (const content of scripts) await page.addScriptTag({ content });
  await page.evaluate(example => {
    document.querySelector('[data-allo-highlight-field="example"]').textContent = example;
    const host = document.querySelector('#host'), card = document.querySelector('#card');
    window.changes = []; window.cards = { a: [], b: [] }; window.key = 'a';
    window.activeObservers = new Set();
    const NativeResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends NativeResizeObserver {
      observe(el) { if (el === card) activeObservers.add(this); super.observe(el); }
      disconnect() { activeObservers.delete(this); super.disconnect(); }
    };
    window.workspace = AlloModules.AnnotationSuite.mountWorkspace(document.querySelector('#tools'), { hostEl: host, contentEl: card, layerEl: document.querySelector('#layer'), annotations: [], documentKey: 'a', showTools: true,
      onChange: (annotations, target) => { cards[target] = annotations; changes.push(target); if (target === window.key) workspace.update({ annotations }); },
    });
    window.showCard = key => { window.key = key; workspace.update({ documentKey: key, annotations: cards[key] }); };
  }, example);
  await page.getByRole('button', { name: /Highlight$/ }).click();
  return page;
}
async function selectSecondOccurrence(page) {
  await page.evaluate(phrase => {
    const p = document.querySelector('[data-allo-highlight-field="example"]');
    const start = p.textContent.indexOf(phrase, p.textContent.indexOf(phrase) + phrase.length);
    const range = document.createRange(); range.setStart(p.firstChild, start); range.setEnd(p.firstChild, start + phrase.length);
    getSelection().removeAllRanges(); getSelection().addRange(range); p.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  }, phrase);
  await page.waitForFunction(() => cards.a.length === 1);
}
// Check each actual glyph against the painted rectangles. DOM Range is the
// independent reference for glyph position, including wrapped and bold text.
async function expectSecondOccurrencePainted(page, selector = '[data-allo-highlight-field="example"]') {
  await page.waitForFunction(({ selector, phrase }) => {
    const el = document.querySelector(selector); if (!el) return false;
    const first = el.textContent.indexOf(phrase), second = el.textContent.indexOf(phrase, first + phrase.length);
    if (second < 0) return false;
    const marks = [...document.querySelectorAll('[aria-label^="Highlight: "]')].filter(node => node.getAttribute('role') === 'img').map(node => node.getBoundingClientRect());
    if (!marks.length) return false;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let offset = 0, node;
    while ((node = walker.nextNode())) {
      for (let i = 0; i < node.length; i++) {
        if (/\s/u.test(node.data[i])) continue;
        const wanted = offset + i >= second && offset + i < second + phrase.length;
        const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
        const glyph = range.getBoundingClientRect(), x = (glyph.left + glyph.right) / 2, y = (glyph.top + glyph.bottom) / 2;
        if (marks.some(m => x >= m.left && x <= m.right && y >= m.top && y <= m.bottom) !== wanted) return false;
      }
      offset += node.length;
    }
    return true;
  }, { selector, phrase }, { timeout: 7000 });
}

describe('presenter text-anchored highlights', () => {
  it('keeps the selected occurrence across wrapping, font settings, and Bionic markup without changing saved data', async () => {
    const page = await openCard();
    try {
      await selectSecondOccurrence(page);
      const captured = await page.evaluate(() => cards.a[0]);
      expect(captured.anchor).toEqual({ version: 1, start: { field: 'example', offset: example.lastIndexOf(phrase, example.lastIndexOf(phrase) - 1) }, end: { field: 'example', offset: example.lastIndexOf(phrase, example.lastIndexOf(phrase) - 1) + phrase.length }, quote: phrase });
      await expectSecondOccurrencePainted(page);
      await page.setViewportSize({ width: 320, height: 850 });
      await page.evaluate(() => { document.documentElement.style.fontSize = '28px'; document.querySelector('#card').style.letterSpacing = '.05em'; });
      await expectSecondOccurrencePainted(page);
      expect(await page.locator('[role=img][aria-label^="Highlight: "]').count()).toBeGreaterThan(1);
      await page.evaluate(() => {
        const p = document.querySelector('[data-allo-highlight-field="example"]');
        p.innerHTML = p.textContent.replace(/(flow)(ing)/g, '<b>$1</b>$2');
        document.querySelector('#card').style.lineHeight = '1.9';
        document.documentElement.style.fontFamily = 'Georgia, serif';
      });
      await expectSecondOccurrencePainted(page);
      expect(await page.evaluate(() => changes)).toEqual(['a']);
      expect(await page.evaluate(() => workspace.snapshotAnnotations()[0].rects)).not.toEqual(captured.rects);
      expect(await page.evaluate(() => cards.a[0].rects)).toEqual(captured.rects);
      await page.getByRole('button', { name: /stickers_label|Stickers/i }).first().click();
      // Dispatch a placement and snapshot in the same event turn, before the
      // next React paint; preparing exports must include the newest edit.
      const latest = await page.evaluate(() => {
        document.querySelector('#host').dispatchEvent(new MouseEvent('click', {bubbles:true,clientX:180,clientY:150}));
        return workspace.snapshotAnnotations();
      });
      expect(latest.map(a => a.kind)).toEqual(['highlight', 'sticker']);
      await page.getByRole('button', { name: 'Undo last annotation' }).click();
      expect(await page.evaluate(() => cards.a.map(a => a.kind))).toEqual(['highlight']);
      await page.getByRole('button', { name: 'Undo last annotation' }).click();
      expect(await page.evaluate(() => cards.a.length)).toBe(0);
    } finally { await page.close(); }
  }, 30000);

  it('hides absent fields without painting a same-text decoy, preserves old marks, and cleans up when switching cards', async () => {
    const page = await openCard();
    try {
      await selectSecondOccurrence(page);
      const saved = await page.evaluate(() => cards.a[0]);
      await page.evaluate(() => document.querySelector('[data-allo-highlight-field="example"]').setAttribute('data-allo-highlight-field', 'unrevealed-clue'));
      await page.waitForFunction(() => !document.querySelector('[role=img][aria-label^="Highlight: "]'));
      expect(await page.evaluate(() => workspace.snapshotAnnotations()[0].rects)).toEqual(saved.rects);
      await page.evaluate(() => {
        cards.b = [{ id:'legacy', kind:'highlight', color:'blue', text:'Legacy annotation', rects:[{x:10,y:12,w:34,h:16}] }];
        showCard('b');
      });
      const legacy = page.locator('[role=img][aria-label^="Highlight:"]');
      expect(await legacy.evaluate(el => [el.style.left,el.style.top,el.style.width])).toEqual(['10px','12px','34px']);
      await page.waitForFunction(() => activeObservers.size === 1); // Watch the legacy mark in case the quote is revealed.
      await page.evaluate(() => { document.querySelector('[data-allo-highlight-field="unrevealed-clue"]').setAttribute('data-allo-highlight-field','example'); showCard('a'); });
      await expectSecondOccurrencePainted(page);
      await page.evaluate(() => { showCard('b'); showCard('a'); showCard('b'); showCard('a'); });
      await expectSecondOccurrencePainted(page);
      expect(await page.evaluate(() => activeObservers.size)).toBe(1);
      expect(await page.evaluate(() => changes)).toEqual(['a']);
      await page.evaluate(() => workspace.destroy());
      expect(await page.evaluate(() => activeObservers.size)).toBe(0);
    } finally { await page.close(); }
  }, 30000);

  it('recovers only complete, unique legacy quotes with corroborating geometry or a fully revealed card', async () => {
    const page = await openCard();
    try {
      await page.evaluate(() => {
        const card = document.querySelector('#card'), host = document.querySelector('#host');
        const word = card.querySelector('h2'), example = card.querySelector('p');
        const truncatedLabel = 'X '.repeat(249) + 'XY';
        example.textContent = 'One bank and another bank. The clear channel bends toward the sea. ' + truncatedLabel + ' extends farther.';
        const range = document.createRange(); range.selectNodeContents(word);
        const box = range.getBoundingClientRect(), origin = host.getBoundingClientRect();
        const historical = { x:Math.round(box.left-origin.left), y:Math.round(box.top-origin.top), w:Math.round(box.width), h:Math.round(box.height) };
        const mark = (id, text) => ({id, text, kind:'highlight', color:'yellow', rects:[{x:5000,y:2000,w:35,h:18}]});
        cards.a = [{...mark('matching-geometry','Stream'), rects:[historical]}, mark('unique','clear channel bends toward the sea'), mark('duplicate','bank'), mark('edited','quote no longer present'), mark('truncated',truncatedLabel)];
        workspace.update({annotations:cards.a});
      });
      let snapshot = await page.evaluate(() => workspace.snapshotAnnotations());
      expect(snapshot.map(a => a.anchor?.start.field)).toEqual(['word',undefined,undefined,undefined,undefined]);
      // Simulate revealing the meaning on a differently sized device. Only now
      // can we establish that the second quote is unique on the whole card.
      await page.evaluate(() => { document.querySelector('#card').dataset.alloHighlightComplete = 'true'; });
      await page.waitForFunction(() => workspace.snapshotAnnotations().find(a => a.id === 'unique').anchor?.start.field === 'example');
      await page.setViewportSize({width:320,height:850});
      await page.evaluate(() => { document.querySelector('#card').style.fontSize = '29px'; });
      await page.waitForFunction(() => {
        const mark = workspace.snapshotAnnotations().find(a => a.id === 'unique');
        const shown = [...document.querySelectorAll('[role="img"][aria-label^="Highlight:"]')].filter(el => el.getAttribute('aria-label').includes('clear channel'));
        return mark.rects.length > 1 && shown.length === mark.rects.length && shown.every((el,i) => Math.abs(parseFloat(el.style.left)-mark.rects[i].x)<0.5 && Math.abs(parseFloat(el.style.top)-mark.rects[i].y)<0.5);
      });
      snapshot = await page.evaluate(() => workspace.snapshotAnnotations());
      expect(snapshot[1].anchor.quote).toBe('clear channel bends toward the sea');
      expect(snapshot.slice(2).map(a => a.anchor)).toEqual([undefined,undefined,undefined]);
      expect(snapshot[2].rects).toEqual([{x:5000,y:2000,w:35,h:18}]);
      expect(await page.evaluate(() => changes)).toEqual([]);
      expect(await page.evaluate(() => cards.a.every(a => !a.anchor))).toBe(true);
      // A once-recovered legacy anchor is retained even after hiding the face.
      await page.evaluate(() => { document.querySelector('#card').dataset.alloHighlightComplete = 'false'; document.querySelector('#card p').remove(); });
      expect((await page.evaluate(() => workspace.snapshotAnnotations()))[1].anchor.quote).toBe('clear channel bends toward the sea');
    } finally { await page.close(); }
  }, 30000);

  it('restores multi-field highlights and tolerates whitespace changes in their original fields', async () => {
    const page = await openCard();
    try {
      await page.evaluate(() => {
        const word = document.querySelector('[data-allo-highlight-field="word"]'), p = document.querySelector('[data-allo-highlight-field="example"]');
        const range = document.createRange(); range.setStart(word.firstChild, 2); range.setEnd(p.firstChild, 11);
        getSelection().removeAllRanges(); getSelection().addRange(range);
        p.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
      });
      await page.waitForFunction(() => cards.a[0]?.anchor);
      const {anchor} = await page.evaluate(() => cards.a[0]);
      expect(anchor.start).toEqual({ field:'word', offset:2 }); expect(anchor.end).toEqual({field:'example',offset:11});
      await page.evaluate(() => {
        const p = document.querySelector('[data-allo-highlight-field="example"]');
        p.textContent = p.textContent.replace('The flowing', 'The\u00a0  flowing');
      });
      await page.waitForFunction(() => workspace.snapshotAnnotations()[0].rects.length >= 2);
      expect(await page.locator('[role=img][aria-label^="Highlight: "]').count()).toBeGreaterThanOrEqual(2);
    } finally { await page.close(); }
  }, 30000);
});


it('keeps the selected repeated phrase in offline HTML after saving the set and reopening it at phone width', async () => {
  const author = await browser.newPage();
  const module = readFileSync('word_practice_module.js', 'utf8');
  const pages = [];
  const buildHtml = pack => author.evaluate(pack => AlloModules.WordPractice.buildHtml(pack, pack.options), pack);
  async function openOffline(html, width) {
    const player = await browser.newPage({ viewport: { width, height:900 } });
    pages.push(player);
    await player.route('**/*', route => route.abort());
    // A fresh window has neither live React nor an app-provided annotation suite.
    await player.setContent(html);
    await player.getByRole('button', { name:'Show meaning', exact:true }).click();
    return player;
  }
  try {
    await author.addScriptTag({ content: module });
    const legacy = { id:'old-definition', kind:'highlight', text:'A body of flowing water.', color:'yellow', rects:[{x:8,y:14,w:32,h:12}] };
    const pack = { title:'Stream', words:[{word:'Stream',definition:legacy.text,contextSentence:example,annotations:[legacy]}], options:{mode:'vocabulary',shuffle:false,repetitions:1} };
    const player = await openOffline(await buildHtml(pack), 1100);
    await player.getByRole('button', { name:'Annotate',exact:true }).click();
    await player.getByRole('button', { name:/Highlight$/ }).click();
    await player.evaluate(phrase => {
      const el = document.querySelector('.awp-stage .awp-example');
      const offset = el.textContent.indexOf(phrase, el.textContent.indexOf(phrase) + phrase.length);
      const range = document.createRange(); range.setStart(el.firstChild,offset); range.setEnd(el.firstChild,offset+phrase.length);
      getSelection().removeAllRanges(); getSelection().addRange(range); el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
    }, phrase);
    await expectSecondOccurrencePainted(player, '.awp-stage .awp-example');
    const downloading = player.waitForEvent('download');
    await player.getByRole('button', {name:'Save word set',exact:true}).click();
    const saved = JSON.parse(readFileSync(await (await downloading).path(), 'utf8'));
    const [recovered, selected] = saved.items[0].annotations;
    expect(recovered.id).toBe(legacy.id);
    expect(recovered.anchor.start.field).toBe('definition');
    expect(recovered.anchor.quote).toBe(legacy.text);
    expect(recovered.rects).not.toEqual(legacy.rects);
    expect(selected.anchor.start.field).toBe('example');
    expect(selected.anchor.quote).toBe(phrase);
    const reopened = await openOffline(await buildHtml(saved), 320);
    await expectSecondOccurrencePainted(reopened, '.awp-stage .awp-example');
    await reopened.evaluate(() => { document.documentElement.style.fontSize = '150%'; });
    await expectSecondOccurrencePainted(reopened, '.awp-stage .awp-example');
  } finally { await Promise.all([author, ...pages].map(p => p.close())); }
}, 45000);
