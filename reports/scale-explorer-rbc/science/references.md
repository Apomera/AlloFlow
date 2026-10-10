# Healthy mature human red blood cell: visual research

Research checked 6 October 2026. This is implementation guidance, not a clinical model.

## Existing item

- Catalogue ID is `rbc`, with a **7.5 µm diameter** reference (`across`), not `cell`.
- The current renderer is already biconcave, using a deformed sphere and an ad hoc profile: `sign(y) * .19 * sqrt(1-q²) * (.32+2.4q²-1.5q⁴)`.
- Current landmarks are `center` and `rim`. The upgrade should correct proportions, surface seams, native selection and internal anatomy.

## Measured profile

[Evans and Fung, 1972, Improved measurements of the erythrocyte geometry](https://doi.org/10.1016/0026-2862(72)90069-6) is the original microscopy study. The equation and coefficients are directly reproduced in **Eq. 7, page 2267** of [Dao et al., 2003, The mechanics of the human red blood cell deformed by optical tweezers](https://www.mit.edu/~mingdao/papers/JMPS_2003_Red_Blood_Cell.pdf).

For radius `R`, radial coordinate `r`, and `q=r/R`:

```
z = ±0.5 R sqrt(1-q²) (0.207161 + 2.002558 q² - 1.122762 q⁴)
```

The paper uses `R=3.91 µm` (diameter 7.82 µm). Keeping the catalogue's 7.5 µm reference means scaling the same dimensionless profile to `R=3.75 µm`. Derived geometry then has center thickness ≈0.777 µm and maximum rim thickness ≈2.46 µm. Maximum thickness occurs around `r/R≈0.700`; these numbers are calculations from the scaled equation, not separate specimen measurements.

Safe diameter-one parametrization for a surface of revolution about Y:

```
u in [0, PI]; a in [0, 2 PI]
r = .5 sin(u)
y = .25 cos(u) (C0 + C1 sin²(u) + C2 sin⁴(u))
x = r cos(a); z = r sin(a)
```

This runs from top dimple to rim to bottom dimple without the square-root derivative at the rim. Use one actual center vertex per pole and a closed seam to avoid zero-area cap faces. Analytic outward normals are proportional to `(-y' cos(a), r', -y' sin(a))`. Both dimples are closed surfaces.

## Five selectable features

| ID | Suggested label | Visual and short teaching point |
| --- | --- | --- |
| `center` | Two shallow dimples | Focus on a complete upper dimple; orbit to the matching lower indentation. The thin center still contains cytoplasm. |
| `rim` | Thicker, rounded rim | Place the target near the maximum-thickness ring, not at the exact outside equator where the profile closes. Compare its thickness with the center. |
| `membrane` | Enclosing cell membrane | Select a smooth exterior patch and reveal a short section of the enclosing boundary. Keep the whole cell predominantly smooth. |
| `spectrin` | Spectrin beneath the membrane | Open a local section and reveal a sampled irregular mesh immediately inside the membrane, with sparse short actin nodes. It supports deformability; it is not a surface ornament. |
| `hemoglobin` | Hemoglobin-rich cytoplasm | Reveal a dense, continuous red interior with a small sample of enlarged protein illustrations. State that mature human cells have no nucleus or mitochondria. |

The first two derive from the measured profile above. The last three are supported by the studies below.

## Membrane skeleton and interior

[Pan et al., 2018, Super-Resolution Microscopy Reveals the Native Ultrastructure of the Erythrocyte Cytoskeleton](https://doi.org/10.1016/j.celrep.2017.12.107) studies membrane-preserved erythrocytes. It reports approximately 80 nm between junctions, consistent with relaxed spectrin, and irregular voids beneath intact membrane. Use a sparse, irregular illustrative network; a perfectly uniform hexagonal sheet or giant rigid lattice would overstate the evidence.

[Takeuchi et al., 1998, Structure of the erythrocyte membrane skeleton as observed by atomic force microscopy](https://pubmed.ncbi.nlm.nih.gov/9591644/) studies human erythrocyte ghosts and places the spectrin mesh on the cytoplasmic face. Its preparation alters the membrane's appearance. Do not copy dried-sample relief as the normal living cell exterior.

[Sae-Lee et al., 2022, The protein organization of a red blood cell](https://www.sciencedirect.com/science/article/pii/S2211124722009056) uses proteomics and structural methods. Mature human RBCs lack nuclei and major organelles, while hemoglobin dominates their protein content. The membrane, submembrane cytoskeleton and hemoglobin-rich cytoplasm are the defensible three-part internal illustration. Avoid a central nucleus, mitochondria, internal membrane sacs or a hollow dimple.

## Rendering limits

- Keep a smooth, wet-looking red exterior with restrained fine texture and curved highlights. The color is a chosen educational rendering rather than a measured optical simulation.
- Use a cutaway window or missing sector rather than transparent whole-cell layering; retain the intact exterior for the default view and comparison.
- Membrane thickness, spectrin filaments and hemoglobin particles need substantial enlargement or sampling to be readable at cell scale. Say so near the model and feature copy.
- The 7.5 µm reference remains the outer diameter in every pose. Interior selection must not resize it.
- Depict one healthy resting human erythrocyte. Shape, size and membrane mechanics vary, and flow deformation is not represented by a static reference profile.
- Do not animate oxygen as glowing balls traversing measured pores, or claim this model simulates gas diffusion or membrane mechanics.
