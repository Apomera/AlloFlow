const fs=require('fs');
const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8');fs.writeFileSync(__dirname+'/before.js',s);
function replace(a,b){if(!s.includes(a))throw Error('Missing: '+a.slice(0,140));s=s.replace(a,b);}
function block(start,end,value){const a=s.indexOf(start),b=s.indexOf(end,a);if(a<0||b<0)throw Error('Missing block '+start);s=s.slice(0,a)+value+s.slice(b);}
block('          var counts = { practice: 0, learning: 0, mastered: 0, notes:', '        function recallStudyText(recall)',fs.readFileSync(__dirname+'/summary.fragment.js','utf8'));
replace("            var state=previous.anatomy||{},merged;", "            var state=previous.anatomy||{},merged;\n            if (state._studyImportPreview !== d._studyImportPreview || !state._showStudySheet) return previous;");
replace("if(input._anatomyImportRead===generation)studyNotice", "if(input._anatomyImportRead===generation && input.isConnected)studyNotice");
replace("        function setStructureNote(structureId, text) {\r\n          if (knownStructureIds.indexOf(structureId) === -1) return;\r\n          var next = Object.assign({}, structureNotes);\r\n          var clean = typeof text === 'string' ? text.slice(0, 280) : '';\r\n          if (clean.trim()) next[structureId] = clean; else delete next[structureId];\r\n          upd('_structureNotes', next);\r\n        }", `        function setStructureNote(structureId, text) {
          if (knownStructureIds.indexOf(structureId) === -1) return;
          var clean = typeof text === 'string' ? text.slice(0, 280) : '';
          setLabToolData(function(previous) {
            var state = previous.anatomy || {}, raw = state._structureNotes || {}, next = {};
            knownStructureIds.forEach(function(id) { if (typeof raw[id] === 'string' && raw[id].trim()) next[id] = raw[id].slice(0, 280); });
            if (clean.trim()) next[structureId] = clean; else delete next[structureId];
            return Object.assign({}, previous, { anatomy: Object.assign({}, state, { _structureNotes: next }) });
          });
        }`);
// Keyboard users land on the sheet, and closing it restores its trigger.
replace("        function renderStudySheet() {", `        function toggleStudySheet(open) {
          upd('_showStudySheet', open);
          setTimeout(function() {
            var target = document.querySelector(open ? '#anatomy-study-sheet-title' : '[data-anatomy-study-toggle]');
            if (target) target.focus();
          }, 0);
        }
        function renderStudySheet() {`);
