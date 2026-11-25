# AlloFlow UI complexity review (2026-11-23)

Question asked: can UI or UX complexity be reduced without removing functionality and while keeping visual polish?

Read-only review from code by three parallel reviewers (teacher shell; after-generating, sharing and student view; hubs and tools). Fourteen claims were re-checked by hand and held (marked ✔). **Nothing was measured in a browser**: counts are of `<button>`, `<select>`, `<input>`, `<textarea>`, `<summary>` and links read from the source, for a plain teacher unless stated. Line numbers are for the working tree on 2026-11-23 and will drift; they refer to the root `*_source.jsx` (each cited hook was also found in the matching `_module.js`). "ANTI" = `AlloFlowANTI.txt`. Items are proposals: revalidate before building.

Rule applied throughout: keep every feature; primary action and main content first; secondary controls behind ONE disclosure; one name per thing; reuse existing strings where possible (each new string costs 56 language packs).

## 1. Where the density is

| Surface | Count |
|---|---|
| Header, compact (default) | 8 controls at 1280px+ (6 below); expanded 24 + 3 conditional, 12 of them icon-only |
| Header popovers | Text 27 controls for 12 settings; Voice 7-11; Documents 9-10; Start & setup 5-7; Help 3-4 |
| Create-screen sidebar, no source yet | about 32 before any tool is opened: tabs 2, AI Guide 1, source panel 11, Find a tool 9, Universal Settings header 1, 6 tool headers, pack card 2 |
| Sidebar tools | 23 in the catalog, 7 in the default Recommended filter (unchanged since 11-09) |
| Generator panels (controls incl. Generate) | Quiz 31 (about 10 by default, three sections closed), DBQ 12, Math 11, Image 10, Glossary 8, Brainstorm 8, Simplified 7, Concept Sort 7, Timeline 5, Persona 4, others 2-3 |
| Launch Pad | 10 by default (9 in Canvas) |
| Floating layer | up to 5 things at bottom right (Reading tools, AlloBot, Live Dashboard, two "Return to" pills); two chips share bottom left; two items share bottom centre |
| Settings | 12 separate places, about 68 settings (11-09 said about 55 by a different method) |
| Guidance systems | 10 (8 on 11-09): Launch Pad, onboarding coach, Quick Start wizard, Guided Mode, 35-step app tour, Help Mode, past tips, AI Guide, AlloBot, the "Two roads" fork dialog |
| Educator Hub / Learning Hub | 22 cards with about 16 controls above the first; 16 cards with about 15 above |
| Finished resource header | title, Annotate, List, Maximize. No edit, regenerate, share, print or export ✔ |
| Paper from a finished resource | 5 clicks: Settings & more → Documents → Document Builder → Export → Print / Save as PDF ✔ |
| Document Builder | 282 buttons, 37 selects, 29 checkboxes, 13 radios, 14 details; about 122 hard-coded English button labels |
| Live session dock | 44 buttons, 9 selects, 0 disclosures |
| Class Mailbox setup | about 35 buttons, 5 details |
| STEM Lab hub | 148 tiles in 16 open groups; 17 controls before the first tile; 151 tool files loaded |
| SEL Hub | 72 cards in 9 groups; 26 controls and 5-7 folds before the first card; a first-open dialog before that |
| Tools with their own back button on top of the hub's | 88 STEM + 45 SEL, 14 label variants |
| Word Sounds setup | about 37 on the default view (34 with AI off); 33 recorded on 11-10 by a possibly different rule |

## 2. Small changes (one file each, few or no new strings)

