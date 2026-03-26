// Enhancement script: adds specimen data, trivia panel, and cleans up duplicates
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'stem_lab', 'stem_tool_dissection.js');
let src = fs.readFileSync(FILE, 'utf-8');
const origLen = src.split('\n').length;

// ─── 1. Add objectives + specTerms to 5 specimens ───

const specimenData = {
  pig: {
    marker: "bodyShape: 'pig',",
    objectives: [
      'Compare the 4-chambered pig heart to a human heart',
      'Identify the diaphragm and explain negative-pressure breathing',
      'Trace the fetal circulatory pathway through the umbilical cord',
      'Locate the spiral colon and compare to human large intestine'
    ],
    specTerms: [
      { term: 'Diaphragm', def: 'Dome-shaped respiratory muscle separating thorax from abdomen; mammalian innovation.' },
      { term: 'Umbilical vein', def: 'Carries oxygenated blood from placenta to fetus through the umbilical cord.' },
      { term: 'Spiral colon', def: 'Uniquely porcine coiled large intestine resembling a watch spring.' },
      { term: 'Urachus', def: 'Fetal canal connecting the bladder to the umbilicus; becomes the median umbilical ligament.' },
      { term: 'Xenotransplantation', def: 'Transplanting organs between species; pig organs are closest to human in size and function.' }
    ]
  },
  perch: {
    marker: "bodyShape: 'fish',",
    objectives: [
      'Explain countercurrent flow in gill respiration',
      'Trace single-circuit circulation through the 2-chambered heart',
      'Identify the swim bladder and explain buoyancy regulation',
      'Describe the lateral line sensory system'
    ],
    specTerms: [
      { term: 'Operculum', def: 'Bony gill cover that protects gills and actively pumps water for respiration.' },
      { term: 'Countercurrent exchange', def: 'Blood flows opposite to water across gills, maximizing O\\u2082 extraction (~80%).' },
      { term: 'Swim bladder', def: 'Gas-filled organ homologous to lungs; provides neutral buoyancy without effort.' },
      { term: 'Lateral line', def: 'Sensory system detecting water pressure changes for navigation and predator detection.' },
      { term: 'Pyloric ceca', def: 'Finger-like pouches at stomach-intestine junction unique to fish; increase absorption area.' }
    ]
  },
  crayfish: {
    marker: "bodyShape: 'crayfish',",
    objectives: [
      'Compare open circulatory system to closed circulation in vertebrates',
      'Identify the gastric mill and explain post-ingestion grinding',
      'Explain ecdysis (molting) and the role of gastroliths',
      'Describe the compound eye structure and motion detection'
    ],
    specTerms: [
      { term: 'Hemolymph', def: 'Open circulatory fluid combining blood and interstitial fluid; flows through sinuses, not vessels.' },
      { term: 'Ecdysis', def: 'Periodic molting of the exoskeleton to allow growth; animal is vulnerable during hardening.' },
      { term: 'Gastrolith', def: 'Calcium carbonate deposit in the stomach; dissolved during molting to harden new exoskeleton.' },
      { term: 'Ommatidium', def: 'Individual visual unit in compound eyes; ~3,000 per eye, excellent at motion detection.' },
      { term: 'Statocyst', def: 'Balance organ at the base of the antennules containing a sand grain that shifts with gravity.' }
    ]
  },
  sheepEye: {
    marker: "bodyShape: 'eye',",
    objectives: [
      'Trace the path of light through the eye from cornea to retina',
      'Explain accommodation and the role of the ciliary body',
      'Compare the tapetum lucidum in sheep to the human eye',
      'Identify the blind spot and explain why it exists'
    ],
    specTerms: [
      { term: 'Accommodation', def: 'Process by which the ciliary muscle changes lens shape to focus on near or far objects.' },
      { term: 'Tapetum lucidum', def: 'Reflective layer behind the retina enhancing night vision; absent in humans.' },
      { term: 'Fovea', def: 'Cone-dense pit in the retina center providing the sharpest central vision.' },
      { term: 'Aqueous humor', def: 'Clear fluid in the anterior chamber; produced by ciliary body, drains via trabecular meshwork.' },
      { term: 'Vitreous humor', def: 'Clear gel filling the posterior 80% of the eye; maintains shape, does not regenerate.' }
    ]
  },
  sheepHeart: {
    marker: "bodyShape: 'heart',",
    objectives: [
      'Trace blood flow through all four chambers and valves',
      'Distinguish the coronary arteries and explain myocardial blood supply',
      'Compare wall thickness of left vs right ventricles',
      'Identify the conduction system pathway from SA node to Purkinje fibers'
    ],
    specTerms: [
      { term: 'Chordae tendineae', def: 'Fibrous cords connecting AV valve leaflets to papillary muscles, preventing prolapse.' },
      { term: 'Coronary sinus', def: 'Large venous channel collecting deoxygenated blood from the heart muscle itself.' },
      { term: 'Purkinje fibers', def: 'Specialized conduction cells distributing electrical impulse to ventricular myocardium.' },
      { term: 'Papillary muscle', def: 'Muscular projections anchoring chordae tendineae; contract during systole to keep valves closed.' },
      { term: 'Pericardium', def: 'Double-walled sac enclosing the heart; fibrous outer layer and serous inner layer with lubricating fluid.' }
    ]
  }
};

