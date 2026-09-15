const fs=require('fs');function edit(p,f){fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));}
edit('applied_challenge_source.jsx',s=>{
 s=s.replace(/\{ReadAloud && (<ReadAloud resource=\{generatedContent\}[^\n]+?\/> )\}/,m=>m);
 const audio=s.match(/\{ReadAloud && (<ReadAloud resource=\{generatedContent\}[^\n]+?\/>)(\})/);
 if(!audio)throw Error('Audio anchor');
 s=s.replace(audio[0],`{ReadAloud && <details className='mt-3 applied-challenge-no-print'><summary className='min-h-11 cursor-pointer text-sm font-semibold text-slate-700'>{tx('applied_challenge.reading.options', 'Read or listen to this challenge')}</summary>${audio[1]}</details>}`);
 s=s.replace("const organizerPrompt = tx('applied_challenge.organizer.' + data.family + '.prompt', organizerCopy[1]);",`const organizerPrompt = tx('applied_challenge.organizer.' + data.family + '.prompt', organizerCopy[1]);
  const comparisonLabels = {
    investigate: ['Question or hypothesis', 'Evidence needed or collected', 'Method or limit'],
    design: ['Design option', 'Lesson connection', 'Constraint or failure point'],
    decide: ['Option', 'Supporting evidence', 'Tradeoff'],
    propose: ['Proposed action', 'Reason or evidence', 'Resource assumption'],
    explore: ['Position or interpretation', 'Supporting reason', 'Counterexample or uncertainty'],
  }[data.family].map((label, index) => tx('applied_challenge.organizer.' + data.family + '.column' + index, label));`);
 s=s.replace("<div id='applied-ledger-body' hidden={!ledgerExpanded}>",`<div id='applied-ledger-body' hidden={!ledgerExpanded}>
          {data.evidenceLedger.length > 0 && <div className='mt-4 hidden md:block'><table className='w-full table-fixed border-collapse text-left text-sm'><caption className='mb-2 text-left font-bold'>{tx('applied_challenge.organizer.overview', 'Your comparison at a glance')}</caption><thead><tr>{comparisonLabels.map(label => <th key={label} scope='col' className='border border-cyan-200 bg-cyan-100 p-3'>{label}</th>)}</tr></thead><tbody>{data.evidenceLedger.map(row => <tr key={row.id}>{['claim', 'evidence', 'tradeoff'].map(key => <td key={key} className='whitespace-pre-wrap border border-cyan-200 bg-white p-3 align-top'>{row[key] || tx('applied_challenge.organizer.empty_cell', 'Not added yet')}</td>)}</tr>)}</tbody></table></div>}`);
 return s;
});
edit('reports/applied-problem-solving-review-2026-09-12/implementation-browser.cjs',s=>s.replace("x.getClientRects().length","x.checkVisibility()").replaceAll("4. Check & revise","4. Check").replace('/Compare options/','/Compare the options/').replace("/Link|linked|another format/","/Link|linked|another format|drawing|model/i"));