| # | Change | Evidence | Tests that pin it |
|---|---|---|---|
| S1 ✔ | "Find a tool" starts open with a filter on (9 controls above the first tool). Start collapsed; the collapsed row already names the filter and keeps "Show all tools". | ANTI ~31840 `isToolCatalogExpanded` default `true`; panel `view_sidebar_panels_source.jsx` 778-824 | tool_catalog_collapse_contract, app_shell_cognitive_load, sidebar_shell_extraction, create_screen_visual_consistency; tour step `tour-tool-finder` |
| S2 ✔ | The finder's "Selected:" label uses the Guided Mode name (hard-coded English), so "Text Adaptation" shows as "Original with Supports". Build it from the same `t('sidebar.tool_*')` key as the card. | ANTI ~31847; `guided_mode_config_source.jsx` 93-117 | none found |
| S3 | The app tour (and Resume) is offered in both the Help menu and Start & setup. Keep it in Help only; Start & setup becomes 3-4 rows. | `view_header_source.jsx` 1026-1033, 2128-2147 | guided_tour_ux, header_compact, header_compact_help_and_independent_share, e2e/44-shell-journeys (`data-setup-tour-start`) |
| S4 ✔ | Hiding AlloBot focuses `[data-help-key="header_bot_toggle"]`, which exists only in the expanded header, so the compact header has no visible way back. Add a row to the Help menu while the bot is hidden (existing `toolbar.show_bot`); focus the compact "?" as fallback. | ANTI ~23624; `view_header_source.jsx` 1614 | allobot_idle_sleep_and_hide, header_help_menu |
| S5 ✔ | STEM hub stacks "Search 148 tools" and "What do you want to learn about?" + "Suggest tools"; "Cloudflare links (148)" shows to every user; tiles fade in 40 ms apart, so tile 148 starts 5.9 s late. One field with a Suggest button; links button into a teacher-only fold with Create/Load Station; cap the stagger. | `stem_lab/stem_lab_module.js` 9674, 9767, 9859-9882, 10591-10594 | stem_catalog_search_matching, stem_hub_tool_counts, other_resources_polish_wave25 (`data-stem-catalog-links-toggle`) |
| S6 ✔ | Life Skills opens on all 33 tabs because the domain defaults to `all`. Default to the existing "Start & Practice" domain. | `stem_lab/stem_tool_lifeskills.js` 1952, 10446 | lifeskills_tabs_a11y |
| S7 ✔ | Packets step 2 still shows 6 sound-pattern checkboxes, "Mix multiple levels" and "About these levels". Move `#shape-field` into `#more-2`; the closed line must reflect preset patterns. "Add up results" appears twice in the header. | `packets-make.html` 226, 283, 51, 54; `packets-make.js` 57-58 | packets_site_pages, packets_wave6_builders |
| S8 ✔ | Lesson plan has three print buttons; top and bottom call the same `handleExportPDF`. Image view renders Upload, Find and Regenerate twice. | `view_lesson_plan_source.jsx` 703, 719, 1173; `view_image_source.jsx` 391-461, 621-639 | lesson_plan_batch1_fixes, lesson_plan_one_page_summary, lesson_plan_plan_first_layout |
| S9 ✔ | Three QR/link cards use different labels for the same four actions; the session modal's are hard-coded English. Same four actions, same order, reusing `share_collect.test_as_student`, `share_collect.print_qr`, `mailbox.copy_link`, `mailbox.project`. | `view_session_modal_source.jsx` 802-814; `view_share_session_surfaces_source.jsx` 217-245, 607-616 | other_resources_polish_wave7 (`data-session-copy`), novak_delivery_preview |
| S10 | Reading Library shows up to 12 filter controls in a row. Keep Search, Reading level, Language; one "More filters (n on)" fold (one new string). | `reading_library_module.js` 4636-4747 | none reference `readinglib_filter` |
| S11 | Math Fluency probe shows 7 selects with no fold. Keep Operation, Practice Set, Start; the rest behind the "Customize · current values" pattern Fluency Maze already uses in the same file. | `math_fluency_module.js` 3026-3230, 9742-9748 | math_fluency, mathfluency_i18n |
| S12 ✔ | Document Builder's print/download action is inside the closed `<details id="builder-export-menu">`. Show it as a button beside the menu; menu becomes "More formats". | `view_export_preview_source.jsx` 10301-10318 | e2e/document_builder_responsive_keyboard, help_content_workflow (`doc_builder_export_action`), document_builder_ui_a11y |

## 3. Medium changes

