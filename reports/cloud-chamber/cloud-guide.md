# Cloud field guide

Storm Lab now includes a collapsible illustrated guide to all ten main cloud genera: cumulonimbus, cumulus, stratus, stratocumulus, nimbostratus, altostratus, altocumulus, cirrus, cirrostratus, and cirrocumulus.

Each selection shows its silhouette, typical height band, identification clue, and weather association. Notice, Explain, and Investigate offer progressively deeper reading and observation prompts. The cumulonimbus entry can explicitly load the existing summer-storm experiment. Merely browsing or changing explanation depth preserves weather settings.

The guide is an identification aid. The existing chamber does not separately simulate all ten genera or infer an observed cloud type from rain alone. Height bands are qualitative and vary geographically and seasonally.

References: [WMO International Cloud Atlas](https://cloudatlas.wmo.int/en/clouds-genera.html), [NWS classification guide](https://www.weather.gov/lmk/cloud_classification), and [NOAA Cloudwise](https://www.weather.gov/media/owlie/cloud_chart.pdf). Illustrations are original SVG sketches.

Validation: `node dev-tools/watercycle_cloud_guide_qa.cjs` passes all ten selections, all three explanation depths, unchanged weather settings while browsing, the scenario action, keyboard activation, and axe accessibility checks at 1440px and 390px, including dark mode. Desktop and phone screenshots were visually reviewed. Existing storm/precipitation regression results are saved in `cloud-guide-regressions.json`.
