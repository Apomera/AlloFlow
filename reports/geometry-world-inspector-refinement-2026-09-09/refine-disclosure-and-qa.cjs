const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function write(file,text){const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));fs.closeSync(fd);}
let file='stem_lab/stem_tool_geometryworld_builder.js',text=fs.readFileSync(file,'utf8');
let from="      var scaleInputRef=React.useRef(null);";if(!text.includes(from))throw Error('Missing scale ref');text=text.replace(from,"      var _printScaleExpanded=React.useState(null), printScaleExpanded=_printScaleExpanded[0], setPrintScaleExpanded=_printScaleExpanded[1];\n"+from);
from="h('details', {className:'gwe-details', open:printEnvelope.fits ? undefined : true},";if(!text.includes(from))throw Error('Missing scale disclosure');text=text.replace(from,"h('details', {className:'gwe-details', open:printScaleExpanded===null ? !printEnvelope.fits : printScaleExpanded,onToggle:function(event){setPrintScaleExpanded(event.currentTarget.open);}},");
if(text.includes('\r\n'))text=text.replace(/\r?\n/g,'\r\n');new vm.Script(text);write(file,text);write('desktop/web-app/public/'+file,text);
file=path.join(__dirname,'verify-inspector-browser.cjs');text=fs.readFileSync(file,'utf8').replaceAll('.gw-coords','.gw-coordinate-hud').replaceAll('gameBarCollapsed','toolbarCollapsed');
from="const visible=controls.filter(r=>r.visible);";
if(!text.includes(from))throw Error('Missing controls assertion');text=text.replace(from,"const visible=controls.filter(r=>r.visible);let sr=null;if(open){await panel.evaluate(n=>{n.scrollTop=n.scrollHeight;});await frames();sr=(await rects('.gw-coordinate-hud > button'))[0];await panel.evaluate(n=>{n.scrollTop=0;});await frames();}");
from="controls:visible,screenshot:await shot('position-'";if(!text.includes(from))throw Error('Missing coordinate result');text=text.replace(from,"controls:visible,sr,screenshot:await shot('position-'");
from="check(visible.every(r=>r.width>=44&&r.height>=44&&r.inViewport&&r.hit),'Position controls clear shell and remain reachable '";if(!text.includes(from))throw Error('Missing coordinate predicate');text=text.replace(from,"check(visible[0].width>=44&&visible[0].height>=44&&visible[0].inViewport&&visible[0].hit&&(!open||(sr&&sr.width>=44&&sr.height>=44&&sr.inViewport&&sr.hit)),'Position controls clear shell and remain reachable '");
write(file,text);
