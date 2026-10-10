const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-replay-contact-2026-10-10');
const file=path.join(repo,'stem_lab/stem_tool_dissection.js'),mirror=path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
let source=fs.readFileSync(file,'utf8');const baseline=JSON.parse(fs.readFileSync(path.join(report,'baseline.json'),'utf8'));
if(hash(source)!==baseline.source||source!==fs.readFileSync(mirror,'utf8'))throw Error('Source drift');
const edits=[];
function edit(before,after){if(source.split(before).length!==2)throw Error('Nonunique source edit: '+before.slice(0,100));source=source.replace(before,after);edits.push({before,after});}
edit('          function procedureReplayReviewStep(replay, index) {',`          function procedureReplayContact(entry) {
            var point = entry && entry.point;
            if (!point || typeof point.x !== 'number' || !isFinite(point.x) || point.x < 0 || point.x > 1 || typeof point.y !== 'number' || !isFinite(point.y) || point.y < 0 || point.y > 1) return null;
            return { x: point.x, y: point.y };
          }
          function procedureReplayContactLabel(entry, contact) {
            if (!contact) return 'TEACHING POSITION';
            entry = entry || {};
            var supported = entry.assistance === 'motor-neutral' || entry.assistance === 'supported' || entry.inputType === 'motor-neutral' || entry.inputType === 'button';
            return supported ? 'SUPPORTED POSITION' : 'SAVED POSITION';
          }
          function procedureReplayIsActive(replay, now, specimen, layer, quizMode) {
            return !!(!quizMode && replay && replay.layer === layer && (!replay.specimen || replay.specimen === specimen) && procedureReplayPosition(replay, now).active);
          }
          function procedureReplayReviewStep(replay, index) {`);
edit('          var activeReplayPosition = procedureReplayPosition(activeProcedureReplay, Date.now());',`          var activeReplayPosition = procedureReplayPosition(activeProcedureReplay, Date.now());
          var activeReplayEntry = activeProcedureReplay && (activeProcedureReplay.actions || [])[activeReplayPosition.index];
          var activeReplayContactLabel = activeReplayEntry && ['scalpel', 'scissors'].indexOf(activeReplayEntry.action) < 0 ? procedureReplayContactLabel(activeReplayEntry, procedureReplayContact(activeReplayEntry)) : null;`);
edit("              if (!d.quizMode && liveReplay && liveReplay.layer === activeLayer && (!liveReplay.specimen || liveReplay.specimen === specimen) && replayPosition.active) {", "              var replayIsActive = procedureReplayIsActive(liveReplay, Date.now(), specimen, activeLayer, d.quizMode);\n              if (replayIsActive) {");
edit("                var replayPoint = replayTrace ? replayTrace.point : (overlayGuide[Math.floor((overlayGuide.length - 1) / 2)] || overlayGuide[0]);", "                var replayContact = procedureReplayContact(replayEntry);\n                var replayPoint = replayTrace ? replayTrace.point : (replayContact || overlayGuide[Math.floor((overlayGuide.length - 1) / 2)] || overlayGuide[0]);");
edit("                  if (canvasProcedure.forcepsPoint) replayPoint = canvasProcedure.forcepsPoint;\n                  replaySetting = procedureReplaySetting(replayEntry, 'forcepsGrip');", "                  replaySetting = procedureReplaySetting(replayEntry, 'forcepsGrip');");
edit("                  var replayPinOrdinal = replayActions.slice(0, replayIndex + 1).filter(function (entry) { return entry.action === 'pin'; }).length - 1;\n                  if ((canvasProcedure.pins || []).length) replayPoint = canvasProcedure.pins[Math.max(0, Math.min((canvasProcedure.pins || []).length - 1, replayPinOrdinal))];\n                  replaySetting = procedureReplaySetting(replayEntry, 'pinAngle');", "                  replaySetting = procedureReplaySetting(replayEntry, 'pinAngle');");
edit("                  var replayProbeOrgan = organs.find(function (organ) { return organ.id === canvasProcedure.probedOrganId; });\n                  if (replayProbeOrgan) replayPoint = variedOrganPoint(replayProbeOrgan);\n                  replaySetting = procedureReplaySetting(replayEntry, 'probePressure');", "                  replaySetting = procedureReplaySetting(replayEntry, 'probePressure');");
edit("                  if (canvasProcedure.dropperPoint) replayPoint = canvasProcedure.dropperPoint;\n                  replaySetting = procedureReplaySetting(replayEntry, 'salineDose');", "                  replaySetting = procedureReplaySetting(replayEntry, 'salineDose');");
edit("                  if (canvasProcedure.wickPoint) replayPoint = canvasProcedure.wickPoint;\n                  replayMeasureText = 'ABSORB'; replayStatusText = 'WICK';", "                  replayMeasureText = 'ABSORB'; replayStatusText = 'WICK';");
edit("                var replayAccessible = highContrastEnabled || (d.visualRealism || visualRealism) === 'accessible';", "                if (!replayCuttingAction) replayStatusText = procedureReplayContactLabel(replayEntry, replayContact) + ' · ' + replayStatusText;\n                var replayAccessible = highContrastEnabled || (d.visualRealism || visualRealism) === 'accessible';");
edit("              if ((d.visualRealism || 'guided') !== 'realistic' && liveInstrument === 'forceps' && canvasProcedure.incisionExtended && !canvasProcedure.retracted) {", "              if (!replayIsActive && (d.visualRealism || 'guided') !== 'realistic' && liveInstrument === 'forceps' && canvasProcedure.incisionExtended && !canvasProcedure.retracted) {");
edit("              if ((d.visualRealism || 'guided') !== 'realistic' && liveInstrument === 'pin' && canvasProcedure.retracted && (canvasProcedure.pins || []).length < 2) {", "              if (!replayIsActive && (d.visualRealism || 'guided') !== 'realistic' && liveInstrument === 'pin' && canvasProcedure.retracted && (canvasProcedure.pins || []).length < 2) {");
edit('                var replayStatusLines = wrapTextToWidth(replayCaption.status, replayTextWidth, 2);', '                var replayStatusLines = wrapTextToWidth(replayCaption.status, replayTextWidth, 3);');
edit('                    React.createElement("div", { className: "diss-replay-review__buttons" },', `                    activeProcedureReplay.paused && activeReplayContactLabel && React.createElement("p", { id: "diss-replay-contact-detail" },
                      activeReplayContactLabel === 'SAVED POSITION' ? 'Saved action position.' : (activeReplayContactLabel === 'SUPPORTED POSITION' ? 'Supported action position.' : 'Illustrative position; contact not recorded.')),
                    React.createElement("div", { className: "diss-replay-review__buttons" },`);
new vm.Script(source,{filename:'stem_tool_dissection.js'});
if(hash(fs.readFileSync(file))!==baseline.source||hash(fs.readFileSync(mirror))!==baseline.source)throw Error('Concurrent source change');
for(const target of [file,mirror]){const temp=target+'.replay-contact.tmp';if(fs.existsSync(temp))fs.unlinkSync(temp);fs.writeFileSync(temp,source,{flag:'wx'});fs.renameSync(temp,target);}
fs.writeFileSync(path.join(report,'edits/source-edits.json'),JSON.stringify({before:baseline.source,after:hash(source),edits},null,2)+'\n');
console.log(JSON.stringify({source:hash(source),edits:edits.length}));
