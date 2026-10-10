const fs = require('node:fs');
const path = require('node:path');
const base = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-technique-roadmap-2026-10-06';
const run = process.argv[2] || 'roadmap-8';
const captures = path.join(base, run, 'captures');
if (!fs.existsSync(captures)) { console.log(JSON.stringify({run, ready:false})); process.exit(0); }
const files = fs.readdirSync(captures).filter(name => name.endsWith('-axe.json')).sort();
const audit = files.map(name => {
  const raw = JSON.parse(fs.readFileSync(path.join(captures,name),'utf8'));
  return {file:name, violations:raw.violations, incomplete:raw.incomplete.map(rule => ({id:rule.id,nodes:rule.nodes.map(node=>({target:node.target,html:node.html,checks:[...node.any,...node.all,...node.none].map(check=>({id:check.id,data:check.data,message:check.message}))}))})),headingOrderPassed:raw.passes.some(rule=>rule.id==='heading-order')};
});
const incompleteNodes = [...new Map(audit.flatMap(report=>report.incomplete.flatMap(rule=>rule.nodes.map(node=>[JSON.stringify({id:rule.id,...node}),{id:rule.id,...node}])))).values()];
const metrics = fs.readdirSync(captures).filter(name=>name.endsWith('-proof.json')&&!name.startsWith('native')).map(name=>{
  const proof=JSON.parse(fs.readFileSync(path.join(captures,name),'utf8'));
  return {file:name, keys:Object.keys(proof), collapsed:proof.collapsed,expanded:proof.expanded};
});
console.log(JSON.stringify({run,auditCount:audit.length,violationCount:audit.reduce((count,report)=>count+report.violations.length,0),allHeadingOrderPassed:audit.every(report=>report.headingOrderPassed),incompleteNodes,metrics},null,2));
