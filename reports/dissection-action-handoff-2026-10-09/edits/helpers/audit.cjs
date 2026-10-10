const fs=require('fs'),path=require('path'),crypto=require('crypto');
const report='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-action-handoff-2026-10-09';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function lum(hex){const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
const contrast=(fg,bg)=>(lum(bg)+.05)/(lum(fg)+.05);
const phases={predict:{fg:'#163a63',bg:'#ecf9f5'},reflect:{fg:'#4c1d95',bg:'#f0f3fa'},perform:{fg:'#115e59',bg:'#ecfdf5'}};
const allowed=new Set(['.diss-learning-check__eyebrow','#diss-learning-check-title','#diss-learning-check-prompt','.diss-learning-check__prompt','#diss-learning-check-keyboard-help','#diss-guided-observation-title','#diss-guided-observation-keyboard-help','.diss-learning-check__perform']);
const files=['browser-3'].flatMap(run=>fs.readdirSync(path.join(report,run,'captures')).filter(name=>/(?:^axe-.*|-axe)\.json$/.test(name)).map(name=>run+'/captures/'+name));
assert(files.length===4,'Expected four completed outcome audits');
const reports=[],nodes=[];
for(const file of files){const bytes=fs.readFileSync(path.join(report,file)),audit=JSON.parse(bytes);assert(audit.violations.length===0,file+': violations');let count=0;
for(const rule of audit.incomplete){assert(rule.id==='color-contrast','Unexpected rule');for(const node of rule.nodes){count++;assert(node.target.length===1&&allowed.has(node.target[0]),'Unknown target');const checks=[...node.any,...node.all,...node.none];assert(checks.length&&checks.every(c=>c.data?.messageKey==='bgGradient'),'Unknown incomplete reason');const related=checks.flatMap(c=>c.relatedNodes||[]).map(n=>n.html).join('\n'),phase=related.match(/data-phase="([^"]+)"/)?.[1];assert(phases[phase],'Unknown phase');const target=node.target[0],fg=target.endsWith('keyboard-help')?'#334155':target==='.diss-learning-check__perform'?'#065f46':phases[phase].fg,bg=phases[phase].bg,ratio=contrast(fg,bg);assert(ratio>=4.5,'Insufficient contrast');nodes.push({file,target,phase,foreground:fg,backgroundBound:bg,ratio,required:4.5,resolved:true});}}
reports.push({file,sha256:hash(bytes),violations:0,incompleteNodes:count});}
const review={at:new Date().toISOString(),reports:reports.length,violations:0,reviewedGradientNodes:nodes.length,unresolved:0,
method:'Accept the four complete outcome audits from browser-3. Exclude the interrupted checkpoint-3 run. Raw reports remain unchanged; normal feedback palette ratios are calculated from the existing source colors with WCAG sRGB relative luminance.',
minimumGradientRatio:nodes.length?Math.min(...nodes.map(n=>n.ratio)):null,
normalFeedbackPalettes:[{surface:'specimen echo',foreground:'#294b70',background:'#f8fbff',ratio:contrast('#294b70','#f8fbff')},{surface:'live technique feedback',foreground:'#355754',background:'#ffffff',ratio:contrast('#355754','#ffffff')}],
audits:reports,nodes,limits:'Scoped Chromium/axe checks plus source/contrast/visual review. The specimen echo is aria-hidden because the existing technique feedback supplies its accessible status; no extra live region was added. No assistive-technology user session or whole-app certification.'};
fs.writeFileSync(path.join(report,'accessibility-review.json'),JSON.stringify(review,null,2));console.log(JSON.stringify({reports:review.reports,violations:0,gradientNodes:nodes.length,minimumContrast:review.minimumGradientRatio}));
