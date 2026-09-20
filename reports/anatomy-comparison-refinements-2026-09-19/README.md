# Anatomy comparison refinements — September 19, 2026

This pass improves comparison within Explore. The canonical anatomy module and active desktop mirror receive the same changes.

## Findings and changes

- The old table called the lungs’ browsing collection, “Organ Systems,” its body system. Comparison now uses the existing scientific membership catalog, including multiple memberships such as the pancreas in digestive and endocrine systems. A short explanation distinguishes body systems from browsing collections.
- Diagram visibility was labeled simply “View.” The revised row says “Shown in this diagram” and explains that front/back marker placement does not represent the entire anatomical extent of a structure.
- A question’s answer previously depended on which of the pair occupied the selected position. Questions now derive from the sorted structure IDs and learning band. Swapping the two positions preserves the clue, answer, feedback, and practice record.
- Duplicate answer callbacks previously used stale study state. The handler now updates from current state, rejects duplicate or out-of-context responses, and preserves newer notes and practice records. Saved answers require the current question identity and a valid choice. Older unscoped answers reopen for practice; existing study evidence is retained.
- Entries for the same anatomical concept in different collections now explain that relationship. They do not ask an ambiguous either-or identification question.
- Learners get a similarity/difference prompt, complete age-appropriate function descriptions, read-aloud support for the question, and feedback explaining both structures. Sources and further clinical or healthy-living context are available in a disclosure. Younger learners do not receive adult clinical or muscle-attachment details in the comparison.
- The comparison tray has a keyboard-accessible jump to the comparison heading. Clearing the comparison restores focus to the selected structure’s Compare button. Text and controls are larger, the table stacks labeled cells when its container is narrow, and native table semantics are retained with explicit roles.
- Recording a pair is described as exploration rather than mastery. Reading a comparison does not add an answer attempt.
- Thirty-four new text keys are translated into French, Latin American Spanish, and Arabic in both sets of language packs.

## Scientific reference check

The distinction between organ systems and navigation groups, and the possibility of multiple system contributions, was checked against [OpenStax: Structural organization of the human body](https://openstax.org/books/anatomy-and-physiology-2e/pages/1-2-structural-organization-of-the-human-body). The front/back terminology was checked against [OpenStax: Anatomical terminology](https://openstax.org/books/anatomy-and-physiology-2e/pages/1-6-anatomical-terminology). The statement about where markers are shown describes this tool’s implementation.

This pass reuses the existing structure-function content and source catalog. It does not represent a new scientific review of every function or clinical statement. The source disclosure retains that limitation.

## Validation

**320 targeted regression checks pass across 6 files.** After the final translation and mixed-direction-text polish, all **50 comparison-specific checks** pass again. These are overlapping checks, not additional unique tests. The full anatomy suite was not rerun in this pass. Results and the final source hash are recorded in `verification.json`. The targeted tests exercise the comparison handlers in both module copies, plus existing comparison, scientific-content, study-continuity, and general anatomy regressions. Browser checks cover keyboard navigation, answer continuity when positions swap, 1280px/390px/320px layouts, dark mode, younger grade bands, shared anatomy, and all three translated interfaces. All **10 scoped accessibility scans have zero violations and zero incomplete checks**. The browser run has no page errors and retains 8 screenshots. Phone, dark-mode, and Arabic captures were visually reviewed. Accessibility scans are scoped to the comparison panel and tray; they do not certify the whole app. A narrow-screen caption wrapping defect found during visual review was fixed and given a geometry regression check.

Some legacy structure descriptions, clinical paragraphs, and source titles still use English in translated interfaces. This pass translates the comparison instructions and controls and improves mixed-direction text; it does not translate the entire anatomy catalog.

No commit or deployment was performed.
