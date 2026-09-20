const fs=require('fs'),p='reports/memory-aid-ux-review-2026-09-12/refinement-browser-qa.cjs';let s=fs.readFileSync(p,'utf8');s=s.replace("root.setAttribute('role','main');",'');fs.writeFileSync(p,s);
