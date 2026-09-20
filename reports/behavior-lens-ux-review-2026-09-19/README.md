# Behavior Lens: usability and product direction

> Follow-up: the first workspace enhancement is now implemented locally. See [changes and verification](../behavior-lens-workspace-2026-09-19/README.md). The findings below describe the reviewed state before that implementation.

Reviewed September 19, 2026. This is an analysis and design proposal; application code was not changed.

## Recommendation

Make Behavior Lens a student workspace with a continuous **observe → understand → support → review** loop. Keep its specialist capabilities, but put daily work and continuity ahead of tool discovery. The next investment should be a connected workflow, a quieter home screen, and consistent evidence semantics.

The current interface requires users to learn the inventory before they can confidently choose their next action. More introductory banners, AI recommendations, or tools would add to that burden unless they replace existing routes.

## What was actually checked

- Read the current main and workspace modules and the September 12 review and implementation update. That update explicitly marks the older defect list as historical; those defects are not repeated here as current findings.
- Rendered the current component with real React and generated Tailwind styles in isolated Chromium at 1280, 390, and 320px. Used a synthetic student and stubbed host services/icons/AI. No live student information or AI calls were used.
- Measured initial, returning, definition-builder, and Family Mode states. Exercised definition navigation and draft recovery at desktop and phone widths.
- Initial hub scans returned no axe violations or JavaScript page errors at all three widths. The main Close button fits at 320px. These results do not establish accessibility conformance for all tools or the full application.
- This was not a teacher usability study, a production integration test, or an exhaustive audit of all 101 tools. Timing targets and proposed navigation below are hypotheses to validate.

Reproduction: run `node reports/behavior-lens-ux-review-2026-09-19/browser-audit.cjs`, then `node reports/behavior-lens-ux-review-2026-09-19/flow-review.cjs`. The generated preview clears storage only in the isolated audit browser context; do not load it into a browser context containing real Behavior Lens work.

## Current findings

### 1. The home screen has too many competing priorities

**Browser confirmed.** The initial teacher fixture renders 101 tool cards and 304 buttons across the scrollable page. At 390px, its scroll container contains about 28,740px of content; at 1280px, about 11,947px. These are total rendered controls and content heights, not controls visible simultaneously or measured task times.

The hierarchy stacks student/role setup, sandbox configuration, getting-started steps, welcome/role choices, quick-start pathways, search, categories, a specialist quick-launch strip, backups, profile, recommendations, and the catalog. Populated cases can add summaries, dashboard figures, and a heatmap. The first catalog headings appear around y=2,624 on the initial phone view, although the primary observation shortcut appears earlier.

**Change:** a compact student/context header; one primary action; resume work; a short recent-work list; one secondary doorway to all tools. Move sample configuration into a clearly labeled practice area. Use one onboarding entry point. Do not implement this by adding another card above the existing stack.

