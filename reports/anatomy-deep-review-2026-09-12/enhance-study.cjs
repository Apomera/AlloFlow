const fs = require('node:fs');
const parser = require('@babel/parser');
const file = 'stem_lab/stem_tool_anatomy.js';
let s = fs.readFileSync(file, 'utf8');
function rep(a,b,n=1) { const count=s.split(a).length-1; if(count!==n) throw Error(`Expected ${n}, got ${count}: ${a.slice(0,90)}`); s=s.split(a).join(b); }
rep('22 bones form the cranium', 'The skull has 8 cranial bones');
rep('and facial skeleton (14 bones).', 'and 14 facial bones (22 in total).');
rep('The skull is 22 bones joined by seams called sutures. In babies the bones are separate so the head can pass through the birth canal and the brain can grow.', 'The skull has 22 bones. Most meet at seams called sutures; the lower jaw moves at joints. In babies, flexible sutures and fontanelles allow molding during birth and room for brain growth.');
rep("'\\nReviewed lesson context: '", "'\\nLesson context: '");
rep("        var studyControlsExpanded = d._studyControlsExpanded === true;", "        var anatomyCompactMode = anatomyStudyMode || activeTab === 'explore';\n        var studyControlsExpanded = d._studyControlsExpanded === true;");
rep("'data-anatomy-study-compact': anatomyStudyMode ? 'true' : 'false'", "'data-anatomy-study-compact': anatomyCompactMode ? 'true' : 'false'");
rep("          anatomyStudyMode && h('div', { className: 'anatomy-study-controls'", "          h('label', { className: 'anatomy-mobile-activity', htmlFor: 'anatomy-mobile-activity' },\n            h('span', null, t('stem.anatomy.choose_activity', 'Activity')),\n            h('select', { id: 'anatomy-mobile-activity', value: activeTab, 'aria-controls': 'anatomy-mode-panel', onChange: function(event) { activateAnatomyTab(event.target.value); } },\n              navigableAnatomyTabs.map(function(tab) { return h('option', { key: tab, value: tab }, ANATOMY_ACTIVITY_NAMES[tab]); })\n            )\n          ),\n          anatomyCompactMode && h('div', { className: 'anatomy-study-controls'");
rep("        var ANATOMY_TAB_HINTS = {", `        var ANATOMY_ACTIVITY_NAMES = {
          explore: t('stem.anatomy.activity_explore', 'Explore'), quiz: t('stem.anatomy.activity_quiz', 'Quiz'),
          tour: t('stem.anatomy.activity_tour', 'Guided tour'), connections: t('stem.anatomy.activity_connections', 'Connections'),
          aiTutor: t('stem.anatomy.activity_tutor', 'AI tutor'), spotter: t('stem.anatomy.activity_spotter', 'Spotter'),
          pathways: t('stem.anatomy.activity_pathways', 'Pathways'), flashcards: t('stem.anatomy.activity_cards', 'Flashcards'),
          homeoHunt: t('stem.anatomy.activity_homeo', 'Homeostasis'), imaging: t('stem.anatomy.activity_imaging', 'Imaging'),
          procedure: t('stem.anatomy.activity_procedure', 'Procedure lab')
        };
        var ANATOMY_TAB_HINTS = {`);
rep("          // Mission dashboard", `          activeTab === 'explore' && sel ? h('section', { className: 'anatomy-mobile-brief', 'aria-labelledby': 'anatomy-mobile-brief-title', 'data-anatomy-mobile-brief': sel.id },
            h('h4', { id: 'anatomy-mobile-brief-title' }, sel.name),
            h('p', null, clipAtSentence(learnerText(sel), 220)),
            h('button', { type: 'button', onClick: function() { focusAnatomyStructureDetail(); } }, t('stem.anatomy.read_full_card', 'Read full card and sources'))
          ) : null,

          // Mission dashboard`);
