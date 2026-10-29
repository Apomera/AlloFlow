/* Optional kitchen science explanations. Sources support the concepts, not the
   illustrative cooking rates or outcomes in Kitchen Lab's teaching models. */
(function (root) {
  'use strict';
  var topics = [
    {
      id: 'salt-boiling',
      title: 'Salt, bubbles, and boiling',
      question: 'What does a normal cooking amount of dissolved salt do to water?',
      choices: [
        'It lowers the boiling point enough to make cooking much faster.',
        'It slightly raises the boiling point, with little practical effect on boiling time.',
        'It makes every extra bubble proof that the water is hotter.'
      ],
      answer: 1,
      summary: 'Salt is not a useful shortcut to boiling water. At normal cooking concentrations, it raises the boiling point only slightly. A brief burst of bubbles when grains enter hot water can come from new places for bubbles to form, rather than a temperature rise.',
      molecular: 'Dissolved salt separates into ions and lowers the water vapor pressure at a given temperature. The solution must get slightly hotter before its vapor pressure matches the surrounding air pressure. Before dissolving, grain surfaces can help bubbles form: nucleation. Bubble formation and boiling temperature are different effects.',
      tryIt: 'Compare plain water with the salt-water illustration. Change only the salt amount; compare the estimated boiling temperatures rather than treating bubble count as a thermometer.',
      scope: 'The comparison illustrates boiling-point elevation at normal atmospheric pressure. It does not predict heating time, and a bubble illustration is not a temperature measurement.',
      sources: [
        { title: 'Royal Society of Chemistry: salt and boiling point', url: 'https://edu.rsc.org/download?ac=526386' },
        { title: 'University of Virginia: boiling and bubble formation', url: 'https://galileo.phys.virginia.edu/classes/105N/1995/omp/water_steam_and_ice_2.htm' }
      ]
    },
    {
      id: 'browning',
      title: 'Why surface moisture changes browning',
      question: 'Why can wet, crowded mushrooms take longer to brown?',
      choices: [
        'Evaporating water uses heat and delays the surface becoming hot and dry enough for rapid browning.',
        'Water permanently removes the ingredients needed for browning.',
        'Browning begins at exactly the same temperature in every food.'
      ],
      answer: 0,
      summary: 'A wet surface spends heat evaporating water. A crowded pan can retain more moisture, delaying rapid browning. As the surface dries, it can become hotter. Give the mushrooms room and observe the surface instead of relying only on a timer.',
      molecular: 'Maillard reactions link reducing sugars with amino groups in amino acids and proteins, producing many aroma and color compounds. Their speed depends on temperature, moisture, acidity, and ingredients; there is no single universal starting temperature. Caramelization is different chemistry involving heated sugars, so not all browning is caramelization.',
      tryIt: 'Compare the wet, crowded and dry, spaced illustrations. In station practice, try each setup with the same heat setting and number of simulated steps, then compare the surface observations.',
      scope: 'These illustrations show a trend. They are not microscope images or a calibrated browning clock, and a brown exterior does not establish safe internal temperature.',
      sources: [
        { title: 'American Chemical Society: Maillard reaction', url: 'https://cen.acs.org/articles/89/i47/Maillard-Reaction.html' },
        { title: 'University of San Diego: the chemistry of browning', url: 'https://home.sandiego.edu/~josephprovost/Biochem%20Cooking%20Browning.pdf' },
        { title: 'American Chemical Society: browning conditions', url: 'https://www.acs.org/content/dam/acsorg/events/culinary-chemistry/Slides/2014-10-16-candy-chemistry-final.pdf' }
      ]
    },
    {
      id: 'starch',
      title: 'How starch changes sauce thickness',
      question: 'Why can equal splashes of plain water and starchy cooking water affect a sauce differently?',
      choices: [
        'Every liquid thickens sauce by the same amount.',
        'Starch disappears as soon as it enters warm sauce.',
        'Both add water, but cooking water can also add starch that changes the sauce texture.'
      ],
      answer: 2,
      summary: 'Cooking water carries water and some starch released from the pasta. Cooked starch can add body to a sauce, while added water can loosen it. The result depends on the concentration: a larger splash does not automatically mean a thicker sauce.',
      molecular: 'With enough heat and water, starch granules lose their ordered structure, swell, and release some long starch molecules. This process, gelatinization, helps explain thickening. Starch type, concentration, temperature, and mixing all matter. Pasta cooking water already contains released starch; adding it is not the same as adding dry, uncooked starch.',
      tryIt: 'Compare the plain-water and starchy-water illustrations. In the sauce investigation, compare equal additions while keeping the starting sauce, heat, and mixing the same. Check flow as well as the spoon coating.',
      scope: 'The particle pictures are simplified. The sauce investigation models concentration and flow qualitatively; it does not measure a real sauce viscosity or show every starch structure.',
      sources: [
        { title: 'Utah State University: starch swelling and flow research', url: 'https://digitalcommons.usu.edu/foodmicrostructure/vol1/iss1/3/' },
        { title: 'University of Nebraska: starch gelatinization research', url: 'https://digitalcommons.unl.edu/foodsciefacpub/118/' },
        { title: 'Cereals & Grains Association: gelatinization and pasting', url: 'https://www.cerealsgrains.org/publications/onlinebooks/handbookseries/starches/Pages/Chapter3Abstract.aspx' }
      ]
    },
    {
      id: 'emulsion',
      title: 'Why mixing brings oil and water together',
      question: 'What happens when oil is mixed into a water-based sauce?',
      choices: [
        'The oil turns chemically into water.',
        'Mixing disperses oil into droplets, which may separate again later.',
        'One stir guarantees that the sauce will stay together permanently.'
      ],
      answer: 1,
      summary: 'Mixing breaks oil into droplets spread through the watery part of a sauce. This is an emulsion, not dissolved oil. Droplets can gather and merge again. Ingredients that stabilize droplets or thicken the surrounding liquid can slow separation, but mixing alone does not guarantee lasting stability.',
      molecular: 'Emulsifiers such as lecithin act at the oil-water boundary and help droplets remain dispersed. Cooked starch can thicken the surrounding water and slow droplet movement; some starches also help stabilize droplet surfaces. These effects depend on starch type and preparation. Thick sauce and well-dispersed oil are related observations, but one does not prove the other.',
      tryIt: 'Compare the separated and freshly mixed illustrations. In the sauce investigation, inspect oil beads and flow separately before mixing, after mixing, and after a deliberate wait.',
      scope: 'The stages illustrate possible changes, not a prediction of how quickly a particular sauce separates. Droplet drawings are not molecules or microscope measurements.',
      sources: [
        { title: 'Oklahoma State University: food emulsifiers', url: 'https://extension.okstate.edu/fact-sheets/food-emulsifiers' },
        { title: 'Kasprzak and colleagues: gelatinized starch and emulsions', url: 'https://pubmed.ncbi.nlm.nih.gov/30078926/' }
      ]
    }
  ];
  var api = { topics: topics };
  root.KitchenChemistryContent = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
