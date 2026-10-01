// Dino Lab - giving the legs a gait quietly broke the anatomy labels.
//
// "Thigh", "Knee", "Ankle" and "Foot" anchor to points captured when the model
// is built, and the label overlay reads anchor.getWorldPosition() every frame.
// While the legs were static that was fine. Once they swing, an anchor left on
// the model root leaves its label pointing at empty air beside the moving limb
// - and the leg labels are exactly the ones a learner uses while the animal is
// in motion.
//
// The fix uses the mechanism addBodyPartAnchor already had: parent the anchor
// to the mesh that moves.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function enclosingGuard(index) {
  let depth = 0, i = index;
  while (i > 0) {
    const ch = SRC[i];
    if (ch === '}') depth++;
    else if (ch === '{') { if (depth === 0) break; depth--; }
    i--;
  }
  return SRC.slice(Math.max(0, i - 60), i + 1).split('\n').pop().trim();
}

describe('leg labels follow the swinging limb', () => {
  it('captures the anchors the leg creates', () => {
    expect(SRC).toContain('var limbAnchors = [];');
    expect(SRC).toMatch(/limbAnchors\.push\(addBodyPartAnchor\(front \? 'forelimb' : 'thigh'/);
    expect(SRC).toMatch(/limbAnchors\.push\(addBodyPartAnchor\(front \? 'hand' : 'foot'/);
    expect(SRC).toMatch(/limbAnchors\.push\(addBodyPartAnchor\('knee'/);
    expect(SRC).toMatch(/limbAnchors\.push\(addBodyPartAnchor\('ankle'/);
  });

  it('re-parents them onto the mesh that actually moves', () => {
    expect(SRC).toContain('upperLimbShell.add(limbAnchor);');
  });

  it('preserves world position when re-parenting', () => {
    // Without converting into the shell's local space the labels would jump
    // to a different place on the model the moment the fix landed.
    expect(SRC).toContain('var worldPoint = limbAnchor.getWorldPosition(new THREE.Vector3());');
    expect(SRC).toContain('limbAnchor.position.copy(upperLimbShell.worldToLocal(worldPoint));');
  });

  it('refreshes the shell matrix before converting', () => {
    // worldToLocal uses the inverse world matrix; a stale one silently
    // misplaces every leg label.
    const rep = SRC.indexOf('limbAnchors.forEach');
    const block = SRC.slice(rep, SRC.indexOf('idleMotion.legs.push(', rep));
    expect(block).toContain('upperLimbShell.updateMatrixWorld(true);');
    expect(block.indexOf('updateMatrixWorld'))
      .toBeLessThan(block.indexOf('worldToLocal'));
  });

  it('is skipped when the limb shell does not exist', () => {
    // In skeleton-only view addSoftTissueChain returns [] and the shell is
    // undefined, so the re-parenting must sit inside the same showBody guard
    // the shell does - otherwise the 3D view throws and blanks.
    const rep = SRC.indexOf('limbAnchors.forEach');
    expect(rep, 're-parenting not found').toBeGreaterThan(-1);
    expect(enclosingGuard(rep), 'the re-parenting is not guarded by showBody')
      .toContain('showBody');
  });

  it('still creates the anchors in both views', () => {
    // The anchors themselves must NOT move inside the guard: skeleton view
    // needs its leg labels too.
    const decl = SRC.indexOf('var limbAnchors = [];');
    expect(enclosingGuard(decl), 'anchor creation was moved into showBody')
      .not.toContain('showBody');
  });

  it('does not re-parent an anchor twice', () => {
    expect(SRC).toContain('if (!limbAnchor || limbAnchor.parent === upperLimbShell) return;');
  });

  it('keeps using per-frame world positions for labels', () => {
    // This is what makes parenting sufficient - if the overlay ever cached a
    // position at build time, the labels would freeze again.
    expect(SRC).toContain('var world = anchor.getWorldPosition(new THREE.Vector3())');
  });
});

describe('the motion control describes what it actually stops', () => {
  it('names the head turn and the leg gait', () => {
    // Someone with vestibular sensitivity reads this line to decide whether
    // pausing will stop what is bothering them. Under-listing the motion
    // makes that decision for them.
    expect(SRC).toContain('Pause breathing, the head turn, the leg gait, feather movement, and auto spin.');
  });

  it('still tells them orbiting survives the pause', () => {
    expect(SRC).toContain('Motion paused. You can still rotate and zoom.');
  });
});