Evidence: [initial desktop](initial-1280.png), [initial phone](initial-390.png), [flow measurements](flow-results.json). Source: [hub](../../behavior_lens_module.js#L27817), getting started at line 29049, welcome at 29063, quick launch at 29164, tool grid at 29290. Line numbers refer to the reviewed checkout.

### 2. The guidance systems disagree about what progress means

**Source confirmed.** `NextStepRecommender` at line 9624 uses record counts and AI-analysis presence. Five ABC entries can produce “You have enough data”; a reachable later condition with session history produces “Full FBA cycle data collected.” The separate recommendation list at line 28993 uses `visitedPanels`, and offers AI analysis at three entries. Opening Goals can unlock a contract recommendation without confirming that a goal was created. The guided FBA's first definition step opens ABC and uses the existence of an ABC record as its automatic evidence.

These rules measure different things: navigation, data quantity, generated output, and completion. Their progress percentage can communicate more certainty than the app has established.

**Change:** one recommendation resolver, with explicit reasons and inspectable evidence. Example: “You have observations from one setting. Record another setting relevant to your question.” Avoid a universal entry-count threshold for sufficiency. Show “draft,” “needs review,” and “ready for team discussion,” with user confirmation where judgment is required. Allow users to proceed or record why a step is not relevant; avoid a rigid wizard for experienced users.

### 3. Defining a behavior is disconnected from using it

**Source and browser confirmed.** The Operational Definition Builder stores completed definitions under `toolState.operationalDefinitions`. Its parent passes neither canonical `targetBehaviors` nor a target-update callback (line 30250). The ABC panel separately receives both (line 29671). The builder therefore does not directly establish the target used by that panel.

The builder's description and working fields use local component state (line 15517). In both tested widths, entering a description, returning to the hub, and reopening the builder returns an empty description. Saved definition history is durable; the unfinished draft is not.

The final editing/save sections are gated by `aiDef.formalDefinition` (line 15644). A basic definition cannot be completed through that builder's displayed save flow without an AI result. The separate ABC target editor means this is a gap in the recommended builder journey, not proof that every definition path requires AI.

**Change:** a shared target editor with a manual-first path. Store label, observable definition, examples/non-examples, and selected measure against one immutable target ID. “Use this target” should carry it into observation and review. AI may suggest wording; users can edit and save without it. Preserve unfinished work when switching tools.

### 4. Role handling and language do not create distinct daily experiences

**Browser/source confirmed.** Family Mode reduces the catalog to 12 rendered cards in this fixture, but retains setup and catalog structure. The teacher home still promotes JABA Graphs, SCD Manager, and Effect Size through the same quick-launch strip used by specialists. Role selection occurs in multiple places. The first-use teacher route opens ABC; the specialist route opens a graph, regardless of whether a measurement question has been established.

**Change:** keep one case underneath and adapt the defaults:

- Teacher: add an observation, record a brief session, see the agreed support, resume a draft.
- Family: share what happened, see the agreed support, contribute preferences and feedback.
- Specialist: inspect target definitions, measurement quality, phases, graphs, fidelity, and competing explanations.

Use plain task labels in primary navigation. Explain technical terms in context, with specialist labels available. Consolidate role selection in one location and make capabilities available without forcing users to identify with a professional label.

### 5. Visual emphasis obscures operational importance

**Rendered and source supported.** Strong gradients, colored borders, emoji, uppercase micro-labels, badges, and heavy type appear across routine cards and guidance. Sandbox setup occupies much of the initial viewport. Several unrelated actions look equally urgent. The product alternates between an educational resource library, a clinical instrument collection, and a student-record workspace.

**Change:** retain the indigo identity, use neutral surfaces for most content, emphasize one main action, and reserve conspicuous color for selection or actionable status. Use readable body text and compact lists for tool discovery. Keep professional learning and practice available in a separate destination. Fix the information hierarchy before tuning spacing or colors.

### 6. Phone welcome dismissal has an interaction defect

**Browser reproduced.** At 390px the welcome heading/content intercepts pointer clicks on “Dismiss Welcome.” Keyboard focus plus Enter works. The same pointer action succeeds at 1280px. The close control and subsequent relative content need a correct stacking order and non-overlapping hit areas. This illustrates why a clean axe scan does not establish task usability.

### 7. Data meaning needs another focused consistency pass

**Source-confirmed residual paths; not reproduced across every output.** The hub average at line 29246 still substitutes intensity 3 for missing intensity (`e.intensity || 3`), despite the workspace runtime supporting unknown ratings. Other legacy summary/export paths contain the same fallback. The heatmap at line 9690 groups by `e.date` with UTC-derived dates, while the normalized runtime also has occurrence timestamps and local dates.

**Change:** derive every displayed metric from shared selectors. Display rated sample size, observation time, units, target, date range, and excluded/missing records consistently. Verify the same synthetic case across hub → detailed review → graph → exported report. Treat the heatmap mismatch as a targeted reproduction task; do not assume its effect for every record shape.

## Proposed experience

The interactive concept accompanying this review illustrates a returning teacher. It uses synthetic content and does not change the app. The minimum navigation is **Today · Record · Review · Support plan**, with **Browse tools & learning** as a secondary destination.

### Today

Student and current question stay visible. Offer “Add observation” and “Start timed session,” or prioritize “Resume observation” when a draft exists. Show recent work and the next concrete review action. Keep save location and any failure visible without presenting routine backup actions as the main task.

For an empty workspace, let a teacher record a context note immediately. When they choose systematic measurement, ask for a target and what they need to measure. Do not require a full assessment setup before capturing useful information.

### Record

Use everyday prompts: “What happened before?”, “What did you observe?”, “What happened next?” Let users choose a context note or a measurement session. Guide measurement choice with the question: count occurrences, time duration, measure latency, or sample intervals. Preserve target, setting, phase, occurrence time, exposure, and drafts through the handoff to existing recorders.

### Review

Show observations alongside their context and measurement definitions. Give users a clear distinction between what was recorded, a possible interpretation, and information still needed. Keep observations editable with provenance. A review need not invoke AI. An AI hypothesis should remain attributable to its inputs and reviewable by the team.

### Support plan

Connect the agreed question and evidence to changes in the environment, an accessible replacement skill, an adult response, and a review date. Include student/family preferences and a practical check that the plan was implemented. Show participation and skill development as well as incident measures. Keep a formal FBA/BIP workflow available for qualified team use.

This emphasis is consistent with the Center on PBIS's focus on prevention and teaching/encouraging skills in [Function-Based Support: An Overview](https://www.pbis.org/resource/function-based-support-an-overview). The proposed interface is our design inference, not a PBIS-endorsed implementation.

## Deeper enhancement work

1. **One case model.** Relate targets, measurement plans, observations, hypotheses, supports, goals, reviews, and reports using stable IDs. Retain the current normalized workspace and recovery protections. Migrate legacy tool state conservatively; preview ambiguous mappings and keep the originals.
2. **One evidence view.** Establish consistent meanings for zero events, not observed, missing ratings, observation time, local dates, phases, and measurement units. Do not mix counts with rates or interpret a frequency decrease without checking observation exposure.
3. **One continuation model.** Every tool should declare what it reads, what it writes, its prerequisites, draft state, and its return destination. Completion should depend on a saved artifact or an explicit review, rather than panel visits. Preserve context when using specialist tools.
4. **A systematic content review.** Inventory overlapping goal, report, graph, and replacement-behavior tools. Decide which are alternative views of one artifact and which serve genuinely distinct tasks. Review AI prompts, clinical-sounding assertions, unsupported readiness thresholds, and role-specific explanations with practitioners. Do not certify the whole catalog based on this UX review.
5. **Reusable interaction patterns.** Shared editing, save/draft feedback, validation, empty states, export scope, and navigation. Centralize tool metadata so catalog, role defaults, prerequisites, and related actions agree. Split the large module along those boundaries after defining their contracts.

## Recommended implementation sequence

| Priority | Work | Completion evidence |
|---|---|---|
| First | Repair definition draft loss, manual definition completion, target handoff, welcome hit area, and misleading readiness/summary text | Reproduce each original failure, then verify recovery and correct output |
| Next | Replace the default hub with the student workspace; move the catalog and practice setup behind clear destinations | A new teacher can find and save an observation without tool-name knowledge |
| Then | Unify target → measurement → review → support → follow-up across the highest-use tools | One target and its provenance survive save, switch, reopen, graph, and export |
| After that | Specialist depth: graph/phase tools, fidelity, case comparisons, team review artifacts | Practitioners can inspect assumptions and reproduce reported measures |

Start with one complete vertical slice: **select student → define or choose target → record → correct/review → reopen → report**. Preserve existing specialist access while validating this slice. Avoid a wholesale rewrite or another expansion of the tool inventory.

## How to validate the direction

Recruit a small formative group of teachers, specialists, and family users; use synthetic cases. Ask them to record a recent event, start a timed observation, resume an interrupted draft, identify the evidence behind a suggested next step, and prepare a team review. Observe without teaching them tool names. Record task completion, misroutes, recovery, and what they believe was saved.

Proposed design targets, not observed performance: reach recording within two deliberate actions after selecting a student; save a simple observation in about one minute; return to a draft without losing any fields; distinguish observation from inference; locate the next agreed action without browsing the catalog. Refine these targets from baseline testing.

Evaluate phone, keyboard, screen reader, zoom/reflow, AI-disabled, offline, empty, populated, and interrupted states. Use task checks alongside automated accessibility scanning. NN/g's [progressive disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/) supports separating frequent tasks from advanced options and validating that split with task observation; it does not determine which tools this audience uses most.

## Evidence files

- `browser-results.json`: initial hub viewport bounds, accessibility results, and control inventory.
- `flow-results.json`: state measurements, phone pointer failure, and lost definition draft.
- `initial-*.png`, `returning-*.png`, `definition-*.png`, `family-*.png`: rendered evidence.
- `browser-audit.cjs`, `flow-review.cjs`: reproducible local probes.

No production deployment, source modification, or real-user usability study was performed.
