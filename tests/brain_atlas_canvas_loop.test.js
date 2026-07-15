import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const BRAIN_ATLAS_PATHS = [
  'stem_lab/stem_tool_brainatlas.js',
  'prismflow-deploy/public/stem_lab/stem_tool_brainatlas.js',
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
      expect(headingCalls).toHaveLength(10);
      expect(source).toContain('var panelX = 24, panelY = 14, panelW = Math.max(120, W - 48);');
      expect(source).toContain('var panelH = Math.max(76, Math.min(96, H * 0.13));');
      expect(source).toContain('var maxTextWidth = Math.max(80, panelW - 52);');
      expect(source).toContain('var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 2);');
      expect(source).toContain('var subtitleLines = subtitle ? brainAtlasWrapCanvasLabel(subtitle, maxTextWidth, 2) : [];');
      expect(source).toContain('titleLines.forEach(function (line)');
      expect(source).not.toContain("ctx.fillText('Visual pathway and field cuts', W * 0.5, H * 0.055);");
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

      expect(source).toContain('function brainAtlasDrawDecoderChip(x, y, w, h, title, body, color)');
      expect(chipCalls).toHaveLength(5);
      expect(source).toContain('var chipX = Math.max(8, Math.min(W - w - 8, x));');
      expect(source).toContain('var chipY = Math.max(8, Math.min(H - h - 8, y));');
      expect(source).toContain('var maxTextWidth = Math.max(44, w - 18);');
      expect(source).toContain('var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 1);');
      expect(source).toContain('var bodyLines = brainAtlasWrapCanvasLabel(body, maxTextWidth, 2);');
      expect(source).toContain('var textHeight = titleLines.length * titleLineHeight + bodyLines.length * bodyLineHeight + 3;');
      expect(source).toContain('var cursorY = chipY + Math.max(1, (h - textHeight) / 2);');
      expect(source).toContain('ctx.fillRect(chipX + 9, chipY + 5, Math.max(18, w - 18), 2);');
      expect(source).not.toContain('ctx.fillText(sub, x + w / 2, y + H * 0.031);');
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
