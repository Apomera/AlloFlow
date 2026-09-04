import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// 2026-09-03: the dissection lab stated the same thing several times above the specimen. The
// interactive specimen canvas began 1393px down a 1280px-wide page; it now begins at 1184px.
//  - the hero carried a "Current workflow position" aside beside a step rail that already
//    marked the current step, and beside copy that already named the phase;
//  - the Next-best-action card repeated the learning checkpoint's question when that checkpoint
//    was rendered directly beneath it, and its button only scrolled to that panel;
//  - a field labelled "Phase" rendered the whole question instead of the phase name;
//  - an Essentials/Advanced band sat directly above the four learning-route buttons.

const DISSECTION_PATHS = [
  'stem_lab/stem_tool_dissection.js',
  'desktop/web-app/public/stem_lab/stem_tool_dissection.js',
];

const BASE = { specimen: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', _dissLoadedSpec: 'frog' };

function parse(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function render(filePath, state) {
  loadTool(filePath, 'dissection');
  return parse(renderTool('dissection', { dissection: { ...BASE, ...state } }));
}

beforeEach(() => { resetStemLab(); });

describe('dissection workspace bands', () => {
  it.each(DISSECTION_PATHS)('states the workflow position once in the hero in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).not.toContain('"aria-label": "Current workflow position"');
    expect(source).not.toContain('diss-workspace-mode__copy');
    // A single-column hero, or the removed aside leaves a 19rem hole.
    expect(source).toContain('.diss-mission {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);');

    const root = render(filePath, {});
    const rail = root.querySelector('.diss-workflow');
    expect(rail, 'workflow rail').not.toBeNull();
    expect(rail.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  }, 60_000);

  it.each(DISSECTION_PATHS)('keeps one visibility rule for the checkpoint and its signpost in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // Both the card's suppression and the checkpoint itself read the same helper.
    expect(source).toContain('function procedureLearningCheckpointVisible()');
    expect(source).toContain("if (nextActionModel.action === 'learning' && procedureLearningCheckpointVisible()) return null;");
    expect(source).toContain('if (!procedureLearningCheckpointVisible()) return null;');
  });

  it.each(DISSECTION_PATHS)('labels the telemetry phase with the phase, not the question, in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain("'Phase \u00B7 ' + nextActionModel.phase");
    expect(source).not.toContain("'Phase \u00B7 ' + stageHandoffLabel");
  });

  it.each(DISSECTION_PATHS)('puts the reasoning checkpoints beside the specimen in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // Both checks ask the learner to reason about the specimen, so they open the primary column
    // rather than sitting above the specimen chooser, layer rail and view bar.
    expect(source).toContain(`React.createElement("div", { className: "diss-primary-column" },

                renderProcedureLearningCheckpoint(),
                renderGuidedObservationCheck(),`);

    const root = render(filePath, {});
    const check = root.querySelector('.diss-learning-check');
    expect(check, 'checkpoint renders').not.toBeNull();
    expect(check.closest('.diss-primary-column'), 'checkpoint is in the specimen column').not.toBeNull();
    const stage = root.querySelector('.diss-stage');
    // It comes before the stage, so the question is read first and the specimen is right below.
    expect(check.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // The stage no longer repeats the question a line below the panel that asks it.
    const handoff = root.querySelector('.diss-stage__handoff strong');
    expect(handoff.textContent).not.toContain('?');
    expect(handoff.textContent).toMatch(/^Next · \S/);
  }, 60_000);

  it.each(DISSECTION_PATHS)('keeps the flashcard hint and counter above 4.5:1 in %s', (filePath) => {
    // axe with animations frozen, study route with flashcards open: the reveal hint measured
    // 4.46:1 (#6366f1 indigo-500 on white) against the 4.5 requirement, and the card counter
    // beside it used the same colour at the same 12px size. indigo-600 clears it.
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).not.toContain('text-indigo-500');

    const root = render(filePath, { flashcardMode: true });
    const hint = [...root.querySelectorAll('span')]
      .find((n) => n.textContent.trim() === 'Tap or press Enter to reveal its function');
    expect(hint, 'flashcard reveal hint').not.toBeUndefined();
    expect(hint.className).toContain('text-indigo-600');
    expect(hint.className).not.toContain('text-indigo-500');
  }, 60_000);

  it.each(DISSECTION_PATHS)('does not let option length give the checkpoint answer away in %s', (filePath) => {
    // Measured in a browser across all 7 specimens: the correct option rendered at 122-155
    // characters against distractors fixed at 84 and 76, so always choosing the longest scored
    // 7/7 without reading any biology. The distractors now interpolate the same protocol values,
    // so length tracks the specimen rather than the answer.
    const specimens = ['frog', 'earthworm', 'pig', 'perch', 'crayfish', 'sheepEye', 'sheepHeart'];
    let longestIsCorrect = 0;
    for (const specimen of specimens) {
      const root = render(filePath, { specimen, _dissLoadedSpec: specimen });
      const check = root.querySelector('.diss-learning-check');
      expect(check, specimen).not.toBeNull();
      const options = [...check.querySelectorAll('button')]
        .map((b) => b.textContent.replace(/\s+/g, ' ').trim())
        .filter((text) => text.length > 25);
      expect(options.length, specimen).toBe(3);

      const lengths = options.map((o) => o.length);
      const longest = Math.max(...lengths);
      const shortest = Math.min(...lengths);
      // No option may tower over the others; the old spread was 76 to 155.
      expect(longest - shortest, `${specimen} spread ${JSON.stringify(lengths)}`).toBeLessThan(60);
      if (lengths.indexOf(longest) === 0) longestIsCorrect++;
    }
    // Picking the longest must be near chance for three options, not a perfect strategy.
    expect(longestIsCorrect, 'longest-option strategy score').toBeLessThan(specimens.length);
  }, 120_000);

  it.each(DISSECTION_PATHS)('keeps the explain-phase options the same length in %s', (filePath) => {
    // All six reflection questions used to put the correct answer last in length terms: it was
    // the longest every time, by 19 to 35 characters. Reflection labels are plain strings with
    // no interpolation, so the source length is the rendered length.
    const source = fs.readFileSync(filePath, 'utf8');
    const sets = [];
    let from = 0;
    for (;;) {
      const at = source.indexOf("reflectionCorrectId: '", from);
      if (at < 0) break;
      from = at + 22;
      const correctId = source.slice(from, source.indexOf("'", from));
      const optAt = source.indexOf('reflectionOptions: [', from);
      let i = source.indexOf('[', optAt) + 1;
      let depth = 1;
      let seg = '';
      for (; i < source.length && depth > 0; i++) {
        const c = source[i];
        if (c === '[') depth++;
        else if (c === ']') { depth--; if (!depth) break; }
        seg += c;
      }
      const options = [...seg.matchAll(/\{ id: '([a-z0-9-]+)', label: '([^']*)'/g)]
        .map((m) => ({ id: m[1], length: m[2].length }));
      if (options.length) sets.push({ correctId, options });
    }

    expect(sets.length).toBeGreaterThanOrEqual(6);
    let longestIsCorrect = 0;
    for (const set of sets) {
      const lengths = set.options.map((o) => o.length);
      const spread = Math.max(...lengths) - Math.min(...lengths);
      expect(spread, `${set.correctId} ${JSON.stringify(lengths)}`).toBeLessThanOrEqual(15);
      const correctIndex = set.options.findIndex((o) => o.id === set.correctId);
      expect(correctIndex, set.correctId).toBeGreaterThanOrEqual(0);
      if (lengths.indexOf(Math.max(...lengths)) === correctIndex) longestIsCorrect++;
    }
    // It used to be every single one.
    expect(longestIsCorrect).toBeLessThan(sets.length);
  });

  it.each(DISSECTION_PATHS)('never prints the same words twice in the stage handoff in %s', (filePath) => {
    // Regression from this review: once the headline started naming the phase, it collided with
    // stageHandoffDetail, which falls back to the same phase when no instrument is involved.
    // The row read "Next - Predict before contact   Predict before contact".
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('var stageHandoffHeadline = procedureLearningCheckpointVisible()');
    expect(source).toContain('stageHandoffDetail !== stageHandoffHeadline');

    const parts = (root) => {
      const row = root.querySelector('.diss-stage__handoff');
      expect(row, 'handoff row').not.toBeNull();
      return [...row.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
    };

    // Checkpoint visible: the phase is named once.
    const withCheck = parts(render(filePath, {}));
    expect(withCheck).toContain('Next · Predict before contact');
    expect(withCheck.filter((p) => p === 'Predict before contact')).toHaveLength(0);
    expect(new Set(withCheck).size).toBe(withCheck.length);

    // Checkpoint hidden: the headline and the detail differ, so both are shown.
    const guided = parts(render(filePath, { guidedMode: true }));
    expect(guided.length).toBeGreaterThan(withCheck.length - 1);
    expect(new Set(guided).size).toBe(guided.length);
    expect(guided.some((p) => p === 'Guided investigation')).toBe(true);
  }, 60_000);

  it.each(DISSECTION_PATHS)('carries the detail toggle inside the route rail in %s', (filePath) => {
    const root = render(filePath, {});
    const rail = root.querySelector('.diss-mode-rail');
    expect(rail).not.toBeNull();
    expect(rail.getAttribute('data-dissection-workspace-mode')).toBe('true');

    const choices = rail.querySelector('.diss-workspace-mode__choices');
    expect(choices, 'toggle lives in the rail').not.toBeNull();
    const buttons = [...choices.querySelectorAll('button')];
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Essentials workspace', 'Advanced workspace']);
    expect(buttons.map((b) => b.textContent)).toEqual(['Essentials', 'Advanced']);
    // The sentence each band used to print is still available on hover.
    for (const button of buttons) expect(button.getAttribute('title')).toMatch(/workspace: /);

    // Exactly one is pressed, and it follows the stored mode.
    expect(buttons.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    const advanced = render(filePath, { workspaceMode: 'advanced' })
      .querySelectorAll('.diss-workspace-mode__choices button');
    expect(advanced[1].getAttribute('aria-pressed')).toBe('true');
  }, 60_000);

  // 2026-09-04, measured at 390px: the canvas status line restated the checkpoint question
  // word for word, 1,271px below the checkpoint that owns it.
  it.each(DISSECTION_PATHS)('does not restate the checkpoint question in the canvas status in %s', (filePath) => {
    const root = render(filePath, {});
    const check = root.querySelector('.diss-learning-check__prompt');
    expect(check, 'checkpoint prompt').not.toBeNull();
    const prompt = check.textContent.replace(/\s+/g, ' ').trim();
    expect(prompt.length).toBeGreaterThan(20);

    const live = root.querySelector('#diss-canvas-status');
    expect(live, 'canvas status').not.toBeNull();
    const status = live.textContent.replace(/\s+/g, ' ').trim();
    expect(status).not.toContain(prompt);
    // It still names the phase and says where the question lives.
    expect(status).toContain('Predict before contact');
    expect(status).toContain('planning checkpoint');
  }, 60_000);

  it.each(DISSECTION_PATHS)('keeps the full next-action title in the status when no checkpoint is shown in %s', (filePath) => {
    const root = render(filePath, { guidedMode: true });
    const live = root.querySelector('#diss-canvas-status');
    expect(live, 'canvas status').not.toBeNull();
    const status = live.textContent.replace(/\s+/g, ' ').trim();
    expect(status.length).toBeGreaterThan(20);
    // Without the checkpoint on the page nothing else carries the instruction, so it stays.
    expect(status).not.toContain('planning checkpoint above the specimen');
  }, 60_000);

  // The phone layer rail scrolls sideways, so a fixed chip width only truncated the names:
  // "Skeleton" and "Nervous" ellipsized on the frog, and every specimen carrying
  // "Internal Organs", "Visceral Organs" or "Nervous System" lost half the word.
  it.each(DISSECTION_PATHS)('lets phone layer chips size to their own name in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const rule = source.match(/\.diss-layer-button \{ [^}]*scroll-snap-align: start; \}/);
    expect(rule, 'phone layer chip rule').not.toBeNull();
    expect(rule[0]).toContain('width: max-content');
    expect(rule[0]).toContain('min-width: 8.6rem');
    expect(rule[0]).toContain('max-width: 100%');
    // A shrinking flex item would undo the width entirely.
    expect(rule[0]).toContain('flex: 0 0 auto');
  }, 60_000);

  // 2026-09-04, measured with a 120px header above the tool: both skip links hid themselves with
  // `transform` alone, which moves the paint and not the hit box. They landed at y=40 and y=52
  // inside that header, still opaque to elementFromPoint, 252px and 319px wide, at z-index 1000,
  // so a click on the shell control underneath opened a skip link instead.
  it.each(DISSECTION_PATHS)('takes the hidden skip links out of the hit test in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const hidden = source.match(/\.diss-skip-link \{[^}]*\}/);
    expect(hidden, 'skip link rule').not.toBeNull();
    expect(hidden[0]).toContain('pointer-events: none');
    expect(hidden[0]).toContain('opacity: 0');
    const focus = source.match(/\.diss-skip-link:focus \{[^}]*\}/);
    expect(focus, 'skip link focus rule').not.toBeNull();
    expect(focus[0]).toContain('pointer-events: auto');
    expect(focus[0]).toContain('opacity: 1');
    expect(focus[0]).toContain('translateY(0)');
  }, 60_000);

  // The system colour key drew 7px labels in 40%-opaque white directly onto the specimen, so only
  // the row that happened to fall on the dark readiness card was legible. It now has its own
  // ground, opaque text and a measured width, and starts below that card.
  it.each(DISSECTION_PATHS)('gives the system colour legend its own readable ground in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const start = source.indexOf('// System color legend (top-right)');
    expect(start, 'legend block').toBeGreaterThan(-1);
    const block = source.slice(start, start + 2400);
    expect(block).not.toContain("rgba(255,255,255,0.4)");
    expect(block).not.toContain("ctx.font = '7px");
    expect(block).toContain("ctx.font = 'bold 9px");
    expect(block).toContain('legendPanelX');
    expect(block).toContain("ctx.fillStyle = 'rgba(15,23,42,0.88)'");
    expect(block).toContain("ctx.fillStyle = '#e2e8f0'");
    // Width follows the longest label rather than a fixed inset off the right edge.
    expect(block).toContain('ctx.measureText(legendLabels[lm]).width');
    expect(block).not.toContain('W - 58');
  }, 60_000);

  // The specimen chip and the orientation compass both claimed x14 at the top of the canvas;
  // the compass painted second and covered the specimen name.
  it.each(DISSECTION_PATHS)('keeps the orientation compass clear of the specimen chip in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const at = source.indexOf('var compassX = 14, compassY = 14;');
    expect(at, 'compass origin').toBeGreaterThan(-1);
    const after = source.slice(at, at + 260);
    expect(after).toContain('if (specimenHudX < 20) compassY =');
    expect(after).toContain('30 * canvasHudScale');
  }, 60_000);

  // 2026-09-04, clarity pass. The secondary control band was named "Secondary lab controls" and,
  // in Essentials, rendered as a full-width shelf holding one button labelled only "View" -- while
  // the panel it opens is named "View and accessibility controls" and holds high contrast, larger
  // text, reduced motion, simplified steps, sound and tactile feedback.
  it.each(DISSECTION_PATHS)('says what the secondary control band holds in %s', (filePath) => {
    const root = render(filePath, {});
    const bar = root.querySelector('.diss-toolbar');
    expect(bar, 'control band').not.toBeNull();
    expect(bar.getAttribute('aria-label')).toBe('Specimen display and lab tool controls');

    // A visible label, so the row is not a wide empty shelf around one button.
    const label = bar.querySelector('.diss-toolbar__label');
    expect(label, 'band label').not.toBeNull();
    expect(label.textContent.trim()).toBe('Controls');
    // The toolbar's own name already covers it; the label must not be announced twice.
    expect(label.getAttribute('aria-hidden')).toBe('true');
    // The roving-tabindex handler selects buttons, so a span cannot land in the key order.
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain("querySelectorAll('button:not([disabled])')");

    const trigger = bar.querySelector('button');
    expect(trigger.getAttribute('aria-label')).toBe('View and accessibility options');
    expect(trigger.textContent).toContain('View & access');
    // aria-expanded carries the state, so the name must not repeat it as "Toggle".
    expect(trigger.getAttribute('aria-label')).not.toContain('Toggle');
    expect(trigger.hasAttribute('aria-expanded')).toBe(true);
  }, 60_000);

  // Twelve of the fourteen toggles in that panel printed their state; "Labels" and "High contrast"
  // left a blue fill as the only cue, which is colour carrying meaning on its own.
  it.each(DISSECTION_PATHS)('prints the state of every toggle in the view panel in %s', (filePath) => {
    const root = render(filePath, { toolbarViewOpen: true });
    const panel = root.querySelector('#diss-view-tools');
    expect(panel, 'view panel').not.toBeNull();
    const toggles = [...panel.querySelectorAll('button[aria-pressed]')];
    expect(toggles.length).toBeGreaterThan(6);
    for (const button of toggles) {
      const text = button.textContent.replace(/\s+/g, ' ').trim();
      // Either an on/off word, or a named value such as "Focus: structure" / "Unpin lens".
      expect(text, text).toMatch(/( on| off|:|Unpin|Pin )/);
    }
    const labels = toggles.find((b) => b.textContent.includes('Labels'));
    expect(labels.textContent).toMatch(/Labels (on|off)/);
    const contrast = toggles.find((b) => b.textContent.includes('High contrast'));
    expect(contrast.textContent).toMatch(/High contrast (on|off)/);
  }, 60_000);

  // 2026-09-04: in multiple-choice mode the pointer hint said "Use the answer choices below the
  // specimen", but the assessment panel is the right-hand column on desktop, and every other
  // string in the tool says "in the assessment panel". A student was told to look in the wrong
  // place by the one message printed next to the specimen.
  it.each(DISSECTION_PATHS)('points at the assessment panel, not below the specimen, in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).not.toContain('answer choices below the specimen');
    const at = source.indexOf("label: 'Identify a structure'");
    expect(at, 'identify pointer mode').toBeGreaterThan(-1);
    expect(source.slice(at, at + 400)).toContain('Choose an answer in the assessment panel.');
  }, 60_000);

  // Measured in the assessment panel: the answer buttons were bordered #fde68a on white -- a 1.2:1
  // boundary, effectively invisible -- while the "how do you want to answer" toggle beside them was
  // fully saturated. The primary action was the quietest thing on the panel.
  it.each(DISSECTION_PATHS)('gives assessment answers a visible boundary in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const at = source.indexOf("'diss-quiz-option transition-colors");
    expect(at, 'answer option class').toBeGreaterThan(-1);
    const decl = source.slice(at, at + 160);
    // #d97706 clears the 3:1 non-text contrast bar against white; #fde68a does not.
    expect(decl).toContain('border-amber-600');
    expect(decl).not.toContain('border-amber-200');
    // The compiled bundle ships no `hover:` variants, so that class was doing nothing.
    expect(source).not.toContain('hover:border-amber-400');
    expect(source).toContain('.diss-quiz-option:hover:not(:disabled)');
    expect(source).toContain('.diss-quiz-option:focus-visible');
  }, 60_000);

  // 2026-09-04, visual pass on the specimen diagram. Each frog limb was three independent tapered
  // shapes, every one filled AND stroked, so at every knee, ankle, elbow and wrist the outline of
  // one ran across the face of the next and the outside of each bend showed a notch: the leg read
  // as three flat facets rather than a limb.
  it.each(DISSECTION_PATHS)('draws each frog limb as one smooth chain in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('function drawFrogLimbChain(points, radii, alpha)');
    // Averaged vertex normals are what carry the outline through a joint without a corner.
    expect(source).toContain('normals.push({ x: -ay / nl, y: ax / nl');
    // One fill and one stroke for the whole chain, so no interior outline crosses the limb.
    const at = source.indexOf('function drawFrogLimbChain');
    const body = source.slice(at, source.indexOf('function drawFrogHindFoot', at));
    expect(body.split('ctx.fill()').length - 1).toBe(1);
    expect(body.split('ctx.stroke()').length - 1).toBe(1);
    // The per-segment helper it replaced must be gone, not left behind as dead code.
    expect(source).not.toContain('drawFrogLimbSegment');
    // Hips and shoulders are capped in the torso pass so no seam or outline crosses the join.
    expect(source).toContain('function drawFrogJointCap(jointX, jointY, capRadius)');
    expect(source).toContain('drawFrogJointCap(cx + jointSide * W * 0.115');
    expect(source).toContain('drawFrogJointCap(cx + jointSide * W * 0.145');
  }, 60_000);

  // The ventral view mirrors the specimen about cx = W/2. Three screen-fixed overlays were drawn
  // inside that transform and came out back to front: the colour key, the safety-corridor label,
  // and the next-step card (which also jumped to the left, on top of the specimen chip).
  it.each(DISSECTION_PATHS)('keeps screen-fixed canvas overlays unmirrored in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const restoreAt = source.indexOf('// End deterministic specimen-proportion transform');
    expect(restoreAt, 'transform restore').toBeGreaterThan(-1);
    // The colour key belongs after the transform is restored, not inside it.
    expect(source.indexOf('// System color legend (top-right)')).toBeGreaterThan(restoreAt);
    // The corridor label stays inside (it tracks the corridor) so it flips its own glyphs back.
    expect(source).toContain('fillReadableSpecimenText(corridorDepthLabel, corridorTextX');
    expect(source).toContain('var corridorTextX = specimenScale.x < 0 ?');
    // The next-step card keeps its leader line, so it mirrors its anchor instead of moving.
    expect(source).toContain('var handoffLabelX = specimenScale.x < 0 ? 10 :');
    expect(source).toContain('fillReadableSpecimenText(handoffTitle.slice(0, 34)');
  }, 60_000);

  // 2026-09-04: the same defect class as the frog limbs, in the other specimens.
  // The pig's near-side legs are drawn after the torso so they read as the near side, which left
  // each rounded limb end sitting ON the flank as a separate tube with its own dark outline.
  it.each(DISSECTION_PATHS)('grows the pig near-side limbs out of the torso silhouette in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const at = source.indexOf('// Near-side limbs show different flexion');
    expect(at, 'near-side limbs').toBeGreaterThan(-1);
    const block = source.slice(at, at + 1200);
    // Clip to everything OUTSIDE the torso: the root hides behind the body wall.
    expect(block).toContain('tracePigBody();');
    expect(block).toContain('ctx.rect(0, 0, W, H);');
    expect(block).toContain("ctx.clip('evenodd')");
    // Both near-side limbs must be inside that clip, and it must be released after.
    const clipAt = block.indexOf("ctx.clip('evenodd')");
    const restoreAt = block.indexOf('ctx.restore();', clipAt);
    expect(restoreAt).toBeGreaterThan(clipAt);
    const clipped = block.slice(clipAt, restoreAt);
    expect(clipped.split('drawPigLimb(').length - 1).toBe(2);
  }, 60_000);

  // The crayfish claw palm is sized from the canvas (W * 0.043) but the arm carrying it used fixed
  // pixel radii, so at desktop width a heavy pincer hung off a hairline, and the proportion
  // changed with canvas size.
  it.each(DISSECTION_PATHS)('scales the crayfish cheliped arm with the canvas in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const at = source.indexOf('function drawCrayCheliped(side)');
    expect(at, 'cheliped').toBeGreaterThan(-1);
    const block = source.slice(at, at + 900);
    expect(block).not.toContain('elbowY, 5.5, 4.5');
    expect(block).not.toContain('wristY, 4.2, 3.4');
    const arms = block.split('drawCraySegment(').slice(1).map((part) => part.slice(0, part.indexOf(')')));
    expect(arms.length).toBe(2);
    for (const call of arms) expect(call, call).toContain('W * 0.0');
  }, 60_000);
});
