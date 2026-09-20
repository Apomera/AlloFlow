const fs=require('fs');
const a='tests/memory_aid_export_lockstep.test.js',b='tests/memory_aid_teacher_review_flow.test.js';
let s=fs.readFileSync(a,'utf8');s=s.replace('[aria-label="[memory_aid.facts_ready]"]','[aria-label="[memory_aid.facts_region_aria]"]');fs.writeFileSync(a,s);
s=fs.readFileSync(b,'utf8');s=s.replace("expect(host.querySelector('[aria-label=\"Facts awaiting teacher review\"]')).toBeTruthy();", "expect(host.querySelector('[data-studio-review=\"facts\"]').getAttribute('aria-label')).toBe('Facts for target 1: ' + generatedCard.target);");fs.writeFileSync(b,s);