| # | Change | Evidence | Tests |
|---|---|---|---|
| M1 | Add one "Documents" trigger to the finished-resource header beside Maximize, opening the existing menu (reuse `header.nav_documents`). | ANTI 46077-46215; `view_header_source.jsx` 1723-1829; `allo_commands_source.jsx` 1025 | view_header_reflow_a11y, header_compact_help_and_independent_share |
| M2 | SEL Hub first view = search, Start here cards, need chips, grid. "Help me choose", "Browse by skill area", "SEL Pathways" in one fold; "Teacher launch" and "Custom SEL Stations" in one teacher fold; one storage note; one save label ("Save now" / "Request project save" / "Export now" today). | `sel_hub/sel_hub_module.js` 5581, 5800-5812, 6092-6102, 6104, 6385, 6412, 6451, 7226 | sel_hub_navigation, sel_hub_bypass_block, sel_hub_launch_focus, sel_hub_controls_a11y, sel_hub_shell_i18n |
| M3 ✔ | STEM top bar has 6-9 buttons with two read-aloud toggles ("TTS/Mute" and "Listen") side by side. Keep XP, title, Listen, Close; one "More" menu for Theme, Canvas narration, Controls, Keyboard shortcuts, AI hints, Math Studio. In-tool bar: constant "Explore tool" subtitle, "Cloudflare link", keyboard hint also move there. | `stem_lab_module.js` 7510-7675, 7857-7928 | stem_hd23_header, stem_listen_host, stem_gr24_controls_gear |
| M4 | Source panel offers 10 ways in at equal weight. Keep Paste or type, Upload, Find online; the other seven under "Other ways to start" (existing string). | `view_sidebar_panels_source.jsx` 6090-6184, 3271, 542-548 | guided_source_entry, source_open_pdf_project_button, source_start_chooser, path_fork; tour target `tour-upload-source`; `data-source-dictate-btn` |
| M5 | Educator and Learning hubs: search, Favorites filter, Manage favorites, role picker, section chips, Recommended strip, Quick access strip, per-section collapse, per-card star. Keep search, chips, one strip; role picker and Manage favorites behind "More options" (`memory_aid.panel_more_options`); Favorites as a chip. | `view_educator_hub_modal_source.jsx` 485-553; `view_learning_hub_modal_source.jsx` 381-431 | hub_personalization, hub_filter_behavior, educator_hub_modal_runtime_a11y |
| M6 ✔ | SEL tools with flat bars of 15-31 tabs (mindfulness 31, howl 27, advocacy 25, emotions 25, selfadvocacy 23, civicaction 17, strengths 15). Adopt the Zones "core tabs + More (N)" pattern; each tool needs a core-tab list. The Zones label is a literal English string. | `sel_hub/sel_tool_zones.js` 33657-33666 | sel_tablist_arrow_keys, sel_howl_tablist_structure, sel_zones_tablist_structure |
| M7 | Live dock: Run keeps Poll, Check understanding, Present to class; "More activities" holds the rest; Recognize and Class goals become collapsed sections with a count. | `view_live_session_dock_source.jsx` 314-415 | live_dock_end_session, live_polling_*, live_presenter_reuse |
| M8 | Glossary: Edit is inside Tools▾; disclosures nest 3 deep; "words to use" select appears twice. Top row = search, filters, Flashcards, Edit, More▾ (one flat panel with headings). | `view_glossary_source.jsx` 2875-2944 | glossary_toolbar_view, glossary_ui_ux_contract, glossary_word_list |
| M9 | Adapted reader: Teacher setup → Teacher tools → Review & adjust is 3 levels. Fold Teacher tools into Teacher setup; rename "Save audio" to "Prepare audio" (`glossary.prepare_audio`) so it stops colliding with "Download Audio". | `view_simplified_source.jsx` 6004, 7112-7150 | reader_teacher_tools_panel, reader_layout_quick_wins, novak_* |
| M10 | Lesson Board: "Generate lesson board" is the last control before a board exists. Generate first with a one-line summary; mission, playing style, chance, scenery into the existing fold. | `lesson_board_source.jsx` 234-250 | lesson_board_setup_depth, lesson_board_default_scenery_ui |
| M11 | Mega-tool menus: BirdLab 126 cards under two headings, Printing Press 98 tiles, Road Ready 74 tiles plus five other routes. Show core + recommended + recent; fold the rest by existing groupings. | `stem_tool_birdlab.js` 23614-24647; `stem_tool_roadready.js` 37177-37320; `stem_tool_printingpress.js` 4266-4665 | e2e/64-birdlab-field-studio, printingpress_core_audit, roadready_* |
| M12 | "Teach Live" starts at once from the header but opens a three-choice dialog elsewhere, worded in backend terms ("configured Firebase, district, or local-network session backend"). One dialog; last-used connection as primary; the rest under "More options". | `view_header_source.jsx` 1256; `view_cold_path_screens_source.jsx` 453-465 | header_compact, live_session_center |
| M13 | Text popover: 27 controls in 288px; overlay has a header button and popover radios. First view keeps font, size, line height, spacing, reading theme. | `view_header_source.jsx` 2173-2421, 1514, 2387 | header_popovers_a11y, header_settings_coverage |
| M14 | Documents menu: four rows open the same builder. Builder stays primary; mode shortcuts and LMS rows under one disclosure (`fullpack.all_formats_summary`). | `view_header_source.jsx` 1741-1775 | header_compact_help_and_independent_share, qr_student_shell |
| M15 | Concept sort shows up to 8 emoji-only actions per card, always. Add an Edit toggle or per-card "Actions". | `view_concept_sort_source.jsx` 306-310 | concept_sort_authoring_controls |
| M16 | Three "Return to…" pills (Dynamic Assessment, PDF, Accessibility Lab). One pill listing what is resumable. | ANTI 49857, 49868, 50055 | accessibility_lab_golden |
| M17 | Image, DBQ and Math generator panels show 9-11 controls before Generate with no fold. | `view_sidebar_panels_source.jsx` 4423-4546 | not checked |

