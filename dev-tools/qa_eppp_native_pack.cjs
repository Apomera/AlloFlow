#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'test_prep_hub_module.js');
const legacyAuditPath = path.join(root, 'test_prep', 'eppp_legacy', 'content_audit.json');
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'prismflow-deploy', 'public', 'test_prep')];
const expectedChecks = ['authoritative-source', 'one-best-answer', 'distractor-quality', 'clue-resistance', 'rationale-quality', 'template-completeness', 'option-specific-feedback', 'domain-and-accessibility-review', 'provenance', 'qa-declaration'];
const authoritativeHosts = new Set([
  'aasm.org','www.aasm.org','apa.org','www.apa.org','cdc.gov','www.cdc.gov','collegeboard.org','clep.collegeboard.org','hhs.gov','www.hhs.gov','www.itl.nist.gov','www.law.cornell.edu','r-pas.org','www.gace.ets.org','www.ets.org','www.pearsonassessments.com','www.supremecourt.gov','dictionary.apa.org','digital.apa.org','www.childwelfare.gov','www.realitytherapy.eu','www.bmj.com','files.eric.ed.gov','www.ninds.nih.gov','nida.nih.gov','www.proedinc.com','proedinc.com','www.ptsd.va.gov','openstax.org','www.soarworks.samhsa.gov','us.sagepub.com','crisp.org.uiowa.edu','supreme.justia.com','law.justia.com','medlineplus.gov','training.cochrane.org','www.parinc.com','apastyle.apa.org','doi.org','europepmc.org','journals.sagepub.com','ncbi.nlm.nih.gov','nimh.nih.gov','www.nimh.nih.gov','nist.gov','www.nist.gov','ods.od.nih.gov','pmc.ncbi.nlm.nih.gov','pubmed.ncbi.nlm.nih.gov','www.ncbi.nlm.nih.gov','routledge.com','www.routledge.com','who.int','www.who.int','upress.umn.edu','www.upress.umn.edu','glasgowcomascale.org','www.glasgowcomascale.org','www.testingstandards.net','testingstandards.net','consensus.nih.gov'
]);
function loadHub(){
  if(!fs.existsSync(modulePath)) throw new Error('Build the Test Prep Hub module before running native QA.');
  const react={useState:v=>[typeof v==='function'?v():v,()=>{}],useEffect:()=>{},useRef:()=>({current:null}),createElement:()=>null,Fragment:'fragment'};
  const context=vm.createContext({console:{log(){},warn(){},error(){}},window:{React:react}});
  vm.runInContext(fs.readFileSync(modulePath,'utf8'),context,{filename:'test_prep_hub_module.js',timeout:10000});
  const hub=context.window.AlloModules&&context.window.AlloModules.TestPrepHub;
  if(!hub) throw new Error('Test Prep Hub did not register during native QA.');
  return hub;
}
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function authoritative(reference){try{const u=new URL(reference);return u.protocol==='https:'&&authoritativeHosts.has(u.hostname.toLowerCase());}catch{return false;}}
function findingsFor(item,legacyById){
  const findings=[]; const add=(check,message)=>findings.push({check,message}); const choices=Array.isArray(item.choices)?item.choices:[]; const expanded=item.expansionBatch==='native-501-1000';
  if(!item.prompt||choices.length!==4||!Number.isInteger(item.answerIndex)||item.answerIndex<0||item.answerIndex>=choices.length) add('one-best-answer','Item must have one prompt, four choices, and one valid answer key.');
  if(new Set(choices.map(norm)).size!==choices.length||choices.some(c=>norm(c).length<2)) add('distractor-quality','Choices must be distinct and substantive.');
  if(choices.some(c=>/\b(?:all|none) of the above\b/i.test(c))) add('distractor-quality','All/none-of-the-above choices are not permitted.');
  if(!Array.isArray(item.references)||!item.references.length||item.references.some(r=>!authoritative(r))) add('authoritative-source','Every item needs an approved HTTPS primary, governmental, professional, or scholarly source.');
  if(item.reviewStatus!=='source-reviewed') add('authoritative-source','Item is not marked source-reviewed.');
  if(!item.rationale||item.rationale.length<100) add('rationale-quality','Rationale must explain the answer in at least 100 characters.');
  if(Number.isInteger(item.answerIndex)&&choices[item.answerIndex]){const ls=choices.map(c=>norm(c).length),a=ls[item.answerIndex],d=Math.max(...ls.filter((_,i)=>i!==item.answerIndex));if(a>=d+20&&a>=d*1.75)add('clue-resistance','Correct choice has a severe answer-length clue.');}
  if(expanded){
    if(item.templateVersion!==2||item.type!=='single-choice'||!item.id.startsWith('eppp-v2-')) add('template-completeness','Expansion item does not use EPPP template v2.');
    if(!Array.isArray(item.choiceRationales)||item.choiceRationales.length!==4||item.choiceRationales.some(r=>r.length<20)) add('option-specific-feedback','Every expansion choice needs substantive option-specific feedback.');
    if(!Array.isArray(item.sourceDetails)||item.sourceDetails.length!==item.references.length||item.sourceDetails.some(d=>!item.references.includes(d.url)||!d.title||d.title.length<12||!d.credibility||d.credibility.length<40)) add('authoritative-source','Expansion sources need full names, matching URLs, and credibility explanations.');
    if(item.domainAlignmentStatus!=='editorial-pass'||!['automated-pass','editorial-pass-after-manual-option-review'].includes(item.clueReviewStatus)||item.biasAccessibilityStatus!=='editorial-pass') add('domain-and-accessibility-review','Expansion item lacks declared domain, clue, or bias/accessibility review.');
  }
  if(item.legacySourceId){const source=legacyById.get(item.legacySourceId);if(!source||source.sourceFile!==item.legacySourceFile)add('provenance','Legacy source ID/file does not resolve.');else{const blocking=new Set(['missing_prompt','insufficient_choices','invalid_answer_key','missing_rationale','encoding_corruption']);if(source.flags.some(f=>blocking.has(f.code)))add('provenance','Legacy source retains a blocking structural defect.');}if(item.migrationStatus!=='re-authored-source-reviewed')add('provenance','Migrated item lacks re-authored status.');}
  else if(expanded&&(!item.authoredSourceId||item.migrationStatus!=='authored-source-reviewed')) add('provenance','Source-authored replacement lacks provenance.');
  if(item.qaStatus!=='qa-passed'||!/^\d{4}-\d{2}-\d{2}$/.test(item.qaReviewedAt||'')) add('qa-declaration','Item lacks a dated native QA declaration.');
  return findings;
}
const hub=loadHub(),pack=hub.listPacks().find(x=>x.id==='eppp-part-one');if(!pack)throw new Error('Native EPPP pack not found.');
const legacy=JSON.parse(fs.readFileSync(legacyAuditPath,'utf8'));const legacyById=new Map(legacy.reviewQueue.map(x=>[x.id,x]));
const items=pack.items.map(item=>{const findings=findingsFor(item,legacyById);return{id:item.id,domainId:item.domainId,provenance:item.legacySourceId?'legacy-seeded-re-authored':item.authoredSourceId?'native-authored-source-reviewed':'native-original',legacySourceId:item.legacySourceId||null,authoredSourceId:item.authoredSourceId||null,qaStatus:findings.length?'review-required':'pass',checks:expectedChecks.map(check=>({check,status:findings.some(f=>f.check===check)?'review-required':'pass'})),findings,references:item.references};});
const packFindings=[];const answerPositions=pack.items.reduce((o,x)=>(o[x.answerIndex]=(o[x.answerIndex]||0)+1,o),{});const counts=[0,1,2,3].map(i=>answerPositions[i]||0);
if(pack.items.length!==1000)packFindings.push('Native pack must contain exactly 1,000 items.');if(Math.max(...counts)-Math.min(...counts)>1)packFindings.push('Answer positions are not balanced across A-D.');if(new Set(pack.items.map(x=>norm(x.prompt))).size!==pack.items.length)packFindings.push('Native pack contains duplicate normalized prompts.');
const expectedDomains={'biological':100,'cognitive-affective':130,'social-cultural':110,'lifespan':120,'assessment':160,'intervention':150,'research':70,'professional':160};for(const [id,target] of Object.entries(expectedDomains)){if(pack.items.filter(x=>x.domainId===id).length!==target)packFindings.push(`${id} does not match its ${target}-item target.`);}
const passedItems=items.filter(x=>x.qaStatus==='pass').length;const report={schemaVersion:2,generatedAt:new Date().toISOString(),packId:pack.id,packVersion:pack.version,standard:{label:'AlloFlow native test-prep editorial QA v2',checks:expectedChecks,meaning:'Editorial QA confirms cited answer support, one-best-answer structure, distinct distractors, clue review, explanatory and option-specific feedback where required, template integrity, accessibility review declarations, and provenance.',limitation:'Editorial QA is not psychometric calibration, official exam approval, or independent licensed-psychologist validation.'},summary:{totalItems:pack.items.length,passedItems,reviewRequiredItems:pack.items.length-passedItems,domains:pack.domains.length,answerPositions,packFindings,status:passedItems===pack.items.length&&!packFindings.length?'pass':'review-required'},items};
const markdown=`# EPPP native pack editorial QA report\n\nGenerated: ${report.generatedAt}\n\nPack: ${pack.title} v${pack.version}\n\n## Scope\n\n${report.standard.meaning}\n\n> ${report.standard.limitation}\n\n## Result\n\n| Metric | Result |\n| --- | ---: |\n| Native questions | ${report.summary.totalItems} |\n| Editorial-QA-passed questions | ${report.summary.passedItems} |\n| Questions requiring review | ${report.summary.reviewRequiredItems} |\n| Domains | ${report.summary.domains} |\n| Answer keys | A ${answerPositions[0]||0} · B ${answerPositions[1]||0} · C ${answerPositions[2]||0} · D ${answerPositions[3]||0} |\n| Overall status | ${report.summary.status.toUpperCase()} |\n\n## Item matrix\n\n| Item | Domain | Origin | Status | Sources |\n| --- | --- | --- | --- | ---: |\n${items.map(x=>`| ${x.id} | ${x.domainId} | ${x.provenance} | ${x.qaStatus} | ${x.references.length} |`).join('\n')}\n`;
for(const out of outputRoots){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'eppp_native_qa.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(out,'eppp_native_qa.md'),markdown);}
console.log(`Native EPPP editorial QA: ${passedItems}/${pack.items.length} passed; pack ${report.summary.status}.`);if(report.summary.status!=='pass'){for(const x of items.filter(x=>x.qaStatus!=='pass'))console.error(x.id+': '+x.findings.map(f=>f.check+' — '+f.message).join('; '));for(const f of packFindings)console.error('pack: '+f);process.exit(1);}
