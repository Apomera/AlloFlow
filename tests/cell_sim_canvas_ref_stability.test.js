import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const CELL_SIM_PATHS = [
  'stem_lab/stem_tool_cell.js',
  'desktop/web-app/public/stem_lab/stem_tool_cell.js',
];

describe('cell simulator canvas ref stability', () => {
  it('keeps the live petri dish canvas mounted when organism selection refreshes React state', () => {
    CELL_SIM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var canvasRefStateRef = React.useRef({ lastCanvas: null });');
      expect(source).toContain('var canvasRefImplRef = React.useRef(null);');
      expect(source).toContain('var canvasRefStableRef = React.useRef(null);');
      expect(source).toContain('canvasRefImplRef.current = function (canvasEl)');
      expect(source).toContain('var canvasRefCb = canvasRefStableRef.current;');
      expect(source).toContain('if (canvasEl._onSelect) canvasEl._onSelect(clicked ? clicked.def.id : null);');

      expect(source).not.toContain('var canvasRefCb = function (canvasEl)');
      expect(source).not.toContain('canvasRefCb._lastCanvas');
    });
  });

  it('routes canvas interactions through shared state and cleanup paths', () => {
    CELL_SIM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function selectCanvasOrganism(id)');
      expect(source).toContain('if (nextExt.organismsObserved.indexOf(id) === -1) nextExt.organismsObserved.push(id);');
      expect(source).toContain('canvasEl._onSelect = function (id)');
      expect(source).toContain('selectCanvasOrganism(id);');

      expect(source).toContain('canvasEl._onOrganelleClick = function (name)');
      expect(source).toContain('recordCanvasOrganelleClick(name);');
      expect(source).toContain('function findOrganelleLabelHit(mx, my)');
      expect(source).toContain('function showOrganelleLabelTooltip(hitLabel)');
      expect(source).toContain('var hitLabel = findOrganelleLabelHit(mx, my);');
      expect(source).toContain('var playHitLabel = findOrganelleLabelHit(mx, my);');
      expect(source).toContain('if (playHitLabel) showOrganelleLabelTooltip(playHitLabel);');

      expect(source).toContain('canvasEl._onZoom = function (z) { syncCanvasZoomState(z); };');
      expect(source).toContain('canvasEl.addEventListener(\'pointerdown\', onPointerDown);');
      expect(source).toContain('canvasEl.addEventListener(\'pointercancel\', onPointerCancel);');
      expect(source).toContain('canvasEl.removeEventListener(\'pointerdown\', onPointerDown);');
      expect(source).toContain("touchAction: 'none'");

      expect(source).toContain('stopCellAmbient();');
      expect(source).toContain('var cleanupRefStableRef = React.useRef(null);');
      expect(source).not.toContain("canvasEl.addEventListener('mousedown'");
      expect(source).not.toContain("canvasEl.addEventListener('mouseup'");
    });
  });

  it('keeps side controls, filters, zoom, and play keyboard state in sync with the canvas', () => {
    CELL_SIM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var cellObservedKey = ext.organismsObserved.join(\'|\');');
      expect(source).toContain('var cellOrganelleKey = ext.organellesClicked.join(\'|\');');
      expect(source).toContain('[cellObservedKey, ext.totalFood, cellOrganelleKey');
      expect(source).toContain('[cellObservedKey, ext.quizCorrect, ext.playModeUsed, cellOrganelleKey, cellStudyVocabKey]');

      expect(source).toContain('function isMovementKey(key)');
      expect(source).toContain('if (!playAsOrg || !isMovementKey(e.key)) return;');
      expect(source).toContain('e.preventDefault();');
      expect(source).toContain('playerKeys = {};');

      expect(source).toContain('canvasEl._cellSimSelectOrganism = function (orgId, focusCamera)');
      expect(source).toContain('cv._cellSimSelectOrganism(nextSelectedOrg, true);');
      expect(source).toContain('if (target && focusCamera !== false) { cam.x = target.x; cam.y = target.y; cam.zoom = 3; clampCamera(); if (canvasEl._onZoom) canvasEl._onZoom(cam.zoom); }');
      expect(source).toContain('if (selectedOrg && selectedOrg.type === orgId)');
      expect(source).toContain('if (!nextSpawns[org.id] && cel.selectedOrganism === org.id) cel.selectedOrganism = null;');
      expect(source).toContain('if (!nextSpawns[org.id] && cel.playAsOrganism === org.id) cel.playAsOrganism = null;');
      expect(source).toContain('if (cel.playAsOrganism === orgId) cel.playAsOrganism = null;');
      expect(source).toContain('"aria-label": "Show all cell types in petri dish"');
      expect(source).toContain('"aria-label": "Clear all cell types from petri dish"');
      expect(source).toContain('role: "group", "aria-label": "Cell type visibility filters"');
      expect(source).toContain('"aria-pressed": isActive');
      expect(source).toContain('"aria-label": (isActive ? "Hide " : "Show ") + org.label + " in petri dish"');

      expect(source).not.toContain('updExtAndBadge({ organismsObserved');
    });
  });

  it('respects motion preferences and keeps anatomy locate/reset actions on shared canvas APIs', () => {
    CELL_SIM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain("if (typeof cel.paused === 'undefined') cel.paused = true;");
      expect(source).toContain("canvasEl._cellSimPaused = !!d.paused || (prefersReducedCellMotion && typeof d.paused === 'undefined');");
      expect(source).toContain("document.addEventListener('visibilitychange', onVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onVisibilityChange);");
      expect(source).toContain('var initialZoom = Math.max(0.5, Math.min(10, Number(d.zoom) || 1));');
      expect(source).toContain('var cam = { x: 0, y: 0, zoom: initialZoom };');
      expect(source).toContain('var speedMultiplier = Math.max(1, Math.min(5, Math.round(Number(d.simSpeed) || 1)));');
      expect(source).toContain('var initialSelectedOrg = d.selectedOrganism ? world.organisms.find(function (o) { return o.def.id === d.selectedOrganism; }) : null;');
      expect(source).toContain('var initialPlayAsOrg = d.playAsOrganism ? world.organisms.find(function (o) { return o.def.id === d.playAsOrganism; }) : null;');
      expect(source).toContain('if (playAsOrg && canvasEl._onZoom) canvasEl._onZoom(cam.zoom);');

      expect(source).toContain('canvasEl._cellSimResetView = function () { cam.x = 0; cam.y = 0; cam.zoom = 1; clampCamera(); if (canvasEl._onZoom) canvasEl._onZoom(cam.zoom); if (canvasEl._cellSimPaused) renderStaticFrame(); };');
      expect(source).toContain('"aria-label": "Reset microscope view"');
      expect(source).toContain('if (cv && cv._cellSimResetView) cv._cellSimResetView(); else upd("zoom", 1);');

      expect(source).toContain('canvasEl._cellSimShowOrganelleTooltip = function (orgId, organelleName)');
      expect(source).toContain('if (canvasEl._onOrganelleClick) canvasEl._onOrganelleClick(a.name);');
      expect(source).not.toContain('updExtAndBadge({ organellesClicked');

      expect(source).toContain('"aria-label": "Interactive cell biology simulation. Click or tap organisms, or use the organism buttons below, to inspect behavior and anatomy."');
    });
  });

  it('bounds the camera, idles paused animation, spaces anatomy labels, and exposes current view status', () => {
    CELL_SIM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function clampCamera()');
      expect(source).toContain('function canvasNow()');
      expect(source).toContain('cam.x = Math.max(-marginX, Math.min(WORLD_W + marginX, Number(cam.x) || 0));');
      expect(source).toContain('cam.y = Math.max(-marginY, Math.min(WORLD_H + marginY, Number(cam.y) || 0));');
      expect(source).toContain('clampCamera();');

      expect(source).toContain('function cancelScheduledLoop()');
      expect(source).toContain('var pausedOverlayAnimId = null;');
      expect(source).toContain('function schedulePausedOverlayFrame()');
      expect(source).toContain('function renderStaticFrame()');
      expect(source).toContain('function scheduleLoop()');
      expect(source).toContain('if (!world._tooltip && !world._highlightOrganelle) return;');
      expect(source).toContain('if (rendered && canvasEl._cellSimPaused) schedulePausedOverlayFrame();');
      expect(source).toContain('if (canvasEl._cellSimPaused) renderStaticFrame(); else scheduleLoop();');
      expect(source).toContain('var hoverChanged = hoveredOrg !== foundHover;');
      expect(source).toContain('if (hoverChanged && canvasEl._cellSimPaused) renderStaticFrame();');
      expect(source).toContain('canvasEl._cellSimSetPaused = function (p)');
      expect(source).not.toContain('if (canvasEl._cellSimPaused) { animId = requestAnimationFrame(loop); return; }');

      expect(source).toContain('var renderNow = canvasNow();');
      expect(source).toContain('var renderMotion = !canvasEl._cellSimPaused;');
      expect(source).toContain('if (renderMotion) { db.x += db.dx; db.y += db.dy; }');
      expect(source).toContain('if (renderMotion) {');
      expect(source).toContain('v.trail.push({ x: v.x, y: v.y });');
      expect(source).toContain('var ttAgeMs = tt.startTime ? renderNow - tt.startTime : (world.tick - tt.startTick) * (1000 / 60);');
      expect(source).toContain('if (ttAgeMs > 5000) world._tooltip = null;');
      expect(source).toContain('var hlAgeMs = hl.startTime ? renderNow - hl.startTime : (world.tick - hl.startTick) * (1000 / 60);');
      expect(source).toContain('if (hlAgeMs > 1000)');
      expect(source).toContain('startTime: canvasNow()');

      expect(source).toContain('var labelBoxes = [];');
      expect(source).toContain("var labelFillColor = 'rgba(248,250,252,0.97)';");
      expect(source).toContain("var labelTextColor = '#0f172a';");
      expect(source).toContain("var labelShadowColor = 'rgba(2,6,23,0.38)';");
      expect(source).toContain('var overlaps = !(pillX > b.x + b.w + gapX || pillX + pillW + gapX < b.x || pillY > b.y + b.h + gapY || pillY + pillH + gapY < b.y);');
      expect(source).toContain('labelBoxes.push({ x: pillX, y: pillY, w: pillW, h: pillH });');
      expect(source).toContain('cctx.shadowColor = labelShadowColor;');
      expect(source).toContain('cctx.fillStyle = labelFillColor;');
      expect(source).toContain('cctx.fillStyle = labelTextColor;');
      expect(source).not.toContain("cctx.fillStyle = 'var(--allo-stem-deeper, rgba(15,23,42,0.85))';");

      expect(source).toContain('var cellCanvasStatus =');
      expect(source).toContain('var cellRenderPrefersReducedMotion = false;');
      expect(source).toContain("var effectiveCellPaused = !!d.paused || (cellRenderPrefersReducedMotion && typeof d.paused === 'undefined');");
      expect(source).toContain("effectiveCellPaused ? 'Simulation paused.' : 'Simulation running.'");
      expect(source).toContain('effectiveCellPaused ? "Paused" : "Running"');
      expect(source).toContain('"aria-label": effectiveCellPaused ? "Play simulation" : "Pause simulation"');
      expect(source).toContain('var p = !effectiveCellPaused;');
      expect(source).not.toContain('var p = !d.paused;');
      expect(source).toContain('id: "cell-sim-status", role: "status", "aria-live": "polite"');
      expect(source).toContain('className: typeof srOnly === \'string\' ? srOnly : "sr-only"');
      expect(source).toContain('style: srOnly && typeof srOnly === \'object\' ? srOnly : undefined');
      expect(source).not.toContain('className: srOnly || "sr-only"');
      expect(source).toContain('"aria-describedby": "cell-sim-status"');
    });
  });

  it('keeps the inside-the-cell canvas from stacking animation loops across rerenders', () => {
    CELL_SIM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('key: \'cell-interior-canvas\', "data-cell-interior-canvas": true');
      expect(source).not.toContain("key: 'interior-' + ctype + '-' + (sel || 'none')");
      expect(source).toContain('function pick(key) {');
      expect(source).toContain('cel.interiorSel = key;');
      expect(source).toContain('var nextSeen = (cel.interiorSeen || []).slice();');
      expect(source).toContain('if (nextSeen.indexOf(key) < 0) nextSeen.push(key);');
      expect(source).toContain('cel.interiorSeen = nextSeen;');
      expect(source).toContain('cel.interiorCellType = c.id; cel.interiorSel = null; return cel;');
      expect(source).not.toContain("function pick(key) { upd('interiorSel', key);");
      expect(source).toContain('if (!cv) { try { if (window.__alloCellInteriorCleanup) window.__alloCellInteriorCleanup(); } catch (e) {} return; }');
      expect(source).toContain('if (cv._cellInteriorCleanup) cv._cellInteriorCleanup();');
      expect(source).toContain('var tt = { v: Number(cv._cellInteriorPhase) || 0 };');
      expect(source).toContain('function cancelInteriorFrame()');
      expect(source).toContain('function scheduleInteriorFrame()');
      expect(source).toContain("if (typeof document !== 'undefined' && document.hidden) return;");
      expect(source).toContain('cv._cellInteriorPhase = tt.v;');
      expect(source).toContain('document.addEventListener(\'visibilitychange\', onInteriorVisibilityChange);');
      expect(source).toContain('document.removeEventListener(\'visibilitychange\', onInteriorVisibilityChange);');
      expect(source).toContain('cv._cellInteriorCleanup = function ()');
      expect(source).not.toContain('if (!reducedMo) requestAnimationFrame(frame);');
    });
  });
});