replace("{ id: 'anatomy-study-sheet-title' }", "{ id: 'anatomy-study-sheet-title', tabIndex: -1 }");
replace("onClick: function() { upd('_showStudySheet', false); }, className:", "onClick: function() { toggleStudySheet(false); }, className:");
replace("type: 'button', 'aria-expanded': showStudySheet, 'aria-controls': 'anatomy-study-sheet',", "type: 'button', 'data-anatomy-study-toggle': true, 'aria-expanded': showStudySheet, 'aria-controls': 'anatomy-study-sheet',");
replace("onClick: function() { upd('_showStudySheet', !showStudySheet);", "onClick: function() { toggleStudySheet(!showStudySheet);");
replace("t('stem.anatomy.study_filter_system','Body system')", "t('stem.anatomy.study_ref_collection','Browsing collection')");
replace("t('stem.anatomy.study_filter_system','Body system')", "t('stem.anatomy.study_ref_collection','Browsing collection')");
replace("t('stem.anatomy.study_all_systems','All systems')", "t('stem.anatomy.study_ref_all_collections','All collections')");
replace("visibleCount+' '+t('stem.anatomy.study_results','structures shown. Downloads and copied text include all recorded structures.')", "formatAnatomyStudyText(t('stem.anatomy.study_ref_results','{count} catalog entries shown. Print uses these filters; text and JSON downloads include all saved work.'),{count:visibleCount})");
replace("              h('p',{'data-anatomy-study-record-notice':true", "              (sheetFilter !== 'all' || sheetSystem !== 'all') && h('button',{type:'button','data-anatomy-study-reset-filters':true,onClick:function(){updMulti({_studySheetFilter:'all',_studySheetSystem:'all'});}},t('stem.anatomy.study_ref_reset','Show all saved work')),\n              h('p',{'data-anatomy-study-record-notice':true");
const oldStats="[[data.counts.viewed, t('stem.anatomy.structures_viewed', 'Structures viewed')], [data.counts.practice, t('stem.anatomy.need_practice', 'Need practice')], [data.counts.learning, t('stem.anatomy.learning', 'Learning')], [data.counts.mastered, t('stem.anatomy.got_it', 'Got it')], [totalCorrect, t('stem.anatomy.quiz_correct', 'Quiz correct')], [spotterScore, t('stem.anatomy.spotter_ids', 'Spotter IDs')], [data.counts.notes, t('stem.anatomy.notes_written', 'Notes written')]]";
replace(oldStats,"studySummaryMetrics(data)");
replace("h('div', { key: pair[1], role: 'listitem' }", "h('div', { key: pair[2], role: 'listitem', 'data-anatomy-study-metric': pair[2] }");
replace("            h('p', { className: 'anatomy-study-sheet-next' }, h('strong'", `            h('details', {className:'anatomy-study-evidence-guide','data-anatomy-study-evidence-guide':true},
              h('summary',null,t('stem.anatomy.study_ref_guide_title','What these records mean')),
              h('p',null,t('stem.anatomy.study_ref_counts_help','Totals cover all saved work. Each anatomical structure counts once, even when it appears in more than one collection. Notes are counted per catalog entry.')),
              h('p',null,t('stem.anatomy.study_ref_evidence_help','Viewed means opened, not learned. Ratings guide practice: you can set them yourself, and scored answers can update Need practice or Learning. Got it is a self-rating, not proof of mastery.')),
              h('p',null,t('stem.anatomy.study_ref_schedule_help','This tool suggests review now for Need practice, after 2 days for Learning, and after 7 days for Got it. An undated rating is ready for a re-check. These are practice reminders, not a measurement of forgetting.')),
              h('p',null,t('stem.anatomy.study_ref_shared_help','Repeated entries share ratings and scored-answer records for the same structure. Their notes stay separate. A browsing collection is not necessarily a single body system.'))
            ),
            h('p', { className: 'anatomy-study-sheet-next' }, h('strong'`);
replace("t('stem.anatomy.study_sheet_due_why', 'You rated these a while ago, so one more look keeps them solid.')", "t('stem.anatomy.study_ref_due_help','Try recalling each function before checking it. These reminders follow the rating dates above; they do not mean an answer was wrong.')");
replace("t('stem.anatomy.study_review_system','Review this system')", "t('stem.anatomy.study_ref_review_collection','Review this collection')");
replace("h('span', { className: 'anatomy-study-sheet-viewed' }, t('stem.anatomy.viewed', 'viewed'))", "h('span', { className: 'anatomy-study-sheet-viewed', 'data-anatomy-study-unrated':row.viewed?'viewed':'saved' }, row.viewed?t('stem.anatomy.viewed', 'viewed'):t('stem.anatomy.study_ref_saved_work','Saved work · not rated'))");
replace("t('stem.anatomy.study_filter_empty','No recorded structures match these filters. Choose All systems and All recorded structures to see your work.')", "t('stem.anatomy.study_ref_filter_empty','No recorded structures match these filters. Select Show all saved work to see your entries.')");
replace("      '.anatomy-own-words textarea{", "      "+JSON.stringify(fs.readFileSync(__dirname+'/styles.css','utf8').replace(/\s+/g,' '))+",\n      '.anatomy-own-words textarea{");
fs.writeFileSync(file,s);fs.writeFileSync('desktop/web-app/public/'+file,s);console.log('Updated study summaries, saved-state handling, and keyboard focus.');