rep("h('span', { style: { color: '#475569' } }, 'Belongs to'), h('strong', null, sys.icon + ' ' + sys.name)", "h('span', { style: { color: '#475569' } }, t('stem.anatomy.science_membership_label', 'System membership: ')), h('strong', null, scientificSystemNames(sel))");
rep("'System-context links can involve this structure directly or through the larger ' + sys.name.toLowerCase() + ' system.'", "t('stem.anatomy.science_connection_scope', 'Links below describe the selected navigation collection. Some involve this structure directly; others involve a wider system process.')");
rep('                        renderStructureRelationshipMap(),', '                        renderScienceSources(sel),\n                        renderStructureRelationshipMap(),');
rep("h('span', { className: 'font-bold text-rose-700' }, t('stem.anatomy.you_chose_prefix', 'You chose the ') + chosenOpt.name + '. ')", "h('span', { className: quizFeedback.correct ? 'font-bold text-green-800' : 'font-bold text-rose-700' }, t('stem.anatomy.you_chose_prefix', 'You chose the ') + chosenOpt.name + '. ')");

// Keep recall attempts separate from the learner's confidence setting and review queue.
rep('        function confidenceEvidencePatch(structureId, correct) {', `        function getRecallEvidence(structureId) {
          var raw = d._retrievalEvidence && typeof d._retrievalEvidence === 'object' && !Array.isArray(d._retrievalEvidence) ? d._retrievalEvidence[structureId] : null;
          var attempts = raw && typeof raw.attempts === 'number' && Number.isFinite(raw.attempts) ? Math.max(0, Math.min(1000000, Math.floor(raw.attempts))) : 0;
          var correct = raw && typeof raw.correct === 'number' && Number.isFinite(raw.correct) ? Math.max(0, Math.min(attempts, Math.floor(raw.correct))) : 0;
          return { attempts: attempts, correct: correct };
        }
        function recallEvidenceText(structureId) {
          var record = getRecallEvidence(structureId);
          return record.attempts ? formatAnatomyStudyText(t('stem.anatomy.recall_evidence', 'Recorded answers: {correct} correct out of {attempts}. Confidence is your self-rating, not a mastery score.'), record)
            : t('stem.anatomy.recall_no_evidence', 'No scored answers recorded yet. Confidence is your self-rating, not a mastery score.');
        }
        function confidenceEvidencePatch(structureId, correct) {`);
rep('          return { _structureConfidence: nextConfidence, _confidenceAt: stampConfidence(structureId) };', `          var nextEvidence = {};
          knownStructureIds.forEach(function(id) { var record = getRecallEvidence(id); if (record.attempts) nextEvidence[id] = record; });
          var previous = getRecallEvidence(structureId);
          nextEvidence[structureId] = { attempts: previous.attempts + 1, correct: previous.correct + (correct ? 1 : 0) };
          return { _structureConfidence: nextConfidence, _confidenceAt: stampConfidence(structureId), _retrievalEvidence: nextEvidence };`);
rep("            h('div', { className: 'anatomy-confidence-actions' }, confidenceOptions.map(function(option) {", "            h('p', { className: 'anatomy-recall-evidence', 'data-anatomy-recall-evidence': structureId }, recallEvidenceText(structureId)),\n            h('div', { className: 'anatomy-confidence-actions' }, confidenceOptions.map(function(option) {");

// DOM order, including keyboard order, places the actual card before round settings.
const deckStart=s.indexOf("                  h('div', { className: 'anatomy-flashcard-deck-controls'");
const deckEnd=s.indexOf("                  flashcardPool.length > 0 ? h('div', { className: 'space-y-3' },",deckStart);
if(deckStart<0||deckEnd<0) throw Error('Flashcard boundaries');
const deck=s.slice(deckStart,deckEnd); s=s.slice(0,deckStart)+s.slice(deckEnd);
rep("                  h('details', { className: 'anatomy-card-disclosure', 'data-anatomy-card-help': 'true' },", deck+"                  h('details', { className: 'anatomy-card-disclosure', 'data-anatomy-card-help': 'true' },");

