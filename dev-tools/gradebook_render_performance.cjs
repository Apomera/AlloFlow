const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const rootPath=path.resolve(__dirname,'..'),baselineRef=process.env.GRADEBOOK_BASELINE_REF||'e883ad2b3fd2466575bc9a1b77c88dff72836a86';
const modules={before:cp.execFileSync('git',['show',baselineRef+':view_submission_inbox_module.js'],{encoding:'utf8',maxBuffer:2e6}),after:fs.readFileSync(path.join(rootPath,'view_submission_inbox_module.js'),'utf8')};
async function main(){
  const server=http.createServer((req,res)=>{const lib=req.url==='/react.js'?'react':req.url==='/react-dom.js'?'react-dom':null;res.setHeader('Content-Type',lib?'application/javascript':'text/html');res.end(lib?fs.readFileSync(path.join(rootPath,'desktop/web-app/node_modules',lib,'umd',lib+'.production.min.js')):'<!doctype html><div id="app"></div><script src="/react.js"></script><script src="/react-dom.js"></script>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const errors=[],scenarios=[];
  try{
    browser=await chromium.launch({headless:true});const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
    for(const count of [60,600]){
      const results={};
      for(const mode of ['before','after']){
        await page.goto('http://127.0.0.1:'+server.address().port);
        await page.evaluate(({code,count})=>{
          localStorage.clear();
          const saved=Object.fromEntries(Array.from({length:count},(_,i)=>['entry'+i,{nickname:'Learner '+String(i%30).padStart(2,'0'),className:'Synthetic class',docTitle:'Document '+i,gradedAt:'2026-09-'+String(i%19+1).padStart(2,'0')+'T12:00:00.000Z',grades:Object.fromEntries(Array.from({length:20},(_,j)=>['q'+j,{score:(i+j)%101,fixtureGrade:true}]))}]));
          localStorage.setItem('alloflow_offline_grades',JSON.stringify(saved));
          window.scoreScans=0;
          const values=Object.values;
          Object.values=function(object){const result=values(object);if(result.length&&result[0]&&result[0].fixtureGrade)scoreScans++;return result;};
          window.AlloModules={};Function(code)();window.Panel=AlloModules.SubmissionInbox.SubmissionInbox;
          window.props={isOpen:true,onClose(){},rosterKey:null,t:(key,fallback)=>fallback||key};window.root=ReactDOM.createRoot(document.getElementById('app'));
          window.render=()=>ReactDOM.flushSync(()=>root.render(React.createElement(Panel,{...props})));
          window.click=selector=>ReactDOM.flushSync(()=>document.querySelector(selector).click());
          window.snapshot=()=>document.querySelector('#submission-inbox-gradebook-panel').textContent;
          render();
        },{code:modules[mode],count});
        const result=await page.evaluate(()=>{
          scoreScans=0;for(let i=0;i<25;i++)render();const closedScans=scoreScans;
          click('[aria-controls="submission-inbox-gradebook-panel"]');
          const submissions=snapshot();scoreScans=0;for(let i=0;i<25;i++)render();const submissionScans=scoreScans;
          const byStudent=[...document.querySelectorAll('button')].find(el=>el.textContent==='By student');ReactDOM.flushSync(()=>byStudent.click());
          const students=snapshot();scoreScans=0;for(let i=0;i<25;i++)render();const studentScans=scoreScans;
          const expand=document.querySelector('#submission-inbox-gradebook-panel tbody [aria-expanded]');
          if(!expand)throw Error('Student expand control missing');ReactDOM.flushSync(()=>expand.click());
          const expanded=snapshot();scoreScans=0;for(let i=0;i<25;i++)render();const expandedScans=scoreScans;
          const beforeLength=Object.keys(JSON.parse(localStorage.getItem('alloflow_offline_grades'))).length;
          const remove=document.querySelector('#submission-inbox-gradebook-panel button[title="Remove from local gradebook"]');
          if(!remove)throw Error('Expanded entry delete button missing');ReactDOM.flushSync(()=>remove.click());
          const afterLength=Object.keys(JSON.parse(localStorage.getItem('alloflow_offline_grades'))).length;
          if(afterLength!==beforeLength-1)throw Error('Gradebook deletion did not persist');
          const afterDelete=snapshot();
          if(afterDelete===expanded)throw Error('Gradebook summary did not refresh after deletion');
          const submissionsButton=[...document.querySelectorAll('button')].find(el=>el.textContent==='Submissions');ReactDOM.flushSync(()=>submissionsButton.click());const afterSwitch=snapshot();
          click('[aria-controls="submission-inbox-gradebook-panel"]');scoreScans=0;for(let i=0;i<25;i++)render();const reclosedScans=scoreScans;
          click('[aria-controls="submission-inbox-gradebook-panel"]');const reopened=snapshot();root.unmount();
          return{closedScans,submissionScans,studentScans,expandedScans,reclosedScans,remainingEntries:afterLength,snapshots:{submissions,students,expanded,afterDelete,afterSwitch,reopened}};
        });
        assert.equal(result.closedScans,0);assert.equal(result.reclosedScans,0);
        assert.equal(result.submissionScans,mode==='before'?count*25:0);
        assert.equal(result.studentScans,mode==='before'?count*25:0);
        assert.equal(result.expandedScans,mode==='before'?(count+count/30)*25:0);
        results[mode]=result;
      }
      assert.deepEqual(results.after.snapshots,results.before.snapshots);
      const {snapshots:beforeSnapshots,...before}=results.before,{snapshots:afterSnapshots,...after}=results.after;
      scenarios.push({entries:count,responsesPerEntry:20,rendersPerState:25,before,after,displayParity:true,deleteRefresh:true,groupSwitchAndReopen:true});
    }
    assert.deepEqual(errors,[]);const report={baselineRef,scope:'Actual generated Inbox with production React and synthetic local grades; counts Object.values scans of response-score collections. Checks closed, submission, student, expanded, delete, grouping and reopen states. No network provider or user data.',scenarios,errors};
    fs.mkdirSync(path.join(rootPath,'reports/gradebook-render-performance'),{recursive:true});fs.writeFileSync(path.join(rootPath,'reports/gradebook-render-performance/browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
