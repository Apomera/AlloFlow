# Moon Phase Observatory assets

- `moon-lroc-color-2k.jpg` — LROC WAC color mosaic from NASA's CGI Moon Kit.
- `moon-lola-height-1k.jpg` — LOLA-derived lunar elevation map from NASA's CGI Moon Kit.

Source: https://svs.gsfc.nasa.gov/4720

Credit: NASA's Scientific Visualization Studio; visualization assets by Ernie Wright (USRA), with LRO Camera and Lunar Orbiter Laser Altimeter data.

# 3D Observatory star catalog

- `hyg-v41-naked-eye.json` — naked-eye subset (visual magnitude 6.5 and brighter, Sun excluded) of the HYG Database v4.1 (`hygdata_v41.csv`). Fields kept: HIP id, J2000 RA/Dec in degrees, magnitude, B-V colour index, IAU constellation code, proper names. The tool precesses these J2000 positions to the chosen date.

Source: https://github.com/astronexus/HYG-Database (archived; current home https://codeberg.org/astronexus/hyg)

Credit: HYG Database by David Nash (astronexus), which combines the Hipparcos, Yale Bright Star and Gliese catalogs.

License: CC BY-SA 4.0 (https://github.com/astronexus/HYG-Database/blob/main/hyg/CURRENT/LICENSE). This derived subset is shared under the same license. The source file checksum and adaptation description are recorded inside the JSON, and the subset is regenerated with `dev-tools/build_hyg_naked_eye_subset.cjs`.
