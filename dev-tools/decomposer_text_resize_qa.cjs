'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = process.cwd(), arg = key => process.argv.find(value => value.startsWith('--' + key + '='))?.slice(key.length + 3);
const label = arg('report') || 'baseline'; assert(/^[a-z0-9-]+$/.test(label));
const folder = path.join(root, 'reports/decomposer-text-resize-wcag'), out = path.join(folder, label); fs.mkdirSync(out, { recursive: true });
const sourcePath = path.resolve(root, arg('source') || 'reports/decomposer-text-resize-wcag/baseline-source.js'); assert(sourcePath.startsWith(root + path.sep));
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
const result = { sourceSha256, sourcePath: path.relative(root, sourcePath), scope: 'Six Decomposer states at320/640px with normal text, normative WCAG text spacing and separately exact200% computed-font simulation. Real React source with compiled app CSS and runtime AppStyles; text node ranges, cell bounds, clipping ancestry and native keyboard focus are measured. No prior core-flow matrix is repeated and no actual browser zoom or full WCAG conformance is claimed.', cases: [], checks: [], captures: [], errors: [], networkFailures: [], progressLocks: [] };
if(process.argv.includes('--discovery-only')||process.argv.includes('--palette-only'))result.scope='Targeted palette follow-up with zero layout-matrix cases: discovery-record/disclosure/keyboard guards,16 discovery theme audits and rate/reading inks, six unresolved gradient/system-color targets across four themes, and the specific Hunt hero in app contrast. The separate36-layout text-resize evidence is retained and source-bound through the root reverse-palette proof. No actual browser zoom, screen-reader speech or full WCAG conformance claim.';
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
    // Obtain an answered quiz through its shipped handlers once; every layout
    // case subsequently restores that ordinary persisted state without scoring.
    await page.evaluate(() => mountDecomposer({ tab: 'quiz' }));
    const materialBlock=source.slice(source.indexOf('var MATERIALS = ['),source.indexOf('/* ── Derived state'));
    const materialNames=[...materialBlock.matchAll(/^\s+name:\s*'([^']+)'/gm)].map(match=>match[1]);
    const desired=['Water','Calcium Carbonate','Sugar (Sucrose)','Hydrogen Peroxide'];assert(desired.every(name=>materialNames.includes(name)));
    const randomSequence=[6.1/8,...desired.map(name=>(materialNames.indexOf(name)+.1)/materialNames.length)];
    await page.evaluate(sequence=>{const original=Math.random;let index=0;try{Math.random=()=>index<sequence.length?sequence[index++]:.5;document.querySelector('#stem-decomposer-quiz-start').click();}finally{Math.random=original;}},randomSequence);await settle();
    const answer = await page.evaluate(() => decomposerData.quizQ.opts.find(option => option !== decomposerData.quizQ.answer));
    await page.getByRole('button', { name: answer, exact: true }).click(); await settle();
    const quizSeed = await page.evaluate(() => JSON.parse(JSON.stringify(decomposerData)));
    const longReply = 'Water contains hydrogen and oxygen. Its polar molecules attract one another through hydrogen bonds. Compare particle arrangement, energy and movement when explaining a change from solid to liquid or gas. A chemical change creates different substances, while a change of state keeps the same substance. '.repeat(6);
    const states = [
      { id: 'explore-comparison', seed: { tab: 'explore', selected: 'Table Salt', compareMode: true, compareTo: 'Water' }, focus: ['#stem-decomposer-compare-select', '#stem-decomposer-compare-select + button'] },
      { id: 'quiz-answered', seed: quizSeed, focus: ['button[aria-label="Next Question"]'] },
      { id: 'tutor-long-reply', seed: { tab: 'tutor', aiMessages: [{ role: 'user', text: 'How can I distinguish a change of state from a chemical change?' }, { role: 'ai', text: longReply }], aiLoading: false }, focus: ['#stem-decomposer-tutor-log', '#stem-decomposer-tutor-input'] },
      { id: 'states-paused', seed: { tab: 'states', selected: 'Water', _simTemp: 150, motionPaused: true }, focus: ['input[type=range]', '[data-decomposer-motion-control]'] },
      { id: 'atoms-paused', seed: { tab: 'visualize', selected: 'Table Salt', decomposed: true, motionPaused: true }, focus: ['[data-decomposer-motion-control]'] },
      { id: 'decomposition-predictions', seed: { tab: 'decompHunt', decompHunt: { tempC: 25, humidity: 70, oxygen: 50, hypothesis: 'I predict that moisture and oxygen let decomposers break down the material more quickly.', understood: true, explanation: 'Temperature, humidity and oxygen act together. Compare conditions and use the observed rate as evidence.', stuckRevealed: true, log: process.argv.includes('--discovery-check') ? Array.from({length:8},(_,index)=>({t:20+index,h:70,o:50,st:'medium',sequence:index+2})) : [], logCount: process.argv.includes('--discovery-check') ? 9 : 0, logStatus: process.argv.includes('--discovery-check') ? 'Reading 9 saved. Showing the latest 8 readings.' : '' } }, focus: ['#dh-tempC', 'textarea[aria-label="Explain decomposition conditions"]'] }
    ];
    result.fixture = { quiz: 'A genuine Start and wrong-answer activation supplies a persisted answered-question fixture. Math.random is controlled only synchronously around Start, then restored, to generate a name-from-formula question with reproducible long material labels. Earlier baseline used a random shorter question; this is a stronger bounded layout fixture.', quizSeed, materialNames, randomSequence, tutor: 'A representative long local reply is mounted as persisted conversation text; no provider/network is called.', paused: 'States and Atoms remain explicitly paused; prior motion behavior is not retested.' };
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
        for (const [index,field] of [...root.querySelectorAll('[data-decomposer-reading] dl > div')].entries()) verticalPair('saved reading field '+index,field.querySelector('dt'),field.querySelector('dd'));
        for (const [index,readouts] of [...root.querySelectorAll('.decomposer-comparison-readouts')].entries()) {
          const header = readouts.parentElement.firstElementChild, blocks = [...header.children].filter(element => element.tagName === 'DIV');
          verticalPair('comparison card title/formula '+index,blocks[0],blocks[1]);
        }
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
    if(!process.argv.includes('--discovery-only')&&!process.argv.includes('--palette-only'))for (const width of [320,640]) for (const kind of ['normal','spacing','size200']) for (const state of states) {
      const label = width + '-' + kind + '-' + state.id; await mount(state,width,kind); const row = await measure(label); row.kind = kind; row.state = state.id; row.focus = [];
      result.cases.push(row);
      console.log('CASE ' + label + ' ' + JSON.stringify({ page: row.page, outside: row.textOutsideCell.length, clipped: row.clippedText.filter(item=>!item.accessibleScroll).length, controls: row.controlsOverflow.length, first: row.textOutsideCell.slice(0,2).map(item=>({text:item.text,cell:item.cell.class})) }));
      check(label+' whole page fits horizontally',row.page.scrollWidth<=row.page.clientWidth+1,row.page);
      check(label+' visible text fits its own cell or control',row.textOutsideCell.length===0,row.textOutsideCell);
      check(label+' text is not clipped outside an accessible scroll region',row.clippedText.every(item=>item.accessibleScroll),row.clippedText.filter(item=>!item.accessibleScroll));
      check(label+' control labels fit',row.controlsOverflow.length===0,row.controlsOverflow);
      if(row.verticalPairs.length)check(label+' reading terms/values and comparison titles/formulas remain vertically separate',row.verticalOverlaps.length===0,row.verticalOverlaps);
      if(kind==='size200')check(label+' uses exact200% computed text',row.exactTextSize?.actual===row.exactTextSize?.base*2,row.exactTextSize);
      for (const selector of state.focus) { const observation = await focus(label,selector); row.focus.push(observation); if(!observation.absent&&!observation.disabled)check(label+' '+selector+' keyboard focus center visible and unobscured',observation.hit&&observation.visibleFocus&&observation.centerInViewport,observation); }
      const failed = row.page.scrollWidth>row.page.clientWidth+1 || row.textOutsideCell.length || row.clippedText.some(item=>!item.accessibleScroll) || row.controlsOverflow.length || row.verticalOverlaps.length || row.focus.some(item=>!item.absent&&!item.disabled&&(!item.hit||!item.visibleFocus||!item.centerInViewport));
      if ((failed && width===320 && kind!=='spacing') || (process.argv.includes('--captures') && width===320 && kind==='size200') || (process.argv.includes('--captures') && state.id==='decomposition-predictions' && kind==='normal' && width===640)) {
        const file=path.join(out,label+'.png'); await page.locator('[role=tabpanel]').screenshot({path:file}); result.captures.push({name:label,path:path.relative(root,file),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
      }
      if(process.argv.includes('--captures')&&kind==='size200'&&state.id==='explore-comparison'&&width===320){await regionShot('320-size200-comparison-header',page.locator('#stem-decomposer-compare-select').locator('xpath=..'));for(let index=0;index<2;index++)await regionShot('320-size200-comparison-card-'+index,page.locator('.decomposer-comparison-readouts').nth(index).locator('xpath=..'));await regionShot('320-size200-badges',page.getByText('First Decomposition',{exact:true}).locator('xpath=../..'));}
      if(process.argv.includes('--captures')&&kind==='size200'&&state.id==='decomposition-predictions'){await regionShot(width+'-size200-discovery-rate',page.locator('[data-decomposer-rate]'));await regionShot(width+'-size200-discovery-sliders',page.locator('#dh-tempC').locator('xpath=../..'));await regionShot(width+'-size200-latest-reading',page.locator('[data-decomposer-reading]').last());await regionShot(width+'-size200-discovery-prompts',page.locator('#decomposer-discovery-prompts'));}
      progress();
    }
    if (process.argv.includes('--discovery-check')) {
      result.discovery = { records: [], keyboard: [], audits: [] };
      const seed = {tab:'decompHunt',decompHunt:{tempC:25,humidity:70,oxygen:50,hypothesis:'',explanation:'',stuckRevealed:false,understood:false,log:[],logCount:0}};
      await mount({seed},320,'normal');
      for (const [selector,key] of [['#dh-tempC','End'],['#dh-humidity','End'],['#dh-oxygen','Home']]) { await page.locator(selector).focus(); await page.keyboard.press(key); await settle(); }
      const log = page.getByRole('button',{name:/Log$/,exact:false}).first();
      for(let index=0;index<9;index++){await log.focus();await page.keyboard.press('Enter');await settle();}
      const logged = await page.evaluate(()=>({state:JSON.parse(JSON.stringify(decomposerData.decompHunt)),listTag:document.querySelector('[data-decomposer-readings]')?.tagName,records:[...document.querySelectorAll('[data-decomposer-reading]')].map(element=>({name:element.getAttribute('aria-label'),fields:[...element.querySelectorAll('dl>div')].map(field=>({term:field.querySelector('dt')?.textContent,value:field.querySelector('dd')?.textContent}))})),status:document.querySelector('[data-decomposer-reading-status]')?.textContent,live:document.querySelector('[data-decomposer-reading-status]')?.getAttribute('aria-live')}));
      result.discovery.records.push(logged);
      check('Discovery nine native Log activations keep the latest eight numbered readings',logged.state.logCount===9&&logged.state.log.length===8&&logged.state.log[0].sequence===2&&logged.state.log.at(-1).sequence===9&&logged.records.length===8&&logged.listTag==='OL',logged);
      check('Discovery records expose four named condition and rate fields',logged.records.every(item=>item.fields.length===4&&item.fields.every(field=>field.term&&field.value))&&logged.records.at(-1).fields.some(field=>field.value==='60 °C')&&logged.records.at(-1).fields.some(field=>field.value==='0%'),logged.records);
      check('Discovery save status identifies the latest reading politely',/Reading 9 saved/.test(logged.status)&&logged.live==='polite',logged);
      const reset=page.getByRole('button',{name:/Reset$/,exact:false}).first();await reset.focus();await page.keyboard.press('Enter');await settle();
      const resetState=await page.evaluate(()=>({state:decomposerData.decompHunt,records:document.querySelectorAll('[data-decomposer-reading]').length,status:document.querySelector('[data-decomposer-reading-status]')?.textContent}));result.discovery.reset=resetState;
      check('Discovery Reset clears saved readings and restores conditions',resetState.records===0&&resetState.state.logCount===0&&resetState.state.tempC===25&&resetState.state.humidity===70&&resetState.state.oxygen===50&&/reset|cleared/i.test(resetState.status),resetState);
      const toggle=page.locator('[data-decomposer-prompts-toggle]');
      await toggle.focus();await page.keyboard.press('Enter');await settle();
      const opened=await toggle.evaluate(element=>{const region=document.getElementById(element.getAttribute('aria-controls'));return{expanded:element.getAttribute('aria-expanded'),focus:document.activeElement===element,region:region&&{hidden:region.hidden,role:region.getAttribute('role'),labelledby:region.getAttribute('aria-labelledby')},id:element.id};});
      check('Discovery prompt disclosure opens a named region without losing focus',opened.expanded==='true'&&opened.focus&&opened.region?.hidden===false&&opened.region?.role==='region'&&opened.region?.labelledby===opened.id,opened);
      await page.keyboard.press('Enter');await settle();
      const closed=await toggle.evaluate(element=>{const region=document.getElementById(element.getAttribute('aria-controls'));return{expanded:element.getAttribute('aria-expanded'),focus:document.activeElement===element,hidden:region?.hidden};});
      check('Discovery prompt disclosure remains focusable when collapsed',closed.expanded==='false'&&closed.focus&&closed.hidden,closed);
      await page.evaluate(()=>{window.qaTabKeyEvents=[];window.addEventListener('keydown',event=>{if(/Arrow/.test(event.key))qaTabKeyEvents.push({key:event.key,ctrl:event.ctrlKey,alt:event.altKey,meta:event.metaKey,composing:event.isComposing,prevented:event.defaultPrevented});});});
      const selectedTab=page.locator('[role=tab][aria-selected=true]');
      for(const chord of ['Control+ArrowRight','Alt+ArrowRight','Meta+ArrowRight']){await selectedTab.focus();await page.keyboard.press(chord);await settle();}
      const composing=await selectedTab.evaluate(element=>{const event=new KeyboardEvent('keydown',{key:'ArrowRight',isComposing:true,bubbles:true,cancelable:true});element.dispatchEvent(event);return{prevented:event.defaultPrevented,composing:event.isComposing};});
      const modified=await page.evaluate(()=>({events:qaTabKeyEvents.slice(),tab:decomposerData.tab}));result.discovery.keyboard.push({modified,composing});
      check('Modified and composing tab arrows preserve browser and input-method actions',modified.events.filter(item=>item.ctrl||item.alt||item.meta).length===3&&modified.events.filter(item=>item.ctrl||item.alt||item.meta).every(item=>!item.prevented)&&composing.composing&&!composing.prevented&&modified.tab==='decompHunt',{modified,composing});
      await selectedTab.focus();await page.evaluate(()=>scrollTo(0,0));await settle();const beforeScroll=await page.evaluate(()=>scrollY);await page.keyboard.press('ArrowDown');await page.waitForTimeout(250);await settle();
      const vertical=await page.evaluate(before=>({before,after:scrollY,tab:decomposerData.tab,event:qaTabKeyEvents.filter(item=>item.key==='ArrowDown').at(-1)}),beforeScroll);result.discovery.keyboard.push({vertical});
      check('Vertical arrows retain native page scrolling on the horizontal tabs',vertical.after>vertical.before&&vertical.tab==='decompHunt'&&vertical.event?.prevented===false,vertical);
      await selectedTab.focus();await page.keyboard.press('ArrowRight');await settle();check('Ordinary horizontal tab arrows still select the adjacent tool panel',await page.evaluate(()=>decomposerData.tab==='explore'));
      await page.addScriptTag({url:url+'desktop/web-app/node_modules/axe-core/axe.min.js'});
      const rates=[['stopped',60,0,0],['slow',5,70,50],['medium',25,70,50],['fast',35,90,90]];
      for(const [rate,tempC,humidity,oxygen] of rates)for(const mode of ['light','dark','contrast','forced-colors']){
        await page.setViewportSize({width:640,height:1000});await page.emulateMedia({forcedColors:mode==='forced-colors'?'active':'none'});
        await page.evaluate(({mode,tempC,humidity,oxygen})=>{document.querySelector('#qa-text-override')?.remove();mountDecomposer({tab:'decompHunt',decompHunt:{tempC,humidity,oxygen,stuckRevealed:true,understood:true,hypothesis:'Compare the conditions.',explanation:'Use the recorded rate as evidence.',log:[{t:tempC,h:humidity,o:oxygen,st:window.qaRateForAudit,sequence:1}],logCount:1}},mode==='forced-colors'?'light':mode);},{mode,tempC,humidity,oxygen});
        // Set the saved reading rate to the exact modeled category. This fixture
        // is already covered through the real Log handler above.
        await page.evaluate(rate=>decomposerSet(prev=>({...prev,decomposer:{...prev.decomposer,decompHunt:{...prev.decomposer.decompHunt,log:[{...prev.decomposer.decompHunt.log[0],st:rate}]}}})),rate);await settle();
        const ink=await page.evaluate(()=>{const elements=[...document.querySelectorAll('[data-decomposer-rate]>div,[data-decomposer-reading] dt,[data-decomposer-reading] dd')];const rgb=value=>value.match(/[\d.]+/g)?.map(Number)||[];const lum=color=>{const values=color.slice(0,3).map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;});return .2126*values[0]+.7152*values[1]+.0722*values[2];};return elements.map(element=>{const s=getComputedStyle(element);let background=null,owner=null,gradient=false;for(let node=element;node;node=node.parentElement){const style=getComputedStyle(node),color=rgb(style.backgroundColor);gradient=gradient||style.backgroundImage!=='none';if(color.length>=3&&(color.length<4||color[3]===1)){background=style.backgroundColor;owner=node.tagName;break;}}const foreground=rgb(s.color),bg=rgb(background||'');return{text:element.textContent,color:s.color,background,owner,fontSize:s.fontSize,fontWeight:s.fontWeight,gradient,ratio:foreground.length>=3&&bg.length>=3?(Math.max(lum(foreground),lum(bg))+.05)/(Math.min(lum(foreground),lum(bg))+.05):null};});});
        const audit=await page.evaluate(async label=>{const data=await axe.run('#tool-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});const compact=item=>({id:item.id,impact:item.impact,help:item.help,nodes:item.nodes.map(node=>({target:node.target,html:node.html,summary:node.failureSummary,any:node.any,all:node.all,none:node.none}))});return{label,version:axe.version,violations:data.violations.map(compact),incomplete:data.incomplete.map(compact),passes:data.passes.map(item=>item.id)};},rate+'-'+mode);audit.computedInk=ink;
        result.discovery.audits.push(audit);check('Discovery '+rate+' '+mode+' has no confirmed automated WCAG finding',audit.violations.length===0,audit.violations);progress();
        check('Discovery '+rate+' '+mode+' rate and reading inks have4.5to1 computed solid-background contrast',ink.every(item=>!item.gradient&&item.ratio>=4.5),ink);
        if(process.argv.includes('--captures')&&rate==='fast'&&(mode==='light'||mode==='forced-colors')){const name='640-'+rate+'-'+mode+'-readings-prompts',file=path.join(out,name+'.png');await page.locator('[role=tabpanel]').screenshot({path:file});result.captures.push({name,path:path.relative(root,file),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});}
        if(process.argv.includes('--captures')&&rate==='fast'&&mode==='dark'){await regionShot('640-dark-tool-heading',page.locator('h3.text-lg').first().locator('xpath=..'));await regionShot('640-dark-hypothesis',page.getByRole('textbox',{name:'Decomposition hypothesis',exact:true}));await regionShot('640-dark-badges-heading',page.getByText(/Badges$/).first().locator('xpath=..'));}
      }
      await page.emulateMedia({forcedColors:'none'});
      if(process.argv.includes('--captures')){await mount(states[5],1280,'normal');await regionShot('1280-discovery-rate-and-sliders',page.locator('#dh-tempC').locator('xpath=../..'));await regionShot('1280-latest-reading',page.locator('[data-decomposer-reading]').last());await regionShot('1280-discovery-prompts',page.locator('#decomposer-discovery-prompts'));}
    }
    if(process.argv.includes('--palette-only')){
      result.palette=[];
      for(const mode of ['light','dark','contrast','forced-colors']){
        await page.setViewportSize({width:640,height:1000});await page.emulateMedia({forcedColors:mode==='forced-colors'?'active':'none'});
        await page.evaluate(mode=>{document.querySelector('#qa-text-override')?.remove();mountDecomposer({tab:'decompHunt',decompHunt:{tempC:25,humidity:70,oxygen:50,hypothesis:'Compare the conditions.',explanation:'Use the recorded rate.',understood:true,stuckRevealed:true,log:[]}},mode==='forced-colors'?'light':mode);},mode);await settle();
        const observation=await page.evaluate(mode=>{
          const root=document.querySelector('#tool-root'),hero=root.querySelector('[role=tabpanel]>.mb-4');
          const targets=[['grade-intro',root.querySelector('.from-amber-50>p.leading-relaxed')],['read-aloud',root.querySelector('button[aria-label="Read aloud"]')],['research-points',root.querySelector('.text-sky-700.text-sm')],['hero-heading',hero?.querySelector('h3')],['hero-hint',hero?.querySelector('p')],['snapshot',root.querySelector('button[aria-label="Snapshot"]')]];
          return{mode,targets:targets.map(([name,element])=>{if(!element)return{name,absent:true};const s=getComputedStyle(element),chain=[];for(let node=element;node;node=node.parentElement){const st=getComputedStyle(node);chain.push({tag:node.tagName,class:node.className,color:st.color,background:st.backgroundColor,image:st.backgroundImage,opacity:st.opacity,forcedColorAdjust:st.forcedColorAdjust});}return{name,text:element.textContent.trim(),color:s.color,background:s.backgroundColor,image:s.backgroundImage,fontSize:s.fontSize,fontWeight:s.fontWeight,forcedColorAdjust:s.forcedColorAdjust,chain};})};
        },mode);for(const target of observation.targets)target.contrast=paletteContrast(target);result.palette.push(observation);console.log('PALETTE '+mode+' '+JSON.stringify(observation.targets.map(item=>({name:item.name,color:item.color,background:item.background,image:item.image,contrast:item.contrast.minimumSampledContrast}))));
        check('Palette '+mode+' six unresolved text/gradient targets have4.5to1 computed contrast',observation.targets.every(item=>item.contrast.known&&item.contrast.minimumSampledContrast>=4.5),observation.targets.map(item=>({name:item.name,contrast:item.contrast})));
        if(mode==='dark'){await regionShot('dark-hero',page.locator('[role=tabpanel]>.mb-4').first());await regionShot('dark-grade-intro',page.locator('.from-amber-50>p.leading-relaxed').first().locator('xpath=..'));await regionShot('dark-research-points',page.locator('.text-sky-700.text-sm').first().locator('xpath=../..'));}
        if(mode==='forced-colors'||mode==='light')await regionShot(mode+'-snapshot',page.getByRole('button',{name:'Snapshot',exact:true}));
        progress();
      }
      await page.emulateMedia({forcedColors:'none'});
      await page.evaluate(()=>mountDecomposer({tab:'scenes'},'contrast'));await settle();
      result.huntHero=await page.evaluate(()=>{const hero=document.querySelector('[role=tabpanel]>.mb-4');return{tab:decomposerData.tab,mode:'app-contrast',targets:[['hero-heading',hero.querySelector('h3')],['hero-hint',hero.querySelector('p')]].map(([name,element])=>{const style=getComputedStyle(element),chain=[];for(let node=element;node;node=node.parentElement){const s=getComputedStyle(node);chain.push({tag:node.tagName,class:node.className,color:s.color,background:s.backgroundColor,image:s.backgroundImage,opacity:s.opacity,forcedColorAdjust:s.forcedColorAdjust});}return{name,text:element.textContent.trim(),color:style.color,background:style.backgroundColor,image:style.backgroundImage,fontSize:style.fontSize,fontWeight:style.fontWeight,chain};})};});
      for(const target of result.huntHero.targets)target.contrast=paletteContrast(target);
      check('Hunt hero remains readable in app contrast despite its separate scene styling',result.huntHero.tab==='scenes'&&result.huntHero.targets.every(item=>item.contrast.known&&item.contrast.minimumSampledContrast>=4.5),result.huntHero);
      await regionShot('app-contrast-hunt-hero',page.locator('[role=tabpanel]>.mb-4').first());
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
