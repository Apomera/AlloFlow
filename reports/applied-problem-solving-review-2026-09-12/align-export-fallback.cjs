const fs=require('fs');const p='doc_pipeline_source.jsx';let s=fs.readFileSync(p,'utf8');const start=s.indexOf('const _acFallbackModel = (raw) => {'),end=s.indexOf('const m = _acModule',start);let block=s.slice(start,end);
block=block.replace("const allPhases = [",`const safeLink = value => { try { const url = new URL(str(value,2000)); return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch (_) { return ''; } };
              const visual = raw.visual || {};
              const safeImage = typeof visual.image === 'string' && visual.image.length <= 6000000 && /^data:image\\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(visual.image) ? visual.image : safeLink(visual.image);
              const allPhases = [`);
block=block.replace("scope: raw.scope, scopeLabel: '',",`scope: raw.scope, scopeLabel: '',
                  artifactUrl: safeLink(workspace.artifactUrl), artifactDescription: str(workspace.artifactDescription,4000),
                  visual: visual.reviewed === true && str(visual.alt,1200).trim() && safeImage ? { image: safeImage, alt: str(visual.alt,1200), purpose: str(visual.purpose,1200) } : null,
                  feedbackOutdated: !!feedback,`);
block=block.replace(".map((p) => ({\n                      id: p[0], label: p[1]", ".map((p, index) => ({\n                      id: p[0], label: (index + 1) + '. ' + p[1].replace(/^\\d+\\.\\s*/, '')");
block=block.replace("status: str(r.status, 40), statusLabel: ({ verified: 'Verified lesson evidence', 'needs-check': 'Needs checking', assumption: 'Assumption or estimate' })[r.status] || 'Needs checking',",`status: r.status === 'assumption' ? 'assumption' : 'needs-check',
                      sourceText: str((brief.factSources || []).find(f => f.id === r.factId && f.revision === r.factRevision && list(brief.lockedLessonFacts).includes(f.text))?.text,800),
                      statusLabel: r.status === 'assumption' ? 'Assumption or estimate' : r.status === 'verified' && brief.factVerified === true && (brief.factSources || []).some(f => f.id === r.factId && f.revision === r.factRevision && list(brief.lockedLessonFacts).includes(f.text)) ? 'Linked to a reviewed lesson fact' : 'Needs checking',`);
block=block.replace("const entry = raw.criteriaCheck && raw.criteriaCheck[item.key] && typeof raw.criteriaCheck[item.key] === 'object' ? raw.criteriaCheck[item.key] : {};",`const refs = item.kind === 'criterion' ? brief.criteriaItems : brief.constraintItems;
                      const ref = (Array.isArray(refs) ? refs : []).find(r => r.text === item.text);
                      const entry = raw.criteriaCheck?.[ref?.id] || raw.criteriaCheck?.[item.key] || {};
                      if (ref?.id) item.key = ref.id;
                      const current = !!ref?.revision && entry.revision === ref.revision;`);
block=block.replace("rating: ratingLabels[entry.rating] ? entry.rating : 'pending', ratingLabel: ratingLabels[entry.rating] || ratingLabels.pending", "rating: current && ratingLabels[entry.rating] ? entry.rating : 'pending', ratingLabel: current && ratingLabels[entry.rating] || ratingLabels.pending");
fs.writeFileSync(p,s.slice(0,start)+block+s.slice(end));
const test='tests/applied_challenge_print_presets.test.js';let t=fs.readFileSync(test,'utf8');t=t.replace("it('includes current source connections",`it('keeps the compact check and artifact when the UI module is unavailable',()=>{
  const item=resource();item.data.scope='compact';item.data.workspace.testReflection='FALLBACK CHECK';item.data.workspace.revision='FALLBACK REVISION';item.data.evidenceLedger=[{id:'legacy',claim:'A claim',evidence:'A connection',status:'verified'}];
  const module=window.AlloModules.AppliedChallenge;
  try{delete window.AlloModules.AppliedChallenge;const html=render(item);expect(html).toContain('FALLBACK CHECK');expect(html).toContain('FALLBACK REVISION');expect(html).toContain('https://example.org/student-work');const doc=new DOMParser().parseFromString(html,'text/html');expect(doc.querySelector('.ace-ledger').textContent).not.toContain('Verified lesson evidence');expect(doc.querySelector('.ace-ledger').textContent).toContain('Needs checking');}finally{window.AlloModules.AppliedChallenge=module;}
 });
 it('includes current source connections`);fs.writeFileSync(test,t);
