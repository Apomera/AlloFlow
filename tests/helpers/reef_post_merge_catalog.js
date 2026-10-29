// Reviewed custom specimen rigs added after the shared lofted-fish catalog.
// Explicit inventories keep the earlier geometry/draw budgets unchanged.
export const POST_MERGE_PARTS = {
  "leaf_scorpionfish": [
    "leaf-body-and-fins"
  ],
  "longnose_hawkfish": [
    "fish-and-perch"
  ],
  "chocolate_chip_sea_star": [
    "fixed-body-knobs",
    "paired-tube-feet"
  ],
  "porcelain_anemone_crab": [
    "fixed-shell-chelae-legs",
    "feeding-fans-antennae"
  ],
  "varicose_phyllidia": [
    "fixed-mantle-foot-gills",
    "paired-lamellate-rhinophores"
  ],
  "broadclub_cuttlefish": [
    "fixed-mantle-head-arm-crown",
    "continuous-lateral-fin-skirt"
  ],
  "blackspotted_puffer": [
    "rounded-body",
    "eyes-nostrils-mouth-gills",
    "sculling-fins"
  ],
  "ocellated_eagle_ray": [
    "spotted-disc",
    "duckbill-head-pelvic-fins",
    "long-whip-tail"
  ],
  "textile_cone": [
    "shell",
    "foot-head",
    "sensory-appendages"
  ],
  "orange_cup_coral": [
    "skeletal-cups",
    "oral-discs",
    "feeding-tentacles"
  ],
  "banded_sea_krait": [
    "banded-body-paddle",
    "yellow-lipped-head"
  ],
  "white_spotted_hermit_crab": [
    "borrowed-shell",
    "spotted-legs-claws",
    "eyes-antennae-setae"
  ],
  "longfin_bannerfish": [
    "banded-compressed-body",
    "banner-and-fins",
    "eyes-mouth-operculum"
  ],
  "bigfin_reef_squid": [
    "mantle-head-eyes-funnel",
    "broad-oval-fins",
    "eight-arms-two-feeding-tentacles"
  ],
  "goldmouth_sea_squirt": [
    "tunic",
    "siphons"
  ],
  "feather_duster_worm": [
    "tube",
    "feeding-crown"
  ]
};
export const POST_MERGE_IDS = Object.keys(POST_MERGE_PARTS);
export const POST_MERGE_FAMILIES = [
  'true,true,false,false,false,0,0,false,false', // puffer skin / eagle-ray disc
  'false,true,false,false,true,2,0,false,false', // coral cups / borrowed shell
  'true,false,false,false,true,2,0,false,false', // bigfin squid fin texture
];
