# Solar System visual enhancement — September 30, 2026

The main explorer now uses the existing textured world artwork in its planet controls and detail header. The detail surface follows the active theme, and the principal science readings have larger values and clearer spacing.

## Review findings and changes

- The 3D scene, orbital instruments, missions, and science labs already provide extensive visual content. The main picker was comparatively weak: emoji, small labels, and white text over bright planet colors. It now shows nine cached portraits, world classifications, and a visible selection check. Its solid selected surfaces keep labels readable for pale planets as well as dark ones.
- The dark-mode detail panel previously used a light outer surface around dark metric cards. Its header and surrounding surface now follow the theme and share the selected world's portrait and accent.
- The eight existing readings retain their semantic definition-list structure and scientific values. Values are larger; long atmosphere descriptions have a smaller reading size to fit comfortably.
- Typography uses the system sans-serif stack. Existing 9-, 5-, and 3-column picker breakpoints, wrapping names, native keyboard buttons, and compact immersive headers remain supported. Forced-color mode adds a native selection outline.

The portraits reuse the existing cache. The change adds no media downloads, WebGL resources, or animation loops. Selection, camera, mission, and science-model callbacks were preserved. The canonical and desktop modules are byte-identical.

## Visual evidence

- [Before: desktop dark theme](before-1180-dark.png)
- [After: desktop dark theme](after-1180-dark.png)
- [After: desktop light theme](after-1180-light.png)
- [After: 390px dark theme](after-390-dark.png)
- [After: 320px light theme](after-320-light.png)
- [Saturn detail: desktop dark theme](after-saturn-1180-dark.png)
- [Saturn detail: 320px light theme](after-saturn-320-light.png)

Screenshots use the repository's real module and compiled application stylesheet in the existing local GL harness, with English planet names and reduced motion. The desktop baseline uses the original HEAD version of the module. This is local implementation verification, not a production deployment.

## Verification

All 64 tests passed across six focused unit files: visual science, accessible control names, themed color safety, mobile clarity, card lighting/spin, and Orrery labels. The final run used one worker and a 30-second test timeout. An initial concurrent run had four five-second timeouts; running separately with the longer limit resolved them.

The browser review passed all four layout/theme cases:

| Width | Theme | Page overflow | Planet portraits | Lowest button-text contrast | Forced-color selection outline |
| --- | --- | --- | --- | --- | --- |
| 1180px | Dark | None | 9 | 13.35:1 | 2px |
| 1180px | Light | None | 9 | 11.87:1 | 2px |
| 390px | Dark | None | 9 | 13.35:1 | 2px |
| 320px | Light | None | 9 | 11.87:1 | 2px |

The review also checked secondary-label contrast after selecting Mercury, Venus, and Uranus, keyboard selection of Saturn, detail-header contrast, switching through surface and interior and back to the eight overview readings, and a live rendered GL scene with 59 meshes. No browser runtime errors were recorded. JavaScript syntax and scoped Git whitespace checks passed.

Reproduce from the repository root:

```powershell
npx vitest run tests/solar_system_visual_science.test.js tests/solar_system_control_names_a11y.test.js tests/solar_system_themed_color_safety.test.js tests/solar_system_mobile_visual_clarity.test.js tests/solar_system_card_light_and_spin.test.js tests/solarsystem_orrery_labels.test.js --maxWorkers=1 --testTimeout=30000
node reports/solar-visual-enhancement-2026-09-30/visual-qa.cjs --before
node reports/solar-visual-enhancement-2026-09-30/visual-qa.cjs
```

Detailed results: [unit results](solar-focused-unit-tests.json), [unit log](solar-focused-unit-tests.log), and [browser measurements](after-metrics.json).
