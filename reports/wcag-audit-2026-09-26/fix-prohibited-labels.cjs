// ARIA 1.2 / WCAG 4.1.2: aria-label and aria-labelledby are prohibited on generic
// elements (div/span/p with no role) and assistive technology may ignore them.
// This gives each such element the role its content implies, so the name is exposed:
//   - empty, or only a short symbol / symbol expression (✓ ✗ ⚑ → —, status dots) -> role="img"
//   - carries aria-live                                                            -> role="log"
//   - otherwise (a set of related content or controls)                             -> role="group"
// Usage: node fix-prohibited-labels.cjs [--apply] [--selftest] <files...>
'use strict';
const fs=require('node:fs');const parser=require('@babel/parser');const traverse=require('@babel/traverse').default;
const SYMBOL=/^[\s←-⇿∀-⋿─-➿‒-―−✓-✗⚑•·&mdash;;-]*$/;
function classify(el,src){
 const o=el.openingElement;const names=o.attributes.filter(a=>a.type==='JSXAttribute'&&a.name).map(a=>a.name.name);
 if(names.includes('aria-live'))return 'log';
 const kids=el.children.filter(c=>!(c.type==='JSXText'&&!c.value.trim()));
 if(!kids.length)return 'img';
 if(kids.every(c=>c.type==='JSXText'&&SYMBOL.test(c.value)))return 'img';
 if(kids.length===1&&kids[0].type==='JSXExpressionContainer'){const e=kids[0].expression;const lit=n=>n&&n.type==='StringLiteral'&&SYMBOL.test(n.value);if(lit(e)||(e.type==='ConditionalExpression'&&lit(e.consequent)&&lit(e.alternate)))return 'img';}
 if(o.name.name==='div'&&names.includes('onMouseDown')&&!kids.some(c=>c.type==='JSXText'))return 'img';
 return 'group';
}
function scan(src,file){
 const ast=parser.parse(src,{sourceType:'unambiguous',plugins:['jsx'],errorRecovery:true});const hits=[];
 traverse(ast,{JSXElement(p){const o=p.node.openingElement;const n=o.name;if(n.type!=='JSXIdentifier'||!/^(div|span|p|b|i|strong|em|small)$/.test(n.name))return;
  const names=o.attributes.filter(a=>a.type==='JSXAttribute'&&a.name).map(a=>a.name.name);
  if(!(names.includes('aria-label')||names.includes('aria-labelledby')))return;
  if(names.includes('role')||names.includes('tabIndex')||o.attributes.some(a=>a.type==='JSXSpreadAttribute'))return;
  hits.push({file,line:o.loc.start.line,tag:n.name,role:classify(p.node,src),at:n.end});}});
 return hits;
}
function apply(src,hits){let out=src;for(const h of [...hits].sort((a,b)=>b.at-a.at))out=out.slice(0,h.at)+' role="'+h.role+'"'+out.slice(h.at);return out;}
if(process.argv.includes('--selftest')){
 const src='const a=<span aria-label="Correct">✓</span>;\nconst b=<div aria-label="Tools"><button>x</button><button>y</button></div>;\nconst c=<div aria-live="polite" aria-label="Log">{items}</div>;\nconst d=<span className="dot" aria-label="Live"></span>;\nconst e=<div role="group" aria-label="ok"><i/></div>;\nconst f=<span aria-label={x ? "Selected" : "No"}>{x ? "✓" : "−"}</span>;';
 const h=scan(src,'t');const got=h.map(x=>x.line+':'+x.role).join(',');const want='1:img,2:group,3:log,4:img,6:img';
 const fixed=apply(src,h);const ok=got===want&&/<span role="img" aria-label="Correct">/.test(fixed)&&/<div role="group" aria-label="ok">/.test(fixed)&&!/role="group" role=/.test(fixed);
 console.log(ok?'selftest PASS':'selftest FAIL '+got);process.exit(ok?0:1);
}
const doApply=process.argv.includes('--apply');let total=0;const byRole={};
for(const f of process.argv.slice(2).filter(a=>!a.startsWith('--'))){const src=fs.readFileSync(f,'utf8');const hits=scan(src,f);if(!hits.length)continue;total+=hits.length;
 for(const h of hits){byRole[h.role]=(byRole[h.role]||0)+1;console.log(f+':'+h.line+' <'+h.tag+'> -> role="'+h.role+'"');}
 if(doApply)fs.writeFileSync(f,apply(src,hits));}
console.log((doApply?'fixed ':'found ')+total+' '+JSON.stringify(byRole));
