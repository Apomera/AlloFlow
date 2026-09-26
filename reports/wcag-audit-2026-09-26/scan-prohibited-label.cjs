// ARIA 1.2: aria-label/aria-labelledby are prohibited on generic elements
// (div/span/p without a role); assistive technology ignores the name.
const fs=require('node:fs');const parser=require('@babel/parser');const traverse=require('@babel/traverse').default;
const out=[];
for(const f of process.argv.slice(2)){const src=fs.readFileSync(f,'utf8');let ast;try{ast=parser.parse(src,{sourceType:'unambiguous',plugins:['jsx'],errorRecovery:true});}catch(e){continue;}
traverse(ast,{JSXOpeningElement(p){const n=p.node.name;if(n.type!=='JSXIdentifier'||!/^(div|span|p|b|i|strong|em|small)$/.test(n.name))return;
const names=p.node.attributes.filter(a=>a.type==='JSXAttribute'&&a.name).map(a=>a.name.name);
if(!(names.includes('aria-label')||names.includes('aria-labelledby')))return;
if(names.includes('role')||names.includes('tabIndex')||names.includes('id')&&false)return;
if(p.node.attributes.some(a=>a.type==='JSXSpreadAttribute'))return;
const el=p.parent;const kids=el.children.filter(c=>!(c.type==='JSXText'&&!c.value.trim()));const kinds=kids.map(c=>c.type==='JSXElement'?'E':c.type==='JSXText'?'T':'X').join('');out.push(f+':'+p.node.loc.start.line+' <'+n.name+'> kids='+kinds+'  '+src.slice(el.start,Math.min(el.end,el.start+170)).replace(/\s+/g,' '));}});}
console.log(out.join('\n'));console.log('count',out.length);
