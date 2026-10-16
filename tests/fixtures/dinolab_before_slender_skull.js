// Independent pre-refinement display helper, frozen from baseline SHA-256 8b1703582f48ca4a737ecd65c574746fac590b2cfd17f23b15000959b1b09c28.
  function dinoCranialDisplayProfile(THREE, species, head, snout, length, height, depth, detailScale, isTheropod) {
    var refined = !!species && species.id === 'triceratops';
    return {
      refined: refined,
      vaultCenter: refined ? head.clone().add(new THREE.Vector3(-length * 0.08, height * 0.12, 0)) : head.clone(),
      vaultScale: new THREE.Vector3(length * (refined ? 0.32 : 0.68), height * (refined ? 0.65 : 1), depth * (refined ? 0.72 : 1)),
      rostrumCenter: head.clone().lerp(snout, refined ? 0.54 : 0.62),
      rostrumScale: new THREE.Vector3(refined ? length * 0.38 : Math.max(0.09 * detailScale, length * 0.62),
        height * (refined ? 0.3 : (isTheropod ? 0.58 : 0.48)), depth * (refined ? 0.5 : 0.72))
    };
  }
export { dinoCranialDisplayProfile as baselineCranialDisplayProfile };
export const unchangedConstruction = [
  {
    "label": "head landmarks",
    "start": "var detailScale = Math.min(1, ht / 2);",
    "end": "var evidenceAnchorPoints =",
    "sha256": "49bc39413230e09a1c27cd178fd6639869371eb147e560ba27a8e215eba3211f"
  },
  {
    "label": "surface head",
    "start": "var surfaceHeadFactor = reconstructionProfile.head",
    "end": "if (headShell) {",
    "sha256": "b2095f02c63ef94f1613d376e873ac2010697c7fbfb5d07cded1a4f6323ab569"
  },
  {
    "label": "skeletal frame and dentition",
    "start": "var cranialBoneBefore = model.children.slice();",
    "end": "captureCranialMotion(cranialBoneBefore);",
    "sha256": "0a2228c8f6a6819233b962a84791108c5cb45f95ec79b98a2962a09f9fb4e8c8"
  }
];
