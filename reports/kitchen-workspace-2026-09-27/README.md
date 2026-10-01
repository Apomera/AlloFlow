# Kitchen workspace, interaction guidance, and visual refresh

The 3D workspace now takes more of the page width and has a larger canvas. A grouped tool shelf covers Bench, Prep, Pasta pot, Sauce pan, and Serve. Each tool shows its gesture and current prerequisites. Selecting a tool card frames the relevant station; the complete tool selector and keyboard route remain available.

Hovering a relevant object reveals a ring and concise instruction. Completed cloves, crushed tomato pieces, empty serving plates, historical kitchens, and unavailable techniques receive context-sensitive guidance. A top view provides another way to inspect the bench.

The expanded kitchen is a native modal dialog containing the same scene, tool controls, temperatures, burner settings, and cooking clock. It preserves recipe state and the weighing draft, contains keyboard focus, and returns focus on Escape. Opening keyboard tools exits the dialog before focusing the illustrated workspace. Graphics loss restores the text fallback and page scrolling.

Visual changes include deeper green cabinetry, a tiled backsplash, wood-grain boards, a lightly textured stone worktop, revised lighting and shadows, burner glow, and rounded station labels. Textures are generated locally; no external assets were added.

## Verification

- **255 tests passed in 23 kitchen test files.** Eight new tests cover readiness guidance, selected-object hints, serving state, replay locks, and old recipe models.
- The workspace browser check passed real mouse pours in the expanded scene, record-only persistence, focus restoration, tool/camera synchronization, burner and clock changes, 320px/tablet layout, replay, and graphics fallback. No uncaught page errors.
- The existing 3D weighing regression passed mouse and touch pours, cancellation, keyboard synchronization, reload, replay/export, and graphics loss.
- **Nine accessibility scans had zero violations:** six workspace states and three weighing regression states. These include desktop, expanded view, 320px, tablet, forced colors, and fallback.
- All **24 recipe assets** match the desktop public mirror. JavaScript syntax and scoped Git whitespace checks passed.

Commands:

```powershell
npx vitest run tests/kitchen_recipe --pool=threads --maxWorkers=1 --testTimeout=30000
node dev-tools/kitchen_recipe_workspace_qa.cjs
$env:KITCHEN_QA_OUT='reports/kitchen-workspace-2026-09-27/weighing-regression'
node dev-tools/kitchen_recipe_scene_weighing_qa.cjs
```

## Visual review

- [Before workspace](before-workspace.png)
- [Updated workspace](after-workspace.png)
- [Expanded workspace](expanded-workspace.png)
- [Object guidance](hover-target.png)
- [Top view](top-view.png)
- [Cooking pan](cooking-pan.png)
- [320px expanded view](expanded-320.png)
- [Tablet expanded view](expanded-768.png)

Browser checks use Chromium with software WebGL. Screenshots were inspected at desktop and mobile widths. Automated accessibility checks supplement the exercised keyboard paths; they are not a complete assistive-technology audit.
