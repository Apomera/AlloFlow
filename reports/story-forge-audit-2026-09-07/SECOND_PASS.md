# Story Forge: second improvement pass

Implemented locally; no deployment performed.

## Changes

- Lesson imports now show an explicit preview. Applying scene starters preserves authored text and extra scenes; vocabulary merges retain existing definitions. Empty or malformed resources are rejected. Imports that exceed eight sections explain the limit.
- Applying imports and removing authored sections first saves a recovery checkpoint. If storage fails, the edit is cancelled. A project change during the asynchronous save also cancels the pending replacement.
- The Project menu exposes named checkpoints throughout the workflow. Restoring a checkpoint first saves the current version. An Undo action can return to that version.
- Focus mode offers numbered 44px section buttons, moves keyboard focus to the editor, and clearly disables adding more sections at eight. Dialogue-only comic panels count as written.
- Fixed the Project menu stacking behind the sticky vocabulary bar and overflowing the left edge on mobile.
- Darkened three labels identified by the Draft accessibility scan.

## Verification

- 151 Story Forge tests passed, including seven new import and recovery-helper tests.
- Isolated Chromium checks cover preserving authored scenes during lesson imports, checkpoint restore and Undo, scene deletion and Undo, storage-failure recovery, glossary imports, rejected empty imports, focus navigation, the eight-section limit, and mobile menu bounds.
- Automated WCAG A/AA scan of the tested mobile Draft surface reported zero violations after fixes. This is scoped automated evidence, not a complete accessibility certification.
- Inspected phone-sized screenshots of focus mode and the checkpoint menu. Evidence and machine-readable results are in `second-pass/`.
- Rebuilt the root and desktop Story Forge module copies.

The browser harness uses local React, the built module, an isolated browser profile, and no AI service. Live AI generation and the full deployed host were not exercised in this pass.
