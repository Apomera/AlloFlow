const fs=require('node:fs'),parser=require('@babel/parser');
const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function rep(a,b,n=1){const count=s.split(a).length-1;if(count!==n)throw Error(`Expected ${n}, got ${count}: ${a.slice(0,90)}`);s=s.split(a).join(b);}
const start=s.indexOf('  // A portable study record contains'),end=s.indexOf('  try { window.__alloAnatomyStudyPure',start);
if(start<0||end<0)throw Error('Missing packet block');
s=s.slice(0,start)+`  var ANATOMY_LEARNING_NOTE_IDS = ['exercise','meal','wound','fluid','homeostasis'];
  function anatomyLearningNotes(state) {
    state = state || {};
    return ANATOMY_LEARNING_NOTE_IDS.map(function(id) {
      var row = id === 'homeostasis' ? state._feedbackExperiment : state._systemsMotionLearning && state._systemsMotionLearning[id];
      var limit = id === 'homeostasis' ? 2000 : 1200;
      return { id:id, explanation:row && typeof row.explanation === 'string' ? row.explanation.slice(0,limit) : '', transferExplanation:id !== 'homeostasis' && row && typeof row.transferExplanation === 'string' ? row.transferExplanation.slice(0,limit) : '' };
    }).filter(function(row) { return row.explanation.trim() || row.transferExplanation.trim(); });
  }
  // Portable evidence includes notes and cumulative recall counts. Active tests,
  // answer choices, clinical workspace settings and grade profiles stay local.
  // Optional version-1 extensions keep earlier study files readable.
  function anatomyStudyPacket(state, knownIds, now) {
    state = state && typeof state === 'object' ? state : {};
    now = Number.isFinite(now) ? now : Date.now();
    function map(key) { var value = state[key]; return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
    var shared = anatomySharedRatings(state,knownIds,now);
    var viewed = map('_structuresViewed'), confidence = shared.confidence, at = shared.at, notes = map('_structureNotes');
    var records = knownIds.map(function(id) {
      var level = confidence[id] || null, stamp = at[id];
      var row = { id:id, viewed:viewed[id] === true, confidence:level, ratedAt:stamp || null, note:typeof notes[id] === 'string' ? notes[id].slice(0,280) : '' };
      var recall = anatomyRecallRecord(state,id,knownIds);
      if (id === anatomyEvidenceId(id,knownIds) && recall.attempts) row.recall = recall;
      return row;
    }).filter(function(row) { return row.viewed || row.confidence || row.note.trim() || row.recall; });
    var packet = { schema:'alloflow-anatomy-study', version:1, exportedAt:new Date(now).toISOString(), records:records };
    var learningNotes = anatomyLearningNotes(state);
    if (learningNotes.length) packet.learningNotes = learningNotes;
    return packet;
  }
  function parseAnatomyStudyPacket(raw, knownIds) {
    if (!raw || raw.schema !== 'alloflow-anatomy-study' || raw.version !== 1 || !Array.isArray(raw.records) || raw.records.length > 1000) throw new Error('Choose a version 1 Anatomy study record.');
    var seen = {}, records = [], skipped = 0;
    raw.records.forEach(function(row) {
      if (!row || typeof row.id !== 'string' || Object.prototype.hasOwnProperty.call(seen,row.id)) throw new Error('Each study record must have a unique structure ID.');
      Object.defineProperty(seen,row.id,{value:true,enumerable:true});
      if (knownIds.indexOf(row.id) < 0) { skipped++; return; }
      if (typeof row.viewed !== 'boolean' || (row.confidence !== null && ['practice','learning','mastered'].indexOf(row.confidence) < 0) || (row.ratedAt !== null && !(typeof row.ratedAt === 'number' && Number.isFinite(row.ratedAt) && row.ratedAt > 0)) || typeof row.note !== 'string' || row.note.length > 280) throw new Error('The study record has an invalid rating, timestamp, or note.');
      var clean = {id:row.id,viewed:row.viewed,confidence:row.confidence,ratedAt:row.ratedAt,note:row.note};
      if (row.recall !== undefined) {
        var recall = row.recall;
        if (!recall || !Number.isInteger(recall.attempts) || !Number.isInteger(recall.correct) || recall.attempts < 0 || recall.attempts > 1000000 || recall.correct < 0 || recall.correct > recall.attempts) throw new Error('The study record has invalid recall counts.');
        clean.recall = {attempts:recall.attempts,correct:recall.correct};
      }
      records.push(clean);
    });
    if (!records.length && raw.records.length) throw new Error('No structures in this file match the Anatomy catalog.');
    var packet = {schema:'alloflow-anatomy-study',version:1,records:records,skipped:skipped};
    if (raw.learningNotes !== undefined) {
      if (!Array.isArray(raw.learningNotes) || raw.learningNotes.length > ANATOMY_LEARNING_NOTE_IDS.length) throw new Error('The study record has invalid learning notes.');
      var seenNotes = [];
      packet.learningNotes = raw.learningNotes.map(function(row) {
        var limit = row && row.id === 'homeostasis' ? 2000 : 1200;
        if (!row || ANATOMY_LEARNING_NOTE_IDS.indexOf(row.id) < 0 || seenNotes.indexOf(row.id) >= 0 || typeof row.explanation !== 'string' || row.explanation.length > limit || typeof row.transferExplanation !== 'string' || row.transferExplanation.length > limit || row.id === 'homeostasis' && row.transferExplanation !== '') throw new Error('The study record has invalid learning notes.');
        seenNotes.push(row.id);
        return {id:row.id,explanation:row.explanation,transferExplanation:row.transferExplanation};
      });
    }
    return packet;
  }
  function mergeAnatomyStudyPacket(state, packet, knownIds, now) {
    state = state || {}; now = Number.isFinite(now) ? now : Date.now();
    var current = anatomyStudyPacket(state,knownIds,now), incoming = parseAnatomyStudyPacket(packet,knownIds);
    var rows = {};current.records.forEach(function(row){rows[row.id]=Object.assign({},row);});
    var keptNotes = 0;
    incoming.records.forEach(function(row){
      var old = rows[row.id];
      var stamp = row.ratedAt && row.ratedAt <= now ? row.ratedAt : null;
      if(!old){rows[row.id]=Object.assign({},row,{ratedAt:stamp});return;}
      old.viewed = old.viewed || row.viewed;
      if(row.confidence && (!old.confidence || (stamp || 0) > (old.ratedAt || 0))){old.confidence=row.confidence;old.ratedAt=stamp;}
      if(!old.note.trim())old.note=row.note;
      else if(row.note.trim() && row.note!==old.note)keptNotes++;
    });
    var patch={_structuresViewed:{},_structureConfidence:{},_confidenceAt:{},_structureNotes:{},_retrievalEvidence:{}};
    Object.keys(rows).forEach(function(id){var row=rows[id];if(row.viewed)patch._structuresViewed[id]=true;if(row.confidence)patch._structureConfidence[id]=row.confidence;if(row.ratedAt)patch._confidenceAt[id]=row.ratedAt;if(row.note.trim())patch._structureNotes[id]=row.note;});
    var shared = anatomySharedRatings(patch,knownIds,now);patch._structureConfidence=shared.confidence;patch._confidenceAt=shared.at;
    // These are cumulative snapshots, not identifiable events. Keep the larger
    // complete record; adding snapshots would inflate repeated or shared imports.
    current.records.concat(incoming.records).forEach(function(row) {
      if (!row.recall || !row.recall.attempts) return;
      var id = anatomyEvidenceId(row.id,knownIds), old = patch._retrievalEvidence[id];
      if (!old || row.recall.attempts > old.attempts) patch._retrievalEvidence[id] = Object.assign({},row.recall);
    });
    var keptReflections = 0;
    (incoming.learningNotes || []).forEach(function(row) {
      var homeostasis = row.id === 'homeostasis';
      var old = homeostasis ? state._feedbackExperiment : state._systemsMotionLearning && state._systemsMotionLearning[row.id];
      var next = Object.assign({},old && typeof old === 'object' && !Array.isArray(old) ? old : {});
      ['explanation','transferExplanation'].forEach(function(key) {
        if (homeostasis && key === 'transferExplanation') return;
        var previous = typeof next[key] === 'string' ? next[key] : '';
        if (!previous.trim()) next[key] = row[key];
        else if (row[key].trim() && row[key] !== previous) keptReflections++;
      });
      if (homeostasis) patch._feedbackExperiment = next;
      else { if (!patch._systemsMotionLearning) patch._systemsMotionLearning = Object.assign({},state._systemsMotionLearning); patch._systemsMotionLearning[row.id] = next; }
    });
    return {patch:patch,keptNotes:keptNotes,keptReflections:keptReflections,imported:incoming.records.length,skipped:incoming.skipped || 0};
  }
`+s.slice(end);
rep("reference: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/5-3-functions-of-the-integumentary-system'","reference: 'https://openstax.org/books/medical-surgical-nursing/pages/28-1-cellular-response-and-adaptation-in-wound-healing'");
rep("days: reviewDaysSince(structure.id) };","days: reviewDaysSince(structure.id), recall: getRecallEvidence(structure.id) };");
rep("}).filter(function(row) { return row.level || row.note || row.viewed; });","}).filter(function(row) { return row.level || row.note || row.viewed || row.recall.attempts; });");
rep("              if (row.note) lines.push('    In my words: ' + row.note);","              if (row.note) lines.push('    In my words: ' + row.note);\n              if (row.recall.attempts) lines.push('    ' + recallStudyText(row.recall));");
rep("          return lines.join('\\n');",`          studyReflections().forEach(function(row) {
            lines.push('', '== ' + row.title + ' ==', row.context);
            if (row.explanation) lines.push(t('stem.anatomy.study_reflection_explanation','My explanation: ') + row.explanation);
            if (row.transferExplanation) lines.push(row.transferPrompt, t('stem.anatomy.study_reflection_transfer','My comparison: ') + row.transferExplanation);
          });
          return lines.join('\\n');`);
