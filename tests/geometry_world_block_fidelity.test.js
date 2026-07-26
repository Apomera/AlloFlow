// Geometry World block-fidelity + authored-content regressions.
//
// The shape system (Q cycles cube / slab / wedge / quarter, R rotates 90°) is
// documented in the in-app controls panel but was entirely dead: the logging
// wrappers installed late in initEngine redeclared SHORTER signatures over the
// real ones —
//     placeBlock(x,y,z,type)          over placeBlock(x,y,z,type,shape,rotation)
//     removeBlock(x,y,z)              over removeBlock(x,y,z,forceRemove)
// — and forwarded only the arguments they named, so every block placed as a
// default cube and forceRemove never reached the original. The same truncation
// ran through undo/redo, the collab sync, and the shared-world export.
//
// Separately, generateWorksheetHTML interpolated lesson/NPC text straight into a
// printable document while the MTSS report escaped it. Lessons come from Gemini
// and from peer-shared worlds, and math prose is full of "<" and ">".

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PATHS = [
  'stem_lab/stem_tool_geometryworld.js',
  'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js',
];
const SOURCE = readFileSync(PATHS[0], 'utf8');

/** Extract escapeReportHtml + generateWorksheetHTML without running the tool. */
function loadDocGenerators() {
  const start = SOURCE.indexOf('  function escapeReportHtml(value)');
  const end = SOURCE.indexOf('  function generateManipulativeCard(');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const body = SOURCE.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(body + '\nreturn { escapeReportHtml, generateWorksheetHTML };')();
}

describe('Geometry World place/remove wrappers preserve the full signature', () => {
  PATHS.forEach((p) => {
    const src = readFileSync(p, 'utf8');

    it(`forwards shape + rotation through the logging wrapper — ${p}`, () => {
      // The truncated redeclarations must not come back.
      expect(src).not.toContain('engine.placeBlock = function(x, y, z, type) {');
      expect(src).not.toContain('engine.removeBlock = function(x, y, z) {');
      // Forwarding via `arguments` is what makes the wrapper drift-proof.
      expect(src).toContain('origPlace.apply(engine, arguments);');
      expect(src).toContain('origRemove.apply(engine, arguments);');
    });

    it(`only logs a block event when the block map actually changed — ${p}`, () => {
      // A bounced placement (occupied cell) or a refused break (indestructible
      // lesson block) used to still write an event into the research CSV.
      expect(src).toContain("if (!had && engine.blocks[key]) {");
      expect(src).toContain("if (had && !engine.blocks[key]) {");
    });

    it(`carries rotation through undo and redo — ${p}`, () => {
      expect(src).toContain("pushUndo({ action: 'place', x: x, y: y, z: z, type: type, shape: shapeId, rotation: rot });");
      expect(src).toContain('rotation: removedRotation });');
      // Both the undo and the redo re-place path restore it.
      const restores = src.match(/engine\.placeBlock\(a\.x, a\.y, a\.z, a\.type, a\.shape, a\.rotation\);/g) || [];
      expect(restores).toHaveLength(2);
    });

    it(`syncs shape + rotation to collaborators and to shared worlds — ${p}`, () => {
      expect(src).toContain("eng.placeBlock(b.x, b.y, b.z, b.type || 'stone', b.shape, b.rotation);");
      // Both the live collab payload and the "Share world" export carry them.
      const carriers = src.match(/shape: m\.userData\.shape \|\| 'cube',/g) || [];
      expect(carriers.length).toBeGreaterThanOrEqual(2);
    });

    it(`does not sweep protected lesson blocks on a peer update — ${p}`, () => {
      // The sweep used to target every non-grass block, so it called removeBlock
      // on the lesson structure; those are protected, so nothing was deleted, but
      // each one flashed red and fired a haptic bump on every peer update.
      expect(src).toContain('if (m && m.userData && !m.userData._lessonBlock && !sharedKeys[key]) {');
      expect(src).not.toContain("if (m && m.userData && m.userData.blockType !== 'grass' && !sharedKeys[key]) {");
    });
  });
});

