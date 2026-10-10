const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const files=['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js'];
const baseline='a077a647a5073de5ea02a320305822fa52281f1499c636723b6645ed3dac35f9';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
let source=fs.readFileSync(path.join(repo,files[0]),'utf8');
for(const file of files)if(sha(fs.readFileSync(path.join(repo,file)))!==baseline)throw Error('Renderer baseline changed');
const original=source,edits=[];
function edit(label,old,replacement){const offset=source.indexOf(old);if(offset<0||source.indexOf(old,offset+old.length)>=0)throw Error('Unique anchor failed: '+label);edits.push({label,offset,old,new:replacement});source=source.slice(0,offset)+replacement+source.slice(offset+old.length);}
edit('Capture preference','          var evidenceFrameLimit = 6;','          var evidenceFrameLimit = 6;\n          var evidenceCaptureContents = d.evidenceCaptureContents === \'canvas\' ? \'canvas\' : \'specimen\';');
edit('Capture controls CSS','.diss-canvas-layout { display: grid; gap: .65rem; }',`.diss-capture-options { display: grid; flex: 1 1 18rem; min-width: 0; gap: .35rem; padding: .75rem; border: 1px solid #9fb8ba; border-radius: .7rem; background: #fff; color: #183f43; }
.diss-capture-options label { font-size: .875rem; font-weight: 850; }
.diss-capture-options select { width: 100%; min-width: 0; min-height: 48px; padding: .65rem; border: 1px solid #71849c; border-radius: .5rem; background: #fff; color: #183f43; font-size: 1rem; }
.diss-capture-options p { margin: 0; font-size: .875rem; line-height: 1.5; overflow-wrap: anywhere; }
[data-dissection-root][data-large-text="true"] .diss-capture-options :is(label,p) { font-size: 1rem; }
[data-dissection-root][data-large-text="true"] .diss-capture-options select { font-size: 1.125rem; }
[data-dissection-root][data-high-contrast="true"] .diss-capture-options { border: 2px solid #000; background: #fff; color: #000; }
@media (forced-colors: active) { .diss-capture-options, .diss-capture-options select { border-color: CanvasText; background: Canvas; color: CanvasText; } }
.diss-canvas-layout { display: grid; gap: .65rem; }`);
edit('Native capture helpers',"            canvas._drawDissectionNow = function () { if (dissAlive && canvas.isConnected && !isDissectionHidden() && !isDissectionOffscreen()) drawDissectionFrame(); };",`            canvas._drawDissectionNow = function () { if (dissAlive && canvas.isConnected && !isDissectionHidden() && !isDissectionOffscreen()) drawDissectionFrame(); };
            // Capture one current frame on demand. Restore the visible bitmap and render
            // bookkeeping so taking a photo never advances playback or changes interaction.
            function captureDissectionCanvasFrame(context, width, height, contents) {
              if (!context || typeof context.drawImage !== 'function' || !dissAlive || !canvas.isConnected || isDissectionHidden() || canvas._evidenceCaptureRequest) return false;
              var retainedBitmap = document.createElement('canvas');
              retainedBitmap.width = canvas.width; retainedBitmap.height = canvas.height;
              var retainedContext = retainedBitmap.getContext('2d');
              if (!retainedContext) return false;
              retainedContext.drawImage(canvas, 0, 0);
              var retainedState = {};
              Object.keys(canvas).forEach(function (key) { if (key.charAt(0) === '_' && key !== '_dissAnim') retainedState[key] = canvas[key]; });
              var retainedDataset = Object.assign({}, canvas.dataset);
              var retainedTick = dissTick, retainedDrawAt = dissLastDrawAt, retainedFrameCost = dissFrameCostAverage, retainedMotionReduced = dissMotionReduced;
              var retainedData = d, retainedInstrumentVisuals = instrumentVisuals;
              var request = { context: context, width: width, height: height, contents: contents, captured: false, failed: false, instrumentVisuals: (canvas._drawD || d).instrumentVisuals !== false };
              cancelDissectionFrame();
              canvas._evidenceCaptureRequest = request;
              if (contents === 'specimen') {
                canvas._toolPointer = null; canvas._toolStroke = null; canvas._keyboardFocus = false;
                canvas._cameraTransition = null;
              }
              try {
                drawDissectionFrame(0, true);
                return request.captured && !request.failed;
              } finally {
                cancelDissectionFrame();
                Object.keys(canvas).forEach(function (key) { if (key.charAt(0) === '_' && key !== '_dissAnim' && !Object.prototype.hasOwnProperty.call(retainedState, key)) delete canvas[key]; });
                Object.keys(retainedState).forEach(function (key) { canvas[key] = retainedState[key]; });
                canvas._evidenceCaptureRequest = null;
                dissTick = retainedTick; dissLastDrawAt = retainedDrawAt; dissFrameCostAverage = retainedFrameCost; dissMotionReduced = retainedMotionReduced;
                d = retainedData; instrumentVisuals = retainedInstrumentVisuals;
                Object.keys(canvas.dataset).forEach(function (key) { if (!Object.prototype.hasOwnProperty.call(retainedDataset, key)) delete canvas.dataset[key]; });
                Object.keys(retainedDataset).forEach(function (key) { canvas.dataset[key] = retainedDataset[key]; });
                // Reassigning the backing size also clears any clip/save stack left by a failed render.
                canvas.width = retainedBitmap.width; canvas.height = retainedBitmap.height;
                ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'copy'; ctx.drawImage(retainedBitmap, 0, 0); ctx.globalCompositeOperation = 'source-over';
                if (request.captured && !request.failed) canvas._lastCaptureCamera = request.camera;
                scheduleDissectionFrame();
              }
            }
            canvas._captureDissectionEvidence = function (context, width, height) { return captureDissectionCanvasFrame(context, width, height, 'specimen'); };
            canvas._captureFullDissectionEvidence = function (context, width, height) { return captureDissectionCanvasFrame(context, width, height, 'canvas'); };`);
