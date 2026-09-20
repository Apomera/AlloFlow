# Dino Lab: rounded lower-jaw contours

Completed 2026-09-20.

The lower jaw now tapers upward into the cranial surface at both ends. This replaces the visible blunt end caps with rounded chin transitions, particularly apparent in the Tyrannosaurus and Brachiosaurus close-ups. The three original jaw control points and their height/breadth values are retained.

The upper head, mouth creases, skeleton, species dimensions and reconstruction-evidence profiles are unchanged. The jaw remains a separate overlapping surface; this pass refines the existing schematic soft-tissue reconstruction without introducing new anatomical claims.

## Verification

- 47 unit checks across five suites passed: jaw closures at three scales and two breadth profiles, original station preservation, and adjacent cranial, neck-junction, facial-strip and attachment regressions.
- Eight Chromium scenarios passed: seven species plus Velociraptor in conservative and avian-informed modes. All sampled vertices in both jaw cap rings remained enclosed by the head surface.
- Head-study, side and front cameras retained jaw framing. The 320 px Brachiosaurus phone view had no horizontal overflow.
- Both mouth creases and the skin-coordinate attributes remained present. Geometry, normals and skin coordinates were finite; plumage roots remained seated.
- Anchiornis opacity changes retained the same model and stable 439/8 geometry/texture counts. The jaw followed the head material from 22% to full opacity. Triceratops fossil-to-life switching passed.
- The jaw keeps its existing budget of 1,227 vertices and 2,352 triangles. No extra jaw meshes or textures are added.
- No captured runtime errors, WebGL context loss or shader failures. Syntax and scoped whitespace checks passed.
- Reviewed ten final images: seven head studies, two side views and the phone view.

## Reproduction

Unit command:

```text
node node_modules/vitest/vitest.mjs run tests/dinolab_3d_jaw_contours.test.js tests/dinolab_3d_cranial.test.js tests/dinolab_3d_neck_junction.test.js tests/dinolab_3d_face_contours.test.js tests/dinolab_3d_attachments.test.js --maxWorkers=1 --pool=forks --testTimeout=30000
```

Browser command (the recorded runs partitioned this file into two initial species and the remaining cases):

```text
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-jaw-contours.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line
```

Canonical, desktop public and both existing local build renderer copies match SHA-256 `0bb1c22458c3b4d592dd2cbd79d9bd4b78d6f684793e263b83ae9fba12cce679`. Build mirrors were synchronized directly; no package build, push or deployment was performed. Detailed results are in [validation.json](validation.json). Representative captures: [Tyrannosaurus side](tyrannosaurus-side.png), [Brachiosaurus head](brachiosaurus-head.png), [phone view](brachiosaurus-phone.png).
