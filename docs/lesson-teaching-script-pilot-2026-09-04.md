# Optional teaching-script pilot

> **Superseded on September 4, 2026.** The fractions/grades 3–6 restriction below was an implementation choice, not the intended scope. The feature is now lesson-aware across subjects and grade/age groups; see [lesson-teaching-script-generalization-2026-09-04.md](lesson-teaching-script-generalization-2026-09-04.md).

Implemented locally on September 4, 2026. This extends the saved teacher lesson-plan view with an optional direct-instruction script for fractions in grades 3–6. The original lesson plan remains intact. This work does not implement the separately scoped planning-input review feature.

## Teacher workflow

Open a saved lesson plan in teacher mode and expand **Teaching script**. Review the learning goal, grade, 10/15/20-minute duration, relevant prior learning, optional target standard, and selected lesson resources. The language follows the saved plan where available.

Generation adds a separate version containing 3–6 timed steps: proposed word-for-word teacher wording, student actions, a check question, a possible student response, and follow-ups for students who need more help or are ready to extend their learning. Steps link to the selected teaching materials and applicable retrieved recommendations. Teachers can edit, copy, or download the script as text. The three most recent versions are retained, with that limit disclosed before generation.

The standard is teacher-provided context. The pilot does not verify standard wording or certify alignment. Parent and independent/student modes do not expose generation or editing.

## Research behavior

The initial evidence source is the What Works Clearinghouse practice guide [Developing Effective Fractions Instruction for Kindergarten Through 8th Grade](https://ies.ed.gov/ncee/wwc/PracticeGuide/15), published in September 2010. Its K–8 scope includes the pilot grades. Applicable recommendations concern fractions as numbers and understanding why fraction procedures work; publisher evidence ratings are attached only when found with the corresponding recommendation in the retrieved page.

When available, the app's existing search provider performs one generic fractions/grade query. Search snippets do not establish evidence. The adapter reads the allowlisted official guide through the app's established Jina reading service, checks the reported source URL, and matches recommendation text in that actual retrieval. It does not invent additional sources, evidence ratings, or claims that the generated wording has been evaluated. Lesson text and prior-learning notes are not sent in search queries.

If research is requested but the guidance cannot be retrieved, generation stops with a retry/opt-out message. Turning research off is an explicit teacher choice and creates a version labelled without retrieved research support. Optional research-module loading cannot block access to saved versions or generation with research disabled.

## Integration and data integrity

- Uses the configured AI text provider and the existing saved-resource update path.
- Captures the plan and actual selected teaching content before asynchronous work. Relevant input changes, deleted plans, changed teacher workspaces, and cancellation prevent late attachment.
- Matches known unit, lesson, and source-artifact provenance; excludes learner-marked submissions and unsupported content fields.
- Bounds material input to 24,000 characters and discloses actual truncation or omission in the saved version.
- Validates complete teaching fields, exact total duration, material references, and recommendation references. An invalid AI response receives at most one corrective retry.
- Preserves the original plan and existing script metadata during edits. The interface keeps rejected or stale edit drafts available.
- Loads feature modules on demand using the existing module registry and build pipeline. Text export retains source references and evidence limitations.

Primary implementation files: `lesson_teaching_script_source.jsx`, `lesson_teaching_research_module.js`, `lesson_teaching_script_host_module.js`, and `view_lesson_teaching_script_source.jsx`. The saved-plan view, host shell, build registry, English string catalog, and desktop public mirrors are integrated.

## Validation

139 distinct automated checks passed across the core contract (17), research adapter (49), host boundaries (14), interface (19), actual app integration (4), and existing saved-resource mutations (36). The integration checks caught and corrected an optional-loader dependency. Final generated-asset verification also caught and corrected loader calls that the existing build could not rewrite to local URLs.

Live Node and Chromium retrieval of the official guide succeeded, including source-URL checks and recommendation evidence ratings. The actual built interface and app CSS were checked at desktop, 390px, and 320px widths, including edit and collapsed states: no axe violations, horizontal overflow, or browser console errors. Visual review also improved the mobile version selector.

The local development build, generated JSX parsing, module registration, view-prop checks, public-mirror checks, and local asset-path checks form the final integration verification. Test and screenshot artifacts are in `scratch/lesson-teaching-script-*` and `scratch/teaching-script-ui/`.

Model responses in automated and visual checks are fixtures; a live AI provider was not invoked for an educator-quality evaluation. Before expanding to other subjects, grade bands, or whole-lesson scripts, review real generated examples with educators for mathematical accuracy, pacing, usefulness, and faithful use of the cited recommendation. This is a research-informed drafting pilot, not a validated instructional intervention. No production deployment was performed.
