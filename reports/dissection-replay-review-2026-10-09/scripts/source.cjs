const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-replay-review-2026-10-09');
const sourcePath=path.join(repo,'stem_lab/stem_tool_dissection.js');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
let source=fs.readFileSync(sourcePath,'utf8');
const baseline=JSON.parse(fs.readFileSync(path.join(report,'baseline.json'),'utf8'));
if(hash(source)!==baseline.source)throw Error('Baseline drift');
const edits=[];
function edit(before,after){if(source.split(before).length!==2)throw Error('Nonunique edit: '+before.slice(0,100));source=source.replace(before,after);edits.push({before,after});}
edit('          function showProcedureReplay() {', `          function procedureReplayPosition(replay, now) {
            var empty = { active: false, elapsed: 0, progress: 0, index: 0, localProgress: 0 };
            if (!replay || !Array.isArray(replay.actions) || !replay.actions.length || typeof replay.duration !== 'number' || !isFinite(replay.duration) || replay.duration <= 0 || typeof replay.startedAt !== 'number' || !isFinite(replay.startedAt)) return empty;
            var elapsed = replay.paused ? replay.elapsed : now - replay.startedAt;
            if (replay.paused && elapsed == null) elapsed = 0;
            if (typeof elapsed !== 'number' || !isFinite(elapsed)) return empty;
            elapsed = Math.max(0, Math.min(replay.duration, elapsed));
            var progress = Math.min(0.999, elapsed / replay.duration);
            var index = Math.min(replay.actions.length - 1, Math.floor(progress * replay.actions.length));
            return { active: !!replay.paused || elapsed < replay.duration, elapsed: elapsed, progress: progress, index: index, localProgress: progress * replay.actions.length - index };
          }
          function procedureReplayReviewStep(replay, index) {
            if (!procedureReplayPosition(replay, replay && replay.startedAt).active || typeof index !== 'number' || !isFinite(index)) return null;
            var boundedIndex = Math.max(0, Math.min(replay.actions.length - 1, Math.floor(index)));
            return Object.assign({}, replay, { paused: true, elapsed: (boundedIndex + 0.5) / replay.actions.length * replay.duration });
          }
          function liveProcedureReplay() {
            var latest = canvasRefNode && canvasRefNode._drawD || d;
            var replay = latest._procedureReplay;
            return replay && replay.layer === activeLayer && (latest.specimen || 'frog') === specimen && (!replay.specimen || replay.specimen === specimen) ? replay : null;
          }
          function stopProcedureReplay(restoreFocus, quiet) {
            var replay = liveProcedureReplay();
            clearDissectionCanvasTimer(canvasRefNode, 'procedureReplay');
            if (!replay) return;
            upd('_procedureReplay', null);
            if (!quiet) setProcedureFeedback('Attempt review ended. Your recorded work is unchanged.', 'working');
            if (restoreFocus) focusDissectionTarget(replay.returnFocusId || 'diss-replay-attempt');
          }
          function scheduleProcedureReplayFinish(replay) {
            var replayCanvas = canvasRefNode;
            var remaining = Math.max(0, replay.duration - procedureReplayPosition(replay, Date.now()).elapsed);
            scheduleDissectionCanvasTimer(replayCanvas, 'procedureReplay', function () {
              var latest = replayCanvas && replayCanvas._drawD || {};
              var current = latest._procedureReplay;
              if (!current || current.paused || current.startedAt !== replay.startedAt || current.layer !== replay.layer || (latest.specimen || 'frog') !== specimen) return;
              var panel = queryDissectionNode('#diss-replay-review');
              var returnFocus = panel && typeof document !== 'undefined' && panel.contains(document.activeElement);
              clearOwnedTimedDissectionState('_procedureReplay', replay.startedAt, specimen);
              if (returnFocus) focusDissectionTarget(current.returnFocusId || 'diss-replay-attempt');
            }, remaining + 250);
          }
          function toggleProcedureReplayPause() {
            var replay = liveProcedureReplay();
            if (!replay) return;
            var position = procedureReplayPosition(replay, Date.now());
            if (!position.active) { stopProcedureReplay(true); return; }
            clearDissectionCanvasTimer(canvasRefNode, 'procedureReplay');
            var next = Object.assign({}, replay, { paused: !replay.paused, elapsed: position.elapsed, startedAt: replay.paused ? Date.now() - position.elapsed : replay.startedAt });
            upd('_procedureReplay', next);
            if (!next.paused) scheduleProcedureReplayFinish(next);
          }
          function reviewProcedureReplayAction(direction) {
            var replay = liveProcedureReplay();
            if (!replay) return;
            var position = procedureReplayPosition(replay, Date.now());
            var next = procedureReplayReviewStep(replay, position.index + direction);
            if (!next) return;
            clearDissectionCanvasTimer(canvasRefNode, 'procedureReplay');
            upd('_procedureReplay', next);
            var nextIndex = procedureReplayPosition(next, Date.now()).index;
            if (direction < 0 && nextIndex === 0) focusDissectionTarget(next.actions.length > 1 ? 'diss-replay-next' : 'diss-replay-toggle');
            else if (direction > 0 && nextIndex === next.actions.length - 1) focusDissectionTarget(next.actions.length > 1 ? 'diss-replay-previous' : 'diss-replay-toggle');
          }
          var activeProcedureReplay = liveProcedureReplay();
          var activeReplayPosition = procedureReplayPosition(activeProcedureReplay, Date.now());
          function showProcedureReplay(reviewOnly) {`);
