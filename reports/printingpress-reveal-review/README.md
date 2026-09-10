# Printing Press reveal and editing refinement

The phrase-reset control previously faded to 50% opacity during printing, then returned to full opacity on reveal. A dedicated repeated-cycle test reproduced the earlier contrast report in all four reduced-motion cycles (reported contrast 4.35:1), while normal-motion cycles passed. Removing the opacity change and using a disabled cursor and dashed border instead eliminated the report in all eight tested cycles. The reset label is now 13px instead of 11px.

A visible status distinguishes ready type, type locked during an impression, and editing the next impression. A short supporting instruction gives the next action in each state. Controls remain natively disabled during printing.

Editing the next phrase no longer changes the type letters drawn on the completed press. The diagram, paper proof, and mirrored type comparison all use the completed phrase until the next cycle begins. This prevents students from comparing the old paper proof with newly edited type.

Validation: 43 tests passed across nine Printing Press suites. The dedicated reveal browser check covers four cycles with reduced motion and four with normal motion, zero WCAG A/AA axe violations in the workbench at reveal, disabled control readability, state instructions, immutable completed-type display, next-cycle handoff, and no horizontal overflow at desktop, 390px, or 320px. The existing workshop browser checks passed. Mobile screenshots were visually inspected. The previously blocked syntax and whitespace checks have now passed.

Evidence: browser-results.json and next-impression-1280.png, next-impression-390.png, next-impression-320.png. Checks use the real tool in an isolated React host.
