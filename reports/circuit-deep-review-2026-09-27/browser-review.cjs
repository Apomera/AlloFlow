const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../..');
const out = __dirname;
(async()=>{
  const browser=await chromium.launch({headless:true});
  const results={errors:[],scenarios:[]};
  try {
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>results.errors.push(e.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit audit</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','stem_lab/stem_tool_circuit.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){
        const [data,setData]=React.useState({_circuit:{pauseMotion:true}}),[locale,setLocale]=React.useState('en');
        window.state=data;window.setState=setData;window.setLocale=setLocale;
        return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:setData,t:(k,f)=>locale==='en'?(f||k):'ES:'+(f||k),gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:f=>({onClick:f}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});
      }
      window.auditRoot=ReactDOM.createRoot(document.querySelector('#root'));auditRoot.render(React.createElement(Host));
    });
    await page.getByRole('heading',{name:'Small circuits. Big discoveries.'}).waitFor();
    results.initialButtons=await page.getByRole('button').allTextContents();
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    for(const workspace of ['Simple circuits','Mixed circuits','Active electronics','Connected circuits']){
      await page.getByRole('button',{name:workspace,exact:true}).click();
      const entry={workspace,layouts:[]};
      entry.headings=await page.getByRole('heading').allTextContents();
      entry.axe=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('#root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
      for(const width of [1280,390,320]){
        await page.setViewportSize({width,height:1000});
        entry.layouts.push(await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('#root *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)&&getComputedStyle(e).position!=='absolute';}).slice(0,6).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,100)}))})));
      }
      await page.screenshot({path:path.join(out,workspace.toLowerCase().replaceAll(' ','-')+'-320.png'),fullPage:false});
      results.scenarios.push(entry);
      await page.setViewportSize({width:1280,height:1000});
    }
    await page.getByRole('button',{name:'Simple circuits',exact:true}).click();
    results.localeBefore=await page.getByRole('button').allTextContents();
    await page.evaluate(()=>window.setLocale('es'));
    await page.waitForFunction(()=>document.body.textContent.includes('ES:'));
    results.localeAfter=await page.getByRole('button').allTextContents();
    results.finalState=await page.evaluate(()=>state);
    await page.evaluate(()=>auditRoot.unmount());
  } finally {
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));
    await browser.close();
  }
  console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
