# Cloud detective

The Cloud field guide now includes five illustrated comparison activities covering all ten cloud genera. Learners compare heaps and towers, smooth and lumpy low layers, two broad layers, high wisps and veils, and cloudlets at different levels.

Each activity offers an optional observation hint, retry feedback, an explanation tied to identifying features, and a sentence starter for explaining evidence. A selector and next button support free exploration. Changing pairs clears the previous answer and closes the hint. The activity preserves the weather scenario and all simulation settings.

Cards appear side by side on wider screens and stack below 361 pixels so cloud names remain readable. Text clues accompany the illustrations, controls work with a keyboard, and feedback is announced through a status region. There is no timer or automatic animation.

Validation: 30 existing storm/precipitation regression tests pass. `node dev-tools/watercycle_cloud_comparison_qa.cjs` checks all five answer pairs, incorrect-answer retry, correct evidence feedback, hint/answer reset, next/wrap navigation, keyboard activation, unchanged model settings, and axe accessibility at desktop, 390px, and 320px with dark mode. Browser checks also cover reduced motion. Screenshots are in `scratch/storm-immersion-review/cloud-comparison-*.png`.

Content builds on the guide's existing [WMO](https://cloudatlas.wmo.int/en/clouds-genera.html) and [NWS](https://www.weather.gov/lmk/cloud_classification) references. The diagrams are qualitative identification sketches; apparent cloud size alone is not a reliable measure of altitude.
