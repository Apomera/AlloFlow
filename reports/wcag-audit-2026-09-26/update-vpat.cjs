// Applies the September 26, 2026 follow-up to VPAT-2.5-WCAG-AlloFlow.md: dates, scope,
// evidence methods, per-criterion remarks and revision history. Ratings are unchanged.
const fs=require('fs');const P='VPAT-2.5-WCAG-AlloFlow.md';let s=fs.readFileSync(P,'utf8');
const must=(a,b)=>{if(!s.includes(a))throw Error('missing: '+a.slice(0,80));s=s.replace(a,b);};
must('| **Report date** | September 19, 2026 (America/New_York) |','| **Report date** | September 26, 2026 (America/New_York) |');
must('| **Report status** | Interim vendor self-assessment; supersedes the September 12, 2026 v1.5 assessment |','| **Report status** | Interim vendor self-assessment; supersedes the September 19, 2026 v1.6 assessment |');
must('| **Evaluation methods** | September 19:','| **Evaluation methods** | September 26: axe-core 4.12.1 WCAG 2.2 A/AA sweep of 285 product HTML pages at 1280 and 320 CSS pixels; keyboard walks of the loaded teacher workspace in light, dark and high-contrast themes and at 320px; every Learning Tools and Educator Tools entry opened and audited; interaction-depth sweep of all 220 STEM and SEL tools the app loads, in light and dark themes; a runtime Label-in-Name check; source-wide AST scans for generic accessible names, prohibited names and click-only elements; a new mutation-verified regression gate. September 19:');
must('The [September 19 follow-up](reports/wcag-audit-2026-09-19/README.md) records the current v1.6 sample and repairs.','The [September 26 enhancement pass](reports/wcag-audit-2026-09-26/README.md) records the newest evidence and repairs. The [September 19 follow-up](reports/wcag-audit-2026-09-19/README.md) records the earlier v1.6 sample and repairs.');
must('The [September v1.5 assessment](docs/accessibility/archive/AlloFlow-ACR-v1.5-2026-09-12.md),','The [September 19 v1.6 assessment](docs/accessibility/archive/AlloFlow-ACR-v1.6-2026-09-19.md), [September v1.5 assessment](docs/accessibility/archive/AlloFlow-ACR-v1.5-2026-09-12.md),');
must('The current v1.5 assessment records','The current v1.6 assessment records');
must('See the [September audit evidence](reports/wcag-audit-2026-09-12/README.md) for failed assertions','See the [September 26 evidence](reports/wcag-audit-2026-09-26/README.md) and the [September 12 audit](reports/wcag-audit-2026-09-12/README.md) for failed assertions');
const remarks=JSON.parse(fs.readFileSync(__dirname+'/vpat-remarks.json','utf8'));
for(const [id,text] of Object.entries(remarks)){
 const re=new RegExp('(^\\| \\*\\*'+id.replace(/\./g,'\\.')+' [^*]+\\*\\* \\| (?:Partially Supports|Not Applicable) \\| )','m');
 if(!re.test(s))throw Error('row '+id);s=s.replace(re,(m,p)=>p+text+' ');}
must('| September 12, 2026 | 1.5 interim |','| September 26, 2026 | 1.6 interim | Added the September 26 enhancement pass: repaired Label-in-Name overrides, prohibited and missing roles, keyboard-inaccessible controls, contrast, reflow and focus defects across the app, tools and standalone pages; recorded evidence and limits; ratings unchanged. |\n| September 19, 2026 | 1.6 interim | Updated to v1.6 release metadata; recorded sidebar, History, scroll-region, search and contrast repairs with dated evidence. |\n| September 12, 2026 | 1.5 interim |');
fs.writeFileSync(P,s);console.log('VPAT updated');
