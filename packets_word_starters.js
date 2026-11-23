// Shared offline starter word sets for AlloFlow Packets (Present & print + Vocabulary maker).
// Pure offline data: no network calls, no storage, no inline execution.
(function (root) {
  'use strict';

  var LIST = [
    {
      id: 'short-vowels',
      title: 'Short vowels with pictures',
      words: [
        { word: 'cat', definition: 'a small furry animal with whiskers that purrs', example: 'The cat slept on the warm rug.', phonemes: ['k', 'a', 't'] },
        { word: 'dog', definition: 'a friendly four-legged pet that barks', example: 'Our dog ran to catch the red ball.', phonemes: ['d', 'o', 'g'] },
        { word: 'sun', definition: 'the bright star in the sky that gives light and warmth', example: 'The sun shines bright at noon.', phonemes: ['s', 'u', 'n'] },
        { word: 'bed', definition: 'a piece of furniture for sleeping on', example: 'He put the blanket on the bed.', phonemes: ['b', 'e', 'd'] },
        { word: 'fish', definition: 'an animal with fins and scales that lives in water', example: 'A gold fish swam across the pond.', phonemes: ['f', 'i', 'sh'] },
        { word: 'frog', definition: 'a small jumping animal that lives near water', example: 'The green frog hopped onto a leaf.', phonemes: ['f', 'r', 'o', 'g'] },
        { word: 'ship', definition: 'a large boat that sails across deep water', example: 'The ship sailed out of the harbor.', phonemes: ['sh', 'i', 'p'] },
        { word: 'cup', definition: 'a small round container for drinking', example: 'Fill the cup with cold water.', phonemes: ['k', 'u', 'p'] },
      ],
    },
    {
      id: 'blends-digraphs',
      title: 'Blends and digraphs',
      words: [
        { word: 'train', definition: 'a line of rail cars pulled along a track', example: 'The train stopped at the station.', phonemes: ['t', 'r', 'ay', 'n'] },
        { word: 'cloud', definition: 'a white or gray mass of water drops high in the sky', example: 'A soft cloud floated past the hill.', phonemes: ['k', 'l', 'ow', 'd'] },
        { word: 'plant', definition: 'a living thing that grows in soil and makes leaves', example: 'Water the plant by the sunny window.', phonemes: ['p', 'l', 'a', 'n', 't'] },
        { word: 'brush', definition: 'a tool with bristles used for painting or cleaning', example: 'Dip the brush in blue paint.', phonemes: ['b', 'r', 'u', 'sh'] },
        { word: 'shell', definition: 'the hard outer cover of a sea animal or egg', example: 'She found a pink shell on the sand.', phonemes: ['sh', 'e', 'l'] },
        { word: 'whale', definition: 'a huge ocean mammal that breathes air through a blowhole', example: 'The gray whale splashed near the boat.', phonemes: ['w', 'ay', 'l'] },
        { word: 'clock', definition: 'a tool that shows what time it is', example: 'Look at the clock before recess starts.', phonemes: ['k', 'l', 'o', 'k'] },
        { word: 'star', definition: 'a bright point of light far out in space', example: 'The brightest star came out at dusk.', phonemes: ['s', 't', 'ar'] },
      ],
    },
    {
      id: 'science-math',
      title: 'Science and math vocabulary',
      words: [
        { word: 'habitat', definition: 'the natural home where a plant or animal lives', example: 'A pond is a good habitat for turtles.' },
        { word: 'evaporate', definition: 'to change from liquid water into invisible water vapor', example: 'Puddles evaporate in the warm sun.' },
        { word: 'magnet', definition: 'an object that pulls iron and steel toward itself', example: 'The magnet picked up ten paper clips.' },
        { word: 'fraction', definition: 'a number showing equal parts of one whole', example: 'One half is a simple fraction.' },
        { word: 'perimeter', definition: 'the total distance all the way around a flat shape', example: 'Add every side length to find the perimeter.' },
        { word: 'symmetry', definition: 'an exact match between two halves across a line', example: 'A butterfly wing shows symmetry.' },
      ],
    },
    {
      id: 'academic',
      title: 'Academic study words',
      words: [
        { word: 'observe', definition: 'to watch and notice details carefully', example: 'Use a hand lens to observe the crystal.' },
        { word: 'predict', definition: 'to tell what you think will happen next using clues', example: 'Predict which seed will sprout first.' },
        { word: 'compare', definition: 'to check how two things are alike and how they differ', example: 'Compare the two graphs side by side.' },
        { word: 'pattern', definition: 'things arranged following a steady rule that repeats', example: 'Skip counting makes a number pattern.' },
        { word: 'evidence', definition: 'facts or clues that help prove an answer is true', example: 'Point to evidence from the passage.' },
        { word: 'solution', definition: 'the answer to a problem, or a liquid mixture', example: 'Explain how you checked your solution.' },
      ],
    },
    {
      id: 'earth-space',
      title: 'Earth and space',
      words: [
        { word: 'volcano', definition: 'an opening in Earth crust where magma, ash, and gases erupt', example: 'Hot lava flowed down the side of the volcano.' },
        { word: 'glacier', definition: 'a huge slow-moving river of compacted ice and snow on land', example: 'The glacier carved a wide U-shaped valley over thousands of years.' },
        { word: 'orbit', definition: 'the curved path an object follows around a star or planet in space', example: 'Earth completes one orbit around the sun every year.' },
        { word: 'eclipse', definition: 'an event in which one body in space moves into the shadow of another', example: 'During a solar eclipse, the moon briefly blocks the sun.' },
        { word: 'fossil', definition: 'the preserved remains or imprint of an ancient plant or animal in rock', example: 'The museum displayed a fern fossil pressed inside dark shale.' },
        { word: 'atmosphere', definition: 'the envelope of air and gases surrounding a planet', example: 'Earth atmosphere protects living things from harsh rays.' },
        { word: 'erosion', definition: 'the wearing away and carrying of soil and rock by wind, water, or ice', example: 'Planting grass helps slow soil erosion on steep hillsides.' },
        { word: 'weathering', definition: 'the breaking down of rocks into smaller pieces at Earth surface', example: 'Freezing water inside cracks causes rock weathering in winter.' },
      ],
    },
    {
      id: 'civics-geography',
      title: 'Civics and geography',
      words: [
        { word: 'democracy', definition: 'a system of government in which citizens choose leaders and vote on laws', example: 'Voting in local elections is a key part of democracy.' },
        { word: 'constitution', definition: 'a written plan that sets the basic rules and powers of a government', example: 'The Constitution explains the three branches of national government.' },
        { word: 'citizen', definition: 'a legal member of a town, state, or country with shared rights and duties', example: 'Every citizen can stay informed about community issues.' },
        { word: 'peninsula', definition: 'a piece of land surrounded by water on three sides', example: 'Florida is a well-known peninsula on the Atlantic coast.' },
        { word: 'equator', definition: 'an imaginary line around the middle of Earth halfway between the poles', example: 'Places near the equator stay warm throughout the year.' },
        { word: 'hemisphere', definition: 'one half of Earth north, south, east, or west of a dividing line', example: 'North America lies in the Northern Hemisphere.' },
        { word: 'continent', definition: 'one of the seven very large landmasses on Earth', example: 'Asia is the largest continent in land area and population.' },
        { word: 'climate', definition: 'the usual pattern of weather in a place over many years', example: 'A desert climate receives very little rainfall each year.' },
      ],
    },
    {
      id: 'literary-craft',
      title: 'Story and poetry craft',
      words: [
        { word: 'metaphor', definition: 'a figure of speech that calls one thing another to highlight a shared trait', example: 'Saying time is a thief uses a vivid metaphor.' },
        { word: 'simile', definition: 'a comparison of two unlike things using the words like or as', example: 'Her laugh sparkled like bells is a bright simile.' },
        { word: 'personification', definition: 'giving human feelings, traits, or actions to a nonliving object or animal', example: 'Saying the wind whispered secrets uses personification.' },
        { word: 'hyperbole', definition: 'an intentional big exaggeration used for emphasis or humor', example: 'My backpack weighs a ton today is a playful hyperbole.' },
        { word: 'alliteration', definition: 'repeating the same beginning consonant sound in nearby words', example: 'Busy bees buzzed brilliantly uses cheerful alliteration.' },
        { word: 'foreshadowing', definition: 'a subtle clue in a story hinting at what will happen later', example: 'Dark storm clouds at the start acted as foreshadowing.' },
        { word: 'stanza', definition: 'a grouped set of lines forming one section inside a poem', example: 'Read the second stanza aloud to hear the rhythm.' },
        { word: 'theme', definition: 'the central message or big life lesson a reader learns from a story', example: 'Courage and friendship formed the main theme of the novel.' },
      ],
    },
  ];

  var BY_ID = Object.create(null);
  for (var i = 0; i < LIST.length; i++) {
    BY_ID[LIST[i].id] = LIST[i];
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  var api = {
    LIST: LIST,
    BY_ID: BY_ID,
    list: function () { return LIST.slice(); },
    get: function (id) {
      var key = String(id == null ? '' : id);
      return hasOwn(BY_ID, key) ? BY_ID[key] : null;
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.AlloPacketWordStarters = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null);
