# Basic math UI clarity follow-up

Reviewed ten additional STEM Lab tools across 58 initial component states using the actual tool sources and application styles. The review focused on navigation, understandable labels, and reducing competing choices while preserving functionality. Six tools received focused changes.

| Tool | Review outcome |
| --- | --- |
| Money Math | Four common activities appear first. Show all activities exposes all ten. Selected secondary activities remain visible when shortening the list or restoring work. Keyboard navigation follows the visible list. Compound Inquiry is now Explore interest growth. |
| Unit Converter | All five activities wrap on small screens. The measurement disclosure names the current category and retains all nine choices. Magnitude is now Compare scales. The advertised fifth keyboard shortcut now works; modified shortcuts and editing fields are excluded. |
| Area & Perimeter | Replaced the scrolling, cramped five-column navigation with a responsive grid. Full labels such as Composite Shapes and Same Area Lab explain the destinations. |
| Number Line | Expanded Frac ↔ Dec to Fractions & decimals and Compare to Compare fractions. Navigation targets are at least 44 px high. |
| Multiplication Table | Visual is now Arrays & groups. All three tabs wrap their text and remain visible without horizontal navigation scrolling. |
| Math Manipulatives | Renamed CRA Progression to Build, draw & write, matching Fraction Lab. Kept the existing learning-goal grouping and all 26 choices. |
| Area Model | No change in this pass. Its four activity modes are already grouped and responsive. |
| Arithmetic Strategy Studio | No change in this pass. Operations, activities, and model/strategy controls already have distinct roles. |
| Ratios, Rates & Proportions | No change in this pass. Five learning modes and the optional strategy guide provide a useful hierarchy. |
| Time & Schedule | No change in this pass. Four activities have explanatory subtitles, with optional precision controls disclosed separately. |

This was a UI review, not a claim that the four unchanged tools need no further work. Science, engineering, and advanced-math tools were outside this follow-up.

## Functionality and verification

Existing activity IDs, calculation logic, models, quizzes, exports, and saved-work structures remain in place. Money Math adds only presentation state for its expanded list. Unit Converter retains the original category-change behavior inside the new disclosure.

- Initial review: 58 states across ten tools, with no captured runtime errors.
- Regression tests: 139 checks passed in nine suites. After the measurement-chooser refinement, 14 focused checks passed, including an added test for all nine categories; these runs overlap.
- Browser checks: all six changed tools in default, dark, and high-contrast themes, at 1120, 375, and 320 px (18 tool/theme combinations and 54 viewport checks). Unit Converter was rechecked in all three themes after its final refinement.
- No navigation clipping, whole-page horizontal overflow, or runtime errors in those checked states. Automated WCAG checks passed for the navigation; the final Unit Converter check also includes its category disclosure. Expanded text spacing and keyboard workflows passed.
- Money Math's ten activities were opened through the new navigation, with tab/panel linkage checked. Unit tests verify that shortening the activity list preserves selected activities and saved money/budget data.
- Phone screenshots of Money Math, Unit Converter, and Area & Perimeter were visually inspected. Other changed tools received browser layout, keyboard, and automated accessibility checks.
- Syntax, scoped whitespace, source/public byte parity, and 15 new English registry keys passed. Translations for the new wording were not authored.

Evidence, screenshots, runnable previews, and reproducible browser checks are in `scratch/math-ui-clarity-2026-09-10/`. `browser-results.json` contains the six-tool run; `browser-results-unitconvert-final.json` supersedes its three Unit Converter records. The new interaction tests are in `tests/math_ui_clarity_navigation.test.js`.

These are local component checks rather than deployed-app or classroom testing. No commit or deployment was made. Existing Fraction Lab changes and unrelated workspace work were preserved.
