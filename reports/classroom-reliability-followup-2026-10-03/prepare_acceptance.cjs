'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const prior = path.resolve(__dirname, '../classroom-reliability-2026-10-01/accessibility/acceptance.cjs');
let source = fs.readFileSync(prior, 'utf8');
source = source.replaceAll('reports/classroom-reliability-2026-10-01/accessibility', 'reports/classroom-reliability-followup-2026-10-03/accessibility');
const marker = '// Compile as the original module so relative resolution and __dirname remain';
assert.equal(source.split(marker).length, 2);
const addition = String.raw`
// Use actual initial hydration and current save effects. The predecessor runner
// preloaded work and forced readiness; neither bypass is used in this follow-up.
replaceSection("const saveCode = between(", "\n// Submission now lives in the canonical HostHandlers source,", \`
const hostEffects=[];
require('@babel/traverse').default(ast,{CallExpression(p){
 if(p.node.callee.type==='Identifier'&&p.node.callee.name==='useEffect'&&p.parentPath.isExpressionStatement())hostEffects.push(anti.slice(p.parentPath.node.start,p.parentPath.node.end));
}});
const uniqueEffect=(list,label)=>{assert.equal(list.length,1,label);return list[0];};
const studentSave=uniqueEffect(hostEffects.filter(s=>s.includes('allo_student_work')&&s.includes('setStudentWorkStatus')&&!s.includes('initLocalData')),'actual learner autosave');
const studentHydrate=uniqueEffect(hostEffects.filter(s=>s.includes('allo_student_work')&&s.includes('initLocalData')),'actual learner hydration');
const studentRegion=between('  const [studentResponses, setStudentResponses] =','  const generationViewOwnerRef =');
const stateAst=require('@babel/parser').parse(studentRegion,{sourceType:'script'});
const studentState=stateAst.program.body.filter(n=>n.type==='VariableDeclaration').map(n=>studentRegion.slice(n.start,n.end)).join('\\n');
const saveCode=studentState+'\\nconst localDataHydrationGenerationRef=useRef(0);\\n'+studentSave+'\\n'+studentHydrate;
const gateNodes=ast.program.body.filter(n=>n.type==='FunctionDeclaration'&&n.id?.name==='_alloShouldSuppressLearnerDeviceStorage');
assert.equal(gateNodes.length,1,'canonical learner storage gate');
const storageGateCode=anti.slice(gateNodes[0].start,gateNodes[0].end);
\`);
replaceOnce('window.preloaded=await storageDB.get(\'allo_student_work\');','');
replaceOnce('const isTeacherMode=false,showStudentEntry=false;const _alloShouldSuppressLearnerDeviceStorage=()=>false;',
 'const isTeacherMode=false,showStudentEntry=false,activeSessionCode=null,lzLoaded=true,isStorageDisabled=false;const inputText="Synthetic learner fixture";const _alloHasAnyStudentEntry=()=>false,_alloMbBridgeActive=()=>false;const setGlobalPoints=()=>{},setPointHistory=()=>{},setHasSavedAdventure=()=>{},addToast=()=>{},t=k=>k;\${storageGateCode}');
replaceOnce(' const review=await teacher.evaluate(async()=>{', \`
 await student.waitForFunction(()=>window.currentWork?.studentWorkStatus==='saved');
 const learnerPersistence=await student.evaluate(async()=>{
  const restored=await storageDB.get('allo_student_work',{throwOnError:true,localOnly:true});
  return {status:currentWork.studentWorkStatus,strictNativeReadbackMatches:JSON.stringify(restored)===JSON.stringify(currentWork.studentResponses),resourceCount:Object.keys(restored||{}).length,hydration:'actual production effect, no preload or forced readiness'};
 });
 assert.equal(learnerPersistence.status,'saved');assert(learnerPersistence.strictNativeReadbackMatches);assert.equal(learnerPersistence.resourceCount,2);
 const review=await teacher.evaluate(async()=>{
\`);
replaceOnce(' const report={passed:true,completedAt:new Date().toISOString(),teacherSave,',' const report={passed:true,completedAt:new Date().toISOString(),teacherSave,learnerPersistence,');

`;
// Unescape the nested template delimiters while preserving upstream code escapes.
source = source.replace(marker, addition.replaceAll('\\`', '`') + marker);
const out = path.join(__dirname, 'accessibility'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'acceptance.cjs'), source, { flag: 'wx' });
console.log('Prepared native learner acceptance with actual hydration.');
