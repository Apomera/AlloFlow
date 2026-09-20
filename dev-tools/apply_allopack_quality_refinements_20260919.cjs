'use strict';
// Apply the reviewed 2026-09-19 wording revisions without regenerating any artwork.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,''));
const patches=Object.assign({},...['language','science','supports'].map(group=>read('dev-tools/data/allopack_quality_'+group+'_20260919.json')));
const quizzes=read('dev-tools/data/allopack_quality_quizzes_20260919.json');
const scaffolds=read('dev-tools/data/allopack_quality_scaffolds_20260919.json');
const revisions=[];
function assetFingerprint(pack){const rows=[];function walk(n,at){if(!n||typeof n!=='object')return;for(const[k,v]of Object.entries(n)){if(typeof v==='string'&&(v.startsWith('data:image/')||/^(?:image|icon)?alt(?:source|hash)?$/i.test(k)))rows.push([at+'.'+k,crypto.createHash('sha256').update(v).digest('hex')]);else if(v&&typeof v==='object')walk(v,at+'.'+k);}}walk(pack.history,'history');return rows;}
function boldTerms(text,terms){const parts=text.split(/(\*\*[^*]+\*\*)/);for(const term of terms){if(parts.some((s,i)=>i%2&&s.toLowerCase().includes(term.toLowerCase())))continue;const re=new RegExp('\\b'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:s)?\\b','i');const i=parts.findIndex((s,i)=>i%2===0&&re.test(s));if(i>=0)parts[i]=parts[i].replace(re,m=>'**'+m+'**');}return parts.join('');}
const loaded=new Map();
for(const dir of ['allopacks','allopacks/illustrated'])for(const f of fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.allopack.json'))){const file=dir+'/'+f,pack=read(file);loaded.set(file,{pack,before:JSON.stringify(pack),assets:assetFingerprint(pack),ids:pack.history.map(r=>r.id),changes:[]});}
for(const [file,state]of loaded){state.changes.push(...require('./lib/allopack_quality_refinements_20260919.cjs').apply(state.pack,path.basename(file,'.allopack.json'),{illustrated:file.includes('/illustrated/')}));}

// Reconcile the complete argument lesson: isolated definition edits would leave
// contradictory chart, outline, FAQ, memory, quiz and challenge instructions.
const original=loaded.get('allopacks/argument_evidence_grade6.allopack.json');
const illustrated=loaded.get('allopacks/illustrated/argument_evidence_grade6.allopack.json');
const artKeys=new Set(['image','imageUrl','imageAlt','imageAltSource','imageAltHash','imageDecorative','iconUrl','iconAlt','iconAltSource','iconAltHash','imageSlot']);
const withoutArt=n=>Array.isArray(n)?n.map(withoutArt):n&&typeof n==='object'?Object.fromEntries(Object.entries(n).filter(([k])=>!artKeys.has(k)).map(([k,v])=>[k,withoutArt(v)])):n;
for(const r of original.pack.history){const peer=illustrated.pack.history.find(x=>x.id===r.id&&x.type===r.type);assert(peer,'Argument peer missing '+r.id);const prior=r.data;r.title=peer.title;r.data=withoutArt(peer.data);r.meta=peer.meta||'';if(r.type==='directions')r.data.body=r.data.body.replace(/\n\nPicture panels:[^\n]*/g,'');
 if(r.type==='memory-aid')r.data.cards.forEach(card=>{const old=prior.cards.find(c=>c.id===card.id);if(!card.factReview)card.factVerified=false;});
 if(r.type==='applied-challenge'&&!r.data.brief.factReview)r.data.brief.factVerified=false;}
original.changes.push('reconciled original argument resources with corrected illustrated lesson');
for(const[file,state]of loaded){const p=state.pack;assert.deepEqual(p.history.map(r=>r.id),state.ids,file+': resource IDs changed');assert.deepEqual(assetFingerprint(p),state.assets,file+': artwork or alt text changed');if(JSON.stringify(p)===state.before)continue;p.allopack.revisionReviewStatus='2026-09-19: AI-assisted wording and structural review; educator review of this revision pending';fs.writeFileSync(path.join(root,file),JSON.stringify(p,null,2)+'\n');revisions.push({file,changes:state.changes,resources:p.history.length,assetsPreserved:true});}
const report='docs/allopack-quality-2026-09-19/refinement-changes.json';const previous=fs.existsSync(path.join(root,report))?read(report).revisions:[];const combined=new Map(previous.map(r=>[r.file,r]));for(const row of revisions){const prior=combined.get(row.file);combined.set(row.file,{...row,changes:[...new Set([...(prior?prior.changes:[]),...row.changes])]});}const all=[...combined.values()];fs.writeFileSync(path.join(root,report),JSON.stringify({date:'2026-09-19',changedFiles:all.length,revisions:all},null,2)+'\n');console.log(JSON.stringify({changedThisRun:revisions.length,totalChangedFiles:all.length,assetsPreserved:true,report}));
