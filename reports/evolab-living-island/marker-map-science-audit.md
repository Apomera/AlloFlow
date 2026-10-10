The proposed marker lens is a descriptive census investigation. It does not advance
the evolutionary model, create births, move the expedition's organisms, or draw its RNG.

The exact questions are distinct:

- Copy H: independently choose two recorded marker copies with replacement. They
  differ with probability 2p(1-p) in one island. The exact same physical copy can be
  selected twice. The maximum for this two-letter marker is 0.5.
- Selected island pair: choose the first copy from island i and the second from j.
  Ordered outcomes aa,aA,Aa,AA have probabilities (1-pi)(1-pj),(1-pi)pj,
  pi(1-pj),pi*pj. Differing probability is the sum of the middle two terms.
- Recorded heterozygotes: inspect the two copies already paired inside each actual
  organism. observedH is count(Aa or aA)/N. It can range from0to1 and need not equal H.
- Within average: choose an island with census weight wi=Ni/Ntotal, then make both
  independent copy draws there. It is sum(wi*Hi). This is not the same as conditioning
  two globally pooled copy draws on having landed in one island, which uses wi^2 weights.
- Pooled H: two independent copies from the full archipelago, including island
  pairs weighted by wi*wj. weightedPairs reconstructs the same probability.
- Geography gap: pooled-within=2*sum(wi*(pi-pbar)^2). This is a direct algebraic
  identity of these census frequencies, not an estimate of effective size, FST at
  equilibrium, reproductive isolation, or genome-wide genetic diversity.

Primary-source audit:

Abhari et al. explicitly formulate 2p(1-p) using uniform independent draws with
replacement, distinguish pooling from population averaging, discuss unequal population
weighting, and give the within-plus-between decomposition. Here, the draw units are the
actual recorded allele copies, rather than the paper's binary sequence representation.
[Measuring genetic diversity across populations, PLOS Computational Biology (2024)](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1012651)

Lachance distinguishes observed genotype frequency from 2pq expectation (equation8),
describes actual genotype counts, and notes that multiple causes can yield departure
from Hardy-Weinberg proportions. The UI should therefore avoid diagnosing inbreeding,
selection, or other mechanisms from one observedAa-versus-H difference.
[Detecting selection-induced departures from Hardy-Weinberg proportions, Genetics Selection Evolution (2009)](https://link.springer.com/article/10.1186/1297-9686-41-15)

Teaching cases separated and mixed are alternative static geographical arrangements
of the exact same ID+genotype pools. For each species both contain72organisms,48A+96a
copies, zeroAa organisms and pooledH4/9. Separated has island frequencies1,0,0 and withinH0;
mixed has1/3on every island and withinH4/9. These are not successive generations and
do not demonstrate evolution by moving markers or changing genes. Show the case name
prominently; replay the fixture independently from the captured expedition checkpoint.

The marker never mutates and has no direct breeding weight in this model. Finite
parent pools can nevertheless associate marker copies with selected trait values,
so neutral does not mean the realized marker frequency is unaffected by everything.
Actual model pedigree and allele-copy provenance are retained only in recorded mode;
fixture IDs refer to teaching organisms and should not launch expedition inspectors.
