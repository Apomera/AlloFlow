const fs=require('fs');const path=require('path');const crypto=require('crypto');
const root=path.resolve(__dirname,'../..');
const docs=['VPAT-2.5-WCAG-AlloFlow.md','a11y-audit/WCAG-2.2-current-audit.md','reports/wcag-audit-2026-09-12/README.md','reports/wcag-audit-2026-09-12/regression-triage.md','docs/accessibility-manual-test-plan.md','alloflow_wcag_aa_audit_report.md'];
const errors=[];const v=fs.readFileSync(path.join(root,docs[0]),'utf8');
const rows=[...v.matchAll(/^\| \*\*(\d\.\d\.\d+) [^*]+\*\* \| ([^|]+) \|/gm)];
if(rows.length!==55||new Set(rows.map(r=>r[1])).size!==55)errors.push('Expected 55 unique WCAG 2.2 A/AA rows');
const counts={};for(const r of rows)counts[r[2].trim()]=(counts[r[2].trim()]||0)+1;
if(counts['Partially Supports']!==53||counts['Not Applicable']!==2)errors.push('Summary counts do not match expected row ratings');
if(v.startsWith('> **Superseded'))errors.push('Current VPAT incorrectly marked archived');
for(const doc of docs){const s=fs.readFileSync(path.join(root,doc),'utf8');for(const m of s.matchAll(/\]\(([^)]+)\)/g)){const target=m[1];if(/^(?:https?:|mailto:|#)/.test(target))continue;const resolved=path.resolve(root,path.dirname(doc),target.split('#')[0]);if(!fs.existsSync(resolved))errors.push(doc+': broken link '+target);}}
const files=fs.readdirSync(__dirname).filter(n=>/\.(cjs|mjs|json|png)$/.test(n)&&n!=='document-validation.json');
const artifacts=files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex')}));
const output={checkedAt:new Date().toISOString(),criterionRows:rows.length,counts,errors,artifacts};
fs.writeFileSync(path.join(__dirname,'document-validation.json'),JSON.stringify(output,null,2));console.log(JSON.stringify({criterionRows:rows.length,counts,errors},null,2));process.exitCode=errors.length?1:0;
