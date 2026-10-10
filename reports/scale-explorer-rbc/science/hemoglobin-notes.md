# Hemoglobin structure guide

[RCSB PDB 2HHB](https://www.rcsb.org/structure/2HHB) is a human deoxygenated hemoglobin tetramer determined by X-ray diffraction at 1.74 Å. Chains A/C are alpha chains of 141 residues; B/D are beta chains of 146 residues. Each chain has one HEM group containing iron. Primary paper: [Fermi et al., 1984](https://doi.org/10.1016/0022-2836(84)90472-8).

Suggested model copy:

> The enlarged guide follows one human deoxygenated hemoglobin molecule from PDB 2HHB. Its four colored traces represent two alpha and two beta protein chains. Four heme groups each contain an iron atom. The traces follow alpha-carbon positions rather than showing every protein atom. This structure has no bound oxygen. Other visible particles are a sampled illustration of hemoglobin in the cytoplasm; their sizes, numbers and positions are composed for clarity.

`hemoglobin-data.json` preserves original Å coordinates. Its center and maximum bounding span cover retained alpha-carbon and HEM heavy-atom positions. Full protein heavy atoms, waters and phosphate are omitted. Chain colors and trace thickness remain illustrative.

The requested ≤1.9 Å proximity rule infers within-HEM organic bonds without bond orders. Fe–N distances exceed it: optional `ironCoordination` entries are therefore separate, explicitly labeled proximity-derived coordination guides rather than organic bonds. Do not add an oxygen molecule to this deoxygenated snapshot.
