const fs=require('node:fs');const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');const strings={};
const T=(key,value)=>{strings['ref2_'+key]=value;return 't('+JSON.stringify('stem.anatomy.ref2_'+key)+','+JSON.stringify(value)+')';};
function replace(a,b){a=a.replace(/\r\n/g,'\n');if(!s.includes(a))throw Error('Missing anchor: '+a.slice(0,100));s=s.replace(a,b);}
function between(a,b,value){const start=s.indexOf(a),end=s.indexOf(b,start);if(start<0||end<0)throw Error('Missing block '+a);s=s.slice(0,start)+value+s.slice(end);}
replace("var quizQ2 = quizPool[quizRoundIdx % quizPool.length];","var quizQ2 = quizQ;");
replace("function quizQuestionSnapshot(index, pool) { return { context: quizQuestionContext, index: index, poolIds: pool.map(function(structure) { return structure.id; }) }; }\r\n        var currentQuizQuestion = quizQuestionSnapshot(quizRoundIdx, quizPool);",`function quizQuestionSnapshot(index, pool, seed) {
          return { context: quizQuestionContext, index: index, poolIds: pool.map(function(structure) { return structure.id; }), token: Date.now().toString(36)+'-'+Math.random().toString(36).slice(2), binaryTrue: ((quizSeed((seed || d._quizSeed || 'practice-v3')+'|'+quizQuestionContext+'|'+index) >>> 16) & 1) === 0 };
        }
        var currentQuizQuestion = storedQuizQuestionValid ? storedQuizQuestion : quizQuestionSnapshot(quizRoundIdx, quizPool);`);
