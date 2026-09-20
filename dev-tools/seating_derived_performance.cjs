const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const rootPath=path.resolve(__dirname,'..');
const baselineRef=process.env.SEATING_BASELINE_REF||'7e6befa89b51b104862bd1534d7378592d59fa14';
const modules={before:cp.execFileSync('git',['show',baselineRef+':seating_chart_module.js'],{encoding:'utf8',maxBuffer:2e6}),after:fs.readFileSync(path.join(rootPath,'seating_chart_module.js'),'utf8')};
function instrument(code){
  for(const name of ['anchorGaps','listPods','overlappingSeatIds']){
    const pattern=new RegExp('function '+name+'\\([^)]*\\) \\{','g');
    assert.equal([...code.matchAll(pattern)].length,1);
    code=code.replace(pattern,match=>match+' window.counts.'+name+'++;');
  }
  return code;
}
async function main(){
  const server=http.createServer((req,res)=>{
    const lib=req.url==='/react.js'?'react':req.url==='/react-dom.js'?'react-dom':null;
    res.setHeader('Content-Type',lib?'application/javascript':'text/html');
    res.end(lib?fs.readFileSync(path.join(rootPath,'desktop/web-app/node_modules',lib,'umd',lib+'.production.min.js')):'<!doctype html><div id="app"></div><script src="/react.js"></script><script src="/react-dom.js"></script>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;const errors=[],scenarios=[];
  try{
    browser=await chromium.launch({headless:true});const page=await browser.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    for(const seats of [30,60]){
      const versions={};
      for(const mode of ['before','after']){
        await page.goto('http://127.0.0.1:'+server.address().port);
        await page.evaluate(({code,seats})=>{
          localStorage.clear();window.counts={anchorGaps:0,listPods:0,overlappingSeatIds:0};
          window.AlloModules={};Function(code)();window.Panel=AlloModules.SeatingChart.SeatingChartPanel;
          const students=Object.fromEntries(Array.from({length:seats},(_,i)=>['Learner'+i,'']));
          const room={id:'room',name:'Synthetic room',seats:Array.from({length:seats},(_,i)=>({id:'s'+i,x:(i%10)*9,y:8+Math.floor(i/10)*11,w:6,h:6})),furniture:[{id:'table',kind:'table',x:0,y:8,w:6,h:6}],assignments:Object.fromEntries(Array.from({length:seats},(_,i)=>['s'+i,'Learner'+i]))};
          window.recognitions=[];
          window.props={isOpen:true,onClose(){},rosterKey:{students,groups:{},seating:{version:1,activeLayoutId:'room',layouts:{room},constraints:[{id:'near',type:'near_teacher',students:['Learner0'],weight:1}],solveSeed:1}},setRosterKey(next){props={...props,rosterKey:typeof next==='function'?next(props.rosterKey):next};render();},live:{sessionCode:'SYNTHETIC',recognitionEnabled:true,normalizeName:name=>name,studentsByName:Object.fromEntries(Object.keys(students).map((name,i)=>[name,{uid:'u'+i,lastSeen:Date.now(),xp:1}])),onRecognizeStudent:uid=>recognitions.push(uid),onRecognizeStudents:uids=>recognitions.push(...uids)}};
          window.root=ReactDOM.createRoot(document.getElementById('app'));
          window.render=()=>ReactDOM.flushSync(()=>root.render(React.createElement(Panel,props)));
          window.snapshot=()=>({text:document.getElementById('app').textContent,labels:[...document.querySelectorAll('svg .seating-map-item')].map(el=>el.getAttribute('aria-label'))});
          window.clickButton=text=>{const button=[...document.querySelectorAll('button')].find(el=>el.textContent.trim()===text);if(!button)throw Error('Missing button '+text);ReactDOM.flushSync(()=>button.click());};
          render();
        },{code:instrument(modules[mode]),seats});
        const result=await page.evaluate(()=>{
          counts={anchorGaps:0,listPods:0,overlappingSeatIds:0};
          for(let i=0;i<100;i++){
            props={...props,live:{...props.live,studentsByName:{...props.live.studentsByName,Learner0:{uid:'u0',lastSeen:Date.now(),xp:i+2}}}};render();
          }
          const liveCounts={...counts},liveSnapshot=snapshot();
          if(!liveSnapshot.labels.some(label=>label.includes('Learner0')&&label.includes('101 XP')))throw Error('Live XP did not update');
          clickButton('Edit room');
          counts={anchorGaps:0,listPods:0,overlappingSeatIds:0};
          const seats=[...document.querySelectorAll('svg .seating-map-item[aria-label^="Seat "]')];
          for(let i=0;i<100;i++)ReactDOM.flushSync(()=>seats[i%seats.length].dispatchEvent(new MouseEvent('click',{bubbles:true})));
          const editCounts={...counts},editSnapshot=snapshot();
          if(!editSnapshot.labels.some(label=>label.includes('overlaps furniture')))throw Error('Expected initial overlap warning');
          // Replacing room geometry must invalidate numbering and overlaps.
          const changed=JSON.parse(JSON.stringify(props.rosterKey));
          changed.seating.layouts.room.seats[0].y=75; changed.seating.layouts.room.seats[0].x=90;
          changed.seating.layouts.room.furniture=[];
          props={...props,rosterKey:changed};counts={anchorGaps:0,listPods:0,overlappingSeatIds:0};render();
          const geometryCounts={...counts},geometrySnapshot=snapshot();
          if(geometrySnapshot.labels.some(label=>label.includes('overlaps furniture')))throw Error('Overlap warning remained stale');
          if(!geometrySnapshot.labels.some(label=>label.startsWith('Seat '+seats.length+': Learner0')))throw Error('Seat numbering remained stale');
          clickButton('🟢 Live');
          const initialPods=AlloModules.SeatingChart.listPods(props.rosterKey);
          // A new roster/layout snapshot changes grouping and assigned names.
          const replacement=JSON.parse(JSON.stringify(props.rosterKey));
          replacement.seating.layouts.room.seats=replacement.seating.layouts.room.seats.slice(0,2);
          replacement.seating.layouts.room.seats[0].x=0;replacement.seating.layouts.room.seats[0].y=8;
          replacement.seating.layouts.room.seats[1].x=7;replacement.seating.layouts.room.seats[1].y=8;
          replacement.seating.layouts.room.assignments={s0:'Learner1',s1:'Learner0'};
          props={...props,rosterKey:replacement};counts={anchorGaps:0,listPods:0,overlappingSeatIds:0};render();
          const rosterCounts={...counts},rosterSnapshot=snapshot();
          const podButton=[...document.querySelectorAll('button')].find(el=>el.textContent.includes('Pod 1'));
          if(!podButton)throw Error('Pod recognition missing');
          ReactDOM.flushSync(()=>podButton.click());
          if(recognitions.join(',')!=='u1,u0')throw Error('Pod recognition used stale students');
          const reset={...props.rosterKey,seating:{version:1,layouts:{},constraints:[]}};
          props={...props,rosterKey:reset};render();const emptySnapshot=snapshot();
          if(!emptySnapshot.text.includes('Start your classroom map'))throw Error('Empty layout did not refresh');
          root.unmount();
          return{liveCounts,editCounts,geometryCounts,rosterCounts,initialPodCount:initialPods.length,recognitions,snapshots:{liveSnapshot,editSnapshot,geometrySnapshot,rosterSnapshot,emptySnapshot}};
        });
        assert.equal(result.liveCounts.listPods,mode==='before'?100:0);
        assert.equal(result.liveCounts.anchorGaps,mode==='before'?100:0);
        assert.equal(result.editCounts.overlappingSeatIds,mode==='before'?100:0);
        assert.equal(result.editCounts.anchorGaps,mode==='before'?100:0);
        assert(result.geometryCounts.overlappingSeatIds>0&&result.geometryCounts.anchorGaps>0);
        assert(result.rosterCounts.listPods>0&&result.rosterCounts.anchorGaps>0);
        versions[mode]=result;
      }
      assert.deepEqual(versions.after.snapshots,versions.before.snapshots);
      const {snapshots:beforeSnapshots,...before}=versions.before,{snapshots:afterSnapshots,...after}=versions.after;
      scenarios.push({seats,before,after,uiAndAccessibleLabelParity:true});
    }
    assert.deepEqual(errors,[]);
    const report={baselineRef,scope:'Actual generated Seating Chart with production React. Helper entry counters measure 100 live-prop updates and 100 real seat-selection clicks; snapshots verify geometry/roster/empty-layout refresh. Synthetic data, no live session or network provider.',scenarios,errors};
    fs.mkdirSync(path.join(rootPath,'reports/seating-derived-performance'),{recursive:true});fs.writeFileSync(path.join(rootPath,'reports/seating-derived-performance/browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
