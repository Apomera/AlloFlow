const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');const out='reports/startup-recovery-enhancements-2026-09-29',hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');const parser=require('@babel/parser');const parse=s=>parser.parse(s,{sourceType:'module',plugins:['jsx']});
function without(s,name){const ast=parse(s),node=ast.program.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));assert(node,'Missing function: '+name);return s.slice(0,node.start)+s.slice(node.end);}
const before=JSON.parse(fs.readFileSync(out+'/before.json'));
const hosts=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];for(const p of hosts)parse(fs.readFileSync(p,'utf8'));
const phase=fs.readFileSync('phase_k_helpers_source.jsx','utf8'),adventure=fs.readFileSync('adventure_handlers_source.jsx','utf8');parse(phase);parse(adventure);
const config=JSON.parse(fs.readFileSync('dev-tools/remediation_validation.json')),oldConfig=JSON.parse(fs.readFileSync(out+'/before/dev-tools/remediation_validation.json'));
const preview=JSON.parse(fs.readFileSync('C:/tmp/alloflow_dispatch/wave2/startup-recovery-2026-09-29/preview/identity.json'));
const proof=JSON.parse(fs.readFileSync(out+'/proof-results.json'));const baseline=JSON.parse(fs.readFileSync(out+'/validation-inputs-before.json'));
const checks={hostsEqual:hosts.every(p=>hash(p)===hash(hosts[0])),hostsParse:true,
 phaseKMirrorEqual:hash('phase_k_helpers_module.js')===hash('desktop/web-app/public/phase_k_helpers_module.js'),
 adventureMirrorEqual:hash('adventure_handlers_module.js')===hash('desktop/web-app/public/adventure_handlers_module.js'),
 cryptoMirrorEqual:hash('allo_crypto_module.js')===hash('desktop/web-app/public/allo_crypto_module.js'),
 surroundingPhaseKPreserved:without(phase,'executeSaveFile')===without(fs.readFileSync(out+'/before/phase_k_helpers_source.jsx','utf8'),'executeSaveFile'),
 surroundingAdventurePreserved:without(adventure,'handleStartAdventure')===without(fs.readFileSync(out+'/before/adventure_handlers_source.jsx','utf8'),'handleStartAdventure'),
 validationAdditive:oldConfig.unit.every(p=>config.unit.includes(p))&&oldConfig.identityInputs.every(p=>config.identityInputs.includes(p))&&JSON.stringify(oldConfig.browser)===JSON.stringify(config.browser),
 testsSelected:['tests/k5_save_adventure_readiness.test.js','tests/project_save_cancellation_encryption.test.js'].every(p=>config.unit.includes(p)&&config.identityInputs.includes(p)),
 fullAppUsesCurrentHost:preview.hostSha256===hash('AlloFlowANTI.txt'),
 proofInputsCurrent:Object.entries(proof.after).every(([p,h])=>hash(p)===h),proofInputsUnchanged:JSON.stringify(proof.before)===JSON.stringify(proof.after),sixProofsRejected:proof.results.length===6&&proof.results.every(p=>p.proved)};
const compiled=require('esbuild').transformSync('/* global React */\n'+phase,{loader:'jsx',format:'esm',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',target:'es2020'}).code.replace(/\/\*.*global.*\*\/\n/g,'').trim();checks.phaseKBuildCurrent=fs.readFileSync('phase_k_helpers_module.js','utf8').includes(compiled);checks.adventureBuildCurrent=fs.readFileSync('adventure_handlers_module.js','utf8').includes(adventure);
const changedDuringValidation=baseline.files.filter(f=>hash(f.path)!==f.sha256).map(f=>f.path);
const report={at:new Date().toISOString(),checks,changedDuringValidation,files:baseline.files.map(f=>({path:f.path,sha256:hash(f.path)})),preview};fs.writeFileSync(out+'/final-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks,changedDuringValidation},null,2));assert(Object.values(checks).every(Boolean),'An audit failed');assert.deepEqual(changedDuringValidation,[]);
