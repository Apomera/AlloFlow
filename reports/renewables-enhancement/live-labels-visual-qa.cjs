
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/renewables-enhancement');fs.mkdirSync(out,{recursive:true});
const files={'/react.js':'desktop/web-app/node_modules/react/umd/react.development.js','/react-dom.js':'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','/three.js':'vendor/three-r128/three.min.js','/tool.js':'stem_lab/stem_tool_renewables.js','/axe.js':'node_modules/axe-core/axe.min.js'};
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Renewables Lab review</title><style>body{margin:0;font-family:system-ui;background:#f0fdf4}*{box-sizing:border-box}main{max-width:1320px;margin:auto}button,input,select{font:inherit}</style></head><body><main id="root"></main><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/three.js"></script><script src="/tool.js"></script><script>window.state={};window.dark=false;function Host(){const[data,setData]=React.useState({renewablesLab:{view:"energy3d"}});const[theme,setTheme]=React.useState(false);window.setTheme=setTheme;window.state=data;window.setState=setData;return StemLab._registry.renewablesLab.render({React,toolData:data,isDark:theme,t:(k,f)=>f||k,update:(id,k,v)=>setData(p=>({...p,[id]:{...p[id],[k]:v}})),updateMulti:(id,o)=>setData(p=>({...p,[id]:{...p[id],...o}})),addToast:()=>{}})}window.root=ReactDOM.createRoot(document.getElementById("root"));root.render(React.createElement(Host));</script></body></html>';
const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);}else if(files[req.url]){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,files[req.url])));}else{res.statusCode=404;res.end();}});





(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const checks={technologies:[],scenarios:[],audits:{},annotationFrames:0},errors=[],consoleErrors=[];let page;
  try{
    page=await browser.newPage({viewport:{width:1280,height:1050},reducedMotion:'reduce'});page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    await page.route('**/tool.js',route=>route.fulfill({contentType:'text/javascript',body:
      'window.inspectionRenderers={created:0,disposed:0};const InspectionRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new InspectionRenderer(options),render=renderer.render,dispose=renderer.dispose;inspectionRenderers.created++;renderer.render=function(scene,camera){window.inspectionFrame={scene,camera};return render.call(renderer,scene,camera);};renderer.dispose=function(){inspectionRenderers.disposed++;return dispose.call(renderer);};return renderer;};\n'+fs.readFileSync(path.join(root,files['/tool.js']),'utf8')}));
    await page.addInitScript(()=>{
      window.annotationText=new WeakMap();const fill=CanvasRenderingContext2D.prototype.fillText,clear=CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){const list=annotationText.get(this.canvas)||[];list.push(String(text));annotationText.set(this.canvas,list);return fill.call(this,text,...args);};
      CanvasRenderingContext2D.prototype.clearRect=function(...args){annotationText.set(this.canvas,[]);return clear.apply(this,args);};
    });
    await page.goto('http://127.0.0.1:'+server.address().port);const canvas=()=>page.locator('.rn-energy-webgl');
    const paint=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const ready=async()=>{await page.locator('[data-energy-render-status="ready"]').waitFor();await canvas().scrollIntoViewIfNeeded();await paint();};await ready();await page.addScriptTag({url:'/axe.js'});
    const click=async name=>{await page.getByRole('button',{name,exact:true}).focus();await page.keyboard.press('Enter');await ready();};
    const invoke=async name=>{await page.getByRole('button',{name,exact:true}).focus();await page.keyboard.press('Enter');await paint();};
    const audit=async label=>{await paint();checks.audits[label]=await page.evaluate(async()=>{const r=await axe.run('.rn-energy-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});assert.deepEqual(checks.audits[label],[],label);};
    const geometry=()=>page.evaluate(()=>{const {scene,camera}=inspectionFrame;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const box=new THREE.Box3(),labels=[];const isolated=document.querySelector('.rn-energy-webgl').dataset.inspectionIsolated;
      for(const key of ['resource','converter','generator']){const group=scene.getObjectByName('energy-'+key);if(group.visible&&(isolated==='none'||key===isolated))box.union(new THREE.Box3().setFromObject(group));const label=scene.getObjectByName('energy-label-'+key);if(label.visible){const point=label.position.clone().project(camera);labels.push({key,x:point.x,y:point.y,w:label.scale.x*camera.zoom/(camera.right-camera.left),h:label.scale.y*camera.zoom/(camera.top-camera.bottom)});}}
      const outside=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);if(Math.abs(p.x)>1.001||Math.abs(p.y)>1.001||Math.abs(p.z)>1.001)outside.push(p.toArray());}
      return {outside,labels,direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),zoom:camera.zoom,renderers:{...inspectionRenderers},leaders:scene.children.filter(o=>o.name.startsWith('energy-label-leader-')&&o.visible).length};
    });
    const assertLabels=frame=>{for(const label of frame.labels){assert.ok(Math.abs(label.x)+label.w<=1.001,JSON.stringify(label));assert.ok(Math.abs(label.y)+label.h<=1.001,JSON.stringify(label));}for(let i=0;i<frame.labels.length;i++)for(let j=i+1;j<frame.labels.length;j++){const a=frame.labels[i],b=frame.labels[j];assert.ok(Math.abs(a.x-b.x)>=a.w+b.w-.001||Math.abs(a.y-b.y)>=a.h+b.h-.001,'Labels overlap: '+JSON.stringify([a,b]));}};
    const views=[['Isometric view','isometric',[-1/Math.sqrt(3),-1/Math.sqrt(3),-1/Math.sqrt(3)]],['Front view','front',[0,0,-1]],['Side view','side',[-1,0,0]],['Top view','top',[0,-1,0]]];
    const assertView=async (name,id,expected,framed=true)=>{const frame=await geometry();if(frame.leaders>0)checks.annotationFrames++;assert.equal(await canvas().getAttribute('data-camera-view'),id);assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');for(let i=0;i<3;i++)assert.ok(Math.abs(frame.direction[i]-expected[i])<1e-6,'Unexpected camera direction');if(framed)assert.deepEqual(frame.outside,[],'Mechanism must fit');assertLabels(frame);assert.equal(frame.renderers.created-frame.renderers.disposed,1);return frame;};


    await page.locator('.rn-energy-stage').screenshot({path:path.join(out,'live-labels-preview.jpg'),type:'jpeg',quality:80});
    await page.setViewportSize({width:320,height:844});await ready();await page.locator('.rn-energy-stage').screenshot({path:path.join(out,'live-labels-preview-phone.jpg'),type:'jpeg',quality:80});
    assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);console.log('Saved desktop and 320px live-label previews.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