## 4. Large changes

- **One toolbar pattern across the 13 resource views**: [primary activity] [Listen] [Edit] [More]. Today: 7 Edit labels ("Edit", "Edit text", "Edit Quiz", "Edit Sequence", "Edit Text", "Edit Scaffolds", "Edit Plan", "Edit FAQs"), 2 exit labels, Edit in 4 positions, 12+ read-aloud labels, Regenerate in 2 of 13 views.
- **One back button**: hub draws one; 133 tools draw their own. `ctx.embedded` exists as a possible switch. Small per tool, 133 files × 4 mirrors.
- **Header that expands without rearranging**: the compact bar unmounts when expanded and its seven controls reappear elsewhere, mostly icon-only (`view_header_source.jsx` 1155, 1412).
- **Shared slots in the hub bar** for help (43 own "How to" blocks, 38 own shortcut helps, 9 use the hub tutorial), level (73 own difficulty states, three vocabularies) and read-aloud (78 own speaker buttons, 39 direct `speechSynthesis`). Script counts, not read per tool.
- **Word Sounds words-first re-layout**: not built. Settings (6) and Voice always open; "Quick jump" row exists only because the column is long; three disclosure styles; two Print & share places.
- **Naming pass**: setup wizard 6 names; AI settings 6; homework link 5 and its manager 3; student preview 6; "guided" means three things; "focus" means four; read-aloud modes have three vocabularies (reader: Read / Word meaning / Word sounds / Explain; FAB: Read / Define / Explain; immersive: Speak / Define / Sounds); launch-activity has five labels; "STEAM Lab" vs "STEM".

## 5. Patterns already in the code worth reusing

Each shows its current values when closed, which keeps the screen looking finished:
`AdventureSettingSection` (view_adventure_settings_source.jsx 330-405); Packets `details.more` + `.more-now`; Fluency Maze "Customize Maze · values"; Zones "More (N)"; History panel "More" and per-row "Actions"; Quiz panel numbered sections.

## 6. Text that is English in every language

- Help menu: `help_menu.title`, `explain`, `explain_desc`, `tour_desc`, `tips`, `tips_desc` are not in `ui_strings.js` or `help_strings.js` ✔
- `lesson_plan.print_summary_button` ✔
- Codename dialog rewording: `modals.student_entry_pick`, `entry.start_plain`, `modals.entry.your_codename`
- Session modal: "Copy student join link", "Test as student", "Print QR" ✔
- Glossary: "Send to Vocabulary Packet", "Download Vocabulary Worksheet"; quiz: "UDL Goal…", "Release feedback to students"
- STEM hub catalog strings (lines 9612-9925), Zones "More (N)", Guided Mode tool labels and delivery formats

## 7. Status of 11-09 review items

| Item | Now |
|---|---|
| A8 submit asks for codename again | Fixed |
| A9 reading supports split | Still true: 5 places; "focus" 4+ meanings |
| A10 codename dialog | Partly: reworded, new keys unregistered |
| B1 guidance overlap | Partly: an arbiter holds back first-run tips; AI Guide hidden in Guided Mode; tour still in two menus; a tenth system added |
| B3 tool names | Still true, and now leaks into the sidebar (S2) |
| B4 several names | Still true |
| B6 export behind Settings & more | Partly: the pack card shows delivery routes once resources exist |
| B8 error toasts | Still true by a different count: 268 error-like toasts, 184 with no next step |
| B9 AI setup | Fixed: guided flow by default, the rest under Advanced |
| B10 jargon | Still true |
| B11 delivery formats | Partly: three routes asked first; still 20 formats in 5 groups |
| B12 lesson builders | Still true: four entry points |
| B13 dashboard slot | Still true |
| B14 Quick Start wizard | Still true, reachable from three more places |
| B15 family / independent | Partly: independent no longer gets Student QR or the view toggle |

## 8. Build status (2026-11-23, uncommitted)