edit('Capture helper cleanup','              canvas._dissKeyHandler = null; canvas._drawDissectionNow = null; canvas._dissMotionReduced = null; canvas._dissInViewport = null;','              canvas._dissKeyHandler = null; canvas._drawDissectionNow = null; canvas._dissMotionReduced = null; canvas._dissInViewport = null;\n              canvas._captureDissectionEvidence = null; canvas._captureFullDissectionEvidence = null; canvas._evidenceCaptureRequest = null; canvas._lastCaptureCamera = null;');
edit('Explicit offscreen capture','              if (isDissectionOffscreen()) { cancelDissectionFrame(); return; }','              if (isDissectionOffscreen() && arguments[1] !== true) { cancelDissectionFrame(); return; }');
edit('Render-only capture presentation','              d = canvas._drawD || d;','              d = canvas._drawD || d;\n              var specimenEvidenceCapture = !!(canvas._evidenceCaptureRequest && canvas._evidenceCaptureRequest.contents === \'specimen\');\n              if (specimenEvidenceCapture) d = Object.assign({}, d, { hoveredOrgan: null, instrumentVisuals: false, _procedureDemo: null, _procedureReplay: null });');
edit('Omit early progress and coaching','              var detailedCanvasHud = liveWorkspaceMode === \'advanced\' || fullscreenCanvas;','              var detailedCanvasHud = !specimenEvidenceCapture && (liveWorkspaceMode === \'advanced\' || fullscreenCanvas);');
edit('Omit annotation instructions','              if (!d.quizMode && d.annotateMode && d.annotations && d.annotations.length > 0) {','              if (!specimenEvidenceCapture && !d.quizMode && d.annotateMode && d.annotations && d.annotations.length > 0) {');
edit('Omit before-technique label','              if (d.beforeTechniqueView) {\n                ctx.save(); ctx.font', '              if (d.beforeTechniqueView && !specimenEvidenceCapture) {\n                ctx.save(); ctx.font');
edit('Keep technique marks without panel','                if (!evidenceCues.length) return;','                if (!evidenceCues.length || specimenEvidenceCapture) return;');
edit('Keep committed tissue consequence marks','              if (sceneDetail && instrumentVisuals && liveTissueState) {','              if (sceneDetail && (instrumentVisuals || (specimenEvidenceCapture && canvas._evidenceCaptureRequest.instrumentVisuals)) && liveTissueState) {');
edit('Omit prospective access corridor',"              if (!d.quizMode && (d.procedureMode || 'guided') === 'guided' && (d.visualRealism || 'guided') !== 'realistic' && !d.beforeTechniqueView && !canvasProcedure.incisionStarted && !revealedLayers[activeLayer]) {", "              if (!specimenEvidenceCapture && !d.quizMode && (d.procedureMode || 'guided') === 'guided' && (d.visualRealism || 'guided') !== 'realistic' && !d.beforeTechniqueView && !canvasProcedure.incisionStarted && !revealedLayers[activeLayer]) {");
edit('Omit hover tooltip','              if (hovOrg && !d.quizMode && d.selectedOrgan !== hovOrg.id) {','              if (hovOrg && !specimenEvidenceCapture && !d.quizMode && d.selectedOrgan !== hovOrg.id) {');
edit('Omit layer-map panel','              if (d.crossSectionMode) {\n                var sectionX', '              if (d.crossSectionMode && !specimenEvidenceCapture) {\n                var sectionX');
const legendStart=source.indexOf('                ctx.save();\n                ctx.font = \'bold 9px Inter, system-ui\'; ctx.fillStyle = highContrastEnabled ? \'#ffffff\' : \'#f8fafc\';\n                // Previous attempt');
if(legendStart<0)throw Error('Comparison legend start missing');
const legendEnd=source.indexOf('ctx.restore();',legendStart)+'ctx.restore();'.length;
const legend=source.slice(legendStart,legendEnd);
edit('Omit comparison control legend',legend,'                if (!specimenEvidenceCapture) {\n'+legend+'\n                }');
edit('Keep keyboard preview out of evidence',"              if (!d.quizMode && (d.annotateMode || d.rulerMode) && canvas._keyboardFocus && canvas._keyboardPreviewOrganId) {","              if (!specimenEvidenceCapture && !d.quizMode && (d.annotateMode || d.rulerMode) && canvas._keyboardFocus && canvas._keyboardPreviewOrganId) {");
edit('Copy anatomy and marks before fixed panels','              ctx.restore(); // End zoom transform',`              ctx.restore(); // End zoom transform
              if (specimenEvidenceCapture) {
                var specimenRequest = canvas._evidenceCaptureRequest;
                specimenRequest.context.drawImage(canvas, 0, 0, specimenRequest.width, specimenRequest.height);
                specimenRequest.camera = { zoom: zoom, panX: panX, panY: panY };
                specimenRequest.captured = true;
              }`);
