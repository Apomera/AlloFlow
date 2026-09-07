# Weather vs. Climate — illustrated edition

Complete portable pack: ../../illustrated/weather_vs_climate_grade5.allopack.json

- 24 embedded images: ten glossary pictures and fourteen lesson panels.
- 15 resources, including the existing anchor chart and applied challenge added by Claude.
- All artwork is text-free. Native labels and captions remain editable.
- All images include image-specific alt text and hashes tied to their final embedded bytes.
- Original PNGs and optimized WebP files are retained here.
- manifest.json contains the generation prompts and visual review; embedded-assets.json maps final WebP files and descriptions.
- lesson-plan.json retains the original lesson-image prompts.
- AlloPack size at verification: 1,715,137 characters, approximately 1.7 MB.

Rebuild from repository root:
node dev-tools/build_weather_climate_illustrated.cjs

Browser verification:
node dev-tools/qa_weather_climate_illustrated.cjs

Focused pack tests:
npx vitest run tests/allopack_weather_illustrated.test.js tests/allopack_illustrated.test.js tests/allopack_catalog.test.js tests/catalog_index.test.js --maxWorkers=1 --pool=threads --testTimeout=30000

Verification passed for the actual catalog component, catalog download, production import bridge and loader, hydration, offline image decoding, and native panel descriptions. Test responses used a local preview catalog; the live Community Library was not changed. Full signed-in teacher-session export and live deployment are outside this component test.

Science refinements include a more precise arithmetic-mean definition, climate as long-term patterns/ranges, and the troposphere as the layer where most weather occurs. Native captions distinguish representative landscapes from measured climate evidence.

See ../../../docs/WEATHER_CLIMATE_ILLUSTRATED_REVIEW.md for verification scope and publication guidance.

