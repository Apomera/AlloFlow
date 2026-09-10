# 3D study to evidence-note handoff

This pass connects the optional sheep-eye reference viewer with the existing 2D directory and evidence notebook.

## Student flow

- Select any of the six modeled structures and use **Find in 2D**. The directory opens with the actual 2D structure name already entered.
- When its layer is available, navigation opens that layer. When it is locked, the current layer stays in place and the directory explains the preparation required.
- Previously inspected structures show the current note/confidence status. **Review my evidence note** is offered only when the structure's layer is available.
- Note review focuses the existing editable note. A matching **Return to 3D study** button reopens the same reference structure.
- The handoff card remains usable when graphics fail or are still loading.

Navigation does not award inspection credit, unlock tissue, fill in evidence, change confidence, or affect scores. The return selection is temporary and excluded from saved evidence. Changing or resetting specimens clears it. Assessment modes do not expose these navigation actions.

The panel distinguishes studying a schematic from documenting an observation. It uses existing specimen definitions for names and layers and retains the pilot's anatomical scope and model-limit disclosures. The 2D activity remains the default.

## Verification

- Focused reference/discovery/recall/spatial/3D suite: **90 passed**.
- Chromium acceptance: **8 passed**, including the four original pilot scenarios and four handoff scenarios (locked directory, available directory, phone note round-trip, and internal-layer note review).
- Phone study panel: zero automated WCAG A/AA axe violations and no horizontal overflow; the evidence-handoff screenshot was visually inspected.
- Syntax, scoped whitespace, and canonical/desktop dissection parity checks passed.
- New handoff interface copy is English; this pass does not add translations or physical-device coverage.

## Artifacts

- [Focused checks](eye-handoff-focused.log)
- [Browser acceptance](eye-handoff-browser.log)
- [Phone evidence handoff](eye-3d-evidence-handoff-mobile.png)
