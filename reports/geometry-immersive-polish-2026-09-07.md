# Immersive Stretch Lab refinement

This pass makes scene navigation available throughout the workspace and expands appearance controls without lengthening the main editor.

- A floating Corner / Front / Side / Center view toolbar stays available in Build, Settings, Help, and with the editing controls collapsed. It hides during immersive sessions. Compact-screen framing reserves space for both the toolbar and the bottom editor.
- Settings has six direct shortcuts: Appearance, Scene guides, Measurements, Headset, Playback, and Sharing. Shortcuts open the relevant disclosure and focus its title. Appearance is separated from guidance and sizing.
- Custom shape colors and adjustable glass opacity update the actual 3D material. Both persist locally, travel in shared links, and reset with display settings. Appearance changes preserve dimensions and geometry history. Invalid imported values receive safe defaults or bounds.
- The headset panel now includes Free build / Lessons switching, Explore / Explain / Compare focus, and Center. Labels reflect the active state, controls participate in the existing ray and keyboard input paths, and immersive entry/exit updates their accessibility state.
- After a shape exists, optional starter shapes move below the editor, keeping the primary build action visible on smaller phones.

## Verification

- All 120 focused immersive unit tests pass, including five new behavior tests.
- Five new real-browser workflows pass with no page errors or failed requests: custom WebGL materials and settings navigation; the persistent view toolbar; reload and shared-link restoration; simulated headset entry/actions/exit; and maximum Room-scale shape framing on 390×844 and 360×740 phone viewports at all three angles.
- Nine screenshots capture desktop appearance, collapsed controls, the simulated headset panel, and both phone layouts. Evidence and executable checks are in `scratch/geometry-immersive-polish-2026-09-07/`.
- Headset UI transitions were simulated in a real A-Frame browser scene. Physical headset/controller hardware was not tested.

[Open the Immersive Stretch Lab](http://127.0.0.1:4177/immersive_geometry/immersive_geometry.html)

## Final visual fixes and regression checks

The simulated headset screenshot exposed illegible spatial font glyphs. Spatial labels now use local canvas text, including live formulas, scene annotations, and panel buttons. Textures are reallocated when their dimensions change and disposed with their components, preventing stale glyph fragments during updates. No font CDN request is needed for these labels.

All six prior immersive browser regression workflows also pass: starter/exact-edit Undo and Redo, rendered appearance and reload, display reset, lesson target navigation, phone panels and control collapse, and maximum Room-scale framing. The source and desktop public mirror are identical; scoped whitespace validation passes.