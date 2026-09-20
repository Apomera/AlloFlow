# Resource library, Project Settings, and lesson save dialog

Completed locally on 2026-09-20. No push, deployment, or desktop installer build.

## Changes

- Resource titles and Open/Current remain visible. Each teacher resource has an Actions disclosure for Rename, Move to unit, CSV where supported, and Remove. Organize exposes drag handles and teacher move buttons; student keyboard reordering remains available. Search/type filters still prevent ambiguous reordering. Changing filters or units closes stale action panels; renaming returns focus to Actions.
- Project Settings begins with lesson presets and everyday learner controls. School Rewards and Principal Evaluation retain their launchers, forms, help, and QR features in School connections below lesson settings. Existing connections collapse their setup forms. The focus trap excludes controls in closed disclosures, and the close button is anchored inside the header with a 44px touch target.
- The user confirmed that accidental clicks outside the lesson JSON save dialog closed it before they finished. The backdrop now has no dismiss action. The focus trap belongs to the labeled dialog; Cancel, Close, and Escape still dismiss deliberately, and successful saves still close it. The filename and password survive stray clicks and pointer drags onto the backdrop. Small viewports can scroll the dialog.

## Validation

- 67/67 unit checks across 11 files: resource discovery/reorder/move/theme/share/identity/display/unit lookup; settings accessibility; project JSON contents and privacy confirmation. See `unit-tests.json`.
- 9/9 Chromium component scenarios with actual current modules/source, existing app CSS, local fixtures, and blocked external requests. Desktop (1440px) and phone (390px) checks cover rename, move, keyboard reorder, search restrictions, duplicate public IDs, targeted deletion, settings disclosure/focus, stray save clicks and drags, and actual JSON downloads through the production save helper. Separate checks cover deliberate cancellation, family-role boundaries, and student keyboard ordering.
- Following the last close-button layout refinement, both settings scenarios passed again, including containment and 44px target assertions (2/2).
- Parsed all three host source shells. Save-dialog regions are identical across canonical and desktop source shells. Both generated root/public module pairs match byte-for-byte. See `integrity.json`.
- Scoped whitespace checks passed. Visually reviewed phone resource list, desktop/phone settings, and phone save dialog. Fixture icons are stubbed; full packaged-app visual verification remains outside this local component pass.

Two existing identity assertions still expected handlers inline in the host and move-to-unit code inline in each row. Pre-edit snapshots confirmed those assertions were already stale. They now check the extracted host handlers and the actual move helper/call sites; behavioral browser coverage verifies duplicate-ID actions reach the intended resource. The first browser run found an ambiguous test locator matching both a fieldset and its nested group; the corrected tests pass.

## Files and scope

Canonical UI: `view_history_panel_source.jsx`, `view_project_settings_source.jsx`, and the save-dialog region of `AlloFlowANTI.txt`. Generated view modules and `desktop/web-app/public` mirrors updated; matching save region updated in both desktop source shells. Existing `app/` and `desktop/app-build/` production bundles were not regenerated. Unrelated concurrent changes were preserved.

Reproduce browser checks with:

```powershell
npx playwright test tests/e2e/library_settings_save.spec.ts --project=chromium --workers=1 --retries=0
```
