        // Homeostasis keeps written work separate from the current check attempt.
        var HOMEOSTASIS_RECAP_CONTEXT = 'homeostasis-v2|temp:above:above,within,below|ph:acid:within,alk,acid|feedback:restore:amplify,ignore,restore';
        function newHomeostasisToken() { return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2); }
        function validHomeostasisToken(value) { return typeof value==='string' && value.length>0 && value.length<=128 ? value : null; }
        function homeostasisQuestions() {
          return [
            {id:'temp',stem:t('stem.anatomy.homeo_recap_q1','Body temperature reads 39.0 °C. Against the teaching range of 36.5–37.5 °C, which is true?'),answer:'above',
              options:[{id:'above',label:t('stem.anatomy.homeo_recap_q1_a','It is above the range: the body is too warm')},{id:'within',label:t('stem.anatomy.homeo_recap_q1_b','It is within the range')},{id:'below',label:t('stem.anatomy.homeo_recap_q1_c','It is below the range: the body is too cool')}],
              reason:t('stem.anatomy.homeo_flow_temp_reason','39.0 °C is higher than the upper teaching limit of 37.5 °C. This comparison describes the range; it does not diagnose a person.')},
            {id:'ph',stem:t('stem.anatomy.homeo_recap_q2','Arterial blood pH reads 7.25. Against the range of 7.35–7.45, which statement fits?'),answer:'acid',
              options:[{id:'within',label:t('stem.anatomy.homeo_recap_q2_a','It is within the range')},{id:'alk',label:t('stem.anatomy.homeo_recap_q2_b','It is above the range: more alkaline than normal')},{id:'acid',label:t('stem.anatomy.homeo_recap_q2_c','It is below the range: more acidic than normal')}],
              reason:t('stem.anatomy.homeo_flow_ph_reason','7.25 is below 7.35. A lower pH is more acidic; a higher pH is more alkaline.')},
            {id:'feedback',stem:t('stem.anatomy.homeo_recap_q3','Which sentence describes negative feedback, the loop that keeps these values steady?'),answer:'restore',
              options:[{id:'amplify',label:t('stem.anatomy.homeo_recap_q3_a','The body notices a change and pushes it further in the same direction')},{id:'ignore',label:t('stem.anatomy.homeo_recap_q3_b','The body ignores small changes until they become large')},{id:'restore',label:t('stem.anatomy.homeo_recap_q3_c','The body notices a change and responds to push the value back toward its set point')}],
              reason:t('stem.anatomy.homeo_flow_feedback_reason','Negative feedback opposes a disturbance. In the temperature comparison, the active response becomes smaller as the difference from the starting value gets smaller.')}
          ];
        }
        function validHomeostasisAnswers(raw) {
          var answers={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return answers;
          homeostasisQuestions().forEach(function(question){if(question.options.some(function(option){return option.id===raw[question.id];}))answers[question.id]=raw[question.id];});return answers;
        }
        function homeostasisNumber(value,min,max,fallback) {
          if(value===null||value===''||typeof value==='boolean'||typeof value==='object')return fallback;
          var number=Number(value);return Number.isFinite(number)?Math.min(max,Math.max(min,number)):fallback;
        }
        function homeostasisOutsideCount(t,p,g){return Number(t<36.5||t>37.5)+Number(p<7.35||p>7.45)+Number(g<70||g>99);}
        function homeostasisLog(raw) {
          if(!Array.isArray(raw))return [];
          return raw.filter(function(row){return row&&typeof row==='object'&&!Array.isArray(row)&&['t','p','g'].every(function(key){return typeof row[key]==='number'&&Number.isFinite(row[key]);})&&row.t>=30&&row.t<=43&&row.p>=6.8&&row.p<=7.8&&row.g>=30&&row.g<=400;}).slice(-8).map(function(row){return {t:row.t,p:row.p,g:row.g,st:homeostasisOutsideCount(row.t,row.p,row.g)};});
        }
        function normalizedHomeostasis(raw) {
          var saved=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
          var contextValid=saved.recapContext===undefined||saved.recapContext===HOMEOSTASIS_RECAP_CONTEXT;
          var latest=saved.lastRecap&&saved.lastRecap.version===2?validHomeostasisAnswers(saved.lastRecap.answers):{};
          var questions=homeostasisQuestions();
          return Object.assign({},saved,{tempC:homeostasisNumber(saved.tempC,30,43,37),pH:homeostasisNumber(saved.pH,6.8,7.8,7.4),glucose:homeostasisNumber(saved.glucose,30,400,90),
            hypothesis:typeof saved.hypothesis==='string'?saved.hypothesis:'',explanation:typeof saved.explanation==='string'?saved.explanation:'',stuckRevealed:saved.stuckRevealed===true,understood:saved.understood===true,
            log:homeostasisLog(saved.log),recap:contextValid?validHomeostasisAnswers(saved.recap):{},recapToken:validHomeostasisToken(saved.recapToken),recapContext:contextValid?HOMEOSTASIS_RECAP_CONTEXT:null,
            recapFocusId:questions.some(function(question){return question.id===saved.recapFocusId;})?saved.recapFocusId:null,lastRecap:questions.every(function(question){return !!latest[question.id];})?{version:2,answers:latest}:null});
        }
        var homeostasisSnapshot=normalizedHomeostasis(d.homeoHunt);
        function homeostasisChecksVisible(iq){return iq.understood||iq.log.length>=3||!!iq.recapToken||Object.keys(iq.recap).length>0;}
        function sameHomeostasisAttempt(state){var current=normalizedHomeostasis(state.homeoHunt);return state._activeTab==='homeoHunt'&&current.recapToken===homeostasisSnapshot.recapToken&&current.recapContext===homeostasisSnapshot.recapContext;}
        function finishHomeostasisUpdate(accepted,effect){var notified=false;function notify(){if(notified||!accepted())return;notified=true;effect();}notify();setTimeout(notify,0);}
        function focusHomeostasisSection(kind){setTimeout(function(){var panel=document.querySelector('[data-anatomy-homeo-panel]');if(!panel)return;var target=panel.querySelector(kind==='ranges'?'#anatomy-homeo-range-title':'#anatomy-feedback-title');if(target){target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'auto'});}},0);}
        function focusHomeostasisCheck(id,feedback,token){setTimeout(function(){var panel=document.querySelector('[data-anatomy-homeo-recap]');if(!panel||panel.getAttribute('data-anatomy-homeo-context')!==HOMEOSTASIS_RECAP_CONTEXT||panel.getAttribute('data-anatomy-homeo-token')!==(token||''))return;var question=homeostasisQuestions().some(function(item){return item.id===id;})?panel.querySelector('[data-anatomy-homeo-recap-question="'+id+'"]'):null;var target=question&&feedback?question.querySelector('[data-anatomy-homeo-feedback]'):question;target=target||question||panel.querySelector('#anatomy-homeo-check-title');if(target){target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'auto'});}},0);}
        function changeHomeostasisFields(patch){
          var keys=Object.keys(patch),allowed=['tempC','pH','glucose','hypothesis','explanation','stuckRevealed','understood'];if(!keys.length||keys.some(function(key){return allowed.indexOf(key)===-1;}))return;
          if(keys.some(function(key){return ['tempC','pH','glucose'].indexOf(key)!==-1?typeof patch[key]!=='number'||!Number.isFinite(patch[key]):['hypothesis','explanation'].indexOf(key)!==-1?typeof patch[key]!=='string':typeof patch[key]!=='boolean';}))return;
          var token=newHomeostasisToken();
          setLabToolData(function(previous){var state=previous.anatomy||{},current=normalizedHomeostasis(state.homeoHunt);if(!sameHomeostasisAttempt(state)||keys.some(function(key){return current[key]!==homeostasisSnapshot[key];}))return previous;
            var next=normalizedHomeostasis(Object.assign({},current,patch));
            if(!homeostasisChecksVisible(current)&&homeostasisChecksVisible(next)){next.recapToken=token;next.recapContext=HOMEOSTASIS_RECAP_CONTEXT;}
            return Object.assign({},previous,{anatomy:Object.assign({},state,{homeoHunt:next})});});
        }
        function updateHomeostasis(action){
          var accepted=false,token=newHomeostasisToken();
          setLabToolData(function(previous){var state=previous.anatomy||{},current=normalizedHomeostasis(state.homeoHunt);if(!sameHomeostasisAttempt(state))return previous;
            var next=Object.assign({},current);
            if(action==='reset'){next.tempC=37;next.pH=7.4;next.glucose=90;}
            else if(action==='clear'){next.log=[];}
            else if(action==='log'){
              if(['tempC','pH','glucose'].some(function(key){return current[key]!==homeostasisSnapshot[key];}))return previous;
              next.log=current.log.concat([{t:current.tempC,p:current.pH,g:current.glucose,st:homeostasisOutsideCount(current.tempC,current.pH,current.glucose)}]).slice(-8);
              if(!homeostasisChecksVisible(current)&&homeostasisChecksVisible(next)){next.recapToken=token;next.recapContext=HOMEOSTASIS_RECAP_CONTEXT;}
            }else if(action==='restart'){if(!homeostasisChecksVisible(current))return previous;if(!current.lastRecap&&homeostasisQuestions().every(function(question){return !!current.recap[question.id];}))next.lastRecap={version:2,answers:Object.assign({},current.recap)};next.recap={};next.recapToken=token;next.recapContext=HOMEOSTASIS_RECAP_CONTEXT;next.recapFocusId=null;}
            else return previous;
            accepted=true;return Object.assign({},previous,{anatomy:Object.assign({},state,{homeoHunt:next})});});
          finishHomeostasisUpdate(function(){return accepted;},function(){if(action==='restart')focusHomeostasisCheck(null,false,token);if(typeof announceToSR==='function')announceToSR(action==='reset'?t('stem.anatomy.homeo_flow_measurements_reset','Measurements reset. Your writing, observations and check answers are saved.'):action==='clear'?t('stem.anatomy.homeo_flow_observations_cleared','Observations cleared. Your writing and check answers are saved.'):action==='restart'?t('stem.anatomy.homeo_flow_checks_restarted','New check attempt. Your last completed score and written work are saved.'):t('stem.anatomy.homeo_flow_observation_saved','Observation saved.'));});
        }
        function answerHomeostasis(questionId,optionId){
          var question=homeostasisQuestions().find(function(item){return item.id===questionId;});if(!question||!question.options.some(function(option){return option.id===optionId;}))return;
          var accepted=false;
          setLabToolData(function(previous){var state=previous.anatomy||{},current=normalizedHomeostasis(state.homeoHunt);if(!sameHomeostasisAttempt(state)||!homeostasisChecksVisible(current)||current.recap[questionId])return previous;
            var answers=Object.assign({},current.recap);answers[questionId]=optionId;var next=Object.assign({},current,{recap:answers,recapContext:HOMEOSTASIS_RECAP_CONTEXT,recapFocusId:questionId});
            if(homeostasisQuestions().every(function(item){return !!answers[item.id];}))next.lastRecap={version:2,answers:Object.assign({},answers)};
            accepted=true;return Object.assign({},previous,{anatomy:Object.assign({},state,{homeoHunt:next})});});
          finishHomeostasisUpdate(function(){return accepted;},function(){playSound(optionId===question.answer?'quizCorrect':'quizWrong');if(typeof announceToSR==='function')announceToSR((optionId===question.answer?t('stem.anatomy.recap_correct_short','Correct.'):t('stem.anatomy.recap_incorrect_short','Not quite.'))+' '+question.reason);focusHomeostasisCheck(questionId,true,homeostasisSnapshot.recapToken);});
        }
        function feedbackContext(direction){return 'temperature-feedback-v1|'+direction;}
        function validFeedbackSaved(raw){var saved=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};return {prediction:['active','disabled','same'].indexOf(saved.prediction)!==-1?saved.prediction:'',revealed:saved.revealed===true&&['active','disabled','same'].indexOf(saved.prediction)!==-1,explanation:typeof saved.explanation==='string'?saved.explanation.slice(0,2000):''};}
        function normalizedFeedback(raw){var saved=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},direction=saved.direction==='cool'?'cool':'warm',current=validFeedbackSaved(saved),sessions={};['warm','cool'].forEach(function(id){if(saved.sessions&&saved.sessions[id]&&typeof saved.sessions[id]==='object'&&!Array.isArray(saved.sessions[id]))sessions[id]=validFeedbackSaved(saved.sessions[id]);});if(saved.context!==undefined&&saved.context!==feedbackContext(direction)){current.prediction='';current.revealed=false;}return Object.assign({},saved,current,{direction:direction,token:validHomeostasisToken(saved.token),context:feedbackContext(direction),sessions:sessions});}
        var feedbackSnapshot=normalizedFeedback(d._feedbackExperiment);
        function sameFeedbackAttempt(state){var current=normalizedFeedback(state._feedbackExperiment);return state._activeTab==='homeoHunt'&&current.direction===feedbackSnapshot.direction&&current.token===feedbackSnapshot.token;}
        function focusFeedback(target,direction,token){setTimeout(function(){var panel=document.querySelector('[data-anatomy-feedback-experiment]');if(!panel||panel.getAttribute('data-anatomy-feedback-direction')!==direction||panel.getAttribute('data-anatomy-feedback-token')!==(token||''))return;var element=target==='results'?panel.querySelector('[data-anatomy-feedback-results]'):panel.querySelector('[data-anatomy-feedback-prediction]');if(element){element.focus({preventScroll:true});element.scrollIntoView({block:'start',behavior:'auto'});}},0);}
        function updateFeedbackExperiment(action,value){
          if(action==='direction'&&['warm','cool'].indexOf(value)===-1||action==='prediction'&&['active','disabled','same'].indexOf(value)===-1)return;
          var accepted=false,token=newHomeostasisToken(),nextDirection=feedbackSnapshot.direction,focusToken=feedbackSnapshot.token;
          setLabToolData(function(previous){var state=previous.anatomy||{},current=normalizedFeedback(state._feedbackExperiment);if(!sameFeedbackAttempt(state))return previous;var next=Object.assign({},current);
            if(action==='direction'){
              if(value===current.direction)return previous;var sessions=Object.assign({},current.sessions);sessions[current.direction]=validFeedbackSaved(current);next=Object.assign({},current,sessions[value]||validFeedbackSaved(null),{direction:value,context:feedbackContext(value),token:token,sessions:sessions});nextDirection=value;focusToken=token;
            }else if(action==='prediction'){if(current.revealed||current.prediction!==feedbackSnapshot.prediction)return previous;next.prediction=value;next.revealed=false;}
            else if(action==='run'){
              if(!current.prediction||current.prediction!==feedbackSnapshot.prediction||current.revealed!==feedbackSnapshot.revealed)return previous;
              if(current.revealed){next.revealed=false;next.prediction='';next.token=token;focusToken=token;}else next.revealed=true;
            }else if(action==='explanation'){if(!current.revealed||current.explanation!==feedbackSnapshot.explanation||typeof value!=='string')return previous;next.explanation=value.slice(0,2000);}
            else return previous;
            accepted=true;return Object.assign({},previous,{anatomy:Object.assign({},state,{_feedbackExperiment:next})});});
          finishHomeostasisUpdate(function(){return accepted;},function(){if(action==='direction')focusFeedback('prediction',nextDirection,focusToken);else if(action==='run'){focusFeedback(feedbackSnapshot.revealed?'prediction':'results',nextDirection,focusToken);if(typeof announceToSR==='function')announceToSR(feedbackSnapshot.revealed?t('stem.anatomy.homeo_flow_prediction_again','Make a new prediction. Your explanation is saved.'):t('stem.anatomy.homeo_flow_models_compared','Model comparison shown. Read the explanation and compare the two lines.'));}});
        }