const feedbackCode = `        // Bounded illustrative negative-feedback comparison; steps are not minutes.
        // A short external pulse ends after step 8. The controller then opposes deviation.
        function simulateAnatomyFeedback(direction, enabled) {
          var temperature = 37, samples = [{ step: 0, temperature: temperature }];
          for (var step = 1; step <= 40; step++) {
            var load = step <= 8 ? (direction === 'cool' ? -0.04 : 0.04) : 0;
            var correction = enabled && step > 2 ? 0.15 * (temperature - 37) : 0;
            temperature += load - correction;
            samples.push({ step: step, temperature: temperature });
          }
          return samples;
        }
        function renderFeedbackExperiment() {
          var saved = d._feedbackExperiment && typeof d._feedbackExperiment === 'object' && !Array.isArray(d._feedbackExperiment) ? d._feedbackExperiment : {};
          var direction = saved.direction === 'cool' ? 'cool' : 'warm';
          var prediction = ['active', 'disabled', 'same'].indexOf(saved.prediction) !== -1 ? saved.prediction : '';
          var revealed = saved.revealed === true && !!prediction;
          function change(patch) { upd('_feedbackExperiment', Object.assign({ direction: direction, prediction: prediction, revealed: revealed, explanation: typeof saved.explanation === 'string' ? saved.explanation.slice(0,2000) : '' }, patch)); }
          var active = simulateAnatomyFeedback(direction, true), disabled = simulateAnatomyFeedback(direction, false);
          var activeLabel = t('stem.anatomy.feedback_active', 'Feedback active');
          var disabledLabel = t('stem.anatomy.feedback_disabled', 'Response disabled');
          function points(samples) { return samples.map(function(sample) { return (40 + sample.step * 7.5).toFixed(1) + ',' + (85 - (sample.temperature - 37) * 150).toFixed(1); }).join(' '); }
          return h('section', { className: 'anatomy-feedback-experiment', 'aria-labelledby': 'anatomy-feedback-title', 'data-anatomy-feedback-experiment': 'true' },
            h('h5', { id: 'anatomy-feedback-title' }, t('stem.anatomy.feedback_title', 'Predict → compare → explain')),
            h('p', null, t('stem.anatomy.feedback_intro', 'After a brief warming or cooling ends, which model returns closer to its starting temperature?')),
            h('label', { htmlFor: 'anatomy-feedback-disturbance' }, t('stem.anatomy.feedback_disturbance', 'Disturbance'),
              h('select', { id: 'anatomy-feedback-disturbance', value: direction, onChange: function(event) { change({ direction: event.target.value === 'cool' ? 'cool' : 'warm', prediction: '', revealed: false, explanation: '' }); } },
                h('option', { value: 'warm' }, t('stem.anatomy.feedback_warming', 'Brief warming')), h('option', { value: 'cool' }, t('stem.anatomy.feedback_cooling', 'Brief cooling')))),
            h('fieldset', null, h('legend', null, t('stem.anatomy.feedback_prediction', 'Make a prediction')),
              [{ id: 'active', label: activeLabel }, { id: 'disabled', label: disabledLabel }, { id: 'same', label: t('stem.anatomy.feedback_same', 'Both return equally close') }].map(function(option) {
                return h('label', { key: option.id }, h('input', { type: 'radio', name: 'anatomy-feedback-prediction', value: option.id, checked: prediction === option.id, disabled: revealed,
                  onChange: function() { change({ prediction: option.id, revealed: false }); } }), option.label);
              })),
            h('button', { type: 'button', disabled: !prediction, 'data-anatomy-run-feedback': 'true', onClick: function() { if (!prediction) return; change({ revealed: !revealed }); } }, revealed ? t('stem.anatomy.feedback_retry', 'Predict again') : t('stem.anatomy.feedback_run', 'Compare models')),
            revealed ? h('div', { className: 'anatomy-feedback-results', 'data-anatomy-feedback-results': direction },
              h('p', { role: 'status', 'aria-live': 'polite' }, (prediction === 'active' ? t('stem.anatomy.feedback_match', 'Your prediction matches the model. ') : t('stem.anatomy.feedback_rethink', 'Compare your prediction with the model. ')) + t('stem.anatomy.feedback_result', 'Active feedback brings temperature closer to the starting value after the disturbance ends. With the response disabled, the offset remains in this simplified model.')),
              h('svg', { viewBox: '0 0 360 180', role: 'img', 'aria-labelledby': 'anatomy-feedback-chart-title', 'aria-describedby': 'anatomy-feedback-chart-description' },
                h('title', { id: 'anatomy-feedback-chart-title' }, t('stem.anatomy.feedback_chart', 'Temperature over 40 model steps')),
                h('desc', { id: 'anatomy-feedback-chart-description' }, t('stem.anatomy.feedback_chart_desc', 'The solid line returns toward 37°C. The dashed line stays displaced. Exact comparison values are in the table below.')),
                h('path', { d: 'M40 15V150H340 M40 85H340', fill: 'none', stroke: '#64748b', strokeWidth: 1 }),
                h('text', { x: 4, y: 30, fontSize: 11, fill: 'currentColor' }, '°C'),
                [36.6,37,37.4].map(function(value) { return h('text', { key: value, x: 4, y: 89-(value-37)*150, fontSize: 10, fill: 'currentColor' }, String(value)); }),
                [0,8,20,40].map(function(value) { return h('text', { key: value, x: 40+value*7.5, y: 167, textAnchor: 'middle', fontSize: 11, fill: 'currentColor' }, String(value)); }),
                h('polyline', { points: points(disabled), fill: 'none', stroke: '#be123c', strokeWidth: 3, strokeDasharray: '6 4' }),
                h('polyline', { points: points(active), fill: 'none', stroke: '#0f766e', strokeWidth: 3 })),
              h('p', { className: 'anatomy-feedback-legend' }, t('stem.anatomy.feedback_legend', 'Solid: feedback active · Dashed: response disabled. Horizontal axis: model steps. The disturbance ends at step 8.')),
              h('table', null, h('caption', null, t('stem.anatomy.feedback_values', 'Model temperatures (°C)')),
                h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('stem.anatomy.feedback_step', 'Step')), h('th', { scope: 'col' }, activeLabel), h('th', { scope: 'col' }, disabledLabel))),
                h('tbody', null, [0,8,20,40].map(function(step) { return h('tr', { key: step }, h('th', { scope: 'row' }, step), h('td', { 'data-anatomy-feedback-active': step }, active[step].temperature.toFixed(3)), h('td', { 'data-anatomy-feedback-disabled': step }, disabled[step].temperature.toFixed(3))); }))),
              h('p', null, direction === 'warm' ? t('stem.anatomy.feedback_warm_mechanism', 'In the body, the hypothalamus coordinates responses such as sweating and increased skin blood flow to lose heat.') : t('stem.anatomy.feedback_cool_mechanism', 'In the body, the hypothalamus coordinates responses such as shivering and reduced skin blood flow to conserve or generate heat.')),
              h('label', { htmlFor: 'anatomy-feedback-explanation' }, t('stem.anatomy.feedback_explain', 'Why does the response get smaller as temperature approaches its starting value?'),
                h('textarea', { id: 'anatomy-feedback-explanation', rows: 3, maxLength: 2000, value: typeof saved.explanation === 'string' ? saved.explanation.slice(0,2000) : '', onChange: function(event) { change({ explanation: event.target.value.slice(0,2000) }); } }))
            ) : null,
            h('p', { className: 'anatomy-feedback-limit' }, t('stem.anatomy.feedback_limit', 'Illustrative model: 37°C is a chosen starting value, steps are not minutes, and response rates are not calibrated to a person. Real bodies exchange heat continuously and have variable delays and limits.')),
            h('a', { href: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/1-5-homeostasis', target: '_blank', rel: 'noopener noreferrer' }, t('stem.anatomy.feedback_reference', 'Read about negative feedback — OpenStax'))
          );
        }

`;
rep('        function renderScienceSources(structure) {', feedbackCode+'        function renderScienceSources(structure) {');
const homeoTitle="                  h('h4', { className: 'font-bold text-indigo-800 text-sm' }, t('stem.anatomy.homeostasis_discovery_2', '🏠 Homeostasis discovery')),";
rep(homeoTitle,homeoTitle+'\n                  renderFeedbackExperiment(),');

