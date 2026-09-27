// Loopback preview of the actual tool and bundled assets; no production writes.
// Run: node dev-tools/scale_explorer_preview.cjs [port]
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const assets = {
  '/react.js': 'desktop/web-app/node_modules/react/umd/react.production.min.js',
  '/react-dom.js': 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
  '/three.js': 'vendor/three-r128/three.min.js',
  '/vendor/three-r128/GLTFLoader.js': 'vendor/three-r128/GLTFLoader.js',
  '/stem_lab/stem_lab_module.js': 'stem_lab/stem_lab_module.js',
  '/stem_lab/stem_tool_scaleexplorer.js': 'stem_lab/stem_tool_scaleexplorer.js',
  '/stem_lab/assets/astronomy/scale-earth-bluemarble-1k.png': 'stem_lab/assets/astronomy/scale-earth-bluemarble-1k.png',
  '/stem_lab/assets/astronomy/moon-lroc-color-2k.jpg': 'stem_lab/assets/astronomy/moon-lroc-color-2k.jpg',
  '/stem_lab/assets/astronomy/moon-lola-height-1k.jpg': 'stem_lab/assets/astronomy/moon-lola-height-1k.jpg',
  '/stem_lab/assets/astronomy/scale-jupiter-hubble-1k.jpg': 'stem_lab/assets/astronomy/scale-jupiter-hubble-1k.jpg',
  '/stem_lab/assets/anatomy/body-surface/makehuman-body-surface.glb': 'stem_lab/assets/anatomy/body-surface/makehuman-body-surface.glb'
};
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Scale Explorer · Immersive atlas</title><style>body{margin:0;background:#0f172a;font-family:system-ui,sans-serif}#preview{max-width:1500px;margin:auto}button,input,select{font-family:inherit}.preview-theme{padding:8px 16px;color:#dbeafe;display:flex;justify-content:flex-end;gap:8px;font-size:12px}.preview-theme select{color:#fff;background:#1e293b;border:1px solid #64748b;border-radius:6px;padding:4px}</style></head><body><main id="preview"></main><p id="announcer" role="status" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"></p><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/three.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_scaleexplorer.js"></script><script>
function Explorer(props){var data=React.useState({});return window.StemLab._registry.scaleExplorer.render({React:React,toolData:data[0],setToolData:data[1],theme:props.theme,t:function(k,fb){return fb==null?k:fb;},announceToSR:function(s){document.getElementById('announcer').textContent=s;}});}
function Preview(){var theme=React.useState('dark');return React.createElement(React.Fragment,null,React.createElement('label',{className:'preview-theme'},'Preview theme',React.createElement('select',{value:theme[0],onChange:function(e){theme[1](e.target.value);}},['dark','light','contrast'].map(function(t){return React.createElement('option',{key:t,value:t},t);}))),React.createElement(Explorer,{theme:theme[0]}));}
ReactDOM.createRoot(document.getElementById('preview')).render(React.createElement(Preview));
</script></body></html>`;
const mime = { '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1').pathname;
  response.setHeader('Cache-Control', 'no-store');
  if (url === '/') { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(html); return; }
  if (!Object.hasOwn(assets, url)) { response.writeHead(404); response.end('Not found'); return; }
  fs.readFile(path.join(root, assets[url]), (error, body) => {
    if (error) { response.writeHead(500); response.end('Preview asset unavailable'); return; }
    response.writeHead(200, { 'Content-Type': mime[path.extname(url)] }); response.end(body);
  });
});
server.listen(Number(process.argv[2]) || 0, '127.0.0.1', () => console.log('Scale Explorer preview: http://127.0.0.1:' + server.address().port + '/'));
