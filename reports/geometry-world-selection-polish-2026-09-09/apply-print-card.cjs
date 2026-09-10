const fs = require('node:fs');
const file = 'stem_lab/stem_tool_geometryworld_builder.js';
let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function replace(old, next) {
  if (!source.includes(old)) throw new Error('Missing patch anchor: ' + old.slice(0, 100));
  source = source.replace(old, next);
}
replace('.gwe-clear-selection{grid-column:1/-1;justify-self:start;min-height:36px;', '.gwe-clear-selection{grid-column:1/-1;justify-self:start;min-height:44px;');
const css = '.gwe-print-dimensions{margin-top:11px}.gwe-print-axes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.gwe-print-axis{min-width:0;padding:9px 7px;border:1px solid #bdd0b52e;border-radius:9px;background:#112d2b38}.gwe-print-axis-label{display:block;color:#cfddc8;font-size:10px;font-weight:550}.gwe-print-ready .gwe-print-axis strong{margin-top:4px;font-size:18px;line-height:1.2;letter-spacing:-.02em;overflow-wrap:anywhere}.gwe-print-axis small{display:block;margin-top:2px;color:#bdcfb8;font-size:10px}.gwe-print-axis[data-over="true"]{border-color:#f1c67d99;background:#f1c67d12}.gwe-print-ready .gwe-print-axis[data-over="true"] strong{color:#f4d69f}.gwe-print-axis-note{display:block;margin-top:5px;color:#f4d69f;font-size:9px;font-weight:650}.gwe-assistive-copy{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap}.theme-contrast .gwe-print-axis,[data-stem-theme="contrast"] .gwe-print-axis{background:#000;border-color:#fff}.theme-contrast .gwe-print-axis[data-over="true"],[data-stem-theme="contrast"] .gwe-print-axis[data-over="true"]{border:2px dashed #ffff00}.theme-contrast .gwe-print-axis small,[data-stem-theme="contrast"] .gwe-print-axis small{color:#fff}';
replace("    ].join('');\n    document.head.appendChild(style);", '      ,' + JSON.stringify(css) + "\n    ].join('');\n    document.head.appendChild(style);");
replace("            h('strong', {role:'status'}, printEnvelope.label),\n            h('p', {className:'gwe-print-scale'}, currentPrintUnit + ' mm per block \\u00B7 ' + printEnvelope.profileLabel),", `            h('div', {className:'gwe-print-dimensions',role:'status'},
              h('span',{className:'gwe-assistive-copy'},'Width, depth, height: '+printEnvelope.label+'.'+(printEnvelope.over.length?' '+listDimensions(printEnvelope.over)+' exceed the printer bed.':'')),
              h('div',{className:'gwe-print-axes','aria-hidden':'true'},
                [['width','Width'],['depth','Depth'],['height','Height']].map(function(axis){
                  var over=printEnvelope.over.indexOf(axis[0])!==-1;
                  return h('div',{key:axis[0],className:'gwe-print-axis','data-axis':axis[0],'data-over':over?'true':'false'},
                    h('span',{className:'gwe-print-axis-label'},axis[1]),h('strong',null,printEnvelope[axis[0]+'Mm']),h('small',null,'mm'),
                    over && h('span',{className:'gwe-print-axis-note'},'Over limit'));
                })
              )
            ),
            h('p', {className:'gwe-print-scale'}, currentPrintUnit + ' mm per block \\u00B7 Bed ' + printEnvelope.profileLabel),`);
replace("'data-connected':data.builderPrintCheck.components===1 && !data.builderPrintCheck.nonManifoldEdges ? 'true':'false'", "'data-connected':selectionNeedsReview(data.builderPrintCheck) ? 'false':'true'");
replace("data.builderPrintCheck.nonManifoldEdges ? 'Touching edges need review' : 'One joined piece'", "data.builderPrintCheck.nonManifoldEdges ? 'Touching edges need review' : data.builderPrintCheck.openEdges ? 'Open surfaces need review' : selectionNeedsReview(data.builderPrintCheck) ? 'Review this selection' : 'One joined piece'");
replace("'Some surfaces meet only along an edge. Add a connecting block or review the highlighted creation in Print Lab.' : 'The selected shapes share surfaces. Print Lab will check the exported mesh and physical scale.'", "'Some surfaces meet only along an edge. Add a connecting block or review the highlighted creation in Print Lab.' : data.builderPrintCheck.openEdges ? 'The selected mesh has open edges. Review its surfaces in Print Lab before preparing a print.' : selectionNeedsReview(data.builderPrintCheck) ? 'The selection check is incomplete. Open Print Lab to inspect the exported mesh.' : 'The selected shapes share surfaces. Print Lab will check the exported mesh and physical scale.'");
new Function(source);
for (const target of [file, 'desktop/web-app/public/' + file]) {
  const fd = fs.openSync(target, 'r+');
  fs.writeFileSync(fd, source); fs.ftruncateSync(fd, Buffer.byteLength(source)); fs.closeSync(fd);
}
console.log('Print dimensions, readiness feedback, and 44px Clear selection applied; syntax and mirrors match.');