edit(`            var replayCanvas = canvasRefNode;
            var replayStartedAt = Date.now();
            scheduleDissectionCanvasTimer(replayCanvas, 'procedureReplay', function () {
              clearOwnedTimedDissectionState('_procedureReplay', replayStartedAt, specimen);
            }, duration + 250);
            upd('_procedureReplay', { layer: activeLayer, startedAt: replayStartedAt, duration: duration, actions: actions });`, `            var replayStartedAt = Date.now();
            var review = reviewOnly === true;
            clearDissectionCanvasTimer(canvasRefNode, 'procedureReplay');
            var replay = { specimen: specimen, layer: activeLayer, startedAt: replayStartedAt, duration: duration, actions: actions,
              paused: review, elapsed: 0, returnFocusId: review ? 'diss-review-actions' : 'diss-replay-attempt' };
            if (review) replay = procedureReplayReviewStep(replay, 0);
            upd('_procedureReplay', replay);
            if (!review) scheduleProcedureReplayFinish(replay);
            focusDissectionTarget('diss-replay-toggle');`);
edit(`              if (!d.quizMode && liveReplay && liveReplay.layer === activeLayer && Date.now() - liveReplay.startedAt < liveReplay.duration) {
                var replayProgress = Math.max(0, Math.min(0.999, (Date.now() - liveReplay.startedAt) / liveReplay.duration));
                var replayActions = liveReplay.actions || [];
                var replayIndex = Math.min(replayActions.length - 1, Math.floor(replayProgress * replayActions.length));`, `              var replayPosition = procedureReplayPosition(liveReplay, Date.now());
              if (!d.quizMode && liveReplay && liveReplay.layer === activeLayer && (!liveReplay.specimen || liveReplay.specimen === specimen) && replayPosition.active) {
                var replayProgress = replayPosition.progress;
                var replayActions = liveReplay.actions || [];
                var replayIndex = replayPosition.index;`);
edit('                var replayLocal = replayProgress * Math.max(1, replayActions.length) - Math.max(0, replayIndex);\n                var replayDisplayProgress = dissMotionReduced ? 1 : replayLocal;', '                var replayLocal = replayPosition.localProgress;\n                var replayDisplayProgress = dissMotionReduced || liveReplay.paused ? 1 : replayLocal;');
edit(`React.createElement("button", { type: "button", disabled: !((currentProcedure.actionLog || []).length || (currentProcedure.history || []).length), onClick: showProcedureReplay, "aria-describedby": "diss-replay-evidence-help"`, `React.createElement("button", { id: "diss-replay-attempt", type: "button", disabled: !((currentProcedure.actionLog || []).length || (currentProcedure.history || []).length), onClick: showProcedureReplay, "aria-controls": "diss-replay-review", "aria-describedby": "diss-replay-evidence-help"`);
edit(`                      React.createElement("p", { id: "diss-replay-evidence-help" }`, `                      React.createElement("button", { id: "diss-review-actions", type: "button", disabled: !((currentProcedure.actionLog || []).length || (currentProcedure.history || []).length), onClick: function () { showProcedureReplay(true); }, "aria-controls": "diss-replay-review", "aria-describedby": "diss-replay-evidence-help" }, 'Review actions'),
                      React.createElement("p", { id: "diss-replay-evidence-help" }`);
