                h('section', { className:'anatomy-refinement anatomy-tutor-panel','data-anatomy-tutor-panel':true,'aria-labelledby':'anatomy-tutor-title' },
                  h('div',{className:'anatomy-tutor-header'},
                    h('h4',{id:'anatomy-tutor-title'},t('stem.anatomy.ai_anatomy_tutor','🤖 AI Anatomy Tutor')),
                    aiMessages.length>0?h('button',{type:'button','aria-label':t('stem.anatomy.a11y_clear_ai_tutor_conversation','Clear AI tutor conversation'),onClick:clearTutorConversation},t('stem.anatomy.tutor_ref_clear','Clear chat')):null),
                  h('p',null,t('stem.anatomy.tutor_ref_context','Currently studying: {context}').replace('{context}',sys.name+(sel?' › '+sel.name:''))),
                  renderTutorLesson(),
                  aiInterrupted?h('p',{role:'status'},t('stem.anatomy.tutor_ref_interrupted','The previous AI request was interrupted. You can ask again.')):null,
                  aiHistoryReset?h('p',{role:'status'},t('stem.anatomy.tutor_ref_new_level','A new conversation is used for this learning level.')):null,
                  h('div',{className:'anatomy-tutor-log',role:'log','aria-live':'polite','aria-label':t('stem.anatomy.a11y_ai_tutor_conversation','AI tutor conversation'),'aria-busy':aiLoading,tabIndex:0},
                    aiMessages.length===0?h('p',null,t('stem.anatomy.ask_a_question_about_anatomy_to_get_st','Ask a question about anatomy to get started!')):null,
                    aiMessages.map(function(msg,idx){return h('div',{key:idx,className:'anatomy-tutor-message','data-role':msg.role,'data-anatomy-tutor-message':msg.kind},
                      h('strong',null,msg.role==='user'?t('stem.anatomy.tutor_ref_you','You'):msg.kind==='lesson'?t('stem.anatomy.tutor_ref_reviewed','Lesson content'):t('stem.anatomy.tutor_ref_ai','AI answer')),
                      h('p',null,msg.text),msg.role==='ai'?ttsBtn(msg.text,t('stem.anatomy.tutor_ref_read_message','Read response {number} aloud').replace('{number}',String(idx+1))):null,
                      tutorMessageSources(msg));}),
                    aiLoading?h('p',{role:'status'},t('stem.anatomy.tutor_ref_thinking','Thinking…')):null),
                  aiLoading?h('button',{type:'button','data-anatomy-tutor-stop':true,onClick:function(){var pending=window.__alloAnatomyAiRequest;if(pending&&pending.token===activeAiRequestToken)pending.stop();}},t('stem.anatomy.tutor_ref_stop','Stop waiting')):null,
                  h('p',{className:'anatomy-tutor-hint'},t('stem.anatomy.tutor_ref_draft_hint','Choose a starting question, edit it if you like, then select Ask.')),
                  h('div',{className:'anatomy-tutor-suggestions'},[
                    t('stem.anatomy.tutor_ref_system_question','How do the parts of the {system} system work together?').replace('{system}',sys.name),
                    sel?(youngLearner?t('stem.anatomy.tutor_ref_simple_question','What does {structure} help my body do?'):t('stem.anatomy.tutor_ref_shape_question','How does the shape or location of {structure} help it do its job?')).replace('{structure}',sel.name):t('stem.anatomy.tutor_ref_compare_question','Can you compare the jobs of two structures in this system?'),
                    !youngLearner&&sel&&sel.clinicalPrompt?sel.clinicalPrompt:t('stem.anatomy.tutor_ref_example_question','Can you give an everyday example of this system at work?')
                  ].map(function(question,index){return h('button',{key:index,type:'button','data-anatomy-tutor-draft':index,onClick:function(){draftTutorQuestion(question);}},question); })),
                  h('label',{htmlFor:'anatomy-tutor-input'},t('stem.anatomy.tutor_ref_question','Your question')),
                  h('div',{className:'anatomy-tutor-compose'},h('input',{
                    id:'anatomy-tutor-input',type:'text','data-anatomy-tutor-input':true,placeholder:t('stem.anatomy.ask_a_question','Ask a question...'),
                    'aria-label':t('stem.anatomy.ask_the_anatomy_ai_tutor_a_question','Ask the anatomy AI tutor a question'),'aria-describedby':'anatomy-tutor-input-help',value:aiInput,maxLength:500,
                    onChange:function(e){upd('_aiInput',e.target.value);},onKeyDown:function(e){if(e.key==='Enter'&&!e.repeat&&!e.isComposing&&!(e.nativeEvent&&e.nativeEvent.isComposing)&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();sendAiQuestion(aiInput);}}
                  }),h('button',{type:'button','aria-label':t('stem.anatomy.a11y_ask','Ask'),disabled:aiLoading||!aiInput.trim(),onClick:function(){sendAiQuestion(aiInput);}},t('stem.anatomy.a11y_ask','Ask'))),
                  h('p',{id:'anatomy-tutor-input-help',className:'anatomy-tutor-hint'},h('bdi',{dir:'ltr'},aiInput.length+' / 500'),' · ',t('stem.anatomy.tutor_ref_input_help','Enter submits your question. Your saved explanation stays in the lesson above.'))
                )
