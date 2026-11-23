#!/usr/bin/env node
'use strict';

// Builds a deterministic offline WordNet semantic visual bridge:
//   data/vendor/vocab/wordnet_en.json  +  data/vendor/vocab/wiktionary_en.json
//   + word_sounds_symbols_en.js  +  reading_symbols_ext_en.js
//   + data/vendor/mulberry/symbol-info.csv  +  data/vendor/openmoji/openmoji-names.json
//   + word_picture_matcher.js (CURRICULUM_DIAGRAMS, DIAGRAM_ALIASES, CONCEPT_CUES)
//   + data/word_picture_semantic_overrides_en.json
//   -> word_picture_semantic_en.js  (window.AlloWordPictureSemantic / AlloModules.WordPictureSemantic)
//
// Enforces TWO strong precision invariants:
//   1. POS + semantic-domain alignment between WordNet synsets (p, lf) and Mulberry/OpenMoji
//      symbol metadata (grammar, category, group/subgroup).
//   2. Symmetric Primary-Sense Check: a synset S may bridge W -> target T ONLY when S is among
//      T's top primary senses in WordNet (blocking slang/archaic/obscure senses of T such as
//      "chalk" = methamphetamine, "rake" = dissolute man, "kick" = complain, "blue" = Union).
//
// Zero network, zero AI at runtime or build time.
//
// Usage:
//   node dev-tools/build_word_picture_semantic_bridge.cjs                  build word_picture_semantic_en.js
//   node dev-tools/build_word_picture_semantic_bridge.cjs --check          fail if out of date
//   node dev-tools/build_word_picture_semantic_bridge.cjs --report         print summary stats
//   node dev-tools/build_word_picture_semantic_bridge.cjs --sample 50      print 50 deterministic sample mappings

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const WORDNET_FILE = path.join(ROOT, 'data/vendor/vocab/wordnet_en.json');
const WIKTIONARY_FILE = path.join(ROOT, 'data/vendor/vocab/wiktionary_en.json');
const OVERRIDES_FILE = path.join(ROOT, 'data/word_picture_semantic_overrides_en.json');
const OUT_FILE = path.join(ROOT, 'word_picture_semantic_en.js');

const CONCRETE_NOUN_LF = new Set([
  'noun.animal', 'noun.plant', 'noun.food', 'noun.artifact', 'noun.body',
  'noun.object', 'noun.substance', 'noun.phenomenon', 'noun.location', 'noun.shape',
]);

const LF_PRIORITY = {
  'noun.animal': 0,
  'noun.plant': 1,
  'noun.food': 2,
  'noun.phenomenon': 3,
  'noun.location': 4,
  'noun.body': 5,
  'noun.artifact': 6,
  'noun.object': 7,
  'noun.shape': 8,
  'noun.substance': 9,
  'noun.person': 10,
};

// Child-safety / school-appropriateness filter for bridge source words and definitions.
const UNSAFE_WORD_RE = /^(?:alcohol\w*|booz\w*|drunk\w*|liquor\w*|whisk(?:e)?y|vodka|tequila|brandy|gin|rum|beer\w*|wine\w*|ale|cider|cocktail\w*|saloon|tavern|barroom|cigaret\w*|cigar\w*|tobacco|nicotine|marijuana|cannabis|cocaine|heroin|opium|opiate\w*|narcotic\w*|drug\w*|syringe|amphetamine\w*|meth\w*|ecstasy|lsd|hashish|dope\w*|wench\w*|whore\w*|slut\w*|prostitut\w*|brothel|harlot|pimp|roue|hooter\w*|peckerwood\w*|porn\w*|erotic\w*|nud(?:e|ity)|naked|sex\w*|genital\w*|penis\w*|vagina\w*|vulva|breast\w*|nipple\w*|buttock\w*|anus|rectum|feces|fecal|urine|urina\w*|poop\w*|crap\w*|shit\w*|fuck\w*|bastard|bitch\w*|damn\w*|hell\w*|cuss\w*|swear\w*|suicid\w*|murder\w*|homicid\w*|kill\w*|slaughter\w*|massacr\w*|assassin\w*|corps(?:e|es)|cadaver\w*|deceas\w*|mortuary|coffin|casket|gallows|guillotine|hangm[ae]n|tortur\w*|mutilat\w*|decapitat\w*|behead\w*|lynch\w*|execut(?:e|ion)\w*|gun\w*|pistol\w*|revolver\w*|rifle\w*|shotgun\w*|firearm\w*|ammunition|bullet\w*|bomb\w*|grenade\w*|missile\w*|explosiv\w*|weapon\w*|dagger\w*|machete|bayonet|knife|knives|sword\w*|spear\w*|gambl\w*|casino\w*|wager\w*|betting|devil\w*|demon\w*|satan\w*|occult|hellish|cursed)$/;
const UNSAFE_DEF_RE = /\b(?:sexual(?:ly)?|intercourse|prostitut\w*|genital\w*|pornograph\w*|erotic|obscene|vulgar|slang|derogatory|offensive|profan\w*|pejorative|ethnic slur|racial slur|alcoholic beverage|alcoholic drink|distilled spirit|intoxicat\w*|narcotic|illicit drug|drug of abuse|street name|amphetamine|methamphetamine|marijuana|cocaine|heroin|tobacco|cigarette|suicide|murder|homicide|corpse|dead body|firearm|handgun|rifle|ammunition|explosive weapon|gambling|betting game|beer glass|tall glass for beer|dissolute man|immoral)\b/i;

