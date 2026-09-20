const fs=require('fs');
function edit(file,fn){let s=fs.readFileSync(file,'utf8');const replace=(a,b)=>{if(!s.includes(a))throw Error(file+' missing '+a.slice(0,100));s=s.replace(a,b);};fn(replace);fs.writeFileSync(file,s);}
edit('memory_aid_source.jsx',r=>{
 r("  reviewPlan: (card, attempts, today) => memoryAidReviewPlan(card, attempts, today),", "  reviewPlan: (card, attempts, today) => memoryAidReviewPlan(card, attempts, today),\n  recallQuestion: memoryAidRecallQuestion,\n  activeConnections: memoryAidActiveConnections,\n  customCue: memoryAidCustomCue,");
 r("function memoryAidConnectionKey(card) {", "// Connection identities can travel with learner submissions; keep fact text private.\nfunction memoryAidConnectionFactKeys(card) { return _maPracticeFactKeys(_maList(card?.essentialFacts, 10, 600)).map(key => 'link:' + _maStableHash(key)); }\n\nfunction memoryAidConnectionKey(card) {");
 r("const facts = _maList(card?.essentialFacts, 10, 600), keys = _maPracticeFactKeys(facts);", "const facts = _maList(card?.essentialFacts, 10, 600), keys = memoryAidConnectionFactKeys(card);");
 r("const keys = _maPracticeFactKeys(card.essentialFacts), rows = card.studentConnections;", "const keys = memoryAidConnectionFactKeys(card), rows = card.studentConnections;");
 r("const queueCompleted = !!(queueSession?.stage === 'review' && queueSession.attempt && memoryAidPracticeSummary", "const queueCompleted = !!(queueSession?.stage === 'review' && queueSession.attempt && !queue.existingAttemptIds.includes(queueSession.attempt.id) && queueSession.attempt.basisKey === memoryAidPracticeBasis(cardById.get(queue.ids[queue.index])) && memoryAidPracticeSummary");
 r("const queueCanMove = !activePracticeCardId || queueCompleted;", "const queueCanMove = !activePracticeCardId || queueSession?.stage === 'review';");
 r("setReviewQueue({ scope: queueScope, ids:", "setReviewQueue({ existingAttemptIds: Object.values(privatePracticeByCard).flat().map(attempt => attempt.id), scope: queueScope, ids:");
 r("    <details><summary className=\"min-h-11 cursor-pointer py-2 font-bold text-teal-900\">{tr('application_title'", "    {!sameApplication && attempt.applicationResponse && <details><summary className=\"min-h-11 cursor-pointer py-2 text-sm font-bold\">{tr('application_earlier', 'My explanation for the earlier question')}</summary><p className=\"mt-2 text-sm\">{attempt.applicationQuestion}</p><p className=\"mt-2 whitespace-pre-wrap text-sm\">{attempt.applicationResponse}</p></details>}\n    <details><summary className=\"min-h-11 cursor-pointer py-2 font-bold text-teal-900\">{tr('application_title'");
});
edit('_build_memory_aid_module.js',r=>r("  '    normalizeMemoryAidTypes: normalizeMemoryAidTypes,',", ['memoryAidRecallQuestion','memoryAidCustomCue','memoryAidConnectionKey','memoryAidConnectionFactKeys','normalizeMemoryAidStudentConnections','memoryAidActiveConnections'].map(x=>`  '    ${x}: ${x},',`).join('\n')+"\n  '    normalizeMemoryAidTypes: normalizeMemoryAidTypes,',"));
edit('generate_dispatcher_source.jsx',r=>{
 r("              '- Include applicationQuestion:", "              '- Include recallQuestion: a short neutral question identifying what to retrieve without giving its answer. Do not include the mnemonic, required facts, or an answer-bearing target statement. Ask about the topic or situation. Teachers can edit this question.',\n              '- Include applicationQuestion:");
 r('"applicationQuestion":"one new situation"','"recallQuestion":"neutral question without its answer","applicationQuestion":"one new situation"');
 r("                  applicationQuestion: String(item.applicationQuestion", "                  recallQuestion: String(item.recallQuestion || '').trim().slice(0, 1600),\n                  applicationQuestion: String(item.applicationQuestion");
});
edit('studio_response_module.js',r=>{
 r("const memoryFields = ['studentDraft',", "const memoryFields = ['studentConnections', 'studentDraft',");
 r("  function responseFromData(type, data) {", `  function memoryConnections(value) {
    const seen = new Set(), text = (v,n) => typeof v === 'string' ? v.slice(0,n) : '';
    return (Array.isArray(value) ? value : []).filter(row => {
      const key=text(row?.factKey,80); if(!/^link:[a-zA-Z0-9_-]+$/.test(key)||seen.has(key)) return false; seen.add(key); return true;
    }).slice(-20).map(row => ({factKey:text(row.factKey,80),cue:text(row.cue,200),explanation:text(row.explanation,600),cueKey:text(row.cueKey,80)}));
  }
  function responseFromData(type, data) {`);
 r("(raw.cards || []).slice(0, 8).map(card => textTree(pick(card, ['id', 'studentDraft', 'studentReasoning', 'visualAlt', 'feedback', 'coachHint'])))", "(Array.isArray(raw.cards) ? raw.cards : []).slice(0, 8).map(card => ({ ...textTree(pick(card, ['id', 'studentDraft', 'studentReasoning', 'visualAlt', 'feedback', 'coachHint'])), studentConnections: memoryConnections(card?.studentConnections) }))");
 r("walk(card.visualAlt, card.id + '-visual-description');", "walk(card.visualAlt, card.id + '-visual-description'); (card.studentConnections || []).forEach((row,index) => { walk(row.cue,card.id+'-connection-'+index+'-cue'); walk(row.explanation,card.id+'-connection-'+index+'-explanation'); });");
 r("id: card.id, studentDraft: '', studentReasoning: '', coachHint: '', feedback: null", "id: card.id, studentDraft: '', studentConnections: [], studentReasoning: '', coachHint: '', feedback: null");
});
fs.writeFileSync('desktop/web-app/public/studio_response_module.js',fs.readFileSync('studio_response_module.js'));
edit('doc_pipeline_source.jsx',r=>{
 r("              const draft = String(c.studentDraft || '').trim();", `              const currentLinks = _maRules && typeof _maRules.activeConnections === 'function' ? _maRules.activeConnections(c) : [];
              const savedLinks = (Array.isArray(c.studentConnections) ? c.studentConnections : []).slice(-20).filter(row => row && (row.cue || row.explanation));
              const earlierLinks = savedLinks.filter(row => !currentLinks.some(link => link.learnerIdentified && link.factKey === row.factKey && link.cueKey === row.cueKey));
              const connectionsHtml = (currentLinks.length ? '<section style="margin-top:12px"><h4>' + _maT('mapping_heading', 'How the cue connects') + '</h4><ul>' + currentLinks.map(link => '<li><strong>' + escapeHtml(String(link.cue || '').slice(0,200)) + '</strong> — ' + escapeHtml(String((c.essentialFacts || [])[link.factIndex] || '').slice(0,600)) + (link.explanation ? '<p>' + escapeHtml(String(link.explanation).slice(0,600)) + '</p>' : '') + '</li>').join('') + '</ul></section>' : '')
                  + (earlierLinks.length ? '<section style="margin-top:12px"><h4>' + _maT('connections_earlier', 'Notes for earlier facts') + '</h4><p>' + _maT('export_connections_recheck', 'Saved learner connections — recheck against the current cue and facts.') + '</p>' + earlierLinks.map(row => '<p>' + escapeHtml(String(row.cue || '').slice(0,200)) + ': ' + escapeHtml(String(row.explanation || '').slice(0,600)) + '</p>').join('') + '</section>' : '');
              const draft = String(c.studentDraft || '').trim();`);
 r("+ (c.mapping ? '<section style=\"margin-top:12px;\"><h4", "+ connectionsHtml\n                  + (!currentLinks.length && !c.studentDraft && c.mapping ? '<section style=\"margin-top:12px;\"><h4");
 // An unchanged copy should keep the original prose mapping too.
 r("!currentLinks.length && !c.studentDraft && c.mapping", "!currentLinks.length && (!_maRules?.customCue ? !c.studentDraft : !_maRules.customCue(c)) && c.mapping");
});
edit('tests/memory_aid_followthrough.test.js',r=>{
 r('and ignores obsolete cue attempts','and preserves review plans after cue edits');
 r("expect(rules.reviewPlan({...card,studentDraft:'Changed cue'},[completed]).latest).toBeNull();", "expect(rules.reviewPlan({...card,studentDraft:'Changed cue'},[completed])).toMatchObject({earlierCue:true,needsPractice:true,date:'2026-09-20',latest:{id:completed.id}});");
});
edit('reports/memory-aid-ux-review-2026-09-12/build-preview.cjs',r=>{
 r("{ id:'solid',target:", "{ id:'solid',recallQuestion:'What happens to the shape and volume of a solid when it is moved into a different container?',applicationQuestion:'A wooden block moves from a tall jar to a wide bowl. What changes?',applicationGuidance:'The block keeps its own shape and volume.',target:");
 r("{ id:'liquid',target:", "{ id:'liquid',recallQuestion:'What happens to the shape and volume of a liquid when it is poured into a different container?',target:");
 r("{ id:'gas',target:", "{ id:'gas',recallQuestion:'How does a gas behave when its container changes?',target:");
});
console.log('Integrated recall questions, learner connections, exports, and review sequencing.');
