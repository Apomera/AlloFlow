// Independent historical cranial comparison stages; no current profile values
// are copied into these historical targets. Baseline helper is already frozen
// in dinolab_before_slender_rostrum.js and is byte-identical to the source at
// 08d5e4b322^ (source SHA256 320d9057598988e310f38fbccaa469e5a66ddf400789c048f8e596ceea0f67dd).
// Only the exact mature-tyrannosaur/Alioramini additions below are from source
// 08d5e4b322 (SHA256 e76f6ede8a5908cdb6a3395324808f0e0a6382563a97df43769c260dd5d57b04).
// Native reviewed head families have their own numeric geometry suites listed
// in each rule; historical guards reverse only their declared profile fields.
import { baselineCranialProfile } from './dinolab_before_slender_rostrum.js';

export function historicalMatureAlioraminProfileFor(dn) {
  const profile = baselineCranialProfile(dn);
  const group = String((dn && dn.group) || ''), clade = String((dn && dn.clade) || ''), speciesId = String((dn && dn.id) || '');
  const keys = 'headLengthScale headHeightScale headDepthScale muzzleLengthScale muzzleBaseScale muzzleTipScale muzzleHeightScale muzzleDepthScale jawHeightScale jawDepthScale cheekScale browScale eyeScale eyeForwardScale eyeHeightScale nostrilPosition nostrilHeightScale nostrilScale'.split(' ');
    if (group === 'theropod' && /^(alioramus|qianzhousaurus)$/.test(speciesId)) {
      profile.id = 'alioramin-long-low'; profile.shortLabel = 'Long low tyrannosaur snout';
      profile.label = 'Long, low alioramin tyrannosaur cranial silhouette';
      var alioraminValues = [1.04,0.94,1,1,1,1,0.94,1.04,0.90,0.94,0.92,0.96,1,0.98,1,0.88,1,0.96];
      keys.forEach(function (key, index) { profile[key] = alioraminValues[index]; });
      profile.note = 'Alioramus and Qianzhousaurus have an elongated, low snout, rather than the deep face of adult Tyrannosaurus. Bone proportions support this difference; exact soft-tissue thickness, colors, and procedural shape factors remain inferred (Lü and colleagues, 2014, doi:10.1038/ncomms4788).';
    }
    if (group === 'theropod' && /^Tyrannosauridae$/i.test(clade) && !/^(alioramus|qianzhousaurus)$/.test(speciesId)) {
      profile.matureTyrannosaur = true;
      profile.note += ' The broad, deep muzzle and muscular S-shaped neck represent a mature tyrannosaurid; precise tissue thickness and resting flexion remain inferred (Snively and Russell, 2007, doi:10.1002/ar.20563).';
    }
  return profile;
}

export const reviewedCranialProfileFields = [
  {
    "family": "ceratopsid",
    "ids": [
      "triceratops",
      "styracosaurus",
      "centrosaurus",
      "chasmosaurus"
    ],
    "helper": "dinoCeratopsidCraniumProfileFor",
    "fields": [
      "muzzleLengthScale",
      "muzzleHeightScale",
      "muzzleTipScale",
      "browHornScale",
      "noseHornScale",
      "note"
    ],
    "coverage": [
      "tests/dinolab_ceratopsid_cranium.test.js"
    ]
  },
  {
    "family": "theropod",
    "ids": [
      "allosaurus",
      "dilophosaurus",
      "coelophysis",
      "velociraptor",
      "deinonychus"
    ],
    "helper": "dinoTheropodCraniumProfileFor",
    "fields": [
      "id",
      "label",
      "shortLabel",
      "muzzleLengthScale",
      "muzzleHeightScale",
      "muzzleDepthScale",
      "muzzleBaseScale",
      "muzzleTipScale",
      "cheekScale",
      "eyeScale",
      "nostrilPosition",
      "note"
    ],
    "coverage": [
      "tests/dinolab_theropod_cranium.test.js",
      "tests/dinolab_dromaeosaur_cranium.test.js"
    ]
  },
  {
    "family": "armored",
    "ids": [
      "ankylosaurus",
      "euoplocephalus",
      "sauropelta",
      "borealopelta"
    ],
    "helper": "dinoArmoredCraniumProfileFor",
    "fields": [
      "id",
      "shortLabel",
      "label",
      "muzzleLengthScale",
      "muzzleHeightScale",
      "muzzleDepthScale",
      "muzzleTipScale",
      "cheekScale",
      "eyeScale",
      "nostrilPosition",
      "nostrilHeightScale",
      "note"
    ],
    "coverage": [
      "tests/dinolab_armored_cranium_armor.test.js"
    ]
  },
  {
    "family": "carnotaurus",
    "ids": [
      "carnotaurus"
    ],
    "helper": "dinoCarnotaurusProfileFor",
    "fields": [
      "muzzleLengthScale",
      "cheekScale",
      "shortLabel",
      "label",
      "note"
    ],
    "coverage": [
      "tests/dinolab_carnotaurus_form.test.js"
    ]
  },
  {
    "family": "sauropod",
    "ids": [
      "diplodocus",
      "camarasaurus"
    ],
    "helper": "dinoSauropodCraniumProfileFor",
    "fields": [
      "shortLabel",
      "label",
      "note"
    ],
    "coverage": [
      "tests/dinolab_sauropod_cranium.test.js"
    ]
  },
  {
    "family": "baryonychine",
    "ids": [
      "baryonyx",
      "suchomimus"
    ],
    "helper": "dinoBaryonychineRostrumFor",
    "fields": [
      "muzzleLengthScale",
      "shortLabel",
      "label",
      "note"
    ],
    "coverage": [
      "tests/dinolab_baryonychine_rosette.test.js"
    ]
  }
];