const css = `.anatomy-mobile-activity,.anatomy-mobile-brief{display:none}.anatomy-science-sources{margin:10px 0;padding:8px 10px;border:1px solid #94a3b8;border-radius:10px;font-size:12px;line-height:1.5}.anatomy-science-sources summary{cursor:pointer;min-height:44px;display:list-item;align-content:center;font-weight:800}.anatomy-science-sources a,.anatomy-feedback-experiment a{color:#075985;text-decoration:underline;overflow-wrap:anywhere}.anatomy-science-sources li{margin:6px 0}.anatomy-recall-evidence{font-size:12px;line-height:1.5;color:var(--allo-stem-muted,#475569)}.anatomy-feedback-experiment{padding:14px;border:1px solid #94a3b8;border-radius:12px;background:var(--allo-stem-panel,#f8fafc);color:var(--allo-stem-text,#0f172a);font-size:13px;line-height:1.55;display:grid;gap:10px}.anatomy-feedback-experiment h5{font-size:16px;font-weight:800}.anatomy-feedback-experiment label{display:grid;gap:4px}.anatomy-feedback-experiment fieldset{border:1px solid #94a3b8;border-radius:8px;padding:8px}.anatomy-feedback-experiment legend{font-weight:800}.anatomy-feedback-experiment fieldset label{display:flex;align-items:center;gap:8px;min-height:44px}.anatomy-feedback-experiment select,.anatomy-feedback-experiment textarea{width:100%;min-width:0;border:1px solid #64748b;border-radius:8px;padding:8px;background:var(--allo-stem-panel,#fff);color:inherit;font-size:16px}.anatomy-feedback-experiment select,.anatomy-feedback-experiment button{min-height:44px}.anatomy-feedback-experiment button{background:#0f766e;color:white;border-radius:8px;padding:8px 12px;font-weight:800}.anatomy-feedback-experiment button:disabled{opacity:.6;cursor:not-allowed}.anatomy-feedback-experiment :focus-visible,.anatomy-mobile-activity select:focus-visible,.anatomy-mobile-brief button:focus-visible{outline:3px solid #0891b2;outline-offset:3px}.anatomy-feedback-results{display:grid;gap:10px;min-width:0}.anatomy-feedback-results svg{width:100%;max-height:260px;background:#fff;color:#0f172a;border-radius:8px}.anatomy-feedback-experiment table{border-collapse:collapse;width:100%;font-size:12px}.anatomy-feedback-experiment caption{text-align:start;font-weight:800}.anatomy-feedback-experiment th,.anatomy-feedback-experiment td{border:1px solid #94a3b8;padding:6px;text-align:start}.anatomy-feedback-limit,.anatomy-feedback-legend{font-size:12px}.theme-dark .anatomy-feedback-experiment,.theme-dark .anatomy-mobile-brief{background:#0f172a;color:#e2e8f0}.theme-dark .anatomy-science-sources a,.theme-dark .anatomy-feedback-experiment a{color:#7dd3fc}.theme-dark .anatomy-recall-evidence{color:#cbd5e1}@media(max-width:720px){.anatomy-tool-shell .anatomy-tab-strip{display:none!important}.anatomy-mobile-activity{display:grid;gap:4px;font-size:12px;font-weight:800;margin:0 0 10px}.anatomy-mobile-activity select{width:100%;min-height:44px;border:1px solid #64748b;border-radius:8px;padding:8px;font-size:16px;background:var(--allo-stem-panel,#fff);color:var(--allo-stem-text,#0f172a)}.anatomy-mobile-brief{display:grid;gap:7px;margin:0 0 12px;padding:12px;border:1px solid #94a3b8;border-radius:12px;font-size:13px;line-height:1.5;background:var(--allo-stem-panel,#f8fafc);color:var(--allo-stem-text,#0f172a)}.anatomy-mobile-brief h4{font-size:16px;font-weight:800}.anatomy-mobile-brief button{min-height:44px;padding:8px;background:#0f766e;color:white;border-radius:8px;font-weight:800}.anatomy-tool-shell[data-anatomy-model-focus="true"] .anatomy-mobile-activity,.anatomy-tool-shell[data-anatomy-model-focus="true"] .anatomy-mobile-brief{display:none!important}}`;
rep("      '.theme-dark .anatomy-tool-shell{color:", '      '+JSON.stringify(css)+',\n'+"      '.theme-dark .anatomy-tool-shell{color:");
parser.parse(s, {sourceType:'script'});
fs.writeFileSync(file,s); fs.writeFileSync('desktop/web-app/public/'+file,s);
console.log('Mobile study flow, sourced cards, recall evidence, and feedback experiment updated.');
