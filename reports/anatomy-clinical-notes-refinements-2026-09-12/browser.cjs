const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright'), { GlHarness } = require('../anatomy-deep-review-2026-09-12/harness.cjs');
const bank = JSON.parse(fs.readFileSync(__dirname + '/content.json', 'utf8'));
const evidence = { errors: [], explored: [], flashcards: [], screens: [], axe: [], languages: [] };
(async () => {
  const harness = new GlHarness({ toolFile:'stem_lab/stem_tool_anatomy.js', toolId:'anatomy', width:1120, height:1600, appStyles:true });
  await harness.start();
  const browser = await chromium.launch({ headless:true }), page = await browser.newPage({ viewport:{width:1280,height:1000}, reducedMotion:'reduce' });
  page.on('pageerror', error => evidence.errors.push(error.message));
  async function state(data, grade = '9') {
    await page.evaluate(({data,grade}) => {
      window.__ctx.gradeLevel = grade; window.__ctx.callTTS = text => { window.__spoken = text; };
      window.__ctx.setToolData(p => ({...p, anatomy:{_bodyView3d:false,_activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,selectedStructure:null,...data}}));
    }, {data,grade});
  }
  const note = () => page.locator('[data-anatomy-clinical-note]');
  async function axe(name) {
    const result = await page.evaluate(async () => {
      const result = await window.axe.run('[data-anatomy-clinical-note]', {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
      return {violations:result.violations.map(v => ({id:v.id,nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete.map(v => ({id:v.id,nodes:v.nodes.map(n => n.target)}))};
    });
    evidence.axe.push({name,...result});
    if (result.incomplete.length) {
      assert.equal(name, 'phone-320-flashcards');
      assert.deepEqual(result.incomplete.map(item => item.id), ['color-contrast']);
      // axe reports elmPartiallyObscuring here. Check the actual rendered colors and occlusion independently.
      const review = await page.evaluate(() => {
        const p = document.querySelector('[data-anatomy-clinical-note-text]'), card = p.closest('[data-anatomy-clinical-note]');
        const style = getComputedStyle(p), surface = getComputedStyle(card), r = p.getBoundingClientRect();
        const rgb = color => color.match(/[\d.]+/g).slice(0,3).map(Number);
        const luminance = color => rgb(color).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum,c,i) => sum + c * [.2126,.7152,.0722][i],0);
        const fg = luminance(style.color), bg = luminance(surface.backgroundColor), occlusions = [];
        for (let y = r.top + 2; y < r.bottom - 2; y += 12) for (const x of [r.left+2,r.left+r.width/2,r.right-2]) {
          const top = document.elementFromPoint(x,y); if (top !== p && !p.contains(top)) occlusions.push({x,y,tag:top?.tagName});
        }
        return {foreground:style.color,background:surface.backgroundColor,paragraphBackground:style.backgroundColor,backgroundImage:surface.backgroundImage,opacity:style.opacity,contrastRatio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05),occlusions};
      });
      assert.equal(review.background, 'rgb(248, 250, 252)'); assert.equal(review.paragraphBackground, 'rgba(0, 0, 0, 0)');
      assert.equal(review.backgroundImage, 'none'); assert.equal(review.opacity, '1');
      assert.ok(review.contrastRatio >= 4.5); assert.deepEqual(review.occlusions,[]);
      evidence.manualContrastReviews = [{name,...review}];
    }
  }
  async function capture(name) {
    const dimensions = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    assert.ok(dimensions.scrollWidth <= dimensions.width + 1, name + ' overflow');
    const controls = await note().locator('button,summary,a').evaluateAll(nodes => nodes.map(n => ({tag:n.tagName,height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})));
    for (const c of controls) assert.ok(c.height >= 44 && c.width >= 44, name + ' target ' + JSON.stringify(c));
    evidence.screens.push({name,...dimensions,controls});
    await note().screenshot({path:path.join(__dirname, name + '.png')}); console.log(name);
  }
  try {
    await harness.mount(page, {anatomy:{_activeTab:'explore',system:'skeletal',complexity:3}}, undefined, {expectCanvas:false});
    await page.addStyleTag({content:'html,body{background:white}#wrap{height:auto;min-height:100%;width:min(1120px,100%);margin:auto}'});
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    for (const [id,row] of Object.entries(bank)) {
      await state({system:row.system,view:row.view,selectedStructure:id});
      assert.equal(await note().getAttribute('data-anatomy-clinical-note'), id);
      assert.equal(await note().locator('[data-anatomy-clinical-note-text]').innerText(), row.clinical);
      assert.equal(await note().locator('a').getAttribute('href'), row.reference);
      const summary = note().locator('summary'), prompt = note().locator('details p');
      assert.equal(await prompt.isVisible(), false);
      await note().getByRole('button',{name:'Read the clinical note aloud',exact:true}).click();
      assert.equal(await page.evaluate(() => window.__spoken), row.clinical);
      await summary.focus(); await page.keyboard.press('Enter');
      assert.equal(await prompt.innerText(), row.prompt); assert.equal(await prompt.isVisible(),true);
      await note().getByRole('button',{name:'Read the reasoning prompt aloud',exact:true}).click();
      assert.equal(await page.evaluate(() => window.__spoken), row.prompt);
      await axe('explore-' + id); if (id === 'kidneys') await capture('desktop-kidneys');
      // A different structure gets a closed disclosure; returning does not retain another prompt's open state.
      const [otherId,otherRow] = Object.entries(bank).find(([otherId]) => otherId !== id);
      await state({system:otherRow.system,view:otherRow.view,selectedStructure:otherId});
      await state({system:row.system,view:row.view,selectedStructure:id});
      assert.equal(await note().locator('details').getAttribute('open'),null);
      evidence.explored.push(id);
      await state({system:row.system,view:row.view,_activeTab:'flashcards',_structureConfidence:{[id]:'practice'},_flashcardFlipped:false});
      assert.equal(await page.locator('[data-anatomy-recall-card]').getAttribute('data-anatomy-recall-card'),id);
      assert.equal(await note().count(),0);
      await page.locator('[data-anatomy-recall-card]').focus(); await page.keyboard.press('Space');
      assert.equal(await note().locator('[data-anatomy-clinical-note-text]').innerText(),row.clinical);
      assert.equal(await note().locator('a').getAttribute('href'),row.reference);
      await axe('flashcard-' + id); evidence.flashcards.push(id);
    }
    for (const width of [390,320]) for (const tab of ['explore','flashcards']) {
      await page.setViewportSize({width,height:844});
      await state({system:'organs',view:'posterior',selectedStructure:'kidneys',_activeTab:tab,_structureConfidence:{kidneys:'practice'},_flashcardFlipped:true});
      await note().locator('summary').click(); await capture('phone-' + width + '-' + tab); await axe('phone-' + width + '-' + tab);
    }
    const table = JSON.parse(fs.readFileSync('dev-tools/i18n/handtl_anatomy_clinical_notes_20260912.json','utf8'));
    for (const [lang,dict] of Object.entries(table)) {
      const fullDict = JSON.parse(fs.readFileSync('lang/' + lang + '.js','utf8')).stem.anatomy;
      await page.setViewportSize({width:390,height:844});
      await page.evaluate(({dict,rtl}) => { window.__ctx.t = (key,fallback) => dict[key.slice(13)] || fallback; document.getElementById('wrap').dir = rtl ? 'rtl' : 'ltr'; window.__rerender(); }, {dict:fullDict,rtl:lang === 'arabic'});
      assert.equal(await note().locator('[data-anatomy-clinical-note-text]').innerText(),dict.notes_ref_kidneys_clinical);
      assert.equal(await note().locator('details p').innerText(),dict.notes_ref_kidneys_prompt);
      await capture('phone-' + lang); await axe(lang); evidence.languages.push(lang);
    }
    await page.evaluate(() => document.body.classList.add('theme-dark'));
    await capture('phone-arabic-dark-expanded'); await axe('arabic-dark-expanded');
    await note().locator('summary').focus(); await page.keyboard.press('Space');
    assert.equal(await note().locator('details p').isVisible(),false);
    await capture('phone-arabic-dark-collapsed'); await axe('arabic-dark-collapsed');
    for (const grade of ['1','4']) for (const tab of ['explore','flashcards']) {
      await state({system:'lymphatic',complexity:1,selectedStructure:'spleen',_activeTab:tab,_structureConfidence:{spleen:'practice'},_flashcardFlipped:true},grade);
      assert.equal(await note().count(),0);
    }
    assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.axe.flatMap(s => s.violations),[]); assert.equal(evidence.axe.flatMap(s => s.incomplete).length,(evidence.manualContrastReviews || []).length);
  } finally {
    fs.writeFileSync(__dirname + '/browser-results.json',JSON.stringify(evidence,null,2) + '\n');
    await harness.destroy(page); await browser.close(); await harness.stop();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