The owner approved building the small changes. S1-S12 are built in the working tree, not committed, not deployed. Lane notes, pre-edit copies, test logs and browser screenshots: `C:\tmp\ui_simplify_1123\` (`shell`, `output`, `hubs`, `lead`, `browser`).

| # | Built as | Notes |
|---|---|---|
| S1 | Finder starts collapsed; the app tour opens it on its finder step | ANTI |
| S2 | "Selected:" uses the sidebar card's translated name | ANTI; no new strings |
| S3 | Tour rows removed from Start & setup; Help menu keeps them | The review was wrong about `e2e/44-shell-journeys`: it does not use the removed hook |
| S4 | "Show AI Assistant" row in the compact Help menu while the bot is hidden; focus falls back to "?" | Students have no Help menu, so they still have no labelled way back: owner decision |
| S5 | One search row with a "Suggest tools" button; tile stagger capped at 0.48 s; AI-off note now matches what is shown | "Cloudflare links" needed no move: it already sits with Create/Load Station. Enter in the field no longer calls AI |
| S6 | Life Skills opens on "Start & Practice" (4 tabs); tab search looks across all 33 | |
| S7 | Sound-pattern checkboxes inside More options; the closed line names the chosen patterns | Reverses a placement made on 11-21 by another session; confirm with the owner |
| S8 | Image view: Upload and Find once, in the labelled toolbar; lesson plan bottom button uses the top one's name | |
| S9 | One vocabulary and order on all three QR/link cards from existing keys | Not seen in a browser (needs a live session backend) |
| S10 | Search, Language, Reading level, "More options" with a count of hidden active filters | Reuses `memory_aid.panel_more_options`; adds an "All collections" button to the no-match state |
| S11 | Operation, Practice Set, "Customize · current values", Start | Panel opens itself when Start is blocked by something inside it |
| S12 | Visible primary export button joined to the Export menu at 1024px and wider | Unchanged below 1024px: the header has no room |

Still open: the delivery manifest in `AlloFlowANTI.txt` is stale for the ten rebuilt modules (it was already stale for about 70 others; whole-file sync is a release step); the collapsed finder default, the "Selected:" label and the AlloBot focus fallback are shell-source changes and were not seen in a browser; translated UI was not checked.

Owner decisions (2026-11-23 afternoon), on the recommendations:
- S7 Packets patterns: keep them under More options (presets set them; the closed line shows them).
- S4 students: no extra control. Hiding AlloBot is not saved (a reload brings it back) and "Settings & more" holds the toggle.
- S10 "All collections" button in the no-match state: keep.
- Batch 2 approved and in progress: replace the "Two roads" dialog with its inline note; student SEL cards show icon, name, description, grades and session time (safety guidance kept); M1 + M14, M3, M2, M4.

Batch 2 built (uncommitted; lane folders `shell2`, `output2`, `hubs2`, `fix2`, `lead2`, `browser2` under `C:\tmp\ui_simplify_1123\`):

| Item | Built as |
|---|---|
| "Two roads" | Dialog removed; starts act on the first click; the "experimental · Back to the guided path" note shows in every case the dialog covered |
| M4 Source panel | Revised by the owner the same day: all six ways to bring in a passage stay on show (Upload, Find online, Write with AI, Reading catalog, Dictate, Open PDF project), plus Paste. Only the start-without-a-passage options (topic, word list, blank) fold behind a full-width "Other ways to start" pill, shown to teachers with no passage; it opens itself when another tool asks for a topic or word-list start. Owner's reason: Write with AI is a stronger feature than Find online and should not be hidden |
| M1 Documents button | "Documents" beside Maximize on every finished resource (shell source; not browser-verified, the deployed shell cannot load it) |
| M14 Documents menu | Builder, Homework QR, Share & Collect first; Worksheet, HTML, Slides, QTI, IMS under "Additional export formats" (independent learners see them directly). The menu now also opens in the compact header, which fixed the palette's "Open the export menu" |
| M3 STEM top bar | XP, title, Listen, More, Close; More holds Theme, Canvas narration, Controls, Keyboard shortcuts and the teacher items; one row on phones; tool subtitle shows its category |
| M2 SEL Hub | Start here, search, need chips, then "More ways to explore" and (teachers) "Teacher tools"; one save label "Export now"; 20 tab stops before the first card for teachers (was 24) |
| SEL cards | Students: icon, name, description, grades, time; guidance kept for Restorative Circle, Crisis Companion and Safety |

Open: "What the research labels mean" is still shown to students (recommended: teachers only). The guidance line, format and "Preview first" are not in each tool's Learning guide, so students no longer see them anywhere.

Not yet scheduled: the other medium items (M5-M13, M15-M17) and everything in section 4. Teach Live (M12) and the live dock (M7) wait for a live session backend to test against.

## 9. Not determinable without a browser

Wrapping of the compact bar between 1280 and 1536px; real overlap of the floating corners; how far a teacher scrolls to the first tool card; chrome height above the adapted passage; whether the image view's on-image buttons are hover-only; phone layouts of both hubs; whether each tool's own back button is visually redundant; AlloHaven entry counts.
