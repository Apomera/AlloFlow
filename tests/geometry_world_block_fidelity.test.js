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
