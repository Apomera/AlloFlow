const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..');
function patch(file,before,after){const p=path.join(root,file),text=fs.readFileSync(p,'utf8');if(!text.includes(before))throw Error('Missing '+file+' '+before.slice(0,70));fs.writeFileSync(p,text.replace(before,after));}
patch('applied_challenge_source.jsx',"      <details className='rounded-xl bg-slate-50 px-3 text-sm'><summary className='min-h-11 cursor-pointer font-semibold'>{tx('applied_challenge.reference.situation', 'Read the situation')}</summary><p className='pb-3 leading-relaxed text-slate-700'>{data.brief.context}</p></details>\n",'');
patch('applied_challenge_source.jsx',"    {data.plan.learningTarget && <p className='mt-2 text-sm text-slate-700'>", "    <p className='mt-2 text-sm leading-relaxed text-slate-700'>{data.brief.context}</p>\n    {data.plan.learningTarget && <p className='mt-2 text-sm text-slate-700'>");
patch('applied_challenge_source.jsx',"<p className='text-sm'>{data.brief.context}</p><p className='text-sm'>{data.brief.role}","<p className='text-sm'>{data.brief.role}");
patch('studio_response_module.js',"backupMessage || tr('local_short', 'This workspace uses device storage. Saving does not submit your work.')", "backupMessage");
patch('studio_response_module.js',"!isTeacherMode && resource.type === 'applied-challenge' && React.createElement('p'", "!isTeacherMode && resource.type === 'applied-challenge' && backupMessage && React.createElement('p'");
patch('studio_response_module.js',"tr(studentWorkStatus || 'idle', ({ saving:", "tr(resource.type === 'applied-challenge' && ['idle','saved'].includes(studentWorkStatus || 'idle') ? 'local_short' : studentWorkStatus || 'idle', ({ saving:");
fs.writeFileSync(path.join(root,'desktop/web-app/public/studio_response_module.js'),fs.readFileSync(path.join(root,'studio_response_module.js'),'utf8'));
// Exercise the actual extracted handler through the host shim, without changing host code.
patch('tests/studio_response_boundary.test.js',"  loadAlloModule('studio_response_module.js');", "  loadAlloModule('studio_response_module.js');\n  loadAlloModule('host_handlers_module.js');");
patch('tests/studio_response_boundary.test.js',"'generatedContent','_resourceMutationStateRef',body", "'generatedContent','_resourceMutationStateRef','_alloHostHandlers',body");
patch('tests/studio_response_boundary.test.js',"active,{current:{history,generatedContent:active}});", "active,{current:{history,generatedContent:active}},()=>window.AlloModules.HostHandlers({_resourceMutationStateRef:{current:{history,generatedContent:active}},setGeneratedContent:fn=>{active=fn(active);},setHistory:fn=>{history=fn(history);}}));");
patch('tests/applied_challenge.test.js','expect(data.schemaVersion).toBe(7);','expect(data.schemaVersion).toBe(8);');
patch('tests/applied_challenge_interaction.test.js',"expect(host.textContent).toContain('1 of 10 sections started');", "expect(host.textContent).toContain('Build · Step 3 of 5');");
patch('reports/applied-problem-solving-review-2026-09-12/pass8-browser.cjs',"Object.values(window.reviewResponses)[0].studio.evidenceLedger.length", "(Object.values(window.reviewResponses)[0].studio.evidenceLedger || []).length");
// In the fallback catalog-free fixture, use the same accurate device-storage status.
patch('studio_response_module.js',"({ saving: 'Saving…', saved: 'Saved on this device'", "({ saving: 'Saving…', saved: resource.type === 'applied-challenge' ? 'Saved on this device · Not submitted' : 'Saved on this device'");
patch('studio_response_module.js',"idle: 'Learner workspace'", "idle: resource.type === 'applied-challenge' ? 'Work stays on this device · Not submitted' : 'Learner workspace'");
// Use distinct saved/idle keys so a save is never claimed before it completes.
patch('studio_response_module.js',"? 'local_short' : studentWorkStatus", "? (studentWorkStatus === 'saved' ? 'local_saved' : 'local_idle') : studentWorkStatus");
fs.writeFileSync(path.join(root,'desktop/web-app/public/studio_response_module.js'),fs.readFileSync(path.join(root,'studio_response_module.js'),'utf8'));
const catalogPath=path.join(root,'ui_strings.js'),catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));catalog.studio_response.local_saved='Saved on this device · Not submitted';catalog.studio_response.local_idle='Work stays on this device · Not submitted';
const encoded=JSON.stringify(catalog,null,2)+'\n';fs.writeFileSync(catalogPath,encoded);fs.writeFileSync(path.join(root,'desktop/web-app/public/ui_strings.js'),encoded);
console.log('Reduced repeated mobile context and aligned existing tests with current host and progress UI.');
