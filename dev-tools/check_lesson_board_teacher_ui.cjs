const fs = require('fs'), {createHash} = require('crypto'), {chromium} = require('playwright'), {expect} = require('@playwright/test');
const {makeBoard} = require('./fixtures/lesson_board.cjs');
const out = 'docs/lesson-board-teacher-recovery-2026-09-19/live';
(async () => {
  fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch({headless:true}), errors = [], scans = [];
  try {
    const page = await browser.newPage({viewport:{width:1280,height:980}});
    page.on('pageerror', error => errors.push(error.message));
    const html = '<!doctype html><html lang="en"><head><title>Teacher response verification</title><style>body{margin:0;background:#f6f7fc}main{max-width:1150px;margin:auto}</style></head><body><main id="root"></main></body></html>';
    await page.route('http://board-teacher.test/**',route=>route.fulfill({contentType:'text/html',body:html}));
    await page.goto('http://board-teacher.test/');
    await page.addScriptTag({path:'desktop/web-app/node_modules/react/umd/react.development.js'});
    await page.addScriptTag({path:'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'});
    await page.addScriptTag({path:'lesson_board_module.js'});
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    await page.evaluate(board => {
      const engine = AlloModules.LessonBoardEngine;
      const data = {roster:{a:{name:'Rowan'},b:{name:'Sky'}},escapeRoomState:engine.createSession(board,'host',{a:{},b:{}})};
      const state = data.escapeRoomState, run = engine.runOf(state);
      Object.assign(run,engine.merge(run,engine.begin(board,run,'heater')));
      state.teamProgress.All.boardActions.a = {attemptId:state.attemptId,turn:0,requestId:'teacher_preview_response',kind:'answer',targetId:'heater',value:'1'};
      window.__alloFirebase = {db:{},doc:()=>({}),getDoc:async()=>({data:()=>data}),updateDoc:async()=>{throw Error('Confirmation is waiting for connection.');}};
      const root = ReactDOM.createRoot(document.getElementById('root'));
      window.renderTeacher = paused => {const next = structuredClone(data);next.escapeRoomState.isPaused = paused;root.render(React.createElement(AlloModules.LessonBoardTeacher,{sessionData:next,appId:'teacher-preview',activeSessionCode:'ROOM',user:{uid:'host'},t:key=>key}));};
      renderTeacher(false);
    },makeBoard());
    for (const [paused,width,label,file] of [[false,1280,'received response','teacher-received.png'],[true,1280,'paused received response','teacher-paused-received.png'],[true,320,'paused received response 320','teacher-paused-received-320.png']]) {
      await page.setViewportSize({width,height:980});await page.evaluate(value=>renderTeacher(value),paused);
      await expect(page.locator('[data-board-received]')).toContainText('Received responses awaiting confirmation: 1.');
      await expect(page.locator('[data-board-resolve]')).toBeDisabled();
      if(paused)await expect(page.locator('[data-check-board-responses]')).toBeDisabled();else await expect(page.locator('[data-check-board-responses]')).toBeEnabled();
      await page.locator('[data-board-awaiting]').evaluate(node=>node.open=true);
      const violations = await page.evaluate(async()=>(await axe.run(document.querySelector('.lb'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})));
      expect(violations,label).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' overflow').toBe(true);
      scans.push({label,violations});await page.locator('.lb-current').screenshot({path:out+'/'+file});
    }
    expect(errors).toEqual([]);
    const report = {passed:true,scans,consoleErrors:errors,bundleSha256:createHash('sha256').update(fs.readFileSync('lesson_board_module.js')).digest('hex')};
    fs.writeFileSync(out+'/teacher-ui-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,scans:scans.length}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
