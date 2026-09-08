const fs=require('node:fs'),p='stem_lab/stem_tool_geometryworld.js';let s=fs.readFileSync(p,'utf8');
const helper=String.raw`
  // Small, code-native material samples match the blocks across devices. The
  // parent button supplies the accessible name and keyboard shortcut.
  function renderBlockSwatch(el, type) {
    var colors = {
      stone:['#b4bec5','#909da6','#6e7e89'], grass:['#87a875','#836448','#654b37'],
      wood:['#d2aa76','#b58650','#906839'], diamond:['#8ae2e5','#24baca','#1291ab'],
      gold:['#ffe2a0','#efb647','#b5842c'], sand:['#f0dfb7','#dbc69d','#baa77f'],
      glass:['#e4f4f7','#b5d5df','#8baec2'], water:['#80cef0','#409cdb','#2b71b5'],
      brick:['#ce8d73','#b86950','#8f503f'], ice:['#e7fbfa','#b5e2e4','#85becd'],
      lava:['#ffd17b','#f87835','#c54827'], torch:['#ffdb86','#dd9150','#9b623b']
    }[type] || ['#b4bec5','#909da6','#6e7e89'];
    var path = function(key,d,stroke,opacity,width){return el('path',{key:key,d:d,fill:'none',stroke:stroke||'#263b43',strokeWidth:width||0.75,opacity:opacity==null?0.3:opacity,strokeLinecap:'round',strokeLinejoin:'round'});};
    var details=[];
    if(type==='wood') details.push(path('grain','M5 13L14 18M5 18L14 23M18 18L27 13M18 23L27 18','#65452b',0.4));
    if(type==='brick') details.push(path('mortar','M3 15L16 22L29 15M3 20L16 27L29 20M9 12L9 18M22 12L22 18M7 17L7 22M24 17L24 22','#f3d5bc',0.55,0.8));
    if(type==='stone') details.push(path('vein','M5 17L8 15L12 18M19 24L22 20L26 21','#dce6e8',0.4));
    if(type==='grass') details.push(path('turf','M4 10L16 16.5L28 10','#acc793',0.9,2));
    if(type==='sand') [[7,17],[11,23],[22,17],[25,21],[14,8]].forEach(function(v,i){details.push(el('circle',{key:'grain'+i,cx:v[0],cy:v[1],r:0.65,fill:'#927d59',opacity:0.4}));});
    if(type==='diamond') details.push(path('facets','M3 9L16 5L29 9M16 5L16 16L10 26M16 16L23 26','#e0ffff',0.55));
    if(type==='glass'||type==='ice') details.push(path('shine','M5 13L13 17M20 18L26 14M6 21L11 24','#ffffff',0.85,1.2));
    if(type==='water') details.push(path('ripples','M6 8Q9 6 12 8T18 8T25 8M19 18Q22 17 26 15','#e0f7ff',0.75,1));
    if(type==='gold') details.push(path('glint','M23 13L23 18M20.5 15.5L25.5 15.5','#fff6d1',0.95,1.2));
    if(type==='lava') details.push(path('flow','M5 12L10 18L8 21L14 26M23 13L20 18L25 21','#ffe59a',0.9,1.4));
    if(type==='torch') details.push(el('path',{key:'flame',d:'M17 3C18 7 22 8 21 12C21 16 14 18 12 13C10 9 15 7 17 3Z',fill:'#ffe49b',stroke:'#ffb74d',strokeWidth:0.8}));
    return el('svg',{className:'gw-material-swatch',viewBox:'0 0 32 32','aria-hidden':'true',focusable:'false'},
      el('ellipse',{cx:16,cy:28,rx:12,ry:3,fill:'#071c27',opacity:0.3}),
      el('path',{d:'M16 2L29 9L16 16L3 9Z',fill:colors[0]}),
      el('path',{d:'M3 9L16 16L16 30L3 23Z',fill:colors[1]}),
      el('path',{d:'M16 16L29 9L29 23L16 30Z',fill:colors[2]}),
      path('edges','M3 9L16 2L29 9L29 23L16 30L3 23ZM3 9L16 16L29 9M16 16L16 30','#ecf7f1',0.2,0.65),details);
  }
`;
const anchor='  function getBlockColor(type) {';if(!s.includes(anchor))throw Error('Color anchor missing');s=s.replace(anchor,helper+'\n'+anchor);
const child="              bt.emoji,\n              el('span', { style: { position: 'absolute', bottom: '1px'";
if(!s.includes(child))throw Error('Hotbar child missing');s=s.replace(child,"              renderBlockSwatch(el, bt.id),\n              el('span', { style: { position: 'absolute', bottom: '1px'");
const css="      '.gw-hotbar{gap:4px!important;padding:6px!important;}',";
if(!s.includes(css))throw Error('Hotbar style missing');
s=s.replace(css,css+"\n      '.gw-material-swatch{display:block;width:30px;height:30px;pointer-events:none;filter:drop-shadow(0 2px 2px #02151d33)}.gw-root .gw-hotbar-item{border-color:#bdd7cc22!important;background:#102a3244!important;border-radius:10px!important}.gw-root .gw-hotbar-item[data-active=\"true\"]{border-color:#c6e9d6!important;background:#37706466!important;box-shadow:0 5px 16px #06252755,inset 0 0 0 1px #ddf2de22!important}.gw-hotbar-item[data-active=\"true\"]>span{color:#e1f4e6!important}@media(max-width:720px){.gw-material-swatch{width:26px;height:26px}}',");
for(const f of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(f,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}console.log('Material preview swatches installed.');
