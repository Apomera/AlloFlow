# Native browser evidence

`final.json` selects `run-02`: 555 checks across all 24 unique station/scenario routes, four native React/THREE scenarios and four screenshots. Native child and wrapper exits were observed as 0 (wrapper session 38409). `visual-review.json` records direct inspection of all four final screenshots.

Expectations are independently calculated as load × movement ÷ efficiency ÷ time for input power, or load × movement ÷ efficiency for input energy. Coverage includes native keyboard radio selection and disclosure focus, hidden calculations before a correct check or viewed explanation, sticky viewed-solution provenance, retry/next controls, unchanged physical setup and saved calculation records, bounded time/efficiency/load changes, minute normalization, responsive layout and forced colors.

The first attempt remains preserved and excluded: `run-01/observed-wrapper.json` records both exits as 1 and the two narrow-screen selector-clipping failures. Its four screenshots were inspected; the production fix shortened four option labels. The harness and overflow assertions did not change. Final source and public mirror stayed at `ead716145aa5dda704b6f3fe3dd0e624b57456054af2a1036a6c0e69c38152b3` throughout the successful run.

The native wrapper uses a 240-second timeout and records source, mirror, harness, helper, process and screenshot hashes. This is local Chromium with software WebGL, not a deployed host. Forced colors is browser emulation, not a physical assistive-technology session.
