# Explore experiment and evidence review

Explore's climate and land controls now share the map's paper and teal surfaces. Values are larger, preset controls wrap on phones, and land choices retain checkmarks with an underline. Prediction choices have at least 44px targets. Baseline and current bars have separate lanes, preserving both values when one is larger.

The climate badge uses the existing scenario label. The temperature, sunlight, and wind controls do not establish enough conditions to diagnose fog, snowfall, or a rainbow.

Run the preview with `node dev-tools/watercycle_visual_system_qa.cjs --serve`, then run `node dev-tools/watercycle_learning_visual_qa.cjs`. Its six light/dark/contrast states at 1280px and 320px exercise keyboard temperature changes, ground selection, five prediction choices, separate bar lanes, observation saving, and evidence retention across section changes. The final checks also enter keyboard navigation in forced colors and verify readable selection and visible focus. `results.json` contains the completed checks; `forced-followup.json` retains the earlier focused keyboard verification.

The final browser run passed 68 checks and six accessibility audits without errors. `feature-regressions.json` records 44 passing tests for Storm experiments, Steward decisions, host surfaces, label placement, predictions, land controls, and visual comparisons. `weather-readout-regressions.json` records eight passing scenario boundary checks after the badge correction.

Retained screenshots show desktop controls, desktop evidence, dark phone evidence, and forced-color phone controls. Syntax, whitespace, and source/mirror integrity are checked before commit. The captures use a paused model; they verify the interface and workflow rather than measured hydrological outcomes.