describe('Geometry World worksheet escapes authored content', () => {
  const gen = loadDocGenerators();

  const hostileLesson = {
    title: 'Volume < 30 & Beyond',
    description: 'Is the volume < 30 or > 30?',
    objectives: ['Compare 5 < 8 using cubes'],
    npcs: [{
      name: 'Ada <the Builder>',
      dialogue: 'A prism where L < W & H > 2.',
      question: { text: 'Which is bigger: 3x4x2 or 5x5x1?', choices: ['a', 'b', 'c'], correct: 0 },
    }],
  };

  it('escapes < > and & from lesson text', () => {
    const html = gen.generateWorksheetHTML(hostileLesson);

    // The raw sequences must not survive into the document.
    expect(html).not.toContain('Volume < 30 & Beyond');
    expect(html).not.toContain('Ada <the Builder>');
    expect(html).not.toContain('L < W & H > 2');

    // ...and the escaped forms must be present, so the content is not just dropped.
    expect(html).toContain('Volume &lt; 30 &amp; Beyond');
    expect(html).toContain('Ada &lt;the Builder&gt;');
    expect(html).toContain('volume &lt; 30 or &gt; 30');
    expect(html).toContain('5 &lt; 8');
  });

  it('does not let authored text open a tag in the printable document', () => {
    const html = gen.generateWorksheetHTML({
      title: 'W',
      npcs: [{ name: 'N', dialogue: '<script>alert(1)</script>', question: null }],
    });
    // Worlds arrive from Gemini and from the peer-worlds class library, and the
    // worksheet is written into a new window via document.write.
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('does not print Geometry Garden stations for an unrelated exploration lesson', () => {
    // isGarden used to be `!npcsWithQ.length || titleHasGarden`, so ANY lesson whose
    // NPCs had no questions got the Garden's eight hardcoded stations — content from
    // a different world entirely. The AI prompt explicitly allows question: null.
    const html = gen.generateWorksheetHTML({
      title: 'Pyramids of Giza',
      description: 'Explore the pyramid structures.',
      npcs: [
        { name: 'Archaeologist', dialogue: 'Look at the stepped sides.', question: null },
        { name: 'Surveyor', dialogue: 'Estimate the base.', question: null },
      ],
    });

    expect(html).not.toContain('Station 1: The Single Cube');
    expect(html).not.toContain('The Hidden Garden');
    expect(html).not.toContain('This is a Field Journal');

    // It prints THIS lesson's NPCs, each with an observation box.
    expect(html).toContain('Archaeologist');
    expect(html).toContain('Look at the stepped sides.');
    expect(html).toContain('Surveyor');
    expect(html).toContain('Notes / Observations');
  });

  it('still prints the Garden field journal for the Garden itself', () => {
    const html = gen.generateWorksheetHTML({ title: 'Geometry Garden', npcs: [] });
    expect(html).toContain('This is a Field Journal');
    expect(html).toContain('Station 1: The Single Cube');
  });

  it('gives an NPC-less lesson something to do', () => {
    const html = gen.generateWorksheetHTML({ title: 'Empty World', npcs: [] });
    expect(html).toContain('Explore the World');
    expect(html).toContain('Notes / Observations');
  });

  it('still renders ordinary lessons unchanged', () => {
    const html = gen.generateWorksheetHTML({
      title: 'Volume Explorer',
      description: 'Measure rectangular prisms.',
      objectives: ['Find volume with L x W x H'],
      npcs: [{ name: 'Guide', dialogue: 'Hello!', question: { text: 'What is 2x3x4?', choices: ['24', '9', '12'], correct: 0 } }],
    });
    expect(html).toContain('Volume Explorer');
    expect(html).toContain('Measure rectangular prisms.');
    expect(html).toContain('Find volume with L x W x H');
    expect(html).toContain('Guide');
    expect(html).toContain('What is 2x3x4?');
  });
});

/**
 * Extract validateLesson. It closes over MAX_BLOCKS, addToast and __alloT, so those
 * are supplied as locals — the block budget is the behaviour under test.
 */
function loadValidateLesson() {
  const start = SOURCE.indexOf('      function validateLesson(lesson) {');
  const end = SOURCE.indexOf('      function finishGeneration(lesson) {');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const prelude = 'var MAX_BLOCKS = 1500;\n'
    + 'var toasts = [];\n'
    + 'var addToast = function (m, k) { toasts.push({ message: m, kind: k }); };\n'
    + 'var __alloT = function (k, fb) { return fb || k; };\n';
  // eslint-disable-next-line no-new-func
  return new Function(prelude + SOURCE.slice(start, end) + '\nreturn { validateLesson, toasts, MAX_BLOCKS };')();
}

describe('Geometry World lesson block budget', () => {
  const fill = (x1, y1, z1, x2, y2, z2) => ({ type: 'fill', x1, y1, z1, x2, y2, z2, block: 'stone' });

  it('drops a structure that alone exceeds the block limit', () => {
    const v = loadValidateLesson();
    // The coordinate clamps permit x/z in [-4,30] and y in [0,20]: 35*21*35 = 25,725
    // meshes, 17x MAX_BLOCKS. Building it locked up the tab.
    const lesson = v.validateLesson({
      title: 'Huge',
      ground: { xMin: -4, xMax: 24, zMin: -4, zMax: 24, y: 0, type: 'grass' },
      structures: [fill(-4, 0, -4, 30, 20, 30)],
      npcs: [{ name: 'A', position: [1, 1, 1], dialogue: 'hi' }],
    });

    expect(lesson.structures.some((s) => (s.x2 - s.x1 + 1) * (s.y2 - s.y1 + 1) * (s.z2 - s.z1 + 1) > v.MAX_BLOCKS)).toBe(false);
    expect(v.toasts.some((t) => /exceeded the 1500-block limit/.test(t.message))).toBe(true);
  });

  it('keeps the total under the limit across many structures', () => {
    const v = loadValidateLesson();
    // Ten 10x10x10 fills = 10,000 blocks; nothing used to bound the count.
    const many = [];
    for (let i = 0; i < 10; i += 1) many.push(fill(i, 0, 0, i + 9, 9, 9));
    const lesson = v.validateLesson({
      title: 'Many',
      ground: { xMin: 0, xMax: 9, zMin: 0, zMax: 9, y: 0, type: 'grass' },
      structures: many,
      npcs: [{ name: 'A', position: [1, 1, 1], dialogue: 'hi' }],
    });

    const groundCost = 10 * 10;
    const total = lesson.structures.reduce(
      (sum, s) => sum + (s.x2 - s.x1 + 1) * (s.y2 - s.y1 + 1) * (s.z2 - s.z1 + 1), 0);
    expect(groundCost + total).toBeLessThanOrEqual(v.MAX_BLOCKS);
    expect(lesson.structures.length).toBeGreaterThan(0);
  });

  it('leaves a normal lesson completely intact', () => {
    const v = loadValidateLesson();
    const structures = [fill(0, 0, 0, 4, 2, 3), fill(8, 0, 8, 10, 4, 10)];
    const lesson = v.validateLesson({
      title: 'Normal',
      ground: { xMin: -4, xMax: 24, zMin: -4, zMax: 24, y: 0, type: 'grass' },
      structures: structures.map((s) => Object.assign({}, s)),
      npcs: [{ name: 'Guide', position: [2, 1, 2], dialogue: 'hi' }],
    });

    expect(lesson.structures).toHaveLength(2);
    expect(v.toasts.some((t) => /exceeded/.test(t.message))).toBe(false);
  });
});

describe('Geometry World fillBlocks respects the limit', () => {
  PATHS.forEach((p) => {
    it(`caps lesson fills and reports truncation — ${p}`, () => {
      const src = readFileSync(p, 'utf8');
      // MAX_BLOCKS was enforced only on student placement, never on the path lesson
      // loading actually uses.
      expect(src).toContain('if (count >= MAX_BLOCKS) { engine._fillTruncated = true; return; }');
      // Counted incrementally — Object.keys() inside the triple loop would be quadratic.
      expect(src).toContain('var count = Object.keys(engine.blocks).length;');
      expect(src).toContain('if (engine._fillTruncated && addToast) {');
    });
  });
});

describe('Geometry World AI lessons resolve to themselves', () => {
  PATHS.forEach((p) => {
    it(`does not fall back to volumeExplorer for an ai_ lesson key — ${p}`, () => {
      const src = readFileSync(p, 'utf8');
      // AI lessons are keyed 'ai_<timestamp>' / 'ai_generated', neither of which is
      // a SAMPLE_LESSONS key — the bare lookup silently showed volumeExplorer's
      // title, objectives, worksheet and logged lesson name for every AI world.
      expect(src).not.toContain('var currentLesson = SAMPLE_LESSONS[activeLesson] || SAMPLE_LESSONS.volumeExplorer;');
      expect(src).toContain("if (activeLesson && activeLesson.indexOf('ai_') === 0) {");
      expect(src).toContain("var saved = getMyLessons().filter(function (l) { return l && l._id === activeLesson; })[0];");
      expect(src).toContain('if (lastGeneratedLesson) return lastGeneratedLesson;');
    });

    it(`writes NPC chat under the same key loadLesson reads — ${p}`, () => {
      const src = readFileSync(p, 'utf8');
      // Read side is gwChatKey(lesson); the write side used the raw activeLesson.
      expect(src).toContain("sessionStorage.setItem('gw_chat_' + gwChatKey(currentLesson)");
      expect(src).not.toContain("sessionStorage.setItem('gw_chat_' + activeLesson");
    });
  });
});

describe('Geometry World authoring path is validated', () => {
  PATHS.forEach((p) => {
    const src = readFileSync(p, 'utf8');

    it(`runs hand-edited lesson JSON through validateLesson — ${p}`, () => {
      // The lesson editor is the one path a teacher types into, and it was the ONLY
      // path with no guardrails: straight from JSON.parse to loadLesson, skipping
      // coordinate clamping, block-type checks, malformed-question repair and the
      // block budget.
      expect(src).toContain('lesson = validateLesson(lesson);');
      expect(src).not.toContain('var lesson = JSON.parse(lessonEditorJson);\n                  var eng = window[engineKey];');
    });

    it(`points activeLesson at the lesson it just loaded — ${p}`, () => {
      // Applying an edit left activeLesson on the PREVIOUS lesson, so currentLesson
      // resolved to the old one while the engine held the new one.
      expect(src).toContain("activeLesson: lesson._id || 'ai_generated' });");
      // Loading a saved lesson addresses it by its own id rather than collapsing
      // every saved lesson onto the generic 'ai_generated'.
      expect(src).not.toContain("lessonEditorJson: JSON.stringify(lesson, null, 2), activeLesson: 'ai_generated' }); }");
    });

    it(`celebrates and pays for EVERY badge earned at once — ${p}`, () => {
      // Finishing a lesson can trip lesson_complete + perfect_lesson + first_correct
      // on the same check; only the last was toasted and awarded XP.
      expect(src).toContain('result.newBadges.forEach(function(badge, i) {');
      expect(src).toContain("awardXP('geometryWorld', 10, 'Badge: ' + badge.name);");
      expect(src).toContain('if (i === 0) showIt(); else setTimeout(showIt, i * 900);');
      // The dismiss timer is tracked so a second batch is not cleared early.
      expect(src).toContain('if (engB._badgeDismissTimer) clearTimeout(engB._badgeDismissTimer);');
      expect(src).toContain('if (engine._badgeDismissTimer) clearTimeout(engine._badgeDismissTimer);');
    });
  });
});
