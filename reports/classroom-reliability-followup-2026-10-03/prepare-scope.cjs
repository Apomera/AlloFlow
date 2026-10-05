'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname,'../..'), prefix = 'reports/classroom-reliability-followup-2026-10-03/';
const inputs = new Set([
 'AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx',
 'allo_device_storage_module.js','desktop/web-app/public/allo_device_storage_module.js','storage_bridge.html',
 'utils_pure_source.jsx','utils_pure_module.js','desktop/web-app/public/utils_pure_module.js',
 '_build_simple_iife_module.js','read_aloud_audio_service_source.jsx',
 'read_aloud_audio_service_module.js','desktop/web-app/public/read_aloud_audio_service_module.js',
 'view_simplified_module.js','desktop/web-app/public/view_simplified_module.js',
 'desktop/web-app/node_modules/react/umd/react.development.js',
 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',
 'desktop/web-app/src/index.css','desktop/web-app/tailwind.config.js',
 'package.json','package-lock.json','desktop/web-app/package.json','desktop/web-app/package-lock.json',
 'dev-tools/studio_delivery_e2e.cjs','tests/report_storage_validation.vitest.config.js',
 'tests/report_storage_ack_recovery.test.js','tests/storage_adapter_bootstrap_readiness.test.js',
 'tests/setup.js','tests/helpers/host_source.js','tests/helpers/anchored_slice.js',
 'apps_script/session_mailbox/Code.gs','host_handlers_source.jsx','allo_command_context_source.js',
 'view_canvas_recovery_dialog_source.jsx','view_cold_path_surfaces_source.jsx','view_sidebar_panels_source.jsx',
 'view_history_panel_source.jsx','view_live_session_dock_source.jsx','view_brainstorm_source.jsx',
 'view_assignment_center_source.jsx','view_share_session_surfaces_source.jsx','view_header_source.jsx',
 'misc_handlers_source.jsx','teacher_source.jsx','live_aac_source.jsx','shared_activity_source.jsx',
 prefix+'followup.vitest.config.js',prefix+'verify-current.cjs',prefix+'accessibility/acceptance.cjs',
 prefix+'accessibility/bridge-acceptance.cjs',prefix+'release/candidate_receipt.cjs',prefix+'prepare-scope.cjs',
 prefix+'cache-coherence/applied.json',prefix+'prepare_cache_coherence.cjs',
 prefix+'core.vitest.config.js',prefix+'native.vitest.config.js',prefix+'mailbox.vitest.config.js',
]);
for (const row of JSON.parse(fs.readFileSync(path.join(root,prefix+'cache-coherence/applied.json'))).contextInputs) inputs.add(row.file);
const config=fs.readFileSync(path.join(root,prefix+'followup.vitest.config.js'),'utf8');
for(const m of config.matchAll(/'([^']+\.test\.js)'/g))inputs.add(m[1]);
for(const f of ['memory_aid','applied_challenge','studio_response','resource_read_aloud','karaoke_audio_store','live_aac','shared_activity','session_transport']) {
 inputs.add(f+'_module.js');inputs.add('desktop/web-app/public/'+f+'_module.js');
}
const queue=[...inputs];
while(queue.length) {
 const file=queue.shift();
 if(file.includes('/node_modules/')||!/[.]([cm]?js|jsx|txt)$/.test(file))continue;
 // Discover filesystem dependencies in tests and Node runners only. Browser
 // modules and the full host contain many unrelated optional fetch paths.
 if(!file.startsWith('tests/')&&!file.startsWith(prefix)&&!file.startsWith('_build'))continue;
 const source=fs.readFileSync(path.join(root,file),'utf8');
 for(const m of source.matchAll(/['"]([^'"\r\n]+\.(?:[cm]?js|jsx|txt|html|css|json))['"]/g)) {
  const value=m[1];if(value.includes('://')||value.includes('\\')||value.includes('node_modules'))continue;
  const tries=[path.resolve(root,value),path.resolve(root,path.dirname(file),value)];
  for(const candidate of tries) {
   const relative=path.relative(root,candidate).replaceAll('\\','/');
   if(relative.startsWith('../')||relative.startsWith('reports/')&&!relative.startsWith(prefix))continue;
   if(relative.startsWith(prefix)&&relative.endsWith('.json')&&!relative.endsWith('/source-before/host_lifecycle_fragments.json'))continue;
   if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile()&&!inputs.has(relative)) {inputs.add(relative);queue.push(relative);}
  }
 }
}
const pairs=[['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt'],['AlloFlowANTI.txt','desktop/web-app/src/App.jsx']];
for(const file of inputs)if(!file.startsWith('desktop/')&&inputs.has('desktop/web-app/public/'+file))pairs.push([file,'desktop/web-app/public/'+file]);
const spec={schemaVersion:1,scope:'Four follow-up classroom persistence/removal fixes, selected actual-source regressions and two synthetic native browser journeys',inputs:[...inputs].sort(),parityPairs:pairs};
fs.writeFileSync(path.join(__dirname,'release/candidate-scope.json'),JSON.stringify(spec,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({inputs:inputs.size,parityPairs:pairs.length}));
