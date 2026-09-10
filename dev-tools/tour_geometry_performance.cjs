const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..');
function extract(source){
  const section=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);if(start<0||end<0)throw Error('Missing tour section');return source.slice(start,end);};
  const metrics=section('  const _findTourStepIndex =','  const ensureToolVisible =');
  const effect=source.includes('// TOUR_GEOMETRY_TRACKING_START')
    ?section('  // TOUR_GEOMETRY_TRACKING_START','  // TOUR_GEOMETRY_TRACKING_END')
    :section('  useEffect(() => {\n      updateTourMetrics();','  }, [updateTourMetrics]);')+'  }, [updateTourMetrics]);';
  return {metrics,effect};
}
async function run(){
  const before=JSON.parse(fs.readFileSync(path.join(root,'reports/tour-performance/baseline.json'),'utf8'));
  const after=extract(fs.readFileSync(path.join(root,'AlloFlowANTI.txt'),'utf8').replace(/\r\n/g,'\n'));
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1000,height:700}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setContent('<div id="scroller" style="height:300px;overflow:auto"><div style="height:1200px;padding-top:100px"><button id="target">Tour target</button></div></div>');
    const result=await page.evaluate(async codes=>{
      const results={};
      for(const mode of ['before','after']){
        const counts={entries:0,scrolls:0,measurements:0,rectChanges:0,botChanges:0,botMoves:0};let rect=null,bot=null;
        const target=document.getElementById('target'),scroller=document.getElementById('scroller');
        scroller.scrollTop=0;await new Promise(resolve=>requestAnimationFrame(resolve));
        const getRect=target.getBoundingClientRect.bind(target);
        // Keep auto-scroll from generating another scroll event; the probe counts
        // requested scrolling, while captured nested-scroll tracking uses real DOM.
        target.scrollIntoView=()=>counts.scrolls++;
        target.getBoundingClientRect=()=>{counts.measurements++;return getRect();};
        const ctx={runTour:true,spotlightMessage:null,tourSteps:[{id:'target',onEnter:()=>counts.entries++}],tourStep:0,customTourSteps:null,
          _tourRunContextRef:{current:{}},_tourTravelDirectionRef:{current:1},_resolveTourEl:()=>target,DOM_TO_TOOL_ID_MAP:{},
          alloBotRef:{current:{moveTo:()=>counts.botMoves++}},setTourStep:()=>{},setRunTour:()=>{},setCustomTourSteps:()=>{},
          setTourRect:next=>{const value=typeof next==='function'?next(rect):next;if(value!==rect)counts.rectChanges++;rect=value;},
          setBotSpotlightPos:next=>{const value=typeof next==='function'?next(bot):next;if(value!==bot)counts.botChanges++;bot=value;}};
        const {metrics,effect}=codes[mode];
        const api=Function('ctx',`const {${Object.keys(ctx).join(',')}}=ctx;const useCallback=fn=>fn;let dispose;const useEffect=fn=>{dispose=fn();};${metrics}\n${effect}\nreturn {dispose};`)(ctx);
        const settle=()=>new Promise(resolve=>setTimeout(resolve,750));
        await settle();const entry={...counts};Object.keys(counts).forEach(key=>counts[key]=0);
        target.style.transform='translateX(25px)';
        for(let i=0;i<100;i++){scroller.dispatchEvent(new Event('scroll'));window.dispatchEvent(new Event('resize'));}
        await settle();const burst={...counts}, measuredRect={...rect};Object.keys(counts).forEach(key=>counts[key]=0);
        for(let i=0;i<100;i++){scroller.dispatchEvent(new Event('scroll'));window.dispatchEvent(new Event('resize'));}
        await settle();const unchanged={...counts};Object.keys(counts).forEach(key=>counts[key]=0);
        window.dispatchEvent(new Event('resize'));api.dispose?.();await settle();const afterCleanup={...counts};
        results[mode]={entry,eventsPerBurst:200,burst,measuredRect,unchanged,afterCleanup};
        target.style.transform='';target.getBoundingClientRect=getRect;
      }
      return results;
    },{before,after});
    if(errors.length||JSON.stringify(result.before.measuredRect)!==JSON.stringify(result.after.measuredRect))throw Error('Geometry mismatch or page error');
    if(result.after.burst.measurements!==1||result.after.burst.entries!==0||result.after.burst.scrolls!==0||result.after.unchanged.rectChanges!==0||result.after.afterCleanup.measurements!==0)throw Error('Scheduling regression');
    const report={scope:'Actual shell callbacks and effect in Chromium with native events, animation frames and DOM geometry. State setters are instrumented; programmatic scroll requests are counted without initiating smooth scrolling. This is not a whole-app timing benchmark.',...result,geometryParity:true,errors};
    fs.writeFileSync(path.join(root,'reports/tour-performance/browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
