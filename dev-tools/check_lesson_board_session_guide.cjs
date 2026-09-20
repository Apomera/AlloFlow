const fs = require('fs'), {createHash} = require('crypto'), {chromium} = require('playwright'), {expect} = require('@playwright/test');
const {makeBoard} = require('./fixtures/lesson_board.cjs');
const out = 'docs/lesson-board-return-guide-2026-09-19/live';
(async () => {
  fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch({headless:true}), errors = [], scans = [];
  try {
    const page = await browser.newPage({viewport:{width:390,height:900}});
    page.on('pageerror', error => errors.push(error.message));
    const html = '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Live board return guide</title><style>body{margin:0;background:#f6f7fc}main{max-width:1150px;margin:auto}</style></head><body><main id="root"></main></body></html>';
    await page.route('http://board-guide.test/**',route=>route.fulfill({contentType:'text/html',body:html}));
    await page.goto('http://board-guide.test/');
    await page.addScriptTag({path:'desktop/web-app/node_modules/react/umd/react.development.js'});
    await page.addScriptTag({path:'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'});
    await page.addScriptTag({path:'lesson_board_module.js'});
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    await page.evaluate(board => {
      const engine = AlloModules.LessonBoardEngine;
      const data = {roster:{a:{name:'Rowan'},b:{name:'Sky'}},escapeRoomState:engine.createSession(board,'host',{a:{},b:{}})};
      const state = data.escapeRoomState, run = engine.runOf(state);
      Object.assign(run,engine.merge(run,engine.begin(board,run,'heater')));
      engine.stepOf(run).answers.a = {value:'1',correct:true};
      Object.assign(run,engine.merge(run,engine.resolve(board,run,data.roster)));
      Object.assign(run,engine.merge(run,engine.advance(board,run)));
      Object.assign(run,engine.merge(run,engine.begin(board,run,'cloud')));
      state.boardRoles = {enabled:true,members:['a','b']};
      window.fixtureData = data; window.fixtureWrites = [];
      window.__alloFirebase = {db:{},doc:()=>({}),getDoc:async()=>({data:()=>data}),updateDoc:async(_ref,patch)=>{fixtureWrites.push(patch);}};
      const root = ReactDOM.createRoot(document.getElementById('root'));
      window.renderGuide = (paused = false, teacher = false) => {const next = structuredClone(data);next.escapeRoomState.isPaused=paused;root.render(React.createElement(teacher?AlloModules.LessonBoardTeacher:AlloModules.LessonBoardStudent,{sessionData:next,appId:'guide-preview',targetAppId:'guide-preview',activeSessionCode:'ROOM',user:{uid:teacher?'host':'a'},t:key=>key}));};
      window.setOnline = value => {Object.defineProperty(navigator,'onLine',{configurable:true,value});dispatchEvent(new Event(value?'online':'offline'));};
      renderGuide();
    }, makeBoard());
    const guide = page.locator('[data-board-session-guide]');
    const scan = async (label, screenshot = false) => {
      const violations = await page.evaluate(async()=>(await axe.run(document.querySelector('.lb'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})));
      expect(violations,label).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' overflow').toBe(true);
      scans.push({label,violations});if(screenshot)await guide.screenshot({path:out+'/'+label+'.png'});
    };
    await expect(guide).toContainText('Move 2');await expect(guide).toContainText('Cloud laboratory');await expect(guide).toContainText('Evidence Reader');await expect(guide).toContainText('1 of 2 concepts');
    await scan('late-arrival-390',true);
    await page.setViewportSize({width:320,height:900});await scan('late-arrival-320',true);
    await guide.locator('[data-board-guide-continue]').focus();await page.keyboard.press('Enter');await expect(page.locator('.lb-current > h3')).toBeFocused();await expect(guide.locator('details')).not.toHaveAttribute('open','');
    await page.evaluate(()=>setOnline(false));await expect(guide.locator('[data-board-offline]')).toBeVisible();await scan('offline-320',true);
    await page.evaluate(()=>setOnline(true));await expect(guide.locator('[data-board-return-notice]')).toContainText('session may still be catching up');await expect(guide.locator('details')).toHaveAttribute('open','');await expect(page.locator('.lb-current > h3')).toBeFocused();await scan('reconnected-320',true);
    await page.locator('[data-board-control="0"]').selectOption('1');await page.locator('[data-board-control="1"]').selectOption('0');await page.locator('[data-board-submit]').click();await expect(guide.locator('[data-board-next-step]')).toContainText('pending action');await expect(guide.locator('[data-board-connection-status]')).toContainText('waiting for teacher confirmation');await scan('pending-confirmation-320',true);
    await page.evaluate(()=>renderGuide(true));await expect(guide.locator('[data-board-next-step]')).toContainText('teacher paused');await scan('paused-320',true);
    await page.setViewportSize({width:1280,height:980});await page.evaluate(()=>renderGuide(false));await scan('pending-desktop',true);
    await page.evaluate(()=>document.documentElement.classList.add('dark'));await scan('pending-dark',true);await page.evaluate(()=>document.documentElement.classList.remove('dark'));
    await page.addStyleTag({content:'.lb{font-size:2rem!important}'});await scan('pending-200-percent');
    await page.emulateMedia({forcedColors:'active'});await scan('pending-forced-colors');await page.emulateMedia({forcedColors:'none'});
    await page.evaluate(()=>{renderGuide(false,true);setOnline(false);});await expect(page.locator('[data-board-teacher-offline]')).toBeVisible();await scan('teacher-offline');
    expect(await page.evaluate(()=>fixtureWrites.length)).toBe(1);expect(errors).toEqual([]);
    const report={passed:true,scans,consoleErrors:errors,writes:1,keyboardJump:true,reconnectPreservesFocus:true,bundleSha256:createHash('sha256').update(fs.readFileSync('lesson_board_module.js')).digest('hex')};
    fs.writeFileSync(out+'/guide-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,scans:scans.length,writes:1}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
