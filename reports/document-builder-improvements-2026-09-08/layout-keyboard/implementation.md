# Document Builder responsive layout and keyboard implementation — 2026-09-08

Implemented the confirmed small-screen editor collapse and keyboard-boundary fixes. This agent changed only `view_export_preview_source.jsx` in narrowly coordinated spans and added `tests/e2e/document_builder_responsive_keyboard.spec.ts`. Root/core changes in the same source file were retained. No generated bundle or deployment was produced by this agent.

## Behavior

- Below1024px, a visible **Document settings / Back to document** switch controls a scrollable settings panel. The editor remains mounted while hidden, so live edits and iframe document identity survive panel changes. Escape closes settings before the Builder and restores focus to the switch.
- The modal has an explicit viewport height. The narrow editor owns its scrolling and receives a minimum usable stage height. Its initial ribbon is collapsed on narrow entry; users can expand it.
- The Quick Access customization panel contains Escape during event capture, before the native parent-dialog listener can close the Builder. It returns focus to the summary; a subsequent Escape retains the normal Builder-close behavior.
- Parent and iframe traversal use eligible controls, excluding disabled/inert/hidden/negative-tabindex controls and descendants of closed details. Forward Tab from editor BODY enters its first control. Explicit adjacent traversal handles Chromium designMode skipping a nested inspector badge. Boundary exit goes to the next/previous outer control.
- A focused interactive control inside a table follows control traversal, rather than accidentally invoking the table-caret Tab behavior and adding a row.

## Validation

**9/9 focused layout/keyboard tests passed**, approximately1.0 minute. **2/2 additional root-requested context tests passed**,15.1 seconds. These are separate runs, totaling11 passing cases.

The tests compile the current source in memory and mount the actual component/inspector in isolated Chromium with repository React/CSS and synthetic document content. The fixture uses a locally intercepted HTTPS origin for browser crypto. Providers, downloads, and host persistence effects are controlled; no human screen-reader testing is claimed.

Covered:

- Initial1440×900,1024×768,768×1024,390×844 geometry, viewport containment, and preview visibility.
- Mobile settings operation, Escape from both panel and switch, focus restoration, actual typed edits, and unchanged iframe document identity.
- Phone Focus entry/exit.
- Quick Access Escape versus parent close.
- Editor Tab→native control→editable ARIA badge, actual edit-dialog activation, reverse traversal and exit.
- A table control reaching its badge without adding a row.
- Actual heading edit updating the persistent document title and timestamped save context.
- Remediation settings omitting History resources/presets/Worksheet while preserving the editable preview.

## Measured preview geometry

| Viewport | Mode | Iframe height | Initial top | Visible height |
|---|---|---:|---:|---:|
|1440×900|Standard|515.5|266|515.5|
|1024×768|Standard|234.1|360.5|234.1|
|768×1024|Standard|612.8|262|612.8|
|390×844|Standard|320|408|320|
|390×844|Focus|320|392|320|

The previous standard phone preview was2px high. The corrected phone preview is320px high and fully visible on entry. The phone screenshot was visually inspected: settings are collapsed, document context and commands remain visible, and the document body is usable. Desktop/tablet dimensions remain explicitly measured; this does not claim device or assistive-technology coverage beyond the recorded browser/viewport.

## Evidence

- [Final nine-test log](final-browser-tests.log)
- [Additional two-test log](context-browser-tests.log)
- [Exact geometry and artifact directories](geometry-summary.json)
- [Phone standard screenshot](final-browser-artifacts/document_builder_responsiv-f099b--editing-surface-at-390x844-chromium/initial.png)
- [Phone Focus screenshot](final-browser-artifacts/document_builder_responsiv-92361-nd-returns-to-standard-view-chromium/focus.png)
- [First-pass log](browser-tests.log): seven passed; its failing badge-traversal regression led to the explicit designMode correction.

The test also supports validating the integrated built module after the root build:

~~~powershell
$env:ALLOFLOW_BUILDER_TEST_USE_BUILT = '1'
node node_modules/@playwright/test/cli.js test tests/e2e/document_builder_responsive_keyboard.spec.ts --workers=1 --retries=0
~~~

Unset that variable for the source-transformed mode. Root owns the production build, mirror parity, broader integration tests, and final report.
