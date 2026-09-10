# Follow-up remediation pipeline review

Review only; application code was not changed. The [reproducible probes](probe.cjs) exercise the current strict candidate gate and inspect the source and candidate in Chromium. [Results](probe-results.json) include the source SHA-256, browser version, computed states, and ARIA snapshots. These are candidate-gate findings, not proof that the complete pipeline distributes a defective document.

## Prioritized findings

### 1. Protect effective form names and inherited state

At `doc_pipeline_source.jsx:10187`, the name comparison prefers `aria-label` over `aria-labelledby`. Chromium uses the referenced label in the tested case: changing the reference from Student name to Teacher name changes the exposed textbox name while the gate accepts it. The form snapshot also omits inherited disabled state: adding `disabled` to the enclosing fieldset disables the unchanged input in Chromium but passes the gate.

Refinement: compare effective accessible names using the appropriate naming precedence and resolved references, plus effective disabled state, including fieldset/legend exceptions. Preserve native association indexing. Tests should cover both harmful changes and equivalent representations. The optgroup-disabled probe was already rejected and does not establish another gap.

### 2. Bind visibility to source locations rather than text counts

At `doc_pipeline_source.jsx:10143`, hidden content is counted by normalized text across the entire document. A candidate can hide a required instruction and reveal an identical archived copy elsewhere; the count remains unchanged, so the gate accepts it. Chromium confirms that the required instruction disappears at its original location.

Refinement: associate visibility with source blocks and their context. Repeated wording cannot serve as interchangeable evidence. Resolve ambiguous duplicates conservatively and carry a source reference into review evidence.

### 3. Preserve internal link targets, not just href strings

At `doc_pipeline_source.jsx:10234`, destination comparison retains an internal href while allowing IDs to move between sections. The test keeps `href="#required"` but swaps the Required and Archive section IDs; the gate accepts the candidate and the target text changes to Archive.

Refinement: bind internal references to the intended source element, allowing consistent ID renaming while detecting target reassignment. Resolve relative links against a controlled base. A separate base-element probe also changed the browser's absolute destination without rejection; however, `_alloSanitizeRemediationHtml` removes base elements on paths that invoke it, so that probe is a gate-level observation with an existing downstream mitigation, not an established end-to-end defect.

### 4. Extend math protection to prose and exposed descriptions

The MathML structure check at `doc_pipeline_source.jsx:10195` catches structural changes but excludes accessible descriptions. Changing the MathML name from x plus y to x minus y passes while Chromium exposes the altered name. Separately, changing `x + y` to `x − y` in ordinary paragraph text passes because the wording comparison discards punctuation and neither operator is attached to a numeric atom.

Refinement: preserve meaningful operators in mathematical prose and compare existing accessible descriptions with the expression. Support explicitly reviewed description corrections rather than treating every metadata change as harmless or freezing an incorrect description forever. Native screen-reader testing remains necessary.

### 5. Reduce false rejection of valid repairs

Four probes demonstrate overly strict comparisons:

- Adding the default `type="text"` to an input is rejected as a form-state change, despite equivalent native behavior.
- Correcting the two headers of a column-header row from `scope="row"` to `scope="col"` is rejected. Protecting every existing scope value can preserve a source accessibility defect.
- Splitting already-hidden text with an inline strong element is rejected because hidden text-node boundaries change.
- An inline `display:none` declaration overridden by an existing `display:block!important` rule is rejected, although the computed display remains block. This tests CSS-cascade accuracy, not a recommendation to add that inline declaration.

Refinement: normalize equivalent HTML defaults, compare hidden content at a stable block level, and use rendered state for CSS-dependent decisions. Header repairs need a constrained semantic repair policy based on table relationships, distinct from immutable cell-value preservation. Add explicit false-rejection metrics to the calibration corpus.

## Validation and operational refinements

The thirteen deliberately selected probes produced seven accepted harmful changes, four rejected equivalent or corrective changes, and two expected outcomes. This is an adversarial sample, not a production error-rate estimate. The full automated repair, export, and distribution paths were not rerun for these cases.

Two broader follow-ups remain useful:

- **Assert test-file completeness.** The preceding implementation run exited nonzero while its JSON reported success and omitted a requested file. That file passed separately, but the runner cause remains unresolved. Validation should require a successful process exit and a result for every requested file, while retaining stderr and runner errors.
- **Calibrate on representative documents and human observations.** Existing MCP evidence uses a scripted model, synthetic policy cases test authored expectations, and the human corpus remains empty. Measure false acceptance, false rejection, retries, and review effort by document type. Keep missing metrics unavailable instead of inferring zeros. Do not tune readiness thresholds from the scripted self-test scores.

The strongest next engineering sequence is effective form semantics, source-bound visibility and internal references, then a constrained repair policy to reduce false rejections. Preserve final artifact validation and expand the corpus as each finding is fixed.
