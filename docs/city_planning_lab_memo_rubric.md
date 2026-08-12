# City Planning Lab: the plan memo rubric

> One page, for a teacher who needs something gradeable. Print it, edit it, ignore the parts
> that do not fit your class. It is a starting point, not an instrument, and it has not been
> validated as one.

> **Companion to** `docs/city_planning_lab_design.md`. The tool itself produces no score by
> design (§4 of that doc explains why), so this is the artifact that carries the grade.

---

## The one rule that makes this rubric work

**Do not grade the plan. Grade the reasoning about the plan.**

A student whose plan misses a soft target and who explains exactly why they let it go should
score **higher** than a student who met everything and wrote three sentences. The tool
already reports whether constraints were met; it does that better and faster than you can.
What it cannot do, and what is actually worth your time, is judge whether the student
understood what they were choosing between.

This is not a stylistic preference. The tool refuses to rank plans because ranking them would
mean asserting that one arrangement of a town is better than another, which is a claim nobody
can support. A rubric that graded the plan would quietly put that claim back in.

---

## What to have in front of you

- The student's **plan memo** (the downloadable HTML, or the printed version).
- Optionally the **Class view** in the tool, which shows per student: requirements met, what
  they gave up, whether they ran the Assumption Lab, and which constraint they named as
  binding. Load their exported plan JSON files into it.

The Class view never reads memo prose and the class CSV never exports it. Reading the memo is
your job, not the tool's.

---

## The four criteria

Each runs **Not yet / Developing / Solid / Strong**. Weight them however suits your course;
criterion 4 is the one that separates a good memo from an excellent one.

### 1. Names the binding constraint, and is right about it

| | |
|---|---|
| **Not yet** | No constraint named, or names one that was never close to binding. |
| **Developing** | Names a real constraint but treats it as the only one, with no sense of margin. |
| **Solid** | Names the constraint that actually pushed back hardest and cites the number from the scorecard. |
| **Strong** | Names it, cites the margin, **and** identifies what would have to change for a different constraint to bind instead. |

*Look for:* the difference between "the budget was hard" and "the budget bound at $21.2M of
$22M, and if I had needed one more bridge nothing else would have mattered."

### 2. States the trade-off honestly

| | |
|---|---|
| **Not yet** | Describes what was achieved only. No cost acknowledged. |
| **Developing** | Mentions something given up, but framed as a minor detail or someone else's fault. |
| **Solid** | Names what was given up, quantifies it, and does not apologise for it. |
| **Strong** | Names it, quantifies it, **and** argues for it: says who benefits and who does not, and why they decided that was acceptable. |

*Look for:* whether the student can say "I converted 8 hectares of farmland and I think that
was the right call because..." rather than either hiding it or treating it as a failure.

### 3. Knows which of their numbers are measured and which are modelled

| | |
|---|---|
| **Not yet** | Treats every figure on the scorecard as equally solid fact. |
| **Developing** | Aware some numbers are estimates, but cannot say which. |
| **Solid** | Correctly separates counts and areas from the modelled figures, and says why the distinction matters. |
| **Strong** | Does that, **and** notices that a measured number can still rest on a choice, for example that "homes a road reaches" depends on where they decided to build roads. |

*Look for:* the student who realises that "1,240 homes" is a different kind of claim from
"$21.2M" and can explain the difference without prompting.

### 4. Tests whether the conclusion survives the assumptions

This is the criterion the whole tool exists to support.

| | |
|---|---|
| **Not yet** | Never ran the Assumption Lab. |
| **Developing** | Ran it, reports that numbers changed, draws no conclusion. |
| **Solid** | Identifies which conclusions held under both parameter sets and which did not. |
| **Strong** | Does that, **and** acts on it: either redesigns so the plan holds under both, or states plainly which belief the plan depends on and why they are willing to bet on it. |

*Look for, especially in Mesa Hollow and Harborlight:* both towns can produce a plan that
meets every requirement under central assumptions and fails a **hard** one under conservative
assumptions. In Harborlight the safe area of the map physically changes. A student who
notices that and moves their housing has done the most valuable thing this tool can teach.

---

## Two things not to grade

**Do not grade how many requirements the plan met.** The tool reports that; adding it to the
rubric double-counts it and pushes students toward optimising the dashboard rather than
thinking. If you want it recorded, take it from the class CSV as a completion field, not a
score.

**Do not grade whether the town "looks right."** There is no correct arrangement, no stored
solution, and no answer key. If two students hand in completely different plans that both
meet the brief, that is the subject working as intended.

---

## A short version, if you want one line per student

> Did they find the real constraint, say honestly what it cost them, know which of their
> numbers they can lean on, and check whether their answer survives being wrong about the
> uncertain parts?

---

## Notes for whoever edits this next

- Written 2026-08-11 alongside the tool. **Not a validated instrument**, and it should not be
  described as one in anything that goes to families or to a research write-up.
- The wording of the four criteria is deliberately about reasoning, not about planning
  knowledge. A student can score Strong without knowing anything about zoning.
- If a department wants a numeric grade, mapping Not yet / Developing / Solid / Strong to
  1-4 and weighting criterion 4 double is a defensible starting point, and is the only place
  in this whole tool where a number gets attached to a student.
