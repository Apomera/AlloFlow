const fs=require('fs'),path=require('path');const base='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-technique-roadmap-2026-10-06/roadmap-11/captures';
const reports=fs.readdirSync(base).filter(f=>f.endsWith('-axe.json')).map(f=>({file:f,...JSON.parse(fs.readFileSync(path.join(base,f)))}));
const nodes=new Map();for(const r of reports)for(const i of r.incomplete)for(const n of i.nodes)nodes.set(JSON.stringify(n.target)+'::'+JSON.stringify(n.any),{rule:i.id,target:n.target,html:n.html,any:n.any,all:n.all,none:n.none});
console.log(JSON.stringify({reports:reports.map(r=>({file:r.file,violations:r.violations.length,incomplete:r.incomplete.map(i=>i.id),headingPass:r.passes.some(p=>p.id==='heading-order')})),nodes:[...nodes.values()]},null,2));
