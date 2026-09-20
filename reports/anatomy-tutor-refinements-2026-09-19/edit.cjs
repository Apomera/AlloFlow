const fs=require('fs');const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8');fs.writeFileSync(__dirname+'/before.js',s);
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replace(a,b);}
replace('        // ── AI Tutor state ──',`        // ── AI Tutor state ──
        var aiHistoryCompatible=d._aiConversationBand===gradeBand||(!youngLearner&&!d._aiConversationBand);
        var aiHistoryReset=!aiHistoryCompatible&&Array.isArray(d._aiMessages)&&d._aiMessages.length>0;
        var pendingTutor=window.__alloAnatomyAiRequest;
        if(pendingTutor&&pendingTutor.band!==gradeBand){clearTimeout(pendingTutor.timer);window.__alloAnatomyAiRequest=null;window.__alloAnatomyAiPending=null;}
`);
replace('var aiMessages = Array.isArray(d._aiMessages)', 'var aiMessages = aiHistoryCompatible && Array.isArray(d._aiMessages)');
replace("if (messageText) valid.push({ role: message.role, text: messageText.slice(0, 4000) });", "if (messageText) valid.push({ role: message.role, text: messageText.slice(0, 4000), kind:message.kind==='lesson'?'lesson':'answer',structureId:knownStructureIds.indexOf(message.structureId)!==-1?message.structureId:null });");
replace("        function finishAiRequest(token, messages) {\n          if (window.__alloAnatomyAiPending !== token) return;\n          window.__alloAnatomyAiPending = null;\n          updMulti({ _aiMessages: messages, _aiLoading: false });\n        }",`        function focusTutorInput(){setTimeout(function(){var input=document.querySelector('[data-anatomy-tutor-input]');if(input)input.focus();},0);}
        function releaseTutorRequest(){var pending=window.__alloAnatomyAiRequest;if(pending)clearTimeout(pending.timer);window.__alloAnatomyAiRequest=null;window.__alloAnatomyAiPending=null;}
        function finishAiRequest(token, messages) {
          if (window.__alloAnatomyAiPending !== token) return;
          releaseTutorRequest();
          setLabToolData(function(previous){var state=previous.anatomy||{};if(state._aiRequestToken!==token)return previous;return Object.assign({},previous,{anatomy:Object.assign({},state,{_aiMessages:messages.slice(-40),_aiLoading:false,_aiRequestToken:null})});});
          if(typeof announceToSR==='function')announceToSR(messages[messages.length-1].kind==='lesson'?t('stem.anatomy.tutor_ref_lesson_ready','The reviewed lesson is ready.'):t('stem.anatomy.tutor_ref_answer_ready','The tutor answer is ready.'));
        }
        function clearTutorConversation(){releaseTutorRequest();updMulti({_aiMessages:[],_aiLoading:false,_aiRequestToken:null,_aiInput:'',_aiConversationBand:gradeBand});focusTutorInput();}
        function draftTutorQuestion(question){upd('_aiInput',question.slice(0,500));focusTutorInput();}
        function tutorMessageSources(message){
          if(message.kind!=='lesson'||!message.structureId)return null;
          var structure=null;Object.keys(SYSTEMS).some(function(id){structure=SYSTEMS[id].structures.find(function(item){return item.id===message.structureId;});return !!structure;});
          if(!structure)return null;var clinical=clinicalContent(structure);
          return h('div',{'data-anatomy-tutor-message-sources':message.structureId},
            clinical&&clinical.url?h('a',{href:clinical.url,target:'_blank',rel:'noopener noreferrer'},t('stem.anatomy.notes_ref_source','Clinical source: {source}').replace('{source}',clinical.source)):null,
            renderScienceSources(structure));
        }
        function renderTutorLesson(){
          if(!sel)return h('div',{className:'anatomy-tutor-lesson','data-anatomy-tutor-lesson':'empty'},h('p',null,t('stem.anatomy.tutor_ref_choose','Choose a structure in Explore to bring its lesson and references here.')),h('button',{type:'button',onClick:function(){activateAnatomyTab('explore');}},t('stem.anatomy.tutor_ref_explore','Choose a structure')));
          return h('section',{className:'anatomy-tutor-lesson','data-anatomy-tutor-lesson':sel.id,'aria-labelledby':'anatomy-tutor-lesson-title'},
            h('h5',{id:'anatomy-tutor-lesson-title'},t('stem.anatomy.tutor_ref_lesson','Lesson to refer to: {structure}').replace('{structure}',sel.name)),
            h('p',null,learnerText(sel)),ttsBtn(learnerText(sel),t('stem.anatomy.tutor_ref_read_lesson','Read the reference lesson aloud')),
            renderScienceSources(sel),
            clinicalContent(sel)?h('details',null,h('summary',null,youngLearner?t('stem.anatomy.staying_healthy','Staying Healthy'):t('stem.anatomy.notes_ref_title','Clinical context')),renderClinicalNote(sel,false)):null,
            h('details',{'data-anatomy-tutor-reflection':true},h('summary',null,t('stem.anatomy.tutor_ref_reflect','Explain it in your own words')),h('p',null,t('stem.anatomy.tutor_ref_reflect_hint','Try your own explanation, then compare it with the lesson. Your writing is saved with this structure and in your study sheet.')),renderStructureNoteEditor(sel,false)));
        }`);