// Targets too generic/polysemous to serve as automatic WordNet visual anchors.
const BLOCKED_VISUAL_TARGETS = new Set([
  'thing', 'object', 'entity', 'person', 'people', 'human', 'being', 'place', 'part', 'piece',
  'group', 'set', 'act', 'action', 'state', 'event', 'time', 'day', 'year', 'way', 'work',
  'make', 'get', 'give', 'take', 'go', 'come', 'move', 'be', 'have', 'do', 'use', 'put',
  'run', 'turn', 'play', 'hold', 'keep', 'show', 'look', 'see', 'feel', 'think', 'know',
  'say', 'tell', 'ask', 'good', 'bad', 'same', 'other', 'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten', 'number', 'line', 'point', 'area', 'form', 'kind',
  'type', 'name', 'word', 'side', 'end', 'top', 'back', 'front', 'life', 'world', 'second',
  'first', 'last', 'next', 'open', 'close', 'sign', 'can', 'may', 'will', 'break', 'cut',
  'call', 'fall', 'score', 'text', 'copy', 'cover', 'press', 'reach', 'roll', 'stamp',
  'switch', 'tap', 'tear', 'throw', 'toss', 'wake', 'wear', 'wipe', 'join', 'pack', 'pat',
  'post', 'letter', 'tie', 'bow', 'watch', 'band', 'bar', 'bat', 'beat', 'bit', 'block',
  'board', 'right', 'left', 'well', 'fine', 'mean', 'just', 'fair', 'free', 'clear', 'plain',
  'hard', 'soft', 'light', 'real', 'true', 'false', 'main', 'major', 'whole', 'full', 'empty',
  'head', 'hand', 'body', 'man', 'woman', 'boy', 'girl', 'lady', 'face', 'check', 'mark',
  'spot', 'note', 'case', 'order', 'power', 'sense', 'value', 'change', 'level', 'start',
  'stop', 'pass', 'stand', 'stay', 'live', 'meet', 'miss', 'need', 'want', 'try', 'help',
  'leave', 'send', 'bring', 'carry', 'draw', 'drop', 'grow', 'hit', 'lay', 'lead', 'let',
  'lie', 'lose', 'pay', 'pick', 'pull', 'push', 'read', 'ride', 'ring', 'rise', 'save',
  'sell', 'serve', 'shake', 'shoot', 'shut', 'sit', 'slip', 'speak', 'spend', 'split',
  'spread', 'stick', 'strike', 'taste', 'touch', 'treat', 'wait', 'walk', 'wash', 'win',
  'write', 'spring', 'bank', 'crane', 'date', 'fan', 'jam', 'match', 'mint', 'mole', 'nail',
  'palm', 'pitch', 'seal', 'trunk', 'bark', 'club', 'pound', 'bill', 'file', 'scale', 'sink',
  'star', 'chip', 'chips', 'draft', 'duck', 'fly', 'iron', 'key', 'lock', 'log', 'mine',
  'net', 'nut', 'pen', 'pipe', 'plant', 'pool', 'rock', 'saw', 'shed', 'shell', 'ship',
  'slide', 'slug', 'snap', 'sole', 'spell', 'spike', 'staff', 'stage', 'stake', 'stalk',
  'stall', 'stem', 'step', 'stock', 'store', 'strain', 'straw', 'strip', 'stroke', 'study',
  'stuff', 'suit', 'swing', 'table', 'tank', 'tape', 'toast', 'torch', 'track', 'trade',
  'train', 'trap', 'tray', 'trip', 'tube', 'vault', 'wing', 'yard', 'exit', 'blow', 'catch',
  'seat', 'ram', 'tart', 'lime', 'scoop', 'clocks', 'glass', 'pretty', 'rub', 'deliver',
  'test', 'winner', 'bent', 'separate', 'flat', 'thin', 'great', 'arms', 'kick', 'rip',
  'sneak', 'dig', 'find', 'rake', 'over', 'ghost', 'circuit',
]);

