const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');
let ui=fs.readFileSync(path.join(root,'ui_strings.js'),'utf8');
const start=ui.indexOf('  "memory_aid": {');
const end=ui.indexOf('\n  },',start);
if(start<0||end<0)throw Error('Memory string namespace not found');
let block=ui.slice(start,end);
const entries=new Map();
for(const file of ['memory_aid_source.jsx','generate_dispatcher_source.jsx']){
  const s=fs.readFileSync(path.join(root,file),'utf8');
  const re=/\b(?:tr|T)\(\s*(['"])((?:memory_aid\.)?[a-z0-9_]+)\1\s*,\s*((?:'(?:\\.|[^'\\])*')|(?:"(?:\\.|[^"\\])*"))/g;
  for(const m of s.matchAll(re)){const value=Function('return '+m[3])();entries.set(m[2].replace(/^memory_aid\./,''),value);}
}
const labels={ai_example_heading:'Your memory cue',facts_heading:'Facts to remember',visual_direction:'Describe your picture',feedback_request:'Check my connection',panel_build:'Build memory aids'};
for(const [key,value] of Object.entries(labels))block=block.replace(new RegExp('("'+key+'": )"(?:\\\\.|[^"\\\\])*"'), '$1'+JSON.stringify(value));
const extra=[];
for(const [key,value] of entries){if(!block.includes('"'+key+'":'))extra.push('    '+JSON.stringify(key)+': '+JSON.stringify(value)+',');}
block=block.replace('  "memory_aid": {','  "memory_aid": {\n'+extra.join('\n'));
ui=ui.slice(0,start)+block+ui.slice(end);
fs.writeFileSync(path.join(root,'ui_strings.js'),ui);fs.writeFileSync(path.join(root,'desktop/web-app/public/ui_strings.js'),ui);
console.log('Added '+extra.length+' English fallback strings; preserved existing languages.');
