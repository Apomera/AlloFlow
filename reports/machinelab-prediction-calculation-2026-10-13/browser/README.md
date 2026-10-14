# Native browser evidence

`final.json` selects `run-01`: 742 checks across all 24 unique station/scenario calculation routes, four native React/THREE scenarios and four screenshots. Native child and wrapper exits were observed as 0 (wrapper session 34687). `visual-review.json` records direct inspection of all four screenshots. The first attempt passed.

Expected values are independently calculated as load × movement ÷ efficiency ÷ time for input power, or load × movement ÷ efficiency for input energy. Coverage includes native keyboard mode/radio controls and Enter checking; blank, malformed and wrong numbers; fixed W/J input labels and resolving help/feedback references; calculations withheld until both steps pass; plain-mode answer exposure; sticky viewed-value provenance after edits and toggles; clear/next behavior; changed assumptions; unchanged physical setup and saved calculation records; minute normalization; and bounded load changes.

Visual checks cover a pending desktop calculation, a completed desktop calculation, dark phone energy practice and forced-colors phone load practice. Every shot verifies the numerical input bounds stay inside the panel and viewport. Text inputs may scroll their contents; their scrollWidth is not mistaken for layout overflow. Scenario selectors, labels, equations and buttons retain the existing clipping checks.

Source and public mirror stayed at `a870651502478d2885948b0c08f2065cbebefcf135241efb4c8da6ec0837f5ee`. The wrapper enforces a 240-second timeout and records source, mirror, harness, helper, native HTML, process and screenshot hashes. This exercised local Chromium with software WebGL, not a deployed host. Forced colors is browser emulation, not a physical assistive-technology session.
