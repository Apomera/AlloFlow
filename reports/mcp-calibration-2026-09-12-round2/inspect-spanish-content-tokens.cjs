const fs=require('fs'),crypto=require('crypto'),path=require('path'),{JSDOM}=require('jsdom');
const repo=process.cwd(),reportDir=path.join(repo,'reports/mcp-calibration-2026-09-12-round2'),live=path.join(repo,'mcp-testing/refinement-study/private/calibration-2026-09-12-round2/spanish-udhr-live');
const oraclePath=path.join(reportDir,'spanish-source-oracle.json'),htmlPath=path.join(live,'out/ohchr-udhr-spanish-accessible.html'),reportPath=path.join(live,'out/ohchr-udhr-spanish-remediation-report.json');
const oracle=JSON.parse(fs.readFileSync(oraclePath,'utf8')),html=fs.readFileSync(htmlPath,'utf8'),report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
const sourceExtractPath=path.join(repo,'mcp-testing/refinement-study/private/calibration-2026-09-12-round2/spanish-extract-result.json'); const sourceExtractEnvelope=JSON.parse(fs.readFileSync(sourceExtractPath,'utf8')); const sourceExtract=JSON.parse(sourceExtractEnvelope.result.content.find(x=>x.type==='text').text); const sourceText=sourceExtract.text;
const dom=new JSDOM('');global.DOMParser=dom.window.DOMParser;
const coverage=require(path.join(repo,'desktop/mcp/remediation_narration_plan.cjs')).assessSourceCoverage;
const diagnostic=new Function('return ('+coverage.toString().replace('let missingTokens=0','globalThis.__sourceTokens=source;globalThis.__outputTokens=output;let missingTokens=0')+')')();
const reproduced=diagnostic({sourceText,outputHtml:html,method:'frozen-production-extract'});
const source=global.__sourceTokens,output=global.__outputTokens,counts=new Map();for(const t of output)counts.set(t,(counts.get(t)||0)+1);
const missing=[];for(let i=0;i<source.length;i++){const t=source[i],n=counts.get(t)||0;if(n)counts.set(t,n-1);else missing.push({index:i,sourceUnit:Math.floor(i/40)+1,token:t,context:source.slice(Math.max(0,i-8),i+9).join(' ')});}
const evidence={schema:1,kind:'source-derived-content-token-investigation',createdAt:new Date().toISOString(),inputs:{source:oracle.source,oracle:{path:oraclePath,sha256:crypto.createHash('sha256').update(fs.readFileSync(oraclePath)).digest('hex')},html:{path:htmlPath,sha256:crypto.createHash('sha256').update(html).digest('hex')},report:{path:reportPath,sha256:crypto.createHash('sha256').update(fs.readFileSync(reportPath)).digest('hex')},algorithm:{path:'desktop/mcp/remediation_narration_plan.cjs',sha256:crypto.createHash('sha256').update(fs.readFileSync('desktop/mcp/remediation_narration_plan.cjs')).digest('hex')}},originalCoverage:report.contentCoverage,reproducedWithFrozenProductionExtract:reproduced,missingTokenOccurrences:missing,remainingOutputTokens:[...counts].filter(x=>x[1]>0),classification:'under-investigation; gate unchanged'};
fs.writeFileSync(path.join(reportDir,'spanish-content-token-investigation.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({reproduced,missing,remainingOutputTokens:evidence.remainingOutputTokens},null,2));dom.window.close();


