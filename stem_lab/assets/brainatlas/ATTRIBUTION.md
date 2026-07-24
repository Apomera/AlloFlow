# Brain Atlas 3D model attribution

## Brain, Male (NIH 3D entry 3DPX-020960)

- Creator: Human Reference Atlas (HRA)
- Source: https://3d.nih.gov/entries/3DPX-020960
- Source file: `3d-vh-m-allen-brain.glb`, version 1.01
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- License text: https://creativecommons.org/licenses/by/4.0/
- Published by NIH 3D on August 5, 2025

The source describes a 141-structure whole human brain derived from the Allen human brain reference atlas (Ding et al., 2016), mirrored to form a whole brain and resized for the Visible Human reference bodies.

AlloFlow modification notice: the source GLB was losslessly optimized and encoded with `EXT_meshopt_compression` and `KHR_mesh_quantization` for faster web delivery. Anatomical structures and their source names were retained; no anatomical geometry was intentionally changed. The optimized file is named `alloflow-brain-atlas-meshopt.glb`.

## Runtime libraries

- Three.js core, OrbitControls, and GLTFLoader r128 — MIT License. See `../../../vendor/three-r128/LICENSE.txt`.
- meshoptimizer decoder 1.2.0 — MIT License. See `../../../vendor/meshoptimizer/LICENSE.txt`.

The Brain Atlas interface also displays the model source and CC BY 4.0 attribution directly inside the 3D viewer.
