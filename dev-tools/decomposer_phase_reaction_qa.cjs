'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = process.cwd(), arg = key => process.argv.find(value => value.startsWith('--' + key + '='))?.slice(key.length + 3);
const label = arg('report') || 'baseline'; assert(/^[a-z0-9-]+$/.test(label));
const folder = path.join(root, 'reports/decomposer-phase-reaction-wcag'), out = path.join(folder, label); fs.mkdirSync(out, { recursive: true });
const sourcePath = path.resolve(root, arg('source') || 'reports/decomposer-phase-reaction-wcag/baseline-source.js'); assert(sourcePath.startsWith(root + path.sep));
const source = fs.readFileSync(sourcePath, 'utf8'), sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
const temp = fs.mkdtempSync(path.join(out, 'browser-temp-')); process.env.TEMP = process.env.TMP = temp;
const browsers = path.join(process.env.USERPROFILE, 'AppData/Local/ms-playwright'); if (fs.existsSync(browsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = browsers;
const { chromium } = require('playwright');
const cssFile = fs.readdirSync(path.join(root, 'app/static/css')).find(file => /^main\.[a-z0-9]+\.css$/i.test(file)); assert(cssFile);
const hostSource = fs.readFileSync(path.join(root, 'dev-tools/decomposer_interactions_wcag_qa.cjs'), 'utf8');
let html = hostSource.match(/const html = String.raw`([\s\S]*?)`;/)[1].replaceAll('${cssFile}', cssFile);
html = html.replace("isDark:false,isContrast:theme==='contrast'", "isDark:theme==='dark',isContrast:theme==='contrast'")
  .replace("document.documentElement.classList.toggle('theme-contrast',theme==='contrast');", "document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('theme-contrast',theme==='contrast');")
  .replace("document.body.style.background=theme==='contrast'?'#000':'#fff';document.body.style.color=theme==='contrast'?'#ff0':'#0f172a';", "document.body.style.background=theme==='contrast'?'#000':theme==='dark'?'#0f172a':'#fff';document.body.style.color=theme==='contrast'?'#ff0':theme==='dark'?'#f8fafc':'#0f172a';");
const result = { sourceSha256, sourcePath: path.relative(root, sourcePath), scope: 'Bounded reaction and material-dependent phase review: six previously unsampled states at320 normal/spacing/exact200% text and640 exact200%. Real React source, compiled app stylesheet and runtime AppStyles. Adjacent semantic text ranges, own-cell bounds and native focus are tested; no earlier whole-tool matrix is repeated and no actual browser zoom or full WCAG conformance is claimed.', cases: [], checks: [], captures: [], errors: [], networkFailures: [], progressLocks: [] };
if(process.argv.includes('--phase-behavior')||process.argv.includes('--goals-check'))result.scope+=' Candidate checks add one narrow200% Atoms-description layout and two narrow expanded-goal layouts (27 measured cases total), phase boundary/unavailable-model behavior, reaction removal focus and13 targeted phase/reaction/goal theme audits.';
if(process.argv.includes('--themes-only'))result.scope='Targeted color-only follow-up with zero layout-matrix cases:13 phase/reaction/earned-Hunt-goal audits and actual computed solid/gradient captions across light, dark, app contrast and forced colors. The separately preserved27-layout candidate evidence is source-bound by the root reverse-class proof. No earlier full-tool matrix, actual browser zoom or full WCAG conformance claim.';
const verify = process.argv.includes('--verify');
function progress() { try { fs.writeFileSync(path.join(out, 'progress.json'), JSON.stringify(result, null, 2)); } catch (error) { if (error.code !== 'EBUSY') throw error; result.progressLocks.push(String(error)); } }
function check(name, ok, evidence) { result.checks.push({ name, ok, evidence }); console.log('CHECK ' + name + ' ' + ok); if (verify) assert.ok(ok, name); }
function paletteContrast(target) {
  if(target.absent)return {known:false};
  const rgb=value=>{const values=String(value).match(/[\d.]+/g)?.map(Number)||[];return values.length>=3?[values[0],values[1],values[2],values.length>3?values[3]:1]:[0,0,0,0];};
  const blend=(front,back)=>front.slice(0,3).map((value,index)=>value*front[3]+back[index]*(1-front[3]));
  const lum=color=>{const values=color.map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;});return .2126*values[0]+.7152*values[1]+.0722*values[2];};
  const ratio=(front,back)=>(Math.max(lum(front),lum(back))+.05)/(Math.min(lum(front),lum(back))+.05);
  const chain=target.chain, imageIndex=chain.findIndex(item=>item.image!=='none'), opaqueIndex=chain.findIndex(item=>rgb(item.background)[3]===1);
  let backgrounds=[],endpoints=[],underlay=[255,255,255],image='none';
  if(imageIndex<0||(opaqueIndex>=0&&opaqueIndex<imageIndex)){
    for(let index=chain.length-1;index>=0;index--)underlay=blend(rgb(chain[index].background),underlay);
    backgrounds=endpoints=[underlay];
  }else{
    image=chain[imageIndex].image;
    if(chain.slice(imageIndex+1).some(item=>item.image!=='none'))return{known:false,reason:'Nested gradients require separate painted review'};
    for(let index=chain.length-1;index>=imageIndex;index--)underlay=blend(rgb(chain[index].background),underlay);
    const stops=(image.match(/rgba?\([^)]*\)/g)||[]).map(rgb);if(!stops.length)return{known:false,image};
    endpoints=stops.map(stop=>blend(stop,underlay));
    for(let index=0;index<stops.length-1;index++)for(let step=0;step<=32;step++){const amount=step/32,color=stops[index].map((value,channel)=>value+(stops[index+1][channel]-value)*amount);backgrounds.push(blend(color,underlay));}
    if(stops.length===1)backgrounds=endpoints;
  }
  const foreground=rgb(target.color).slice(0,3);
  return{known:true,image,foreground,solidUnderlay:underlay,endpointBackgrounds:endpoints,endpointContrasts:endpoints.map(background=>ratio(foreground,background)),minimumSampledContrast:Math.min(...backgrounds.map(background=>ratio(foreground,background))),scope:'Computed CSS gradient stops composited over the actual opaque ancestor background, including transparent stops;32 interpolation samples per stop interval. Source-matched painted screenshots supplement this calculation.'};
}
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
  if (url.pathname === '/stem_lab/stem_tool_decomposer.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(source); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  const allowed = ['/app/static/css/', '/app_styles_module.js', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/desktop/web-app/node_modules/axe-core/'];
  if (!file.startsWith(root + path.sep) || !allowed.some(prefix => url.pathname.startsWith(prefix))) { response.writeHead(403); response.end(); return; }
  fs.readFile(file, (error, bytes) => { if (error) { response.writeHead(404); response.end(); return; } response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(bytes); });
});
let browser;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const url = 'http://127.0.0.1:' + server.address().port + '/';
  try {
    browser = await chromium.launch({ headless: true, args: ['--disk-cache-size=1', '--media-cache-size=1', '--disable-background-networking'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' }); page.setDefaultTimeout(30000);
    page.on('pageerror', error => result.errors.push(String(error))); page.on('requestfailed', request => result.networkFailures.push({ url: request.url(), error: request.failure() }));
    await page.goto(url, { waitUntil: 'load', timeout: 60000 }); await page.waitForFunction(() => window.decomposerData && document.querySelector('#tool-root button'));
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    async function bareMount(seed){await page.evaluate(seed=>mountDecomposer(seed,'light'),seed);await settle();}
    async function reactionSeed(a,b,mix){await bareMount({tab:'reactions'});await page.locator('[data-decomposer-reactant]').filter({hasText:a}).first().click();await page.locator('[data-decomposer-reactant]').filter({hasText:b}).first().click();if(mix)await page.locator('#stem-decomposer-reaction-mix').click();await settle();if(mix&&process.argv.includes('--phase-behavior')&&!process.argv.includes('--themes-only')){const focus=await page.evaluate(()=>({id:document.activeElement.id,text:document.activeElement.textContent}));result.reactionFlowFocus=result.reactionFlowFocus||[];result.reactionFlowFocus.push({a,b,focus});check(a+' plus '+b+' Mix focuses its actual result heading',focus.id==='stem-decomposer-reaction-result',focus);}return page.evaluate(()=>JSON.parse(JSON.stringify(decomposerData)));}
    const picked=await reactionSeed('Calcium Carbonate','Hydrogen Peroxide',false);
    const unknown=await reactionSeed('Calcium Carbonate','Hydrogen Peroxide',true);
    const known=await reactionSeed('Baking Soda','Acetic Acid',true);
    result.fixture={scope:'Shipped picker/Mix handlers create each reaction checkpoint once; layout cases then restore those persisted states. Paused material/phase checkpoints do not rerun prior animation acceptance checks.',picked,unknown,known};
    const states=[
      {id:'reaction-long-picked',seed:picked,focus:['#stem-decomposer-reaction-mix','[data-decomposer-remove=a]','[data-decomposer-remove=b]']},
      {id:'reaction-unknown-result',seed:unknown,focus:['button[aria-label="Listen"]','button[aria-label="Try Another Combo"]']},
      {id:'reaction-known-result',seed:known,focus:['button[aria-label="Listen"]','button[aria-label="Try Another Combo"]']},
      {id:'states-calcium-carbonate',seed:{tab:'states',selected:'Calcium Carbonate',_simTemp:500,motionPaused:true},focus:['input[type=range]','[data-decomposer-motion-control]']},
      {id:'states-water-gas',seed:{tab:'states',selected:'Water',_simTemp:150,motionPaused:true},focus:['input[type=range]','[data-decomposer-motion-control]']},
      {id:'explore-decomposed-salt',seed:{tab:'explore',selected:'Table Salt',decomposed:true,motionPaused:true},focus:['button.bg-amber-700','#stem-decomposer-compare-open']}
    ];
    async function regionShot(name,locator,maxHeight=650){await locator.scrollIntoViewIfNeeded();await settle();const box=await locator.boundingBox(),clip=await page.evaluate(({box,maxHeight})=>({x:box.x+scrollX,y:box.y+scrollY,width:box.width,height:Math.min(box.height,maxHeight),scale:1}),{box,maxHeight}),cdp=await page.context().newCDPSession(page);let bytes;try{bytes=Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true,clip})).data,'base64');}finally{await cdp.detach();}const file=path.join(out,name+'.png');fs.writeFileSync(file,bytes);result.captures.push({name,path:path.relative(root,file),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),region:clip,scope:clip.height<box.height?'First '+clip.height+' pixels of the named region':'Complete named region'});}
    async function mount(state, width, kind) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(seed => { document.querySelector('#qa-text-override')?.remove(); window.qaAiMode = 'complete'; mountDecomposer(seed, 'light'); window.qaBaseFonts = new WeakMap(); }, state.seed);
      await page.evaluate(() => document.fonts.ready); await settle();
      await page.evaluate(kind => {
        const style = document.createElement('style'); style.id = 'qa-text-override';
        if (kind === 'spacing') style.textContent = '#tool-root,#tool-root *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}#tool-root p{margin-bottom:2em!important}';
        else if (kind === 'size200') {
          const rows = [...document.querySelectorAll('#tool-root *')].map((element, index) => { window.qaBaseFonts.set(element, parseFloat(getComputedStyle(element).fontSize)); element.dataset.qaTextId = String(index); return [index, window.qaBaseFonts.get(element) * 2]; });
          style.textContent = rows.map(([index, size]) => '#tool-root [data-qa-text-id="' + index + '"]{font-size:' + size + 'px!important}').join('');
        }
        document.head.appendChild(style);
      }, kind); await settle();
    }
    async function measure(label) {
      return page.evaluate(label => {
        const root = document.querySelector('#tool-root'), panel = root.querySelector('[role=tabpanel]');
        const visible = element => { const b = element.getBoundingClientRect(), s = getComputedStyle(element); return b.width > 0 && b.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && !element.closest('[hidden],.sr-only,[aria-hidden=true]'); };
        const box = element => { const b = element.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
        const cellFor = element => { for (let node = element; node && node !== root; node = node.parentElement) { if (node.matches('button,summary,td,th')) return node; const parent = node.parentElement; if (parent && /grid|flex/.test(getComputedStyle(parent).display)) return node; } return element; };
        const range = document.createRange(), textOutsideCell = [], graphicOutsideCell = [], clippedText = [], verticalPairs = [], verticalOverlaps = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let node;
        while (node = walker.nextNode()) {
          const element = node.parentElement;
          if (!node.textContent.trim() || !visible(element) || element.closest('style,script,svg,option,textarea')) continue;
          range.selectNodeContents(node); const lines = [...range.getClientRects()].filter(b => b.width > 0 && b.height > 0), cell = cellFor(element), cb = cell.getBoundingClientRect();
          if (lines.some(line => line.left < cb.left - 2 || line.right > cb.right + 2)) {
            const observation = { text: node.textContent.trim().slice(0,220), tag: element.tagName, class: element.className, cell: { tag: cell.tagName, class: cell.className, box: box(cell) }, lines: lines.map(line => ({ left: line.left, right: line.right, top: line.top, bottom: line.bottom })) };
            // Standalone pictograms are graphic observations, rather than
            // resized reading text. Their nearby text alternatives stay tested.
            if (!/[\p{L}\p{N}]/u.test(node.textContent) && !element.closest('button,summary')) graphicOutsideCell.push(observation);
            else textOutsideCell.push(observation);
          }
          let scrollX = false, scrollY = false;
          for (let ancestor = element; ancestor && ancestor !== root.parentElement; ancestor = ancestor.parentElement) {
            const s = getComputedStyle(ancestor), b = ancestor.getBoundingClientRect();
            scrollX = scrollX || (/auto|scroll/.test(s.overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 1);
            scrollY = scrollY || (/auto|scroll/.test(s.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1);
            const clipX = /hidden|clip/.test(s.overflowX) && lines.some(line => line.left < b.left - 2 || line.right > b.right + 2);
            const clipY = /hidden|clip/.test(s.overflowY) && lines.some(line => line.top < b.top - 2 || line.bottom > b.bottom + 2);
            if (clipX || clipY) { clippedText.push({ text: node.textContent.trim().slice(0,220), class: element.className, ancestor: ancestor.className, clipX, clipY, accessibleScroll: (!clipX || scrollX) && (!clipY || scrollY) }); break; }
          }
        }
        const controlsOverflow = [...root.querySelectorAll('button,summary')].filter(visible).filter(element => element.scrollWidth > element.clientWidth + 2).map(element => ({ text: element.textContent.trim(), class: element.className, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
        const verticalPair = (label, first, second) => {
          if (!first || !second || !visible(first) || !visible(second)) return;
          const a = document.createRange(), b = document.createRange(); a.selectNodeContents(first); b.selectNodeContents(second);
          const firstLines = [...a.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0), secondLines = [...b.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
          if (!firstLines.length || !secondLines.length) return;
          const firstBottom = Math.max(...firstLines.map(rect => rect.bottom)), secondTop = Math.min(...secondLines.map(rect => rect.top));
          const pair = { label, first: first.textContent.trim(), second: second.textContent.trim(), gap: secondTop - firstBottom, firstBottom, secondTop };
          verticalPairs.push(pair); if (pair.gap < -1) verticalOverlaps.push(pair);
        };
        for(const heading of panel.querySelectorAll('h3,h4,h5')){const next=heading.nextElementSibling,parent=getComputedStyle(heading.parentElement);if(next&&/^(P|SPAN)$/.test(next.tagName)&&!(parent.display==='flex'&&parent.flexDirection!=='column'))verticalPair('heading and following text',heading,next);}
        for(const label of [...panel.querySelectorAll('div')].filter(element=>element.children.length===0&&['Melting Point','Phase model limit','Liquid Range','Boiling Point'].includes(element.textContent.trim())))verticalPair('phase transition '+label.textContent,label,label.nextElementSibling);
        for(const paragraph of panel.querySelectorAll('p')){const next=paragraph.nextElementSibling,parent=getComputedStyle(paragraph.parentElement);if(next&&next.tagName==='P'&&!(parent.display==='flex'&&parent.flexDirection!=='column'))verticalPair('adjacent reading paragraphs',paragraph,next);}
        const pageOffenders = [...root.querySelectorAll('*')].filter(visible).filter(element => { const b = element.getBoundingClientRect(); return b.left < -1 || b.right > innerWidth + 1; }).slice(0,15).map(element => ({ tag: element.tagName, class: element.className, text: element.textContent.trim().slice(0,160), box: box(element) }));
        const sample = root.querySelector('h3,h4'), base = sample && window.qaBaseFonts.get(sample);
        return { label, width: innerWidth, page: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }, textOutsideCell, graphicOutsideCell, clippedText, controlsOverflow, verticalPairs, verticalOverlaps, pageOffenders, exactTextSize: sample && { base, actual: parseFloat(getComputedStyle(sample).fontSize) }, panel: panel && box(panel) };
      }, label);
    }
    async function focus(label, selector) {
      const locator = page.locator(selector).first(); if (!await locator.count()) return { label, selector, absent: true };
      if (await locator.isDisabled()) return { label, selector, disabled: true };
      await locator.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await settle();
      return page.evaluate(({ label, selector }) => { const element = document.activeElement, b = element.getBoundingClientRect(), s = getComputedStyle(element), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return { label, selector, tag: element.tagName, id: element.id, name: element.getAttribute('aria-label') || element.textContent.trim().slice(0,180), hit: hit === element || element.contains(hit), occluder: hit && { tag: hit.tagName, id: hit.id, class: hit.className }, visibleFocus: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, centerInViewport: b.x + b.width / 2 >= 0 && b.x + b.width / 2 <= innerWidth && b.y + b.height / 2 >= 0 && b.y + b.height / 2 <= innerHeight, inViewport: b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1, box: { x: b.x, y: b.y, width: b.width, height: b.height } }; }, { label, selector });
    }
    if(!process.argv.includes('--supplement-only')&&!process.argv.includes('--themes-only')&&!process.argv.includes('--progress-adjudication'))for (const [width,kind] of [[320,'normal'],[320,'spacing'],[320,'size200'],[640,'size200']]) for (const state of states) {
      const label = width + '-' + kind + '-' + state.id; await mount(state,width,kind); const row = await measure(label); row.kind = kind; row.state = state.id; row.focus = [];
      result.cases.push(row);
      console.log('CASE ' + label + ' ' + JSON.stringify({ page: row.page, outside: row.textOutsideCell.length, clipped: row.clippedText.filter(item=>!item.accessibleScroll).length, controls: row.controlsOverflow.length, first: row.textOutsideCell.slice(0,2).map(item=>({text:item.text,cell:item.cell.class})) }));
      check(label+' whole page fits horizontally',row.page.scrollWidth<=row.page.clientWidth+1,row.page);
      check(label+' visible text fits its own cell or control',row.textOutsideCell.length===0,row.textOutsideCell);
      check(label+' text is not clipped outside an accessible scroll region',row.clippedText.every(item=>item.accessibleScroll),row.clippedText.filter(item=>!item.accessibleScroll));
      check(label+' control labels fit',row.controlsOverflow.length===0,row.controlsOverflow);
      if(row.verticalPairs.length)check(label+' adjacent phase/reaction/element reading text remains vertically separate',row.verticalOverlaps.length===0,row.verticalOverlaps);
      if(kind==='size200')check(label+' uses exact200% computed text',row.exactTextSize?.actual===row.exactTextSize?.base*2,row.exactTextSize);
      for (const selector of state.focus) { const observation = await focus(label,selector); row.focus.push(observation); if(!observation.absent&&!observation.disabled)check(label+' '+selector+' keyboard focus center visible and unobscured',observation.hit&&observation.visibleFocus&&observation.centerInViewport,observation); }
      const failed = row.page.scrollWidth>row.page.clientWidth+1 || row.textOutsideCell.length || row.clippedText.some(item=>!item.accessibleScroll) || row.controlsOverflow.length || row.verticalOverlaps.length || row.focus.some(item=>!item.absent&&!item.disabled&&(!item.hit||!item.visibleFocus||!item.centerInViewport));
      if ((failed && width===320 && kind!=='spacing') || (process.argv.includes('--captures') && width===320 && kind==='size200') || (process.argv.includes('--captures') && state.id==='decomposition-predictions' && kind==='normal' && width===640)) {
        const file=path.join(out,label+'.png'); await page.locator('[role=tabpanel]').screenshot({path:file}); result.captures.push({name:label,path:path.relative(root,file),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
      }
      if(process.argv.includes('--captures')&&(kind==='size200'||failed)){
        if(state.id.startsWith('reaction-')){const resultTitle=page.locator('#stem-decomposer-reaction-result');if(await resultTitle.count())await regionShot(label+'-result',resultTitle.locator('xpath=../..').locator('xpath=..'));else if(await page.locator('[data-decomposer-remove=b]').count())await regionShot(label+'-material-b',page.locator('[data-decomposer-remove=b]').locator('xpath=../..'));else await regionShot(label+'-slots',page.locator('button[aria-label="Remove"]').first().locator('xpath=../../..'));}
        if(state.id.startsWith('states-')){await regionShot(label+'-phase-cards',await page.locator('[data-decomposer-phase-facts]').count()?page.locator('[data-decomposer-phase-facts]'):page.getByText('Melting Point',{exact:true}).locator('xpath=../..'));if(await page.locator('#stem-decomposer-state-summary').count())await regionShot(label+'-phase-summary',page.locator('#stem-decomposer-state-summary'));if(await page.locator('#stem-decomposer-state-description').count())await regionShot(label+'-phase-description',page.locator('#stem-decomposer-state-description'));}
        if(state.id==='explore-decomposed-salt')await regionShot(label+'-element-card',page.getByText('Sodium',{exact:true}).first().locator('xpath=../../..'));
      }
      progress();
    }
    if(process.argv.includes('--phase-behavior')&&!process.argv.includes('--themes-only')){
      result.phaseBehavior=[];
      for(const [slot,material] of [['a','Calcium Carbonate'],['b','Hydrogen Peroxide']]){await mount({seed:picked},320,'normal');const remove=page.locator('[data-decomposer-remove='+slot+']');const slotInfo=await remove.evaluate(element=>{const group=element.closest('[role=group]'),id=group?.getAttribute('aria-labelledby');return{name:element.getAttribute('aria-label'),groupRole:group?.getAttribute('role'),groupName:id&&document.getElementById(id)?.textContent};});await remove.focus();await page.keyboard.press('Enter');await settle();const removed=await page.evaluate(()=>({state:{a:decomposerData.reactantA,b:decomposerData.reactantB},focus:document.activeElement.dataset.decomposerReactant}));check('Reaction slot '+slot+' identifies its material and returns removal focus to that material choice',slotInfo.name.includes(material)&&slotInfo.groupRole==='group'&&slotInfo.groupName.includes(slot==='a'?'Material A':'Material B')&&removed.focus===material&&(slot==='a'?removed.state.a===null:removed.state.b===null),{slotInfo,removed});}
      const stateObservation=async name=>{const row=await page.evaluate(name=>{const summary=document.querySelector('#stem-decomposer-state-summary'),description=document.querySelector('#stem-decomposer-state-description'),canvas=document.querySelector('[data-decomposer-state-canvas]'),slider=document.querySelector('input[type=range]');return{name,selected:decomposerData.selected,temperature:decomposerData._simTemp,summary:summary?.textContent,summaryRole:summary?.getAttribute('role'),summaryLive:summary?.getAttribute('aria-live'),description:description?.textContent,canvas:canvas&&{role:canvas.getAttribute('role'),name:canvas.getAttribute('aria-label'),describedby:canvas.getAttribute('aria-describedby'),idsValid:(canvas.getAttribute('aria-describedby')||'').split(/\s+/).every(id=>!!document.getElementById(id))},slider:{value:slider.value,disabled:slider.disabled,description:slider.getAttribute('aria-describedby')},focus:document.activeElement===slider};},name);result.phaseBehavior.push(row);return row;};
      await mount({seed:{tab:'states',selected:'Water',_simTemp:-5,motionPaused:true}},320,'normal');await page.evaluate(()=>{window.qaPersistentPhaseSummary=document.querySelector('#stem-decomposer-state-summary');});
      let phase=await stateObservation('Water below freezing');check('Water below0°C has a named persistent Solid status and associated particle description',/Solid/.test(phase.summary)&&/fixed positions|vibrate/.test(phase.description)&&phase.canvas?.idsValid&&phase.canvas.describedby.includes('stem-decomposer-state-summary')&&phase.canvas.describedby.includes('stem-decomposer-state-description')&&phase.summaryRole==='status'&&phase.summaryLive==='polite',phase);
      const temperature=page.locator('input[type=range]');await temperature.focus();await page.keyboard.press('ArrowRight');await settle();phase=await stateObservation('Water melting boundary');check('Native temperature step to0°C updates status and liquid arrangement text',phase.temperature===0&&/Liquid/.test(phase.summary)&&/slide|close together/.test(phase.description)&&phase.canvas?.idsValid,phase);
      for(let index=0;index<20;index++)await page.keyboard.press('ArrowRight');await settle();phase=await stateObservation('Water boiling boundary');check('Native temperature steps to100°C update Gas status and retain the same live-region node',phase.temperature===100&&/Gas/.test(phase.summary)&&/freely|spread/.test(phase.description)&&await page.evaluate(()=>qaPersistentPhaseSummary===document.querySelector('#stem-decomposer-state-summary')),phase);
      await mount({seed:{tab:'states',selected:'Methane',_simTemp:25,motionPaused:true}},320,'normal');phase=await stateObservation('Missing methane phase data');check('Missing Methane phase data disables temperature and explains the unavailable model without a misleading canvas',phase.slider.disabled&&!phase.canvas&&/unavailable/i.test(phase.summary)&&/data.*unavailable|unavailable.*data/i.test(phase.description)&&/Methane/.test(phase.description),phase);
      await mount({seed:{tab:'states',selected:'Sugar (Sucrose)',_simTemp:500,motionPaused:true}},320,'normal');phase=await stateObservation('Sugar above modeled limit');check('Sugar above its decomposition boundary leaves temperature enabled and explains the absent phase canvas',!phase.slider.disabled&&!phase.canvas&&/unavailable/i.test(phase.summary)&&/outside.*model|decompos/i.test(phase.description),phase);
      await page.locator('input[type=range]').focus();await page.keyboard.press('Home');await settle();phase=await stateObservation('Sugar restored below modeled limit');check('Lowering Sugar temperature restores its canvas and keeps keyboard focus on temperature',phase.temperature===-200&&/Solid/.test(phase.summary)&&phase.canvas?.idsValid&&phase.focus,phase);
      await mount({seed:{tab:'states',selected:'Carbon Dioxide',_simTemp:-75,motionPaused:true}},320,'normal');phase=await stateObservation('Carbon dioxide model has no liquid interval');const carbonFacts=await page.locator('[data-decomposer-phase-facts]').textContent();check('Equal carbon dioxide phase thresholds explain the absent liquid interval',/Gas/.test(phase.summary)&&/No liquid phase in this model/.test(carbonFacts),{phase,facts:carbonFacts});
      await mount({seed:{tab:'visualize',selected:'Table Salt',decomposed:true,motionPaused:true}},320,'normal');
      let atoms=await page.evaluate(()=>{const description=document.querySelector('#stem-decomposer-atom-description'),canvas=document.querySelector('[data-decomposer-atom-canvas]');return{description:description?.textContent,associated:canvas?.getAttribute('aria-describedby'),role:canvas?.getAttribute('role')};});result.phaseBehavior.push({name:'Atoms text alternative',...atoms});check('Atoms canvas associates a readable formula/composition/separated-groups/motion alternative',atoms.associated==='stem-decomposer-atom-description'&&atoms.role==='img'&&/NaCl/.test(atoms.description)&&/Sodium: 1 atoms/.test(atoms.description)&&/Chlorine: 1 atoms/.test(atoms.description)&&/separated/.test(atoms.description)&&/paused/.test(atoms.description),atoms);
      await page.locator('[data-decomposer-motion-control]').focus();await page.keyboard.press('Enter');await settle();const runningDescription=await page.locator('#stem-decomposer-atom-description').textContent();check('Atoms motion control updates its text alternative along with visual motion',/running/.test(runningDescription),runningDescription);await page.keyboard.press('Enter');await settle();
      if(process.argv.includes('--captures')){await regionShot('320-atoms-text-alternative',page.locator('#stem-decomposer-atom-description'));await mount({seed:{tab:'states',selected:'Methane',_simTemp:25,motionPaused:true}},320,'normal');await regionShot('320-missing-phase-description',page.locator('#stem-decomposer-state-description'));}
      await mount({seed:{tab:'visualize',selected:'Table Salt',decomposed:true,motionPaused:true}},320,'size200');const atomLayout=await measure('320-size200-atoms-new-description');atomLayout.kind='size200';atomLayout.state='atoms-new-description';atomLayout.focus=[];result.cases.push(atomLayout);check('New Atoms description remains readable at320px with exact200% text',atomLayout.page.scrollWidth<=atomLayout.page.clientWidth+1&&atomLayout.textOutsideCell.length===0&&atomLayout.verticalOverlaps.length===0&&atomLayout.clippedText.every(item=>item.accessibleScroll)&&atomLayout.exactTextSize.actual===atomLayout.exactTextSize.base*2,atomLayout);if(process.argv.includes('--captures'))await regionShot('320-size200-atoms-text-alternative',page.locator('#stem-decomposer-atom-description'));
    }
    if(process.argv.includes('--goals-check')&&!process.argv.includes('--themes-only')){
      result.goals=[];
      for(const kind of ['spacing','size200']){
        await mount({seed:{tab:'states',selected:'Water',_simTemp:150,motionPaused:true,completedChallenges:['first_decompose'],badges:['firstDecompose']}},320,kind);
        for(const name of ['challenges','badges']){const details=page.locator('[data-decomposer-goals='+name+']'),summary=details.locator(':scope>summary');await summary.focus();await page.keyboard.press('Enter');await settle();const opened=await details.evaluate(element=>({open:element.open,focused:document.activeElement===element.querySelector('summary'),rows:[...element.querySelectorAll('li')].map(row=>row.textContent.trim()),summary:element.querySelector('summary').textContent}));result.goals.push({kind,name,...opened});check('320 '+kind+' '+name+' goals open by keyboard with readable criteria and completion text',opened.open&&opened.focused&&opened.rows.length>0&&opened.rows.every(text=>name==='badges'?/earned/i.test(text):/complete/i.test(text))&&opened.rows[0].includes(name==='badges'?'Earned':'Complete'),opened);}
        const row=await measure('320-'+kind+'-expanded-goals');row.kind=kind;row.state='expanded-goals';row.focus=[];result.cases.push(row);check(row.label+' criteria text fits horizontally and vertically without hidden clipping',row.page.scrollWidth<=row.page.clientWidth+1&&row.textOutsideCell.length===0&&row.verticalOverlaps.length===0&&row.clippedText.every(item=>item.accessibleScroll),row);
        if(kind==='size200')check(row.label+' uses exact200% computed text',row.exactTextSize?.actual===row.exactTextSize?.base*2,row.exactTextSize);
        if(process.argv.includes('--captures'))for(const name of ['challenges','badges'])await regionShot('320-'+kind+'-'+name+'-goals',page.locator('[data-decomposer-goals='+name+']'));
        for(const name of ['challenges','badges']){const details=page.locator('[data-decomposer-goals='+name+']'),summary=details.locator(':scope>summary');await summary.focus();await page.keyboard.press('Enter');await settle();check('320 '+kind+' '+name+' goals collapse without removing keyboard focus',await details.evaluate(element=>!element.open&&document.activeElement===element.querySelector('summary')));}
        progress();
      }
    }
    result.audits=[];
    await page.addScriptTag({url:url+'desktop/web-app/node_modules/axe-core/axe.min.js'});
    if(!process.argv.includes('--progress-adjudication'))for(const [stateIndex,mode] of [[1,'light'],[1,'dark'],[2,'dark'],[3,'dark'],[4,'light']]){
      const fixture=states[stateIndex];await page.setViewportSize({width:640,height:1000});await page.evaluate(({seed,mode})=>{document.querySelector('#qa-text-override')?.remove();mountDecomposer(seed,mode);},{seed:fixture.seed,mode});await settle();
      const audit=await page.evaluate(async name=>{const data=await axe.run('#tool-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});const compact=item=>({id:item.id,impact:item.impact,help:item.help,nodes:item.nodes.map(node=>({target:node.target,html:node.html,summary:node.failureSummary,any:node.any,all:node.all,none:node.none}))});return{name,version:axe.version,violations:data.violations.map(compact),incomplete:data.incomplete.map(compact)};},fixture.id+'-'+mode);
      const inks=await page.evaluate(()=>{const panel=document.querySelector('[role=tabpanel]'),elements=[...panel.querySelectorAll('span,p')].filter(element=>element.children.length===0&&!element.closest('[aria-hidden=true]')&&(element.textContent.includes(' is a ')||element.closest('#stem-decomposer-state-summary')||element.classList.contains('text-sky-600')||element.textContent.trim()==='Material B'));return elements.map(element=>{const style=getComputedStyle(element),chain=[];for(let node=element;node;node=node.parentElement){const s=getComputedStyle(node);chain.push({tag:node.tagName,class:node.className,color:s.color,background:s.backgroundColor,image:s.backgroundImage,opacity:s.opacity,forcedColorAdjust:s.forcedColorAdjust});}return{name:element.textContent.trim(),text:element.textContent.trim(),color:style.color,background:style.backgroundColor,image:style.backgroundImage,fontSize:style.fontSize,fontWeight:style.fontWeight,chain};});});for(const ink of inks)ink.contrast=paletteContrast(ink);audit.conditionalInks=inks;result.audits.push(audit);
      check(audit.name+' no confirmed automated WCAG finding',audit.violations.length===0,audit.violations);
      check(audit.name+' conditional phase/observable captions meet4.5to1 contrast',inks.every(ink=>ink.contrast.known&&ink.contrast.minimumSampledContrast>=4.5),inks);
      console.log('AUDIT '+audit.name+' '+JSON.stringify({violations:audit.violations.map(item=>({id:item.id,nodes:item.nodes.map(n=>n.target)})),inks:inks.map(ink=>({text:ink.text,ratio:ink.contrast.minimumSampledContrast}))}));progress();
    }
    if(process.argv.includes('--phase-behavior')||process.argv.includes('--goals-check'))for(const mode of ['light','dark','contrast','forced-colors'])for(const type of ['phase','hunt-goals']){
      if(type==='phase'&&!process.argv.includes('--phase-behavior')||type==='hunt-goals'&&!process.argv.includes('--goals-check'))continue;
      await page.setViewportSize({width:640,height:1000});await page.emulateMedia({forcedColors:mode==='forced-colors'?'active':'none'});
      const seed=type==='phase'?{tab:'states',selected:'Calcium Carbonate',_simTemp:500,motionPaused:true}:{tab:'scenes',completedChallenges:['first_decompose'],badges:['firstDecompose']};
      await page.evaluate(({seed,mode,type})=>{document.querySelector('#qa-text-override')?.remove();mountDecomposer(seed,mode==='forced-colors'?'light':mode);if(type==='hunt-goals')for(const details of document.querySelectorAll('[data-decomposer-goals]'))details.open=true;},{seed,mode,type});await settle();
      const audit=await page.evaluate(async name=>{const data=await axe.run('#tool-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});const compact=item=>({id:item.id,impact:item.impact,help:item.help,nodes:item.nodes.map(node=>({target:node.target,html:node.html,summary:node.failureSummary,any:node.any,all:node.all,none:node.none}))});return{name,version:axe.version,violations:data.violations.map(compact),incomplete:data.incomplete.map(compact)};},type+'-'+mode);
      const inks=await page.evaluate(type=>{const selector=type==='phase'?'#stem-decomposer-state-summary span:not([aria-hidden]),#stem-decomposer-state-description':'[data-decomposer-goals] summary,[data-decomposer-goals] li p';const elements=[...document.querySelectorAll(selector)];if(type==='hunt-goals')elements.push(...[...document.querySelectorAll('#tool-root div')].filter(element=>!element.children.length&&/^\+\d+\sXP$/.test(element.textContent.trim())));return elements.map(element=>{const s=getComputedStyle(element),chain=[];for(let node=element;node;node=node.parentElement){const style=getComputedStyle(node);chain.push({tag:node.tagName,class:node.className,color:style.color,background:style.backgroundColor,image:style.backgroundImage,opacity:style.opacity,forcedColorAdjust:style.forcedColorAdjust});}return{name:element.textContent.trim(),color:s.color,background:s.backgroundColor,image:s.backgroundImage,fontSize:s.fontSize,fontWeight:s.fontWeight,chain};});},type);for(const ink of inks)ink.contrast=paletteContrast(ink);audit.conditionalInks=inks;result.audits.push(audit);
      check(audit.name+' no confirmed automated WCAG finding',audit.violations.length===0,audit.violations);check(audit.name+' visible phase or goal text meets4.5to1 contrast',inks.length>0&&inks.every(ink=>ink.contrast.known&&ink.contrast.minimumSampledContrast>=4.5),inks);progress();
      if(process.argv.includes('--captures')&&(mode==='dark'||mode==='contrast'))await regionShot(audit.name,type==='phase'?page.locator('#stem-decomposer-state-description'):page.locator('[data-decomposer-goals=challenges]'));
      if(process.argv.includes('--captures')&&type==='hunt-goals'&&(mode==='light'||mode==='dark')){await regionShot(audit.name+'-earned-badge',page.getByText('+10 XP',{exact:true}).first().locator('xpath=..'));await regionShot(audit.name+'-earned-goal-status',page.locator('[data-decomposer-goals=badges] li').first());}
    }
    await page.emulateMedia({forcedColors:'none'});
    if(process.argv.includes('--progress-adjudication')||process.argv.includes('--progress-check')){
      if(process.argv.includes('--progress-adjudication'))result.scope='Bounded paint-stack adjudication of Hunt global percentage text at0% and100% in ordinary light and forced colors;zero layout-matrix cases. Actual computed CSS colors/gradient stops plus source-bound screenshots distinguish real normal-theme failures from forced-color detector mismatches.';
      else result.scope+=' The follow-up also checks all three Hunt global-progress texts at0% and100% across four themes (eight painted progress cases).';
      result.progressPalette=[];
      const arrayStart=source.indexOf('[',source.indexOf('var SCENES =')),text=source.slice(arrayStart);let depth=0,quote=null,escape=false,arrayEnd=-1;
      for(let index=0;index<text.length;index++){const character=text[index];if(quote){if(escape)escape=false;else if(character==='\\')escape=true;else if(character===quote)quote=null;}else if(character==='\''||character==='"')quote=character;else if(character==='[')depth++;else if(character===']'&&--depth===0){arrayEnd=index+1;break;}}
      assert(arrayEnd>0);const scenes=new Function('return ('+text.slice(0,arrayEnd)+');')(),allFound=Object.fromEntries(scenes.flatMap(scene=>scene.objects.map(object=>[object.id,true])));
      for(const complete of [false,true])for(const mode of process.argv.includes('--progress-check')?['light','dark','contrast','forced-colors']:['light','forced-colors']){
        await page.setViewportSize({width:640,height:1000});await page.emulateMedia({forcedColors:mode==='forced-colors'?'active':'none'});await page.evaluate(({seed,mode})=>mountDecomposer(seed,mode==='forced-colors'?'light':mode),{seed:{tab:'scenes',foundObjects:complete?allFound:{}},mode});await settle();
        if(process.argv.includes('--progress-check')){
          const observation=await page.evaluate(({mode,complete})=>{const host=document.querySelector('[data-decomposer-total-progress]'),percent=host.querySelector('span.font-black.text-sm'),label=host.querySelector('span.text-xs.font-bold'),count=host.querySelector('p');return{mode,complete,targets:[['label',label],['count',count],['percent',percent]].map(([name,element])=>{const s=getComputedStyle(element),chain=[];for(let node=element;node;node=node.parentElement){const style=getComputedStyle(node);chain.push({tag:node.tagName,class:node.className,color:style.color,background:style.backgroundColor,image:style.backgroundImage,opacity:style.opacity,forcedColorAdjust:style.forcedColorAdjust});}return{name,text:element.textContent.trim(),color:s.color,background:s.backgroundColor,image:s.backgroundImage,fontSize:s.fontSize,fontWeight:s.fontWeight,chain};})};},{mode,complete});for(const target of observation.targets)target.contrast=paletteContrast(target);result.progressPalette.push(observation);check(mode+' '+(complete?'100':'0')+'% Hunt progress label/count/percentage have4.5to1 actual palette contrast',observation.targets.every(target=>target.contrast.known&&target.contrast.minimumSampledContrast>=4.5),observation);console.log('PROGRESS-PALETTE '+JSON.stringify({mode,complete,targets:observation.targets.map(target=>({name:target.name,text:target.text,ratio:target.contrast.minimumSampledContrast}))}));await regionShot(mode+'-'+(complete?'100':'0')+'-progress',page.locator('[data-decomposer-total-progress]'));
        }else{
          const observation=await page.locator('span.font-black.text-sm').evaluate(element=>{const s=getComputedStyle(element),chain=[];for(let node=element;node;node=node.parentElement){const style=getComputedStyle(node);chain.push({tag:node.tagName,class:node.className,color:style.color,background:style.backgroundColor,image:style.backgroundImage,opacity:style.opacity,forcedColorAdjust:style.forcedColorAdjust});}return{name:element.textContent.trim(),color:s.color,background:s.backgroundColor,image:s.backgroundImage,fontSize:s.fontSize,fontWeight:s.fontWeight,chain};});observation.mode=mode;observation.complete=complete;observation.contrast=paletteContrast(observation);result.progressPalette.push(observation);console.log('PROGRESS-PALETTE '+JSON.stringify({mode,complete,text:observation.name,color:observation.color,contrast:observation.contrast.minimumSampledContrast}));await regionShot(mode+'-'+(complete?'100':'0')+'-progress',page.locator('span.font-black.text-sm').locator('xpath=..'));
        }
        progress();
      }
    }
    check('No runtime errors in bounded text resize cases',result.errors.length===0,result.errors); result.success=true;
  } catch(error) { result.success=false; result.harnessError=String(error);console.error(error);process.exitCode=1; }
  finally {
    if(browser){await browser.close();result.browsersClosed=true;}
    await new Promise(resolve=>{server.close(resolve);server.closeAllConnections?.();});
    const real=fs.realpathSync(temp),parent=fs.realpathSync(out);assert(real.startsWith(parent+path.sep)&&path.basename(real).startsWith('browser-temp-'));fs.rmSync(real,{recursive:true,force:true});result.browserTempCleaned=true;
    result.passed=result.checks.filter(item=>item.ok).length;result.failed=result.checks.filter(item=>!item.ok).length;
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({success:result.success,sourceSha256,passed:result.passed,failed:result.failed,cases:result.cases.length,error:result.harnessError}));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
