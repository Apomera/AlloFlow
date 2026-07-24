# CoasterLab Build + Safety Enhancement Handoff

## Goal

Finish and commit the CoasterLab enhancement batch that adds genuine build-from-scratch affordances and actionable predictive safety guidance.

## Current state

The complete implementation is already present and syntax-valid in:

- `desktop/web-app/public/stem_lab/stem_tool_coasterlab.js`

The expanded tests are already present in:

- `tests/coaster_lab_tool.test.js`

The canonical source is still the previous committed version because the prior Codex session's Windows sandbox denied every write to this one path:

- `stem_lab/stem_tool_coasterlab.js`

Do not reimplement the features. Copy the deployment source over the canonical source, then verify the two files are byte-identical.

## Implemented features

- A sparse six-node **Start simple** coaster.
- An editable element palette that inserts:
  - hill
  - drop
  - banked left turn
  - banked right turn
  - ten-node vertical loop
- Inserted elements are ordinary editable nodes and participate in undo/redo, autosave, certification, and the 80-node safety limit.
- A predictive safety coach that detects likely:
  - stalls
  - insufficient loop-apex speed
  - excessive positive or negative vertical g
  - excessive lateral g
- Numbered 3-D safety markers and **Show node** actions that select and focus the nearest editable node.
- Run/tab state integration so editor controls and safety markers hide or disable appropriately.
- Quick-guide updates and scoped visual styling.
- Pure geometry test coverage for all five element types.

## Required first action

From the repository root, copy:

```powershell
Copy-Item -LiteralPath 'desktop/web-app\public\stem_lab\stem_tool_coasterlab.js' `
  -Destination 'stem_lab\stem_tool_coasterlab.js' -Force
```

Then verify:

```powershell
node -c stem_lab\stem_tool_coasterlab.js
node -c desktop/web-app\public\stem_lab\stem_tool_coasterlab.js
Get-FileHash -Algorithm SHA256 -LiteralPath `
  stem_lab\stem_tool_coasterlab.js, `
  desktop/web-app\public\stem_lab\stem_tool_coasterlab.js
```

Expected enhanced-source SHA-256:

```text
C4E098EC31B8A21E659BDCB320C4D320F5E166F5CC6A6E86E9C2A72CE0F09137
```

## Verification already completed

- Enhanced source passes `node -c`.
- A temporary mirror-only run of `tests/coaster_lab_tool.test.js` passed all **54/54** tests.
- `git diff --check` passed for the enhanced deployment source and tests.
- `node dev-tools/check_css_template_literals.cjs` passed.
- `node dev-tools/check_render_refs.cjs --quiet` passed.
- `node dev-tools/check_aria_handler.cjs --quiet` passed.
- `node dev-tools/check_stem_visual_qa.cjs --quiet` passed.

The normal focused suite currently reports exactly three expected failures: byte-identity plus the two new canonical-source feature tests. Those should disappear after the copy.

## Final verification

Run:

```powershell
npx vitest run tests/coaster_lab_tool.test.js
git diff --check -- `
  stem_lab/stem_tool_coasterlab.js `
  desktop/web-app/public/stem_lab/stem_tool_coasterlab.js `
  tests/coaster_lab_tool.test.js
```

Expected focused result: **54/54 tests passing**.

## Commit scope

Commit only these three files:

- `stem_lab/stem_tool_coasterlab.js`
- `desktop/web-app/public/stem_lab/stem_tool_coasterlab.js`
- `tests/coaster_lab_tool.test.js`

Suggested message:

```text
feat(coasterLab): add track pieces and predictive safety coach
```

The worktree contains unrelated user changes. Do not stage, modify, reset, or commit anything outside the three-file scope above.

