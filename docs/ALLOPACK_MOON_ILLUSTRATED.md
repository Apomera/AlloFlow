# Moon Phases and Eclipses — illustrated review edition

The importable file is `allopacks/illustrated/moon_phases_grade6.allopack.json`. The original text-only pack is preserved. This is the twenty-first illustrated edition, with educator review pending; no live community-library entry was published.

## Coverage and style

All 33 image placements are embedded: ten glossary terms, five native anchor sections, ten native concept-sort cards and eight lesson panels. Four original matte gouache Moon paintings serve six placements. Twenty-seven diagram placements use ten distinct geometric designs across eleven diagram roles (the shadow and lunar-eclipse roles share geometry). Pictures contain no baked-in labels. Captions remain editable in the app.

Every slot stores a reviewed image-specific description and image hash. Selected PNGs, editable SVGs, WebPs, prompts and mapping are retained in `allopacks/media/moon_phases_grade6/manifest.json` and its neighboring files.

## Scientific review

Seventy-three field changes are recorded with before/after values in `allopacks/media/moon_phases_grade6/content-refinements.json`. Reading, glossary, anchor chart, memory aids, sort cards, quiz answers, sentence frames, FAQ and activity instructions are aligned.

The lesson distinguishes approximately half the whole Moon receiving sunlight outside lunar eclipses from the changing illuminated fraction of its visible disk. It separates the approximately 27.3-day orbit/rotation relative to stars from the 29.5-day phase cycle. [NASA Moon phases](https://science.nasa.gov/moon/moon-phases/)

Lunar eclipses can be penumbral, partial or total; redness is associated with totality rather than every lunar eclipse. Solar totality occupies a narrow path with partial views over a wider region. Orbital tilt is relative to Earth's orbital plane. [NASA eclipses](https://science.nasa.gov/moon/eclipses/)

Approximately the same face stays toward Earth; libration reveals some edges. Far side does not mean permanently dark. [NASA tidal locking](https://science.nasa.gov/moon/tidal-locking/)

The lamp-and-ball activity explicitly keeps the ball above the observer's head shadow near full phase, then compares this with a deliberate eclipse alignment. It uses a cool teacher-approved lamp and blunt handle, with no direct solar viewing or laser. The diagram shows materials rather than the observer's phase view. [NASA JPL modeling lesson](https://www.jpl.nasa.gov/edu/resources/lesson-plan/model-a-solar-eclipse/)

Earth-view phase disks and space-view position diagrams are distinguished in captions. Right-lit waxing is a northern-up textbook convention, not a universal sky orientation. Sizes, distances, shadow cones and orbital planes are simplified and not to scale. Lunar textures are artistic.

## Verification

- All 15 targeted pack/catalog tests passed, including six pack tests covering portability, descriptions/hashes, retained content, phase sequence and the complete correction audit.
- All 71 collection files and 807 resources passed production-loader imports.
- Local catalog download and offline reopen preserved all 14 resources; all 33 images decoded and all eight lesson alt attributes were verified.
- Five anchor images, ten teacher-sort images and ten student-sort images rendered with zero pending images.
- Generated originals, diagram contact sheet, all four mobile lesson groups and the native-resource mobile view were visually reviewed.

Evidence: [tests](allopack-quality-2026-09-10/moon-tests.json), [integration](allopack-quality-2026-09-10/moon-integration.json), [native resources](allopack-quality-2026-09-10/moon-native-resources.json), [collection imports](allopack-quality-2026-09-10/imports.json).

The harness uses local catalog responses and production components, not a live deployment or full signed-in teacher session. Harness styling/translations are incomplete. Anchor thumbnails are reminders; use larger lesson panels for detailed teaching.

Existing anchor and teacher-sort renderers treat adjacent images as decorative; student-sort uses card statements for alt. Glossary and lesson views consume the stored rich descriptions. Those existing renderer behaviors need a separate full accessibility review.

## Rebuild

Run `node dev-tools/build_moon_illustrated.cjs`. This invokes the shared builder and then the scientific refiner. Running the generic builder alone would omit corrections. The planner refuses to overwrite an existing manifest.
