const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('@playwright/test');
const {extract,fixtureCode}=require('./recovery_fingerprint_fixture.cjs');
const rootPath=path.resolve(__dirname,'..');
const blocks=extract(fs.readFileSync(path.join(rootPath,'AlloFlowANTI.txt'),'utf8'));
const priorInit='  const canvasRecoverySelFingerprintRef = useRef(_alloCanvasSelAuthoringFingerprint());';
const codes={before:fixtureCode({...blocks,init:priorInit}),after:fixtureCode(blocks)};
async function run(){
  const server=http.createServer((req,res)=>{
    const lib=req.url==='/react.js'?'react':req.url==='/react-dom.js'?'react-dom':null;
    res.setHeader('Content-Type',lib?'application/javascript':'text/html');
    res.end(lib?fs.readFileSync(path.join(rootPath,'desktop/web-app/node_modules',lib,'umd',lib+'.production.min.js')):'<!doctype html><div id="before"></div><div id="after"></div><script src="/react.js"></script><script src="/react-dom.js"></script>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({headless:true});const page=await browser.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    const result=await page.evaluate(codes=>{
      window.__alloflowSelStations=Array.from({length:30},(_,i)=>({id:'station-'+i,title:'Synthetic station '+i,instructions:'Practice '.repeat(128)}));
      window.__alloflowSelToolData={journal:{entries:Array.from({length:100},(_,i)=>({id:i,text:'Synthetic reflection. '.repeat(96)}))}};
      window.__alloflowSelSnapshots=Array.from({length:100},(_,i)=>({id:'snapshot-'+i,data:'Synthetic snapshot. '.repeat(128)}));
      const stateBytes=new TextEncoder().encode(JSON.stringify({stations:__alloflowSelStations,toolData:__alloflowSelToolData,snapshots:__alloflowSelSnapshots})).length;
      const results=[];
      for(const active of [false,true]){
        const fixtures={};
        for(const mode of ['before','after']){
          let calls=0,nextTimer=0;const timers=new Map();
          const Fixture=Function('React','onFingerprint','setInterval','clearInterval',codes[mode])(React,()=>calls++,fn=>{timers.set(++nextTimer,fn);return nextTimer;},id=>timers.delete(id));
          const host=document.getElementById(mode),root=ReactDOM.createRoot(host);
          const props={isCanvas:active,canvasRecoveryDecisionMade:true};
          ReactDOM.flushSync(()=>root.render(React.createElement(Fixture,props)));
          fixtures[mode]={Fixture,host,root,props,timers,calls:()=>calls,reset:()=>{calls=0;},mountCalls:calls};
        }
        const runs=[];
        for(const mode of ['before','after','before','after','after','before','before','after']){
          const f=fixtures[mode];f.reset();const start=performance.now();
          for(let tick=0;tick<100;tick++)ReactDOM.flushSync(()=>f.root.render(React.createElement(f.Fixture,{...f.props,tick})));
          runs.push({mode,hundredUpdatesMs:performance.now()-start,fingerprintCalls:f.calls()});
        }
        const behavior={};
        for(const mode of ['before','after'])fixtures[mode].reset();
        window.__alloflowSelStations[0].title+=' changed';
        ReactDOM.flushSync(()=>window.dispatchEvent(new Event('alloflow-sel-stations-changed')));
        for(const mode of ['before','after']){
          const f=fixtures[mode];behavior[mode]={mountCalls:f.mountCalls,eventRevision:Number(f.host.firstChild.dataset.revision),eventCalls:f.calls()};f.reset();
        }
        window.__alloflowSelToolData.journal.pollOnly=true;
        ReactDOM.flushSync(()=>{for(const mode of ['before','after'])for(const poll of fixtures[mode].timers.values())poll();});
        for(const mode of ['before','after']){
          const f=fixtures[mode];behavior[mode].pollRevision=Number(f.host.firstChild.dataset.revision);behavior[mode].pollCalls=f.calls();f.root.unmount();behavior[mode].timersAfterUnmount=f.timers.size;
        }
        delete window.__alloflowSelToolData.journal.pollOnly;
        const measured=runs.slice(2),medians=Object.fromEntries(['before','after'].map(mode=>[mode,measured.filter(r=>r.mode===mode).map(r=>r.hundredUpdatesMs).sort((a,b)=>a-b)[1]]));
        results.push({recoveryActive:active,warmup:runs.slice(0,2),measured,medians,behavior});
      }
      return {stateBytes,updatesPerRun:100,results};
    },codes);
    for(const scenario of result.results){
      if(scenario.measured.some(r=>r.fingerprintCalls!==(r.mode==='before'?100:0)))throw Error('Unexpected render fingerprint work');
      for(const b of Object.values(scenario.behavior))if(b.eventRevision!==(scenario.recoveryActive?1:0)||b.pollRevision!==(scenario.recoveryActive?2:0)||b.timersAfterUnmount!==0)throw Error('Recovery behavior mismatch');
    }
    if(errors.length)throw Error(errors.join('\n'));
    const report={scope:'Actual recovery helpers/ref/observer in a minimal production React component; 4x CPU; synthetic SEL state; one warmup and three paired samples per version. Poll callbacks are invoked explicitly instead of depending on wall-clock timing. Not a whole-app benchmark.',beforeInitializer:priorInit,afterInitializer:blocks.init,...result,errors};
    fs.mkdirSync(path.join(rootPath,'reports/recovery-fingerprint-performance'),{recursive:true});
    fs.writeFileSync(path.join(rootPath,'reports/recovery-fingerprint-performance/browser.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({stateBytes:result.stateBytes,results:result.results.map(({recoveryActive,medians,behavior})=>({recoveryActive,medians,behavior}))},null,2));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
