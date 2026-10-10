const fs=require('fs'),path=require('path'),repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const prior=path.join(repo,'reports/dissection-study-chooser-2026-10-05/edits');
for(const [input,output]of[['cleanup-study.ps1','cleanup-view.ps1'],['verify-study-report.cjs','verify-view-report.cjs']]){
 let s=fs.readFileSync(path.join(prior,input),'utf8');
 s=s.replaceAll('dissection-study-chooser-2026-10-05','dissection-view-chooser-2026-10-06').replaceAll('.diss-study-20261005','.diss-view-20261006').replaceAll('dissection-study-chooser.spec.ts','dissection-view-chooser.spec.ts');
 s=s.replaceAll('dissection-tools-cohesion-2026-10-05','dissection-study-chooser-2026-10-05');
 fs.writeFileSync(path.join(__dirname,output),s);
}
console.log('Finish helpers prepared');
