const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const source=fs.readFileSync('stem_lab/stem_tool_circuit.js','utf8');
const bypass='var reduced=circuitNetworkLinearOpAmps(matrix,rhs,parts,index,constraints,nodeCount,amps,profiles,dynamic&&dynamic.opampCache);if(reduced)return reduced;';
if(!source.includes(bypass))throw new Error('Cannot construct the exhaustive reference.');
async function main(){
  let browser;
  const hardLimit=setTimeout(()=>process.exit(1),60000);
  try{
    browser=await chromium.launch({headless:true,timeout:20000});
    const page=await browser.newPage();
    await page.addScriptTag({path:path.resolve('stem_lab/stem_tool_circuit.js')});
    await page.evaluate(referenceSource=>{
      const isolated={};
      new Function('window','document','console',referenceSource)(isolated,document,{log(){}});
      window.referenceCircuitModel=isolated.StemLab;
    },source.replace(bypass,'').replace('var fine=algebraicLinear?full:','var fine='));
    const measurements=[];
    for(const count of [1,4])for(const mode of ['exhaustive-reference','optimized']){
      const result=await page.evaluate(({count,mode})=>{
        const components=[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'sine',amplitude:1,frequency:10}}];
        for(let i=0;i<count;i++){const node='BCDE'[i];components.push({id:i+2,type:'opamp',a:node,b:'0',value:100000,control:{positive:'A',negative:node}});}
        const model=mode==='optimized'?window.StemLab:window.referenceCircuitModel,start=performance.now();
        const run=model.circuitNetworkTransient({duration:.3,components});
        return {mode,count,ms:performance.now()-start,ok:run.ok,steps:run.steps,frames:run.frames.length,regionsPerSolve:run.frames[0].opampRegionsTried};
      },{count,mode});
      measurements.push(result);console.log(JSON.stringify(result));
    }
    const report={date:new Date().toISOString(),engine:'Chromium',version:browser.version(),sourceSha256:createHash('sha256').update(source).digest('hex'),
      method:'Both versions use the current source in one blank Chromium page. The exhaustive reference bypasses reduction and restores the duplicate end-time solve. Each measurement is synchronous browser main-thread model execution. Other development/test activity may affect absolute timings.',measurements};
    fs.writeFileSync(path.join(__dirname,'solver-benchmark.json'),JSON.stringify(report,null,2)+'\n');
  }finally{if(browser)await browser.close();clearTimeout(hardLimit);}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
