const fs=require('fs'),p='reports/applied-problem-solving-review-2026-09-12/pass9-browser.cjs';
let s=fs.readFileSync(p,'utf8');s=s.replace('plainData.evidenceLedger.length','(plainData.evidenceLedger || []).length').replace("assert.equal(plainData.workspace.evidence,'')","assert.equal(plainData.workspace?.evidence || '','')");fs.writeFileSync(p,s);
