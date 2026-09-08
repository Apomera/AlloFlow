#!/usr/bin/env node
// Keep directions formatting identical in the host and self-contained document exports.
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function write(file,value){const target=path.resolve(root,file);if(!target.startsWith(root+path.sep))throw Error('Outside workspace');const previous=fs.readFileSync(target,'utf8');if(previous===value)return;const next=target+'.directions-next',backup=target+'.directions-backup';if(fs.existsSync(next)||fs.existsSync(backup))throw Error('Temporary file already exists');fs.writeFileSync(next,value);if(fs.readFileSync(target,'utf8')!==previous)throw Error('Concurrent change');fs.renameSync(target,backup);try{fs.renameSync(next,target);}catch(e){fs.renameSync(backup,target);throw e;}fs.unlinkSync(backup);}
const begin = '// BEGIN SHARED DIRECTIONS MARKDOWN';
const end = '// END SHARED DIRECTIONS MARKDOWN';
const shared = begin + '\n' + read('directions_markdown_source.js').trim() + '\n' + end + '\n\n';
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
for (const file of [...hosts, 'doc_pipeline_source.jsx']) {
 let source = read(file);
 if (source.includes(begin)) {
   const a=source.indexOf(begin), b=source.indexOf(end,a)+end.length;
   source=source.slice(0,a)+shared.trimEnd()+source.slice(b);
 } else if (hosts.includes(file)) {
   const a=source.indexOf('function _alloParsePreviewMarkdown('), b=source.indexOf('function _alloBuildDirectionsResultAdapter(',a);
   if(a<0||b<a) throw Error('Missing host formatter anchors: '+file);
   source=source.slice(0,a)+shared+source.slice(b);
 } else {
   source=shared+source;
 }
 write(file,source);
}
const result = require('../_build_view_directions_result_module.js').buildDirectionsResultModule(read('view_directions_result_source.jsx'));
for (const file of ['view_directions_result_module.js','desktop/web-app/public/view_directions_result_module.js']) write(file,result);
require('../_build_view_directions_composer_module.js').build({writeFile:write});
require('../_build_simple_iife_module.js').build({name:'doc_pipeline',guardKey:'DocPipelineModule',logTag:'DocPipeline',writeFile:write});
// Pin only the modules changed by this build; retain other in-progress work and URL modes.
const pins = new Map(['view_directions_result_module.js','view_directions_composer_module.js','doc_pipeline_module.js'].map(file => [file,createHash('sha256').update(read(file)).digest('hex').slice(0,8)]));
for (const file of hosts) {
 const source=read(file).replace(/https:\/\/alloflow-cdn\.pages\.dev\/(view_directions_result_module\.js|view_directions_composer_module\.js|doc_pipeline_module\.js)(?:\?v=[^'"\s)]+)?/g,(_,module)=>'https://alloflow-cdn.pages.dev/'+module+'?v='+pins.get(module));
 write(file,source);
}
const publicCopy='desktop/web-app/src/doc_pipeline_module_public_copy.js';
if(fs.existsSync(path.join(root,publicCopy))) write(publicCopy,read('doc_pipeline_module.js'));
console.log('Directions sources, modules, and CDN pins synchronized.');
