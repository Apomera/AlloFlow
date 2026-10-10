# Moon Phase Observatory assets

## Scale Explorer Earth

- `scale-earth-bluemarble-1k.png` — 1024 × 512 Blue Marble satellite mosaic, downloaded without modification for the local 3D globe.
- Source: https://svs.gsfc.nasa.gov/2915
- Image: https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-1024.png
- Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio. Blue Marble data courtesy of Reto Stockli (NASA/GSFC) and NASA's Earth Observatory.
- This is a historical composite, not live Earth imagery. It is bundled locally; exploration does not request NASA's servers.

## Scale Explorer Jupiter imagery

- `scale-jupiter-hubble-1k.jpg` — first global Jupiter map from Hubble observations in 2015, 1024 × 512 preview.
- Source: https://svs.gsfc.nasa.gov/12021
- Image: https://svs.gsfc.nasa.gov/vis/a010000/a012000/a012021/Hubble_Jupiter_color_global_map_2015a_print.jpg
- Credit: NASA's Goddard Space Flight Center and Space Telescope Science Institute. Scientists: Amy A. Simon, Michael H. Wong, Glenn Orton.
- Bundled without alteration. A historical surface map, with simulated scene lighting; not live imagery.

## Moon imagery

- `moon-lroc-color-2k.jpg` — LROC WAC color mosaic from NASA's CGI Moon Kit.
- `moon-lola-height-1k.jpg` — LOLA-derived lunar elevation map from NASA's CGI Moon Kit.

Source: https://svs.gsfc.nasa.gov/4720

Credit: NASA's Scientific Visualization Studio; visualization assets by Ernie Wright (USRA), with LRO Camera and Lunar Orbiter Laser Altimeter data.

# 3D Observatory star catalog

- `hyg-v41-naked-eye.json` — naked-eye subset (visual magnitude 6.5 and brighter, Sun excluded) of the HYG Database v4.1 (`hygdata_v41.csv`). Fields kept: HIP id, J2000 RA/Dec in degrees, magnitude, B-V colour index, IAU constellation code, proper names. The tool precesses these J2000 positions to the chosen date.

Source: https://github.com/astronexus/HYG-Database (archived; current home https://codeberg.org/astronexus/hyg)

Credit: HYG Database by David Nash (astronexus), which combines the Hipparcos, Yale Bright Star and Gliese catalogs.

License: CC BY-SA 4.0 (https://github.com/astronexus/HYG-Database/blob/main/hyg/CURRENT/LICENSE). This derived subset is shared under the same license. The source file checksum and adaptation description are recorded inside the JSON, and the subset is regenerated with `dev-tools/build_hyg_naked_eye_subset.cjs`.

## Earth at night and higher-resolution daytime map

- `earth-blackmarble-2016.jpg`: NASA Black Marble 2016 color composite, 3600 × 1800, downloaded without modification.
- Source: https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/
- Direct: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg
- Credit: NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS data: Miguel Román, NASA GSFC.
- `earth-bluemarble-2k.png`: NASA Blue Marble, 2048 × 1024, downloaded without modification from https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png .
- Daytime source and credit: https://svs.gsfc.nasa.gov/2915/ ; NASA/Goddard Space Flight Center Scientific Visualization Studio. Blue Marble data courtesy Reto Stockli (NASA/GSFC) and NASA Earth Observatory.
- Educational use under NASA imagery guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/ . No NASA endorsement is implied.
- Both are historical composites. Night emission is filtered from the published color map and enhanced in the shader for visibility, with illustrative sunlight and twilight. It does not measure population or present conditions.

## Jupiter cloud atlas

- `jupiter-opal-2015.jpg`: full-resolution Hubble OPAL rotation-1 map, 3600 × 1598, downloaded without alteration. January 19, 2015 observation.
- Source: https://science.nasa.gov/asset/hubble/jupiter-global-map-from-hubble-opal-data-rotation-1/
- Direct: https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/2015/10/STScI-01EVT28CB7CN0CEYRV56WP1S6A.tif/jcr:content/renditions/3600x1598.jpg
- Credit: NASA, ESA, A. Simon (GSFC), M. Wong (UC Berkeley), and G. Orton (JPL-Caltech).
- Map documentation: https://archive.stsci.edu/hlsps/opal/cycle22/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2015_all_v2_readme.txt
- The map covers approximately 79.9° N–79.9° S in planetographic latitude. UV remapping preserves this cropped coverage; plain polar caps identify missing data. Longitude runs from 360° System III west at the left edge toward 0° at the right.
- Cloud latitude is mapped onto the atlas oblate shape with polar/equatorial ratio 0.935. The model retains the catalog’s rounded 143,000 km equatorial diameter. Earth reference: 12,742 km diameter at the selected cloud level.
- This is historical imagery with illustrative lighting; the reference does not assert a present-day storm diameter.
