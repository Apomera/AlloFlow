'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const reportPath='reports/organism-views-wcag/final-native/results.json';
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const groups={gradient:[],glyph:[],levelSupport:[]};
for(const audit of report.audits)for(const rule of audit.incomplete)for(const node of rule.nodes){
 const row={view:audit.view,theme:audit.theme,rule:rule.id,target:node.target,summary:node.summary};
 if(/background gradient/.test(node.summary))groups.gradient.push(row);
 else if(/only non-text characters/.test(node.summary))groups.glyph.push(row);
 else if(/aria-level values greater than 6/.test(node.summary))groups.levelSupport.push(row);
 else throw Error('Unreviewed incomplete category: '+node.summary);
}
const glyphKinds={caret:0,comparisonArrow:0,lessonToggle:0};
for(const row of groups.glyph){const target=row.target.join(' ');if(target.includes('oid-caret'))glyphKinds.caret++;else if(target.includes('oid-edge-arrow'))glyphKinds.comparisonArrow++;else if(target.includes('oid-exp-toggle'))glyphKinds.lessonToggle++;else throw Error('Unreviewed glyph: '+target);}
const sourceMatches=hash(report.sourcePath)===report.sourceSha256;
assert(sourceMatches,'Refresh this classification after the final native report matches its source snapshot.');
const output={sourceSha256:report.sourceSha256,nativeReport:{path:reportPath,sha256:hash(reportPath)},sourceSnapshotMatchesReport:sourceMatches,
 rawAxeIncompleteNodes:Object.values(groups).reduce((n,rows)=>n+rows.length,0),
 categories:[
  {id:'gradient-text',nodes:groups.gradient.length,assessment:'Axe could not determine the gradient background. These are unresolved automated contrast checks, not detected contrast failures. No new rendered contrast pass is claimed by this classification.',status:'contrast-verification-pending'},
  {id:'nontext-glyphs',nodes:groups.glyph.length,kinds:glyphKinds,assessment:'Axe deferred glyph-only contrast checks. These require a non-text/functional assessment; aria-hidden alone does not remove the visual contrast requirement for meaningful disclosure indicators. No new rendered contrast pass is claimed here.',status:'contrast-verification-pending'},
  {id:'aria-level-seven',nodes:groups.levelSupport.length,assessment:'The WAI-ARIA 1.2 aria-level definition permits integers greater than or equal to 1 and supports treeitem. Level 7 is valid markup; the reported issue concerns support across screen-reader/browser combinations. Preserve the truthful depth. Spoken output remains unverified.',status:'valid-value-with-unverified-assistive-technology-support',source:'https://www.w3.org/TR/wai-aria-1.2/#aria-level'}
 ],
 references:[
  {url:'https://www.w3.org/TR/wai-aria-1.2/#aria-level',purpose:'Normative range and treeitem applicability of aria-level.'},
  {url:'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',purpose:'Text contrast is assessed from foreground/background presentation; an incomplete automation result is not a pass.'},
  {url:'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html',purpose:'Functional visual indicators need non-text contrast assessment rather than dismissal solely as glyphs.'}
 ],
 limits:'Read-only classification of recorded axe incompletes. Raw results are preserved. No production changes, new browser run, spoken screen-reader check or tool-wide conformance claim.'};
fs.writeFileSync('reports/organism-views-wcag/incomplete-review.json',JSON.stringify(output,null,2));
console.log(JSON.stringify({sourceSha256:output.sourceSha256,rawAxeIncompleteNodes:output.rawAxeIncompleteNodes,categories:output.categories.map(row=>({id:row.id,nodes:row.nodes,status:row.status}))}));
