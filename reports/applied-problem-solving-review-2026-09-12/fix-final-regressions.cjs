const fs=require('fs');function edit(p,f){fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));}
edit('applied_challenge_source.jsx',s=>{
 s=s.replace("    visual: data.visual.reviewed && data.visual.alt.trim() ? data.visual : null,\n",'');
 const start=s.indexOf('function appliedChallengeExportModel');const before=s.slice(0,start);let model=s.slice(start);
 model=model.replace("artifactUrl: data.workspace.artifactUrl, artifactDescription: data.workspace.artifactDescription,", "artifactUrl: data.workspace.artifactUrl, artifactDescription: data.workspace.artifactDescription,\n    visual: data.visual.reviewed && data.visual.alt.trim() ? data.visual : null,");
 s=before+model;
 return s.replace("Object.assign({ rating: 'pending', note: '' }, next[key] || {}, patch", "Object.assign({ rating: 'pending', note: '', revision: item?.revision || '' }, next[key] || {}, patch");
});
edit('doc_pipeline_source.jsx',s=>{
 s=s.replace("const body = typeof render === 'function' ? historyItems.map(item => render(item.data, item.data.appliedChallengeExportPreset, t)).join('')", "const body = cfg.includeAppliedChallenge === false ? '' : typeof render === 'function' ? historyItems.map(item => render(item.data, item.data.appliedChallengeExportPreset, t)).join('')");
 s=s.replace("['response', '7. Build the deliverable', true], ['testReflection', '8. Test or challenge the draft', false],\n                  ['revision', '9. Revise after testing', false]", "['response', '7. Build the deliverable', true], ['testReflection', '8. Test or challenge the draft', true],\n                  ['revision', '9. Keep or revise after checking', true]");
 return s;
});
edit('tests/applied_challenge_interaction.test.js',s=>s.replace("it('adds, labels, persists, summarizes, and removes evidence ledger rows'",`it('treats a first criteria note as current before the learner chooses a rating', async () => {
    await renderChallenge();
    const field = Array.from(host.querySelectorAll('textarea')).find(node => (node.getAttribute('aria-label') || '').includes('Criterion 1 evidence note'));
    expect(field).toBeTruthy();
    await typeInto(field, 'My draft compares the two possibilities.');
    const entry = Object.values(latest.data.criteriaCheck)[0];
    expect(entry).toMatchObject({ rating: 'pending', needsReview: false, note: 'My draft compares the two possibilities.' });
    expect(entry.revision).toBeTruthy();
  });

  it('adds, labels, persists, summarizes, and removes evidence ledger rows'`));