export function historicalReviewedCranialProjection(api, dn, actual, historical) {
  const rule = reviewedCranialProfileFields.find(row => row.ids.includes(dn.id));
  if (!rule) return actual;
  const native = api[rule.helper](dn);
  if (!native) throw new Error(dn.id + ' lacks its real reviewed native ' + rule.family + ' profile');
  function currentField(key, expected) {
    if (actual[key] !== expected) throw new Error(dn.id + ' ' + rule.family + ' native field ' + key + ' no longer matches its reviewed profile');
  }
  if (rule.family === 'theropod') {
    currentField('id', native.id); currentField('label', native.label); currentField('shortLabel', 'Species-specific skull');
    for (const key of ['muzzleLengthScale', 'muzzleHeightScale', 'muzzleDepthScale', 'muzzleBaseScale', 'muzzleTipScale']) currentField(key, 1);
    currentField('cheekScale', native.cheek); currentField('eyeScale', native.eyeScale); currentField('nostrilPosition', native.nostrilT);
    currentField('note', native.evidence + ' ' + native.openingsEvidence + ' ' + native.proportionBasis + ' ' + native.limit);
  } else if (rule.family === 'armored') {
    currentField('id', native.id); currentField('shortLabel', 'Low armored skull'); currentField('label', 'Representative species-specific armored skull');
    currentField('muzzleLengthScale', 1); currentField('muzzleHeightScale', 1); currentField('muzzleDepthScale', native.muzzleDepth); currentField('muzzleTipScale', native.muzzleTip);
    currentField('cheekScale', .90); currentField('eyeScale', .78); currentField('nostrilPosition', native.nostrilPosition); currentField('nostrilHeightScale', native.nostrilHeight);
    currentField('note', native.evidence + ' ' + native.limit);
  } else if (rule.family === 'sauropod') {
    currentField('shortLabel', 'Genus-informed skull'); currentField('label', native.label);
    currentField('note', native.evidence + ' ' + native.proportionBasis + ' ' + native.limit);
  } else if (rule.family === 'ceratopsid') {
    currentField('muzzleLengthScale', 1); currentField('muzzleHeightScale', native.muzzleHeight); currentField('muzzleTipScale', native.muzzleTip);
    currentField('browHornScale', dn.id === 'styracosaurus' ? 0 : native.brows); currentField('noseHornScale', dn.id === 'styracosaurus' ? 1 : native.nasal);
    const priorNote = baselineCranialProfile(dn).note;
    currentField('note', dn.id === 'styracosaurus' ? priorNote : priorNote + ' ' + native.evidence + ' ' + native.limit + ' The displayed dimensions and living tissue depths are illustrative.');
  } else if (rule.family === 'carnotaurus') {
    currentField('muzzleLengthScale', 1); currentField('cheekScale', .88); currentField('shortLabel', 'Short high skull');
    currentField('label', 'Carnotaurus short, high cranial silhouette'); currentField('note', native.evidence + ' ' + native.limit);
  } else if (rule.family === 'baryonychine') {
    currentField('muzzleLengthScale', 1); currentField('shortLabel', 'Long snout with rosette');
    currentField('label', 'Baryonychine rostrum with a narrow shaft and expanded tooth-bearing tip');
    currentField('note', baselineCranialProfile(dn).note + ' Baryonyx and Suchomimus fossils support a long, narrow snout, expanded tooth-bearing ends of both jaws, and setback nares. Procedural proportions, tissue thickness and colors are illustrative (Charig and Milner, 1997; Sereno and colleagues, 1998, doi:10.1126/science.282.5392.1298).');
  }
  const result = { ...actual };
  for (const key of rule.fields) {
    if (Object.prototype.hasOwnProperty.call(historical, key)) result[key] = historical[key];
    else delete result[key];
  }
  return result;
}