edit(`                  React.createElement("p", { id: "diss-canvas-status",`, `                  !d.quizMode && activeProcedureReplay && activeReplayPosition.active && React.createElement("section", { id: "diss-replay-review", className: "diss-replay-review", role: "group", "aria-label": "Attempt replay controls", onKeyDown: function (event) { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); stopProcedureReplay(true); } } },
                    React.createElement("strong", null, 'Attempt review'),
                    React.createElement("p", { id: "diss-replay-review-status", role: "status", "aria-live": "polite", "aria-atomic": "true" }, activeProcedureReplay.paused
                      ? 'Paused · Action ' + (activeReplayPosition.index + 1) + ' of ' + activeProcedureReplay.actions.length + ' · ' + (activeProcedureReplay.actions[activeReplayPosition.index].label || procedureActionLabel(activeProcedureReplay.actions[activeReplayPosition.index].action))
                      : 'Playing replay · ' + activeProcedureReplay.actions.length + ' actions. Pause to inspect an action.'),
                    React.createElement("div", { className: "diss-replay-review__buttons" },
                      React.createElement("button", { id: "diss-replay-toggle", type: "button", onClick: toggleProcedureReplayPause }, activeProcedureReplay.paused ? 'Resume replay' : 'Pause replay'),
                      React.createElement("button", { id: "diss-replay-previous", type: "button", disabled: !!activeProcedureReplay.paused && activeReplayPosition.index === 0, onClick: function () { reviewProcedureReplayAction(-1); } }, 'Previous action'),
                      React.createElement("button", { id: "diss-replay-next", type: "button", disabled: !!activeProcedureReplay.paused && activeReplayPosition.index === activeProcedureReplay.actions.length - 1, onClick: function () { reviewProcedureReplayAction(1); } }, 'Next action'),
                      React.createElement("button", { id: "diss-replay-stop", type: "button", onClick: function () { stopProcedureReplay(true); } }, 'Stop replay')
                    ),
                    React.createElement("p", { className: "diss-replay-review__help" }, 'Previous and Next hold the full action on the specimen. Resume continues from that action. Escape ends the review.')
                  ),
                  React.createElement("p", { id: "diss-canvas-status",`);
edit('\n#diss-replay-evidence-help {', `
.diss-replay-review { display: grid; gap: .6rem; min-width: 0; margin: .65rem 0; padding: .85rem; border: 2px solid #0e7490; border-radius: .8rem; background: #ecfeff; color: #164e63; }
.diss-replay-review > strong, .diss-replay-review p, .diss-replay-review button { font-size: 1rem !important; line-height: 1.5; }
.diss-replay-review > strong { font-weight: 850; }
.diss-replay-review p { margin: 0; overflow-wrap: anywhere; }
.diss-replay-review__buttons { display: flex; flex-wrap: wrap; gap: .5rem; }
.diss-replay-review button { flex: 1 1 8rem; min-width: 0; min-height: 44px; padding: .55rem .7rem; border: 1px solid #0e7490; border-radius: .55rem; background: #fff; color: #164e63; font-weight: 750; cursor: pointer; }
.diss-replay-review button:disabled { color: #475569; border-color: #94a3b8; background: #f1f5f9; cursor: default; }
.diss-replay-review button:focus-visible { outline: 3px solid #0e7490; outline-offset: 3px; }
[data-dissection-root][data-text-size="large"] .diss-replay-review p, [data-dissection-root][data-text-size="large"] .diss-replay-review button, [data-dissection-root][data-text-size="large"] .diss-replay-review > strong { font-size: 1.125rem !important; }
[data-dissection-root][data-high-contrast="true"] .diss-replay-review { background: #fff; color: #000; border-color: #000; }
[data-dissection-root][data-high-contrast="true"] .diss-replay-review button { color: #000; border-color: #000; }
@media (forced-colors: active) { .diss-replay-review { background: Canvas; color: CanvasText; border-color: CanvasText; } .diss-replay-review button { background: ButtonFace; color: ButtonText; border-color: ButtonText; } .diss-replay-review button:focus-visible { outline-color: Highlight; } }
#diss-replay-evidence-help {`);
edit("            stopTechniqueCompareReplay();\n            var map = Object.assign({}, d.procedureByLayer || {});", "            stopTechniqueCompareReplay();\n            stopProcedureReplay(false, true);\n            var map = Object.assign({}, d.procedureByLayer || {});");
edit('          function performProcedureAction(action, payload) {\n            payload = payload || {};', '          function performProcedureAction(action, payload) {\n            stopProcedureReplay(false, true);\n            payload = payload || {};');
edit("            if (!action) { setProcedureFeedback('There is no technique action to undo.'); return; }", "            if (!action) { setProcedureFeedback('There is no technique action to undo.'); return; }\n            stopProcedureReplay(false, true);");
edit("            cancelActiveCanvasGesture('Specimen gesture canceled before changing anatomical view; no action was recorded.');", "            cancelActiveCanvasGesture('Specimen gesture canceled before changing anatomical view; no action was recorded.');\n            stopProcedureReplay(false, true);");
edit("            cancelActiveCanvasGesture('Specimen gesture canceled before changing layers; no action was recorded.');", "            cancelActiveCanvasGesture('Specimen gesture canceled before changing layers; no action was recorded.');\n            stopProcedureReplay(false, true);");
edit('          function showProcedureDemonstration() {', '          function showProcedureDemonstration() {\n            stopProcedureReplay(false, true);');
new vm.Script(source);
function write(target){const temp=target+'.replay-review.tmp';fs.writeFileSync(temp,source);fs.renameSync(temp,target);}
write(sourcePath);write(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js'));
fs.writeFileSync(path.join(report,'edits/source-edits.json'),JSON.stringify({before:baseline.source,after:hash(source),edits},null,2)+'\n');
console.log(JSON.stringify({source:hash(source),edits:edits.length}));