// High-clarity concrete noun anchors allowed as 1-3 hop hypernym targets (must exist in symbol bank).
const CONCRETE_HYPERNYM_ANCHORS = new Set([
  // Animals
  'animal', 'bird', 'fish', 'insect', 'bug', 'snake', 'frog', 'toad', 'lizard', 'turtle',
  'dog', 'cat', 'horse', 'cow', 'pig', 'sheep', 'goat', 'deer', 'bear', 'lion', 'tiger',
  'wolf', 'fox', 'monkey', 'ape', 'elephant', 'giraffe', 'zebra', 'camel', 'kangaroo',
  'rabbit', 'mouse', 'rat', 'squirrel', 'whale', 'dolphin', 'shark', 'octopus', 'crab',
  'lobster', 'shrimp', 'snail', 'worm', 'spider', 'butterfly', 'moth', 'bee', 'ant',
  'beetle', 'cricket', 'grasshopper', 'owl', 'eagle', 'hawk', 'duck', 'goose', 'swan',
  'penguin', 'parrot', 'chicken', 'turkey', 'pigeon', 'dinosaur',
  // Plants & food
  'tree', 'flower', 'grass', 'bush', 'leaf', 'seed', 'root', 'fruit', 'vegetable', 'berry',
  'apple', 'orange', 'banana', 'grape', 'melon', 'pear', 'peach', 'lemon', 'grain',
  'corn', 'wheat', 'rice', 'bean', 'potato', 'carrot', 'onion', 'tomato', 'mushroom',
  'food', 'bread', 'cake', 'pie', 'cookie', 'candy', 'cheese', 'butter', 'milk', 'egg',
  'meat', 'soup', 'salad', 'sandwich', 'pasta', 'pizza', 'drink', 'juice', 'tea', 'coffee',
  // Vehicles & transport
  'car', 'truck', 'bus', 'train', 'boat', 'ship', 'bicycle', 'bike', 'motorcycle', 'airplane',
  'helicopter', 'rocket', 'wagon', 'sled', 'cart', 'wheel',
  // Clothing & wearables
  'hat', 'cap', 'coat', 'jacket', 'shirt', 'sweater', 'dress', 'skirt', 'pants', 'trousers',
  'shoe', 'boot', 'sock', 'glove', 'scarf', 'belt', 'glasses', 'crown', 'helmet', 'apron',
  // Buildings, rooms, furniture, containers
  'house', 'home', 'castle', 'barn', 'tent', 'bridge', 'tower', 'school', 'hospital',
  'library', 'museum', 'farm', 'garden', 'park', 'zoo', 'kitchen', 'bedroom',
  'bathroom', 'chair', 'bench', 'couch', 'sofa', 'bed', 'desk', 'shelf', 'door',
  'window', 'fence', 'wall', 'roof', 'stairs', 'ladder', 'elevator', 'lamp', 'clock',
  'mirror', 'carpet', 'rug', 'curtain', 'pillow', 'blanket', 'box', 'bag', 'basket',
  'bucket', 'bottle', 'jar', 'cup', 'mug', 'bowl', 'plate', 'pot', 'pan',
  'spoon', 'fork', 'kettle', 'oven', 'stove', 'fridge', 'bathtub', 'toilet',
  // Nature & earth & weather & space
  'mountain', 'hill', 'valley', 'canyon', 'volcano', 'island', 'beach', 'coast', 'desert',
  'forest', 'jungle', 'meadow', 'river', 'stream', 'lake', 'pond', 'ocean', 'sea', 'waterfall',
  'cave', 'cliff', 'glacier', 'ice', 'snow', 'rain', 'cloud', 'storm', 'lightning', 'rainbow',
  'wind', 'fog', 'sun', 'moon', 'planet', 'earth', 'globe', 'sky', 'fire', 'water', 'mud',
  'sand', 'soil', 'stone', 'crystal', 'metal', 'wood', 'gold', 'silver', 'diamond',
  // Body parts
  'eye', 'ear', 'nose', 'mouth', 'tooth', 'tongue', 'hair', 'neck', 'arm', 'elbow', 'finger',
  'thumb', 'leg', 'knee', 'foot', 'toe', 'heart', 'brain', 'lung', 'stomach', 'bone', 'skull',
  'skeleton', 'feather', 'paw', 'hoof', 'horn', 'tail', 'beak', 'fin', 'claw',
  // Music, art, school, science, tools
  'book', 'magazine', 'newspaper', 'map', 'calendar', 'pencil', 'crayon', 'chalk',
  'paper', 'scissors', 'glue', 'paint', 'paintbrush', 'camera', 'drum', 'guitar', 'piano',
  'violin', 'flute', 'trumpet', 'bell', 'whistle', 'ball', 'kite', 'doll', 'puzzle', 'dice',
  'chess', 'hammer', 'wrench', 'screwdriver', 'shovel', 'rake', 'broom', 'mop',
  'sponge', 'soap', 'towel', 'toothbrush', 'comb', 'rope', 'chain', 'magnet', 'battery',
  'computer', 'keyboard', 'phone', 'radio', 'television', 'microscope', 'telescope',
  'thermometer', 'ruler', 'compass', 'flashlight', 'umbrella', 'backpack', 'suitcase',
  'wallet', 'coin', 'money', 'flag', 'trophy', 'medal', 'gift', 'balloon', 'candle',
  // People / roles (clear visual roles)
  'baby', 'child', 'family', 'mom', 'dad', 'doctor', 'nurse', 'teacher', 'farmer', 'chef',
  'cook', 'baker', 'pilot', 'astronaut', 'firefighter', 'king', 'queen', 'prince', 'princess',
  'pirate', 'clown', 'robot', 'monster', 'dragon', 'fairy', 'mermaid', 'alien',
]);

// High-clarity visual adjectives allowed as `sim` (adjective similarity cluster) targets.
const VISUAL_ADJ_ANCHORS = new Set([
  'happy', 'sad', 'angry', 'afraid', 'worried', 'confused', 'excited', 'surprised', 'jealous',
  'disgusted', 'hot', 'cold', 'wet', 'dry', 'big', 'small', 'tall', 'short', 'fast', 'slow',
  'clean', 'dirty', 'heavy', 'strong', 'sick', 'tired', 'hungry', 'thirsty', 'quiet', 'loud',
  'sweet', 'sour', 'dark', 'bright', 'old', 'young', 'rich', 'poor', 'broken',
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray',
  'round', 'square', 'sharp', 'smooth', 'rough', 'thick', 'wide', 'narrow', 'deep', 'shallow',
  'high', 'low', 'far', 'near',
]);

