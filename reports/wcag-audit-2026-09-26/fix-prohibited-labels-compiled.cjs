// Compiled-module counterpart of fix-prohibited-labels.cjs, for modules whose committed
// build is not reproducible from source (rebuilding would change unrelated code).
// Applies the same rule to React.createElement("div"|"span"|..., { "aria-label": ... }).
// Usage: node fix-prohibited-labels-compiled.cjs [--apply] [--selftest] <module files...>
'use strict';
const fs=require('node:fs');const parser=require('@babel/parser');const traverse=require('@babel/traverse').default;
const SYMBOL=/^[\s←-⇿∀-⋿─-➿‒-―−✓-✗⚑•·;-]*$/;
const key=p=>p.key&&(p.key.type==='Identifier'?p.key.name:p.key.value);
function classify(props,kids){
 const names=props.properties.map(key);
 if(names.includes('aria-live'))return 'log';
 const k=kids.filter(c=>!(c.type==='StringLiteral'&&!c.value.trim()));
 if(!k.length)return 'img';
 const lit=n=>n&&n.type==='StringLiteral'&&SYMBOL.test(n.value);
 if(k.every(lit))return 'img';
 if(k.length===1&&k[0].type==='ConditionalExpression'&&lit(k[0].consequent)&&lit(k[0].alternate))return 'img';
 if(names.includes('onMouseDown')&&!k.some(c=>c.type==='StringLiteral'))return 'img';
 return 'group';
}
function scan(src){
 const ast=parser.parse(src,{sourceType:'unambiguous',plugins:['jsx'],errorRecovery:true});const hits=[];
 traverse(ast,{CallExpression(p){const c=p.node.callee;if(!(c.type==='MemberExpression'&&c.property.name==='createElement'))return;
  const [tag,props,...kids]=p.node.arguments;if(!tag||tag.type!=='StringLiteral'||!/^(div|span|p|b|i|strong|em|small)$/.test(tag.value))return;
  if(!props||props.type!=='ObjectExpression')return;
  if(props.properties.some(q=>q.type!=='ObjectProperty'))return;
  const names=props.properties.map(key);
  if(!(names.includes('aria-label')||names.includes('aria-labelledby')))return;
  if(names.includes('role')||names.includes('tabIndex'))return;
  hits.push({line:props.loc.start.line,role:classify(props,kids),at:props.start+1});}});
 return hits;
}
function apply(src,hits){let out=src;for(const h of [...hits].sort((a,b)=>b.at-a.at))out=out.slice(0,h.at)+' role: "'+h.role+'",'+out.slice(h.at);return out;}
if(process.argv.includes('--selftest')){
 const src='R.createElement("span",{"aria-label":"Correct"},"\\u2713");R.createElement("div",{className:"x","aria-label":"Tools"},R.createElement("button",null,"a"));R.createElement("div",{"aria-live":"polite","aria-label":"Log"},items);R.createElement("div",{role:"group","aria-label":"ok"});';
 const h=scan(src);const got=h.map(x=>x.role).join(',');const ok=got==='img,group,log'&&/\{ role: "img","aria-label":"Correct"\}/.test(apply(src,h));
 console.log(ok?'selftest PASS':'selftest FAIL '+got);process.exit(ok?0:1);
}
const doApply=process.argv.includes('--apply');
for(const f of process.argv.slice(2).filter(a=>!a.startsWith('--'))){const src=fs.readFileSync(f,'utf8');const h=scan(src);
 console.log(f+': '+h.length+' '+JSON.stringify(h.reduce((m,x)=>(m[x.role]=(m[x.role]||0)+1,m),{})));if(doApply&&h.length)fs.writeFileSync(f,apply(src,h));}
