const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),vm=require('vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-checkpoint-coaching-2026-10-09'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js'),'utf8'),baseline=JSON.parse(fs.readFileSync(path.join(report,'baseline.json')));assert.equal(hash(before),baseline.source);let text=before;const edits=[];function edit(name,a,b){assert.equal(text.split(a).length,2,name);text=text.replace(a,b);edits.push({name,before:a,after:b});}
const start=text.indexOf('          function renderLearningChoice('),end=text.indexOf('          function layerReviewGuidance()',start);assert(start>=0&&end>start);
edit('Keep each choice stable and place its coaching beside the selected answer',text.slice(start,end),`          function renderLearningChoice(optionId, index, label, selected, correct, feedbackId, onClick, feedbackText) {
            var inlineFeedback = selected && feedbackId && typeof feedbackText === 'string' ? feedbackText.trim() : '';
            return React.createElement("div", { key: optionId, className: "diss-learning-check__choice" },
              React.createElement("button", {
                type: "button", className: "diss-learning-check__option",
                "aria-pressed": selected,
                "aria-describedby": inlineFeedback ? feedbackId : undefined,
                "data-result": selected ? (correct ? "correct" : "incorrect") : undefined,
                onClick: onClick
              },
                React.createElement("span", { className: "diss-learning-check__number", "aria-hidden": true }, index + 1),
                React.createElement("span", { className: "diss-learning-check__answer" }, label),
                selected && React.createElement("span", { className: "diss-learning-check__marker", "aria-hidden": true }, correct ? 'Confirmed' : 'Review choice')
              ),
              inlineFeedback && React.createElement("p", { id: feedbackId, className: "diss-learning-check__feedback", "data-result": correct ? "correct" : "incorrect" },
                React.createElement("strong", { className: "diss-learning-check__feedback-title" }, correct ? 'Choice confirmed.' : 'Try another choice.'),
                ' ', React.createElement("span", null, inlineFeedback)
              )
            );
          }
`);
edit('Find a matching saved response before moving procedure feedback inline',`            var feedback = typeof feedbackValue === 'string' ? feedbackValue : '';`,`            var feedback = typeof feedbackValue === 'string' ? feedbackValue.trim() : '';
            var inlineLearningFeedback = !!feedback && options.some(function (option) { return option.id === selectedChoice; });`);
edit('Pass the procedure coaching text to the selected choice',`                  return renderLearningChoice(option.id, index, option.label, selectedChoice === option.id, responseCorrect, feedback ? 'diss-learning-check-feedback' : null, function () { recordProcedureLearningChoice(learningAction, responseKey, option.id); });`,`                  return renderLearningChoice(option.id, index, option.label, selectedChoice === option.id, responseCorrect, feedback ? 'diss-learning-check-feedback' : null, function () { recordProcedureLearningChoice(learningAction, responseKey, option.id); }, feedback);`);
edit('Retain procedure feedback when there is no matching choice or during performance',`              feedback && React.createElement("p", { id: "diss-learning-check-feedback", className: "diss-learning-check__feedback", "data-result": responseCorrect ? "correct" : "incorrect" }, feedback)`,`              feedback && !inlineLearningFeedback && React.createElement("p", { id: "diss-learning-check-feedback", className: "diss-learning-check__feedback", "data-result": responseCorrect ? "correct" : "incorrect" }, feedback)`);
edit('Use the same feedback matching rule for Guided observations',`            var guidedFeedback = d.guidedObservationFeedback;`,`            var guidedFeedback = d.guidedObservationFeedback;
            var guidedFeedbackText = guidedFeedback && typeof guidedFeedback.message === 'string' ? guidedFeedback.message.trim() : '';
            var inlineGuidedFeedback = !!guidedFeedbackText && guidedObservationOptions.some(function (option) { return option.id === guidedFeedback.choiceId; });`);
edit('Pass Guided coaching to the chosen observation',`                  return renderLearningChoice(option.id, index, String(option.fn || 'No observation available.').split('.')[0] + '.', !!(guidedFeedback && guidedFeedback.choiceId === option.id), !!(guidedFeedback && guidedFeedback.correct), guidedFeedback ? 'diss-guided-observation-feedback' : null, function () { recordGuidedObservationChoice(option.id); });`,`                  return renderLearningChoice(option.id, index, String(option.fn || 'No observation available.').split('.')[0] + '.', !!(guidedFeedback && guidedFeedback.choiceId === option.id), !!(guidedFeedback && guidedFeedback.correct), guidedFeedbackText ? 'diss-guided-observation-feedback' : null, function () { recordGuidedObservationChoice(option.id); }, guidedFeedbackText);`);
edit('Preserve unmatched Guided feedback without a duplicate ID',`              guidedFeedback && React.createElement("p", { id: "diss-guided-observation-feedback", className: "diss-learning-check__feedback", "data-result": guidedFeedback.correct ? "correct" : "incorrect" }, guidedFeedback.message)`,`              guidedFeedbackText && !inlineGuidedFeedback && React.createElement("p", { id: "diss-guided-observation-feedback", className: "diss-learning-check__feedback", "data-result": guidedFeedback.correct ? "correct" : "incorrect" }, guidedFeedbackText)`);
const cssAnchor='[data-dissection-root][data-high-contrast="true"] .diss-learning-check { border-color: #111827; background: #fff; color: #000; box-shadow: none; }';
edit('Keep answer and coaching readable in each responsive choice card',cssAnchor,`.diss-learning-check .diss-learning-check__choice { display: grid; align-content: start; min-width: 0; gap: .45rem; }
.diss-learning-check__choice > .diss-learning-check__option { width: 100%; }
.diss-learning-check__choice > .diss-learning-check__feedback { display: grid; grid-column: auto; min-width: 0; gap: .25rem; font-weight: 500; overflow-wrap: anywhere; }
.diss-learning-check__feedback-title { font-weight: 850; }
[data-dissection-root] .diss-learning-check :is(.diss-learning-check__answer, .diss-learning-check__feedback) { font-size: 1rem; }
[data-dissection-root][data-text-size="large"] .diss-learning-check :is(.diss-learning-check__answer, .diss-learning-check__feedback) { font-size: 1.125rem !important; }
`+cssAnchor);
new vm.Script(text);let reverse=text;for(const e of [...edits].reverse()){assert.equal(reverse.split(e.after).length,2);reverse=reverse.replace(e.after,e.before);}assert.equal(reverse,before);
const disk=fs.statfsSync(repo);assert(disk.bavail*disk.bsize>128*1048576);fs.writeFileSync(path.join(__dirname,'source-next.js'),text);fs.writeFileSync(path.join(report,'edits/source-edits.json'),JSON.stringify({before:hash(before),after:hash(text),edits},null,2));console.log(JSON.stringify({candidate:hash(text),edits:edits.length,freeMiB:disk.bavail*disk.bsize/1048576}));
