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

  it('tracks reduced-motion preference changes without leaking listeners', () => {
    expect(source).toContain("this.motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;");
    expect(source).toContain('this.motionPreferenceHandler = function (event)');
    expect(source).toContain("this.motionQuery.addEventListener('change', this.motionPreferenceHandler)");
    expect(source).toContain("this.motionQuery.addListener('change', this.motionPreferenceHandler)");
    expect(source).toContain("this.motionQuery.removeEventListener('change', this.motionPreferenceHandler)");
    expect(source).toContain("this.motionQuery.removeListener('change', this.motionPreferenceHandler)");
    expect(source).toContain('this.cx = target.x; this.cy = target.y; this.cz = target.z;');
    expect(source).toContain('this.causalPulse = null;');
  });  it('shows formulas calculated from unrounded dimensions', () => {
    expect(source).toContain("measure: 'A = L × W = '");
    expect(source).toContain("measure: 'V = L × W × H = '");
    expect(source).toContain('r1(L * W * H)');
    expect(source).toContain('Math.round(n * 100) / 100');
  });
  it('gives the floating mathematics card a clear causal hierarchy', () => {
    expect(source).toContain('id="labelAccent" width="3.25" height="0.04"');
    expect(source).toContain('id="labelTitle" value="A point"');
    expect(source).toContain('id="label3d" value="Zero dimensions"');
    expect(source).toContain('id="labelAxis" value="Selected: no editable axis"');
    expect(source).toContain('id="labelDelta" value="Resize a dimension to compare change."');
    expect(source).toContain('id="labelReason" value=""');
    expect(source).toContain("labelReason.setAttribute('visible', !!(comparing && reasonLine))");
    expect(source).toContain("labelTitle.setAttribute('color', dimensionColor)");
    expect(source).toContain("label3d.setAttribute('color', '#f7faff')");
    expect(source).toContain("labelAccent.setAttribute('material', 'emissive', dimensionColor)");
  });

  it('shows symbolic formulas and signed before-to-now metric change', () => {
    expect(source).toContain('function liveMathLine(s)');
    expect(source).toContain("'A = L \\u00d7 W = '");
    expect(source).toContain("'V = (W \\u00d7 H) \\u00d7 L = '");
    expect(source).toContain("'V = (L \\u00d7 H) \\u00d7 W = '");
    expect(source).toContain("'V = (L \\u00d7 W) \\u00d7 H = '");
    expect(source).toContain('function comparisonDeltaLine(s, component)');
    expect(source).toContain('function comparisonReasonLine(s, component)');
    expect(source).toContain("return 'WHY | ' + heldKey");
    expect(source).toContain("return 'WHY | slice '");
    expect(source).toContain('signedNumber(deltaMetric)');
    expect(source).toContain("labelReason.setAttribute('value', reasonLine)");
    expect(source).toContain("labelAxis.setAttribute('position', '-1.45 ' + r1(-cardTop + (comparing ? 0.37 : 0.23))");
    expect(source).toContain("return '\\u0394' + symbols[s.d] + ' ' + signedNumber(afterMetric - beforeMetric)");
    expect(source).toContain("' | factor ' + factor + '\\u00d7'");
    expect(source).toContain("vrLiveMathText.setAttribute('value', mathLine");
    expect(source).toContain('sectionLine ?');
    expect(source).toContain("deltaLine.indexOf(' +') >= 0 ? '#86efac'");
    expect(source).toContain("deltaLine.indexOf(' -') >= 0 ? '#fda4af'");
  });

  it('treats continuous slider resizing as one quiet undoable action', () => {
    expect(source).toContain('id="uiAxisValue"');
    expect(source).toContain('beginResize: function ()');
    expect(source).toContain('this.emitState(null, true)');
    expect(source).toContain('this.rememberSnapshot(before)');
    expect(source).toContain("uiAxisValue.addEventListener('change'");
    expect(source).toContain('if (!s.silent) {');
    expect(source).toContain("var narration = s.say + ' Formula: ' + liveMathLine(s)");
    expect(source).toContain('var spokenSection = crossSectionLine(s)');
    expect(source).toContain('var spokenDelta = comparisonDeltaLine(s, stateComponent)');
    expect(source).toContain('var spokenReason = comparisonReasonLine(s, stateComponent)');
    expect(source).toContain('live.textContent = narration');
  });

  it('reuses per-frame math and direct-drag vectors for responsive animation', () => {
    expect(source).toContain('this.mathConnectorStart = new THREE.Vector3()');
    expect(source).toContain('this.mathConnectorEnd = new THREE.Vector3()');
    expect(source).toContain('this.mathConnectorMid = new THREE.Vector3()');
    expect(source).toContain('this.axisDragWorld = new THREE.Vector3()');
    expect(source).toContain('this.axisDragDelta = new THREE.Vector3()');
    expect(source).toContain('this.axisDragLabelPosition = new THREE.Vector3()');
    expect(source).toContain('this.sliceInsightPosition = new THREE.Vector3()');
    expect(source).toContain('this.bodyTransformSignature = null');
    expect(source).toContain('var bodySignature = [this.cx.toFixed(4), this.cy.toFixed(4), this.cz.toFixed(4)].join(\'|\');');
    expect(source).toContain('var bodyChanged = bodySignature !== this.bodyTransformSignature;');
    expect(source).toContain('if (bodyChanged && g && g.length === 3)');
    expect(source).toContain('if (bodyChanged && faces && faces.length === 3)');
    expect(source).toContain('this.rulerSignature = null');
    expect(source).toContain("var signature = [this.d, this.axis, activeValue.toFixed(3)].join('|')");
    expect(source).toContain('if (signature === this.rulerSignature) return');
    expect(source).toContain('this.rulerSignature = signature');
    expect(source).toContain('this.targetDimensions = { x: THIN, y: THIN, z: THIN };');
    expect(source).toContain('var target = this.targetDimensions;');
    expect(source).toContain('target.x = this.d >= 1 ? this.L : THIN;');
    expect(source).toContain('var deltaLabelPosition = this.axisDragLabelPosition');
    expect(source).toContain('var insightPosition = this.sliceInsightPosition');
    expect(source).toContain('var start = this.mathConnectorStart');
    expect(source).toContain('var mid = this.mathConnectorMid');
    expect(source).toContain('var currentWorld = this.axisDragWorld');
    expect(source).toContain('var deltaVector = this.axisDragDelta');
    expect(source).toContain('var now = performance.now();');
    expect(source).toContain('now >= this.sliceInsight.until');
  });  it('renders illuminated guides for every active spatial axis', () => {
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
    expect(source).toContain("handle.setAttribute('role', 'button')");
    expect(source).toContain("handle.addEventListener('keydown'");
    expect(source).toContain("handle.addEventListener('focus'");
    expect(source).toContain('setHandleFocus: function (handle, focused)');
    expect(source).toContain('var guided = !complete && i === axisIndex && i < this.d;');
    expect(source).toContain('handle._missionHint = guided');
    expect(source).toContain("handle.setAttribute('aria-describedby', 'missionHint')");
    expect(source).toContain('var guidedHandle = handle._missionHint === true');
    expect(source).toContain('var visibleHandle = i < this.d, focusedHandle = handle._keyboardFocused === true');
    expect(source).toContain("var handleValue = visibleHandle ? r1(Number(this[['L', 'W', 'H'][i]])) + ' units' : 'inactive';");
    expect(source).toContain("handle.setAttribute('aria-label', ['Length X', 'Width Z', 'Height Y'][i] + ' dimension handle, ' + handleValue + handleSelection");
    expect(source).toContain("var handleSelection = visibleHandle && i === this.axis ? ', selected axis' : '';");
    expect(source).toContain('i === this.axis ? 1.3 : 0.85');
    expect(source).toContain('h[0].object3D.position.set(this.cx + 0.1, this.cy / 2, this.cz / 2)');
    expect(source).toContain('h[2].object3D.position.set(this.cx / 2, this.cy + 0.1, this.cz / 2)');
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
    expect(source).toContain('Pull a face handle. Stick resizes or changes axis. Menu centers.');
    expect(source).toContain('<kbd>Shift</kbd>+click to shrink');
  });
  it('groups rapid resize input into one undo transaction', () => {
    expect(source).toContain('beginNudge: function ()');
    expect(source).toContain('endNudge: function (silent)');
    expect(source).toContain('if (!this.nudgeStart) { this.clearComparison(); this.nudgeStart = this.capture(); }');
    expect(source).toContain('this.emitState(null, true)');
    expect(source).toContain('this.endNudge(false); }.bind(this), 360');
    expect(source).toContain('remember: function () { this.endNudge(true)');
    expect(source).toContain('if (this.axisDrag) this.endAxisDrag(true)');
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
    expect(source).toContain("if (complete) targetValue += '\\nDONE'");
    expect(source).toContain("(direction > 0 ? 'GROW ' : 'SHRINK ')");
    expect(source).toContain('c.setMissionHint(hintAxis, hintDirection, done, mission, s.dimensions)');
  });
  it('shows current and target measurements on spatial handles', () => {
    expect(source).toContain("var current = dimensions && isFinite(dimensions[keys[i]])");
    expect(source).toContain("value = axisNames[i] + (current !== '' ? ' ' + current : '')");
    expect(source).toContain("value += ' → ' + r1(mission[keys[i]])");
    expect(source).toContain('setMissionHint(hintAxis, hintDirection, done, mission, s.dimensions)');
    expect(source).toContain("this.targetGhost.setAttribute('role', 'img')");
    expect(source).toContain("this.targetGhost.setAttribute('aria-hidden', visible ? 'false' : 'true')");
    expect(source).toContain("var targetDimensions = ['Length X', 'Width Z', 'Height Y'].slice(0, mission.d).map");
    expect(source).toContain("Target ' + targetMetric + ' ' + r1(metricValue(mission.d, mission))");
    expect(source).toContain("this.targetLabel.setAttribute('aria-hidden', 'true')");
  });

  it('keeps the visible mission target easy to locate without motion surprises', () => {
    expect(source).toContain('if (this.targetGhost && this.targetGhost.object3D.visible)');
    expect(source).toContain('var targetPulse = Math.sin((t || 0) / 560);');
    expect(source).toContain('targetMaterial.opacity = this.reduceMotion ? 0.55 : 0.55 + targetPulse * 0.04;');
    expect(source).toContain('targetMaterial.emissiveIntensity = this.reduceMotion ? 0.35 : 0.35 + targetPulse * 0.08;');
    expect(source).not.toContain('targetMaterial.needsUpdate = true;');
  });
  it('keeps the floating formula panel above current and target solids', () => {
    expect(source).toContain('function positionMeasurePanel(s, mission)');
    expect(source).toContain('var currentHeight = (s.d >= 3 ? s.dimensions.H : THIN) * presentationScale');
    expect(source).toContain('var targetHeight = (showTarget && mission && mission.d >= 3 ? mission.H : THIN) * presentationScale');
    expect(source).toContain('var clearance = measureCardHeight(boundaryLines, comparing) / 2 + 0.32');
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
    expect(source).toContain("missionIndex = 0; missionComplete = false; showTarget = true; showBoundary = false; completedMask = 0; viewScaleIndex = 1; focusMode = 'explain'; MATH_PRECISION = 2; stickMode = 'geometry'; renderQuality = 'auto'; instructorMode = false; LAUNCH_STATE = null; SAVED_STATE = null");
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
    expect(source).toContain("LAUNCH_STATE ? 'Opened the current Geometry Sandbox selection in the immersive lab.'");
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
    expect(source).toContain('function measureCardHeight(boundaryLines, comparing)');
    expect(source).toContain('return 0.98 + boundaryLines * 0.22 + (comparing ? 0.32 : 0)');
    expect(source).toContain("labelBack.setAttribute('height', r1(cardHeight))");
    expect(source).toContain('var clearance = measureCardHeight(boundaryLines, comparing) / 2 + 0.32');
    expect(source).toContain("showBoundary = false; completedMask = 0; viewScaleIndex = 1; focusMode = 'explain'; MATH_PRECISION = 2; stickMode = 'geometry'; renderQuality = 'auto'; instructorMode = false; LAUNCH_STATE = null; SAVED_STATE = null");
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
    expect(source).toContain("completedMask = 0; viewScaleIndex = 1; focusMode = 'explain'; MATH_PRECISION = 2; stickMode = 'geometry'; renderQuality = 'auto'; instructorMode = false; LAUNCH_STATE = null; SAVED_STATE = null");
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
    expect(source).toContain('aria-labelledby="axisSliderLabel" aria-describedby="axisValueOut axisTargetOut"');
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
  it('describes the history scrubber with its live position and replay guidance', () => {
    expect(source).toContain('id="historyValue" for="uiHistoryScrub"');
    expect(source).toContain('id="uiHistoryScrub" type="range"');
    expect(source).toContain('aria-describedby="historyValue historyHelp"');
    expect(source).toContain("uiHistoryScrub.setAttribute('aria-valuetext', storyLabel(snapshot, index, snapshots.length)");
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
    expect(source).toContain('Immersive mode entered. Aim at a handle, hold trigger or grip, and pull continuously.');
    expect(source).toContain('Immersive mode exited. Desktop controls restored.');
    expect(source).toContain("if (labelWrap) labelWrap.setAttribute('visible', false)");
    expect(source).toContain("if (labelWrap) labelWrap.setAttribute('visible', true)");
  });

  it('scopes spatial control semantics to immersive mode', () => {
    expect(source).toContain('<a-entity id="panel" role="group" aria-label="Immersive geometry controls" aria-hidden="true"');
    expect(source).toContain('function setSpatialAccessibility(active)');
    expect(source).toContain("spatialPanel.setAttribute('aria-hidden', active ? 'false' : 'true')");
    expect(source).toContain("button.setAttribute('tabindex', active ? '0' : '-1')");
    expect(source).toContain("button.setAttribute('aria-hidden', active ? 'false' : 'true')");
    expect(source).toContain("if (e.key !== 'Enter' && e.key !== ' ') return;");
    expect(source).toContain('button.click();');
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
    expect(source).toContain('remember: function () { this.endNudge(true); this.clearComparison(); this.future = []');
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
    expect(source).toContain('eye.x + view.x * panelDistance');
    expect(source).toContain('Math.max(0.85, eye.y - 0.3)');
    expect(source).toContain('spatialPanel.object3D.scale.setScalar(0.88)');
    expect(source).toContain('Math.atan2(-view.x, -view.z)');
  });

  it('offers automatic, keyboard, and controller panel recentering', () => {
    expect(source).toContain("case 'c': case 'C': recenterSpatialPanel(true)");
    expect(source).toContain("hand.addEventListener('menudown', function () { recenterSpatialPanel(true); })");
    expect(source).toContain('recenterSpatialPanel(false)');
    expect(source).toContain('Spatial workspace centered in front of you.');
    expect(source).toContain('<kbd>C</kbd> center workspace');
    expect(source).toContain('Menu centers.');
  });
  it('keeps geometry and measures aligned with the recentered workspace', () => {
    expect(source).toContain('var workspacePose = { x: 0, z: -2.4, baseY: 1.1, yaw: 0 }');
    expect(source).toContain('workspacePose.centerX = eye.x + view.x * centerDistance');
    expect(source).toContain('workspacePose.x = workspacePose.centerX - right.x * length / 2 + view.x * depth / 2');
    expect(source).toContain('workspacePose.baseY = Math.max(0.35, eye.y - 0.5)');
    expect(source).toContain('figure.object3D.position.set(workspacePose.x, workspacePose.baseY, workspacePose.z)');
    expect(source).toContain('figure.object3D.rotation.set(0, yaw, 0)');
    expect(source).toContain('var y = workspacePose.baseY + defaultY - 1.1');
    expect(source).toContain('workspacePose.centerX == null ? workspacePose.x : workspacePose.centerX');
    expect(source).toContain('labelWrap.object3D.rotation.set(0, workspacePose.yaw, 0)');
    expect(source).toContain('positionMeasurePanel(lastMissionState, MISSIONS[missionIndex])');
  });
  it('compares mission length, area, and volume from raw dimensions', () => {
    expect(source).toContain('function metricValue(d, dimensions)');
    expect(source).toContain('if (d === 1) return Number(dimensions.L)');
    expect(source).toContain('if (d === 2) return Number(dimensions.L) * Number(dimensions.W)');
    expect(source).toContain('if (d === 3) return Number(dimensions.L) * Number(dimensions.W) * Number(dimensions.H)');
    expect(source).toContain("var metricName = ['', 'Length', 'Area', 'Volume'][mission.d]");
    expect(source).toContain("mission.d === 2 ? '\\u00b2' : mission.d === 3 ? '\\u00b3'");
  });

  it('shows mission metric comparison on desktop and the spatial target', () => {
    expect(source).toContain('id="missionMeasure"');
    expect(source).toContain('var currentMeasure = s.d >= mission.d');
    expect(source).toContain("metricName + ' \\u2014 current ' + currentMeasure");
    expect(source).toContain("' \\u00b7 target ' + targetMeasure + metricUnits");
    expect(source).toContain("var targetMetric = mission ? ['', 'L', 'A', 'V'][mission.d]");
    expect(source).toContain("this.targetLabel.setAttribute('width', '1.35')");
    expect(source).toContain("this.targetLabel.setAttribute('wrap-count', '32')");
    expect(source).toContain("this.targetLabel.object3D.position.set(x / 2, y + 0.24, z / 2)");
    expect(source).toContain("var targetAxes = mission ? keys.slice(0, mission.d).map");
    expect(source).toContain("var targetMetricUnit = mission ? (mission.d === 1 ? 'u' : mission.d === 2 ? 'u2' : 'u3') : ''");
    expect(source).toContain("var targetValue = 'TARGET' + (targetAxes ? '\\n' + targetAxes : '') + (targetMetric ? '\\n' + targetMetric + targetMetricUnit : '')");
    expect(source).toContain("if (complete) targetValue += '\\nDONE'");
    expect(source).toContain('.mission.done .missionmeasure');
  });
  it('compares current and target perimeter or surface area', () => {
    expect(source).toContain('function targetBoundaryLine(mission)');
    expect(source).toContain("Target P = 2 \\u00d7 (L + W) = ");
    expect(source).toContain('2 * (mission.L + mission.W)');
    expect(source).toContain("Target SA = 2 \\u00d7 (LW + LH + WH) = ");
    expect(source).toContain('mission.L * mission.W + mission.L * mission.H + mission.W * mission.H');
    expect(source).toContain("lines.push('Current ' + s.boundary)");
    expect(source).toContain("return lines.join('\\n')");
  });

  it('sizes and repositions measurement panels for multiline boundary comparison', () => {
    expect(source).toContain("white-space: pre-line");
    expect(source).toContain("boundaryText.split('\\n').length");
    expect(source).toContain('function measureCardHeight(boundaryLines, comparing)');
    expect(source).toContain('return 0.98 + boundaryLines * 0.22 + (comparing ? 0.32 : 0)');
    expect(source).toContain("labelBack.setAttribute('height', r1(cardHeight))");
    expect(source).toContain('var boundaryLines = showBoundary ? (s.boundary ? 1 : 0) + (mission && mission.d >= 2 ? 1 : 0) : 0');
    expect(source).toContain('var clearance = measureCardHeight(boundaryLines, comparing) / 2 + 0.32');
    const toggle = source.match(/function toggleBoundaryMeasures\(value, announce\) \{[\s\S]*?\n  \}/);
    expect(toggle).not.toBeNull();
    expect(toggle[0]).toContain('positionMeasurePanel(lastMissionState, MISSIONS[missionIndex])');
  });
  it('isolates lab shortcuts from scene locomotion', () => {
    expect(source).toContain('wasd-controls="enabled: false"');
    expect(source).not.toContain('wasd-controls="acceleration: 24"');
    expect(source).toContain("window.addEventListener('keydown', function (e)");
    expect(source).toContain('var handled = true');
    expect(source).toContain('default: handled = false');
    expect(source).toContain('if (handled) { e.preventDefault(); e.stopPropagation(); }');
    expect(source).toContain('}, true);');
  });

  it('exposes named visual and control regions as groups', () => {
    expect(source).toContain('<div class="scenelegend" role="group" aria-label=');
    expect(source).toContain('<div class="tooloptions" role="group" aria-label="Scene presentation controls">');
    expect(source).toContain('<div class="storytimeline" role="group" aria-label="Geometry story timeline">');
  });
  it('reflows dense HUD controls on narrow screens', () => {
    expect(source).toContain('@media (max-width: 420px)');
    expect(source).toContain('#hud { left: 8px; top: 8px; width: calc(100vw - 16px); max-height: calc(100vh - 16px); padding: 12px; }');
    expect(source).toContain('.missionhead, .instructorbar { align-items: flex-start; flex-wrap: wrap; }');
    expect(source).toContain('.tooloptions { grid-template-columns: 1fr; }');
    expect(source).toContain('.showcasehead, .guidehead { align-items: flex-start; flex-wrap: wrap; }');
    expect(source.indexOf('@media (max-width: 420px)')).toBeGreaterThan(source.indexOf('.guidehead { display: flex;'));
  });
  it('preserves native button semantics in the guided dimension list', () => {
    expect(source).toContain('<span role="listitem"><button class="guidestep current" id="guideStep0" type="button">');
    expect(source).not.toContain('<button class="guidestep current" id="guideStep0" type="button" role="listitem">');
    expect(source).toContain('.guidetrack > span .guidestep { width: 100%; }');
  });
  it('preserves native text editing while capturing standard undo and redo', () => {
    expect(source).toContain('var interactiveControl = e.target && (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName) || e.target.isContentEditable);');
    expect(source).toContain('if (interactiveControl) return;');
    expect(source).toContain("shortcut === 'z'");
    expect(source).toContain("shortcut === 'y'");
    expect(source).toContain('e.preventDefault(); e.stopPropagation(); return;');
  });
  it('turns a controller pull into a continuous one-gesture stretch', () => {
    expect(source).toContain('beginAxisDrag: function (hand, index)');
    expect(source).toContain('updateAxisDrag: function ()');
    expect(source).toContain('endAxisDrag: function (cancel)');
    expect(source).toContain('deltaVector.copy(currentWorld).sub(drag.startPosition).dot(drag.axisVector)');
    expect(source).toContain("hand.addEventListener('triggerdown', function () { beginDirectDrag(hand); })");
    expect(source).toContain("hand.addEventListener('gripup', function () { endDirectDrag(hand, false); })");
    expect(source).toContain('this.beginResize()');
    expect(source).toContain("this.emitState('Direct stretch started on the ' + ['length X', 'width Z', 'height Y'][index] + ' axis.', false);");
    const dragStart = source.slice(source.indexOf("beginAxisDrag:"), source.indexOf("updateAxisDrag:"));
    expect(dragStart).not.toBeNull();
    expect(dragStart).not.toContain("targetPulse");
    expect(dragStart).not.toContain("(t || 0)");
    expect(source).toContain('this.endResize()');
  });

  it('shows the before-state and live mathematics during direct stretching', () => {
    expect(source).toContain('this.gestureGhost = document.createElement');
    expect(source).toContain("this.gestureGhost.setAttribute('role', 'img')");
    expect(source).toContain("this.gestureGhost.setAttribute('aria-hidden', 'true')");
    expect(source).toContain("var startDimensions = ['Length X', 'Width Z', 'Height Y'].slice(0, this.d).map");
    expect(source).toContain("this.gestureGhost.setAttribute('aria-hidden', 'false')");
    expect(source).toContain("this.gestureGhost.setAttribute('aria-label', 'Starting geometry: ' + startDimensions");
    expect(source).toContain("this.gestureGhost.setAttribute('visible', true)");
    expect(source).toContain("this.gestureGhost.setAttribute('visible', false)");
    expect(source).toContain('id="vrTransformText"');
    expect(source).toContain('id="vrLiveMathText"');
    expect(source).toContain("'DIRECT STRETCH | formula updating'");
    expect(source).toContain(String.raw`'VIEW ' + definition.label.toUpperCase() + ' ' + definition.scale + '\u00d7 | math unchanged'`);
  });

  it('accepts only bounded launch state from the Geometry Sandbox', () => {
    expect(source).toContain('function loadLaunchState()');
    expect(source).toContain("var query = new URLSearchParams(window.location.search || '')");
    expect(source).toContain("if (!query.has('d')) return null");
    expect(source).toContain('launched.d < 0 || launched.d > 3');
    expect(source).toContain('value >= MINV && value <= MAXV');
    expect(source).toContain('var SAVED_STATE = LAUNCH_STATE || loadSavedState()');
  });
  it('offers three explicit presentation scales without changing mathematical dimensions', () => {
    expect(source).toContain("{ id: 'tabletop', label: 'Tabletop', scale: 0.65 }");
    expect(source).toContain("{ id: 'body', label: 'Body', scale: 1 }");
    expect(source).toContain("{ id: 'room', label: 'Room', scale: 1.5 }");
    expect(source).toContain('figure.object3D.scale.setScalar(definition.scale)');
    expect(source).toContain('component.presentationScale = definition.scale');
    expect(source).toContain('Length, area, and volume are unchanged.');
    expect(source).toContain('id="uiViewScale"');
    expect(source).toContain('id="vrView"');
    expect(source).toContain("case 'v': case 'V': cycleViewScale()");
  });

  it('keeps direct stretch values and spatial layout calibrated at every presentation scale', () => {
    expect(source).toContain('drag.startValue + distance / presentationScale');
    expect(source).toContain('var presentationScale = this.presentationScale > 0 ? this.presentationScale : 1');
    expect(source).toContain('var length = (state && state.d >= 1 ? dims.L : THIN) * presentationScale');
    expect(source).toContain('var depth = (state && state.d >= 2 ? dims.W : THIN) * presentationScale');
    expect(source).toContain('var currentHeight = (s.d >= 3 ? s.dimensions.H : THIN) * presentationScale');
  });

  it('persists only the selected presentation scale and does not add it to geometry history', () => {
    expect(source).toContain('viewScaleIndex: viewScaleIndex');
    expect(source).toContain('saved.viewScaleIndex');
    expect(source).toContain("query.has('view') ? Number(query.get('view')) : 1");
    const applyViewScale = source.slice(source.indexOf('function applyViewScale'), source.indexOf('function cycleViewScale'));
    expect(applyViewScale).not.toContain('remember');
    expect(applyViewScale).not.toContain('history.push');
  });

  it('names changed and invariant dimensions and updates the derived measure', () => {
    expect(source).toContain('changeNotice: function (before, after)');
    expect(source).toContain("held.join(' and ') + ' stayed fixed. '");
    expect(source).toContain('metricValue(after.d, before)');
    expect(source).toContain('metricValue(after.d, after)');
    expect(source).toContain("this.el.emit('geometrynotice', { text: text }, false)");
    expect(source).toContain('id="invariantNotice" class="invariantnote" role="status" aria-live="polite"');
    expect(source).toContain('id="vrNoticeText"');
  });
  it('builds a layered half-unit metric grid with emphasized world axes', () => {
    expect(source).toContain('id="grid" metric-grid');
    expect(source).toContain("AFRAME.registerComponent('metric-grid'");
    expect(source).toContain('var coordinate = i * 0.5');
    expect(source).toContain('i % 10 === 0 ? groups.major : i % 2 === 0 ? groups.unit : groups.half');
    expect(source).toContain("color: '#38bdf8'");
    expect(source).toContain("color: '#4ade80'");
    expect(source).toContain('resource.geometry.dispose()');
    expect(source).toContain('resource.material.dispose()');
  });

  it('adds crisp construction edges and a selected-face depth cue', () => {
    expect(source).toContain('new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))');
    expect(source).toContain('this.edgeFrame.object3D.scale.set(this.cx, this.cy, this.cz)');
    expect(source).toContain('this.faceHighlights =');
    expect(source).toContain("face.setAttribute('visible', i < this.d && i === this.axis)");
    expect(source).toContain('faces[0].object3D.scale.set(this.cz, this.cy, 1)');
    expect(source).toContain('faces[2].object3D.scale.set(this.cx, this.cz, 1)');
  });

  it('uses shape and motion cues as well as color for the selected handle', () => {
    expect(source).toContain("var glow = document.createElement('a-sphere')");
    expect(source).toContain("var arrow = document.createElement('a-cone')");
    expect(source).toContain('handle._selectionGlow = glow');
    expect(source).toContain("handle._selectionGlow.setAttribute('visible', focusedHandle || guidedHandle || (visibleHandle && i === this.axis))");
    expect(source).toContain('var pulse = this.reduceMotion ? 1');
    expect(source).toContain("arrow.setAttribute('rotation', '0 0 -90')");
    expect(source).toContain("arrow.setAttribute('rotation', '90 0 0')");
  });

  it('keeps desktop solids centered at a stable oblique viewing distance', () => {
    expect(source).toContain('function positionDesktopWorkspace(s)');
    expect(source).toContain('var centerX = 0.65, centerZ = -3.2');
    expect(source).toContain('THREE.MathUtils.degToRad(-18)');
    expect(source).toContain('workspacePose.x = centerX - offsetX; workspacePose.z = centerZ - offsetZ');
    expect(source).toContain('else positionDesktopWorkspace(lastMissionState)');
    expect(source).toContain('else positionDesktopWorkspace(s)');
  });

  it('keeps duplicate spatial controls immersive-only', () => {
    expect(source).toContain('id="panel" role="group" aria-label="Immersive geometry controls" aria-hidden="true" position="0 0.95 -1.35" rotation="-22 0 0" visible="false"');
    expect(source).toContain("spatialPanel.setAttribute('visible', immersiveActive)");
    expect(source).toContain("scene.addEventListener('enter-vr', function () { setImmersiveMode(true); })");
    expect(source).toContain("scene.addEventListener('exit-vr', function () { setImmersiveMode(false); })");
  });

  it('connects dimension and measure changes through the same scale factor', () => {
    expect(source).toContain('var scaleFactor = r1(after[keys[changedAxis]] / before[keys[changedAxis]])');
    expect(source).toContain('var metricFactor = r1(metricValue(after.d, after) / metricValue(after.d, before))');
    expect(source).toContain("' units. Scale factor ' + scaleFactor + '×. '");
    expect(source).toContain("' and scaled by ' + metricFactor + '×.'");
  });
  it('retains a labeled previous boundary after committed resizes', () => {
    expect(source).toContain('this.comparisonFrame = document.createElement');
    expect(source).toContain("color: '#60a5fa'");
    expect(source).toContain('showComparison: function (snapshot)');
    expect(source).toContain('this.comparisonFrame.object3D.scale.set(x, y, z)');
    expect(source).toContain("this.comparisonFrame.setAttribute('role', 'img')");
    expect(source).toContain("var comparisonDimensions = ['Length X', 'Width Z', 'Height Y'].slice(0, snapshot.d).map");
    expect(source).toContain("this.comparisonFrame.setAttribute('aria-label', 'Before geometry: ' + comparisonDimensions.join");
    expect(source).toContain("this.comparisonFrame.setAttribute('aria-hidden', comparisonVisible ? 'false' : 'true')");
    expect(source).toContain("if (this.comparisonFrame) this.comparisonFrame.setAttribute('aria-hidden', 'true');");
    expect(source).toContain("this.comparisonLabel.setAttribute('value', 'BEFORE\\n' + axisSymbols[comparisonAxis]");
    expect(source).toContain('if (comparisonAxis === 0) this.comparisonLabel.object3D.position.set(x, y / 2, z + 0.08)');
    expect(source).toContain("this.comparisonBadge.setAttribute('width', '0.46')");
    expect(source).toContain("this.comparisonBadge.setAttribute('material', 'color: #0c4a6e");
    expect(source).toContain("this.comparisonLabel.setAttribute('width', '1.35')");
    expect(source).toContain("this.comparisonBadge.setAttribute('visible', this.focusMode !== 'explore')");
    expect(source).toContain('this.showComparison(before)');
  });

  it('clears stale comparisons at every incompatible geometry transition', () => {
    expect(source).toContain('clearComparison: function ()');
    expect(source).toContain('remember: function () { this.endNudge(true); this.clearComparison()');
    expect(source).toContain('if (!this.nudgeStart) { this.clearComparison(); this.nudgeStart = this.capture(); }');
    expect(source).toContain('if (!this.resizeStart && this.d > 0) { this.clearComparison(); this.resizeStart = this.capture(); }');
    const undoBlock = source.slice(source.indexOf('undo: function ()'), source.indexOf('redo: function ()'));
    const redoBlock = source.slice(source.indexOf('redo: function ()'), source.indexOf('selectAxis: function'));
    expect(undoBlock).toContain('this.clearComparison()');
    expect(redoBlock).toContain('this.clearComparison()');
  });

  it('animates pulse uniforms without invalidating shader programs each frame', () => {
    expect(source).toContain('material.opacity = 0.16 + envelope * 0.28;');
    expect(source).toContain('haloMaterial.opacity = haloPulse;');
    expect(source).not.toContain('material.needsUpdate = true;');
    expect(source).not.toContain('haloMaterial.needsUpdate = true;');
  });
  it('renders a fine-grained active-axis ruler without per-frame attribute churn', () => {
    expect(source).toContain('for (var rulerIndex = 0; rulerIndex <= 16; rulerIndex++)');
    expect(source).toContain('var rulerValue = rulerIndex * 0.25');
    expect(source).toContain('for (var wholeUnit = 1; wholeUnit <= 4; wholeUnit++)');
    expect(source).toContain("rulerLabel.setAttribute('value', wholeUnit + 'u')");
    expect(source).toContain('updateRuler: function ()');
    expect(source).toContain('value <= activeValue + 0.001');
    expect(source).toContain('tick.object3D.visible = visible');
    expect(source).toContain('label.object3D.visible = visible');
    const rulerUpdate = source.slice(source.indexOf('updateRuler: function ()'), source.indexOf('setTarget: function'));
    expect(rulerUpdate).not.toContain("setAttribute('visible', visible)");
  });

  it('projects rectangles and solids onto the floor as a live area scaffold', () => {
    expect(source).toContain('this.projectionFill = document.createElement');
    expect(source).toContain('this.projectionFrameGeometry = new THREE.BufferGeometry()');
    expect(source).toContain('this.projectionDropGeometry = new THREE.BufferGeometry()');
    expect(source).toContain('this.projectionAxisGeometry = new THREE.BufferGeometry()');
    expect(source).toContain("color: '#facc15'");
    expect(source).toContain('this.projectionAxisGeometry.setDrawRange(0, 4)');
    expect(source).toContain('this.projectionAxisGeometry.setDrawRange(0, 8)');
    expect(source).toContain('new THREE.LineDashedMaterial');
    expect(source).toContain('updateProjection: function ()');
    expect(source).toContain('var visible = this.d >= 2');
    expect(source).toContain("'PLAN | A = L × W = ' + r1(this.L * this.W) + ' units²'");
    expect(source).toContain('var floorY = (0.022 - this.el.object3D.position.y) / presentationScale');
    expect(source).toContain('this.projectionDropLines.computeLineDistances()');
    expect(source).toContain("if (signature === this.projectionSignature) return");
    expect(source).toContain('this.updateProjection()');
    expect(source).toContain('if (this.projectionFrameGeometry) this.projectionFrameGeometry.dispose()');
    expect(source).toContain('if (this.projectionAxisMaterial) this.projectionAxisMaterial.dispose()');
    expect(source).toContain('if (this.projectionDropMaterial) this.projectionDropMaterial.dispose()');
  });

  it('reveals a selected solid as cached half-unit cross-sections', () => {
    expect(source).toContain("this.sectionPlane = document.createElement('a-plane')");
    expect(source).toContain('for (var sectionIndex = 0; sectionIndex < 7; sectionIndex++)');
    expect(source).toContain('new THREE.LineLoop(this.sectionSliceGeometry, this.sectionSliceMaterial)');
    expect(source).toContain('updateSections: function ()');
    expect(source).toContain('var visible = this.d === 3');
    expect(source).toContain('var axisValue = [x, z, y][this.axis]');
    expect(source).toContain('orient(this.sectionPlane, axisValue / 2)');
    expect(source).toContain('var value = (index + 1) * 0.5');
    expect(source).toContain('slice.object3D.visible = value < axisValue - 0.04');
    expect(source).toContain('entity.object3D.rotation.y = Math.PI / 2');
    expect(source).toContain('entity.object3D.rotation.x = -Math.PI / 2');
    expect(source).toContain('if (signature === this.sectionSignature) return');
    expect(source).toContain('function crossSectionLine(s)');
    expect(source).toContain("'X MID-SLICE | W × H = '");
    expect(source).toContain("'Z MID-SLICE | L × H = '");
    expect(source).toContain("'Y MID-SLICE | L × W = '");
    expect(source).toContain("comparing ? deltaLine : sectionLine || 'Resize a dimension");
    expect(source).toContain('this.updateSections()');
    expect(source).toContain('if (this.sectionSliceGeometry) this.sectionSliceGeometry.dispose()');
    expect(source).toContain('if (this.sectionSliceMaterial) this.sectionSliceMaterial.dispose()');
  });

  it('ties the selected handle to the floating mathematics card without frame churn', () => {
    expect(source).toContain("this.mathConnector = document.createElement('a-entity')");
    expect(source).toContain('new THREE.LineDashedMaterial');
    expect(source).toContain('updateMathConnector: function ()');
    expect(source).toContain('var end = this.mathConnectorEnd');
    expect(source).toContain("end.set(0, -Number(back.getAttribute('height')) / 2 - 0.035, 0.02)");
    expect(source).toContain('wrap.object3D.localToWorld(end)');
    expect(source).toContain('mid.y = Math.max(start.y, end.y) + 0.18');
    expect(source).toContain('if (signature === this.mathConnectorSignature) return');
    expect(source).toContain("wrap.getAttribute('visible') !== false");
    expect(source).toContain('this.mathConnectorLine.computeLineDistances()');
    expect(source).toContain('this.updateMathConnector()');
    expect(source).toContain('if (this.mathConnectorGeometry) this.mathConnectorGeometry.dispose()');
    expect(source).toContain('if (this.mathConnectorMaterial) this.mathConnectorMaterial.dispose()');
  });
  it('adds focus presets and precision without changing geometry fidelity', () => {
    expect(source).toContain('id="uiFocusMode"');
    expect(source).toContain('id="uiPrecision"');
    expect(source).toContain("var FOCUS_MODES = ['explore', 'explain', 'compare']");
    expect(source).toContain('function normalizePrecision(value)');
    expect(source).toContain('function applyFocusMode(mode, announce)');
    expect(source).toContain('function updateFocusModeHelp()');
    expect(source).toContain('renderMeasureLabels(lastMissionState);');
    expect(source).toContain("var comparing = focusMode !== 'explore' && !!(component && component.comparisonState);" );
    expect(source).toContain("this.focusMode !== 'compare'");
    expect(source).toContain("this.focusMode === 'explain'");
    expect(source).toContain("this.focusMode !== 'explore'");
    expect(source).toContain('function rState(n) { return Math.round(n * 100) / 100; }');
    expect(source).toContain('value = rState(value)');
    expect(source).toContain('focusMode: focusMode, precision: MATH_PRECISION');
  });

  it('gives direct XR manipulation a visible trail and causal delta badge', () => {
    expect(source).toContain("this.dragTrail = document.createElement('a-entity')");
    expect(source).toContain('this.dragTrailGeometry.setAttribute');
    expect(source).toContain('this.dragTrailLine.renderOrder = 7');
    expect(source).toContain("this.dragDeltaLabel.setAttribute('value', 'ΔX +0 units')");
    expect(source).toContain("this.dragDeltaLabel.setAttribute('width', '1.1')");
    expect(source).toContain("this.dragDeltaLabel.setAttribute('value', '\\u0394' + ['X', 'Z', 'Y'][drag.axis] + ' ' + (delta > 0 ? '+' : '') + delta + ' units')");
    expect(source).toContain('var currentWorld = this.axisDragWorld');
    expect(source).toContain('this.dragTrailGeometry.attributes.position.needsUpdate = true');
    expect(source).toContain("this.dragDeltaLabel.setAttribute('visible', false)");
    expect(source).toContain('if (this.dragTrailGeometry) this.dragTrailGeometry.dispose()');
  });

  it('adds non-destructive history replay and adaptive XR comfort controls', () => {
    expect(source).toContain('id="uiReplay"');
    expect(source).toContain('replayHistory: function ()');
    expect(source).toContain('this.replayActive = true');
    expect(source).toContain('this.replayActive = false');
    expect(source).toContain('Your current geometry is restored.');
    expect(source).toContain('id="uiStickMode"');
    expect(source).toContain("if (stickMode === 'navigate')");
    expect(source).toContain('turnRig(x > 0 ? 1 : -1)');
    expect(source).toContain('moveRig(y < 0 ? 1 : -1, 0)');
    expect(source).toContain('id="uiRenderQuality"');
    expect(source).toContain('renderer.setPixelRatio');
    expect(source).toContain("renderer.shadowMap.enabled = renderQuality !== 'battery'");
  });

  it('adds a guided dimension path and non-destructive story timeline', () => {
    expect(source).toContain('id="guideBox"');
    expect(source).toContain('id="uiGuideAction"');
    expect(source).toContain('id="uiGuideWhy"');
    expect(source).toContain("var GUIDE_STEPS = [");
    expect(source).toContain('function guideState(s)');
    expect(source).toContain('function storySnapshots(component)');
    expect(source).toContain('id="uiHistoryScrub"');
    expect(source).toContain('id="uiHistoryRestore"');
    expect(source).toContain('previewSnapshot: function (snapshot, index, total)');
    expect(source).toContain('restorePreview: function (announce)');
    expect(source).toContain('this.previewActive = true; this.previewIndex = Number(index);');
    expect(source).toContain('component.previewActive && component.previewOrigin ? component.previewOrigin : component.showcaseActive && component.showcaseOrigin ? component.showcaseOrigin : component.capture()');
    expect(source).toContain('if (!(stateComponent && (stateComponent.previewActive || stateComponent.showcaseActive))) saveLabState(s);');
    expect((source.match(/uiReplay\.addEventListener/g) || []).length).toBe(1);
  });
  it('announces guided step transitions without resize chatter', () => {
    expect(source).toContain('<div id="guideStatus" class="sr-only" role="status" aria-live="polite"></div>');
    expect(source).toContain("guideStatus = document.getElementById('guideStatus')");
    expect(source).toContain("var priorStep = guideStatus ? guideStatus.getAttribute('data-step') : null;");
    expect(source).toContain("if (guideStatus && priorStep !== String(d))");
    expect(source).toContain("guideStatus.setAttribute('data-step', String(d))");
    expect(source).toContain("guideStatus.textContent = 'Guided exploration step ' + (d + 1)");
  });

  it('adds instructor sharing and causal slice animation', () => {
    expect(source).toContain('id="uiInstructor"');
    expect(source).toContain('id="uiLessonLink"');
    expect(source).toContain('function applyInstructorMode(value, announce)');
    expect(source).toContain('function lessonShareUrl()');
    expect(source).toContain("params.set('instructor', instructorMode ? '1' : '0')");
    expect(source).toContain('instructorMode: saved.instructorMode === true');
    expect(source).toContain('quality: renderQuality, instructorMode: instructorMode');
    expect(source).toContain("query.get('instructor') === '1'");
    expect(source).toContain('this.causalSlice = document.createElement');
    expect(source).toContain('triggerCausalPulse: function (before, after)');
    expect(source).toContain('updateCausalPulse: function (t)');
    expect(source).toContain('this.updateCausalPulse(t)');
    expect(source).toContain('this.triggerCausalPulse(before, after)');
    expect(source).toContain('VOLUME SLICE');
  });
  it('adds a direct, accessible slice microscope and preserves the HUD stateline', () => {
    expect(source).toContain('<p class="stateline" id="stateline">A point.</p>');
    expect(source).toContain('id="sliceExplainer"');
    expect(source).toContain('id="uiExplainSlice"');
    expect(source).toContain('explainSlice: function (source)');
    expect(source).toContain('if (this.replayActive || this.previewActive || this.showcaseActive) return false;');
    expect(source).toContain('A = L × W = ');
    expect(source).toContain('V = slice × ');
    expect(source).toContain("this.projectionFill.addEventListener('click'");
    expect(source).toContain("this.sectionPlane.addEventListener('click'");
    expect(source).toContain("figure.addEventListener('sliceexplain'");
    expect(source).toContain('sliceExplainer.hidden = s.d < 2');
    expect(source).toContain('this.sliceInsightLabel.object3D.visible');
    expect(source).toContain('setSliceSurfaceFocus: function (surface, focused)');
    expect(source).toContain("    this.projectionFill.setAttribute('aria-keyshortcuts', 'Enter Space');");
    expect(source).toContain("    this.projectionFill.addEventListener('keydown', function (event)");
    expect(source).toContain("this.projectionFill.setAttribute('tabindex', visible ? '0' : '-1')");
    expect(source).toContain("this.sectionPlane.setAttribute('aria-hidden', visible ? 'false' : 'true')");
  });
  it('adds adaptive unit lattices for plan area and volume slices', () => {
    expect(source).toContain('id="showcaseBox"');
    expect(source).toContain('Unit lattice');
    expect(source).toContain('this.projectionGridGeometry = new THREE.BufferGeometry()');
    expect(source).toContain('this.projectionGridLine = new THREE.LineSegments');
    expect(source).toContain('writeUnitGrid: function (geometry, width, height)');
    expect(source).toContain('var widthLines = Math.max(0, Math.min(3, Math.floor(width - 0.001)))');
    expect(source).toContain('this.writeUnitGrid(this.projectionGridGeometry, x, z)');
    expect(source).toContain('this.writeUnitGrid(this.sectionGridGeometry, gridWidth, gridHeight)');
    expect(source).toContain("this.projectionGrid.object3D.visible = visible && this.focusMode === 'explain'");
    expect(source).toContain('this.sectionGridGeometry = new THREE.BufferGeometry()');
    expect(source).toContain('this.sectionGridLine = new THREE.LineSegments');
    expect(source).toContain('orient(this.sectionGrid, axisValue / 2)');
    expect(source).toContain('if (this.projectionGridGeometry) this.projectionGridGeometry.dispose()');
    expect(source).toContain('if (this.sectionGridGeometry) this.sectionGridGeometry.dispose()');
  });
  it('adds a non-destructive Dimension Story Director', () => {
    expect(source).toContain('id="showcaseBox"');
    expect(source).toContain('id="uiShowcase"');
    expect(source).toContain('id="uiShowcaseStop"');
    expect(source).toContain('var SHOWCASE_STEPS = [');
    expect(source).toContain('startShowcase: function ()');
    expect(source).toContain('// Reduced motion keeps each snapped step on-screen long enough to read its caption.');
    expect(source).toContain('this.showcaseTimer = setTimeout(advance, this.reduceMotion ? 1200 : 1450);');
    expect(source).toContain('stopShowcase: function (announce, message)');
    expect(source).toContain("this.showcaseHalo = document.createElement('a-ring')");
    expect(source).toContain("this.showcaseBadge = document.createElement('a-text')");
    expect(source).toContain("this.el.emit('showcasestep'");
    expect(source).toContain("this.el.emit('showcasestop'");
    expect(source).toContain('stateComponent.showcaseActive');
    expect(source).toContain('replayComponent.showcaseActive');
    expect(source).toContain("case 't': case 'T': toggleShowcase()");
  });
  it('keeps native control keyboard input isolated from global geometry shortcuts', () => {
    expect(source).toContain('var interactiveControl = e.target && (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName) || e.target.isContentEditable);');
    expect(source).toContain('if (interactiveControl) return;');
    expect(source).toContain('if ((e.ctrlKey || e.metaKey) && !e.altKey) {');
    expect(source).not.toContain('var textEntry = e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)');
  });
  it('keeps guide and showcase panels structurally styled and motion-safe', () => {
    expect(source).toContain('.guidebox { margin: 0 0 11px; padding: 8px 9px;');
    expect(source).not.toContain('} margin: 0 0 11px; padding: 8px 9px;');
    expect(source).toContain('@media (prefers-reduced-motion: reduce) { .showcasebox { transition: none; } }');
  });
  it('keeps the immersive scene self-describing and camera-aware', () => {
    expect(source).toContain('aria-label="Interactive 3D stretch lab"');
    expect(source).toContain('id="sceneDescription"');
    expect(source).toContain('Click the highlighted plan or cross-section to hear its slice formula.');
    expect(source).toContain('role="button" aria-label="Stretch up one dimension"');
    expect(source).toContain('function faceMeasurePanelToCamera()');
    expect(source).toContain('var panelFaceTimer = window.setInterval(faceMeasurePanelToCamera, 120)');
    expect(source).toContain("stickMode === 'navigate' ? 'Thumbstick snap-turns and walks.'");
  });
  it('explains the Now, Before, and selected-ruler visual language accessibly', () => {
    expect(source).toContain('Scene key: solid is now, blue outline is before, yellow marks the selected dimension and cross-sections, the dashed floor footprint is the plan projection, the fine lattice shows unit structure, and the dotted gold link connects the selected handle to its formula.');
    expect(source).toContain('<i class="legendmark projection" aria-hidden="true"></i>Plan projection');
    expect(source).toContain('<i class="legendmark section" aria-hidden="true"></i>Cross-sections');
    expect(source).toContain('<i class="legendmark now" aria-hidden="true"></i>Now');
    expect(source).toContain('<i class="legendmark before" aria-hidden="true"></i>Before');
    expect(source).toContain('<i class="legendmark ruler" aria-hidden="true"></i>Selected axis');
    expect(source).toContain("(comparing ? 'NOW | ' : '') + s.title");
    expect(source).toContain("'NOW SOLID | BEFORE BLUE OUTLINE'");
  });
});