let insertCount = 0;
for (const [specName, data] of Object.entries(specimenData)) {
  const markerIdx = src.indexOf(data.marker);
  if (markerIdx === -1) {
    console.log('WARNING: Could not find marker for ' + specName + ': ' + data.marker);
    continue;
  }
  
  // Check if objectives already exist for this specimen
  // We search between the marker and the next 200 chars to see if objectives is nearby
  const nearbyChunk = src.substring(markerIdx, markerIdx + 300);
  if (nearbyChunk.includes('objectives:')) {
    console.log('SKIP: ' + specName + ' already has objectives');
    continue;
  }
  
  // Build the injection text
  const objStr = JSON.stringify(data.objectives).replace(/"/g, "'");
  const termsStr = data.specTerms.map(t => 
    "{ term: '" + t.term + "', def: '" + t.def.replace(/'/g, "\\'") + "' }"
  ).join(',\n                ');
  
  const injection = `\n              objectives: ${objStr},\n              specTerms: [\n                ${termsStr}\n              ],`;
  
  // Insert after the bodyShape line (after the marker)
  const insertPos = markerIdx + data.marker.length;
  src = src.substring(0, insertPos) + injection + src.substring(insertPos);
  insertCount++;
  console.log('OK: Added objectives + specTerms to ' + specName);
}

// ─── 2. Clean up duplicate title: properties ───
// Pattern: ", title: 'some text'\n                , title: 'some text'"
// These appear on consecutive lines

let dupCount = 0;
const lines = src.split('\n');
const cleanedLines = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const nextLine = lines[i + 1];
  
  // Check if this line and next line are identical title properties
  if (nextLine && line.trim().startsWith(", title:") && nextLine.trim().startsWith(", title:") && line.trim() === nextLine.trim()) {
    // Skip the duplicate (keep this one, skip next)
    cleanedLines.push(line);
    i++; // skip duplicate
    dupCount++;
  } else {
    cleanedLines.push(line);
  }
}
src = cleanedLines.join('\n');
console.log('OK: Removed ' + dupCount + ' duplicate title lines');

// ─── 3. Clean up duplicate quizExplanation lines ───
// Pattern: duplicate upd('quizExplanation', ...) calls
src = src.replace(
  /upd\('quizExplanation', quizQ\.fn\.split\('\.'\)\.slice\(0, 2\)\.join\('\.'\) \+ '\.'\);\n\s*upd\('quizExplanation', quizQ\.fn\.split\('\.'\)\.slice\(0, 2\)\.join\('\.'\) \+ '\.'\);/g,
  "upd('quizExplanation', quizQ.fn.split('.').slice(0, 2).join('.') + '.');"
);
console.log('OK: Cleaned duplicate quizExplanation upd calls');

// Clean duplicate quizExplanation panel renders
src = src.replace(
  /upd\('quizExplanation', null\); upd\('quizExplanation', null\);/g,
  "upd('quizExplanation', null);"
);
console.log('OK: Cleaned duplicate quizExplanation null calls');

// Clean duplicate quiz explanation div renders (two identical blocks)
const dualExplPattern = /(d\.quizExplanation && React\.createElement\("div".*?\n.*?\\uD83D\\uDCA1.*?\n.*?d\.quizExplanation\)\n\s*\)),?\n\s*\n\s*(d\.quizExplanation && React\.createElement\("div".*?\n.*?\\uD83D\\uDCA1.*?\n.*?d\.quizExplanation\)\n\s*\))/;
if (dualExplPattern.test(src)) {
  src = src.replace(dualExplPattern, '$1');
  console.log('OK: Removed duplicate quiz explanation render block');
} else {
  console.log('INFO: No duplicate quiz explanation render block found (may already be clean)');
}

// ─── 4. Add "Did You Know?" trivia panel ───
// Insert before the progress card (line containing "// Progress card")