replace("tfTrue = (Math.floor(quizRoundIdx / quizTypeCount) % 2) === 0;","tfTrue = typeof currentQuizQuestion.binaryTrue === 'boolean' ? currentQuizQuestion.binaryTrue : ((quizSeed('practice-v3|'+quizQuestionContext+'|'+quizRoundIdx) >>> 16) & 1) === 0;");
between('        // True/False (type 1):','        var tfTrue',`        // A question keeps its stored truth value through answers and reloads. New sessions
        // vary their seed; truth is not inferred from alternating question numbers.
`);
between('        // One answer path for pointer and keyboard','        // ── Hover state',`        function sameQuizQuestion(state) {
          var tab=anatomyTabOrder.indexOf(state._activeTab)!==-1?state._activeTab:(state.quizMode===true?'quiz':'explore');
          if(tab!=='quiz'||(state.system||'skeletal')!==sysKey||(state.view||'anterior')!==view||(Number(state.complexity)||defaultComplexity)!==complexity||safeNonNegativeNumber(state.quizIdx,0,true)!==quizRoundIdx)return false;
          var saved=state._quizQuestion;
          if(storedQuizQuestionValid)return !!saved&&JSON.stringify(saved)===JSON.stringify(storedQuizQuestion);
          return !saved || JSON.stringify(saved)===JSON.stringify(d._quizQuestion);
        }
        function focusQuizQuestion() {
          setTimeout(function(){var panel=document.querySelector('[data-anatomy-quiz-panel]');if(!panel)return;panel.focus();var prompt=panel.querySelector('[data-anatomy-quiz-prompt]');if(prompt&&typeof announceToSR==='function')announceToSR(prompt.textContent);},0);
        }
        function restartQuizPractice() {
          var seed=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
          updMulti({quizIdx:0,quizScore:0,quizFeedback:null,_quizAttempts:0,_quizSeed:seed,_quizQuestion:quizQuestionSnapshot(0,rankedQuizPool,seed)});focusQuizQuestion();
        }
        function advanceQuizQuestion() {
          var accepted=false;
          setLabToolData(function(previous){var state=previous.anatomy||{};if(!sameQuizQuestion(state)||!state.quizFeedback)return previous;accepted=true;return Object.assign({},previous,{anatomy:Object.assign({},state,{quizIdx:quizRoundIdx+1,quizFeedback:null,_quizQuestion:quizQuestionSnapshot(quizRoundIdx+1,rankedQuizPool)})});});
          setTimeout(function(){if(accepted)focusQuizQuestion();},0);
        }
        function quizPromptText() {
          if(!quizQ)return '';
          if(quizType===1)return (tfMyth?${T('myth_prompt','Myth or fact? ')}+(tfTrue?tfMyth.fact:tfMyth.myth):${T('tf_prompt','True or false? ')}+quizQ.name+': '+quizStemText(tfClaimStructure,'fn',140));
          if(quizType===2)return t('stem.anatomy.science_quiz_membership','Which listed body system includes this structure?')+' '+quizQ.name;
          return (quizType===3&&!youngLearner?t('stem.anatomy.which_structure_is_affected','Which structure is affected?'):t('stem.anatomy.which_structure_has_this_function','Which structure has this function?'))+' '+(quizType===3&&!youngLearner&&quizQ.clinical?quizStemText(quizQ,'clinical',160):quizStemText(quizQ,'fn',160));
        }
        // Pointer and keyboard answers use fresh state, preserving newer study records.
        var quizAnswerSubmitted=false;
        function answerQuizOption(opt) {
          if(!quizQ||!opt||quizFeedback||quizAnswerSubmitted||!quizOptions.some(function(option){return option.id===opt.id;}))return;
          quizAnswerSubmitted=true;var correct=isCorrectQuizAnswer(opt.id),accepted=false,announced=false;
          setLabToolData(function(previous){
            var state=previous.anatomy||{};
            if(!sameQuizQuestion(state)||state.quizFeedback&&typeof state.quizFeedback.chosen==='string')return previous;
            var score=safeNonNegativeNumber(state.quizScore,0,true),attempts=Math.max(score,safeNonNegativeNumber(state._quizAttempts,0,true));
            var patch={_quizQuestion:currentQuizQuestion,quizFeedback:{chosen:opt.id,correct:correct,questionKey:quizQuestionKey},_quizAttempts:attempts+1,_streak:correct?safeNonNegativeNumber(state._streak,0,true)+1:0};
            if(correct){patch.quizScore=score+1;patch._totalCorrect=safeNonNegativeNumber(state._totalCorrect,0,true)+1;}
            accepted=true;return Object.assign({},previous,{anatomy:Object.assign({},state,patch,confidenceEvidencePatch(quizQ.id,correct,state))});
          });
          function notifyAnswer(){if(!accepted||announced)return;announced=true;playSound(correct?'quizCorrect':'quizWrong');if(typeof announceToSR==='function')announceToSR((correct?t('stem.anatomy.quiz_sr_correct','Correct. '):t('stem.anatomy.quiz_sr_wrong','Not quite. The answer was ')+quizAnswerLabel+'. ')+clipAtSentence(learnerText(quizQ),140));}
          notifyAnswer();setTimeout(notifyAnswer,0);
        }

`);
replace("changeTab({ _activeTab: 'quiz', quizMode: true, _quizQuestion: currentQuizQuestion });","changeTab({ _activeTab: 'quiz', quizMode: true, _quizQuestion: currentQuizQuestion });\n            focusQuizQuestion();");
replace("onClick: function() { updMulti({ quizIdx: 0, quizScore: 0, quizFeedback: null, _quizAttempts: 0, _quizQuestion: quizQuestionSnapshot(0, rankedQuizPool) }); },","onClick: restartQuizPractice,");
replace("onClick: function() { updMulti({ quizIdx: quizRoundIdx + 1, quizFeedback: null, _quizQuestion: quizQuestionSnapshot(quizRoundIdx + 1, rankedQuizPool) }); },","onClick: advanceQuizQuestion,");
replace("'\\u2B50 Score ' + quizScore + ' - Question ' + ((quizRoundIdx % quizPool.length) + 1) + '/' + quizPool.length",`formatAnatomyStudyText(${T('quiz_progress','Continuous practice · {correct} correct / {attempts} answered · Question {number}')},{correct:quizScore,attempts:Math.max(quizAttempts,quizScore),number:quizRoundIdx+1})`);
replace("                    // Question text varies by type",`                    h('p',{'data-anatomy-quiz-prompt':true,className:'sr-only'},quizPromptText()),
                    ttsBtn(quizPromptText(),${T('read_question','Read the question aloud')}),
                    // Question text varies by type`);
replace("quizQ.clinical && !youngLearner && h('p', { className: 'text-slate-600 italic' }, h('span', { className: 'font-bold text-rose-700' }, t('stem.anatomy.clinical', '\\u26A0 Clinical: ')), clipAtSentence(quizQ.clinical, 140))","!youngLearner ? renderClinicalNote(quizQ,false) : null");
replace("Magnet and radio waves. Fat is bright, fluid is dark, so soft-tissue anatomy is crisp. Takes minutes. No radiation.","Magnet and radio waves. On a conventional T1-weighted image, fat is often bright and simple fluid dark. MRI uses no ionizing radiation.");
replace("'stem.anatomy.modality_t1_note'","'stem.anatomy.ref2_mri_t1'");strings.ref2_mri_t1='Magnet and radio waves. On a conventional T1-weighted image, fat is often bright and simple fluid dark. MRI uses no ionizing radiation.';
replace("'stem.anatomy.modality_q_fracture_why', 'CT shows bone and fresh bleeding in seconds. MRI takes far longer and is unsafe until metal is ruled out.'",`'stem.anatomy.ref2_mri_screening', 'CT is often used for rapid assessment of suspected acute skull injury and bleeding. MRI requires safety screening: implants and devices must be identified and their MR safety conditions checked.'`);strings.ref2_mri_screening='CT is often used for rapid assessment of suspected acute skull injury and bleeding. MRI requires safety screening: implants and devices must be identified and their MR safety conditions checked.';
replace("t('stem.anatomy.modality_check_title', 'Which scan would you order?')",T('scan_question','Which scan best fits this teaching scenario?'));
replace("                    h('div', { className: 'mt-3 space-y-2', 'data-anatomy-modality-check'",`                    h('a',{href:'https://www.fda.gov/radiation-emitting-products/mri-magnetic-resonance-imaging/benefits-and-risks',target:'_blank',rel:'noopener noreferrer',className:'inline-flex items-center min-h-[44px] text-xs font-bold underline text-cyan-900'},${T('mri_source','Source: FDA MRI benefits and risks')}),
                    h('div', { className: 'mt-3 space-y-2', 'data-anatomy-modality-check'`);
