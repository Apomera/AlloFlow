const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict'),vm=require('vm'),acorn=require('acorn');
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,baselineCommit='4eeb666c7';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const baseline=cp.execFileSync('git',['show',baselineCommit+':'+source],{encoding:'utf8',maxBuffer:4e6}),candidate=fs.readFileSync(source,'utf8');
function region(text){const a=text.indexOf('        function practice() {',text.indexOf('      function stationPowerLab()')),b=text.indexOf("        return card([h('details', { key: 'lab', className: 'ml-power-lab'",a);assert(a>0&&b>a);return {a,b,content:text.slice(a,b)};}
const old=region(baseline),next=region(candidate);assert.equal(candidate.slice(0,next.a)+old.content+candidate.slice(next.b),baseline);
const renderStart="          function stepHeading(";assert.equal(next.content.slice(0,next.content.indexOf(renderStart)),old.content.slice(0,old.content.indexOf(renderStart)));
function callbacks(text){const tree=acorn.parse(text,{ecmaVersion:'latest'}),items=[];function visit(node){if(!node||typeof node!=='object')return;if(['FunctionExpression','ArrowFunctionExpression'].includes(node.type))items.push(text.slice(node.start,node.end));for(const [key,value] of Object.entries(node)){if(key==='start'||key==='end')continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}}visit(tree);return items;}
const before=callbacks(old.content),after=callbacks(next.content);assert.deepEqual(after,before);assert(before.length>0);
assert.equal(candidate,fs.readFileSync(mirror,'utf8'));new vm.Script(candidate);
const proof={baselineCommit,baselineSha256:hash(baseline),sourceSha256:hash(candidate),mirrorSha256:hash(fs.readFileSync(mirror)),onlyPracticeRenderingChanged:true,skillMapAndGuideSelectionUnchanged:true,allInlineCallbacksByteIdentical:true,inlineCallbacks:before.length,sourceMirrorParity:true,syntax:true};
fs.writeFileSync(__dirname+'/source-scope.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
