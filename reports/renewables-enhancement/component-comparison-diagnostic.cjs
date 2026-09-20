
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/renewables-enhancement');fs.mkdirSync(out,{recursive:true});
const files={'/react.js':'desktop/web-app/node_modules/react/umd/react.development.js','/react-dom.js':'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','/three.js':'vendor/three-r128/three.min.js','/tool.js':'stem_lab/stem_tool_renewables.js','/axe.js':'node_modules/axe-core/axe.min.js'};
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Renewables Lab review</title><style>body{margin:0;font-family:system-ui;background:#f0fdf4}*{box-sizing:border-box}main{max-width:1320px;margin:auto}button,input,select{font:inherit}</style></head><body><main id="root"></main><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/three.js"></script><script src="/tool.js"></script><script>window.state={};window.dark=false;function Host(){const[data,setData]=React.useState({renewablesLab:{view:"energy3d"}});const[theme,setTheme]=React.useState(false);window.setTheme=setTheme;window.state=data;window.setState=setData;return StemLab._registry.renewablesLab.render({React,toolData:data,isDark:theme,t:(k,f)=>f||k,update:(id,k,v)=>setData(p=>({...p,[id]:{...p[id],[k]:v}})),updateMulti:(id,o)=>setData(p=>({...p,[id]:{...p[id],...o}})),addToast:()=>{}})}window.root=ReactDOM.createRoot(document.getElementById("root"));root.render(React.createElement(Host));</script></body></html>';
const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);}else if(files[req.url]){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,files[req.url])));}else{res.statusCode=404;res.end();}});







(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const checks={},errors=[],consoleErrors=[],questions=new Set();let page;
 try{
  page=await browser.newPage({viewport:{width:1280,height:1100},reducedMotion:'reduce'});page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    // Capture the real rendered scene and camera for geometric assertions; production has no testing API.
    await page.route('**/tool.js',route=>route.fulfill({contentType:'text/javascript',body:
      'window.inspectionRenderers={created:0,disposed:0};const InspectionRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new InspectionRenderer(options),render=renderer.render,dispose=renderer.dispose;inspectionRenderers.created++;renderer.render=function(scene,camera){window.inspectionFrame={scene,camera};return render.call(renderer,scene,camera);};renderer.dispose=function(){inspectionRenderers.disposed++;return dispose.call(renderer);};return renderer;};\n'+fs.readFileSync(path.join(root,files['/tool.js']),'utf8')}));
    await page.goto('http://127.0.0.1:'+server.address().port);const canvas=()=>page.locator('.rn-energy-webgl');
    const paint=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const ready=async()=>{await page.locator('[data-energy-render-status="ready"]').waitFor();await canvas().scrollIntoViewIfNeeded();await paint();};await ready();await page.addScriptTag({url:'/axe.js'});
    const click=async name=>{await page.getByRole('button',{name,exact:true}).focus();await page.keyboard.press('Enter');await ready();};
    const audit=async label=>{await paint();checks[label]=await page.evaluate(async()=>{const r=await axe.run('.rn-energy-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});assert.deepEqual(checks[label],[],label);};
    const snapshot=()=>page.evaluate(()=>{const {scene,camera}=inspectionFrame;return{groups:Object.fromEntries(['resource','converter','generator'].map(k=>{const g=scene.getObjectByName('energy-'+k),label=scene.getObjectByName('energy-label-'+k);return[k,{position:g.position.toArray(),visible:g.visible,labelPosition:label.position.toArray(),labelVisible:label.visible}];})),context:scene.getObjectByName('energy-context').visible,camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),zoom:camera.zoom},renderers:{...inspectionRenderers}};});
    const assertFramed=async key=>{const clipped=await page.evaluate(key=>{const {scene,camera}=inspectionFrame;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const box=new THREE.Box3();for(const k of ['resource','converter','generator'])if(!key||k===key)box.union(new THREE.Box3().setFromObject(scene.getObjectByName('energy-'+k)));const out=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);if(Math.abs(p.x)>1.001||Math.abs(p.y)>1.001||Math.abs(p.z)>1.001)out.push(p.toArray());}return out;},key);assert.deepEqual(clipped,[],'Selected assemblies fit the camera');};




 await page.setViewportSize({width:320,height:844});await page.evaluate(()=>setState({renewablesLab:{view:'energy3d',energyLab:{selected:'solarPv',settings:{solarPv:{area:40}},readings:{solarPv:[{settings:{area:20},name:'VeryLongBaselineName'.repeat(20)}]}}}}));await paint();
 const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('.rn-energy-lab *')].map(e=>({tag:e.tagName,cls:e.className,width:e.clientWidth,scroll:e.scrollWidth,right:e.getBoundingClientRect().right,text:e.children.length?'':e.textContent.slice(0,80)})).filter(e=>e.right>innerWidth+1||e.scroll>e.width+1)}));fs.writeFileSync(path.join(out,'component-comparison-overflow-diagnostic.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