edit('Full frame and fail closed',"              } catch (e) { console.error('[DissectionLab] render error:', e); try { ctx.restore(); ctx.restore(); } catch (_) {} }",`                if (canvas._evidenceCaptureRequest && canvas._evidenceCaptureRequest.contents === 'canvas') {
                  var fullRequest = canvas._evidenceCaptureRequest;
                  fullRequest.context.drawImage(canvas, 0, 0, fullRequest.width, fullRequest.height);
                  fullRequest.camera = { zoom: zoom, panX: panX, panY: panY };
                  fullRequest.captured = true;
                }
              } catch (e) { if (canvas._evidenceCaptureRequest) canvas._evidenceCaptureRequest.failed = true; console.error('[DissectionLab] render error:', e); try { ctx.restore(); ctx.restore(); } catch (_) {} }`);
edit('Persist capture preference','              visualEvidence: visualEvidence,','              evidenceCaptureContents: evidenceCaptureContents,\n              visualEvidence: visualEvidence,');
edit('Restore capture preference','                visualEvidence: Array.isArray(data.visualEvidence)',"                evidenceCaptureContents: data.evidenceCaptureContents === 'canvas' ? 'canvas' : 'specimen',\n                visualEvidence: Array.isArray(data.visualEvidence)");
edit('Frozen frame context',`              capturedIso ? React.createElement("time", { dateTime: capturedIso }, 'Captured ' + capturedIso.slice(0, 19).replace('T', ' ') + ' UTC') : React.createElement("p", null, 'Capture time unavailable')`,`              React.createElement("p", { "data-evidence-capture-context": true },
                (evidence.captureContents === 'specimen' ? 'Specimen and marks' : (evidence.captureContents === 'canvas' ? 'Full canvas with guides' : 'Frame contents not recorded'))
                + (evidence.camera && typeof evidence.camera.zoom === 'number' && isFinite(evidence.camera.zoom) && evidence.camera.zoom > 0 ? ' · Zoom ' + Math.round(evidence.camera.zoom * 100) / 100 + '×' : '')
                + (typeof evidence.annotationCount === 'number' && isFinite(evidence.annotationCount) && evidence.annotationCount >= 0 ? ' · ' + Math.floor(evidence.annotationCount) + ' observation mark' + (evidence.annotationCount === 1 ? '' : 's') : '')
                + (typeof evidence.measurementText === 'string' && evidence.measurementText ? ' · Approximate model distance: ' + evidence.measurementText : '')
              ),
              capturedIso ? React.createElement("time", { dateTime: capturedIso }, 'Captured ' + capturedIso.slice(0, 19).replace('T', ' ') + ' UTC') : React.createElement("p", null, 'Capture time unavailable')`);