const helpers=`        function recallStudyText(recall) {
          return recall.correct + '/' + recall.attempts + ' ' + t('stem.anatomy.study_recall_label','scored answers correct. Shared across entries for this organ; separate from your confidence rating.');
        }
        function studyReflections() {
          return anatomyLearningNotes(d).map(function(row) {
            var scenario = SYSTEMS_IN_MOTION_SCENARIOS[row.id], lesson = MOTION_LEARNING[row.id];
            return Object.assign({},row,{title:scenario ? scenario.title : t('stem.anatomy.study_homeostasis_reflection','Homeostasis: temperature feedback'),context:lesson ? lesson.prediction : t('stem.anatomy.study_homeostasis_context','Explain how feedback changes the direction of a temperature disturbance.'),transferPrompt:lesson ? lesson.transfer : ''});
          });
        }
        function renderStudyReflections() {
          var notes = studyReflections(); if (!notes.length) return null;
          return h('div',{className:'anatomy-study-sheet-system','data-anatomy-study-reflections':true},
            h('h4',null,t('stem.anatomy.study_reflections_title','My explanations and comparisons')),
            h('p',null,t('stem.anatomy.study_reflections_scope','Saved writing for reflection, not an automatic mastery score. These notes are included in text and JSON downloads.')),
            notes.map(function(row) { return h('article',{key:row.id,className:'anatomy-motion-learning','data-anatomy-study-reflection':row.id},
              h('h5',null,row.title),h('p',null,row.context),
              row.explanation && h('p',null,h('strong',null,t('stem.anatomy.study_reflection_explanation','My explanation: ')),row.explanation),
              row.transferExplanation && h('div',null,h('p',null,row.transferPrompt),h('p',null,h('strong',null,t('stem.anatomy.study_reflection_transfer','My comparison: ')),row.transferExplanation)),
              h('button',{type:'button','data-anatomy-resume-reflection':row.id,onClick:function(){upd('_showStudySheet',false);if(row.id==='homeostasis')activateAnatomyTab('homeostasis');else openSystemsMotionStep(0,null,row.id);}},t('stem.anatomy.study_reflection_resume','Return to this activity'))
            ); })
          );
        }

`;
rep('        function studyNotice(message) {',helpers+'        function studyNotice(message) {');
rep("                    row.note ? h('p', { className: 'anatomy-study-sheet-note' }","                    row.recall.attempts ? h('p', { 'data-anatomy-study-recall': row.structure.id, className: 'anatomy-study-sheet-fn' }, recallStudyText(row.recall)) : null,\n                    row.note ? h('p', { className: 'anatomy-study-sheet-note' }");
rep("t('stem.anatomy.study_sheet_empty', 'Nothing recorded yet. Open structures, rate them, and write notes to fill this sheet.'))\n          );","t('stem.anatomy.study_sheet_empty', 'Nothing recorded yet. Open structures, rate them, and write notes to fill this sheet.')),\n            renderStudyReflections()\n          );");
rep("                h('label',{htmlFor:'anatomy-study-import-file'},","                h('p',null,t('stem.anatomy.study_import_learning_help','Scored practice and activity explanations are included when available. Repeated imports keep the larger practice record without adding totals. Existing explanations are preserved when both files have writing.')),\n                h('label',{htmlFor:'anatomy-study-import-file'},");
rep("                  h('button',{type:'button',onClick:mergeAnatomyStudy}","                  h('p',null,importPreview.records.filter(function(row){return row.recall && row.recall.attempts;}).length+' '+t('stem.anatomy.study_import_recall','practice records')+' · '+(importPreview.learningNotes||[]).length+' '+t('stem.anatomy.study_import_reflections','activity reflections')),\n                  h('button',{type:'button',onClick:mergeAnatomyStudy}");
rep("+merged.keptNotes+'.'})","+merged.keptNotes+'. '+t('stem.anatomy.study_merge_reflections_kept','Existing explanations preserved: ')+merged.keptReflections+'.'})");
parser.parse(s,{sourceType:'script'});fs.writeFileSync(file,s);fs.copyFileSync(file,'desktop/web-app/public/stem_lab/stem_tool_anatomy.js');console.log('Portable recall evidence and learning reflections integrated.');
