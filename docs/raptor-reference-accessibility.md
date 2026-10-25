# Raptor reference activities: accessibility review

This focused pass covers Rehabilitation, Anatomy Atlas and History. Earlier distance-investigation checks do not establish complete coverage of the wider Raptor Lab or WCAG conformance.

## Findings and changes

| Activity | Finding | Change |
| --- | --- | --- |
| Rehabilitation | Tab roles lacked a named tab list, tab/panel relationships and conventional tab navigation. All tabs were in the page's Tab sequence. | Named tabs and a labelled content panel, one selected tab in the Tab sequence, and automatic activation with Left/Right, Home and End. |
| Anatomy Atlas | Tab/panel relationships existed, but the buttons lacked roving focus and arrow-key navigation. Fractional saved indices could leave the selected view undefined. | The same tab interaction pattern, a keyboard-accessible panel entry point and safe display fallbacks for invalid indices. |
| Anatomy Atlas on narrow screens | Overlapping wing hotspots reduced a control's usable target area below 24 pixels. | Numbered noninteractive diagram markers and a separate grid of at least 44 × 44 pixel selection buttons; all structures retain keyboard and pointer selection. |
| History | Era filters declared tab roles while filtering one timeline. Selection was communicated visually. | A named group of native pressed buttons and a named timeline region. Enter and Space retain native button behavior. |

Arrow-key activation updates the panel before moving focus to the selected tab. Modifier shortcuts and vertical scrolling keys are left to the browser. Each tab list is scoped to its own reference activity. The active panel is the next keyboard entry point after the tab list. Buttons have a minimum 44-pixel height, wrap in narrow layouts, and retain separate selection and focus indicators in forced colors.

At a container width of 600 pixels or less, Anatomy places its selection buttons below the diagram, retaining matching numbered markers at the authored positions. Wider layouts retain the overlay controls. Browser checks exercise all 62 structure controls across the seven plates at 320 pixels, verify nonoverlap and actual center hit-testing, and select every structure using the keyboard.

Invalid saved values use a safe display fallback without automatically rewriting them. Anatomy system changes retain their existing behavior of selecting the first structure in the new system. The changes use the existing settings fields and do not alter the educational datasets, flight simulation, shared assets or distance investigation.

The interaction follows the [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). This is an implementation guide; correct tab behavior alone does not establish complete WCAG conformance. Automated checks, actual keyboard workflows, text-spacing/reflow checks and visual inspection complement rather than replace manual assistive-technology testing.

## Coverage and next candidates

Results and source baselines are recorded in `reports/raptor-reference-wcag-20261024/` and `tmp/raptor-reference-wcag-20261024/`. Automated scanner incomplete results remain review items. No complete audit of every Raptor activity, screen reader, browser or device is claimed.

Read-only triage also identified a separate candidate in Punnett Lab: the visible Show/Hide Steps button has the accessible name “Sample 1”, and the vocabulary dialog needs a focused keyboard lifecycle review. These findings are outside this pass's implementation scope and are not reported as fixed.