edit('Capture current requested contents','              thumbnailContext.drawImage(sourceCanvas, 0, 0, thumbnail.width, thumbnail.height);',`              var captureFrame = evidenceCaptureContents === 'canvas' ? sourceCanvas._captureFullDissectionEvidence : sourceCanvas._captureDissectionEvidence;
              if (typeof captureFrame === 'function') {
                if (!captureFrame(thumbnailContext, thumbnail.width, thumbnail.height)) throw new Error('Evidence render unavailable');
              } else throw new Error('Evidence render unavailable');`);
edit('Record immutable spatial context','                image: thumbnail.toDataURL(\'image/jpeg\', 0.72),',`                image: thumbnail.toDataURL('image/jpeg', 0.72),
                captureContents: evidenceCaptureContents,
                camera: Object.assign({}, sourceCanvas._lastCaptureCamera || { zoom: Number(d.canvasZoom) || 1, panX: Number(d.canvasPanX) || 0, panY: Number(d.canvasPanY) || 0 }),
                annotationCount: Array.isArray(d.annotations) ? d.annotations.length : 0,
                measurementText: d.rulerStart && d.rulerEnd ? modelMeasurementText(d.rulerStart, d.rulerEnd) : '',`);
edit('Frame contents choice',`              React.createElement("button", { "aria-label": visualEvidence.length >= evidenceFrameLimit ? "Evidence notebook full; manage frames before capturing another" : "Capture compressed visual evidence frame",`,`              React.createElement("div", { className: "diss-capture-options" },
                React.createElement("label", { htmlFor: "diss-evidence-capture-contents" }, 'Frame contents'),
                React.createElement("select", { id: "diss-evidence-capture-contents", value: evidenceCaptureContents, "aria-describedby": "diss-evidence-capture-help", onChange: function (event) { upd('evidenceCaptureContents', event.target.value === 'canvas' ? 'canvas' : 'specimen'); } },
                  React.createElement("option", { value: "specimen" }, 'Specimen and marks'),
                  React.createElement("option", { value: "canvas" }, 'Full canvas with guides')
                ),
                React.createElement("p", { id: "diss-evidence-capture-help" }, 'Specimen captures keep anatomy and your marks. Choose full canvas to include lens windows and guide panels.')
              ),
              React.createElement("button", { "aria-label": visualEvidence.length >= evidenceFrameLimit ? "Evidence notebook full; manage frames before capturing another" : "Capture compressed visual evidence frame",`);
new vm.Script(source);
let restored=source;for(const item of [...edits].reverse()){if(restored.slice(item.offset,item.offset+item.new.length)!==item.new)throw Error('Reversal failed');restored=restored.slice(0,item.offset)+item.old+restored.slice(item.offset+item.new.length);}
if(restored!==original)throw Error('Baseline preservation failed');
if(process.argv.includes('--apply')){
 fs.writeFileSync(path.join(__dirname,'renderer-capture-baseline.js'),original);
 fs.writeFileSync(path.join(__dirname,'renderer-capture-edits.json'),JSON.stringify({files,baselineSha256:baseline,finalSha256:sha(source),edits,parsed:true,exactReversal:true},null,2));
 for(const file of files)fs.writeFileSync(path.join(repo,file),source);
}
console.log(JSON.stringify({dryRun:!process.argv.includes('--apply'),edits:edits.length,parsed:true,sha256:sha(source)}));
