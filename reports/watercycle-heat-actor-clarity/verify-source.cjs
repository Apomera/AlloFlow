'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'../..'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const {parse}=require(path.join(repo,'node_modules/acorn'));
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'presentation-changes.json'))),candidate=fs.readFileSync(path.join(__dirname,'candidate-runtime.js')),baseline=fs.readFileSync(path.join(repo,'reports/watercycle-groundwater-workspace/candidate-runtime.js'));
const assert=(pass,message)=>{if(!pass)throw Error(message);};
assert(hash(candidate)===manifest.sourceSha256&&hash(baseline)===manifest.baselineSha256&&manifest.baselineSha256==='f5f50bac94b15e51a47c2cd9af88feed37469820e452cd48ba933ba5f140ac83','Runtime hashes differ');
assert(manifest.changes.map(item=>item.id).join(',')==='heat-actor-styles,heat-actor-renderer','Slice boundaries changed');
let restored=candidate.toString();for(const item of manifest.changes){assert(restored.includes(item.replacement)&&restored.indexOf(item.replacement)===restored.lastIndexOf(item.replacement),'Nonunique slice');restored=restored.replace(item.replacement,item.original);}assert(Buffer.from(restored).equals(baseline),'Change outside presentation slices');new Function(candidate.toString());
function calls(text){const result=[],pending=[parse(text,{ecmaVersion:'latest'})];while(pending.length){const node=pending.pop();if(!node||typeof node!=='object')continue;if(node.type==='CallExpression')result.push({node,text:text.slice(node.start,node.end)});for(const value of Object.values(node))if(Array.isArray(value))pending.push(...value);else if(value&&typeof value==='object')pending.push(value);}return result;}
const renderer=manifest.changes[1],svg=text=>calls(text).filter(({node})=>node.callee.type==='MemberExpression'&&node.callee.object.name==='React'&&node.callee.property.name==='createElement'&&node.arguments[0]?.value==='svg').map(item=>item.text);
assert(svg(renderer.original).length===1&&JSON.stringify(svg(renderer.original))===JSON.stringify(svg(renderer.replacement)),'Latent heat arrow changed');
assert(calls(renderer.replacement).every(({node})=>node.callee.name==='heatActor'||node.callee.type==='MemberExpression'&&node.callee.object.name==='React'&&node.callee.property.name==='createElement'),'Renderer calls a non-presentation function');
if(process.argv.includes('--installed'))for(const file of ['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js'])assert(hash(fs.readFileSync(path.join(repo,file)))===manifest.sourceSha256,'Installed copy differs');
console.log(JSON.stringify({successful:true,sourceSha256:manifest.sourceSha256,restoredBaselineSha256:hash(Buffer.from(restored)),presentationSlices:2,unchangedHeatArrow:true,presentationCallsOnly:true}));
