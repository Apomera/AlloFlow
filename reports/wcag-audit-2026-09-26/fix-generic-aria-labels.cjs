// WCAG 2.5.3 Label in Name. Finds interactive JSX elements whose aria-label is a
// generic t('common.*') string (e.g. "Generate", "Search") while the element also
// renders its own visible text. The generic label then REPLACES the visible name,
// so speech-input users saying the visible words cannot activate the control.
// With --apply, removes those aria-label attributes so the visible text is the name.
// Usage: node fix-generic-aria-labels.cjs [--apply] [--selftest] <files...>
'use strict';
const fs=require('node:fs');
const parser=require('@babel/parser');const traverse=require('@babel/traverse').default;
const INTERACTIVE=/^(button|a|summary)$/;
const path=require('node:path');
let STR={};try{STR=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../ui_strings.js'),'utf8'));}catch(_){}
const lookup=k=>{const v=k.split('.').reduce((a,p)=>a&&a[p],STR);return typeof v==='string'?v:null;};
const norm=x=>String(x||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\{[^}]*\}/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
// Resolve the English visible text of JSX children; null when any part is dynamic.
function visibleEnglish(children){
 const parts=[];let dynamic=false;
 const text=n=>{
  if(!n)return;
  if(n.type==='JSXText'){parts.push(n.value);return;}
  if(n.type==='StringLiteral'){parts.push(n.value);return;}
  if(n.type==='JSXExpressionContainer'){if(n.expression.type!=='JSXEmptyExpression')text(n.expression);return;}
  if(n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.callee.name==='t'&&n.arguments[0]&&n.arguments[0].type==='StringLiteral'){const v=lookup(n.arguments[0].value);if(v!=null)parts.push(v);else if(n.arguments[1]&&n.arguments[1].type==='StringLiteral')parts.push(n.arguments[1].value);else dynamic=true;return;}
  if(n.type==='LogicalExpression'&&n.operator==='||'){const before=parts.length;text(n.left);if(parts.length===before&&!dynamic)text(n.right);return;}
  if(n.type==='LogicalExpression'&&n.operator==='&&'){dynamic=true;return;}
  if(n.type==='JSXElement'){const o=n.openingElement;const hidden=o.attributes.some(a=>a.type==='JSXAttribute'&&a.name&&(a.name.name==='aria-hidden'||(a.name.name==='className'&&a.value&&a.value.type==='StringLiteral'&&/\bsr-only\b/.test(a.value.value))));if(hidden)return;if(o.name.type==='JSXIdentifier'&&/^[A-Z]/.test(o.name.name))return;n.children.forEach(text);return;}
  if(n.type==='JSXFragment'){n.children.forEach(text);return;}
  dynamic=true;
 };
 children.forEach(text);
 return dynamic?null:parts.join(' ');
}
function hasVisibleText(children){
 const textish=n=>{
  if(!n)return false;
  if(n.type==='JSXText')return /\p{L}{2,}/u.test(n.value);
  if(n.type==='StringLiteral'||n.type==='TemplateLiteral')return true;
  if(n.type==='JSXExpressionContainer')return textish(n.expression);
  if(n.type==='CallExpression'){const c=n.callee;return (c.type==='Identifier'&&c.name==='t')||(c.type==='MemberExpression'&&c.property&&c.property.name==='t');}
  if(n.type==='LogicalExpression')return n.operator==='&&'?false:(textish(n.left)||textish(n.right));
  if(n.type==='ConditionalExpression')return textish(n.consequent)&&textish(n.alternate);
  if(n.type==='JSXElement'){const nm=n.openingElement.name;if(nm.type==='JSXIdentifier'&&/^(span|strong|b|em|div|p)$/.test(nm.name)){const hidden=n.openingElement.attributes.some(a=>a.type==='JSXAttribute'&&a.name&&(a.name.name==='aria-hidden'||(a.name.name==='className'&&a.value&&a.value.type==='StringLiteral'&&/\bsr-only\b/.test(a.value.value))));const cls=n.openingElement.attributes.find(a=>a.type==='JSXAttribute'&&a.name&&a.name.name==='className');const responsiveHidden=cls&&cls.value&&(cls.value.type==='StringLiteral'?/(^|\s)hidden(\s|$)/.test(cls.value.value):true);return !hidden&&!responsiveHidden&&n.children.some(textish);}return false;}
  if(n.type==='JSXFragment')return n.children.some(textish);
  return false;
 };
 return children.some(textish);
}
function scan(src,file){
 const ast=parser.parse(src,{sourceType:'unambiguous',plugins:['jsx'],errorRecovery:true});
 const hits=[];
 traverse(ast,{JSXElement(p){
  const o=p.node.openingElement;if(o.name.type!=='JSXIdentifier'||!INTERACTIVE.test(o.name.name))return;
  const attr=o.attributes.find(a=>a.type==='JSXAttribute'&&a.name&&a.name.name==='aria-label');if(!attr||!attr.value||attr.value.type!=='JSXExpressionContainer')return;
  const e=attr.value.expression;
  if(!(e.type==='CallExpression'&&e.callee.type==='Identifier'&&e.callee.name==='t'&&e.arguments.length===1&&e.arguments[0].type==='StringLiteral'&&/^common\./.test(e.arguments[0].value)))return;
  if(!hasVisibleText(p.node.children))return;
  const label=lookup(e.arguments[0].value);const vis=visibleEnglish(p.node.children);
  if(label!=null&&vis!=null&&norm(vis)&&norm(label).includes(norm(vis)))return; // already satisfies 2.5.3
  hits.push({file,line:attr.loc.start.line,key:e.arguments[0].value,label,visible:vis,start:attr.start,end:attr.end});
 }});
 return hits;
}
function apply(src,hits){
 let out=src;
 for(const h of [...hits].sort((a,b)=>b.start-a.start)){
  let s=h.start,e=h.end;
  // remove the attribute and the whitespace that preceded it, keeping line structure
  while(s>0&&/[ \t]/.test(out[s-1]))s--;
  if(out[s-1]==='\n'&&/^[ \t]*\r?\n/.test(out.slice(e))){s--;}
  out=out.slice(0,s)+out.slice(e);
 }
 return out;
}
if(process.argv.includes('--selftest')){
 const src="const a=<button aria-label={t('common.generate')} onClick={go}>{t('glossary.generate')}</button>;\nconst b=<button aria-label={t('common.close')}><X size={16}/></button>;\nconst c=<button\n  aria-label={t('common.search')}\n  onClick={x}>Analyze text</button>;\nconst d=<button aria-label={t('common.read')}><span aria-hidden=\"true\">Read</span></button>;\nconst e=<button aria-label={t('common.add')}>{open && 'Add'}</button>;\nconst f=<button aria-label={t('common.copy')}><Icon/><span className=\"hidden sm:inline\">Copy all</span></button>;";
 const hits=scan(src,'selftest');
 const ok=hits.length===2&&hits[0].line===1&&hits[1].line===4;
 const fixed=apply(src,hits);const ok2=!/common\.generate|common\.search/.test(fixed)&&/common\.close/.test(fixed)&&/common\.read/.test(fixed);
 console.log(ok&&ok2?'selftest PASS':'selftest FAIL '+JSON.stringify(hits)+'\n'+fixed);process.exit(ok&&ok2?0:1);
}
const doApply=process.argv.includes('--apply');let total=0;
for(const f of process.argv.slice(2).filter(a=>!a.startsWith('--'))){
 const src=fs.readFileSync(f,'utf8');const hits=scan(src,f);if(!hits.length)continue;total+=hits.length;
 for(const h of hits)console.log(f+':'+h.line+'  '+h.key+'  label="'+h.label+'" visible="'+(h.visible==null?'(dynamic)':h.visible.replace(/\s+/g,' ').trim())+'"');
 if(doApply)fs.writeFileSync(f,apply(src,hits));
}
console.log((doApply?'removed ':'found ')+total);
