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
    // Window widened twice as comments were added inside the block; a too-small window here
    // fails exactly like a behaviour break, so measure the distance before believing the diff.
    const block = source.slice(start, start + 3600);
    expect(block).not.toContain("rgba(255,255,255,0.4)");
    expect(block).not.toContain("ctx.font = '7px");
    // 2026-09-05: the key's type now scales with canvasHudScale (1 at desktop width).
    expect(block).toContain("ctx.font = 'bold ' + (9 * canvasHudScale) + 'px");
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
    const after = source.slice(at, at + 600);
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
    // The title and the instruction now go through fillPanelText, which applies the same
    // mirrored anchor, and are fitted to the card width instead of cut at a character count.
    expect(source).toContain('fillPanelText(fitTextToWidth(handoffTitle, handoffTextWidth)');
    expect(source).toContain("wrapTextToWidth(String(nextInfo.label || ''), handoffTextWidth, 2)");
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

  // 2026-09-04. The specimen transform mirrors x in the ventral view (specimenScale.x = -1) and
  // squashes it to 0.66 in the lateral view. Anatomy labels painted straight onto the specimen
  // inside that transform came out back to front: confirmed by screenshot on Sheep Heart,
  // Internal layer, ventral view, where the chamber labels read in reverse. fillReadableSpecimenText
  // cancels the specimen scale around the anchor, so the glyphs run the right way while the label
  // still travels with its feature; it is the identity transform in the dorsal view.
  it.each(DISSECTION_PATHS)('draws specimen anatomy labels through the un-mirroring helper in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const labels = [
      "'thorax'", "'abdomen'", "'Area centralis'", "'Optic disc'",
      "'SA Node'", "'AV Node'", "'Bundle of His'", "'Purkinje Fibers'",
      "'LA'", "'LV'", "'RA'", "'RV'", "'mitral'", "'tricuspid'",
    ];
    for (const label of labels) {
      expect(source, label).not.toContain('ctx.fillText(' + label + ',');
      expect(source, label).toContain('fillReadableSpecimenText(' + label + ',');
    }
    // The ray label and the ECG readout live in the same transform. Both were moved off a
    // literal argument in round 22 (one is clamped to the tray frame, the other right-aligned
    // inside its own panel), so they are pinned by their helper call instead of by literal.
    expect(source).toContain('fillReadableSpecimenText(refractedLabel, refractedAnchorX');
    expect(source).toContain('fillPanelText(bpmText, ecgX - 5, ecgW + 10');
    expect(source).not.toContain("ctx.fillText(bpm + ' BPM'");
    expect(source).not.toContain("ctx.fillText('Refracted light'");
  }, 60_000);

  // 2026-09-05. Instrument HUD panels sit inside the specimen transform because each tracks a
  // point on the specimen, but they read as panels with a background box. In the ventral view the
  // box mirrors as a whole, so left-inset text landed at the box's far edge and ran out of it.
  it.each(DISSECTION_PATHS)('anchors instrument HUD panel text from the mirrored edge in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('function fillPanelText(text, panelX, panelWidth, inset, y)');
    expect(source).toContain('specimenScale.x < 0 ? panelX + panelWidth - inset : panelX + inset');

    // Every panel draw inside the transform must go through it. The transform closes at the
    // "End deterministic specimen-proportion transform" restore; anything after it is screen-fixed.
    const close = source.indexOf('// End deterministic specimen-proportion transform');
    expect(close, 'transform restore').toBeGreaterThan(-1);
    const inside = source.slice(0, close);
    const rawPanelDraws = inside.split(String.fromCharCode(10)).filter((line) => {
      return line.indexOf('ctx.fillText(') >= 0 && /LabelX \+ \d/.test(line);
    });
    expect(rawPanelDraws, rawPanelDraws.join(' | ')).toEqual([]);

    // The panels themselves, so a new one cannot quietly skip the helper.
    for (const panel of ['tractionLabelX', 'forecastLabelX', 'wickLabelX', 'palpationLabelX',
      'pinLabelX', 'replayLabelX', 'clearLabelX', 'probeLabelX']) {
      expect(source, panel).toContain('fillPanelText(');
      expect(inside, panel).toContain(panel + ',');
    }
  }, 60_000);

  // 2026-09-05, measured by hooking every panel-sized fill and comparing boxes in screen space:
  // the decorative instrument bay sat at [W-142, W-20] x [H-94, H-37] and the functional scale
  // and orientation compass at [W-158, W-14] x [H-62*scale-14, H-14]. The compass paints later,
  // so it covered ~64% of the bay on every specimen and every view.
  it.each(DISSECTION_PATHS)('keeps the instrument bay clear of the scale compass in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // The bay must derive its position from the constants the compass uses, not a fixed offset,
    // so the two stay apart at any HUD scale.
    expect(source).not.toContain('instrumentBayY = H - 94');
    // 2026-09-06: the formula moved to the hoisted box so the lens lift can clamp against it.
    expect(source).toContain('var hudInstrumentBayY = H - 62 * canvasHudScale - 24 - hudInstrumentBayH;');
    expect(source).toContain('var instrumentBayY = hudInstrumentBayY;');
    // The compass side of the pair, so a change there is caught against the bay above it.
    expect(source).toContain('compassHeight = 62 * canvasHudScale');
    // Height must be declared before it is used in the Y calculation.
    const hAt = source.indexOf('var hudInstrumentBayH = 57;');
    const yAt = source.indexOf('var hudInstrumentBayY = H - 62 * canvasHudScale');
    expect(hAt, 'bay size').toBeGreaterThan(-1);
    expect(yAt).toBeGreaterThan(hAt);
  }, 60_000);

  // 2026-09-05. Round 10 moved the orientation compass down to clear the specimen chip, but the
  // slot it moved into was already taken by the fixed "View: <name>" chip at (14, 50, 118, 24).
  // The compass paints later, so that chip was simply lost: measured at 96% covered on the pig
  // (horizontal compass, 188x55) and the same on the frog (vertical, 126x91).
  it.each(DISSECTION_PATHS)('stacks the three top-left canvas panels without covering one in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // The compass must clear BOTH the specimen chip and the View chip below it.
    expect(source).toContain('if (specimenHudX < 20) compassY = Math.max(82, 13 + 30 * canvasHudScale + 8);');
    expect(source).not.toContain('if (specimenHudX < 20) compassY = 13 + 30 * canvasHudScale + 8;');
    // The View chip whose box that 82 is derived from. If it moves, this must be recomputed.
    expect(source).toContain('ctx.roundRect(14, 50, 118, 24, 7)');
  }, 60_000);

  // 2026-09-05. Card text was cut with a fixed character count, which cannot know the font or
  // the box it has to fit: on the perch the guided next-step card read "Inspect lateral
  // landmarks and locate t", chopped mid-word with nothing to say anything was missing.
  it.each(DISSECTION_PATHS)('fits canvas card text by measuring it in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // Both helpers must measure against the real box, not count characters.
    expect(source).toContain('function fitTextToWidth(text, maxWidth) {');
    expect(source).toContain('function wrapTextToWidth(text, maxWidth, maxLines) {');
    expect(source).toContain('if (!(maxWidth > 0) || ctx.measureText(fitSource).width <= maxWidth) return fitSource;');
    // The three blind slices this replaced must not come back.
    expect(source).not.toContain('handoffTitle.slice(0, 34)');
    expect(source).not.toContain(').slice(0, 38)');
    expect(source).not.toContain('compassStatus.slice(0, 27)');
    expect(source).toContain('fitTextToWidth(compassStatus, compassW - 18 * canvasHudScale)');
    // The card was resized to hold the sentence rather than the sentence cut to the card.
    expect(source).toContain('var handoffLabelWidth = 208, handoffLabelHeight = 58 * canvasHudScale;');
  }, 60_000);

  // 2026-09-05. The horizontal orientation compass centred ANTERIOR and POSTERIOR on the axis
  // endpoint markers, which sit 15px inside a 188px panel. Both labels are wider than 30px, so
  // the panel border cut the first and last letters off on every horizontal-axis specimen.
  it.each(DISSECTION_PATHS)('keeps the compass endpoint labels inside the panel in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('var clampCompassEndLabel = function (endLabel, endX) {');
    expect(source).toContain('return Math.max(compassX + compassEndInset + endHalf, Math.min(compassX + compassW - compassEndInset - endHalf, endX));');
    // Clamping is worthless if the label is still placed at the raw endpoint.
    expect(source).not.toContain('ctx.fillText(compass.start.slice(0, 12), axisStartX');
    expect(source).not.toContain('ctx.fillText(compass.end.slice(0, 12), axisEndX');
  }, 60_000);

  // 2026-09-05. The backing buffer was pinned at the 500x600 logical size while the stylesheet
  // stretches the element across its column, so on a 650px column every frame was rasterised
  // small and blown up 1.3x: 7px HUD text was smeared over 9px and read as soft everywhere.
  it.each(DISSECTION_PATHS)('rasterises the canvas at its displayed density in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('var renderScale = Math.max(1, Math.min(3, renderDevicePixelRatio * (renderCssWidth / Math.max(1, renderLogicalW))));');
    // Guarded, or a steady layout reallocates the buffer on every frame.
    expect(source).toContain('if (Math.abs(renderScale - (Number(canvas._dpr) || 0)) > 0.02) {');
    // The logical size must be pinned first: without it canvas.width reads back as the NEW
    // buffer size and the buffer grows by the display ratio every frame.
    const pinAt = source.indexOf('if (!canvas._logicalW) canvas._logicalW = canvas.width || 500;');
    const scaleAt = source.indexOf('var renderScale = Math.max(1, Math.min(3,');
    expect(pinAt, 'logical size pin').toBeGreaterThan(-1);
    expect(scaleAt).toBeGreaterThan(pinAt);
    // Drawing space is unchanged, so no tuned HUD constant moves.
    expect(source).toContain('width: 500, height: 600,');
  }, 60_000);

  // 2026-09-05. The instrument bay is bench scenery but is painted inside the specimen
  // transform, so the ventral mirror threw the whole tray into the bottom-LEFT corner and
  // reversed its caption into "YAB TNEMURTSNI". Same defect class as the corridor label and
  // the next-step card, missed on this one panel.
  it.each(DISSECTION_PATHS)('holds the instrument bay corner and caption under the ventral mirror in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('var instrumentBayX = specimenScale.x < 0 ? 20 : W - 142;');
    expect(source).not.toContain('var instrumentBayX = W - 142;');
    // The caption must go through the helper that flips the glyphs back.
    expect(source).toContain("fillPanelText('INSTRUMENT BAY', instrumentBayX, instrumentBayW, 9, instrumentBayY + 12)");
    expect(source).not.toContain("ctx.fillText('INSTRUMENT BAY'");
  }, 60_000);

  // 2026-09-05. Same defect class the frog limbs had, in the earthworm: the clitellum width
  // switched from 1 to 1.16 at a single t, so the glandular saddle stood off the body as a
  // hard shelf with square ends and read as a translucent rectangle pasted over the worm.
  it.each(DISSECTION_PATHS)('eases the earthworm clitellum into the body wall in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // The step that produced the shelf.
    expect(source).not.toContain('var clitellumExpansion = t >= 0.29 && t <= 0.39 ? 1.16 : 1;');
    // Smoothstep in and out, with the plateau still covering the drawn band 0.29-0.39.
    expect(source).toContain('var clitellumRampIn = (t - 0.245) / 0.045;');
    expect(source).toContain('var clitellumRampOut = (0.435 - t) / 0.045;');
    expect(source).toContain('var clitellumExpansion = 1 + 0.16 * clitellumBlend * clitellumBlend * (3 - 2 * clitellumBlend);');
    // The band itself must still be traced from the body frame, not as its own box.
    expect(source).toContain('traceEarthwormBand(0.29, 0.39, 1.015);');
  }, 60_000);

  // 2026-09-05. The worst defect found in this review. Three specimens store the Skeleton
  // layer colour as 'var(--allo-stem-text, #e2e8f0)'. Canvas 2D silently ignores a custom
  // property assigned to fillStyle, but gradient.addColorStop THROWS on one, and the throw
  // aborts the whole frame: choosing Skeleton on the frog, the fetal pig or the perch left an
  // empty tray with the bench scenery and nothing else. Measured ink in the specimen region
  // went from 964 to 17012 on the frog once the property is resolved.
  it.each(DISSECTION_PATHS)('resolves CSS custom properties before they reach the canvas in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('function resolveCanvasColor(value, element) {');
    // A resolved value can itself be another var(), which canvas cannot take either.
    expect(source).toContain("if (varResolved.indexOf('var(') >= 0) varResolved = '';");
    // Every site that feeds a layer colour to the canvas must go through it. The gradient
    // one is the site that actually threw.
    expect(source).toContain("var layerColor = resolveCanvasColor(curLayer.color, canvas) || '#94a3b8';");
    expect(source).toContain("var layerStroke = resolveCanvasColor(curLayer.accent, canvas) || '#94a3b8';");
    expect(source).toContain('fromColor: resolveCanvasColor(fromLayerDef.color)');
    expect(source).toContain('var occlusionLayer = resolveCanvasColor((spec.layers[currentLayerIdx] || {}).color, canvas)');
    expect(source).toContain('ctx.fillStyle = resolveCanvasColor(layer.color, canvas)');
    // No raw layer colour may reach the canvas any more.
    expect(source).not.toContain("var layerColor = curLayer.color || '#94a3b8';");
    expect(source).not.toContain("var layerColor = ((spec.layers[currentLayerIdx] || {}).color) || '#d89b8f';");
    expect(source).not.toContain("var layerColor = ((spec.layers[currentLayerIdx] || {}).color) || '#a87579';");
    // The premise: the three records that made this reachable are still var()-valued, so if
    // someone converts them to hex this guard is telling the truth about a different world.
    const varLayers = source.split("color: 'var(--allo-stem-text, #e2e8f0)'").length - 1;
    expect(varLayers, 'skeleton layers still var()-valued').toBe(3);
  }, 60_000);

  // 2026-09-05. The "Adaptive labels - N compact - hover to expand" chip is centred in the
  // bottom band, and the scale HUD paints after it in the same band from the right edge, so
  // the chip read "hover to expa" on every specimen with compact labels.
  it.each(DISSECTION_PATHS)('keeps the adaptive-label chip clear of the scale HUD in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('var screenDeclutterRightLimit = (screenDeclutterY + screenDeclutterHeight > compassY) ? compassX - 8 : W - 14;');
    expect(source).toContain('var screenDeclutterX = Math.max(14, Math.min((W - screenDeclutterWidth) / 2, screenDeclutterRightLimit - screenDeclutterWidth));');
    // Fitted to what is left rather than clipped by the box.
    expect(source).toContain('var screenDeclutterText = fitTextToWidth(screenDeclutter, screenDeclutterSpan - 18 * screenGuideScale);');
    expect(source).not.toContain('var screenDeclutterHeight = 22 * screenGuideScale, screenDeclutterX = (W - screenDeclutterWidth) / 2;');
    // One derivation of the scale HUD box, hoisted above the overlay that has to avoid it.
    const hoistAt = source.indexOf('var compassX = W - compassWidth - 14;');
    const callAt = source.indexOf('drawFinalScreenGuidanceOverlay();');
    expect(hoistAt, 'hoisted compass box').toBeGreaterThan(-1);
    expect(callAt).toBeGreaterThan(hoistAt);
    expect(source.split('var compassX = W - compassWidth - 14;').length - 1, 'single derivation').toBe(1);
  }, 60_000);

  // 2026-09-05. The sheep eye labels its incoming ray "Refracted light" at the ray origin,
  // well LEFT of the eye. The ventral transform mirrors about cx, so that anchor landed at
  // the right canvas edge and the word ran off it. Clamping to the canvas alone was not
  // enough either: the decorative tray frame sits about 12px inside the edge, so the last
  // letter still sat on the border. Measured landing: screenX 587 of a 650px buffer before.
  it.each(DISSECTION_PATHS)('clamps the eye ray label inside the tray frame in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('var refractedScreenX = specimenScale.x < 0 ? 2 * cx - refractedAnchorX : refractedAnchorX;');
    expect(source).toContain('refractedScreenX = Math.max(20, Math.min(W - refractedWidth - 20, refractedScreenX));');
    // Clamped in screen space, then mapped back, or the clamp would be mirrored too.
    expect(source).toContain('refractedAnchorX = specimenScale.x < 0 ? 2 * cx - refractedScreenX : refractedScreenX;');
    expect(source).not.toContain("fillReadableSpecimenText('Refracted light', eyeCx - eyeRx * 1.46");
  }, 60_000);

  // 2026-09-05. The sheep heart ECG strip sat at H - 35 across 60% of the width, centred: the
  // scale card covered its right third, the layer pill its left end, and the "72 BPM" readout
  // was drawn 8px OUTSIDE the panel, landing inside the scale card in the dorsal view and on
  // the layer pill in the ventral one.
  it.each(DISSECTION_PATHS)('keeps the ECG strip and its readout clear of the bottom HUD in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).not.toContain('var ecgY = H - 35; var ecgW = W * 0.6; var ecgX = (W - ecgW) / 2;');
    expect(source).toContain('var ecgY = H - 95;');
    // Sized so it cannot reach the instrument bay, whose left edge is W - 142, at any width.
    expect(source).toContain('var ecgW = Math.min(W * 0.46, W - 172);');
    expect(source).toContain('var instrumentBayX = specimenScale.x < 0 ? 20 : W - 142;');
    // Painted inside the specimen transform, so its anchor mirrors like every other panel.
    expect(source).toContain('var ecgX = specimenScale.x < 0 ? W - 20 - ecgW : 20;');
    // The readout belongs inside the panel, right-aligned, not 8px past its edge.
    expect(source).toContain('fillPanelText(bpmText, ecgX - 5, ecgW + 10, ecgW + 10 - 6 - bpmWidth, ecgY + 13);');
    expect(source).not.toContain("fillReadableSpecimenText(bpm + ' BPM', ecgX + ecgW + 8, ecgY)");
  }, 60_000);

  // 2026-09-05. The corridor safety label is laid out before the adaptive hotspot pills but
  // PAINTED before them too, so the pills landed on top of it: on the perch in accessible mode
  // "SAFE - LATERAL WINDOW" was half covered by the "Lateral Line" pill, and on the pig by an
  // exposure marker. Accessible mode enlarges those targets, so it is worst exactly where
  // legibility matters most. The label now picks the position that overlaps them least.
  it.each(DISSECTION_PATHS)('moves the corridor safety label off the hotspot pills in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('var corridorLabelOverlapAt = function (candidateX, candidateY) {');
    // Both the pill box AND the marker cluster painted at the structure point count.
    expect(source).toContain('addCorridorOverlap(labelItem.x, labelItem.y, labelItem.width, labelItem.height);');
    expect(source).toContain('addCorridorOverlap(labelItem.pointX - 14, labelItem.pointY - 14, 28, 28);');
    // A vertical-only search is not enough: on the frog every slot directly above the corridor
    // is taken, so the label has to be free to slide ALONG the corridor as well as across it.
    expect(source).toContain('[0.5, 0.28, 0.72, 0.12, 0.88].forEach(function (corridorT) {');
    expect(source).toContain('var alongPoint = corridorPointAt(corridorT);');
    expect(source).toContain('corridorLabelX = candidateX; corridorLabelY = clampedY;');
    // The authored position is still tried first and kept when nothing overlaps it.
    expect(source).toContain('var corridorLabelBest = corridorLabelOverlapAt(corridorLabelX, corridorLabelY);');
    expect(source).toContain('if (corridorLabelBest > 0) {');
    // Both axes clamp inside the canvas, or the dodge can push the label out of view.
    expect(source).toContain('var corridorLabelClampX = function (value) {');
    expect(source).toContain('var corridorLabelClampY = function (value) {');
    // The badge box must use the same height the overlap test assumes.
    expect(source).toContain('var corridorLabelHeight = 17;');
    expect(source).toContain('ctx.roundRect(corridorLabelX, corridorLabelY, corridorLabelWidth, corridorLabelHeight, 5)');
    expect(source).not.toContain('ctx.roundRect(corridorLabelX, corridorLabelY, corridorLabelWidth, 17, 5)');
  }, 60_000);

  // 2026-09-05. The canvas colour key and the structure directory each carried their own
  // body-system colour map and the two disagreed on three of eight systems. On excretory they
  // disagreed on HUE - violet in the key, lime in the directory - so the key pointed a student
  // at the wrong dot, and the violet also duplicated the nervous system one row above it.
  it.each(DISSECTION_PATHS)('keys body systems from one colour table in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('var DISSECTION_SYSTEM_COLORS = {');
    expect(source).toContain('function dissectionSystemColor(systemId, surface) {');
    // Both surfaces read the same table.
    expect(source).toContain("ctx.fillStyle = dissectionSystemColor(legendSys[li], 'onDark'); ctx.fill();");
    expect(source).toContain("var dotColor = orgSys ? dissectionSystemColor(orgSys, 'onLight') : '#94a3b8';");
    // Neither local map may come back.
    expect(source).not.toContain('var sysColors = {');
    expect(source).not.toContain('var sysColorsMap = {');
    // Excretory must not be violet again: that is the hue that collided with nervous.
    expect(source).not.toContain("excretory: '#a78bfa'");
    expect(source).toContain("excretory: { onDark: '#a3e635', onLight: '#84cc16' },");
    // The table must still cover every system the key lists, or a row falls back to grey.
    const listed = source.match(/var legendSys = \[([^\]]+)\]/);
    expect(listed, 'legend system list').toBeTruthy();
    for (const raw of listed[1].split(',')) {
      const systemId = raw.trim().replace(/'/g, '');
      expect(source, systemId).toContain(systemId + ': { onDark:');
    }
  }, 60_000);

  // 2026-09-05. The canvas buffer is a fixed 500x600 whatever the column width, so on a phone
  // it is squeezed into ~323px and everything drawn at a fixed pixel size renders at about two
  // thirds. The specimen chip and the scale card already compensate through canvasHudScale; the
  // colour key, the orientation compass and the guided next-step card never did, so their 7-9px
  // type came out around 5px. canvasHudScale is exactly 1 at desktop width, so finishing that
  // pattern is a phone-only change: five desktop renders stayed pixel-identical.
  it.each(DISSECTION_PATHS)('scales the remaining canvas HUD panels with the display in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // Colour key.
    expect(source).toContain("ctx.font = 'bold ' + (9 * canvasHudScale) + 'px Inter, system-ui';");
    expect(source).toContain('var legendRowHeight = 13 * canvasHudScale;');
    expect(source).toContain('ctx.beginPath(); ctx.arc(lx, ly, 3.2 * canvasHudScale, 0, Math.PI * 2);');
    // Compass: type scales, width follows the text so the panel does not swell into the
    // corridor safety label, and the authored widths stay the floor.
    expect(source).toContain('var hudCompassTitleWidth = 0;');
    expect(source).toContain('? Math.max(188, hudCompassTitleWidth + 30 * canvasHudScale)');
    expect(source).toContain(': Math.max(126, hudCompassTitleWidth + 30 * canvasHudScale);');
    expect(source).not.toContain("var compassW = compass.axis === 'horizontal' ? 188 : 126;");
    // One derivation: the compass reads the box published before the corridor label runs.
    expect(source).toContain('var compassW = hudCompassW;');
    expect(source).toContain('var compassH = hudCompassH;');
    // Next-step card: height and type scale, width deliberately does not.
    expect(source).toContain('var handoffLabelWidth = 208, handoffLabelHeight = 58 * canvasHudScale;');
    expect(source).toContain('var handoffTextInset = 8 * canvasHudScale,');
  }, 60_000);

  // 2026-09-05. Scaling the top-row panels made two of them collide with their neighbours: the
  // specimen chip grew into the next-step card, and the card grew down into the colour key.
  it.each(DISSECTION_PATHS)('keeps the scaled top-row canvas panels apart in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // The chip stops short of the 218px the card owns, and ellipsises rather than overlapping.
    expect(source).toContain('var specimenHudTypeScale = Math.min(canvasHudScale, 1.3);');
    expect(source).toContain('var specimenHudWidth = Math.min(W - 236, Math.max(154 * specimenHudTypeScale,');
    expect(source).not.toContain('var specimenHudWidth = Math.min(W - 28,');
    expect(source).toContain('ctx.fillText(fitTextToWidth(specimenHudLabel, specimenHudWidth - 21 * specimenHudTypeScale)');
    // The key clears the card at any HUD scale, and at scale 1 lands on its authored 74.
    expect(source).toContain('legendPanelY = Math.max(74, 10 + 58 * canvasHudScale + 6);');
    // The corridor label treats the compass as an obstacle, reflected into the mirrored space
    // it is drawn in. Without the reflection the test would silently never fire in ventral.
    expect(source).toContain('var hudCompassBox = (sceneDetail && !d.quizMode)');
    expect(source).toContain('addCorridorOverlap(specimenScale.x < 0 ? 2 * cx - hudCompassBox.x - hudCompassBox.w : hudCompassBox.x,');
  }, 60_000);

  // 2026-09-05. Driven from a real keyboard in Chromium: on the frog Organs layer nothing is
  // exposed until the procedure opens it, so the Arrow branch hit `if (!keyboardOrgans.length)
  // return;` and did nothing at all - no state change, no announcement - while the canvas ready
  // message was saying "Arrow keys preview visible structures" and the Enter branch answered
  // "Use an Arrow key, Home, or End to preview a structure first". A keyboard-only user was sent
  // round in a circle with no way to find out why. Home and End had no guard at all and called
  // keyboardPreview(undefined), which also returns in silence.
  it.each(DISSECTION_PATHS)('explains why keyboard browsing has nothing to walk in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('function announceKeyboardStructureGap(moveFocus) {');
    expect(source).toContain("if (!keyboardOrgans.length) { announceKeyboardStructureGap(false); return; }");
    // The silent return must not come back.
    expect(source).not.toContain('if (!keyboardOrgans.length) return;');
    // It has to name where the structures actually are.
    expect(source).toContain('are listed in the structure directory beside the specimen');
    expect(source).toContain("focusDissectionTarget('diss-structure-directory')");
    // Home and End are guarded too, not just the Arrow keys.
    const homeAt = source.indexOf("} else if (e.key === 'Home' || e.key === 'End') {");
    expect(homeAt, 'home/end branch').toBeGreaterThan(-1);
    expect(source.slice(homeAt, homeAt + 260)).toContain('announceKeyboardStructureGap(false)');
    // Enter must not advise a key that cannot work in this state.
    expect(source).toContain('if (!keyboardOrgans.length) { announceKeyboardStructureGap(true); return; }');
  }, 60_000);

  // 2026-09-05. Inspecting a structure moves focus to the directory, and the canvas onBlur clears
  // the Arrow-key browse position along with the focus flag, so every Enter sent the user back to
  // the first structure: walking twelve structures cost a re-walk each time, while the selection
  // that same keystroke had just made stayed put. Confirmed in a browser: previewId went null on
  // Enter and the next ArrowRight restarted the list.
  //
  // The first fix - keeping the id across blur - was WRONG and an owner pin caught it: Enter would
  // then commit a preview the user had since replaced with a pointer selection. Continuity now
  // comes from the Arrow branch resuming at d.selectedOrgan, which Enter has just set, so both
  // properties hold: the walk continues and a stale preview can never be committed.
  it.each(DISSECTION_PATHS)('resumes keyboard browsing from the current selection in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // The blur clear STAYS: without it Enter could commit a preview the user had since replaced
    // with a pointer selection. Continuity comes from the Arrow branch instead, which resumes
    // from whatever is selected however that selection was made.
    expect(source).toContain('onBlur: function (e) { e.currentTarget._keyboardFocus = false; e.currentTarget._keyboardPreviewOrganId = null; }');
    expect(source).toContain('var keyboardPreviewId = target._keyboardPreviewOrganId || d.selectedOrgan;');
    // The commit path still clears it only when there was nothing to commit.
    expect(source).toContain('var keyboardCommitId = target._keyboardPreviewOrganId;');
  }, 60_000);

  // 2026-09-05. The canvas carried BOTH aria-labelledby (a 61-character span) and an aria-label
  // of 4,837 characters / 636 words. aria-labelledby wins the accessible-name computation, so
  // every word of that label was dead: Chromium's accessibility tree reported nameLen 61 from the
  // related element and listed the 4,837-character attribute as a superseded source. It shipped
  // in every render and no assistive technology ever read it. Nothing in this suite noticed,
  // because the pins assert the string exists in the SOURCE, not that it reaches a user.
  //
  // The text is kept verbatim and moved into a headed, visually hidden section so it is reachable
  // in browse mode. It is deliberately NOT in aria-describedby: that would force ~5,500 characters
  // of speech on every focus, and focus returns to this canvas after every structure inspection.
  it.each(DISSECTION_PATHS)('names the specimen canvas once, briefly, in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // The short name that actually wins, and the element it comes from.
    expect(source).toContain('React.createElement("span", { id: "diss-canvas-label", className: "diss-sr-only" }');
    expect(source).toContain("'aria-labelledby': 'diss-canvas-label',");
    // The superseded attribute must not come back on the canvas.
    expect(source).not.toContain("'aria-label': d.quizMode");
    // The description is reachable content under a heading, not an attribute.
    expect(source).toContain('React.createElement("section", { id: "diss-canvas-detail", className: "diss-sr-only", "aria-labelledby": "diss-canvas-detail-heading" }');
    expect(source).toContain('React.createElement("h4", { id: "diss-canvas-detail-heading" }, \'Specimen canvas description\')');
    // Not forced on focus: describedby stays the short status plus the equivalents summary.
    expect(source).toContain("'aria-describedby': 'diss-canvas-status diss-canvas-equivalent',");
    expect(source).not.toContain('diss-canvas-status diss-canvas-equivalent diss-canvas-detail');
    // The moved text is the same text: these are its first and last clauses.
    expect(source).toContain("spec.name + ' virtual dissection. Specimen-specific procedure: '");
    expect(source).toContain('Occluded structures remain available in the structure directory.');
  }, 60_000);

  // 2026-09-06. Measured with a MutationObserver on all seven live regions while driving the
  // canvas from a real keyboard. One ArrowRight used to queue 284 characters of speech: the
  // canvas status is aria-atomic, so appending a 40-character "Selected X in the Y layer."
  // sentence replayed the whole 221-character phase line that had not changed, and it said the
  // same thing the procedure feedback region was already announcing. Without atomic, and with
  // that sentence as its own node, the status contributes 40 characters instead of 221.
  // Visible text is unchanged, which is why the two status tests above still pass on textContent.
  it.each(DISSECTION_PATHS)('announces only what changed in the canvas status in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('React.createElement("p", { id: "diss-canvas-status", className: "diss-stage__live", "data-tool-status": "true", "data-tone": stageHandoffTone, role: "status", "aria-live": "polite" }');
    expect(source).not.toContain('"data-tone": stageHandoffTone, role: "status", "aria-live": "polite", "aria-atomic": "true"');
    // The selection sentence is a separate node, or a non-atomic region gains nothing.
    expect(source).toContain('sel ? React.createElement("span", { key: \'diss-status-selection\' }, \' Selected \' + sel.name');
    expect(source).not.toContain("+ (sel ? ' Selected ' + sel.name + ' in the ' + currentLayerDef.name + ' layer.' : '')");
  }, 60_000);

  // The same region rendered as a DOM tree: still one status line, still the same words.
  it.each(DISSECTION_PATHS)('keeps the canvas status readable as one line in %s', (filePath) => {
    const root = render(filePath, {});
    const live = root.querySelector('#diss-canvas-status');
    expect(live, 'canvas status').not.toBeNull();
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.getAttribute('aria-atomic'), 'atomic replays the whole line').toBeNull();
    const status = live.textContent.replace(/\s+/g, ' ').trim();
    expect(status.length).toBeGreaterThan(20);
  }, 60_000);

  // 2026-09-06, at Aaron's request. #diss-canvas-equivalent is in aria-describedby, so all 497
  // of its characters were spoken on EVERY focus of the canvas - and round 25 established that
  // focus returns here after every structure inspection. Only the first sentence is news on
  // focus; the four-item button enumeration and the marker-shape legend never change. Both were
  // moved verbatim into the reachable canvas description added in round 26. Measured from the
  // accessibility tree before and after: name 59 + description 678 -> name 59 + description 282.
  it.each(DISSECTION_PATHS)('keeps the on-focus canvas description short in %s', (filePath) => {
    const root = render(filePath, {});
    const equivalent = root.querySelector('#diss-canvas-equivalent');
    expect(equivalent, 'equivalents paragraph').not.toBeNull();
    const equivalentText = equivalent.textContent.replace(/\s+/g, ' ').trim();
    // The promise and where to find the detail. Anything much longer is being read aloud on
    // every focus, so this bound is the point of the change.
    expect(equivalentText.length, 'spoken on every focus').toBeLessThanOrEqual(140);
    expect(equivalentText).toContain('keyboard or button alternative');
    expect(equivalentText).toContain('specimen canvas description');
    // The enumeration is not gone, it is reachable.
    const detail = root.querySelector('#diss-canvas-detail');
    expect(detail, 'canvas description section').not.toBeNull();
    const detailText = detail.textContent.replace(/\s+/g, ' ').trim();
    expect(detailText).toContain('the pin action button instead of dragging a pin');
    expect(detailText).toContain('surface landmarks use circles');
    expect(detailText).toContain('Every canvas selection and drag action has a keyboard or button alternative.');
    // Still not forced on focus.
    const canvas = root.querySelector('canvas');
    expect(canvas.getAttribute('aria-describedby')).toBe('diss-canvas-status diss-canvas-equivalent');
  }, 60_000);

  // 2026-09-06. Measured stack above the specimen canvas: 1233px on a 1180x900 viewport, so a
  // student scrolls past more than a full laptop screen before seeing the specimen. The secondary
  // controls owned 62px of that as their own full-width band while holding ONE visible button in
  // the Essentials workspace. The layer-stepper heading is already a flex row with space-between
  // and room to spare, so they ride along it: 1233 -> 1202, and the odd full-width band is gone.
  it.each(DISSECTION_PATHS)('rides the secondary controls along the layer heading in %s', (filePath) => {
    const root = render(filePath, {});
    const bar = root.querySelector(".diss-toolbar");
    expect(bar, "controls group").not.toBeNull();
    const heading = bar.closest(".diss-section-heading");
    expect(heading, "controls sit in a section heading").not.toBeNull();
    expect(heading.closest(".diss-layer-stepper"), "and that heading is the layer stepper").not.toBeNull();
    // Still a real toolbar with its label and its toggles.
    expect(bar.getAttribute("role")).toBe("toolbar");
    expect(bar.querySelector(".diss-toolbar__label")).not.toBeNull();
    expect(bar.querySelectorAll("button").length).toBeGreaterThan(0);
    // The expanded panels stay outside the nav so aria-controls still lands on a sibling.
    expect(root.querySelector(".diss-layer-stepper #diss-view-tools"), "panel must not move into the nav").toBeNull();
  }, 60_000);

  // 2026-09-06. The scale card lifts by 76 * canvasHudScale when the inspection lens is parked in
  // its corner, and nothing stopped the lifted card landing on the instrument bay: the bay sits at
  // H - 62 * hudScale - 24 - 57 and the unclamped lift puts the card at almost exactly that Y.
  // I could NOT get the lift to fire from a harness hover, so this removes the possibility rather
  // than fixing an observed collision - the guard is the value, not a reproduction.
  it.each(DISSECTION_PATHS)('clamps the lens lift above the instrument bay in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('var hudInstrumentBayY = H - 62 * canvasHudScale - 24 - hudInstrumentBayH;');
    expect(source).toContain('if (lensNearCompass) compassY = Math.max(82, Math.max(hudInstrumentBayY + hudInstrumentBayH + 8, compassY - 76 * canvasHudScale));');
    expect(source).not.toContain('if (lensNearCompass) compassY = Math.max(82, compassY - 76 * canvasHudScale);');
    // One derivation: the scenery reads the published box rather than recomputing it.
    expect(source).toContain('var instrumentBayY = hudInstrumentBayY;');
    expect(source).toContain('var instrumentBayW = 122, instrumentBayH = hudInstrumentBayH;');
    expect(source.split('H - 62 * canvasHudScale - 24').length - 1, 'single derivation').toBe(1);
  }, 60_000);

  // 2026-09-06. First round to drive the pointer path in a real browser rather than reason about
  // it. With the scalpel selected and a genuine 18-step press-drag-release across the specimen,
  // the refusal that survived was "Use the visible pointer mode: press, drag through the planned
  // motion, then release. A tap does not record technique." - telling the student to do exactly
  // what they had just done. beginProcedureStroke had set the accurate reason and returned false;
  // the pointerup then reached canvasClick, whose coaching line assumes a tap, and overwrote it.
  // Verified after the fix by the same drag: the message is now "Cannot start Scalpel yet. ...".
  it.each(DISSECTION_PATHS)('keeps a refused gesture reason instead of tap coaching in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('function canBeginDirectInstrument(toolId, refusalEvent) {');
    expect(source).toContain('if (refusedCanvas) refusedCanvas._suppressToolClick = true;');
    // The five gestures whose refusal canvasClick would overwrite hand it the event.
    ['activeInstrument', "'forceps'", "'pin'", "'dropper'", "'wick'"].forEach((toolArg) => {
      expect(source, toolArg).toContain('canBeginDirectInstrument(' + toolArg + ', e)');
    });
    // canvasClick's own probe call must NOT arm this, or it would swallow its own next click
    // and with it the probe's structure selection.
    expect(source).toContain("if (!canBeginDirectInstrument('probe')) return;");
    expect(source).not.toContain("canBeginDirectInstrument('probe', e)");
  }, 60_000);

  // 2026-09-06. Measured at 1180x900 with the specimen scrolled into view: the canvas ran to
  // y=840 and the status line - the one sentence naming the phase and the next action, and the
  // node the canvas points at through aria-describedby - began at y=974, past the fold, with the
  // evidence notebook sitting between them. Every message the pointer path produces landed lower
  // still, 924 to 1025px below the canvas. The status now follows the canvas it describes:
  // measured again at 913. That is 61px closer and the right reading order; it is NOT yet fully
  // on screen, because a 780px canvas in a 900px viewport leaves 60px and the status needs 48.
  it.each(DISSECTION_PATHS)('puts the canvas status before the evidence notebook in %s', (filePath) => {
    const root = render(filePath, {});
    const status = root.querySelector('#diss-canvas-status');
    const notebook = root.querySelector('#diss-evidence-notebook');
    expect(status, 'status line').not.toBeNull();
    expect(notebook, 'evidence notebook').not.toBeNull();
    expect(status.parentElement, 'same parent').toBe(notebook.parentElement);
    const order = Array.from(status.parentElement.children);
    expect(order.indexOf(status), 'status precedes the notebook').toBeLessThan(order.indexOf(notebook));
    // Still the node the canvas describes itself with.
    expect(root.querySelector('canvas').getAttribute('aria-describedby')).toBe('diss-canvas-status diss-canvas-equivalent');
  }, 60_000);

  // 2026-09-06 round 31. Round 30 measured every pointer-path message landing 924-1025px below the
  // canvas, unreadable while the specimen was in view. The durable fix was meant to be a canvas
  // HUD banner; a 42-state occupancy sweep of painted HUD furniture (588 panel boxes) said no.
  // Every fully free band is mid-specimen - y360-449 is the largest - and covering the specimen
  // to explain the specimen is not a fix. The one existing card that suits the message, the
  // next-step card, only draws when procedureMode is 'guided'. So the echo is a DOM node pinned
  // directly under the canvas instead: measured at y=855, 15px below the canvas, fully on screen.
  // It is aria-hidden on purpose - the panel node is already an aria-live region and
  // setProcedureFeedback also calls announceToSR, so speaking it here would be the third reading.
  it.each(DISSECTION_PATHS)('shows gesture feedback under the canvas in %s', (filePath) => {
    const withFeedback = render(filePath, { procedureFeedback: { message: 'Cannot start Scalpel yet. Because reasons.', tone: 'caution', at: Date.now() } });
    const echo = withFeedback.querySelector('[data-diss-gesture-echo]');
    expect(echo, 'gesture echo').not.toBeNull();
    expect(echo.textContent.trim()).toBe('Cannot start Scalpel yet. Because reasons.');
    expect(echo.getAttribute('data-tone')).toBe('caution');
    // Never a fourth voice: it is shown, not spoken.
    expect(echo.getAttribute('aria-hidden')).toBe('true');
    expect(echo.hasAttribute('aria-live'), 'must not be its own live region').toBe(false);
    expect(echo.getAttribute('role')).toBeNull();
    // Directly under the canvas, ahead of the zoom controls that were between them.
    const zoom = withFeedback.querySelector('.diss-zoom-bar');
    expect(zoom, 'zoom bar').not.toBeNull();
    expect(echo.parentElement).toBe(zoom.parentElement);
    const order = Array.from(echo.parentElement.children);
    expect(order.indexOf(echo)).toBeLessThan(order.indexOf(zoom));
    // Nothing to echo before the student has done anything.
    expect(render(filePath, {}).querySelector('[data-diss-gesture-echo]'), 'no echo without feedback').toBeNull();
  }, 60_000);

  // 2026-09-06 round 31. Trapped with a textContent setter over the three live regions: moving the
  // pointer across the specimen rewrote them with text they already showed. The cutting branch
  // keyed on the intent label and the safety target, but while setup is not ready every one of
  // those branches renders the same readiness cue; the preview branch keyed on the hovered
  // structure and the pin count, while every previewMessage is a fixed string. The feedback panel
  // is aria-atomic, so each rewrite replays the whole sentence - and those rewrites had also
  // replaced the refusal message the student needed with hover coaching. Measured over the same
  // 100-move sweep: 3 writes with 2 identical consecutive repeats, now 1 write and 0 repeats.
  it.each(DISSECTION_PATHS)('keys hover live-region writes on the rendered text in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain("var cuttingSafetyKey = cuttingSafetyTone + '|' + cuttingSafetyMessage;");
    expect(source).toContain("var previewStateKey = previewTone + '|' + previewMessage;");
    expect(source).toContain('cuttingSafetyStatus.textContent = cuttingSafetyMessage;');
    expect(source).toContain("cuttingSafetyStatus.setAttribute('data-tone', cuttingSafetyTone);");
    // The old keys mixed in state that does not reach the sentence.
    expect(source).not.toContain("var cuttingSafetyKey = hoverCuttingLabel + '|'");
    expect(source).not.toContain("var previewStateKey = activeInstrument + '|' + previewIntentLabel");
    // One derivation of the message: it is built once and both the guard and the write use it.
    expect(source.split('Projected cutting path clear and aligned with the teaching corridor.').length - 1).toBe(1);
  }, 60_000);

  // 2026-09-06 round 33. Reproduced on a touch screen at the inspect step: a student drags on a
  // structure the tool itself reports as hovered (the frog's tympanum) and is told to "move the
  // probe tip onto a visible structure before tracing" - what they just did. Doing it again gives
  // the same line and records nothing, because beginProbeDrag needs two pins before tracing exists
  // and pins come much later in the protocol; the step commits through a press and release, which
  // works on the same pixel. So the message named a cause that was not the cause and pointed at an
  // action that was not available. Following it verbatim reproduced it. Behaviour is covered in
  // tests/e2e/69-dissection-pointer-path.spec.ts; this pins the wording in the fast suite.
  it.each(DISSECTION_PATHS)('tells a dragging probe user the gesture that works in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain("setProcedureFeedback((currentProcedure.pins || []).length < 2");
    expect(source).toContain("'Press and release on a visible structure to record it. Probe tracing needs two pins in place and unlocks later in the protocol.'");
    // The old unconditional wording is gone; the same sentence survives only for the case it is
    // actually true in, once tracing is genuinely available.
    expect(source).not.toContain("if (procedureToolReadinessData('probe', currentProcedure).safeToAct) setProcedureFeedback('Move the probe tip onto a visible structure before tracing.', 'caution');");
    expect(source.split('Move the probe tip onto a visible structure before tracing.').length - 1, 'kept for the post-pins case only').toBe(1);
  }, 60_000);
});