// Abstract or overly polysemous diagrams excluded from *automatic* WordNet linking.
const BLOCKED_DIAGRAM_TARGETS = new Set([
  'concept', 'universe', 'prefix_non', 'prefix_anti', 'prefix_multi', 'prefix_semi',
  'prefix_micro', 'prefix_neo', 'unit_rate', 'choice_decision', 'choice_option',
  'advantage_scale', 'score_tally', 'version_draft', 'widespread_reach', 'adjacent_neighbors',
  'person_figure', 'question_unknown', 'fidelity_anchor', 'chosen_ribbon', 'allied_flags',
  'compel_push', 'convenient_bolt', 'bare_branch', 'mixed_bowl', 'amaze_burst',
  'assign_clipboard', 'arrangement_grid', 'objective_bullseye', 'chunk_block', 'loop_ring',
  'overlap_rings', 'silence_mute', 'reveal_curtain', 'unity_circle', 'suspense_cliff',
  'technique_gears', 'exhibit_display', 'rank_chevrons', 'oath_promise', 'skill_badge',
  'stage_platform', 'property_estate', 'courtesy_gift', 'conflict_dispute', 'support_helping',
  'clock_time', 'activate_switch', 'warning_hazard', 'blur_focus', 'focus', 'truth',
  'similar', 'contrast', 'compare', 'change', 'expand', 'shrink', 'estimate', 'sequence',
  'separate', 'combine', 'position', 'origin', 'border', 'boundary', 'distance', 'main_idea',
  'example', 'problem', 'goal', 'fairness', 'freedom', 'persevere', 'discover', 'observe',
  'reflect_think', 'memory_recall', 'record_data', 'signal', 'survey', 'categorize', 'classify',
  'area', 'scale', 'solid', 'compound', 'context', 'import', 'export', 'balance', 'circuit',
  'protagonist', 'antagonist', 'veto', 'surplus', 'scarcity', 'factor', 'product', 'base',
  'rate', 'ratio', 'mean', 'mode', 'range', 'root', 'power', 'prime', 'plane', 'ray', 'arc',
  'chord', 'net', 'pitch', 'period', 'group', 'column', 'row', 'table', 'key', 'legend',
  'culture', 'theme', 'tone', 'mood', 'voice', 'plot', 'setting', 'point_of_view', 'claim',
  'evidence', 'bias', 'source', 'draft', 'clause', 'phrase', 'subject', 'object', 'tense',
  'case', 'state', 'force', 'work', 'energy', 'matter', 'mass', 'weight', 'volume', 'charge',
  'current', 'field', 'wave', 'medium', 'solution', 'mixture', 'element', 'cell', 'tissue',
  'organ', 'system', 'species', 'population', 'community', 'cycle', 'layer', 'crust', 'core',
  'mantle', 'plate', 'fault', 'fold', 'front', 'tide', 'season', 'phase', 'market', 'supply',
  'demand', 'capital', 'labor', 'tax', 'budget', 'credit', 'debt', 'profit', 'loss', 'tariff',
  'treaty', 'colony', 'empire', 'republic', 'citizen', 'rights', 'law', 'court', 'trial',
  'bill', 'speed', 'structure', 'wedge', 'cone', 'spine', 'axis', 'region', 'addition',
  'consequence',
]);

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by', 'can', 'did', 'does',
  'each', 'for', 'form', 'from', 'had', 'has', 'have', 'having', 'her', 'here', 'his', 'how',
  'in', 'into', 'is', 'it', 'its', 'kind', 'less', 'like', 'made', 'make', 'many', 'may', 'more',
  'most', 'much', 'must', 'new', 'no', 'not', 'now', 'of', 'often', 'old', 'on', 'one', 'only',
  'or', 'other', 'our', 'out', 'over', 'part', 'person', 'place', 'process', 'quality', 'said',
  'same', 'see', 'she', 'some', 'someone', 'something', 'state', 'such', 'than', 'that', 'the',
  'their', 'them', 'then', 'there', 'these', 'they', 'thing', 'things', 'this', 'those', 'through',
  'to', 'too', 'two', 'type', 'under', 'use', 'used', 'using', 'very', 'was', 'way', 'we', 'well',
  'were', 'what', 'when', 'where', 'which', 'who', 'will', 'with', 'without', 'would', 'you', 'your',
  'act', 'action', 'group', 'able', 'about', 'above', 'across', 'after', 'again', 'also', 'always',
  'almost', 'already', 'although', 'among', 'another', 'any', 'anyone', 'anything', 'anyway', 'around',
  'away', 'because', 'become', 'before', 'behind', 'below', 'beside', 'between', 'beyond', 'both',
  'bring', 'came', 'come', 'could', 'doing', 'done', 'down', 'during', 'either', 'else', 'enough',
  'even', 'ever', 'every', 'everyone', 'everything', 'except', 'few', 'find', 'first', 'found',
  'get', 'getting', 'give', 'given', 'going', 'gone', 'good', 'got', 'great', 'here', 'however',
  'just', 'keep', 'kept', 'knew', 'know', 'known', 'last', 'later', 'least', 'left', 'let', 'little',
  'long', 'look', 'lot', 'low', 'might', 'mine', 'miss', 'much', 'myself', 'near', 'need', 'neither',
  'never', 'next', 'none', 'nor', 'nothing', 'off', 'once', 'onto', 'own', 'perhaps', 'put', 'quite',
  'rather', 'really', 'right', 'say', 'saying', 'seem', 'seems', 'seen', 'self', 'several', 'shall',
  'should', 'show', 'since', 'soon', 'still', 'sure', 'take', 'taken', 'taking', 'tell', 'than',
  'though', 'thought', 'thus', 'till', 'told', 'took', 'toward', 'towards', 'try', 'trying', 'turn',
  'unless', 'until', 'upon', 'usually', 'want', 'went', 'whatever', 'whether', 'while', 'within',
  'without', 'yet', 'lower', 'upper',
]);

function writeAtomic(file, content) {
  const tmp = file + '.sem-' + process.pid + '.tmp';
  fs.writeFileSync(tmp, content);
  if (fs.readFileSync(tmp, 'utf8') !== content) {
    try { fs.unlinkSync(tmp); } catch (_) {}
    throw new Error('Short write: ' + file);
  }
  fs.renameSync(tmp, file);
}

