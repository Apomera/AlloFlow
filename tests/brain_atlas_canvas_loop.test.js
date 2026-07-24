import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const BRAIN_ATLAS_PATHS = [
  'stem_lab/stem_tool_brainatlas.js',
  'desktop/web-app/public/stem_lab/stem_tool_brainatlas.js',
];

describe('brain atlas canvas loops', () => {
  it('manages the main atlas canvas lifecycle through a visibility-aware scheduler', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('window.StemLab.setupHiDPI(canvas, atlasW, atlasH);');
      expect(source).toContain('if (window.__alloBrainAtlasCanvasCleanup) window.__alloBrainAtlasCanvasCleanup();');
      expect(source).toContain('if (canvas._brainCleanup) canvas._brainCleanup();');
      expect(source).toContain('function cleanupBrainCanvas()');
      expect(source).toContain('function isBrainAtlasHidden()');
      expect(source).toContain('function cancelBrainFrame()');
      expect(source).toContain('function scheduleBrainFrame()');
      expect(source).toContain('if (!brainAlive || brainMotionReduced || canvas._brainAnim || isBrainAtlasHidden()) return;');
      expect(source).toContain('canvas._brainAnim = requestAnimationFrame(drawBrainFrame);');
      expect(source).toContain('if (!brainMotionReduced) canvas._brainTick++;');
      expect(source).toContain("document.addEventListener('visibilitychange', onBrainAtlasVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onBrainAtlasVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupBrainCanvas(); return; }');
      expect(source).toContain('scheduleBrainFrame(); return;');
      expect(source).not.toContain('if (canvas._brainAnim && canvas._brainViewKey === _cacheKey) return;');
    });
  });

  it('wraps selected-region callouts and clamps them inside the canvas', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function brainAtlasEllipsizeCanvasText(text, maxWidth)');
      expect(source).toContain('function brainAtlasWrapCanvasLabel(text, maxWidth, maxLines)');
      expect(source).toContain('var pillMaxWidth = Math.min(260, W * 0.42);');
      expect(source).toContain('var pillX = Math.max(8, Math.min(W - pillW - 8, preferredPillX));');
      expect(source).toContain('var pillY = Math.max(8, Math.min(H - pillH - 24, py - pillH / 2));');
      expect(source).toContain('labelLines.forEach(function (line, lineIndex)');
      expect(source).toContain("var rawViewLabel = currentView.name.toUpperCase() + ' VIEW';");
      expect(source).toContain('var viewLabel = brainAtlasEllipsizeCanvasText(rawViewLabel, Math.max(80, W - 40));');
      expect(source).not.toContain('ctx.fillText(r.name, isRight ? pillX + tw + 5 : pillX + 5, py + 3);');
    });
  });

  it('wraps dense diagram headings in a consistent safe-margin card', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const headingCalls = source.match(/brainAtlasDrawCanvasHeading\('/g) || [];

      expect(source).toContain('function brainAtlasDrawCanvasHeading(title, subtitle, palette)');
      expect(headingCalls).toHaveLength(11);
      expect(source).toContain('var panelX = 24, panelY = 14, panelW = Math.max(120, W - 48);');
      expect(source).toContain('var panelH = Math.max(76, Math.min(96, H * 0.13));');
      expect(source).toContain('var maxTextWidth = Math.max(80, panelW - 52);');
      expect(source).toContain('var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 2);');
      expect(source).toContain('var subtitleLines = subtitle ? brainAtlasWrapCanvasLabel(subtitle, maxTextWidth, 2) : [];');
      expect(source).toContain('titleLines.forEach(function (line)');
      expect(source).not.toContain("ctx.fillText('Visual pathway and field cuts', W * 0.5, H * 0.055);");
    });
  });
  it('wraps cross-lateral headings and scales the fixation inset by available height', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function brainAtlasDrawCompactCanvasHeading(title, subtitle, palette)');
      expect(source).toContain('var headerH = Math.max(48, Math.min(66, H * 0.11));');
      expect(source).toContain('var subtitleLines = subtitle ? brainAtlasWrapCanvasLabel(subtitle, maxTextWidth, 2) : [];');
      expect(source).toContain("brainAtlasDrawCompactCanvasHeading('CROSS-LATERALIZATION'");
      expect(source).toContain('var brCx = W * 0.5, brCy = H * 0.33');
      expect(source).toContain('var bh = Math.max(96, H * 0.190);');
      expect(source).toContain('var insetHeaderH = Math.max(36, Math.min(44, bh * 0.38));');
      expect(source).toContain("var insetBodyLines = brainAtlasWrapCanvasLabel('Callosotomy blocks transfer");
      expect(source).toContain('sy = by + insetHeaderH + 2');
      expect(source).toContain('outcomeBox(ox, by + bh * 0.610');
      expect(source).toContain("brainAtlasDrawPathLabel(bx + bw * 0.43, by + bh * 0.60, 'LVF -> right hemisphere'");
      expect(source).not.toContain("ctx.fillText('CROSS-LATERALIZATION', W * 0.5, H * 0.045)");
      expect(source).not.toContain("ctx.fillText('Callosotomy blocks transfer; intact callosum shares the cue.'");
    });
  });

  it('wraps visual-field captions inside a dedicated split-brain inset band', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('sh = bh - insetHeaderH - 24;');
      expect(source).toContain('var visualFieldLabelY = sy + sh + 11;');
      expect(source).toContain("brainAtlasDrawBoundedNodeLabel(sx + sw * 0.25, visualFieldLabelY, sw * 0.48, 20, 'left visual field'");
      expect(source).toContain("brainAtlasDrawBoundedNodeLabel(sx + sw * 0.75, visualFieldLabelY, sw * 0.48, 20, 'right visual field'");
      expect(source).not.toContain("ctx.fillText('left visual field'");
      expect(source).not.toContain("ctx.fillText('right visual field'");
    });
  });

  it('wraps clinical case cards without increasing their diagram footprint', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const cardCalls = source.match(/brainAtlasDrawClinicalCaseCard\(/g) || [];

      expect(source).toContain('function brainAtlasDrawClinicalCaseCard(x, y, w, h, title, clue, answer, color)');
      expect(cardCalls).toHaveLength(5);
      expect(source).toContain('var cardX = Math.max(8, Math.min(W - w - 8, x));');
      expect(source).toContain('var cardY = Math.max(8, Math.min(H - h - 8, y));');
      expect(source).toContain('var maxTextWidth = Math.max(50, w - 24);');
      expect(source).toContain('var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 1);');
      expect(source).toContain('var clueLines = brainAtlasWrapCanvasLabel(clue, maxTextWidth, 2);');
      expect(source).toContain('var answerLines = brainAtlasWrapCanvasLabel(answer, maxTextWidth, 1);');
      expect(source).toContain('var textHeight = titleLines.length * titleLineHeight + clueLines.length * bodyLineHeight');
      expect(source).toContain('var cursorY = cardY + Math.max(2, (h - textHeight) / 2);');
      expect(source).toContain('ctx.fillRect(cardX + 6, cardY + 8, 3, Math.max(18, h - 16));');
      expect(source).not.toContain('ctx.fillText(clue, x + 9, y + H * 0.049);');
    });
  });

  it('wraps decoder chips across visual, movement, limbic, and sleep views', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const chipCalls = source.match(/brainAtlasDrawDecoderChip\(/g) || [];

      expect(source).toContain('function brainAtlasDrawDecoderChip(x, y, w, h, title, body, color, active)');
      expect(chipCalls).toHaveLength(7);
      expect(source).toContain('var chipX = Math.max(8, Math.min(W - w - 8, x));');
      expect(source).toContain('var chipY = Math.max(8, Math.min(H - h - 8, y));');
      expect(source).toContain('var maxTextWidth = Math.max(44, w - 18);');
      expect(source).toContain('var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 1);');
      expect(source).toContain('var bodyLines = brainAtlasWrapCanvasLabel(body, maxTextWidth, 2);');
      expect(source).toContain('var textHeight = titleLines.length * titleLineHeight + bodyLines.length * bodyLineHeight + 3;');
      expect(source).toContain('var cursorY = chipY + Math.max(1, (h - textHeight) / 2);');
      expect(source).toContain('ctx.fillRect(chipX + 9, chipY + 5, Math.max(18, w - 18), 2);');
      expect(source).toContain("ctx.shadowColor = active ? color + '55' : 'rgba(15,23,42,0.07)'");
      expect(source).toContain("ctx.fillStyle = active ? color + '14' : 'rgba(255,255,255,0.95)'");
      expect(source).toContain("ctx.lineWidth = active ? 1.8 : 1.15;");
      expect(source).not.toContain('ctx.fillText(sub, x + w / 2, y + H * 0.031);');
    });
  });

  it('adapts decoder banner text between side-by-side and wrapped layouts', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const bannerCalls = source.match(/brainAtlasDrawDecoderBannerText\(/g) || [];

      expect(source).toContain('function brainAtlasDrawDecoderBannerText(x, y, w, h, title, subtitle, accent)');
      expect(bannerCalls).toHaveLength(7);
      expect(source).toContain('var sideBySide = titleWidth + subtitleWidth + 22 <= maxTextWidth;');
      expect(source).toContain('var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 1);');
      expect(source).toContain('var subtitleLines = brainAtlasWrapCanvasLabel(subtitle, maxTextWidth, 2);');
      expect(source).toContain('var cursorY = y + Math.max(1, (h - textHeight) / 2);');
      expect(source).toContain("ctx.fillStyle = accent || '#818cf8';");
      expect(source).not.toContain("ctx.fillText('SLEEP ARCHITECTURE DECODER', sleepDecoderX + W * 0.018");
    });
  });
  it('routes the animated neuron decoder through wrapped shared layouts', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('boxH = Math.max(74, H * 0.118);');
      expect(source).toContain('var decoderHeaderH = Math.max(30, Math.min(36, boxH * 0.44));');
      expect(source).toContain("brainAtlasDrawDecoderBannerText(boxX + 5, boxY + 5, boxW - 10, decoderHeaderH, 'SPIKE CYCLE DECODER'");
      expect(source).toContain('var chipPadding = Math.max(8, boxW * 0.025);');
      expect(source).toContain('var chipW = (boxW - chipPadding * 2 - chipGap * 4) / 5;');
      expect(source).toContain('brainAtlasDrawDecoderChip(cx, cy, chipW, chipH, ch.label, ch.sub, ch.color, isPhase);');
      expect(source).not.toContain("ctx.fillText('SPIKE CYCLE DECODER', boxX + 12");
      expect(source).not.toContain('ctx.fillText(ch.label, cx + chipW / 2');
    });
  });


  it('wraps long explanatory strips inside bounded canvas panels', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const stripCalls = source.match(/brainAtlasDrawInfoStrip\(/g) || [];

      expect(source).toContain('function brainAtlasDrawInfoStrip(x, y, w, h, text, accent)');
      expect(stripCalls).toHaveLength(5);
      expect(source).toContain('var stripX = Math.max(8, Math.min(W - w - 8, x));');
      expect(source).toContain('var stripY = Math.max(8, Math.min(H - h - 8, y));');
      expect(source).toContain('var lines = brainAtlasWrapCanvasLabel(text, maxTextWidth, 2);');
      expect(source).toContain('var cursorY = stripY + Math.max(1, (h - lines.length * lineHeight) / 2);');
      expect(source).toContain('ctx.fillRect(stripX + 10, stripY + Math.max(7, h * 0.22), 3, Math.max(16, h * 0.56));');
      expect(source).not.toContain("ctx.fillText('CSF FLOW ROUTE: choroid -> lateral");
      expect(source).not.toContain("ctx.fillText('APHASIA CLUES: test fluency");
    });
  });

  it('wraps and vertically centers compact annotation cards across dense views', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const annotationCalls = source.match(/brainAtlasDrawAnnotationCard\(/g) || [];

      expect(source).toContain('function brainAtlasDrawAnnotationCard(x, y, w, h, title, body, color, active)');
      expect(annotationCalls).toHaveLength(6);
      expect(source).toContain('var cardX = Math.max(8, Math.min(W - w - 8, x));');
      expect(source).toContain('var cardY = Math.max(8, Math.min(H - h - 8, y));');
      expect(source).toContain("var bodyText = Array.isArray(body) ? body.join(' ') : String(body || '');");
      expect(source).toContain('var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 2);');
      expect(source).toContain('var bodyLines = brainAtlasWrapCanvasLabel(bodyText, maxTextWidth, 2);');
      expect(source).toContain('var cursorY = cardY + Math.max(2, (h - textHeight) / 2);');
      expect(source).toContain('ctx.fillRect(cardX + 9, cardY + Math.max(8, h * 0.18), 3, Math.max(18, h * 0.64));');
      expect(source).not.toContain('ctx.fillText(line1, x + W * 0.014');
      expect(source).not.toContain('ctx.fillText(lines[1], x, y + H * 0.034);');
    });
  });

  it('wraps titles and subtitles inside compact node geometry', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const nodeLabelCalls = source.match(/brainAtlasDrawBoundedNodeLabel\(/g) || [];

      expect(source).toContain('function brainAtlasDrawBoundedNodeLabel(cx, cy, w, h, title, subtitle, titleColor, subtitleColor)');
      expect(nodeLabelCalls).toHaveLength(20);
      expect(source).toContain('var maxTextWidth = Math.max(32, w - 14);');
      expect(source).toContain('var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 2);');
      expect(source).toContain('var subtitleLines = subtitle ? brainAtlasWrapCanvasLabel(subtitle, maxTextWidth, 2) : [];');
      expect(source).toContain('var textHeight = titleLines.length * titleLineHeight + subtitleLines.length * subtitleLineHeight');
      expect(source).toContain('var cursorY = cy - textHeight / 2;');
      expect(source).toContain('var labelWidth = ctx.measureText(label).width;');
      expect(source).toContain('var subtitleWidth = ctx.measureText(sub).width;');
      expect(source).toContain('var measured = Math.max(labelWidth, subtitleWidth) + 28;');
      expect(source).not.toContain('ctx.fillText(n.label, n.x, n.y - n.h * 0.07);');
      expect(source).not.toContain('ctx.fillText(label, x, y - H * 0.004);');
    });
  });

  it('measures Penfield labels and separates its target readout columns', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("brainAtlasDrawCanvasHeading('Penfield stimulation response map'");
      expect(source).toContain('var stimStartX = W * 0.52, stimCapY = Math.max(96, H * 0.145)');
      expect(source).toContain('var labelW = Math.max(80, Math.min(118, W * 0.24');
      expect(source).toContain("brainAtlasDrawBoundedNodeLabel(labelX, labelY, labelW, labelH, z.label, z.sub");
      expect(source).toContain('var readoutSplitX = readoutX + readoutW * 0.58;');
      expect(source).toContain('var targetReadout = brainAtlasEllipsizeCanvasText');
      expect(source).toContain('var responseReadout = brainAtlasEllipsizeCanvasText');
      expect(source).toContain('brainAtlasDrawBoundedNodeLabel(cx + cw / 2, cy + 13.5, cw - 8, 27');
      expect(source).not.toContain('ctx.roundRect(labelX - 42, labelY - 17, 84, 31, 7)');
      expect(source).not.toContain("ctx.fillText(activeStimZone.label + ' -> ' + activeStimZone.sub");
    });
  });

  it('routes specialized cards through shared wrapped layouts', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('brainAtlasDrawDecoderChip(x, y, w, H * 0.045, title, sub, color);');
      expect(source).toContain("brainAtlasDrawBoundedNodeLabel(x + w / 2, y + H * 0.024, w, H * 0.048, label, '',");
      expect(source).toContain('brainAtlasDrawBoundedNodeLabel(x, y, w * 0.82, h * 0.72, title, cn,');
      expect(source).toContain("brainAtlasDrawBoundedNodeLabel(x + W * 0.0725, y + H * 0.024, W * 0.135, H * 0.040, title, '',");
      expect(source).not.toContain('ctx.fillText(title, x + w / 2, y + H * 0.017);');
      expect(source).not.toContain('ctx.fillText(label, x + w / 2, y + H * 0.030);');
      expect(source).not.toContain('ctx.fillText(title, x, y - h * 0.18);');
      expect(source).not.toContain('ctx.fillText(title, x + W * 0.0725, y + H * 0.026);');
    });
  });

  it('adapts multi-line teaching cards to their available height', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const teachingCardCalls = source.match(/brainAtlasDrawTeachingCard\(/g) || [];

      expect(source).toContain('function brainAtlasDrawTeachingCard(x, y, w, h, title, body, color, tinted)');
      expect(teachingCardCalls).toHaveLength(5);
      expect(source).toContain("var bodyText = Array.isArray(body) ? body.join(' ') : String(body || '');");
      expect(source).toContain('var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 2);');
      expect(source).toContain('var availableBodyHeight = Math.max(bodyLineHeight, h - titleLines.length * titleLineHeight - 9);');
      expect(source).toContain('var maxBodyLines = Math.max(1, Math.min(5, Math.floor(availableBodyHeight / bodyLineHeight)));');
      expect(source).toContain('var bodyLines = brainAtlasWrapCanvasLabel(bodyText, maxTextWidth, maxBodyLines);');
      expect(source).toContain('var cursorY = cardY + Math.max(2, (h - textHeight) / 2);');
      expect(source).toContain('ctx.fillRect(cardX + 8, cardY + Math.max(8, h * 0.16), 3, Math.max(18, h * 0.68));');
      expect(source).not.toContain('ctx.fillText(lines[li], x + 9, y + 34 + li * 15);');
      expect(source).not.toContain('ctx.fillText(title, x + 8, y + 13);');
      expect(source).not.toContain('ctx.fillText(body, x + 9, y + 34);');
    });
  });

  it('places animated pathway labels in measured contrast-safe pills', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const pathLabelCalls = source.match(/brainAtlasDrawPathLabel\(/g) || [];

      expect(source).toContain('function brainAtlasDrawPathLabel(cx, cy, text, color, maxWidth)');
      expect(pathLabelCalls).toHaveLength(30);
      expect(source).toContain("var value = String(text || '').trim();");
      expect(source).toContain('var widthLimit = Math.max(48, maxWidth || W * 0.18);');
      expect(source).toContain('var safeText = brainAtlasEllipsizeCanvasText(value, widthLimit - 18);');
      expect(source).toContain('var pillW = Math.min(widthLimit, Math.max(34, ctx.measureText(safeText).width + 18));');
      expect(source).toContain('var pillX = Math.max(6, Math.min(W - pillW - 6, cx - pillW / 2));');
      expect(source).toContain('var pillY = Math.max(6, Math.min(H - pillH - 6, cy - pillH / 2));');
      expect(source).toContain("ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fill();");
      expect(source).toContain("ctx.strokeStyle = color + '66'; ctx.lineWidth = 1; ctx.stroke();");
      expect(source).not.toContain('ctx.fillText(label, cx, cy - 5);');
      expect(source).not.toContain('ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - H * 0.012);');
    });
  });

  it('bounds moving sleep labels and wraps EEG channel metadata', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("var sleepHeading = brainAtlasEllipsizeCanvasText('Sleep Hypnogram");
      expect(source).toContain('brainAtlasDrawPathLabel(dotX, dotY - 16, curLabel, curCyc.c');
      expect(source).toContain("brainAtlasDrawCompactCanvasHeading('EEG");
      expect(source).toContain('brainAtlasDrawBoundedNodeLabel(eMarginL * 0.5, yBase, eMarginL - 12');
      expect(source).not.toContain('ctx.roundRect(dotX - clW/2, dotY - 24, clW, 16, 4)');
      expect(source).not.toContain('ctx.fillText(band.name, eMarginL - 10, yBase - 4)');
    });
  });

  it('keeps the EEG time-scale marker above the canvas edge', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var scaleCenterX = eMarginL + eTraceW * 0.85;');
      expect(source).toContain('var scaleW = Math.max(48, Math.min(eTraceW * 0.18, 92));');
      expect(source).toContain('var scaleY = H - 20;');
      expect(source).toContain("brainAtlasDrawPathLabel(scaleCenterX, scaleY - 13, '1 second'");
      expect(source).toContain('ctx.moveTo(scaleCenterX - scaleW / 2, scaleY - 5)');
      expect(source).not.toContain("ctx.fillText('1 second'");
      expect(source).not.toContain('H * 0.965');
    });
  });

  it('reserves measured gutters and pills for action-potential graph labels', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('pw2=gw2*0.58');
      expect(source).toContain('var voltageLabelX=px2+pw2+gw2*0.10,voltageLabelW=gw2*0.17;');
      expect(source).toContain("brainAtlasDrawBoundedNodeLabel(voltageLabelX,py2+ph2*0.70,voltageLabelW,18,'Resting'");
      expect(source).toContain("brainAtlasDrawBoundedNodeLabel(voltageLabelX,py2+ph2*0.58,voltageLabelW,18,'Threshold'");
      expect(source).toContain("brainAtlasDrawPathLabel(px2+0.38*pw2,py2+ph2*0.05,'Depolarization'");
      expect(source).toContain("brainAtlasDrawPathLabel(px2+0.61*pw2,py2+ph2*0.42,'Repolarization'");
      expect(source).toContain("brainAtlasDrawPathLabel(px2+0.75*pw2,py2+ph2*0.90,'Hyperpolarization'");
      expect(source).not.toContain("ctx.fillText('Threshold',px2+pw2+8");
      expect(source).not.toContain("ctx.fillText('Hyperpol.'");
    });
  });

  it('places neuron anatomy terms in measured edge-safe pills', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("brainAtlasDrawPathLabel(W*0.20,H*0.58,'Soma','#6d28d9',W*0.12);");
      expect(source).toContain("brainAtlasDrawPathLabel(W*0.29,H*0.40,'Hillock','#7c3aed',W*0.14);");
      expect(source).toContain("brainAtlasDrawPathLabel(W*0.90,H*0.58,'Terminal','#7c3aed',W*0.13);");
      expect(source).toContain("brainAtlasDrawPathLabel(W*0.50,H*0.34,'Myelin Sheath','#475569',W*0.18);");
      expect(source).toContain("brainAtlasDrawPathLabel(W*0.50,H*0.575,'Nodes of Ranvier','#475569',W*0.20);");
      expect(source).not.toContain("ctx.fillText('Terminal',W*0.90,H*0.58)");
      expect(source).not.toContain("ctx.fillText('Nodes of Ranvier',W*0.50,H*0.61)");
    });
  });
  it('keeps cross-lateralization anatomy labels below the heading and inside the canvas', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("brainAtlasDrawPathLabel(brCx - brRx * 0.52, brCy - brRy * 0.68, 'LEFT'");
      expect(source).toContain("brainAtlasDrawPathLabel(brCx + brRx * 0.52, brCy - brRy * 0.68, 'RIGHT'");
      expect(source).toContain("brainAtlasDrawPathLabel(brCx, brCy, 'Corpus Callosum'");
      expect(source).toContain("brainAtlasDrawPathLabel(medLabelX, medLabelY, 'Medulla Pyramids'");
      expect(source).toContain("brainAtlasDrawPathLabel(brCx - brRx * 0.65, brCy - brRy * 0.50, 'Broca");
      expect(source).toContain("brainAtlasDrawPathLabel(brCx - brRx * 0.25, brCy + brRy * 0.25, 'Wernicke");
      expect(source).toContain("brainAtlasDrawPathLabel(brCx - W * 0.30, H * 0.92, '\\u2190 LEFT BODY'");
      expect(source).toContain("brainAtlasDrawPathLabel(brCx + W * 0.30, H * 0.92, 'RIGHT BODY \\u2192'");
      expect(source).not.toContain("ctx.fillText('LEFT', brCx - brRx * 0.52");
      expect(source).not.toContain("ctx.fillText('Medulla Pyramids', medLabelX");
      expect(source).not.toContain("ctx.fillText('\\u2190 LEFT BODY'");
    });
  });
  it('packs canvas legend items into measured centered rows', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const legendGridCalls = source.match(/brainAtlasDrawLegendGrid\(/g) || [];

      expect(source).toContain('function brainAtlasDrawLegendGrid(x, y, w, items, textColor, maxItemWidth)');
      expect(legendGridCalls).toHaveLength(5);
      expect(source).toContain('var rowHeight = fontPx + 9;');
      expect(source).toContain('var widthLimit = Math.max(56, Math.min(maxItemWidth || w / 2, w));');
      expect(source).toContain("var label = String(item.label || item.name || '');");
      expect(source).toContain('var safeLabel = brainAtlasEllipsizeCanvasText(label, itemLimit - 26);');
      expect(source).toContain('var itemWidth = Math.min(itemLimit, ctx.measureText(safeLabel).width + 26);');
      expect(source).toContain('if (row.items.length && row.width + gap + itemWidth > w)');
      expect(source).toContain('var cursorX = x + Math.max(0, (w - packedRow.width) / 2);');
      expect(source).toContain('var centerY = y + rowIndex * rowHeight + rowHeight / 2;');
      expect(source).toContain('return rows.length * rowHeight;');
      expect(source).not.toContain('var legendY = H * 0.792;');
      expect(source).not.toContain('var legRow1 = legItems.slice(0, 2);');
    });
  });

  it('wraps the lifespan chart header and clamps developmental event tags', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("brainAtlasDrawCompactCanvasHeading('Synapse density across the lifespan'");
      expect(source).toContain('var lifespanLegendY = Math.max(66, Math.min(y0 - 36, H * 0.12));');
      expect(source).toContain("brainAtlasDrawLegendGrid(x0 + 8, lifespanLegendY, pW - 16");
      expect(source).toContain('function tag(x, y, text, color)');
      expect(source).toContain('brainAtlasDrawPathLabel(x, y, text, color, Math.max(72, W * 0.16));');
      expect(source).not.toContain("ctx.fillText('Synapse density across the lifespan', W / 2, 30)");
      expect(source).not.toContain('ctx.roundRect(x - w / 2, y - h / 2, w, h, 6)');
    });
  });

  it('clamps animated lifespan curve callouts at chart boundaries', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function pulsePoint(pt, color, label)');
      expect(source).toContain('brainAtlasDrawPathLabel(pt.x, pt.y - 15, label, color, Math.max(64, W * 0.13));');
      expect(source).not.toContain('ctx.fillText(label, pt.x, pt.y - 13)');
    });
  });
  it('routes custom neuron and lifespan legends through adaptive shared layouts', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var ionLegendItems = [');
      expect(source).toContain("brainAtlasDrawLegendGrid(lgX + 10, lgY + 8, lgW - 20, ionLegendItems, '#475569', lgW - 20);");
      expect(source).toContain("brainAtlasDrawTeachingCard(lgX + 10, lgY + 64, lgW - 20, lgH - 74");
      expect(source).toContain('var lifespanLegendItems = [');
      expect(source).toContain("brainAtlasDrawLegendGrid(x0 + 8, lifespanLegendY, pW - 16, lifespanLegendItems, '#cbd5e1', (pW - 24) / 2);");
      expect(source).not.toContain('function ionRow(color, label, textColor, rowY)');
      expect(source).not.toContain('function legendChip(x, y, color, text)');
      expect(source).not.toContain("ctx.fillText('Once threshold (-55mV) is reached,'");
    });
  });
  it('cleans up the EEG brainwave mini-canvas instead of leaving a detached loop running', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('if (window.__alloBrainwaveCanvasCleanup) window.__alloBrainwaveCanvasCleanup();');
      expect(source).toContain('if (canvas._bwCleanup) canvas._bwCleanup();');
      expect(source).toContain('function cleanupBrainwaveCanvas()');
      expect(source).toContain('function isBrainwaveHidden()');
      expect(source).toContain('function cancelBrainwaveFrame()');
      expect(source).toContain('function scheduleBrainwaveFrame()');
      expect(source).toContain('if (!bwAlive || prefersReducedMotion || canvas._bwAnimFrame || isBrainwaveHidden()) return;');
      expect(source).toContain('canvas._bwAnimFrame = requestAnimationFrame(drawFrame);');
      expect(source).toContain('if (!prefersReducedMotion) tick += 0.8;');
      expect(source).toContain("document.addEventListener('visibilitychange', onBrainwaveVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onBrainwaveVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupBrainwaveCanvas(); return; }');
      expect(source).toContain('scheduleBrainwaveFrame();');
      expect(source).not.toContain('canvas._bwCleanup = function () { cancelAnimationFrame(canvas._bwAnimFrame); canvas._bwAnimFrame = null; };');
    });
  });
});
