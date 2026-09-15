const fs=require('fs');const f='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(f,'utf8');const strings={};
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,90));s=s.replace(a,b);}
const T=(k,v)=>{strings['ref2_'+k]=v;return 't('+JSON.stringify('stem.anatomy.ref2_'+k)+','+JSON.stringify(v)+')';};
replace("['science-v2', sysKey", "['science-v3', sysKey");
replace("if(!sameQuizQuestion(state)||state.quizFeedback&&typeof state.quizFeedback.chosen==='string')return previous;", "if(!sameQuizQuestion(state)||(state.quizFeedback&&quizOptions.some(function(option){return option.id===state.quizFeedback.chosen;})&&(state.quizFeedback.questionKey==null||state.quizFeedback.questionKey===quizQuestionKey)))return previous;");
const cases={
femur:'A fracture near the hip can interrupt vessels supplying the head of the thigh bone. Which bone is involved?',
quads:'A tendon injury disrupts the force that straightens the knee. Which muscle group produces that extension force?',
rotator_cuff:'Four shoulder muscles help stabilize the upper-arm bone in its socket. Which group loses part of its force transmission when one of its tendons tears?',
aorta:'An enlargement and a separation of wall layers are different problems in the main artery leaving the left ventricle. Which vessel is being studied?',
carotid:'Plaque in an artery of the neck can release material that travels toward smaller arteries in the brain. Which listed vessels provide this route?',
hippocampus:'Injury to a medial temporal brain structure can impair formation of new episodic memories. Which structure is involved?',
spleen:'An injury affects a blood-rich organ that removes old red blood cells and supports immune responses to blood-borne germs. Which organ is involved?',
kidneys:'Disease disrupts blood filtration, fluid balance, and acid-base regulation. Which paired organs normally perform these tasks?',
pancreas:'Disease affects an organ with enzyme-producing tissue, ducts, and hormone-producing islets. Which organ is involved?',
sweat_glands:'High humidity limits evaporation of a fluid produced in the skin, reducing its cooling effect. Which structures produce that fluid?',
testes_repro:'Twisting a spermatic cord threatens blood flow to an organ that produces sperm. Which organ is supplied by that cord?',
epididymis:'Inflammation affects the coiled duct behind a testis where sperm mature and are stored. Which structure is involved?',
prostate:'Enlargement of a gland surrounding the urethra can affect urine flow. Which gland is involved?'
};
const dict='        var QUIZ_APPLICATION_STEMS={'+Object.entries(cases).map(([k,v])=>JSON.stringify(k)+':'+T('case_'+k,v)).join(',')+'};\n        var quizApplicationStem=quizQ&&!youngLearner?QUIZ_APPLICATION_STEMS[quizQ.id]:null;\n';
replace('        function quizPromptText() {',dict+'        function quizPromptText() {');
replace("return (quizType===3&&!youngLearner?t('stem.anatomy.which_structure_is_affected','Which structure is affected?'):t('stem.anatomy.which_structure_has_this_function','Which structure has this function?'))+' '+(quizType===3&&!youngLearner&&quizQ.clinical?quizStemText(quizQ,'clinical',160):quizStemText(quizQ,'fn',160));", "return quizType===3&&quizApplicationStem?quizApplicationStem:t('stem.anatomy.which_structure_has_this_function','Which structure has this function?')+' '+quizStemText(quizQ,'fn',160);");
replace("(youngLearner ? t('stem.anatomy.quiz_type_describe', 'Describe it') : 'Clinical Challenge')", "(quizApplicationStem ? "+T('application','Apply structure and function')+" : t('stem.anatomy.quiz_type_describe', 'Describe it'))");
replace("youngLearner ? t('stem.anatomy.which_structure_is_this', 'Which structure is this?') : t('stem.anatomy.which_structure_is_affected', 'Which structure is affected?')", "t('stem.anatomy.which_structure_is_this', 'Which structure is this?')");
replace("(quizQ.clinical && !youngLearner) ? quizStemText(quizQ, 'clinical', 160) : quizStemText(quizQ, 'fn', 160)", "quizApplicationStem || quizStemText(quizQ, 'fn', 160)");
replace('freq:"30 Hz and above"','freq:'+T('gamma_frequency','30 Hz and above'));
const start=s.indexOf('        var CONNECTION_STRUCTURES={'),end=s.indexOf('        var selectedSystemConnections=',start);
s=s.slice(0,start)+`        var CONNECTION_STRUCTURES={
          conn_1:['alveoli','lungs','pulm_art'],
          conn_2:['biceps','triceps','deltoid','quads','hamstrings','gastrocnemius','sciatic','femoral_n','brachial_plexus'],
          conn_3:['femur','humerus','radius','ulna','tibia','patella','scapula','clavicle','biceps','triceps','quads','hamstrings','deltoid','rotator_cuff'],
          conn_4:['hypothalamus','hypothal_endo','pituitary','ovaries_endo','ovaries_repro','testes_endo','testes_repro'],
          conn_5:['cervical_ln','axillary_ln','inguinal_ln','thoracic_duct','lymph_circ'],
          conn_6:['hypothalamus','hypothal_endo','pituitary','thyroid','adrenal_endo','adrenals'],
          conn_7:['diaphragm','diaphragm_m','intercostals','resp_muscles','lungs','bronchi'],
          conn_8:['epidermis','dermis'],
          conn_9:['portal','liver','stomach','sm_intestine','lg_intestine','pancreas','spleen'],
          conn_10:['bone_marrow','pelvis','sternum','ribs','vertebral','femur','humerus']
        };
`+s.slice(end);
replace("var partnerSystemId = connection.systems[0] === sysKey ? connection.systems[1] : connection.systems[0];\n                var partnerSystem = SYSTEMS[partnerSystemId];\n                if (!partnerSystem) return null;", "var partnerSystemIds=connection.systems.filter(function(id){return id!==sysKey&&SYSTEMS[id];});");
replace("h('button', {\n                    type: 'button', className: 'anatomy-relation-node', 'data-kind': 'partner',", "partnerSystemIds.map(function(partnerSystemId){var partnerSystem=SYSTEMS[partnerSystemId];return h('button', {\n                    key:partnerSystemId,type: 'button', className: 'anatomy-relation-node', 'data-kind': 'partner',");
replace("}, 'Partner system'), h('strong', null, partnerSystem.icon + ' ' + partnerSystem.name))", "}, "+T('participating_system','Participating system')+"), h('strong', null, partnerSystem.icon + ' ' + partnerSystem.name));})");
replace("' Arrow keys move the answer cursor; Enter submits an answer.'",T('scan_answer_keys',' Arrow keys move the answer cursor; Enter submits an answer.'));
replace("' Answer review. Choose Next structure or End challenge before placing annotations.'",T('scan_review_keys',' Answer review. Choose Next structure or End challenge before placing annotations.'));
replace("' Arrow keys move a placement cursor, Enter places the current tool, Escape cancels a ruler.'",T('scan_place_keys',' Arrow keys move a placement cursor, Enter places the current tool, Escape cancels a ruler.'));
replace("          var conversationContext = aiMessages.slice(-6)","          if(sel&&sel.brainWaves){lessonContext+='\\nSleep lesson: '+"+T('sleep_intro','Your brain stays active while you sleep. Different stages repeat through the night and help you rest and learn.')+";if(!youngLearner)lessonContext+='\\nSleep stages: '+sel.sleepStages.map(function(stage){return stage.stage+': '+stage.desc;}).join(' ')+'\\nEEG bands: '+sel.brainWaves.map(function(wave){return wave.type+' ('+wave.freq+'): '+wave.characteristics;}).join(' ')+'\\nEEG source: https://www.ncbi.nlm.nih.gov/books/NBK390343/';}\n          var conversationContext = aiMessages.slice(-6)");
fs.writeFileSync(f,s);fs.writeFileSync('desktop/web-app/public/'+f,s);fs.writeFileSync('reports/anatomy-integrated-refinements-2026-09-12/strings-finish.json',JSON.stringify(strings,null,2)+'\n');
