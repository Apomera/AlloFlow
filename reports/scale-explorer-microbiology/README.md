# Scale Explorer: living microscopic anatomy

E. coli and paramecium now have distinct, detailed 3D models, with interiors that open for exploration.

- **E. coli:** a rounded rod with a cell envelope, short pili, rotating helical flagella, a folded chromosome and a sample of ribosomes.
- **Paramecium:** a tapered body with an oral groove, rows of beating cilia, macro- and micronuclei, food vacuoles, and two contractile vacuole complexes. The reservoirs fill gradually and contract more quickly.
- **Eight landmarks:** selecting an interior structure opens the cutaway; selecting the envelope or oral groove closes it. The camera keeps the feature centered while orbiting. Selected cell markers use a leader line so they do not cover small organelles.
- **Scale:** the measured reference is body length, excluding appendages. Each body remains exactly one local unit before its physical scale is applied. Comparisons retain the catalog’s 100:1 length ratio between paramecium and E. coli.
- **Motion and saved views:** Pause ambience freezes cilia, flagella and reservoirs. Reduced motion prevents automatic movement. Notebook entries restore the selected structure, cutaway, orbit and magnification.

Cell surfaces use subtle relief and contrasting internal materials. Particles are batched into one mesh with accurate bounds; the bundled Three.js version’s generic bounds calculation does not include instance transforms. Cilia share one shader and geometry. These models reuse the existing cache and resource disposal path.

## Scientific scope and sources

These are educational anatomical illustrations. Colors, organelle proportions, filament counts and motion rates are simplified for readability; the catalog body dimensions remain the scale references. The notes state these limits and link to:

- [Bacterial structure — NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/NBK8477/): envelope, pili and flagella.
- [Architecture of the E. coli nucleoid](https://pmc.ncbi.nlm.nih.gov/articles/PMC6907758/): folded chromosome organization.
- [Translation of mRNA — NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/NBK9849/): ribosomes and protein synthesis.
- [Using Paramecium as a Model for Ciliopathies](https://pmc.ncbi.nlm.nih.gov/articles/PMC8535419/): cilia and locomotion.
- [Integrative Neuroscience of Paramecium](https://pmc.ncbi.nlm.nih.gov/articles/PMC8208649/): oral apparatus and cell organization.
- [Germline micronucleus — NLM MeSH](https://www.ncbi.nlm.nih.gov/mesh/68048631): the two nuclear types.
- [Contractile vacuole activity in Paramecium](https://pubmed.ncbi.nlm.nih.gov/9427677/): water regulation and vacuole activity.

## Verification

The focused numerical, persistence, investigation and fullscreen suites passed **105 checks** (`unit-results.json`). All **22 browser scenarios** passed without retries (`browser-results.txt`). The three cell scenarios also passed with the final marker-placement and physical-length assertions (`marker-results.txt`). Source syntax, whitespace and desktop source parity passed; the local preview returned HTTP 200.

The new browser suite checks actual body dimensions, cutaway geometry visibility, all eight landmarks, camera alignment, marker placement, shared-scale comparison, changing and paused animation state, reduced motion, phone keyboard exploration, notebook restoration and WebGL cleanup. Run unit and browser suites sequentially to avoid software GPU contention.

Screenshots: [open paramecium](paramecium-cutaway.png), [closed paramecium](paramecium-closed.png), [open E. coli](ecoli-cutaway.png), [closed E. coli](ecoli-closed.png), [contractile vacuole](paramecium-feature.png), [phone view](phone-vacuole.png), [shared scale](cells-at-shared-scale.png).

[Open the paramecium preview](http://127.0.0.1:54391/?tool=scaleExplorer&focus=paramecium&v=microbiology).
