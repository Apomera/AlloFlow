const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const work=__dirname,original=fs.readFileSync(path.join(work,'verify-patient-wrist-finish.cjs'),'utf8');
const start=original.indexOf('function normals('),end=original.indexOf('function dispose(',start);assert(start>0&&end>start);
let next=original.slice(0,start)+fs.readFileSync(path.join(work,'palm-check-functions.txt'),'utf8')+original.slice(end);
next=next.replace("path.join(__dirname,'geometry-contract')","path.join(__dirname,'geometry-contract-palm')");
const mutationStart=next.indexOf("const mutations=[{type:'omit-patient-wrist-blend'"),mutationEnd=next.indexOf(';for(const mutation of mutations)',mutationStart);assert(mutationStart>0&&mutationEnd>mutationStart);
next=next.slice(0,mutationStart)+fs.readFileSync(path.join(work,'palm-check-mutations.txt'),'utf8').trim()+next.slice(mutationEnd);
next=next.replace('candidate.replace(marker,mutation.replacement)','candidate.replace(mutation.old,mutation.replacement)');
new Function(next);fs.writeFileSync(path.join(work,'verify-patient-wrist-palm.cjs'),next);console.log('Wrote revised independent palm/root CPU checker draft; no verification run yet.');
