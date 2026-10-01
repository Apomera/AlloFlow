              })() : activeTab === 'homeoHunt' ? (function() {
                var iq=homeostasisSnapshot,questions=homeostasisQuestions(),outside=homeostasisOutsideCount(iq.tempC,iq.pH,iq.glucose);
                var stateMeta=[
                  {label:t('stem.anatomy.within_teaching_references','All within teaching references'),color:'#047857',bg:'#ecfdf5',border:'#86efac'},
                  {label:t('stem.anatomy.one_variable_outside_reference','1 variable outside reference'),color:'#b45309',bg:'#fffbeb',border:'#fcd34d'},
                  {label:t('stem.anatomy.two_variables_outside_reference','2 variables outside reference'),color:'#c2410c',bg:'#fff7ed',border:'#fdba74'},
                  {label:t('stem.anatomy.three_variables_outside_reference','3 variables outside reference'),color:'#b91c1c',bg:'#fef2f2',border:'#fca5a5'}
                ][outside];
                return h('section',{className:'anatomy-homeo-panel bg-white rounded-xl border-2 border-indigo-200 p-4 space-y-3','data-anatomy-homeo-panel':true,'aria-labelledby':'anatomy-homeo-title'},
                  h('h4',{id:'anatomy-homeo-title',tabIndex:-1},t('stem.anatomy.homeostasis_discovery_2','🏠 Homeostasis discovery')),
                  h('p',{className:'anatomy-homeo-intro'},t('stem.anatomy.homeo_flow_intro','Predict how temperature feedback responds, then explore three teaching reference ranges. Your writing and observations stay saved while you move between these activities.')),
                  h('nav',{className:'anatomy-homeo-navigation','aria-label':t('stem.anatomy.homeo_flow_navigation','Homeostasis activities')},
                    h('button',{type:'button','data-anatomy-homeo-jump':'experiment',onClick:function(){focusHomeostasisSection('experiment');}},t('stem.anatomy.homeo_flow_experiment','Temperature feedback')),
                    h('button',{type:'button','data-anatomy-homeo-jump':'ranges',onClick:function(){focusHomeostasisSection('ranges');}},t('stem.anatomy.homeo_flow_ranges','Reference ranges'))),
                  renderFeedbackExperiment(),
                  h('section',{'data-anatomy-homeo-ranges':true,'aria-labelledby':'anatomy-homeo-range-title'},
                    h('h5',{id:'anatomy-homeo-range-title',tabIndex:-1},t('stem.anatomy.homeo_flow_ranges','Reference ranges')),
                    h('p',{className:'anatomy-homeo-range-intro'},t('stem.anatomy.homeo_flow_range_intro','Adjust body temperature, arterial blood pH and fasting plasma glucose. Compare each value with its own adult teaching range; the measurements use different units.')),
                    h('div',{className:'anatomy-homeo-range-summary',role:'status','aria-live':'polite',style:{background:stateMeta.bg,border:'2px solid '+stateMeta.border}},
                      h('strong',{style:{color:stateMeta.color}},stateMeta.label),
                      h('p',null,t('stem.anatomy.homeo_flow_outside_count','{outside} of {total} measurements are outside the teaching reference ranges.').replace('{outside}',String(outside)).replace('{total}','3'))),
                    h('div',{className:'anatomy-homeo-range-cards'},[
                      {key:'tempC',label:t('stem.anatomy.body_temp_c','Body temp (°C)'),val:iq.tempC,min:30,max:43,step:.1,referenceLow:36.5,referenceHigh:37.5,referenceText:'36.5–37.5 °C'},
                      {key:'pH',label:t('stem.anatomy.blood_ph','Blood pH'),val:iq.pH,min:6.8,max:7.8,step:.05,referenceLow:7.35,referenceHigh:7.45,referenceText:'7.35–7.45'},
                      {key:'glucose',label:t('stem.anatomy.fasting_glucose_mg_dl','Fasting glucose (mg/dL)'),val:iq.glucose,min:30,max:400,step:5,referenceLow:70,referenceHigh:99,referenceText:'70–99 mg/dL'}
                    ].map(function(s){var rangeState=s.val<s.referenceLow?'below':s.val>s.referenceHigh?'above':'within';return h('div',{key:s.key,className:'anatomy-homeo-range-card'},
                      h('label',{htmlFor:'hh-'+s.key},s.label+': ',h('span',{className:'anatomy-homeo-range-value'},s.val)),
                      h('p',{className:'anatomy-homeo-teaching-range'},t('stem.anatomy.homeo_flow_teaching_range','Teaching range: {range}').replace('{range}',s.referenceText)),
                      h('span',{'data-anatomy-homeo-range-status':s.key,'data-state':rangeState},rangeState==='below'?t('stem.anatomy.homeo_flow_below','Below the range'):rangeState==='above'?t('stem.anatomy.homeo_flow_above','Above the range'):t('stem.anatomy.homeo_flow_within','Within the range')),
                      h('input',{id:'hh-'+s.key,type:'range',min:s.min,max:s.max,step:s.step,value:s.val,onChange:function(event){var patch={};patch[s.key]=parseFloat(event.target.value);changeHomeostasisFields(patch);},'aria-label':s.label,'aria-valuetext':s.label+': '+s.val}));})),
                    h('div',{className:'anatomy-homeo-observation-actions'},
                      h('button',{type:'button','data-anatomy-homeo-log':true,onClick:function(){updateHomeostasis('log');}},t('stem.anatomy.homeo_flow_log','Log observation')),
                      h('button',{type:'button','data-anatomy-homeo-reset-measurements':true,onClick:function(){updateHomeostasis('reset');}},t('stem.anatomy.homeo_flow_reset_measurements','Reset measurements')),
                      h('button',{type:'button','data-anatomy-homeo-clear-observations':true,disabled:!iq.log.length,onClick:function(){updateHomeostasis('clear');}},t('stem.anatomy.homeo_flow_clear_observations','Clear observations'))),
                    h('p',{className:'anatomy-homeo-action-help'},t('stem.anatomy.homeo_flow_reset_help','Reset measurements restores the three starting values. Clear observations removes the table. Both keep your writing and check answers.')),
                    iq.log.length>0&&h('table',{className:'anatomy-homeo-observations','aria-label':__alloT('stem.anatomy.a11y_logged_homeostasis_observations','Logged homeostasis observations')},
                      h('caption',null,t('stem.anatomy.homeo_flow_observations','Observations: {count} of {maximum} saved').replace('{count}',String(iq.log.length)).replace('{maximum}','8')),
                      h('thead',null,h('tr',null,[t('stem.anatomy.body_temp_c','Body temp (°C)'),t('stem.anatomy.blood_ph','Blood pH'),t('stem.anatomy.fasting_glucose_mg_dl','Fasting glucose (mg/dL)'),t('stem.anatomy.homeo_flow_outside_column','Outside ranges')].map(function(label,index){return h('th',{key:index,scope:'col'},label);}))),
                      h('tbody',null,iq.log.map(function(row,index){return h('tr',{key:index},h('td',null,row.t),h('td',null,row.p),h('td',null,row.g),h('td',null,t('stem.anatomy.homeo_flow_log_count','{count} of {total}').replace('{count}',String(row.st)).replace('{total}','3')));}))),
                    h('label',{className:'anatomy-homeo-writing-label',htmlFor:'anatomy-homeo-hypothesis'},t('stem.anatomy.homeo_flow_hypothesis','Your hypothesis')),
                    h('textarea',{id:'anatomy-homeo-hypothesis','aria-label':t('stem.anatomy.hypothesis_input','Homeostasis hypothesis'),value:iq.hypothesis,onChange:function(event){changeHomeostasisFields({hypothesis:event.target.value});},placeholder:t('stem.anatomy.homeostasis_reference_hypothesis','Hypothesis: What does each variable help regulate? Why can we not compare range widths measured in different units?'),rows:3}),
                    !iq.stuckRevealed&&h('button',{type:'button','data-anatomy-homeo-prompts':true,onClick:function(){changeHomeostasisFields({stuckRevealed:true});}},t('stem.anatomy.stuck_show_open_prompts','🤔 Stuck — show open prompts')),
                    iq.stuckRevealed&&h('div',{className:'anatomy-homeo-prompts'},h('ul',null,
                      h('li',null,t('stem.anatomy.hold_two_vital_signs_steady_move_the_t','Hold two vital signs steady. Move the third. Watch.')),
                      h('li',null,t('stem.anatomy.arterial_blood_ph_reference_prompt','A common arterial blood pH reference range is 7.35-7.45. Investigate why it is so narrow.')),
                      h('li',null,t('stem.anatomy.compare_outside_reference_counts','Find settings with one, two, and three variables outside the reference ranges. What changes?')))),
                    h('div',{className:'anatomy-homeo-own-words'},
                      h('label',{className:'anatomy-homeo-understanding'},h('input',{type:'checkbox',checked:iq.understood,'data-anatomy-homeo-understood':true,onChange:function(event){changeHomeostasisFields({understood:event.target.checked});}}),t('stem.anatomy.i_understand_explain_in_own_words','I understand — explain in own words')),
                      iq.understood&&h('label',{className:'anatomy-homeo-writing-label',htmlFor:'anatomy-homeo-explanation'},t('stem.anatomy.homeo_flow_explanation','Explain the limits of the reference ranges')),
                      iq.understood&&h('textarea',{id:'anatomy-homeo-explanation','aria-label':t('stem.anatomy.explanation_input','Homeostasis explanation'),value:iq.explanation,onChange:function(event){changeHomeostasisFields({explanation:event.target.value});},placeholder:t('stem.anatomy.explain_homeostasis_model_limit','Explain why a reference-range flag alone cannot diagnose a person.'),rows:4})),
                    homeostasisChecksVisible(iq)?(function(){
                      var answered=Object.keys(iq.recap).length,done=answered===questions.length,correctCount=questions.filter(function(question){return iq.recap[question.id]===question.answer;}).length;
                      var latestCorrect=iq.lastRecap?questions.filter(function(question){return iq.lastRecap.answers[question.id]===question.answer;}).length:0;
                      return h('section',{className:'anatomy-homeo-checks','data-anatomy-homeo-recap':'true','data-anatomy-homeo-recap-state':done?'done':'open','data-anatomy-homeo-context':HOMEOSTASIS_RECAP_CONTEXT,'data-anatomy-homeo-token':iq.recapToken||'','aria-labelledby':'anatomy-homeo-check-title'},
                        h('div',{className:'anatomy-homeo-check-heading'},h('h5',{id:'anatomy-homeo-check-title',tabIndex:-1},t('stem.anatomy.homeo_recap_title','✓ Check what you found')),h('span',{role:'status'},answered+' / '+questions.length)),
                        questions.map(function(question,index){var chosen=iq.recap[question.id],selected=question.options.find(function(option){return option.id===chosen;});return h('fieldset',{key:question.id,tabIndex:-1,'data-anatomy-homeo-recap-question':question.id},
                          h('legend',null,question.stem),h('p',{className:'anatomy-homeo-question-number'},t('stem.anatomy.homeo_flow_question','Question {question} of {total}').replace('{question}',String(index+1)).replace('{total}',String(questions.length))),
                          h('div',{className:'anatomy-homeo-options'},question.options.map(function(option){var isCorrect=option.id===question.answer,wasChosen=chosen===option.id;return h('button',{key:option.id,type:'button',disabled:!!chosen,'aria-pressed':wasChosen,'data-anatomy-homeo-recap-option':option.id,'data-anatomy-homeo-answer-state':chosen?(isCorrect?'correct':wasChosen?'chosen':'neutral'):'neutral',onClick:function(){answerHomeostasis(question.id,option.id);}},
                            h('span',null,option.label),chosen&&wasChosen&&h('span',{className:'anatomy-homeo-answer-label'},t('stem.anatomy.homeo_flow_your_answer','Your answer')),chosen&&isCorrect&&h('span',{className:'anatomy-homeo-answer-label'},t('stem.anatomy.homeo_flow_correct_answer','Correct answer')));})),
                          selected&&h('div',{role:'status',tabIndex:-1,'data-anatomy-homeo-feedback':chosen===question.answer?'correct':'incorrect'},h('strong',null,chosen===question.answer?t('stem.anatomy.recap_correct_short','Correct.'):t('stem.anatomy.recap_incorrect_short','Not quite.')),h('p',null,question.reason),chosen!==question.answer&&h('p',null,t('stem.anatomy.homeo_flow_correct_answer','Correct answer')+': '+question.options.find(function(option){return option.id===question.answer;}).label))
                        );}),
                        done&&h('p',{className:'anatomy-homeo-check-score',role:'status','aria-live':'polite'},correctCount+' / '+questions.length+t('stem.anatomy.homeo_recap_score',' right. ')+(correctCount===questions.length?t('stem.anatomy.homeo_recap_all','You can read a value against its range and explain the loop that holds it there.'):t('stem.anatomy.homeo_recap_some','Slide a value out of range again and watch which way the body would need to push it back.'))),
                        iq.lastRecap&&h('p',{'data-anatomy-homeo-latest-score':true},t('stem.anatomy.homeo_flow_latest_score','Latest completed checks: {correct}/{total} correct.').replace('{correct}',String(latestCorrect)).replace('{total}',String(questions.length))),
                        h('button',{type:'button','data-anatomy-homeo-restart-checks':true,'aria-describedby':'anatomy-homeo-restart-help',onClick:function(){updateHomeostasis('restart');}},t('stem.anatomy.homeo_flow_restart_checks','Restart checks')),
                        h('p',{id:'anatomy-homeo-restart-help'},t('stem.anatomy.homeo_flow_restart_help','Restart clears the answers in this attempt. Your last completed score, writing and observations stay saved.'))
                      );
                    })():null,
                    h('p',{className:'anatomy-homeo-model-limit'},t('stem.anatomy.homeostasis_model_limit','Teaching model only, not a clinical score or diagnosis. Real interpretation depends on age, context, symptoms, measurement method, trends, and rate of change.'))
                  )
                );
              })() : null
