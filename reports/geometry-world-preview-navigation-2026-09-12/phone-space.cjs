const fs=require('node:fs'),vm=require('node:vm'),file='stem_lab/stem_tool_geometryworld_builder.js',raw=fs.readFileSync(file,'utf8'),s=raw.replace(/\r\n/g,'\n');
const from="      if(isSandbox && data.worldActive && previewReview && collapsed && selectionEditPreview && !homeOpen && !data.showcaseActive)additions.push(";
if(s.split(from).length!==2)throw Error('Expected review insertion point');
const to="      // Back to tools already lives in the review card; reclaim the phone canvas.\n      if(previewReview)additions.push(h('style',{key:'gwe-preview-phone-space'},'@media(max-width:600px){#geoworld-fs-workspace .gwe-builder-dock{display:none!important}}'));\n"+from;
const updated=s.replace(from,to);new vm.Script(updated);const b=Buffer.from(raw.includes('\r\n')?updated.replace(/\n/g,'\r\n'):updated),fd=fs.openSync(file,'r+');fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);fs.closeSync(fd);console.log('Phone review uses the full canvas width below its controls.');
