const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const repo = path.resolve(__dirname, '../..');
const assetPaths = {
  '/react.js': path.join(repo, 'desktop/web-app/node_modules/react/umd/react.development.js'),
  '/react-dom.js': path.join(repo, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'),
  '/axe.js': path.join(repo, 'node_modules/axe-core/axe.min.js')
};

const fixtureHTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ATC local QA fixture</title><style>
*{box-sizing:border-box}body{margin:0;background:#020617;color:#e2e8f0;font-family:system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:16px}button,input,textarea{font:inherit}button:focus-visible,input:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:3px solid #38bdf8;outline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
</style></head><body><main id="root"></main><script src="/react.js"></script><script src="/react-dom.js"></script><script>
let rng=73291;Math.random=function(){rng=(rng*1664525+1013904223)>>>0;return rng/4294967296};
window.__atcToasts=[];window.__atcAnnouncements=[];window.__atcXP=[];
</script><script src="/atc.js"></script><script>
const h=React.createElement;
function Host(){
 const [toolData,setToolData]=React.useState({atcTower:{view:'menu'}});
 const update=React.useCallback(function(tool,key,value){setToolData(function(prev){return Object.assign({},prev,{[tool]:Object.assign({},prev[tool],{[key]:value})})})},[]);
 const updateMulti=React.useCallback(function(tool,values){setToolData(function(prev){return Object.assign({},prev,{[tool]:Object.assign({},prev[tool],values)})})},[]);
 window.__atcToolData=toolData;window.__fixtureSetData=setToolData;
 const noop=function(){};
 const ctx={React,toolData,update,updateMulti,gradeLevel:'5th Grade',t:function(key,fallback){return fallback||key},addToast:function(message,kind){window.__atcToasts.push({message,kind})},announceToSR:function(message){window.__atcAnnouncements.push(message)},awardXP:function(value){window.__atcXP.push(value)},tryAward:noop,setToolSnapshots:noop,toolSnapshots:[],canvasNarrate:noop,canvasA11yDesc:noop,beep:noop,celebrate:noop,getXP:function(){return 0},icons:new Proxy({},{get:function(){return function(){return null}}}),callGemini:null};
 return window.StemLab._registry.atcTower.render(ctx);
}
ReactDOM.createRoot(document.getElementById('root')).render(h(Host));
</script></body></html>`;

function createFixtureServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(fixtureHTML);
      return;
    }
    if (url.pathname === '/atc.js') {
      let source = fs.readFileSync(path.join(repo, 'stem_lab/stem_tool_atctower.js'), 'utf8');
      const marker = "var runningRef = useRef(view === 'playing' && !!gameRef.current.airport);";
      if (!source.includes(marker)) throw new Error('ATC fixture instrumentation marker missing');
      source = source.replace(marker, marker + '\nwindow.__atcGameRef = gameRef;');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.end(source);
      return;
    }
    if (assetPaths[url.pathname]) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.end(fs.readFileSync(assetPaths[url.pathname]));
      return;
    }
    res.writeHead(404);res.end('Not found');
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({server, url:`http://127.0.0.1:${server.address().port}/`}));
  });
}

module.exports = {createFixtureServer, repo};
