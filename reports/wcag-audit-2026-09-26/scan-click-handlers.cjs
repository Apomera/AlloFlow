const fs=require('fs');const parser=require('@babel/parser');const traverse=require('@babel/traverse').default;
const files=process.argv.slice(2);let out=[];
for(const f of files){let src=fs.readFileSync(f,'utf8');let ast;try{ast=parser.parse(src,{sourceType:'unambiguous',plugins:['jsx'],errorRecovery:true});}catch(e){console.error('parse',f,e.message.slice(0,80));continue;}
traverse(ast,{JSXOpeningElement(p){const n=p.node.name;if(n.type!=='JSXIdentifier')return;const tag=n.name;if(!/^(div|span|li|td|tr|p|img|section|article|svg|g|circle|rect|path|label|h\d)$/.test(tag))return;
const attrs=Object.fromEntries(p.node.attributes.filter(a=>a.type==='JSXAttribute'&&a.name).map(a=>[a.name.name,a]));
if(!attrs.onClick)return;if(attrs.role||attrs.tabIndex||attrs.onKeyDown||attrs.onKeyUp||attrs.onKeyPress)return;
if(tag==='label')return;
// ignore backdrop-style handlers that only stop propagation or close overlays
const code=src.slice(attrs.onClick.start,attrs.onClick.end);if(/stopPropagation\(\)\s*\}?\s*\}?$/.test(code.replace(/\s+/g,' ').trim())&&code.length<80)return;
if(attrs['aria-hidden'])return;
out.push(f+':'+p.node.loc.start.line+' <'+tag+'> '+code.replace(/\s+/g,' ').slice(0,90));}});}
console.log(out.length);console.log(out.join('\n'));
