const fs = require('node:fs');
const file = 'view_pdf_audit_source.jsx';
const before = fs.readFileSync(file, 'utf8');
let matches = 0;
const after = before.replace(/^( +)humanEditsAdopted: Number\(project\.humanEditsAdopted\) \|\| 0,(\r?\n)      (candidateRejectionCount:[^\r\n]+)(\r?\n)      (candidateRejections:[^\r\n]+)/gm,
  (_, indent, nl1, count, nl2, entries) => { matches++; return indent + 'humanEditsAdopted: Number(project.humanEditsAdopted) || 0,' + nl1 + indent + count + nl2 + indent + entries; });
if (matches !== 2 || fs.readFileSync(file, 'utf8') !== before) throw new Error('Projection source changed');
fs.writeFileSync(file, after);
console.log('Aligned the two project import projections.');
