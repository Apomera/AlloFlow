        function spotterContextKey(state) {
          return JSON.stringify([state.system,state.view,state.complexity]);
        }
        function focusSpotterStage(stage, questionKey, contextKey, answerId) {
          setTimeout(function() {
            var panel = document.querySelector('[data-anatomy-spotter-panel]');
            if (!panel || panel.getAttribute('data-anatomy-spotter-question') !== questionKey || panel.getAttribute('data-anatomy-spotter-context') !== contextKey) return;
            if (typeof answerId === 'string' && panel.getAttribute('data-anatomy-spotter-answer') !== answerId) return;
            var active = panel.getAttribute('data-anatomy-spotter-active') === 'true';
            if ((stage === 'start' && active) || (stage !== 'start' && stage !== 'panel' && !active)) return;
            var target = stage === 'diagram' ? document.querySelector('[data-anatomy-model-shell] [data-anatomy-canvas]')
              : stage === 'feedback' ? panel.querySelector('[data-anatomy-spotter-feedback]')
              : stage === 'question' ? panel.querySelector('#anatomy-spotter-question-title')
              : stage === 'start' ? panel.querySelector('[data-anatomy-spotter-start]') : panel;
            if (!target || typeof target.focus !== 'function') return;
            target.focus({preventScroll:true});
            var anchor = stage === 'diagram' ? document.querySelector('[data-anatomy-spotter-return]') || target : target;
            if (typeof anchor.scrollIntoView === 'function') anchor.scrollIntoView({block:'start',behavior:'auto'});
          },0);
        }
        function focusCurrentSpotter() {
          var stage = !spotterActive ? 'start' : !spotterRoundReady ? 'panel' : spotterFeedback !== null ? 'feedback' : 'question';
          focusSpotterStage(stage,spotterQuestionKey(d),spotterContextKey(d),spotterFeedback || '');
        }
        function showSpotterDiagram() {
          if (!spotterActive || !spotterRoundReady) return;
          focusSpotterStage('diagram',spotterQuestionKey(d),spotterContextKey(d),spotterFeedback || '');
        }

