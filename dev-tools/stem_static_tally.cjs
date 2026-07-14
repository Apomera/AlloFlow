#!/usr/bin/env node
// stem_static_tally.cjs — reuse the codemod's classifier to count STATIC
// module-level user-facing strings still unwrapped, per tool + by bucket, and
// flag how many sit under label/name/title keys (logic-key risk) vs prose
// buckets (desc/fact/explanation/etc — usually display-safe).
'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ROOT = path.resolve(__dirname, '..');
const STEM = path.join(ROOT, 'stem_lab');
const UI_KEYS = new Set(['label','title','name','desc','description','hint','message','tooltip','heading','subheading','subtitle','caption','placeholder','arialabel','aria-label','alt','goal','fact','question','answer','instruction','instructions','explanation','feedback','summary','note','tip','cta','buttontext','text','content','prompt_label','header','footer','body','intro','detail','details','prompt']);
const RISKY = new Set(['label','name','title','id']); // often used as logic keys
const AI_CONTENT = /\b(You are |Do NOT |Reply with|Return ONLY|Respond with|strict JSON|as a JSON|age-appropriate|Use age|Output only)\b/;
function looksLikeNL(s){s=s.trim();if(s.length<3)return false;if(/^[#]?[0-9a-fA-F]{3,8}$/.test(s))return false;if(/^(https?:|\/|\.\/|data:|mailto:|#)/.test(s))return false;if(/\.(js|jsx|css|png|svg|json|jpe?g|gif|mp3|wav|webp|woff2?)$/i.test(s))return false;if(/^[A-Z0-9_]+$/.test(s))return false;if(/^\d+(\.\d+)?(px|em|rem|%|vh|vw|s|ms|deg|x)?$/.test(s))return false;if(/^[a-z][a-zA-Z0-9]*$/.test(s)&&!s.includes(' '))return false;if(/^[a-z0-9-]+$/.test(s)&&!s.includes(' '))return false;if(/[A-Za-z]{2,}[A-Z]/.test(s)&&!s.includes(' '))return false;if(s.includes(' '))return true;return /^[A-Z][a-z]+$/.test(s)&&s.length>=4;}
function calleeName(c){if(!c)return '';if(c.type==='Identifier')return c.name;if(c.type==='MemberExpression')return (c.property&&(c.property.name||c.property.value))||'';return '';}

const tools = fs.readdirSync(STEM).filter(f=>/^stem_tool_.+\.js$/.test(f));
let grand=0, riskyTot=0, proseTot=0; const perTool=[];
for (const f of tools){
  const code=fs.readFileSync(path.join(STEM,f),'utf8');
  let ast; try{ast=parser.parse(code,{sourceType:'script',allowReturnOutsideFunction:true,errorRecovery:true,ranges:true});}catch(e){continue;}
  // find render body range (anchored on registerTool)
  let rs=-1,re=-1;
  function isFn(n){return n&&/FunctionExpression|ArrowFunctionExpression/.test(n.type);}
  traverse(ast,{CallExpression(p){if(rs>=0)return;const c=p.node.callee;if(c&&c.type==='MemberExpression'&&c.property&&c.property.name==='registerTool'){const o=p.node.arguments[1];if(o&&o.type==='ObjectExpression')for(const pr of o.properties){const k=pr.key&&(pr.key.name||pr.key.value);if(k==='render'){const fn=pr.type==='ObjectMethod'?pr:(isFn(pr.value)?pr.value:null);if(fn&&fn.body){rs=fn.body.start;re=fn.body.end;}}}}}});
  let n=0,risky=0,prose=0;
  traverse(ast,{StringLiteral(p){const node=p.node,par=p.parent,val=node.value;
    if(par&&par.type==='CallExpression'&&par.arguments[0]===node){const cn=calleeName(par.callee);if(cn==='t'||cn==='ts'||cn==='__alloT')return;}
    if(AI_CONTENT.test(val))return;
    let uf=false,bucket=null;
    if(par&&par.type==='CallExpression'){const cn=calleeName(par.callee);if(['createElement','h','jsx','jsxs'].includes(cn)&&par.arguments.indexOf(node)>=2&&looksLikeNL(val)){uf=true;bucket='_text';}}
    if(!uf&&par&&par.type==='ObjectProperty'&&par.value===node){const k=String((par.key&&(par.key.name||par.key.value))||'').toLowerCase();if(UI_KEYS.has(k)&&looksLikeNL(val)){uf=true;bucket=k;}}
    if(!uf)return;
    const isStatic=!(node.start>rs&&node.end<re)||rs<0;
    if(!isStatic)return;
    n++; if(bucket&&RISKY.has(bucket))risky++; else prose++;
  }});
  if(n>0){perTool.push({tool:f.replace(/^stem_tool_|\.js$/g,''),n,risky,prose});grand+=n;riskyTot+=risky;proseTot+=prose;}
}
perTool.sort((a,b)=>b.n-a.n);
console.log('STATIC module-level user-facing strings still unwrapped:');
console.log('  TOTAL '+grand+'  (risky label/name/title/id: '+riskyTot+' | prose desc/fact/etc: '+proseTot+')');
console.log('  tools with static strings: '+perTool.length);
console.log('\nTop 20 tools:');
for(const r of perTool.slice(0,20)) console.log('  '+r.tool.padEnd(22)+'static='+String(r.n).padEnd(6)+'risky='+String(r.risky).padEnd(6)+'prose='+r.prose);
