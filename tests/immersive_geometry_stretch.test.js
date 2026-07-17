import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'immersive_geometry/immersive_geometry.html'), 'utf8');

describe('Immersive Geometry stretch mechanics', () => {
  it('supports bounded undo history across geometry changes', () => {
    expect(source).toContain('this.axis = saved ? saved.axis : 0; this.history = []');
    expect(source).toContain('if (this.history.length > 50) this.history.shift()');
    expect(source).toContain("case 'u': case 'U': doUndo()");
    expect(source).toContain('id="vrUndo"');
  });

  it('lets desktop and VR learners select and resize any active axis', () => {
    expect(source).toContain('cycleAxis: function (sign)');
    expect(source).toContain("var key = ['L', 'W', 'H'][this.axis]");
    expect(source).toContain('id="uiAxis"');
    expect(source).toContain('id="vrAxis"');
    expect(source).toContain('Math.abs(x) >= 0.7');
  });

  it('communicates active-axis, boundary, and motion state accessibly', () => {
    expect(source).toContain('id="axisline"');
    expect(source).toContain("info.axisLabel = this.d ? ['Length X', 'Width Z', 'Height Y'][this.axis]");
    expect(source).toContain("(sign > 0 ? 'Maximum' : 'Minimum')");
    expect(source).toContain('uiUndo.disabled = !s.canUndo');
    expect(source).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
  });

  it('shows formulas calculated from unrounded dimensions', () => {
    expect(source).toContain("measure: 'A = L × W = '");
    expect(source).toContain("measure: 'V = L × W × H = '");
    expect(source).toContain('r1(L * W * H)');
    expect(source).toContain('Math.round(n * 100) / 100');
  });
  it('treats continuous slider resizing as one quiet undoable action', () => {
    expect(source).toContain('id="uiAxisValue"');
    expect(source).toContain('beginResize: function ()');
    expect(source).toContain('this.emitState(null, true)');
    expect(source).toContain('this.rememberSnapshot(before)');
    expect(source).toContain("uiAxisValue.addEventListener('change'");
    expect(source).toContain('if (!s.silent) live.textContent = s.say');
  });

  it('renders illuminated guides for every active spatial axis', () => {
    expect(source).toContain("this.guides = ['#38bdf8', '#4ade80', '#f472b6'].map");
    expect(source).toContain("guide.setAttribute('visible', i < this.d)");
    expect(source).toContain("i === this.axis ? '#facc15'");
    expect(source).toContain('g[0].object3D.scale.set(this.cx');
    expect(source).toContain('g[2].object3D.scale.set(0.035, this.cy');
  });
  it('exposes direct labeled axis handles to mouse and VR rays', () => {
    expect(source).toContain("this.handles = ['X', 'Z', 'Y'].map");
    expect(source).toContain("handle.setAttribute('class', 'clickable axis-handle')");
    expect(source).toContain("handle.addEventListener('click'");
    expect(source).toContain("handle.setAttribute('visible', i < this.d)");
    expect(source).toContain('i === this.axis ? 1.3 : 0.85');
  });

  it('maps common headset buttons and offers optional haptic confirmation', () => {
    expect(source).toContain("hand.addEventListener('abuttondown', doStretch)");
    expect(source).toContain("hand.addEventListener('xbuttondown', doStretch)");
    expect(source).toContain("hand.addEventListener('bbuttondown', doCollapse)");
    expect(source).toContain("hand.addEventListener('gripdown'");
    expect(source).toContain('gamepad.hapticActuators');
    expect(source).toContain("actuator.playEffect('dual-rumble'");
  });
  it('provides attainable guided stretch missions in desktop and VR', () => {
    expect(source).toContain('var MISSIONS = [');
    expect(source).toContain("{ d: 1, name: 'segment'");
    expect(source).toContain("{ d: 3, name: 'cube'");
    expect(source).toContain('id="missionBox"');
    expect(source).toContain('id="uiMission"');
    expect(source).toContain('id="vrMission"');
    expect(source).toContain('Math.abs(s.dimensions[key] - mission[key]) <= 0.03');
    expect(source).toContain("if (c) c.emitState('Selected stretch mission. '");
  });

  it('keeps immersive control IDs unique', () => {
    const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
  });
  it('keeps every mission reachable with quarter-unit controls', () => {
    const literal = source.match(/var MISSIONS = (\[[\s\S]*?\]);/);
    expect(literal).not.toBeNull();
    const missions = Function(`return ${literal[1]}`)();
    const starts = { L: 1.6, W: 1.1, H: 1.1 };
    missions.forEach((mission) => {
      ['L', 'W', 'H'].slice(0, mission.d).forEach((axis) => {
        const steps = (mission[axis] - starts[axis]) / 0.25;
        expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-8);
      });
    });
  });

  it('uses selected scene handles as direct stretch controls', () => {
    expect(source).toContain("this.grow(shrink ? -1 : 1)");
    expect(source).toContain('event.detail.mouseEvent || event.detail.originalEvent');
    expect(source).toContain("handle.addEventListener('mouseenter'");
    expect(source).toContain('Trigger grows handle.');
    expect(source).toContain('<kbd>Shift</kbd>+click to shrink');
  });
  it('groups rapid resize input into one undo transaction', () => {
    expect(source).toContain('beginNudge: function ()');
    expect(source).toContain('endNudge: function (silent)');
    expect(source).toContain('if (!this.nudgeStart) this.nudgeStart = this.capture()');
    expect(source).toContain('this.emitState(null, true)');
    expect(source).toContain('this.endNudge(false); }.bind(this), 360');
    expect(source).toContain('remember: function () { this.endNudge(true)');
    expect(source).toContain('remove: function () { if (this.nudgeTimer) clearTimeout(this.nudgeTimer); }');
  });
  it('renders an origin-anchored spatial target outline', () => {
    expect(source).toContain('this.targetGhost = document.createElement');
    expect(source).toContain('setTarget: function (mission, complete, visible)');
    expect(source).toContain("z = mission.d >= 2 ? mission.W : THIN");
    expect(source).toContain("y = mission.d >= 3 ? mission.H : THIN");
    expect(source).toContain('this.targetGhost.object3D.position.set(x / 2, y / 2, z / 2)');
    expect(source).toContain("complete ? '#4ade80' : '#facc15'");
    expect(source).toContain('wireframe: true');
  });

  it('lets desktop and VR learners independently hide the target outline', () => {
    expect(source).toContain('id="uiGhost"');
    expect(source).toContain('toggleTargetOutline(value, announce)');
    expect(source).toContain("uiGhost.addEventListener('change'");
    expect(source).toContain("hand.addEventListener('thumbstickdown'");
    expect(source).toContain("'Target outline ' + (showTarget ? 'shown.' : 'hidden.')");
  });
  it('provides actionable next-step mission guidance', () => {
    expect(source).toContain('id="missionHint"');
    expect(source).toContain("hintText = 'Next: stretch to '");
    expect(source).toContain("hintText = 'Next: collapse to '");
    expect(source).toContain("(delta > 0 ? 'grow ' : 'shrink ')");
    expect(source).toContain("r1(Math.abs(delta)) + ' units.'");
    expect(source).toContain("hintText = 'Target reached — choose a new mission when ready.'");
  });

  it('echoes the next mission axis on spatial labels', () => {
    expect(source).toContain('this.handleTags = []');
    expect(source).toContain('this.handleTags[i] = tag');
    expect(source).toContain('setMissionHint: function (axisIndex, direction, complete, mission, dimensions)');
    expect(source).toContain("complete ? 'TARGET\\nDONE'");
    expect(source).toContain("(direction > 0 ? 'GROW ' : 'SHRINK ')");
    expect(source).toContain('c.setMissionHint(hintAxis, hintDirection, done, mission, s.dimensions)');
  });
  it('shows current and target measurements on spatial handles', () => {
    expect(source).toContain("var current = dimensions && isFinite(dimensions[keys[i]])");
    expect(source).toContain("value = axisNames[i] + (current !== '' ? ' ' + current : '')");
    expect(source).toContain("value += ' → ' + r1(mission[keys[i]])");
    expect(source).toContain('setMissionHint(hintAxis, hintDirection, done, mission, s.dimensions)');
  });

  it('keeps the floating formula panel above current and target solids', () => {
    expect(source).toContain('function positionMeasurePanel(s, mission)');
    expect(source).toContain('var currentHeight = s.d >= 3 ? s.dimensions.H : THIN');
    expect(source).toContain('var targetHeight = showTarget && mission && mission.d >= 3 ? mission.H : THIN');
    expect(source).toContain('var clearance = showBoundary && s.boundary ? 0.68 : 0.42');
    expect(source).toContain('var defaultY = Math.max(2.5, 1.1 + Math.max(currentHeight, targetHeight) + clearance)');
    expect(source).toContain('positionMeasurePanel(lastMissionState, MISSIONS[missionIndex])');
  });
  it('restores only validated local session state', () => {
    expect(source).toContain("var STORAGE_KEY = 'alloflow_stretch_lab_v1'");
    expect(source).toContain('saved.v !== 1');
    expect(source).toContain('saved.d < 0 || saved.d > 3');
    expect(source).toContain('value >= MINV && value <= MAXV');
    expect(source).toContain('Math.min(saved.missionIndex, MISSIONS.length - 1)');
    expect(source).toContain('showTarget: saved.showTarget !== false');
    expect(source).toContain('catch (ignore) { return null; }');
  });

  it('persists committed state without carrying undo history across sessions', () => {
    expect(source).toContain('function saveLabState(s)');
    expect(source).toContain('if (!s || s.silent) return');
    expect(source).toContain('axis: s.axis, missionIndex: missionIndex, showTarget: showTarget');
    expect(source).toContain('saveLabState(lastMissionState)');
    const writer = source.match(/function saveLabState\(s\) \{[\s\S]*?\n  \}/);
    expect(writer).not.toBeNull();
    expect(writer[0]).not.toContain('history');
  });
  it('offers a confirmed fresh start distinct from reset', () => {
    expect(source).toContain('id="uiFresh"');
    expect(source).toContain('function startOver()');
    expect(source).toContain("window.confirm('Start over? This clears the saved geometry, mission, preferences, and undo history.')");
    expect(source).toContain("case 'r': case 'R': if (e.shiftKey) startOver(); else doReset()");
    expect(source).toContain('<kbd>Shift</kbd>+<kbd>R</kbd> start over');
  });

  it('clears persisted and in-memory session state without creating an undo entry', () => {
    expect(source).toContain('freshStart: function ()');
    expect(source).toContain('this.nudgeTimer = null; this.nudgeStart = null; this.resizeStart = null; this.history = []');
    expect(source).toContain('missionIndex = 0; missionComplete = false; showTarget = true; showBoundary = false; completedMask = 0; SAVED_STATE = null');
    expect(source).toContain('localStorage.removeItem(STORAGE_KEY)');
    expect(source).toContain('if (suppressNextSave) { suppressNextSave = false; return; }');
    expect(source).toContain("this.apply(false, 'Started over with a fresh point and first mission.')");
  });
  it('commits active resize gestures before page suspension', () => {
    expect(source).toContain('function commitPendingGesture()');
    expect(source).toContain('if (c.nudgeStart) c.endNudge(false)');
    expect(source).toContain('if (c.resizeStart) c.endResize()');
    expect(source).toContain("window.addEventListener('pagehide', commitPendingGesture)");
    expect(source).toContain("document.addEventListener('visibilitychange'");
    expect(source).toContain("document.visibilityState === 'hidden'");
  });

  it('communicates local save and restoration status without blocking use', () => {
    expect(source).toContain('id="sessionNote"');
    expect(source).toContain("saved ? 'Restored your saved stretch session.' : null");
    expect(source).toContain("sessionNote.textContent = 'Progress saved on this device.'");
    expect(source).toContain("sessionNote.textContent = 'Saving unavailable; this session still works.'");
    expect(source).toContain("sessionNote.textContent = 'Fresh start. New changes will save on this device.'");
  });
  it('calculates optional perimeter and surface area from raw dimensions', () => {
    expect(source).toContain("'P = 2 × (L + W) = 2 × ('");
    expect(source).toContain('r1(2 * (this.L + this.W))');
    expect(source).toContain("'SA = 2 × (LW + LH + WH) = '");
    expect(source).toContain('r1(2 * (this.L * this.W + this.L * this.H + this.W * this.H))');
    expect(source).toContain("this.d === 3 ? 'SA =");
  });

  it('exposes boundary measures through desktop, keyboard, and VR controls', () => {
    expect(source).toContain('id="uiBoundary"');
    expect(source).toContain('id="vrMeasure"');
    expect(source).toContain("case 'm': case 'M': toggleBoundaryMeasures(!showBoundary, true)");
    expect(source).toContain("uiBoundary.addEventListener('change'");
    expect(source).toContain("wireSpatialButton(vrMeasure, function ()");
    expect(source).toContain("'Boundary measures ' + (showBoundary ? 'shown.' : 'hidden.')");
  });

  it('persists boundary preferences and expands spatial labels only when needed', () => {
    expect(source).toContain('showBoundary: saved.showBoundary === true');
    expect(source).toContain('showBoundary: showBoundary');
    expect(source).toContain("labelBack.setAttribute('height', showExtra ? '1.12' : '0.78')");
    expect(source).toContain('var clearance = showBoundary && s.boundary ? 0.68 : 0.42');
    expect(source).toContain('showBoundary = false; completedMask = 0; SAVED_STATE = null');
  });
  it('tracks current and completed guided missions accessibly', () => {
    expect(source).toContain('id="missionSteps" role="list" aria-label="Mission progress"');
    expect(source).toContain('<span role="listitem"><button id="missionStep0" type="button">');
    expect(source).toContain("step.className = (done ? 'done ' : '') + (current ? 'current' : '')");
    expect(source).toContain("step.textContent = (done ? '✓ ' : '') + names[i]");
    expect(source).toContain("step.setAttribute('aria-current', 'step')");
  });

  it('bounds and persists the mission completion map', () => {
    expect(source).toContain('Math.max(0, Math.min(saved.completedMask, 15))');
    expect(source).toContain('completedMask: completedMask');
    expect(source).toContain('completedMask |= (1 << missionIndex)');
    expect(source).toContain('completedMask = 0; SAVED_STATE = null');
    expect(source).toContain('for (var i = 0; i < MISSIONS.length; i++) if (completedMask & (1 << i)) count++');
  });

  it('announces new overall progress without replaying restored completion feedback', () => {
    expect(source).toContain('var firstRestoredRender = lastMissionState === null && !!SAVED_STATE');
    expect(source).toContain('var newlyCompleted = !(completedMask & (1 << missionIndex))');
    expect(source).toContain("completedCount() + ' of ' + MISSIONS.length + ' missions complete.'");
    expect(source).toContain("'Mission target matched again. ' + mission.goal");
    expect(source).toContain('if (!firstRestoredRender)');
  });
  it('makes mission progress badges directly navigable', () => {
    expect(source).toContain('.missionsteps button:focus-visible');
    expect(source).toContain('function selectMission(index)');
    expect(source).toContain("step.addEventListener('click', function () { selectMission(index); })");
    expect(source).toContain("step.setAttribute('aria-label', names[i] + ' mission'");
    expect(source).toContain("case '1': case '2': case '3': case '4': selectMission(Number(e.key) - 1)");
    expect(source).toContain('<kbd>1</kbd>–<kbd>4</kbd> missions');
  });

  it('changes targets without resetting geometry or replaying the current mission', () => {
    expect(source).toContain("if (index === missionIndex) { live.textContent = 'Already viewing the '");
    expect(source).toContain('missionIndex = index; missionComplete = false');
    expect(source).toContain("if (c) c.emitState('Selected stretch mission. '");
    const selector = source.match(/function selectMission\(index\) \{[\s\S]*?\n  \}/);
    expect(selector).not.toBeNull();
    expect(selector[0]).not.toContain('this.L =');
    expect(selector[0]).not.toContain('history = []');
  });
  it('turns the next-step hint into an accessible focus guide', () => {
    expect(source).toContain('<button class="missionhint" id="missionHint" type="button">');
    expect(source).toContain("action = { kind: 'stretch' }");
    expect(source).toContain("action = { kind: 'collapse' }");
    expect(source).toContain("action = { kind: 'resize', axis: hi, direction: hintDirection }");
    expect(source).toContain("missionHint.setAttribute('aria-label', hintText + ' Activate to focus the recommended control.')");
    expect(source).toContain("missionHint.addEventListener('click', focusMissionStep)");
    expect(source).toContain("case 'f': case 'F': focusMissionStep(); break");
    expect(source).toContain('<kbd>F</kbd> focus next step');
  });

  it('focuses the recommended control without resizing for the learner', () => {
    expect(source).toContain('function focusMissionStep()');
    expect(source).toContain("c.selectAxis(action.axis, 'Selected ' + axisName + ' for the mission.')");
    expect(source).toContain('control = action.direction > 0 ? uiGrow : uiShrink');
    expect(source).toContain('if (control && control.focus) control.focus()');
    expect(source).toContain('selectAxis: function (index, message)');
    const selector = source.match(/selectAxis: function \(index, message\) \{[\s\S]*?\n  \},/);
    expect(selector).not.toBeNull();
    expect(selector[0]).not.toContain('remember(');
    expect(selector[0]).not.toContain('history.push');
  });
  it('shows the selected-axis mission target beside the direct slider', () => {
    expect(source).toContain('id="axisTargetOut"');
    expect(source).toContain('list="axisTargetTicks"');
    expect(source).toContain('id="axisTargetTick"');
    expect(source).toContain("var missionTarget = s.d > 0 && activeMission && s.axis < activeMission.d");
    expect(source).toContain("'; mission target ' + r1(missionTarget) + ' units'");
    expect(source).toContain("targetMatched ? 'Target matched: ' : 'Mission target: '");
    expect(source).toContain("axisTargetOut.className = 'axistarget' + (targetMatched ? ' matched' : '')");
  });

  it('updates and safely clears the native slider target tick', () => {
    expect(source).toContain("axisTargetTick.value = missionTarget");
    expect(source).toContain("axisTargetTick.label = 'Mission target ' + r1(missionTarget)");
    expect(source).toContain("axisTargetTick.removeAttribute('value')");
    expect(source).toContain('axisTargetTick.disabled = true');
    expect(source).toContain("uiAxisValue.setAttribute('aria-valuetext'");
  });
  it('prioritizes unfinished missions while preserving sequential review', () => {
    expect(source).toContain('function nextUnfinishedMission()');
    expect(source).toContain('for (var step = 1; step < MISSIONS.length; step++)');
    expect(source).toContain("if (!(completedMask & (1 << candidate))) return candidate");
    expect(source).toContain('var unfinished = nextUnfinishedMission()');
    expect(source).toContain('selectMission(unfinished >= 0 ? unfinished : (missionIndex + 1) % MISSIONS.length)');
  });

  it('shows completion count and switches the mission control into review mode', () => {
    expect(source).toContain("missionTitle.textContent = 'Stretch mission · ' + count + '/' + MISSIONS.length + ' complete'");
    expect(source).toContain("allComplete ? 'Review next' : count > 0 ? 'Next unfinished' : 'Next mission'");
    expect(source).toContain("uiMission.setAttribute('aria-label', nextLabel + ' stretch mission')");
    expect(source).toContain("' All stretch missions complete. Choose any mission to review.'");
  });
  it('coordinates pending edits and accessibility state across immersive transitions', () => {
    expect(source).toContain('function setImmersiveMode(active)');
    expect(source).toContain('commitPendingGesture();');
    expect(source).toContain("hud.setAttribute('aria-hidden', 'true')");
    expect(source).toContain("hud.removeAttribute('aria-hidden')");
    expect(source).toContain("scene.addEventListener('enter-vr', function () { setImmersiveMode(true); })");
    expect(source).toContain("scene.addEventListener('exit-vr', function () { setImmersiveMode(false); })");
    expect(source).toContain('Immersive mode entered. Trigger grows the active handle.');
    expect(source).toContain('Immersive mode exited. Desktop controls restored.');
  });

  it('restores a usable desktop focus target after leaving immersive mode', () => {
    expect(source).toContain('if (hud.contains(document.activeElement)) lastHudFocus = document.activeElement');
    expect(source).toContain('if (document.activeElement && document.activeElement.blur) document.activeElement.blur()');
    expect(source).toContain('var restore = lastHudFocus && !lastHudFocus.disabled ? lastHudFocus : missionHint');
    expect(source).toContain('if (restore && restore.focus) restore.focus()');
  });
  it('keeps spatial controls visually and semantically in sync with geometry state', () => {
    expect(source).toContain('function setSpatialButtonEnabled(button, enabled, activeColor)');
    expect(source).toContain("button.setAttribute('data-disabled', enabled ? 'false' : 'true')");
    expect(source).toContain("button.setAttribute('aria-disabled', enabled ? 'false' : 'true')");
    expect(source).toContain("setSpatialButtonEnabled(vrStretch, s.d < 3, '#665cf5')");
    expect(source).toContain("setSpatialButtonEnabled(vrCollapse, s.d > 0, '#4a6094')");
    expect(source).toContain("setSpatialButtonEnabled(vrAxis, s.d > 0, '#315f78')");
    expect(source).toContain("setSpatialButtonEnabled(vrUndo, s.canUndo, '#4a6094')");
  });

  it('adds consistent hover and unavailable-action feedback to spatial controls', () => {
    expect(source).toContain('function wireSpatialButton(button, action, unavailableMessage)');
    expect(source).toContain("button.getAttribute('data-disabled') === 'true'");
    expect(source).toContain('pulseControllers(0.18, 28)');
    expect(source).toContain("button.addEventListener('mouseenter'");
    expect(source).toContain('button.object3D.scale.setScalar(1.06)');
    expect(source).toContain("button.addEventListener('mouseleave'");
    expect(source).toContain('wireSpatialButton(vrMission, nextMission');
    expect(source).toContain('wireSpatialButton(vrMeasure, function ()');
  });
  it('snaps directional nudges that would cross the active mission target', () => {
    expect(source).toContain('this.activeMission = mission');
    expect(source).toContain('var current = this[key], rawNext = current + sign * STEP');
    expect(source).toContain('this.activeMission && this.axis < this.activeMission.d');
    expect(source).toContain('sign > 0 && current < target && rawNext > target');
    expect(source).toContain('sign < 0 && current > target && rawNext < target');
    expect(source).toContain('crossesTarget ? target : rawNext');
  });

  it('keeps target snapping bounded and discoverable across resize controls', () => {
    expect(source).toContain('Math.max(MINV, Math.min(MAXV, crossesTarget ? target : rawNext))');
    expect(source).toContain('target crossings snap exactly');
    expect(source).toContain('this.grow(shrink ? -1 : 1)');
    expect(source).toContain('var c = comp(); if (c) c.grow(y < 0 ? 1 : -1)');
  });
  it('marks every matched spatial axis independently', () => {
    expect(source).toContain("var matched = !!(mission && i < mission.d");
    expect(source).toContain("if (matched) value += '\\nMATCHED'");
    expect(source).toContain("tag.setAttribute('color', matched ? '#4ade80'");
    expect(source).toContain("var handleColor = matched ? '#4ade80'");
    expect(source).toContain("emissive: ' + handleColor");
    expect(source).toContain("matched ? '0.75'");
  });

  it('announces and haptically confirms target-crossing snaps', () => {
    expect(source).toContain("this.el.emit('targetsnap', { axis: this.axis, target: target }, false)");
    expect(source).toContain("figure.addEventListener('targetsnap'");
    expect(source).toContain("' snapped to mission target ' + r1(detail.target) + ' units.'");
    expect(source).toContain('pulseControllers(0.5, 55)');
  });
  it('provides bounded redo without mixing it into persistence', () => {
    expect(source).toContain('this.history = []; this.future = []');
    expect(source).toContain('redo: function ()');
    expect(source).toContain("if (!this.future.length) { this.emitState('Nothing to redo yet.')");
    expect(source).toContain('this.future.push(current); if (this.future.length > 50) this.future.shift()');
    expect(source).toContain('this.history.push(current); if (this.history.length > 50) this.history.shift()');
    expect(source).toContain("this.apply(false, 'Redid the last geometry change.')");
    expect(source).toContain('info.canRedo = this.future.length > 0');
  });

  it('clears the redo branch after any fresh geometry edit', () => {
    expect(source).toContain('remember: function () { this.endNudge(true); this.future = []');
    expect(source).toContain('rememberSnapshot: function (snapshot) { this.future = []');
    expect(source).toContain('this.resizeStart = null; this.history = []; this.future = []');
    const writer = source.match(/function saveLabState\(s\) \{[\s\S]*?\n  \}/);
    expect(writer).not.toBeNull();
    expect(writer[0]).not.toContain('future');
  });

  it('exposes redo across desktop, spatial, and standard keyboard controls', () => {
    expect(source).toContain('id="uiRedo"');
    expect(source).toContain('id="vrRedo"');
    expect(source).toContain('if (uiRedo) uiRedo.disabled = !s.canRedo');
    expect(source).toContain("setSpatialButtonEnabled(vrRedo, s.canRedo, '#4a6094')");
    expect(source).toContain("wireSpatialButton(vrRedo, doRedo, 'Nothing to redo yet.')");
    expect(source).toContain("case 'y': case 'Y': doRedo()");
    expect(source).toContain("if (shortcut === 'z') { if (e.shiftKey) doRedo(); else doUndo()");
    expect(source).toContain("if (shortcut === 'y') { doRedo()");
    expect(source).toContain('<kbd>Y</kbd> redo');
  });
  it('recenters the spatial panel from the viewer world pose', () => {
    expect(source).toContain('function recenterSpatialPanel(announce)');
    expect(source).toContain("cameraEl.getObject3D('camera') || cameraEl.object3D");
    expect(source).toContain('cameraObject.getWorldPosition(eye); cameraObject.getWorldDirection(view)');
    expect(source).toContain('view.y = 0');
    expect(source).toContain('if (view.lengthSq() < 0.0001) view.set(0, 0, -1); else view.normalize()');
    expect(source).toContain('eye.x + view.x * 1.35');
    expect(source).toContain('Math.max(0.75, eye.y - 0.65)');
    expect(source).toContain('Math.atan2(-view.x, -view.z)');
  });

  it('offers automatic, keyboard, and controller panel recentering', () => {
    expect(source).toContain("case 'c': case 'C': recenterSpatialPanel(true)");
    expect(source).toContain("hand.addEventListener('menudown', function () { recenterSpatialPanel(true); })");
    expect(source).toContain('recenterSpatialPanel(false)');
    expect(source).toContain('Spatial workspace centered in front of you.');
    expect(source).toContain('<kbd>C</kbd> center workspace');
    expect(source).toContain('Menu centers workspace.');
  });
  it('keeps geometry and measures aligned with the recentered workspace', () => {
    expect(source).toContain('var workspacePose = { x: 0, z: -2.4, baseY: 1.1, yaw: 0 }');
    expect(source).toContain('workspacePose.x = eye.x + view.x * 2.4');
    expect(source).toContain('workspacePose.baseY = Math.max(0.35, eye.y - 0.5)');
    expect(source).toContain('figure.object3D.position.set(workspacePose.x, workspacePose.baseY, workspacePose.z)');
    expect(source).toContain('figure.object3D.rotation.set(0, yaw, 0)');
    expect(source).toContain('var y = workspacePose.baseY + defaultY - 1.1');
    expect(source).toContain('labelWrap.object3D.position.set(workspacePose.x, y, workspacePose.z)');
    expect(source).toContain('labelWrap.object3D.rotation.set(0, workspacePose.yaw, 0)');
    expect(source).toContain('positionMeasurePanel(lastMissionState, MISSIONS[missionIndex])');
  });
});