replace('if (!cleanQuestion || aiLoading) return false;', 'if (!cleanQuestion || window.__alloAnatomyAiPending || aiLoading) return false;');
replace("updMulti({ _aiMessages: newMsgs, _aiLoading: true, _aiInput: '', _aiQuestions: newAiQ });","updMulti({ _aiMessages: newMsgs, _aiLoading: true, _aiInput: '', _aiQuestions: newAiQ, _aiRequestToken:requestToken, _aiConversationBand:gradeBand });");
const a=s.indexOf('          var authoredFallback='),b=s.indexOf('          return true;',s.indexOf('          } else {',a));
if(a<0||b<0)throw Error('Fallback block');
s=s.slice(0,a)+`          function fallback(reason){return {role:'ai',kind:'lesson',structureId:sel?sel.id:null,text:reason+(sel?' '+learnerText(sel)+(permittedClinical?' '+permittedClinical.text:''):' '+t('stem.anatomy.tutor_ref_choose','Choose a structure in Explore to bring its lesson and references here.'))};}
          function finishWithLesson(reason){finishAiRequest(requestToken,newMsgs.concat([fallback(reason)]));}
          var requestState={token:requestToken,band:gradeBand,timer:null,stop:function(){finishWithLesson(t('stem.anatomy.tutor_ref_stopped','Stopped waiting. You can continue with the lesson or ask again.'));focusTutorInput();}};
          window.__alloAnatomyAiRequest=requestState;
          requestState.timer=setTimeout(function(){finishWithLesson(t('stem.anatomy.tutor_ref_timeout','The tutor took too long to reply. You can continue with the lesson or ask again.'));},45000);
          if (callGemini) {
            var request;
            try { request = callGemini(prompt); }
            catch (error) { finishWithLesson(t('stem.anatomy.tutor_ref_unavailable','The tutor is unavailable. Here is the lesson content.')); return true; }
            Promise.resolve(request).then(function(resp) {
              var answer=typeof resp==='string'?resp:resp&&typeof resp.text==='string'?resp.text:'';
              if(!answer.trim()){finishWithLesson(t('stem.anatomy.tutor_ref_empty','The tutor returned no answer. Here is the lesson content.'));return;}
              finishAiRequest(requestToken, newMsgs.concat([{ role: 'ai', text: answer.trim().slice(0,4000) }]));
            })['catch'](function() {
              finishWithLesson(t('stem.anatomy.tutor_ref_unavailable','The tutor is unavailable. Here is the lesson content.'));
            });
          } else {
            finishWithLesson(t('stem.anatomy.tutor_ref_unavailable','The tutor is unavailable. Here is the lesson content.'));
          }
`+s.slice(b);
const start=s.indexOf('                // AI Tutor Panel'),end=s.indexOf("              ) : activeTab === 'tour' ? (",start);
if(start<0||end<0)throw Error('Tutor panel');
s=s.slice(0,start)+fs.readFileSync(__dirname+'/panel.fragment.js','utf8')+s.slice(end);
const css='.anatomy-tutor-panel{--tutor-soft:#eef2ff;--tutor-border:#94a3b8}.anatomy-tutor-panel .anatomy-tutor-header,.anatomy-tutor-panel .anatomy-tutor-compose{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.anatomy-tutor-panel h4{font-size:18px;font-weight:800;margin:0}.anatomy-tutor-panel h5{font-size:16px;font-weight:750}.anatomy-tutor-panel .anatomy-tutor-lesson{border:1px solid var(--tutor-border);border-radius:10px;padding:12px;margin-block:12px}.anatomy-tutor-panel .anatomy-tutor-log{max-height:420px;overflow:auto;overscroll-behavior:contain;padding:4px;border:1px solid var(--tutor-border);border-radius:8px}.anatomy-tutor-panel .anatomy-tutor-message{margin-block:8px;border:1px solid var(--tutor-border);border-radius:8px;padding:12px;overflow-wrap:anywhere}.anatomy-tutor-panel .anatomy-tutor-message[data-role="user"]{background:var(--tutor-soft);margin-inline-start:16px}.anatomy-tutor-panel .anatomy-tutor-message p{white-space:pre-wrap}.anatomy-tutor-panel .anatomy-tutor-suggestions{display:grid;gap:8px;margin-block:12px}.anatomy-tutor-panel .anatomy-tutor-suggestions button{text-align:start;white-space:normal}.anatomy-tutor-panel input{flex:1 1 150px;min-width:0;width:100%;min-height:44px;padding:10px;border:1px solid var(--tutor-border);border-radius:8px;background:var(--refinement-bg,#f8fafc);color:inherit;font-size:16px}.anatomy-tutor-panel .anatomy-tutor-compose button{flex:0 0 auto}.anatomy-tutor-panel button:disabled{opacity:.65}.anatomy-tutor-panel .anatomy-tutor-hint{font-size:14px}.anatomy-tutor-panel .anatomy-own-words{background:transparent;color:inherit}.anatomy-tutor-panel .anatomy-own-words label,.anatomy-tutor-panel .anatomy-own-words p,.anatomy-tutor-panel .anatomy-own-words span{color:inherit}.theme-dark .anatomy-tutor-panel{--tutor-soft:#24334d;--tutor-border:#64748b}.theme-dark .anatomy-tutor-panel input{background:#17253b}.anatomy-tutor-panel :focus-visible{outline:3px solid #0891b2;outline-offset:3px}';
replace('      ".anatomy-clinical-note{', '      '+JSON.stringify(css)+',\n      ".anatomy-clinical-note{');
fs.writeFileSync(file,s);fs.writeFileSync('desktop/web-app/public/'+file,s);
