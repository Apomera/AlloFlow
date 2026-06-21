# Punnett / Genetics Lab — deep-dive review (2026-06-20)

Tool: `stem_lab/stem_tool_punnett.js` (`punnett`, ~3,400 lines). A proper React component
(`PunnettLab`) — hooks live inside it, no Loading-gate early-return, so no throwlab-style
risk. Sub-tools: Punnett Cross (4 inheritance modes), Dihybrid, Pedigree, Codon/translation,
Trait catalog, Challenge/Battle quizzes, Allele-frequency discovery, DNA mutation sim.

## Headline

**Scientifically strong — with one real genotype-ratio bug.** The codon table is 100%
correct, every cross mode produces the right phenotype ratio, the dihybrid is a correct
9:3:3:1, the trait catalog is accurate *and* unusually honest (it flags tongue-rolling and
hitchhiker's thumb as polygenic myths, labels polygenic traits), and the AI tutor is
click-gated. The one genuine error: the **monohybrid genotype ratio splits the heterozygote
into "Tt" and "tT"**, so the flagship Tt × Tt cross shows a wrong 1:1:1:1 genotype ratio
instead of 1:2:1.

## What's verified correct

- **Codon table** (`:305`) — all 64 RNA codons checked against the standard genetic code:
  AUG=Met (start), UAA/UAG/UGA=Stop, every 4-fold-degenerate box right. Amino-acid polarity
  categories (`:315`) sound.
- **Cross engine** (`:1317`–1395), traced per mode:
  - Complete dominance Tt×Tt → **3:1** phenotype ✓
  - Incomplete (snapdragon Rr×Rr) → **1:2:1** red/pink/white ✓
  - Codominant AB×AB → **1 A : 2 AB : 1 B** ✓ (with an in-code fix for an earlier case-only bug)
  - Sex-linked Cc×cY → **3:1** with the correct 50%-of-sons-affected distribution ✓
- **Dihybrid** (`:1439`) → **9:3:3:1** ✓; correctly forms 4 gametes/parent and **normalizes**
  each gene pair (uppercase-first).
- **Trait catalog** (`:280`) — accurate frequencies; scientifically honest (tongue-rolling /
  hitchhiker's thumb flagged as multi-gene; polygenic traits labeled). Aligns with the
  project's scientific-integrity stance.
- **AI tutor** (`:1292`) — opt-in, fires `callGemini` only on a typed question; no auto-fire.

---

## Findings (prioritized)

### MEDIUM-HIGH — monohybrid genotype ratio splits the heterozygote
`counts` is built from the **non-normalized** `flatGrid` (`:1387`–1389): the grid forms cells
as `parent1[i] + parent2[j]` (`:1325`) with no allele-order normalization, so Tt × Tt yields
`['TT','Tt','tT','tt']` and the ratio string (`:1424`–1426) renders:

> "Genotype Ratios: TT: 1/4 | Tt: 1/4 | **tT: 1/4** | tt: 1/4"

instead of the correct **TT 1/4 : Tt 2/4 : tt 1/4 (1:2:1)**. The bottom-left square cell also
displays `tT` (`:1906`). This hits the single most common teaching cross (heterozygote ×
heterozygote — Mendel's monohybrid) and the **default** state (Aa × Aa). The *phenotype* 3:1
is unaffected (it's counted separately via `domCount`/`recCount`). The dihybrid already does
this right — the fix is the same normalization.
*Fix:* when building `flatGrid`/`counts` and the cell label, normalize each 2-char autosomal
genotype to uppercase-first (`g[0] <= g[1] ? g : g[1]+g[0]`); skip sex-linked (multi-char
`XCXC`/`XCY` genotypes must not be sorted).

### LOW — Punnett square table is missing row headers
The square is a real `<table>` with `<caption class="sr-only">` and `<th scope="col">` column
headers (`:1890`–1894) — good — but the left-column parent alleles are `<td>`, not
`<th scope="row">` (`:1899`). So each offspring cell is associated with its column allele but
not its row allele, leaving screen-reader users without the full "row × column" coordinate.
*Fix:* make the row-label cell a `<th scope="row">`. (Also: the `sr-only` caption "punnett
data table" could name the actual cross, e.g. "Punnett square, Tt × Tt".)

### LOW — AI tutor doesn't guard a missing `callGemini`
`askAI` (`:1299`) calls `ctx.callGemini(...)` directly; if the host doesn't provide it, the
click throws (the `.catch` won't catch the synchronous TypeError). Titration guards this with
`typeof callGemini !== 'function'`. One-line defensive check.

### NOTE — allele-frequency tool uses a simplified model
`freqDyn` (`:3248`) computes `newP = p(1−s) + μq` and buckets the result into four qualitative
states. This is a heuristic recurrence, not the formal selection equation
(Δp = spq²/(1−sq²)). That's fine for its explicit "discover … no score, no reveal" inquiry
framing — just don't present it as the rigorous equation. Sliders are properly labeled.

---

## Suggested order of work
1. **Fix the monohybrid genotype ratio** (MEDIUM-HIGH) — normalize allele order, mirroring the
   dihybrid. Add a rendered test pinning Tt × Tt → "Tt: 2/4" and the four mode ratios (same
   approach as `tests/titration_lab_science.test.js`). This is the one real correctness defect
   and also closes the Tier-D logic-coverage gap for this tool.
2. Row-header + caption a11y (LOW) and the `callGemini` guard (LOW) — quick, safe.