replace("function setImaging(patch) { upd('imaging', Object.assign({}, savedImaging, patch)); }",`function setImaging(patch) { setLabToolData(function(previous){var state=previous.anatomy||{},current=state.imaging&&typeof state.imaging==='object'?state.imaging:{};return Object.assign({},previous,{anatomy:Object.assign({},state,{imaging:Object.assign({},current,patch)})});}); }`);
replace("                  if (answerSpot(x, y)) return;",`                  if (spot.active) { if (spotRoundOpen) answerSpot(x,y); return; }`);
// When a held Enter repeats after an answer, it stays in review instead of becoming a pin.
replace("                function handleImagingKey(event) {\r\n                  var k = event.key;",`                function handleImagingKey(event) {
                  if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.repeat)return;
                  var k = event.key;`);
replace("' Arrow keys move a placement cursor, Enter places the current tool, Escape cancels a ruler.'",`(spot.active ? (spotRoundOpen?' Arrow keys move the answer cursor; Enter submits an answer.':' Answer review. Choose Next structure or End challenge before placing annotations.') : ' Arrow keys move a placement cursor, Enter places the current tool, Escape cancels a ruler.')`);
// Typed associations are authored for the selected structure, independent of navigation collection.
between('        var selectedSystemConnections =','        function openRelationshipConnection',`        var CONNECTION_STRUCTURES={
          conn_1:['alveoli','lungs','pulm_artery','pulm_vein','capillaries'],
          conn_2:['biceps','triceps','deltoid','quads','hamstrings','gastrocnemius','sciatic','femoral_nerve','brachial_plexus'],
          conn_3:['femur','humerus','radius','ulna','tibia','patella','scapula','clavicle','biceps','triceps','quads','hamstrings','deltoid','rotator_cuff'],
          conn_4:['hypothalamus','pituitary','ovaries','testes','testes_repro'],
          conn_5:['lymph_nodes','lymph_vessels','thoracic_duct'],
          conn_6:['hypothalamus','pituitary','thyroid','thyroid_endo','adrenal','adrenals'],
          conn_7:['diaphragm','intercostals','lungs','bronchi','bronchioles'],
          conn_8:['epidermis','dermis','meissner','pacinian','free_nerve'],
          conn_9:['liver','stomach','sm_intestine','lg_intestine','pancreas','spleen'],
          conn_10:['pelvis','sternum','ribs','vertebral','femur','humerus']
        };
        var selectedSystemConnections=sel?CONNECTIONS.filter(function(connection){return (CONNECTION_STRUCTURES[connection.id]||[]).indexOf(sel.id)!==-1;}):[];
`);
replace("if (!sel || selectedSystemConnections.length === 0) return null;","if (!sel) return null;");
replace("'See how this structure sits inside a wider body-system network.'",T('relationship_intro','Explore processes that involve this structure.'));
replace("'System process'",T('direct_process','Related process'));
replace("t('stem.anatomy.science_connection_scope', 'Links below describe the selected navigation collection. Some involve this structure directly; others involve a wider system process.')",`selectedSystemConnections.length?${T('relationship_scope','These links connect the selected structure with an authored body-system process.')} : ${T('relationship_empty','No direct process link has been authored for this structure yet. Explore all links to browse other system processes.')}`);
// A connection can now be reached from a shared-organ collection; expose both participating diagrams.
replace("var partnerSystemId = connection.systems[0] === sysKey ? connection.systems[1] : connection.systems[0];","var partnerSystemId = connection.systems[0] === sysKey ? connection.systems[1] : connection.systems[0];");
fs.writeFileSync(file,s);fs.writeFileSync('desktop/web-app/public/'+file,s);fs.writeFileSync(__dirname+'/strings-core.json',JSON.stringify(strings,null,2)+'\n');
