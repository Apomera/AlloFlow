const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),mode=process.argv[2],cases={
'unit-context':'tests/solar_system_activity_context.test.js',
'unit-shortcuts':'tests/solar_system_activity_shortcuts.test.js',
'unit-navigation':'tests/solar_system_activity_navigation.test.js',
'unit-discovery':'tests/solar_system_investigation_discovery.test.js',
'unit-signal':'tests/solar_system_signal_delay_lab.test.js',
'unit-inspection':'tests/solar_system_signal_inspection.test.js',
'unit-gravity':'tests/solar_system_gravity_drop_lab.test.js'};
const previousExit=path.join(__dirname,mode+'-exit.json');
if(fs.existsSync(previousExit)&&JSON.parse(fs.readFileSync(previousExit,'utf8')).status!==0){for(const suffix of ['exit.json','log.txt','results.json']){const previous=path.join(__dirname,mode+'-'+suffix);if(fs.existsSync(previous))fs.copyFileSync(previous,path.join(__dirname,mode+'-previous-failure-'+suffix));}}
const sourceSha256=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'stem_lab/stem_tool_solarsystem.js'))).digest('hex');
const args=cases[mode]?['node_modules/vitest/vitest.mjs','run','--config=reports/solar-activity-context-enhancement-2026-10-09/unit.vitest.config.mjs',cases[mode]]:mode==='visual'?[path.join(__dirname,'visual-qa.cjs')]:null;if(!args)throw Error('Unknown mode');
fs.writeFileSync(path.join(__dirname,mode+'-source.json'),JSON.stringify({sourceSha256,startedAt:new Date().toISOString()},null,2));
for(const name of[mode+'-exit.json',mode==='visual'?'visual-results.json':mode+'-results.json']){const stale=path.join(__dirname,name);if(fs.existsSync(stale))fs.unlinkSync(stale);}
const log=path.join(__dirname,mode+'-log.txt'),fd=fs.openSync(log,'w');
const result=spawnSync(process.execPath,args,{cwd:root,windowsHide:true,stdio:['ignore',fd,fd],env:{...process.env,SOLAR_UNIT_CASE:mode,NODE_OPTIONS:'--max-semi-space-size=1 --max-old-space-size='+(mode==='visual'?'256':'192')}});
fs.closeSync(fd);console.log(fs.readFileSync(log,'utf8').slice(-16000));fs.writeFileSync(path.join(__dirname,mode+'-exit.json'),JSON.stringify({sourceSha256,status:result.status,error:result.error?.message,finishedAt:new Date().toISOString()},null,2));process.exitCode=result.status??1;
