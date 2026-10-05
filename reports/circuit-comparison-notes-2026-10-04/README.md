Students can now review their own notes beside the two saved readings they are comparing. **Review saved notes** opens two cards in the selected order, with an explicit prompt when a note is empty. The cards stack on phones and preserve authored line breaks and text direction.

**Edit note** and **Add note** open the original observation field. **Compare saved readings** brings focus back to the comparison. Editing a note updates its preview; navigation preserves the selected readings, existing writing, caret and writing size. The compact visible buttons retain the observation number in their accessible names.

The verification covers 13 new workflow cases and 104 existing cases. Native browser checks cover desktop and phone layouts, long text, doubled text, forced colors, RTL notes, keyboard navigation, editing and removal/reselection. Final results are recorded in [validation.json](validation.json).

Visual examples: [desktop](notes-desktop.png), [phone with an empty note](notes-phone-empty.png), [enlarged text](notes-doubled-text.png), [RTL notes](notes-rtl.png), and [the original note editor](original-note-editor.png).

The first browser attempt and its corrected text-resize fixture are retained in `text-resize-fixture-attempt`. A successful test/browser run before the compact-label refinement is retained in `before-button-label-refinement`. The final run checks complete accessible names as well as the shorter visible labels. Source and desktop mirror match, and the recorded source fragments reverse byte for byte to the preceding verified version.

- [Workflow test results](regression-raw.json)
- [Test execution receipt](regression-receipt.json)
- [Native browser measurements](browser-results.json)
- [Visual review](visual-review.json)
- [Source preservation](source-preservation.json)

Changes remain uncommitted and unstaged.