function classifySymbolMeta(file, mulByFile, omByFile) {
  if (file && file.startsWith('openmoji/')) {
    const om = omByFile.get(file);
    if (!om) return { pos: 'n', domain: 'any' };
    const sub = om.group + '/' + om.subgroup;
    if (/^animals-nature\/animal-/.test(sub)) return { pos: 'n', domain: 'animal' };
    if (/^animals-nature\/plant-/.test(sub)) return { pos: 'n', domain: 'plant' };
    if (/^food-drink\//.test(sub)) return { pos: 'n', domain: 'food' };
    if (/^travel-places\/transport-/.test(sub)) return { pos: 'n', domain: 'transport' };
    if (/^travel-places\/place-building/.test(sub)) return { pos: 'n', domain: 'building' };
    if (/^travel-places\/sky-weather/.test(sub)) return { pos: 'n', domain: 'weather' };
    if (/^people-body\/body-parts/.test(sub)) return { pos: 'n', domain: 'body' };
    if (/^people-body\/person/.test(sub)) return { pos: 'n', domain: 'person' };
    if (/^objects\/clothing/.test(sub)) return { pos: 'n', domain: 'clothes' };
    if (/^smileys-emotion\//.test(sub)) return { pos: 'a', domain: 'feeling' };
    return { pos: 'n', domain: 'artifact' };
  }
  const m = mulByFile.get(file);
  if (!m) return { pos: 'n', domain: 'any' };
  const cat = String(m.category || '');
  const isVerb = m.verb || /^Verb/.test(String(m.grammar || '')) || cat === 'Verb' || /Actions$/i.test(cat);
  if (isVerb) return { pos: 'v', domain: 'verb' };
  if (/^People Feelings$/.test(cat)) return { pos: 'a', domain: 'feeling' };
  if (/^Art Colour$/.test(cat)) return { pos: 'a', domain: 'color' };
  if (/^(?:Descriptive |People Descriptive$)/.test(cat)) return { pos: 'a', domain: 'desc' };
  if (/^Animal /.test(cat) && !/Habitat|Activity/.test(cat)) return { pos: 'n', domain: 'animal' };
  if (/^Food |^Drink /.test(cat)) return { pos: 'n', domain: 'food' };
  if (/^Plants? |^Nature Plants?|^Environment Plants?/.test(cat)) return { pos: 'n', domain: 'plant' };
  if (/^Clothes /.test(cat)) return { pos: 'n', domain: 'clothes' };
  if (/^Transport /.test(cat)) return { pos: 'n', domain: 'transport' };
  if (/^Building /.test(cat)) return { pos: 'n', domain: 'building' };
  if (/^People /.test(cat)) return { pos: 'n', domain: 'person' };
  if (/^Body /.test(cat)) return { pos: 'n', domain: 'body' };
  if (/Weather|Space/.test(cat)) return { pos: 'n', domain: 'weather' };
  return { pos: 'n', domain: 'any' };
}

function isCompatibleTarget(syn, meta, viaPertainym) {
  if (!syn || !meta) return false;
  const p = syn.p || 'n';
  const lf = String(syn.lf || '');
  if (viaPertainym) {
    if (p !== 'n') return false;
  } else {
    if (meta.pos === 'v' && p !== 'v') return false;
    if (meta.pos === 'n' && p !== 'n') return false;
    if (meta.pos === 'a') {
      const okAdj = p === 'a' || p === 's' || (meta.domain === 'feeling' && lf === 'noun.feeling') || (meta.domain === 'color' && lf === 'noun.attribute');
      if (!okAdj) return false;
    }
  }
  switch (meta.domain) {
    case 'animal': return lf === 'noun.animal';
    case 'plant': return lf === 'noun.plant' || lf === 'noun.food';
    case 'food': return lf === 'noun.food' || lf === 'noun.plant';
    case 'feeling': return p === 'a' || p === 's' || lf === 'noun.feeling';
    case 'color': return p === 'a' || p === 's' || lf === 'noun.attribute';
    case 'body': return lf === 'noun.body';
    case 'clothes': return lf === 'noun.artifact';
    case 'transport': return lf === 'noun.artifact' || lf === 'verb.motion';
    case 'building': return lf === 'noun.artifact' || lf === 'noun.location';
    case 'weather': return lf === 'noun.phenomenon' || lf === 'noun.object' || lf === 'noun.location' || lf === 'noun.substance';
    case 'person': return lf === 'noun.person' || lf === 'noun.group';
    default: return true;
  }
}

function loadVisualCatalog() {
  const symTool = require(path.join(ROOT, 'dev-tools/build_word_sounds_symbols.cjs'));
  const extTool = require(path.join(ROOT, 'dev-tools/build_reading_symbols_ext.cjs'));
  const baseSymbols = symTool.loadSymbols();
  const extSymbols = extTool.loadReadingSymbolsExt();

  const mulRows = symTool.symbolRows(fs.readFileSync(path.join(ROOT, 'data/vendor/mulberry/symbol-info.csv'), 'utf8'));
  const omTable = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vendor/openmoji/openmoji-names.json'), 'utf8'));
  const omRows = symTool.openMojiRows(omTable);
  const mulByFile = new Map(mulRows.map((r) => [r.file, r]));
  const omByFile = new Map(omRows.map((r) => [r.file, r]));

  const ctx = { window: {}, globalThis: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'word_picture_matcher.js'), 'utf8'), ctx);
  const matcher = ctx.globalThis.AlloWordPictureMatcher || ctx.window.AlloWordPictureMatcher;

  const symbolWords = new Set();
  const symbolMeta = new Map();
  const registerBank = (bank) => {
    for (const w of bank.words()) {
      symbolWords.add(w);
      if (!symbolMeta.has(w)) {
        const f = bank.file(w);
        symbolMeta.set(w, classifySymbolMeta(f, mulByFile, omByFile));
      }
    }
  };
  registerBank(baseSymbols);
  registerBank(extSymbols);

  const diagramKeys = new Set(Object.keys(matcher.CURRICULUM_DIAGRAMS || {}));
  const diagramPhrases = new Map();
  for (const k of diagramKeys) {
    if (BLOCKED_DIAGRAM_TARGETS.has(k)) continue;
    diagramPhrases.set(k, k);
    const spaced = k.replace(/_/g, ' ');
    if (spaced !== k) diagramPhrases.set(spaced, k);
  }

  const directCovered = new Set();
  symbolWords.forEach((w) => directCovered.add(w));
  Object.keys(matcher.CONCEPT_CUES || {}).forEach((w) => directCovered.add(w));
  for (const k of diagramKeys) {
    directCovered.add(k);
    directCovered.add(k.replace(/_/g, ' '));
  }
  const matcherSrc = fs.readFileSync(path.join(ROOT, 'word_picture_matcher.js'), 'utf8');
  const aliasBlock = matcherSrc.match(/var DIAGRAM_ALIASES\s*=\s*\{([\s\S]*?)\n  \};/);
  if (aliasBlock) {
    const keyRe = /"([a-z][a-z0-9 _-]{1,40})"\s*:/g;
    let m;
    while ((m = keyRe.exec(aliasBlock[1]))) directCovered.add(m[1]);
  }

  return { symbolWords, symbolMeta, diagramKeys, diagramPhrases, directCovered };
}

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) return { exclude: {}, force: {} };
  const raw = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8'));
  return {
    exclude: (raw && raw.exclude && typeof raw.exclude === 'object') ? raw.exclude : {},
    force: (raw && raw.force && typeof raw.force === 'object') ? raw.force : {},
  };
}

function cleanLemma(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/_/g, ' ');
  return /^[a-z]{3,24}$/.test(s) ? s : '';
}

function cleanPhrase(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
  return /^[a-z]+(?: [a-z]+){0,2}$/.test(s) && s.length >= 3 && s.length <= 32 ? s : '';
}

