'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),label=process.argv[2]||'candidate';
const source=label==='current'?'AlloFlowANTI.txt':`reports/classroom-deep-enhancements-2026-10-03/${label==='baseline'?'source-before-r2':'candidate'}/AlloFlowANTI.txt`;
const relative='reports/classroom-deep-enhancements-2026-10-03/';
const jobs=[
 {name:'student-rtc',args:[relative+'student-rtc.cjs',source,relative+'student-'+label+'.json']},
 {name:'teacher',args:[relative+'connection-audit/teacher-connection.node.cjs',source,label+'-final']},
 {name:'student-poll-drain',args:[relative+'student-poll.cjs',source,relative+'student-poll-'+label+'.json']},
 {name:'response-isolation',args:[relative+'recovery-audit/workspace-response-isolation.node.cjs'],env:{ALLO_RECOVERY_AUDIT_SOURCE:path.resolve(root,source)}}
];
const before=crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,source))).digest('hex'),results=[];
for(const job of jobs){const p=cp.spawnSync(process.execPath,job.args,{cwd:root,env:{...process.env,...job.env},encoding:'utf8',windowsHide:true,timeout:30000});fs.writeFileSync(path.join(__dirname,job.name+'-'+label+'.log'),p.stdout+p.stderr);if(job.name==='response-isolation'&&p.stdout.trim().startsWith('{'))fs.writeFileSync(path.join(__dirname,'responses-'+label+'.json'),p.stdout);results.push({name:job.name,exitCode:p.status,error:p.error?.message||null});console.log(JSON.stringify(results.at(-1)));}
const after=crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,source))).digest('hex');
const result={label,source,beforeSha256:before,afterSha256:after,stable:before===after,passed:before===after&&results.every(r=>r.exitCode===0),completedAt:new Date().toISOString(),jobs:results};fs.writeFileSync(path.join(__dirname,'run-'+label+'.json'),JSON.stringify(result,null,2)+'\n');if(!result.passed)process.exitCode=1;
