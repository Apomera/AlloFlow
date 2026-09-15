const fs=require('fs');
module.exports=class {
 constructor(){this.tests=[];}
 onTestCaseResult(test){const result=test.result();this.tests.push({name:test.fullName,state:result.state,errors:(result.errors||[]).map(e=>({message:String(e.message).slice(0,1600),stack:String(e.stack||'').split('\n').filter(s=>s.includes('tests/')).slice(0,3)}))});}
 onTestRunEnd(modules,errors,reason){const counts={};for(const test of this.tests)counts[test.state]=(counts[test.state]||0)+1;const result={counts,reason,failures:this.tests.filter(t=>t.state==='failed'),errors:errors.map(e=>String(e.message).slice(0,1000))};fs.writeFileSync(process.env.ANATOMY_TEST_REPORT||'reports/anatomy-integrated-refinements-2026-09-12/tests-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
};