function isSafeSynset(syn) {
  if (!syn) return false;
  if (syn.d && UNSAFE_DEF_RE.test(syn.d)) return false;
  return true;
}

function compute() {
  const wn = JSON.parse(fs.readFileSync(WORDNET_FILE, 'utf8'));
  const wk = fs.existsSync(WIKTIONARY_FILE) ? JSON.parse(fs.readFileSync(WIKTIONARY_FILE, 'utf8')) : {};
  const wiktionaryWords = new Set(Object.keys(wk).map((k) => k.toLowerCase()));
  const { symbolWords, symbolMeta, diagramKeys, diagramPhrases, directCovered } = loadVisualCatalog();
  const overrides = loadOverrides();
  const synsets = wn.synsets || {};
  const lemmasIndex = wn.lemmas || {};

  // Build targetPrimarySynsets: for every indexed lemma in wn.lemmas, record its top 2 senses per POS
  // so Symmetric Primary-Sense Check rejects obscure/slang senses of target words!
  const targetPrimarySynsets = new Map();
  for (const [rawW, byPos] of Object.entries(lemmasIndex)) {
    const w = cleanPhrase(rawW);
    if (!w || !byPos || typeof byPos !== 'object') continue;
    const set = new Set();
    for (const pos of ['n', 'v', 'a', 's', 'r']) {
      const sids = Array.isArray(byPos[pos]) ? byPos[pos] : [];
      sids.slice(0, 2).forEach((sid) => set.add(sid));
    }
    targetPrimarySynsets.set(w, set);
  }
  function isPrimaryForTarget(targetWord, sid) {
    const set = targetPrimarySynsets.get(targetWord);
    // If the target word is in wn.lemmas, require sid to be among its top 2 senses for its POS!
    if (set) return set.has(sid);
    // If target isn't in wn.lemmas (rare / multi-word), allow it if the synset is concrete & safe.
    return true;
  }

  // Build reverse index: primary wn.lemmas (sense-frequency ordered) + safe member words.
  const wordToSynsets = new Map();
  const pushSyn = (word, pos, sid, rank, inPrimary) => {
    if (!word || STOP_WORDS.has(word) || UNSAFE_WORD_RE.test(word) || overrides.exclude[word]) return;
    let list = wordToSynsets.get(word);
    if (!list) { list = []; wordToSynsets.set(word, list); }
    if (!list.some((x) => x.sid === sid)) list.push({ sid, pos, rank, inPrimary });
  };

  const POS_WEIGHT = { n: 0, v: 1, a: 2, s: 2, r: 3 };
  for (const [rawW, byPos] of Object.entries(lemmasIndex)) {
    const w = cleanLemma(rawW);
    if (!w || !byPos || typeof byPos !== 'object') continue;
    for (const pos of ['n', 'v', 'a', 's', 'r']) {
      const sids = Array.isArray(byPos[pos]) ? byPos[pos] : [];
      sids.slice(0, 2).forEach((sid, idx) => {
        pushSyn(w, pos, sid, idx * 10 + (POS_WEIGHT[pos] || 0), true);
      });
    }
  }

  // Member-only words from synsets: allow Wiktionary words + concrete concrete-domain nouns
  const indexedWords = new Set(wordToSynsets.keys());
  const memberOnly = new Map();
  for (const [sid, syn] of Object.entries(synsets)) {
    if (!syn || !Array.isArray(syn.m) || !isSafeSynset(syn)) continue;
    const p = syn.p || 'n';
    const lf = String(syn.lf || '');
    const concreteDomain = Object.prototype.hasOwnProperty.call(LF_PRIORITY, lf);
    for (const rawM of syn.m) {
      const w = cleanLemma(rawM);
      if (!w || indexedWords.has(w) || STOP_WORDS.has(w) || UNSAFE_WORD_RE.test(w) || overrides.exclude[w]) continue;
      const inWik = wiktionaryWords.has(w);
      if (!inWik && !(p === 'n' && concreteDomain)) continue;
      let list = memberOnly.get(w);
      if (!list) { list = []; memberOnly.set(w, list); }
      const domainPri = concreteDomain ? LF_PRIORITY[lf] : 15;
      list.push({ sid, pos: p, rank: 20 + domainPri * 2 + (POS_WEIGHT[p] || 0), inPrimary: inWik });
    }
  }
  for (const [w, list] of memberOnly.entries()) {
    list.sort((a, b) => a.rank - b.rank);
    wordToSynsets.set(w, list.slice(0, 2));
  }

  function diagramTargetOfSynset(sid, syn, selfWord) {
    if (!syn || !Array.isArray(syn.m) || !isSafeSynset(syn)) return '';
    for (const rawM of syn.m) {
      const p = cleanPhrase(rawM);
      if (!p || p === selfWord) continue;
      if (diagramPhrases.has(p)) {
        const key = diagramPhrases.get(p);
        if (BLOCKED_DIAGRAM_TARGETS.has(key)) continue;
        if (!isPrimaryForTarget(p, sid)) continue;
        return key;
      }
    }
    return '';
  }

  function symbolTargetOfSynset(sid, syn, selfWord, requireConcreteAnchor, viaPertainym) {
    if (!syn || !Array.isArray(syn.m) || !isSafeSynset(syn)) return '';
    for (const rawM of syn.m) {
      const w = cleanLemma(rawM);
      if (!w || w === selfWord) continue;
      if (!symbolWords.has(w)) continue;
      if (BLOCKED_VISUAL_TARGETS.has(w)) continue;
      if (requireConcreteAnchor && !CONCRETE_HYPERNYM_ANCHORS.has(w)) continue;
      const meta = symbolMeta.get(w);
      if (!isCompatibleTarget(syn, meta, viaPertainym)) continue;
      if (!isPrimaryForTarget(w, sid)) continue;
      return w;
    }
    return '';
  }

  function visualAdjOfSynset(sid, syn, selfWord) {
    if (!syn || !Array.isArray(syn.m) || !isSafeSynset(syn)) return '';
    for (const rawM of syn.m) {
      const w = cleanLemma(rawM);
      if (!w || w === selfWord) continue;
      if (VISUAL_ADJ_ANCHORS.has(w) && symbolWords.has(w)) {
        const meta = symbolMeta.get(w);
        if (meta && meta.pos === 'a' && isPrimaryForTarget(w, sid)) return w;
      }
    }
    return '';
  }

  const diag = Object.create(null);
  const synMap = Object.create(null);
  const hypMap = Object.create(null);

  for (const [rawW, spec] of Object.entries(overrides.force)) {
    const w = cleanLemma(rawW);
    if (!w || !spec || !spec.target) continue;
    if (spec.kind === 'diag' && diagramKeys.has(spec.target)) diag[w] = spec.target;
    else if (spec.kind === 'hyp' && symbolWords.has(spec.target)) hypMap[w] = spec.target;
    else if (symbolWords.has(spec.target)) synMap[w] = spec.target;
  }

  const allWords = Array.from(wordToSynsets.keys()).sort();
  let viaPert = 0, viaSim = 0, viaHyp1 = 0, viaHyp2 = 0, viaHyp3 = 0, viaDiagDirect = 0, viaDiagPert = 0, viaDiagHyp = 0;

  for (const w of allWords) {
    if (directCovered.has(w)) continue;
    if (diag[w] || synMap[w] || hypMap[w]) continue;

    const senses = wordToSynsets.get(w).slice().sort((a, b) => a.rank - b.rank);
    let foundDiag = '';
    let foundSyn = '';
    let foundHyp = '';
    let foundSource = '';

    // Pass 1: Same-synset diagram or POS+domain+primary-sense aligned synonym
    for (let si = 0; si < senses.length; si++) {
      const { sid, inPrimary } = senses[si];
      const s = synsets[sid];
      if (!s || !isSafeSynset(s)) continue;
      if (!foundDiag && (inPrimary || CONCRETE_NOUN_LF.has(s.lf || '')) && si === 0) {
        const dHit = diagramTargetOfSynset(sid, s, w);
        if (dHit) { foundDiag = dHit; foundSource = 'diag-syn'; break; }
      }
      if (!foundSyn) {
        const sHit = symbolTargetOfSynset(sid, s, w, false, false);
        if (sHit) { foundSyn = sHit; foundSource = 'syn'; }
      }
    }

    // Pass 2: Pertainym links (`pert`, e.g. lunar -> moon, aquatic -> water, volcanic -> volcano, dental -> tooth)
    if (!foundDiag && !foundSyn) {
      for (const { sid } of senses) {
        const s = synsets[sid];
        if (!s || !isSafeSynset(s) || !Array.isArray(s.pert) || !s.pert.length) continue;
        for (const pid of s.pert) {
          const ps = synsets[pid];
          if (!ps || !isSafeSynset(ps)) continue;
          const dHit = diagramTargetOfSynset(pid, ps, w);
          if (dHit) { foundDiag = dHit; foundSource = 'diag-pert'; break; }
          const sHit = symbolTargetOfSynset(pid, ps, w, false, true);
          if (sHit) { foundSyn = sHit; foundSource = 'pert'; break; }
        }
        if (foundDiag || foundSyn) break;
      }
    }

    // Pass 3: 1-3 hop concrete noun hypernyms (`h`) -> concrete visual anchors (primary sense!) or concrete diagrams
    if (!foundDiag && !foundSyn) {
      for (const { sid, pos } of senses) {
        if (pos !== 'n') continue;
        const s = synsets[sid];
        if (!s || !isSafeSynset(s) || !CONCRETE_NOUN_LF.has(s.lf || '') || !Array.isArray(s.h) || !s.h.length) continue;

        // BFS up to 3 hops staying strictly inside CONCRETE_NOUN_LF
        let frontier = s.h.slice();
        const visited = new Set([sid]);
        for (let depth = 1; depth <= 3 && frontier.length && !foundHyp && !foundDiag; depth++) {
          const nextFrontier = [];
          for (const hid of frontier) {
            if (visited.has(hid)) continue;
            visited.add(hid);
            const hs = synsets[hid];
            if (!hs || !isSafeSynset(hs) || !CONCRETE_NOUN_LF.has(hs.lf || '')) continue;
            const sHit = symbolTargetOfSynset(hid, hs, w, true, false);
            if (sHit) {
              foundHyp = sHit;
              foundSource = depth === 1 ? 'hyp1' : depth === 2 ? 'hyp2' : 'hyp3';
              break;
            }
            if (depth <= 2) {
              const dHit = diagramTargetOfSynset(hid, hs, w);
              if (dHit) { foundDiag = dHit; foundSource = 'diag-hyp'; break; }
            }
            if (Array.isArray(hs.h)) {
              for (const parentId of hs.h) {
                if (!visited.has(parentId)) nextFrontier.push(parentId);
              }
            }
          }
          frontier = nextFrontier;
        }
        if (foundHyp || foundDiag) break;
      }
    }

    // Pass 4: Adjective `sim` cluster strictly to primary-sense high-clarity visual adjectives
    if (!foundDiag && !foundSyn && !foundHyp) {
      for (const { sid, pos } of senses) {
        if (pos !== 'a' && pos !== 's') continue;
        const s = synsets[sid];
        if (!s || !isSafeSynset(s) || !Array.isArray(s.sim) || !s.sim.length) continue;
        for (const simId of s.sim) {
          const simSyn = synsets[simId];
          if (!simSyn || !isSafeSynset(simSyn)) continue;
          const aHit = visualAdjOfSynset(simId, simSyn, w);
          if (aHit) { foundSyn = aHit; foundSource = 'sim'; break; }
        }
        if (foundSyn) break;
      }
    }

    if (foundDiag) {
      diag[w] = foundDiag;
      if (foundSource === 'diag-syn') viaDiagDirect++;
      else if (foundSource === 'diag-pert') viaDiagPert++;
      else if (foundSource === 'diag-hyp') viaDiagHyp++;
    } else if (foundSyn) {
      synMap[w] = foundSyn;
      if (foundSource === 'pert') viaPert++;
      else if (foundSource === 'sim') viaSim++;
    } else if (foundHyp) {
      hypMap[w] = foundHyp;
      if (foundSource === 'hyp1') viaHyp1++;
      else if (foundSource === 'hyp2') viaHyp2++;
      else if (foundSource === 'hyp3') viaHyp3++;
    }
  }

  const sortObj = (obj) => {
    const out = {};
    Object.keys(obj).sort().forEach((k) => { out[k] = obj[k]; });
    return out;
  };
  const diagSorted = sortObj(diag);
  const synSorted = sortObj(synMap);
  const hypSorted = sortObj(hypMap);

  const counts = {
    total: Object.keys(diagSorted).length + Object.keys(synSorted).length + Object.keys(hypSorted).length,
    diag: Object.keys(diagSorted).length,
    syn: Object.keys(synSorted).length,
    hyp: Object.keys(hypSorted).length,
    breakdown: {
      diagSyn: viaDiagDirect,
      diagPert: viaDiagPert,
      diagHyp: viaDiagHyp,
      synDirect: Object.keys(synSorted).length - viaPert - viaSim,
      synPert: viaPert,
      synSim: viaSim,
      hyp1: viaHyp1,
      hyp2: viaHyp2,
      hyp3: viaHyp3,
    },
  };

  const targets = [];
  const targetIdx = Object.create(null);
  const idxOf = (t) => {
    if (!Object.prototype.hasOwnProperty.call(targetIdx, t)) {
      targetIdx[t] = targets.length;
      targets.push(t);
    }
    return targetIdx[t];
  };
  const encodeMap = (sorted) => {
    const out = {};
    for (const [k, v] of Object.entries(sorted)) out[k] = idxOf(v);
    return out;
  };
  const diagIdx = encodeMap(diagSorted);
  const synIdx = encodeMap(synSorted);
  const hypIdx = encodeMap(hypSorted);

  const output = [
    '// Generated by dev-tools/build_word_picture_semantic_bridge.cjs. Do not edit.',
    '// Offline WordNet semantic visual bridge (Open English WordNet, CC BY 4.0) connecting ' + counts.total + ' English words',
    '// to verified Mulberry/OpenMoji symbols and K-12 curriculum diagrams with zero runtime AI or network calls.',
    '(function (root, factory) {',
    '  var api = factory();',
    "  if (typeof module === 'object' && module.exports) module.exports = api;",
    "  if (root && typeof root === 'object') {",
    '    root.AlloWordPictureSemantic = api;',
    '    root.AlloModules = root.AlloModules || {};',
    '    root.AlloModules.WordPictureSemantic = api;',
    '  }',
    "})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {",
    "  'use strict';",
    '  var T = ' + JSON.stringify(targets) + ';',
    '  var D = ' + JSON.stringify(diagIdx) + ';',
    '  var S = ' + JSON.stringify(synIdx) + ';',
    '  var H = ' + JSON.stringify(hypIdx) + ';',
    '  var own = Object.prototype.hasOwnProperty;',
    '  function norm(w) { return String(w == null ? "" : w).trim().toLowerCase(); }',
    '  function lookup(word) {',
    '    var k = norm(word);',
    '    if (!k) return null;',
    '    if (own.call(D, k)) return { target: T[D[k]], kind: "diag", tier: "semantic-diagram" };',
    '    if (own.call(S, k)) return { target: T[S[k]], kind: "syn", tier: "semantic-synonym" };',
    '    if (own.call(H, k)) return { target: T[H[k]], kind: "hyp", tier: "semantic-hypernym" };',
    '    return null;',
    '  }',
    '  function has(word) {',
    '    var k = norm(word);',
    '    return !!k && (own.call(D, k) || own.call(S, k) || own.call(H, k));',
    '  }',
    '  return Object.freeze({',
    '    version: 1,',
    '    language: "en",',
    '    source: "Open English WordNet (CC BY 4.0)",',
    '    counts: Object.freeze(' + JSON.stringify({ total: counts.total, diag: counts.diag, syn: counts.syn, hyp: counts.hyp }) + '),',
    '    lookup: lookup,',
    '    has: has,',
    '  });',
    '});',
    '',
  ].join('\n');

  return { output, counts, diag: diagSorted, syn: synSorted, hyp: hypSorted };
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const report = args.includes('--report');
  const sampleIdx = args.indexOf('--sample');
  const sampleN = sampleIdx >= 0 ? Math.max(1, Number(args[sampleIdx + 1]) || 30) : 0;

  const made = compute();
  const bytes = Buffer.byteLength(made.output);

  if (report || sampleN) {
    console.log('Semantic visual bridge counts:', JSON.stringify(made.counts));
    console.log('Bundle size:', bytes, 'bytes (' + (bytes / 1024).toFixed(1) + ' KB)');
    if (sampleN) {
      const printSample = (label, obj, n) => {
        const keys = Object.keys(obj);
        const step = Math.max(1, Math.floor(keys.length / n));
        const picks = [];
        for (let i = 0; i < keys.length && picks.length < n; i += step) picks.push(keys[i] + ' -> ' + obj[keys[i]]);
        console.log('\nSample ' + label + ' (' + picks.length + '/' + keys.length + '):\n  ' + picks.join(', '));
      };
      printSample('diag', made.diag, Math.min(25, sampleN));
      printSample('syn', made.syn, sampleN);
      printSample('hyp', made.hyp, sampleN);
    }
    if (report) return;
  }

  if (check) {
    if (!fs.existsSync(OUT_FILE) || fs.readFileSync(OUT_FILE, 'utf8') !== made.output) {
      console.error('word_picture_semantic_en.js is out of date. Run node dev-tools/build_word_picture_semantic_bridge.cjs');
      process.exit(1);
    }
    console.log('Semantic visual bridge OK:', made.counts.total, 'words (' + (bytes / 1024).toFixed(1) + ' KB).');
    return;
  }

  writeAtomic(OUT_FILE, made.output);
  console.log('Built word_picture_semantic_en.js:', made.counts.total, 'words (' + (bytes / 1024).toFixed(1) + ' KB).');
}

if (require.main === module) main();
module.exports = { compute };
