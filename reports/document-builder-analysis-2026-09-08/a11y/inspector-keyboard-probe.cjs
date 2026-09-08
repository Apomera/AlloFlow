const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{parse}=require('@babel/parser');
const root=process.cwd(),out=path.join(root,'reports/document-builder-analysis-2026-09-08/a11y');
fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'view_export_preview_source.jsx'),'utf8');
const component=parse(source,{sourceType:'script',plugins:['jsx']}).program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='ExportPreviewView');
const names=component.body.body[0].declarations[0].id.properties.map(p=>p.key.name);
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://builder-a11y.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Builder keyboard probe</title></head><body><button id="opener">Open Builder</button><div id="root"></div><button id="after">After Builder</button></body></html>'}));
  await page.goto('http://builder-a11y.test/');
  const css=fs.readdirSync(path.join(root,'app/static/css')).find(name=>/^main\..*\.css$/.test(name));
  await page.addStyleTag({path:path.join(root,'app/static/css',css)});
  for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','view_export_preview_module.js','export_handlers_module.js']) await page.addScriptTag({path:path.join(root,file)});
  await page.evaluate(names=>{
   const noop=()=>{},props=Object.fromEntries(names.map(name=>[name,/^(set|handle|apply|delete|save|run|toggle|update|process|propose|generate|audit|open|on|_ensure)/.test(name)?noop:undefined]));
   const html='<!doctype html><html lang="en"><head><title>Lesson plan</title></head><body><main><h1>Lesson plan</h1><p>Read the instructions and complete the exercise.</p><h2>First exercise</h2><p>Explain your answer.</p><h2>Resources</h2><p><a href="#resource">Read resource</a></p><button id="embedded" aria-label="Run lesson action">Embedded action</button><p id="resource">Reference material.</p></main></body></html>';
   const translations={'a11y.close_doc_builder':'Close Document Builder','a11y.toggle_theme':'Toggle color theme'};
   Object.assign(props,{BUILT_IN_PRESETS:[],FONT_OPTIONS:[{value:'Arial',label:'Arial'}],STYLE_SEEDS:{},customExportCSS:'',exportStylePrompt:'',expertCommandInput:'',exportPresets:[],history:[],agentActivityLog:[],exportConfig:{title:'Lesson plan'},exportPreviewMode:'print',exportTheme:'clean',selectedFont:'Arial',exportPreviewSource:'history',theme:'light',showExportPreview:true,pptxLoaded:true,t:key=>translations[key]||'',getSkippedResources:()=>[],getExportPreviewHTML:()=>html,exportPreviewRef:{current:null},setShowExportPreview:value=>{if(value===false)window.closeRequests=(window.closeRequests||0)+1;},executeExportFromPreview:async()=>false,addToast:(...args)=>{window.toasts=(window.toasts||[]).concat([args]);}});
   props.updateExportPreview=()=>window.AlloModules.ExportPreviewHelpers.updateExportPreview({exportPreviewRef:props.exportPreviewRef,_exportPreviewErrorRef:{current:null},_builderRecoverySaveTimerRef:{current:null},getExportPreviewHTML:()=>html,t:props.t,addToast:props.addToast,warnLog:console.warn,setCanvasRecoveryRevision:noop,isCanvas:false,a11yInspectMode:false});
   window.builderProps=props;document.getElementById('opener').focus();
   ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(window.AlloModules.ExportPreviewView,props));
  },names);
  await page.locator('#document-builder-title').waitFor();
  await page.evaluate(()=>window.builderProps.updateExportPreview());
  await page.waitForFunction(()=>window.builderProps.exportPreviewRef.current?.contentDocument?.designMode==='on');
  const result={browser:browser.version(),css,errors};
  result.tabs=await page.getByRole('tab').evaluateAll(nodes=>nodes.map(n=>({name:n.textContent.trim(),tabIndex:n.tabIndex,selected:n.getAttribute('aria-selected')})));
  if(result.tabs.length){
   const first=page.getByRole('tab').first();await first.focus();await page.keyboard.press('ArrowRight');
   result.tabArrow=await page.evaluate(()=>({activeName:document.activeElement?.textContent.trim(),activeRole:document.activeElement?.getAttribute('role'),selected:[...document.querySelectorAll('[role="tab"][aria-selected="true"]')].map(e=>e.textContent.trim())}));
  }
  const customize=page.getByLabel('Customize Quick Access toolbar',{exact:true});
  await customize.focus();await page.keyboard.press('Enter');
  await page.locator('#builder-quick-access-customize input[type="checkbox"]').first().focus();
  result.customizeBefore=await page.evaluate(()=>({open:document.getElementById('builder-quick-access-customize').open,closeRequests:window.closeRequests||0,active:document.activeElement?.outerHTML}));
  await page.keyboard.press('Escape');
  result.customizeAfter=await page.evaluate(()=>({open:document.getElementById('builder-quick-access-customize').open,closeRequests:window.closeRequests||0,active:document.activeElement?.outerHTML}));
  await page.locator('#builder-quick-access-customize').evaluate(el=>el.open=false);
  result.toolbarCounts=await page.getByRole('toolbar').evaluateAll(nodes=>nodes.map(n=>({name:n.getAttribute('aria-label'),tabStops:[...n.querySelectorAll('button,input,select,textarea,summary,[tabindex]')].filter(e=>e.tabIndex>=0&&!e.matches(':disabled')&&e.getClientRects().length).length})));
  await page.evaluate(()=>{const frame=window.builderProps.exportPreviewRef.current;frame.contentWindow.focus();frame.contentDocument.body.focus();});
  result.editorBefore=await page.evaluate(()=>({outer:document.activeElement?.tagName,inner:window.builderProps.exportPreviewRef.current.contentDocument.activeElement?.tagName,innerFocusable:[...window.builderProps.exportPreviewRef.current.contentDocument.querySelectorAll('a[href],button')].map(n=>n.textContent)}));
  await page.keyboard.press('Tab');
  result.editorAfter=await page.evaluate(()=>({outer:document.activeElement?.outerHTML,inner:window.builderProps.exportPreviewRef.current.contentDocument.activeElement?.tagName}));
  await page.evaluate(()=>window.AlloModules.ExportHandlers.applyA11yInspector({exportPreviewRef:window.builderProps.exportPreviewRef,enabled:true}));
  await page.evaluate(()=>{const frame=window.builderProps.exportPreviewRef.current;frame.contentWindow.focus();frame.contentDocument.body.focus();});
  result.inspectorBefore=await page.evaluate(()=>({inner:window.builderProps.exportPreviewRef.current.contentDocument.activeElement?.tagName,badges:window.builderProps.exportPreviewRef.current.contentDocument.querySelectorAll('.a11y-inspect-badge').length}));
  await page.keyboard.press('Tab');
  result.inspectorAfter=await page.evaluate(()=>({outer:document.activeElement?.outerHTML,inner:window.builderProps.exportPreviewRef.current.contentDocument.activeElement?.outerHTML}));
  const badge = page.frameLocator('#document-builder-preview').getByRole('button', {name:'Edit aria-label: Run lesson action',exact:true});
  result.editableInspectorBadge={count:await badge.count(),tabIndex:await badge.getAttribute('tabindex')};
  await page.getByRole('button',{name:'Skip to editable preview',exact:true}).focus();
  await page.keyboard.press('Enter');
  result.skipEntry=await page.evaluate(()=>({outer:document.activeElement?.tagName,inner:window.builderProps.exportPreviewRef.current.contentDocument.activeElement?.tagName}));
  await page.keyboard.press('Tab');
  result.skipThenTab=await page.evaluate(()=>({outer:document.activeElement?.outerHTML,inner:window.builderProps.exportPreviewRef.current.contentDocument.activeElement?.tagName}));
  await badge.focus();
  await page.keyboard.press('Enter');
  result.scriptedBadgeActivation={dialogs:await page.frameLocator('#document-builder-preview').getByRole('dialog').count(),inputValue:await page.frameLocator('#document-builder-preview').locator('#a11y-inspect-editor-value').inputValue()};
  await page.screenshot({path:path.join(out,'inspector-keyboard-desktop.png')});
  fs.writeFileSync(path.join(out,'inspector-keyboard-results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
