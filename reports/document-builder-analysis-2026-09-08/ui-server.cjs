// Read-only UI audit host: real compiled component, synthetic teaching document,
// controlled host props. Does not call providers, export files, or persist app data.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { parse } = require('@babel/parser');
const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'view_export_preview_source.jsx'), 'utf8');
const component = parse(source, {sourceType:'script',plugins:['jsx']}).program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='ExportPreviewView');
const names = component.body.body[0].declarations[0].id.properties.map(p=>p.key.name);
const css = fs.readdirSync(path.join(root,'app/static/css')).find(n=>/^main\..*\.css$/.test(n));
const assets = {
  '/react.js':'desktop/web-app/node_modules/react/umd/react.development.js',
  '/react-dom.js':'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',
  '/builder.js':'view_export_preview_module.js',
  '/app.css':'app/static/css/'+css,
};
const html = `<!doctype html><html lang="en"><head><title>Document Builder — isolated UI audit</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/builder.js"></script><script>
const names=${JSON.stringify(names)};
window.auditEvents=[];
const noop=()=>{};
const fixtureHtml='<!doctype html><html lang="en"><head><title>Ecosystems: evidence and explanation</title></head><body><h1>Ecosystems: evidence and explanation</h1><p>Grade 7 science · Student handout · 40 minutes</p><h2>Learning goals</h2><p>Explain how changes to one population affect a food web. Use observations to support your explanation.</p><h2>Read and discuss</h2><p>A pond supports algae, snails, insects, frogs, and herons. During a dry summer the water level falls. Look for connections between shelter, food, and population size.</p><h2>Key vocabulary</h2><table><caption>Vocabulary for the investigation</caption><thead><tr><th scope="col">Term</th><th scope="col">Meaning</th></tr></thead><tbody><tr><td>Producer</td><td>An organism that makes its own food.</td></tr><tr><td>Habitat</td><td>The place where an organism lives.</td></tr></tbody></table><h2>Check your understanding</h2><p>What might happen to herons if the frog population decreases? Give one piece of evidence.</p><h2>Reflect</h2><p>Write a question you would investigate next.</p></body></html>';
function Host(){
 const [mode,setMode]=React.useState('print');
 const [theme,setTheme]=React.useState('clean');
 const [workspace,setWorkspace]=React.useState('author');
 const [config,setConfig]=React.useState({title:'Ecosystems: evidence and explanation',includeSimplified:true,includeGlossary:true,includeQuiz:true,includeStudentResponses:true,includeTeacherKey:false,separateTeacherStudentFiles:true,fontSize:16,pageMargin:'1in'});
 const ref=React.useRef(null);
 const source=new URLSearchParams(location.search).get('source')||'history';
 const props=Object.fromEntries(names.map(name=>[name,/^(set|handle|apply|delete|save|run|toggle|update|process|propose|generate|audit|open|on|_ensure)/.test(name)?noop:undefined]));
 const history=[{id:'science-reading',type:'simplified',content:'Pond ecosystem reading'},{id:'science-glossary',type:'glossary',content:'Vocabulary'},{id:'science-quiz',type:'quiz',content:'Two questions'}];
 Object.assign(props,{BUILT_IN_PRESETS:[{id:'fullPack',name:'Full Pack'},{id:'studentWorksheet',name:'Student Worksheet'},{id:'quizOnly',name:'Quiz Only'}],FONT_OPTIONS:[{value:'Arial',label:'Arial'}],STYLE_SEEDS:{clean:{name:'Clean'},colorful:{name:'Colorful'},minimal:{name:'Minimal'}},customExportCSS:'',exportStylePrompt:'',expertCommandInput:'',exportPresets:[],history,agentActivityLog:[],exportConfig:config,exportPreviewMode:mode,exportTheme:theme,selectedFont:'Arial',exportPreviewSource:source,builderWorkspaceMode:workspace,theme:'light',showExportPreview:true,pptxLoaded:true,t:key=>key==='a11y.close_doc_builder'?'Close document builder':'',getSkippedResources:()=>[],getExportPreviewHTML:()=>fixtureHtml,exportPreviewRef:ref,setShowExportPreview:()=>window.auditEvents.push('close'),executeExportFromPreview:()=>{window.auditEvents.push('export requested (stubbed)');return Promise.resolve(false);},addToast:(...args)=>window.auditEvents.push(args),setExportConfigAndRefresh:setConfig,setExportPreviewMode:setMode,setExportTheme:setTheme,setBuilderWorkspaceMode:setWorkspace,pdfFixResult:source==='remediation'?{html:fixtureHtml}:undefined});
 props.updateExportPreview=()=>window.AlloModules.ExportPreviewHelpers.updateExportPreview({exportPreviewRef:ref,_exportPreviewErrorRef:{current:null},_builderRecoverySaveTimerRef:{current:null},getExportPreviewHTML:()=>fixtureHtml,t:()=>'',addToast:noop,warnLog:console.warn,setCanvasRecoveryRevision:noop,isCanvas:false,a11yInspectMode:false});
 window.builderProps=props;
 React.useEffect(()=>{props.updateExportPreview();},[]);
 return React.createElement(window.AlloModules.ExportPreviewView,props);
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Host));
</script></body></html>`;
const cache=Object.fromEntries(Object.entries(assets).map(([url,file])=>[url,fs.readFileSync(path.join(root,file))]));
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(pathname==='/'||pathname==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
 if(cache[pathname]){res.writeHead(200,{'Content-Type':pathname.endsWith('.css')?'text/css':'text/javascript'});res.end(cache[pathname]);return;}
 res.writeHead(404);res.end('Not found');
});
server.listen(8792,'127.0.0.1',()=>console.log('Builder audit fixture http://127.0.0.1:8792'));
