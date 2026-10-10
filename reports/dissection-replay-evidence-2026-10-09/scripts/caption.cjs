const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), zlib = require('node:zlib');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-replay-evidence-2026-10-09');
const sourcePath = path.join(repo, 'stem_lab/stem_tool_dissection.js');
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
let source = fs.readFileSync(sourcePath, 'utf8');
if (hash(source) !== 'e550fd7ca87d375c12ac5a7b4b8610f8e8693593e507bbeb22563a90df38f7d1') throw Error('Source drift');
const record = JSON.parse(fs.readFileSync(path.join(report, 'edits/source-edits.json'), 'utf8'));
function edit(before, after) {
  if (source.split(before).length !== 2) throw Error('Nonunique edit: ' + before.slice(0, 100));
  source = source.replace(before, after); record.edits.push({ before, after });
}
edit('              var liveReplay = d._procedureReplay;', '              var replayCaption = null;\n              var liveReplay = d._procedureReplay;');
const start = source.indexOf("                ctx.save(); ctx.shadowBlur = 0; ctx.font = 'bold 10px Inter, system-ui';\n                var replayTitle");
const end = source.indexOf('\n              }\n              var liveInstrument', start);
if (start < 0 || end < 0) throw Error('Caption range missing');
edit(source.slice(start, end), `                // Paint the caption after anatomy labels, in screen coordinates, so text
                // stays readable while the specimen is mirrored, zoomed, or shown narrowly.
                replayCaption = {
                  title: 'STEP ' + (replayIndex + 1) + '/' + replayActions.length + ' \\u00B7 ' + (replayEntry.label || procedureActionLabel(replayEntry.action)).toUpperCase(),
                  detail: replayMeasureText, status: replayStatusText, accessible: replayAccessible,
                  progress: replayProgress, anchor: canvasScreenBox(replayMarkerX, replayMarkerY, 0, 0)
                };`);
edit('              drawAnatomicalOrientationCompass();\n              var liveScreenPointer', `              drawAnatomicalOrientationCompass();
              if (replayCaption && !specimenEvidenceCapture) {
                ctx.save(); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
                var replayTypeScale = canvasUiScale, replayInset = 8 * replayTypeScale;
                ctx.font = 'bold ' + (12 * replayTypeScale) + 'px Inter, system-ui';
                var replayLabelWidth = Math.min(W - 28, Math.max(180, Math.ceil(Math.max(ctx.measureText(replayCaption.title).width,
                  ctx.measureText(replayCaption.detail).width, ctx.measureText(replayCaption.status).width)) + 2 * replayInset));
                var replayTextWidth = replayLabelWidth - 2 * replayInset;
                var replayTitleLines = wrapTextToWidth(replayCaption.title, replayTextWidth, 2);
                var replayDetailLines = wrapTextToWidth(replayCaption.detail, replayTextWidth, 2);
                var replayStatusLines = wrapTextToWidth(replayCaption.status, replayTextWidth, 2);
                var replayLineHeight = 15 * replayTypeScale;
                var replayLabelHeight = (replayTitleLines.length + replayDetailLines.length + replayStatusLines.length) * replayLineHeight + 12 * replayTypeScale;
                var replayAnchor = replayCaption.anchor || { x: W / 2, y: H / 2 };
                var replayPlacement = placeCanvasHudPanel(replayAnchor.x + 14, replayAnchor.y - replayLabelHeight,
                  replayLabelWidth, replayLabelHeight, sharedHudReservations);
                var replayLabelX = replayPlacement.x, replayLabelY = replayPlacement.y;
                rememberCanvasHudBox('replay', replayLabelX, replayLabelY, replayLabelWidth, replayLabelHeight);
                ctx.fillStyle = replayCaption.accessible ? '#000000' : 'rgba(15,23,42,0.96)';
                ctx.strokeStyle = replayCaption.accessible ? '#ffffff' : '#67e8f9'; ctx.lineWidth = 1.2;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(replayLabelX, replayLabelY, replayLabelWidth, replayLabelHeight, 6);
                else ctx.rect(replayLabelX, replayLabelY, replayLabelWidth, replayLabelHeight);
                ctx.fill(); ctx.stroke();
                var replayRowY = replayLabelY + 15 * replayTypeScale;
                [replayTitleLines, replayDetailLines, replayStatusLines].forEach(function (lines, group) {
                  ctx.fillStyle = group === 0 ? '#ffffff' : (replayCaption.accessible ? '#facc15' : '#a5f3fc');
                  lines.forEach(function (line) { ctx.fillText(line, replayLabelX + replayInset, replayRowY); replayRowY += replayLineHeight; });
                });
                ctx.fillStyle = replayCaption.accessible ? '#ffffff' : '#22d3ee';
                ctx.fillRect(replayLabelX + 1, replayLabelY + replayLabelHeight - 4 * replayTypeScale,
                  Math.max(2, (replayLabelWidth - 2) * replayCaption.progress), 3 * replayTypeScale);
                ctx.restore();
              }
              var liveScreenPointer`);
new (require('node:vm').Script)(source);
fs.writeFileSync(sourcePath, source);
fs.writeFileSync(path.join(repo, 'desktop/web-app/public/stem_lab/stem_tool_dissection.js'), source);
record.after = hash(source);
fs.writeFileSync(path.join(report, 'edits/source-edits.json'), JSON.stringify(record, null, 2) + '\n');
fs.writeFileSync(path.join(report, 'edits/source-after.js.gz'), zlib.gzipSync(source));
let runner = fs.readFileSync(path.join(__dirname, 'run.cjs'), 'utf8');
runner = runner.replace('replay evidence|persistent, accessible procedural instrument|renders guided instruments', 'replay evidence|persistent, accessible procedural instrument|renders guided instruments|renders specimen-aware realism controls|shows comparison replay statically');
fs.writeFileSync(path.join(__dirname, 'run-final.cjs'), runner);
console.log(JSON.stringify({ source: record.after, sourceEdits: record.edits.length }));
