# Water molecule: science and rendering contract

## Numeric reference

Use a rigid, neutral isolated H₂O reference with **O–H = 0.9578 Å**, **H–O–H = 104.4776°**, and **C₂v** symmetry. NIST CCCBDB attributes the equilibrium structure to Hoy and Bunker (1979). The page supplies three rounded Cartesian positions; the JSON retains those values separately. [NIST experimental geometry](https://cccbdb.nist.gov/expgeom2x.asp?casno=7732185), [primary paper](https://doi.org/10.1016/0022-2852(79)90019-5).

Renderer coordinates in Å are constructed from those scalars:

```text
O  = [0, 0, 0]
H1 = [ 0.7572078351983744, 0.5865297386443347, 0]
H2 = [-0.7572078351983744, 0.5865297386443347, 0]
H = [±r sin(θ/2), r cos(θ/2), 0]
```

The extra decimals preserve the scalar contract during construction; they do not add measurement precision. H–H separation calculated from this geometry is 1.51441567 Å. Preserve angle and the equal bond lengths through any visual normalization. Display 0.958 Å and 104.5°.

NIST distinguishes **μ₀ = 1.85498 D** for the ground vibrational state from an equilibrium value near **1.857 D**. Display “Gas-phase ground-state dipole ≈1.855 D.” The cited experiment is Shostak, Ebenstein and Muenter (1991). [NIST water properties](https://cccbdb.nist.gov/exp2x.asp?casno=7732185), [primary paper](https://doi.org/10.1063/1.460471).

## Scale and optional surface

Retain **2.75 Å / 0.275 nm** as an approximate catalogue reference. Amato et al. (2025) use a 2.75 Å surface-accessibility probe for water's steric size (PDF page 13, journal p.14875). This supports a modeling convention, not a unique molecular boundary. [Primary paper](https://oro.open.ac.uk/105001/8/105001.pdf).

If using a van der Waals representation, label the choice. **Bondi radii: O 1.52 Å, H 1.20 Å.** Mantina et al. discuss their approximate, contact-dependent meaning and the alternative 1.10 Å hydrogen convention. [Primary paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC3658832/).

Our calculated union of Bondi atom spheres at the equilibrium centers spans **3.9144 × 3.3065 × 3.04 Å**. Do not place a “2.75 Å” width measurement across that union. Prefer a ball-and-stick main view with illustrative atom radii and a separate approximate reference-size statement. An optional surface may show the chosen contact model at the same atom centers. A smooth decorative shell must not be labelled calculated electron density.

## Dipole and charge labels

The **electric dipole vector μ points negative → positive**; in the chosen coordinates this is +Y, from O toward the H midpoint. A **crossed-tail chemical polarity arrow points toward O**, −Y, and should be labelled “Polarity toward oxygen.” Avoid an unlabeled arrow that confuses these conventions. [IUPAC definition](https://goldbook.iupac.org/terms/view/E01929/html), [Georgia Tech chemistry lesson](https://williams.chemistry.gatech.edu/structure/molecular_interactions/mol_int.html).

Use qualitative **δ− on O / δ+ on H**, with total molecule charge zero. Exact partial atomic charges depend on the assigned model. [NIST research explanation](https://www.nist.gov/programs-projects/effect-partial-charge-calculation-method-adsorption-thermodynamics-metal-organic).

## Five native inspection stops

| ID | Visible mesh target | Educational value |
| --- | --- | --- |
| `oxygen` | O ball surface | One oxygen at the vertex; conventional red color |
| `hydrogens` | H ball surface | Two equivalent hydrogens; conventional pale color |
| `bond` | Exposed O–H connector | Equal bonds, 0.958 Å; display thickness is illustrative |
| `angle` | Angle guide arc outside O ball | Planar bent 104.5° arrangement |
| `polarity` | Crossed-tail polarity arrow toward oxygen | 1.855 D gas-phase magnitude; chemical arrow convention |

Targets should sit on rendered mesh surfaces and remain visible from their inspection cameras. The guide arc/arrow are annotations, with their geometry named in the copy. Native pointer picking must not require a hidden sphere in empty space.

## Feasibility and limits

Three atom spheres, two split-color cylinders, an angle tube and a vector are inexpensive geometry. A single composed scene can offer structure/polarity views without rebuilding resources. The same rigid atom centers should drive spheres, bonds, angle guides and inspection positions.

Keep electron trajectories, synthetic quantum clouds and unlabeled lone-pair blobs out of this measured geometry model. The display omits electrons and nuclei. The atom spheres are representations of atom sites; their outer surfaces are chosen for the visual convention. Any vibration, field or neighboring-water demonstration needs separately labelled assumptions and scales. An isolated molecule has no intermolecular hydrogen bond.

`water-science-data.json` contains numeric values, constructed and published coordinates, reference convention, feature copy and source URLs. Downloads and hash checks, if present, stay in scratch. No application dependency, repository edit, staging or commit is part of this research.