const TRIVIA_DATA = `
          // ── Specimen-specific trivia for "Did You Know?" panel ──
          var SPECIMEN_TRIVIA = {
            frog: [
              'A frog can absorb water through its skin \\u2014 it never needs to drink.',
              'The golden poison dart frog has enough toxin to kill 10 adults.',
              'Frogs were the first land animals with true vocal cords.',
              'Wood frogs can survive being frozen solid and thaw back to life.',
              'A group of frogs is called an "army."'
            ],
            earthworm: [
              'Earthworms have 5 pairs of aortic arches that act as hearts.',
              'Charles Darwin studied earthworms for 39 years.',
              'A single acre can contain over 1 million earthworms.',
              'Earthworms can regenerate lost segments in some species.',
              'They eat their own weight in soil every single day.'
            ],
            pig: [
              'Pig organs are so similar to human that pig heart valves are used in surgery.',
              'Porcine insulin treated millions of diabetics before synthetic versions existed.',
              'Pigs have more taste buds (15,000) than humans (9,000).',
              'Fetal pig anatomy is 95% identical to human fetal anatomy.',
              'Pig skin is used as temporary grafts for human burn victims.'
            ],
            perch: [
              'Fish gills extract proportionally more O\\u2082 from water than lungs from air.',
              'The swim bladder evolved from the same structure that became lungs in land animals.',
              'Perch scale rings can reveal the fish\\u2019s exact age, like tree rings.',
              'A perch\\u2019s lateral line can detect prey movement in complete darkness.',
              'Fish have been on Earth for over 500 million years \\u2014 before trees existed.'
            ],
            crayfish: [
              'Crayfish can regenerate lost claws over several molts.',
              'Their tail flip escape is one of the fastest movements in the animal kingdom.',
              'A crayfish has teeth inside its stomach (the gastric mill).',
              'They can walk forward but swim backward.',
              'Crayfish establish dominance hierarchies and remember social status.'
            ],
            sheepEye: [
              'The human eye can distinguish about 10 million different colors.',
              'Sheep have a tapetum lucidum \\u2014 their eyes literally glow in the dark.',
              'The cornea is the only body part with no blood supply \\u2014 it gets oxygen from air.',
              'Your retina contains 120 million rod cells for night vision.',
              'The eye\\u2019s lens is made of transparent crystallin proteins that never turn over.'
            ],
            sheepHeart: [
              'Your heart beats about 100,000 times per day \\u2014 3 billion times in a lifetime.',
              'The left ventricle wall is 3x thicker than the right.',
              'The heart creates enough pressure to squirt blood 30 feet.',
              'A sheep\\u2019s heart is almost identical in size and structure to a human\\u2019s.',
              'The SA node fires 60-100 times per minute with zero input from the brain.'
            ]
          };
`;

// Find the progress card marker to insert trivia panel before it
const progressMarker = '// Progress card';
const progressIdx = src.indexOf(progressMarker);

if (progressIdx === -1) {
  console.log('WARNING: Could not find progress card marker');
} else {
  // Insert the trivia data block near the top of the function (after "var d = labToolData.dissection || {};")
  const stateMarker = "var d = labToolData.dissection || {};";
  const stateIdx = src.indexOf(stateMarker);
  if (stateIdx !== -1) {
    const afterState = stateIdx + stateMarker.length;
    src = src.substring(0, afterState) + '\n' + TRIVIA_DATA + src.substring(afterState);
    console.log('OK: Added SPECIMEN_TRIVIA data block');
  }

  // Now insert the trivia panel React element before the progress card
  const triviaPanel = `
                // "Did You Know?" rotating trivia panel
                (function () {
                  var facts = SPECIMEN_TRIVIA[specimen] || [];
                  if (facts.length === 0) return null;
                  var factIdx = Math.floor((Date.now() / 8000)) % facts.length;
                  return React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3" },
                    React.createElement("div", { className: "flex items-center gap-1.5 mb-1" },
                      React.createElement("span", { className: "text-sm" }, '\\uD83D\\uDCA1'),
                      React.createElement("span", { className: "text-[10px] font-bold text-amber-700" }, 'Did You Know?')
                    ),
                    React.createElement("p", { className: "text-[10px] text-amber-600 leading-relaxed" }, facts[factIdx]),
                    React.createElement("div", { className: "flex gap-0.5 mt-1.5 justify-center" },
                      facts.map(function (_, fi) {
                        return React.createElement("div", {
                          key: fi,
                          className: "w-1 h-1 rounded-full " + (fi === factIdx ? 'bg-amber-500' : 'bg-amber-200')
                        });
                      })
                    )
                  );
                })(),

`;

  // Re-find progress marker (position may have shifted after earlier inserts)
  const newProgressIdx = src.indexOf(progressMarker);
  if (newProgressIdx !== -1) {
    // Find the start of the line containing the progress marker
    let lineStart = newProgressIdx;
    while (lineStart > 0 && src[lineStart - 1] !== '\n') lineStart--;
    
    src = src.substring(0, lineStart) + triviaPanel + src.substring(lineStart);
    console.log('OK: Added Did You Know trivia panel before progress card');
  }
}

// ─── 5. Write back ───
fs.writeFileSync(FILE, src, 'utf-8');
const newLen = src.split('\n').length;
console.log('\nDone! Lines: ' + origLen + ' -> ' + newLen + ' (added ' + (newLen - origLen) + ')');
console.log('Specimens enhanced: ' + insertCount);
