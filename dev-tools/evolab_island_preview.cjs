// Loopback-only preview of the actual EvoLab source and existing assets.
// Usage: node dev-tools/evolab_island_preview.cjs [port; default 0]
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const cssDir = path.join(root, 'app/static/css');
const stylesheet = fs.readdirSync(cssDir).filter(name => /^main\..*\.css$/.test(name)).sort()[0];
const assets = {
  '/react.js': 'desktop/web-app/node_modules/react/umd/react.production.min.js',
  '/react-dom.js': 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
  '/three.js': 'vendor/three-r128/three.min.js',
  '/evolab.js': 'stem_lab/stem_tool_evolab.js',
  '/app.css': 'app/static/css/' + stylesheet
};
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Living Island · EvoLab preview</title><link rel="stylesheet" href="/app.css"><style>body{margin:0;background:#f2f4eb}#preview{min-height:100vh}</style></head><body><div id="preview"></div><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/three.js"></script><script src="/evolab.js"></script><script>
function Preview(){
  var state=React.useState({evoLab:{view:'livingIsland'}}),data=state[0],setData=state[1];
  return window.StemLab.renderTool('evoLab',{
    React:React,toolData:data,t:function(k,fb){return fb==null?k:fb;},
    update:function(id,key,value){setData(function(old){var next=Object.assign({},old);next[id]=Object.assign({},old[id]);next[id][key]=value;return next;});},
    addToast:function(message){console.info('[EvoLab]',message);}
  });
}
ReactDOM.createRoot(document.getElementById('preview')).render(React.createElement(Preview));
</script></body></html>`;
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1').pathname;
  response.setHeader('Cache-Control', 'no-store');
  if (url === '/') { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(html); return; }
  if (!Object.prototype.hasOwnProperty.call(assets, url)) { response.writeHead(404); response.end('Not found'); return; }
  fs.readFile(path.join(root, assets[url]), (error, body) => {
    if (error) { response.writeHead(500); response.end('Preview asset unavailable'); return; }
    response.writeHead(200, { 'Content-Type': url.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8' });
    response.end(body);
  });
});
server.listen(Number(process.argv[2]) || 0, '127.0.0.1', () => { console.log('Living Island preview: http://127.0.0.1:' + server.address().port + '/'); });
