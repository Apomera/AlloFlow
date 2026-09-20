# Dino Lab: anatomy guides and Anatomy Quest

Completed 2026-09-20. Open **3D Field Station → Anatomy Quest** for the game, or enable **Body-part labels → Locate a body part** to read a guide beside the model.

## Learning experience

All ten labeled regions now include the original anatomical definition plus **What it does**, **Look for**, and **Fossils and inference**. Guides cover head, neck, trunk, tail, upper arm/foreleg, hand/front foot, thigh, knee, ankle and foot/hind foot. Quadruped terms and weight-support explanations adapt to the selected species. Each guide links to an AMNH or Natural History Museum reference; checked URLs are recorded in [sources.json](sources.json). Generic anatomy guidance is distinguished from species-specific examples and inferred soft tissues.

Anatomy Quest presents five different clues with three choices each. It is untimed, with optional hints and one scored first attempt per clue. Feedback identifies the correct part, explains its anatomy and opens the existing model locator. Learners can frame the answer again, continue to a score out of five, review missed parts, and start another shuffled quest. A perfect attempt offers review of all five parts. Closing and reopening the panel preserves the current attempt; changing species resets it. Progress lives in the mounted viewer and is not saved to the notebook. The text quiz remains usable with both model layers hidden.

The game moves keyboard focus to the start action, question, next action and results at the appropriate steps. Answer correctness uses text as well as color. Locked choices retain full contrast. Controls reflow into one column on a narrow phone.

## Verification

- **130 unit/render checks passed across seven suites:** 57 focused anatomy, label, study, accessibility and existing quiz checks; 73 golden checks for Dino Lab data, tabs and workflows.
- **Five final Chromium scenarios passed**, with one worker and no retries: desktop quest; 320 px quadruped guides/quest; phone locator keyboard navigation; quadruped orbit/fossil transitions; small-species anchors and study compatibility. The two new quiz scenarios also passed an earlier run.
- Scoped axe scans returned **zero violations** for desktop quest, phone quest/guides and existing phone locator controls. Browser checks verified no horizontal overflow at 320 px, focus progression, all ten guides, answer locking, 4/5 scoring, missed-part review, replay/resume, hidden layers and species reset.
- Desktop play/review/replay kept the same model and **135 geometries / 7 textures**. No captured runtime errors, shader failures or context loss. Existing locator checks retained saved observations unchanged.
- **Eight final screenshots reviewed**, including quiz questions, feedback/results, phone guides and three model-locator views. Visual review prompted full-opacity answer feedback and stronger heading weight before the final browser run.
- Syntax, scoped whitespace and canonical/public/existing build mirror parity checked. All four renderer copies match SHA-256 **fc9da4bcb096c577127aef6326446f5eb1482b3d9cbb186926becb4ce2f29c48**.

The golden snapshot changed only by the expected three-line collapsed Anatomy Quest entry point. Three older literal source assertions were refreshed to match the already-existing neck construction and body roughness. The locator browser test gained a report-directory environment override so this rerun did not overwrite earlier evidence. Initial new unit checks prompted stronger seed mixing for shuffled-question coverage; final checks cover all ten parts across seeds.

Evidence: [aggregate validation](validation.json), [focused unit log](unit-results.txt), [golden log](golden-results.txt), [final browser log](final-browser-results.txt), [desktop metrics](desktop-validation.json), [phone metrics](phone-validation.json).

## Reproduction

Run from the repository root in PowerShell:

```powershell
node node_modules/vitest/vitest.mjs run tests/dinolab_anatomy_quest.test.js tests/dinolab_3d_body_labels.test.js tests/dinolab_3d_label_flow.test.js tests/dinolab_3d_studies.test.js tests/dinolab_3d_accessibility.test.js tests/stem_dinolab_evolab_quiz.test.js tests/dino_lab_golden.test.js --maxWorkers=1 --pool=forks --testTimeout=30000
$env:DINOLAB_REPORT_DIR='reports/dinolab-anatomy-quest/locator-regression'
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-anatomy-quest.spec.ts tests/e2e/dinolab-3d-part-locator.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line --output=reports/dinolab-anatomy-quest/final-artifacts
```

This pass adds learning content and quiz controls; it does not change model geometry or reconstruction profiles. Existing desktop build renderer files were synchronized. No packaged build, push or deployment was performed.
