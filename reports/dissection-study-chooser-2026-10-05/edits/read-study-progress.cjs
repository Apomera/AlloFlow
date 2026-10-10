const fs=require('fs'),path=require('path');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-study-chooser-2026-10-05';
for(const n of fs.readdirSync(root).filter(n=>/^sequence-\d+\.json$/.test(n)))console.log(n,fs.readFileSync(path.join(root,n),'utf8'));
for(const n of fs.readdirSync(root).filter(n=>/^(baseline|study|unit-main|unit-axe|tools)-\d+$/.test(n)&&(!process.argv[2]||process.argv.slice(2).includes(n)))){const p=path.join(root,n);if(fs.existsSync(path.join(p,'stdout.log')))console.log(n,fs.readFileSync(path.join(p,'stdout.log'),'utf8').slice(-4500));if(fs.existsSync(path.join(p,'stderr.log')))console.log(n+' stderr',fs.readFileSync(path.join(p,'stderr.log'),'utf8').slice(-1000));}
