// Real design tools with a clearly labeled fictional AI provider for local demos.
import { readFileSync } from 'node:fs';

const assets = new Map([
  ['/design/react.js', ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'text/javascript']],
  ['/design/react-dom.js', ['desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'text/javascript']],
  ['/design/three.js', ['vendor/three-r128/three.min.js', 'text/javascript']],
  ['/design/prim3d_module.js', ['prim3d_module.js', 'text/javascript']],
  ['/design/printable_model_module.js', ['printable_model_module.js', 'text/javascript']],
  ['/design/printlab.js', ['stem_lab/stem_tool_printlab.js', 'text/javascript']],
  ['/design/artstudio.js', ['stem_lab/stem_tool_artstudio.js', 'text/javascript']],
  ['/design/tools.css', ['reports/school-store-refinements-2026-09-07/tool-preview.css', 'text/css']],
]);

export function designDemoAsset(pathname) {
  if (pathname === '/design') return { content: designDemoHtml(), type: 'text/html' };
  const asset = assets.get(pathname);
  return asset ? { content: readFileSync(new URL('../' + asset[0], import.meta.url)), type: asset[1] } : null;
}

function designDemoHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Print Lab design review</title><link rel="stylesheet" href="/design/tools.css"><style>body{margin:0;background:#0f172a;font-family:system-ui,sans-serif}#demo-header{padding:18px 24px;color:#fff;background:#164e63}#demo-header p{max-width:1000px;font-size:14px;line-height:1.6}#demo-header a{color:#cffafe;text-decoration:underline}#demo-status{padding:8px 24px;color:#fff;font-size:14px}#root{padding:16px;max-width:1600px;margin:auto}#root>*{min-width:0}#root input{min-width:0}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}</style></head><body>
  <header id="demo-header"><h1 class="text-xl font-bold">Design → Sculpt → Print Lab</h1><p>Fictional AI demonstration: Create and Refine always return the same turtle example. Editing, preflight, comparison, and export use the real tools. No AI service, student records, or printer is connected. Describe a model, create the example, edit it in Sculpt, then continue in Print Lab.</p><a href="/">Return to School Store demo</a></header><p id="demo-status" role="status"></p><main id="root"></main>
  <script src="/design/react.js"></script><script src="/design/react-dom.js"></script><script src="/design/three.js"></script>
  <script>window.StemLab={_registry:{},registerTool:function(id,tool){this._registry[id]=tool},isRegistered:function(id){return !!this._registry[id]},ensureThree:function(){return Promise.resolve(window.THREE)},loadScriptResilient:function(){return Promise.reject(new Error('This optional tool is not included in the local demo.'))}};</script>
  <script src="/design/prim3d_module.js"></script><script src="/design/printable_model_module.js"></script><script src="/design/printlab.js"></script><script src="/design/artstudio.js"></script>
  <script>
  var demoRecipe={name:'Turtle example',parts:[
    {shape:'cylinder',label:'Broad base',size:[.7,.12,.7],position:[0,.06,0],rotation:[0,0,0],color:'#0369a1'},
    {shape:'sphere',label:'Shell',size:[.42,.42,.42],stretch:[1.2,.6,1],position:[0,.32,0],rotation:[0,0,0],color:'#15803d'},
    {shape:'sphere',label:'Head',size:[.18,.18,.18],position:[.5,.22,0],rotation:[0,0,0],color:'#86efac'}
  ]};
  var noop=function(){}, icons=new Proxy({},{get:function(){return function(){return null}}});
  function notify(text){document.getElementById('demo-status').textContent=text}
  function Tool(props){return StemLab._registry[props.id].render(props.ctx)}
  function App(){
    var dataState=React.useState({printLab:{},artStudio:{tab:'sculpt3d',studioStarted:true,sculptAuto:false}}),data=dataState[0],setData=dataState[1];
    var toolState=React.useState('printLab'),tool=toolState[0],setTool=toolState[1];
    window.designDemoState=data;
    var ctx={React:React,toolData:data,setToolData:setData,labToolData:data,setLabToolData:setData,
      updateMulti:function(id,patch){setData(function(p){if(typeof id==='string'){var n=Object.assign({},p);n[id]=Object.assign({},p[id],patch);return n}return Object.assign({},p,id)})},
      setStemLabTool:function(id){if(!StemLab._registry[id]){notify('This demo includes Sculpt and Print Lab. The full app includes the other design tools.');return}setTool(id)},
      setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],stemLabTab:'explore',stemLabTool:tool,
      addToast:notify,announceToSR:notify,awardXP:noop,getXP:function(){return 0},beep:noop,celebrate:noop,tryAward:noop,
      canvasNarrate:noop,canvasA11yDesc:noop,icons:icons,props:{},gradeLevel:'5th Grade',t:function(k,f){return f||k},
      callGemini:function(){notify('Using the fictional turtle response. Your configured AI provider is used in the full app.');return Promise.resolve(JSON.stringify(demoRecipe))},
      callTTS:null,callImagen:null,callGeminiVision:null,callGeminiImageEdit:null,
      srOnly:{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0,0,0,0)'},
      a11yClick:function(fn){return {onClick:fn,role:'button',tabIndex:0,onKeyDown:function(e){if(e.key==='Enter'||e.key===' ')fn()}}}
    };
    return React.createElement('div',{className:tool==='artStudio'?'bg-white text-slate-900 rounded-2xl p-4':''},React.createElement(Tool,{key:tool,id:tool,ctx:ctx}));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
  </script></body></html>`;
}
