const fs=require('fs'),path=require('path'),file=path.join(__dirname,'finalize.cjs');
let text=fs.readFileSync(file,'utf8');
const start=text.indexOf("fs.writeFileSync(path.join(report,'README.md'),"),end=text.indexOf('const handoffPath=',start);
if(start<0||end<0)throw Error('Missing report block');
text=text.slice(0,start)+`fs.writeFileSync(path.join(report,'README.md'),fs.readFileSync(path.join(__dirname,'report-template.md'),'utf8').replaceAll('{{gradientNodes}}',String(audit.reviewedGradientNodes)).replaceAll('{{minimumContrast}}',audit.minimumGradientRatio.toFixed(2)).replaceAll('{{protectedFiles}}',String(Object.keys(baseline.protected).length)));\n`+text.slice(end);
text=text.replace(".filter(n=>n.endsWith('.cjs'))",".filter(n=>n.endsWith('.cjs')||n==='report-template.md')").replace('All13 receipt','All 13 receipt').replace('or18px','or 18px').replace('selection;178','selection; 178');
fs.writeFileSync(file,text);
console.log('Report helper uses the readable report template.');
