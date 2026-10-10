# Starlight through dust — Enhancement 61

Nearby space now has another layer of depth: stars behind the generated dust clouds dim and redden, while stars in front stay clear. Moving beside or through a cloud changes how much dust lies between the camera and each star. The effect is enabled by default in the stellar neighborhood.

**Starlight through dust** is available in display settings, full-screen Compose controls, and the blue/violet region inspector. Changing it pauses travel so you can compare the same view. Saved views, captures, notes, inspection Back, and returning from a flyby detour preserve the setting. Older saved views use dust on. Neighborhood flyby thumbnails show the default dust-on appearance.

## Model and limits

Three fixed, generated ellipsoids near the blue and violet emission regions contain smooth dust density. The renderer integrates that density only along the finite segment from camera to star. Transmission follows an exponential attenuation law, with stronger attenuation in blue than red. Stars in front of a cloud receive no attenuation from that cloud; stars inside receive only the intervening part. Overlapping clouds contribute additive optical depth.

This is a qualitative teaching model. Cloud positions, densities, and RGB coefficients are illustrative, not a surveyed dust map or calibrated extinction curve. It attenuates stellar light, including the nearby star surfaces and their highlights. The diffuse emission scenery, background band glow, and distant galaxy proxies remain illustrative and are not attenuated by this model. It does not calculate a full spectrum, scattering into the view, dust emission, or gas dynamics. The existing gaps in the glowing filaments still represent weaker emission.

The physical motivation is that intervening dust obscures background light and preferentially removes shorter visible wavelengths. See [NASA’s explanation of nebulae](https://science.nasa.gov/mission/hubble/science/universe-uncovered/hubble-nebulae/) and [ESA’s description of dust reddening](https://www.esa.int/ESA_Multimedia/Images/2022/05/Hiding_in_Plain_Sight).

## Verification

The completed checks and exact source hashes are recorded in [verification.json](verification.json): 45 focused tests, 39 rendered captures, 30 GPU ray checks, 7 browser workflows, 6 accessibility scopes without violations, and 15 refreshed flyby previews. Supporting evidence includes the [unit tests](unit/evidence.json), [rendered comparisons and GPU ray checks](native-attempt1/check.json), [UI browser checks](browser-attempt2/check.json), and [refreshed preview checks](previews/check.json). Static review and exact reversible source deltas are included beside this report.

The focused tests use a Node canvas/event shim. Browser checks exercise the actual WebGL renderer and React controls. Field-note export content was checked from the generated Blob; the host canceled saving the browser download. The full application DOM suite and physical-device GPU coverage were not run. No files were staged or committed.
