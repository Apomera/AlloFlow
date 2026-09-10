const fs=require('node:fs'),vm=require('node:vm');
const canonical='stem_lab/stem_tool_geometryworld_builder.js',mirror='desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js';
const original=fs.readFileSync(canonical,'utf8'),crlf=original.includes('\r\n');let s=original.replace(/\r\n/g,'\n');
const start=s.indexOf("          h('section', {'aria-label':'Current block choices'},"),end=s.indexOf("          h('section', {'aria-label':'Keep your work'},",start);
if(start<0||end<0)throw Error('Current block choice section not found');
const tools=`          h('section', {className:'gwe-current-tools','aria-label':'Current block choices'},
            h('h3', {className:'gwe-section-title'}, 'Building with'),
            h('div', { className: 'gwe-selection' },
              h('div', { className: 'gwe-selection-card' }, h('span', { className: 'gwe-selection-label' }, 'Material'), h('span', { className: 'gwe-selection-value' }, material.emoji + ' ' + material.name)),
              h('div', { className: 'gwe-selection-card' }, h('span', { className: 'gwe-selection-label' }, 'Shape'), h('span', { className: 'gwe-selection-value' }, shape.emoji + ' ' + shape.name), h('span', {className:'gwe-tool-rotation'}, ((Number(data.blockRotation) || 0) * 90) + '\\u00B0 rotation'))
            ),
            h('div', {className:'gwe-builder-actions gwe-match-actions'},
              h('button', {type:'button',className:'gwe-match-block','aria-label':'Match aimed block','aria-keyshortcuts':'I',title:'Aim at a block to reuse its material, shape, and rotation (I)',onClick:function(){var live=window[ENGINE_KEY];if(live && live.matchAimedBlock)live.matchAimedBlock();}},
                h('svg',{viewBox:'0 0 24 24',width:20,height:20,fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true',focusable:'false'},h('path',{d:'M14 5l5 5M12 7l5 5M3 21l4-1 12-12a3 3 0 0 0-4-4L3 16v5ZM3 16l5 5'})),
                h('span',null,'Match aimed block'),h('kbd',{'aria-hidden':'true'},'I'))
            ),
            h('p',{className:'gwe-match-note'},'Aim at a block to reuse its material, shape, and rotation.')
          ),
`;
s=s.slice(0,start)+s.slice(end);
const insert="          h('section', {'aria-label':'Your creation'},";if(!s.includes(insert))throw Error('Creation section missing');s=s.replace(insert,tools+insert);
const css='.gwe-current-tools .gwe-selection-card{padding:9px 10px}.gwe-current-tools .gwe-selection-value{white-space:normal;overflow-wrap:anywhere;line-height:1.4}.gwe-tool-rotation{display:block;margin-top:4px;color:#bfd3c3;font-size:11px;font-variant-numeric:tabular-nums}.gwe-match-actions{margin-top:9px}.gwe-match-actions .gwe-match-block{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:9px;min-height:44px}.gwe-match-block svg{flex:0 0 auto}.gwe-match-block kbd{margin-left:auto;display:grid;place-items:center;min-width:22px;height:22px;border:1px solid #bad0bd55;border-radius:5px;font:600 11px system-ui;background:#d4e8ca0a;color:inherit}.gwe-match-block span{flex:1;text-align:left}.gwe-match-note{margin:7px 0 0;color:#bfd2c4;font-size:11px;line-height:1.5}.theme-contrast .gwe-tool-rotation,[data-stem-theme="contrast"] .gwe-tool-rotation,.theme-contrast .gwe-match-note,[data-stem-theme="contrast"] .gwe-match-note{color:#fff}.theme-contrast .gwe-match-block kbd,[data-stem-theme="contrast"] .gwe-match-block kbd{background:#000;border-color:#00ff00}';
const cssMarker='      ".gwe-focus-return{';if(!s.includes(cssMarker))throw Error('CSS marker missing');s=s.replace(cssMarker,'      '+JSON.stringify(css)+',\n'+cssMarker);
const plural="measured.count+' blocks \\u00B7 '";if(!s.includes(plural))throw Error('Showcase count marker missing');s=s.replace(plural,"measured.count+' block'+(measured.count===1?'':'s')+' \\u00B7 '");
new vm.Script(s);if(crlf)s=s.replace(/\n/g,'\r\n');
for(const file of [canonical,mirror]){const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
console.log('Building choices moved higher, Match aimed block added, shape labels wrap, Showcase count pluralized. Mirrors match.');
