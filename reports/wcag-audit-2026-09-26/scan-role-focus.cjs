// WCAG 2.1.1: non-native elements given an interactive ARIA role must be focusable.
// Lists JSX <div|span|li|...> with role=button|link|tab|checkbox|switch|radio|menuitem|option|slider
// that have no tabIndex attribute (roving-tabindex widgets set it explicitly, even when -1).
const fs=require('node:fs');const parser=require('@babel/parser');const traverse=require('@babel/traverse').default;
const ROLES=/^(button|link|tab|checkbox|switch|radio|menuitem|menuitemcheckbox|menuitemradio|slider|spinbutton|treeitem)$/;
let out=[];
for(const f of process.argv.slice(2)){const src=fs.readFileSync(f,'utf8');let ast;try{ast=parser.parse(src,{sourceType:'unambiguous',plugins:['jsx'],errorRecovery:true});}catch(e){continue;}
traverse(ast,{JSXOpeningElement(p){const n=p.node.name;if(n.type!=='JSXIdentifier'||/^[A-Z]/.test(n.name)||/^(button|a|input|select|textarea|summary)$/.test(n.name))return;
const at=Object.fromEntries(p.node.attributes.filter(a=>a.type==='JSXAttribute'&&a.name).map(a=>[a.name.name,a]));
const r=at.role;if(!r||!r.value||r.value.type!=='StringLiteral'||!ROLES.test(r.value.value))return;
if(at.tabIndex||at['aria-disabled']||at['aria-hidden'])return;
if(p.node.attributes.some(a=>a.type==='JSXSpreadAttribute'))return;
out.push(f+':'+p.node.loc.start.line+' <'+n.name+' role="'+r.value.value+'">');}});}
console.log(out.join('\n'));console.log('count',out.length);
