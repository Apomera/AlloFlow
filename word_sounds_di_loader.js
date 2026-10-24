/*
 * word_sounds_di_loader.js — Direct Instruction lesson-script generator for Word Sounds.
 *
 * WHAT THIS IS
 *   A pure, deterministic analysis of a Word Sounds word pack plus the teacher's
 *   lesson plan, turned into a printable Direct Instruction script. No AI, no
 *   network, no React. It runs on a keyless device and produces the same script
 *   for the same pack every time, which is the property a teacher needs when the
 *   script is the thing they are holding in front of a child.
 *
 * WHY PURE
 *   Two reasons, both learned the hard way in this repo:
 *     1. A second derivation of one fact is a bug class. The player already owns
 *        "what sounds are in this word"; this module reads that same pack data
 *        rather than re-deriving phonemes from spelling.
 *     2. An on-screen prompt renderer will eventually want the same analysis.
 *        Keeping the analysis free of the player's state machine means that
 *        second renderer is a renderer, not a rewrite.
 *
 * ENGLISH ONLY, ON PURPOSE
 *   A DI script is scripted teacher speech. Machine-translating it would put
 *   words in a teacher's mouth in a language this repo cannot vouch for, and the
 *   correction procedure is exactly where a mistranslation does damage. Callers
 *   must gate on `supportsLanguage(lang)`; it returns false for anything but
 *   English so the UI can say so plainly instead of shipping a bad script.
 *
 * API
 *   window.AlloWordSoundsDI = {
 *     VERSION,
 *     supportsLanguage(lang) -> bool
 *     analyzeWordSet(words, opts) -> analysis
 *     buildLessonScript(analysis, plan, opts) -> script
 *     scriptToText(script, opts) -> string
 *     ACTIVITY_SKILLS
 *   }
 *   opts.translate (the host's ts) localizes the title, subtitle, caveats and
 *   copy-text headings only; the scripted teacher speech stays English.
 */
(function () {
  'use strict';
// BEGIN GENERATED WORD SOUNDS CORE
// Canonical Word Sounds logic. Embedded by dev-tools/sync_word_sounds_core.cjs.
// Edge sounds use the application's English phoneme-bank convention (including
// r-controlled vowel units). null denotes an unresolved pronunciation variant.
function createWordSoundsCore(options = {}) {
  const VERSION = 1;
  // Shared, lazy pronunciation data: keep the full dictionary out of each of
  // the three embedded core copies and out of lessons saved for students.
  const root = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : {};
  const scriptUrl = typeof document !== 'undefined' ? document.currentScript?.src || document.baseURI : '';
  const pronunciationData = () => options.pronunciations || root.AlloModules?.WordSoundsPronunciations;
  const loadSyllablePronunciations = async () => {
    if (pronunciationData()?.lookup) return true;
    if (typeof document === 'undefined') return false;
    if (!root.__alloSyllablePronunciationLoad) {
      root.__alloSyllablePronunciationLoad = new Promise(resolve => {
        let settled = false;
        const finish = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(!!pronunciationData()?.lookup); } };
        const timer = setTimeout(finish, 10000);
        if (typeof root.__alloLoadPlugin === 'function') {
          Promise.resolve().then(() => root.__alloLoadPlugin('word_sounds_pronunciations.js')).then(loaded => {
            // The host loader retains failed script tags. Remove only this
            // data module's failed tag so a later request can actually retry.
            if (!loaded && !pronunciationData()?.lookup) {
              for (const script of document.querySelectorAll?.('script[src]') || []) {
                try {
                  if (new URL(script.src, document.baseURI).pathname.endsWith('/word_sounds_pronunciations.js') &&
                    script.dataset?.alloLoaded !== '1') script.remove();
                } catch (_) {}
              }
            }
            finish();
          }, finish);
        } else {
          try {
            const url = new URL('word_sounds_pronunciations.js', scriptUrl || document.baseURI);
            const version = new URL(scriptUrl || document.baseURI).searchParams.get('v');
            if (version) url.searchParams.set('v', version);
            const script = document.createElement('script');
            script.src = url.href; script.async = true;
            script.onload = finish;
            script.onerror = () => { script.remove(); finish(); };
            document.head.appendChild(script);
          } catch (_) { finish(); }
        }
      }).then(loaded => { if (!loaded) root.__alloSyllablePronunciationLoad = null; return loaded; });
    }
    return root.__alloSyllablePronunciationLoad;
  };
  const EDGES = {
    "about": ["schwa","t"],
    "action": ["a","n"],
    "apple": ["a","l"],
    "art": ["ar","t"],
    "back": ["b","k"],
    "bag": ["b","g"],
    "ban": ["b","n"],
    "bang": ["b","ng"],
    "bar": ["b","ar"],
    "bat": ["b","t"],
    "bath": ["b","th"],
    "be": ["b","ee"],
    "bed": ["b","d"],
    "bee": ["b","ee"],
    "bib": ["b","b"],
    "big": ["b","g"],
    "bike": ["b","k"],
    "bird": ["b","d"],
    "bit": ["b","t"],
    "boat": ["b","t"],
    "book": ["b","k"],
    "box": ["b","s"],
    "brag": ["b","g"],
    "brim": ["b","m"],
    "bud": ["b","d"],
    "burn": ["b","n"],
    "bus": ["b","s"],
    "bush": ["b","sh"],
    "but": ["b","t"],
    "cab": ["k","b"],
    "cake": ["k","k"],
    "cap": ["k","p"],
    "car": ["k","ar"],
    "cash": ["k","sh"],
    "cat": ["k","t"],
    "cedar": ["s","er"],
    "cell": ["s","l"],
    "cent": ["s","t"],
    "center": ["s","er"],
    "cereal": ["s","l"],
    "chat": ["ch","t"],
    "chef": ["sh","f"],
    "chin": ["ch","n"],
    "chip": ["ch","p"],
    "chop": ["ch","p"],
    "circle": ["s","l"],
    "city": ["s","ee"],
    "clip": ["k","p"],
    "cob": ["k","b"],
    "come": ["k","m"],
    "cord": ["k","d"],
    "corn": ["k","n"],
    "crab": ["k","b"],
    "crib": ["k","b"],
    "cub": ["k","b"],
    "cup": ["k","p"],
    "curb": ["k","b"],
    "cut": ["k","t"],
    "cycle": ["s","l"],
    "dam": ["d","m"],
    "dark": ["d","k"],
    "deck": ["d","k"],
    "den": ["d","n"],
    "did": ["d","d"],
    "dim": ["d","m"],
    "dip": ["d","p"],
    "dirt": ["d","t"],
    "dish": ["d","sh"],
    "dog": ["d","g"],
    "dogs": ["d","z"],
    "done": ["d","n"],
    "dot": ["d","t"],
    "drag": ["d","g"],
    "drip": ["d","p"],
    "drop": ["d","p"],
    "drum": ["d","m"],
    "dub": ["d","b"],
    "duck": ["d","k"],
    "dug": ["d","g"],
    "each": ["ee","ch"],
    "eat": ["ee","t"],
    "egg": ["e","g"],
    "fan": ["f","n"],
    "far": ["f","ar"],
    "fat": ["f","t"],
    "fern": ["f","n"],
    "fib": ["f","b"],
    "fig": ["f","g"],
    "fin": ["f","n"],
    "firm": ["f","m"],
    "fish": ["f","sh"],
    "fit": ["f","t"],
    "fix": ["f","s"],
    "flag": ["f","g"],
    "flat": ["f","t"],
    "flip": ["f","p"],
    "fog": ["f","g"],
    "food": ["f","d"],
    "foot": ["f","t"],
    "for": ["f","or"],
    "fork": ["f","k"],
    "form": ["f","m"],
    "fox": ["f","s"],
    "frog": ["f","g"],
    "fun": ["f","n"],
    "fur": ["f","er"],
    "gab": ["g","b"],
    "gap": ["g","p"],
    "gas": ["g","s"],
    "gem": ["j","m"],
    "gentle": ["j","l"],
    "germ": ["j","m"],
    "get": ["g","t"],
    "gets": ["g","s"],
    "giant": ["j","t"],
    "gift": ["g","t"],
    "gifts": ["g","s"],
    "gig": ["g","g"],
    "giggle": ["g","l"],
    "ginger": ["j","er"],
    "giraffe": ["j","f"],
    "girl": ["g","l"],
    "girls": ["g","z"],
    "gist": ["j","t"],
    "give": ["g","v"],
    "gives": ["g","z"],
    "gnat": ["n","t"],
    "gnaw": ["n","aw"],
    "gnome": ["n","m"],
    "go": ["g","oa"],
    "gob": ["g","b"],
    "gone": ["g","n"],
    "got": ["g","t"],
    "grab": ["g","b"],
    "grin": ["g","n"],
    "grip": ["g","p"],
    "gum": ["g","m"],
    "gush": ["g","sh"],
    "gut": ["g","t"],
    "gym": ["j","m"],
    "hat": ["h","t"],
    "have": ["h","v"],
    "he": ["h","ee"],
    "hen": ["h","n"],
    "her": ["h","er"],
    "him": ["h","m"],
    "hit": ["h","t"],
    "home": ["h","m"],
    "honest": ["o","t"],
    "honor": ["o","er"],
    "hop": ["h","p"],
    "hot": ["h","t"],
    "hour": ["ow","er"],
    "hub": ["h","b"],
    "hug": ["h","g"],
    "hum": ["h","m"],
    "hung": ["h","ng"],
    "hurt": ["h","t"],
    "hut": ["h","t"],
    "igloo": ["i","oo"],
    "inch": ["i","ch"],
    "jab": ["j","b"],
    "jam": ["j","m"],
    "jar": ["j","ar"],
    "jet": ["j","t"],
    "jig": ["j","g"],
    "jog": ["j","g"],
    "jot": ["j","t"],
    "jug": ["j","g"],
    "jut": ["j","t"],
    "key": ["k","ee"],
    "kick": ["k","k"],
    "kid": ["k","d"],
    "king": ["k","ng"],
    "kit": ["k","t"],
    "kite": ["k","t"],
    "knee": ["n","ee"],
    "knife": ["n","f"],
    "knight": ["n","t"],
    "knob": ["n","b"],
    "knock": ["n","k"],
    "knot": ["n","t"],
    "know": ["n","oa"],
    "leg": ["l","g"],
    "let": ["l","t"],
    "lid": ["l","d"],
    "lip": ["l","p"],
    "lit": ["l","t"],
    "live": ["l","v"],
    "lock": ["l","k"],
    "log": ["l","g"],
    "long": ["l","ng"],
    "look": ["l","k"],
    "lot": ["l","t"],
    "luck": ["l","k"],
    "lug": ["l","g"],
    "lung": ["l","ng"],
    "map": ["m","p"],
    "mark": ["m","k"],
    "mash": ["m","sh"],
    "mat": ["m","t"],
    "math": ["m","th"],
    "me": ["m","ee"],
    "men": ["m","n"],
    "met": ["m","t"],
    "mix": ["m","s"],
    "mob": ["m","b"],
    "mom": ["m","m"],
    "moon": ["m","n"],
    "mop": ["m","p"],
    "much": ["m","ch"],
    "mud": ["m","d"],
    "mug": ["m","g"],
    "nab": ["n","b"],
    "nag": ["n","g"],
    "nap": ["n","p"],
    "nation": ["n","n"],
    "neck": ["n","k"],
    "net": ["n","t"],
    "nip": ["n","p"],
    "no": ["n","oa"],
    "nod": ["n","d"],
    "nose": ["n","z"],
    "not": ["n","t"],
    "nun": ["n","n"],
    "nut": ["n","t"],
    "octopus": ["o","s"],
    "of": ["u","v"],
    "one": ["w","n"],
    "out": ["ow","t"],
    "pan": ["p","n"],
    "park": ["p","k"],
    "pat": ["p","t"],
    "path": ["p","th"],
    "peg": ["p","g"],
    "pen": ["p","n"],
    "pet": ["p","t"],
    "phone": ["f","n"],
    "pick": ["p","k"],
    "pig": ["p","g"],
    "pin": ["p","n"],
    "pit": ["p","t"],
    "plan": ["p","n"],
    "play": ["p","ay"],
    "plug": ["p","g"],
    "plum": ["p","m"],
    "pod": ["p","d"],
    "pop": ["p","p"],
    "pot": ["p","t"],
    "psalm": ["s","m"],
    "psychology": ["s","ee"],
    "pub": ["p","b"],
    "pun": ["p","n"],
    "pup": ["p","p"],
    "put": ["p","t"],
    "queen": ["k","n"],
    "quick": ["k","k"],
    "quilt": ["k","t"],
    "rag": ["r","g"],
    "rain": ["r","n"],
    "ram": ["r","m"],
    "ran": ["r","n"],
    "rap": ["r","p"],
    "rat": ["r","t"],
    "red": ["r","d"],
    "rib": ["r","b"],
    "rich": ["r","ch"],
    "rid": ["r","d"],
    "rig": ["r","g"],
    "rim": ["r","m"],
    "ring": ["r","ng"],
    "rip": ["r","p"],
    "rob": ["r","b"],
    "rock": ["r","k"],
    "rod": ["r","d"],
    "rot": ["r","t"],
    "rub": ["r","b"],
    "rug": ["r","g"],
    "run": ["r","n"],
    "rush": ["r","sh"],
    "rut": ["r","t"],
    "sat": ["s","t"],
    "school": ["s","l"],
    "sea": ["s","ee"],
    "see": ["s","ee"],
    "set": ["s","t"],
    "she": ["sh","ee"],
    "shed": ["sh","d"],
    "shell": ["sh","l"],
    "shin": ["sh","n"],
    "ship": ["sh","p"],
    "shop": ["sh","p"],
    "shot": ["sh","t"],
    "shut": ["sh","t"],
    "sing": ["s","ng"],
    "sip": ["s","p"],
    "sir": ["s","er"],
    "sit": ["s","t"],
    "six": ["s","s"],
    "skip": ["s","p"],
    "slam": ["s","m"],
    "slap": ["s","p"],
    "slim": ["s","m"],
    "slip": ["s","p"],
    "slug": ["s","g"],
    "snap": ["s","p"],
    "snip": ["s","p"],
    "snug": ["s","g"],
    "so": ["s","oa"],
    "sob": ["s","b"],
    "sock": ["s","k"],
    "sod": ["s","d"],
    "some": ["s","m"],
    "song": ["s","ng"],
    "spin": ["s","n"],
    "spot": ["s","t"],
    "star": ["s","ar"],
    "step": ["s","p"],
    "stop": ["s","p"],
    "stub": ["s","b"],
    "stun": ["s","n"],
    "sub": ["s","b"],
    "such": ["s","ch"],
    "sum": ["s","m"],
    "sun": ["s","n"],
    "surf": ["s","f"],
    "swim": ["s","m"],
    "tab": ["t","b"],
    "tag": ["t","g"],
    "tan": ["t","n"],
    "tap": ["t","p"],
    "ten": ["t","n"],
    "that": ["dh","t"],
    "them": ["dh","m"],
    "then": ["dh","n"],
    "thin": ["th","n"],
    "this": ["dh","s"],
    "tin": ["t","n"],
    "tip": ["t","p"],
    "top": ["t","p"],
    "torn": ["t","n"],
    "tot": ["t","t"],
    "trap": ["t","p"],
    "tree": ["t","ee"],
    "trim": ["t","m"],
    "trip": ["t","p"],
    "trot": ["t","t"],
    "tub": ["t","b"],
    "tug": ["t","g"],
    "turn": ["t","n"],
    "umbrella": ["u","schwa"],
    "van": ["v","n"],
    "vat": ["v","t"],
    "vet": ["v","t"],
    "vim": ["v","m"],
    "vow": ["v","ow"],
    "wag": ["w","g"],
    "wax": ["w","s"],
    "we": ["w","ee"],
    "web": ["w","b"],
    "wed": ["w","d"],
    "when": ["w","n"],
    "whip": ["w","p"],
    "whiz": ["w","z"],
    "wig": ["w","g"],
    "win": ["w","n"],
    "wish": ["w","sh"],
    "wit": ["w","t"],
    "with": ["w",null],
    "wok": ["w","k"],
    "won": ["w","n"],
    "wrap": ["r","p"],
    "wren": ["r","n"],
    "wrist": ["r","t"],
    "write": ["r","t"],
    "wrong": ["r","ng"],
    "yak": ["y","k"],
    "yam": ["y","m"],
    "yap": ["y","p"],
    "yes": ["y","s"],
    "yet": ["y","t"],
    "zap": ["z","p"],
    "zen": ["z","n"],
    "zip": ["z","p"],
    "zoo": ["z","oo"]
  };
  const normalize = value => String(value || '').normalize('NFC').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  // Generated English packs use macrons; the edge dictionary and audio bank
  // use ay/ee/ie/oa/oo. Compare those spellings as the same sound everywhere.
  const aliases = {c:'k',ck:'k',q:'k',qu:'k',ph:'f',wh:'w',tch:'ch',dge:'j',ai:'ay',ea:'ee',ir:'er',ur:'er',au:'aw',oe:'oa',oi:'oy','ā':'ay','ē':'ee','ī':'ie','ō':'oa','ū':'oo','ɡ':'g','ʃ':'sh','ʒ':'zh','θ':'th','ð':'dh','ŋ':'ng','dʒ':'j','ʤ':'j','tʃ':'ch','ʧ':'ch','æ':'a','ɛ':'e','ɪ':'i','ɒ':'o','ɑ':'o','ɑː':'o','ʌ':'u','ə':'schwa','iː':'ee','uː':'oo','ʊ':'oo_short','eɪ':'ay','aɪ':'ie','oʊ':'oa','əʊ':'oa','aʊ':'ow','ɔɪ':'oy','ɹ':'r','ɝ':'er','ɚ':'er'};
  // A bare string uses the app's phonics notation; an explicit IPA field
  // retains its notation provenance (IPA i/u/j are not app short i/u/j).
  const phonemeToken = value => {
    if (typeof value === 'string') return normalize(value);
    if (!value || typeof value !== 'object') return '';
    for (const field of ['ipa', 'phoneme', 'sound', 'grapheme']) {
      if (typeof value[field] === 'string' && normalize(value[field])) return normalize(value[field]);
    }
    return '';
  };
  const ipaExtraKeys = {'\u025cr':'er','\u025c\u02d0':'er','\u025c':'er','\u0251r':'ar','\u0251\u02d0r':'ar','\u0254r':'or','\u0254\u02d0r':'or','\u0254':'aw','\u0254\u02d0':'aw','\u0250':'u'};
  const soundKey = value => {
    const token = phonemeToken(value).replace(/[\u02c8\u02cc\u0361]/g, '');
    const explicitIpa = value && typeof value === 'object' && typeof value.ipa === 'string' && !!normalize(value.ipa);
    if (explicitIpa && token === 'i') return 'ee';
    if (explicitIpa && token === 'u') return 'oo';
    if (explicitIpa && token === 'j') return 'y';
    const key = Object.prototype.hasOwnProperty.call(ipaExtraKeys, token) ? ipaExtraKeys[token] : token;
    return Object.prototype.hasOwnProperty.call(aliases, key) ? aliases[key] : key;
  };
  // String-only learner controls need a sound label, never an object or a
  // spelling substituted for a sound. Preserve other languages' IPA labels.
  const phonemeLabel = (value, isEnglish = true) => typeof value === 'string' || !isEnglish
    ? phonemeToken(value) : soundKey(value);
  const edgeSound = (word, position, phonemes) => {
    const w=normalize(word), last=position==='last';
    if (Object.prototype.hasOwnProperty.call(EDGES,w)) return EDGES[w][last?1:0];
    if (!Array.isArray(phonemes) || !phonemes.length) return null;
    const item=phonemes[last?phonemes.length-1:0];
    const key=soundKey(item);
    if (!key) return null;
    return last && (key==='x'||key==='ks') ? 's' : key;
  };
  const unique = values => [...new Set((values||[]).map(normalize).filter(Boolean))];
  const shuffled = (values, seed) => { const out=[...values]; let s=seed||1; for(let i=out.length-1;i>0;i--){ s=(Math.imul(s,1664525)+1013904223)>>>0; const j=s%(i+1); [out[i],out[j]]=[out[j],out[i]];} return out; };
  const RHYME_VOWELS = new Set(['a','e','i','o','u','ay','ee','ie','oa','oo','oo_short','oy','ow','aw','ar','er','or','air','ear','ure','schwa']);
  // Reviewed pronunciation groups, not spelling rules. These common words
  // remain usable when an older pack has no pronunciation for its answer.
  // In particular food/mood and good/wood are separate despite their spelling.
  const REVIEWED_RHYMES = {
    'a|t':'at bat cat fat flat hat mat pat rat sat that chat',
    'a|p':'cap clap flap gap lap map nap rap snap tap trap',
    'a|n':'an ban can fan man pan ran tan van',
    'a|g':'bag brag drag flag rag tag',
    'e|d':'bed bread fed head led red said shed sled spread thread',
    'e|n':'den hen men pen ten then when',
    'e|t':'bet get jet let met net pet set wet yet',
    'i|g':'big dig fig gig jig pig wig',
    'i|n':'bin chin fin grin in pin shin skin spin thin tin win',
    'i|t':'bit fit hit it kit knit lit pit quit sit slit split wit',
    'o|g':'bog cog dog fog frog hog jog log',
    'o|p':'chop cop crop drop flop hop mop pop shop stop top',
    'u|g':'bug dug hug jug mug plug rug slug snug',
    'u|n':'bun done fun gun none one run son spun stun sun ton won',
    'u|t':'but cut gut hut nut shut strut',
    'oo_short|d':'good hood stood wood would should could',
    'oo_short|k':'book brook cook hook look shook took',
    'oo|d':'food mood rude',
    'oo':'blue boo chew clue crew do drew flew glue grew knew new shoe stew through to too true two who zoo',
    'oo|n':'boon June moon noon soon spoon tune',
    'ay':'bay day gray grey hay lay may pay play ray say stay they way weigh',
    'ay|n':'brain cane chain gain grain lane main mane pain plain plane rain sane stain train vain vein',
    'ee':'be bee flea free key knee me pea sea see she tea three tree we',
    'ie':'by cry dry fly fry guy high lie my pie shy sigh sky spy tie try why',
    'oa':'blow bow dough flow glow go grow know low mow no row sew show slow snow so sow though throw toe tow',
    'ar':'are bar car far jar scar star tar',
    'or|n':'born corn horn morn scorn torn worn',
    'or|m':'form storm warm',
    'er':'fur her purr sir stir were',
    'ow':'bow cow how now plow row sow wow',
    'u|n|ee':'bunny funny honey money sunny',
  };
  const reviewedRhymeKeys = new Map();
  Object.entries(REVIEWED_RHYMES).forEach(([key, words]) => words.split(' ').map(normalize).forEach(word => {
    // Homographs with more than one group require supplied pronunciation.
    reviewedRhymeKeys.set(word, reviewedRhymeKeys.has(word) ? null : key);
  }));
  const reviewedRhymeEdit = (item, {answer, options} = {}) => {
    const row = item && typeof item === 'object' ? item : {};
    const targetWord = normalize(row.targetWord || row.word || row.term);
    const rawAnswer = typeof answer === 'string' ? answer : String(row.rhymeWord || '');
    const rawOptions = (Array.isArray(options) ? options : [rawAnswer, ...(row.rhymeDistractors || [])])
      .map(value => typeof value === 'string' ? value : '');
    const correct = normalize(rawAnswer), choices = rawOptions.map(normalize);
    const answerIndex = choices.indexOf(correct);
    const supported = !!targetWord && !!correct && correct !== targetWord && choices.length >= 2 &&
      choices.every(Boolean) && new Set(choices).size === choices.length && answerIndex >= 0 && !choices.includes(targetWord);
    const board = {targetWord, answer:correct, options:choices, teacherEdited:true, supported,
      contentStatus:supported ? 'teacher_reviewed' : 'teacher_review_required'};
    const updated = {...row, rhymeWord:rawAnswer, rhymes:correct ? [rawAnswer] : [],
      rhymeDistractors:rawOptions.filter((_, index) => index !== answerIndex),
      activityItems:{...(row.activityItems || {}), rhyming:board}, _rhymeSource:'teacher_review', _packEdited:true};
    delete updated.rhymePronunciation;
    delete updated._rhymeRejectedAnswer;
    return updated;
  };
  const rhymePairStatus = ({word, answer, phonemes, answerPhonemes, pool=[], prepared, isEnglish=true} = {}) => {
    const target = normalize(word), correct = normalize(answer);
    if (!target || !correct || target === correct) return {supported:false, rhymes:false, reason:'rhyme_answer_invalid'};
    if (prepared?.teacherEdited === true) {
      if (prepared.supported === false || prepared.targetWord != null && normalize(prepared.targetWord) !== target) {
        return {supported:false, rhymes:null, reason:'rhyme_review_incomplete'};
      }
      return {supported:true, rhymes:true, source:'teacher_review'};
    }
    const data = new Map((Array.isArray(pool) ? pool : []).filter(value => value && typeof value === 'object')
      .map(value => [normalize(value.targetWord || value.word || value.term), value]));
    const evidence = prepared?.pronunciations;
    const bound = evidence?.targetWord === target && evidence.answer === correct;
    const select = (given, raw, saved) => Array.isArray(given) && given.length ? given
      : Array.isArray(raw) && raw.length ? raw : bound && Array.isArray(saved) ? saved : [];
    const targetSounds = select(phonemes, data.get(target)?.phonemes, evidence?.targetPhonemes).map(soundKey);
    const correctSounds = select(answerPhonemes, data.get(correct)?.phonemes, evidence?.answerPhonemes).map(soundKey);
    const rime = (value, sounds) => {
      const reviewed = isEnglish ? reviewedRhymeKeys.get(value) : null;
      if (!sounds.length) return reviewed || null;
      const at = sounds.findIndex(sound => RHYME_VOWELS.has(sound));
      if (at < 0 || sounds.some(sound => !RHYME_VOWELS.has(sound) && !/^(?:[b-df-hj-np-tv-z]|sh|ch|th|dh|zh|ng)$/.test(sound))) return null;
      const key = sounds.slice(at).join('|');
      // Unstressed IPA alone does not locate the stressed rime of an unknown
      // multisyllabic word. Use a reviewed group or ask for review.
      return sounds.filter(sound => RHYME_VOWELS.has(sound)).length === 1 || key === reviewed ? key : null;
    };
    const left = rime(target, targetSounds), right = rime(correct, correctSounds);
    // A supplied pronunciation may differ from the reviewed bank's dialect.
    // When only that side is supplied, a disagreement needs the other side's
    // pronunciation before it can establish a negative result.
    const mixedVariant = isEnglish && left !== right && !!targetSounds.length !== !!correctSounds.length &&
      (targetSounds.length ? left !== reviewedRhymeKeys.get(target) : right !== reviewedRhymeKeys.get(correct));
    const known = !!left && !!right && !mixedVariant;
    return {supported:known && left === right, rhymes:known ? left === right : null,
      reason:known ? (left === right ? undefined : 'rhyme_pronunciation_mismatch') : 'rhyme_pronunciation_review_required',
      source:targetSounds.length && correctSounds.length ? 'pronunciation' : 'reviewed_words',
      ...(known && left === right && targetSounds.length && correctSounds.length ? {pronunciations:{
        targetWord:target, answer:correct, targetPhonemes:targetSounds, answerPhonemes:correctSounds}} : {})};
  };
  // Generated Rhyme Time choices are stable per target, but do not reuse the
  // first few model/filler words for every item. Saved boards remain intact.
  const buildRhymeBoard = ({word, answer, phonemes, answerPhonemes, pool=[], distractors=[], prepared, isEnglish=true, count=4, exposure}) => {
    const checked = rhymePairStatus({word, answer:prepared?.answer || answer, phonemes, answerPhonemes, pool, prepared, isEnglish});
    if (!checked.supported) return {answer:'', options:[], supported:false, contentStatus:'teacher_review_required',
      reason:checked.reason, suggestedAnswer:prepared?.answer || answer || ''};
    if (prepared && Array.isArray(prepared.options) && prepared.options.length > 1 &&
        prepared.answer && prepared.options.includes(prepared.answer)) {
      return {...prepared, options: [...prepared.options],
        ...(!prepared.teacherEdited && checked.pronunciations ? {pronunciations:checked.pronunciations} : {})};
    }
    const target = normalize(word), correct = normalize(answer);
    if (!correct) return {answer: answer || '', options: []};
    const data = new Map(pool.filter(p => p && typeof p === 'object')
      .map(p => [normalize(p.targetWord || p.word || p.term), p]));
    if (Array.isArray(phonemes) && phonemes.length) data.set(target, {...data.get(target), phonemes});
    const labels = w => ((data.get(w) || {}).phonemes || []).map(soundKey).filter(Boolean);
    const vowels = new Set(['a','e','i','o','u','ay','ee','ie','oa','oo','oo_short','oy','ow','aw','ar','er','or','air','ear','ure','schwa']);
    const rime = w => {
      const sounds = labels(w);
      for (let i = sounds.length - 1; i >= 0; i--) {
        if (vowels.has(sounds[i])) return sounds.slice(i).join('|');
      }
      return null;
    };
    const finalSound = w => {
      const sounds = labels(w);
      if (!isEnglish) return sounds.length ? sounds[sounds.length - 1] : null;
      return edgeSound(w, 'last', (data.get(w) || {}).phonemes);
    };
    const referenceRimes = [rime(target), rime(correct)].filter(Boolean);
    const referenceEnds = [finalSound(target), finalSound(correct)].filter(Boolean).map(soundKey);
    const spellingRime = w => isEnglish ? (w.match(/[aeiou][a-z]*$/) || [''])[0] : w.slice(-2);
    const supplied = new Set(unique(distractors));
    const safe = w => {
      if (!w || w === target || w === correct) return false;
      const candidateRime = rime(w);
      if (candidateRime && referenceRimes.length) return referenceRimes.every(key => key !== candidateRime);
      const end = finalSound(w);
      if (end && referenceEnds.length) {
        // EDGES contains validated SOUNDS, not final letters: one/sun,
        // blue/shoe and other alternate spellings cannot slip through here.
        return referenceEnds.every(key => key !== soundKey(end));
      }
      // Without pronunciation evidence, retain only the supplied distractors
      // under the existing rime guard; never invent an unverified filler.
      return supplied.has(w) && spellingRime(w) !== spellingRime(correct) && spellingRime(w) !== spellingRime(target);
    };
    const candidates = unique([...distractors, ...pool.map(p => typeof p === 'string' ? p : p && (p.targetWord || p.word || p.term))]).filter(safe);
    const nearby = candidates.filter(w => w.length <= Math.max(4, target.length + 1));
    const eligible = nearby.length >= count ? nearby : candidates;
    const targetSounds = labels(target);
    const score = w => {
      const sounds = labels(w);
      const lengthCost = Math.abs((sounds.length || w.length) - (targetSounds.length || target.length));
      const onset = edgeSound(target, 'first', phonemes);
      const sameOnset = onset && edgeSound(w, 'first', (data.get(w) || {}).phonemes) === onset;
      const targetVowel = targetSounds.find(s => vowels.has(s));
      const sameVowel = targetVowel && sounds.includes(targetVowel);
      return lengthCost * 3 - (sameOnset ? 2 : 0) - (sameVowel ? 1 : 0);
    };
    const seed = [...target].reduce((hash, c) => Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
    const ranked = shuffled(eligible, seed).sort((a,b) => score(a) - score(b));
    // Exposure can change the choice among nearby contrasts, never admit a
    // rhyme or replace beginner choices with arbitrarily difficult words.
    const boundary = ranked.length ? score(ranked[Math.min(Math.max(0, count - 1), ranked.length - 1)]) + 3 : 0;
    const challengePool = ranked.filter(w => score(w) <= boundary);
    const repetitionCost = w => {
      if (!exposure) return 0;
      const uses = exposure.counts instanceof Map ? exposure.counts.get(w) || 0 : 0;
      const recent = Array.isArray(exposure.recent) ? exposure.recent : [];
      const last = recent[recent.length - 1] || [];
      return Math.min(3, uses) * 2 + (last.includes(w) ? 4 : recent.some(board => board.includes(w)) ? 2 : 0);
    };
    const selected = challengePool.sort((a,b) => score(a) + repetitionCost(a) - score(b) - repetitionCost(b)).slice(0, count);
    return {answer, options: shuffled([answer, ...selected], seed ^ 0x9e3779b9),
      ...(checked.pronunciations ? {pronunciations:checked.pronunciations} : {})};
  };

  // A lesson/runtime owns this ledger. It is intentionally absent from saved
  // boards: their answer/order remain fixed on every learner device.
  const createRhymeSession = () => ({ counts: new Map(), recent: [], occurrences: new Map() });
  const buildSessionRhymeBoard = ({session, occurrenceId, ...args}) => {
    if (!session || !(session.occurrences instanceof Map) || occurrenceId == null) return buildRhymeBoard(args);
    const key = String(occurrenceId);
    const prepared = args.prepared;
    const hasPrepared = prepared && Array.isArray(prepared.options) && prepared.options.length > 1 &&
      prepared.answer && prepared.options.includes(prepared.answer);
    const previous = session.occurrences.get(key);
    const inputKey = JSON.stringify([normalize(args.word), normalize(args.answer), args.phonemes || [], args.answerPhonemes || [], args.distractors || [],
      (args.pool || []).filter(value => value && typeof value === 'object').map(value => [value.targetWord || value.word || value.term, value.phonemes])]);
    // Edits and saved boards are authoritative even if the same occurrence
    // was generated before them. An already counted occurrence stays counted.
    if (previous && !hasPrepared && previous.inputKey === inputKey) return {...previous.board, options: [...previous.board.options]};
    const board = buildRhymeBoard({...args, exposure: session});
    if (!board.answer || !Array.isArray(board.options) || board.options.length < 2 || !board.options.includes(board.answer)) return board;
    if (!previous) {
      const distractors = unique(board.options).filter(w => w !== normalize(board.answer));
      distractors.forEach(w => session.counts.set(w, (session.counts.get(w) || 0) + 1));
      session.recent.push(distractors);
      session.recent = session.recent.slice(-3);
    }
    session.occurrences.set(key, {inputKey, board: {...board, options: [...board.options]}});
    return board;
  };

  const validSoundBoard = (board, word, pool=[]) => {
    if(!board || !['first','last'].includes(board.mode) || !board.targetChar) return false;
    const yes=unique(board.options), no=unique(board.distractors);
    if(!yes.length || !no.length || yes.length!==(board.options||[]).length || no.length!==(board.distractors||[]).length || yes.some(w=>no.includes(w)||w===normalize(word)) || no.includes(normalize(word))) return false;
    if(board.teacherEdited) return true;
    const data=new Map(pool.filter(p=>p && typeof p==='object').map(p=>[normalize(p.word||p.targetWord||p.term),p]));
    const sound=w=>edgeSound(w,board.mode,(data.get(w)||{}).phonemes);
    const target=soundKey(board.targetChar);
    const actual=sound(normalize(word));
    return (actual != null && soundKey(actual)===target) && yes.every(w=>sound(w)!=null && soundKey(sound(w))===target) && no.every(w=>sound(w)!=null && soundKey(sound(w))!==target);
  };
  const buildSoundSort = ({word,phonemes,mode,pool=[],matches=[],targetSound,teacherEdited=false,distractors=[]}) => {
    word=normalize(word); mode=mode==='last'?'last':'first';
    const seed=[...word].reduce((n,c)=>n+c.charCodeAt(0),0);
    const data=new Map(pool.filter(p=>p && typeof p==='object').map(p=>[normalize(p.word||p.targetWord||p.term),p]));
    const target=edgeSound(word,mode,phonemes) || (targetSound && soundKey(targetSound));
    if(!target) return null;
    if(teacherEdited){const board={version:VERSION,teacherEdited:true,mode,targetChar:soundKey(targetSound||target),difficulty:'medium',options:unique(matches),distractors:unique(distractors)};return validSoundBoard(board,word,pool)?board:null;}
    const words=unique([...matches,...pool.map(p=>typeof p==='string'?p:(p.word||p.targetWord||p.term))]).filter(w=>w!==word);
    const sound=w=>edgeSound(w,mode,(data.get(w)||{}).phonemes);
    const yes=words.filter(w=>sound(w)!=null && soundKey(sound(w))===soundKey(target));
    const no=words.filter(w=>sound(w)!=null && soundKey(sound(w))!==soundKey(target));
    const limit=word.length<=3?3:5;
    const short=values=>{const easy=values.filter(w=>w.length<=(word.length<=3?3:4));return word.length<=4 && easy.length>=2?easy:values;};
    const board={version:VERSION,mode,targetChar:soundKey(target),difficulty:word.length<=3?'easy':word.length<=4?'medium':'hard',options:shuffled(short(yes),seed).slice(0,limit),distractors:shuffled(short(no),seed+1).slice(0,limit-1)};
    return validSoundBoard(board,word,pool)?board:null;
  };
  // Prepared family boards must be answerable and unambiguous. This checks
  // their spelling-family structure; it is not a pronunciation/decodability test.
  const validWordFamilyBoard = (board, word) => {
    if (!board || typeof board.rime !== 'string' || !/^[\p{L}\p{M}]+$/u.test(board.rime)) return false;
    if (!Array.isArray(board.options) || !board.options.length || !Array.isArray(board.distractors) || !board.distractors.length) return false;
    const values = [...board.options, ...board.distractors];
    if (values.some(v => typeof v !== 'string' || !v.trim() || normalize(v) !== v || v === normalize(word))) return false;
    if (new Set(values).size !== values.length) return false;
    if (board.teacherEdited === true) return true;
    return normalize(word).endsWith(board.rime) && normalize(word).length > board.rime.length &&
      board.options.every(v => v.endsWith(board.rime) && v.length > board.rime.length) &&
      board.distractors.every(v => !v.endsWith(board.rime));
  };
  const wordFamilyInstruction = rime => `Find all words in the ${rime} family`;
  const difficultyDecision = (history, activity, support={}) => {
    const rows=(history||[]).filter(h=>h && h.activity===activity && !h.practiceOnly && h.activity!=='letter_tracing' && h.taskKind!=='word_matching' && !h.answerExposed && !!h.aacAssisted===!!support.aacAssisted && (h.mode||'sound_only')===(support.mode||'sound_only'));
    let band=0, block=[], reason='starting', changes=0;
    const bands=['easy','medium','hard'];
    for(const h of rows){
      if(h.difficulty && h.difficulty!==bands[band]) continue;
      block.push(h); block=block.slice(-10);
      const distinct=new Set(block.map(r=>normalize(r.word)).filter(Boolean)).size;
      const n=block.length, accuracy=block.reduce((s,r)=>s+(r.correct?((r.attempts||1)>1?0.5:1):0),0)/n;
      const min=band===0?6:8, words=band===0?4:6;
      if(band<2 && n>=min && distinct>=words && accuracy>=0.85){band++;changes++;block=[];reason='advance';}
      else if(band>0 && n>=6 && distinct>=4 && accuracy<0.45){band--;changes++;block=[];reason='step_back';}
      else if(reason==='starting')reason='practice';
    }
    return {difficulty:bands[band],reason,items:block.length,distinctWords:new Set(block.map(r=>normalize(r.word)).filter(Boolean)).size,changes};
  };
  const textEvidence = ({activity,imageAvailable,answerRevealed=false}) => {
    const connected=['read_sentence','read_passage'].includes(activity);
    if(!connected)return {};
    const wordMatching=!imageAvailable || answerRevealed;
    return {taskKind:wordMatching?'word_matching':'picture_supported_cloze',cluesShown:wordMatching?['printed_answer']:['picture'],fallbackReason:!imageAvailable?'missing_target_image':answerRevealed?'answer_revealed':null,independentReading:false,answerExposed:wordMatching};
  };
  // Progress keys follow the displayed sound label for both legacy strings
  // and prepared pronunciation objects. One response counts once per label.
  const phonemeLabels = phonemes => [...new Set((Array.isArray(phonemes) ? phonemes : []).map(value => {
    const label = typeof value === 'string' ? value : value && typeof value === 'object'
      ? [value.grapheme, value.phoneme, value.ipa].find(v => typeof v === 'string' && v.trim()) : '';
    return typeof label === 'string' && !/^\[object /i.test(label.trim()) ? label.normalize('NFC').trim().toLowerCase() : '';
  }).filter(Boolean))];
  // Capture the supports present when answering, before success feedback can
  // reveal the word. Preserve the more specific connected-text evidence.
  const responseEvidence = ({showWordText=false,showLetterHints=false,alwaysShowText=false,taskEvidence={}}={}) => {
    const textSupported=!!(showWordText || showLetterHints || alwaysShowText || taskEvidence.textSupported || taskEvidence.answerExposed);
    const cluesShown=[...new Set([...(taskEvidence.cluesShown || []),
      ...(showWordText || alwaysShowText ? ['printed_word'] : []),
      ...(showLetterHints ? ['printed_sound_labels'] : [])])];
    return {...taskEvidence,textSupported,cluesShown,mode:textSupported || taskEvidence.taskKind ? 'visual' : 'sound_only'};
  };
  const profileCheck = (text, profile) => {
    if(!profile || !Array.isArray(profile.taughtPatterns) || !profile.taughtPatterns.length)return {status:'not_configured',untaughtWords:[]};
    const known=new Set(unique(profile.knownWords)); const patterns=unique(profile.taughtPatterns).filter(p=>/^[\p{L}\p{M}]+$/u.test(p)).sort((a,b)=>b.length-a.length);
    const canRead=w=>{if(known.has(w))return true; const reached=new Set([0]); for(let i=0;i<w.length;i++){if(!reached.has(i))continue; for(const p of patterns)if(w.startsWith(p,i))reached.add(i+p.length);}return reached.has(w.length);};
    const unknown=unique(String(text||'').normalize('NFC').match(/[\p{L}\p{M}]+/gu)||[]).filter(w=>!canRead(w));
    return {status:unknown.length?'review':'within_taught_spellings',untaughtWords:unknown};
  };
  // A bounded word inventory supplies two real spoken syllables per item.
  // Each component is a familiar one-syllable word: text-to-speech can read it
  // without guessing the pronunciation of fragments such as "ba" or "nana".
  // This inventory deliberately excludes ambiguous syllable reductions.
  const SYLLABLE_COMPOUNDS = {
    sunset: ['sun', 'set'], sunrise: ['sun', 'rise'], sunlight: ['sun', 'light'], sunshine: ['sun', 'shine'],
    raincoat: ['rain', 'coat'], raindrop: ['rain', 'drop'],
    snowman: ['snow', 'man'], snowball: ['snow', 'ball'], snowflake: ['snow', 'flake'],
    cupcake: ['cup', 'cake'], pancake: ['pan', 'cake'], backpack: ['back', 'pack'],
    bookbag: ['book', 'bag'], handbag: ['hand', 'bag'], handball: ['hand', 'ball'],
    handstand: ['hand', 'stand'], handshake: ['hand', 'shake'], handprint: ['hand', 'print'],
    football: ['foot', 'ball'], baseball: ['base', 'ball'], softball: ['soft', 'ball'],
    playground: ['play', 'ground'], toothbrush: ['tooth', 'brush'], toothpaste: ['tooth', 'paste'],
    blackbird: ['black', 'bird'], bluebird: ['blue', 'bird'], blackboard: ['black', 'board'],
    whiteboard: ['white', 'board'], doorbell: ['door', 'bell'], doorknob: ['door', 'knob'],
    classroom: ['class', 'room'], classmate: ['class', 'mate'], bedtime: ['bed', 'time'],
    bedroom: ['bed', 'room'], starfish: ['star', 'fish'], seashell: ['sea', 'shell'],
    seahorse: ['sea', 'horse'], seashore: ['sea', 'shore'], sailboat: ['sail', 'boat'],
    steamboat: ['steam', 'boat'], hotdog: ['hot', 'dog'],
    goldfish: ['gold', 'fish'], goldmine: ['gold', 'mine'], mailbox: ['mail', 'box'],
    mailman: ['mail', 'man'], homework: ['home', 'work'], housework: ['house', 'work'],
    doghouse: ['dog', 'house'], birdhouse: ['bird', 'house'], treehouse: ['tree', 'house'],
    paintbrush: ['paint', 'brush'], sandpit: ['sand', 'pit'], sandbox: ['sand', 'box'],
    sandbag: ['sand', 'bag'], milkshake: ['milk', 'shake'], milkman: ['milk', 'man'],
    popcorn: ['pop', 'corn'], cornflake: ['corn', 'flake'], teapot: ['tea', 'pot'],
    teacup: ['tea', 'cup'], lunchbox: ['lunch', 'box'], bathrobe: ['bath', 'robe'],
    bathmat: ['bath', 'mat'], headband: ['head', 'band'],
  };
  const syllableWords = () => Object.keys(SYLLABLE_COMPOUNDS);
  // Written hints for recording word-specific speech, never TTS fragments.
  // These expand the teaching inventory without claiming unrecorded sounds are
  // checked audio. The teacher still previews and confirms every recording.
  const SYLLABLE_RECORDING_HINTS = {
    apple: ['ap', 'ple'], table: ['ta', 'ble'], rabbit: ['rab', 'bit'],
    pencil: ['pen', 'cil'], basket: ['bas', 'ket'], window: ['win', 'dow'],
    monkey: ['mon', 'key'], garden: ['gar', 'den'], button: ['but', 'ton'],
    tiger: ['ti', 'ger'], wagon: ['wag', 'on'], lemon: ['lem', 'on'],
    puppy: ['pup', 'py'], kitten: ['kit', 'ten'], dragon: ['drag', 'on'],
    robot: ['ro', 'bot'], picnic: ['pic', 'nic'], people: ['peo', 'ple'],
    banana: ['ba', 'na', 'na'], elephant: ['el', 'e', 'phant'],
    computer: ['com', 'pu', 'ter'], potato: ['po', 'ta', 'to'],
    tomato: ['to', 'ma', 'to'], dinosaur: ['di', 'no', 'saur'],
    butterfly: ['but', 'ter', 'fly'], animal: ['an', 'i', 'mal'],
    alphabet: ['al', 'pha', 'bet'], octopus: ['oc', 'to', 'pus'],
    alligator: ['al', 'li', 'ga', 'tor'], helicopter: ['hel', 'i', 'cop', 'ter'],
    watermelon: ['wa', 'ter', 'mel', 'on'], avocado: ['av', 'o', 'ca', 'do'],
    hippopotamus: ['hip', 'po', 'pot', 'a', 'mus'],
    communication: ['com', 'mu', 'ni', 'ca', 'tion'],
    electricity: ['e', 'lec', 'tric', 'i', 'ty'],
    imagination: ['i', 'mag', 'i', 'na', 'tion'],
    responsibility: ['re', 'spon', 'si', 'bil', 'i', 'ty'],
  };
  const syllableCountWords = () => [...syllableWords(), ...Object.keys(SYLLABLE_RECORDING_HINTS)];
  const isSyllableLanguageSupported = language => !String(language || '').trim() || /^(?:en(?:[-_][a-z0-9]+)*|english(?:\s*\([^)]*\))?)$/i.test(String(language).trim());
  const syllableLanguageKey = language => isSyllableLanguageSupported(language) ? 'en' : normalize(language).replace(/_/g, '-');
  const validSyllableCount = count => Number.isInteger(count) && count >= 1 && count <= 12;
  const syllableCountLanguageKey = language => packAudioLanguageKey(language || 'en');
  const syllableFingerprint = value => {
    let a = 2166136261, b = 5381;
    for (let i = 0; i < value.length; i++) { a = Math.imul(a ^ value.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ value.charCodeAt(i); }
    return value.length + ':' + (a >>> 0).toString(16) + '-' + (b >>> 0).toString(16);
  };
  const countAssetFingerprints = new WeakMap();
  let lastCountAudioSource = null, lastCountSourceFingerprint = null;
  const countAudioSignature = context => JSON.stringify([context.language, context.fingerprint, context.fingerprint ? '' : context.voice]);
  const createSyllableCountAudioContext = (input = {}) => {
    const asset = input.asset;
    let fingerprint = null;
    if (asset && typeof asset === 'object' && typeof asset.mime === 'string' && /^audio\//i.test(asset.mime) && typeof asset.base64 === 'string' && asset.base64) {
      const cached = countAssetFingerprints.get(asset);
      if (cached && cached.mime === asset.mime && cached.base64 === asset.base64) fingerprint = cached.fingerprint;
      else {
        fingerprint = syllableFingerprint(asset.mime.toLowerCase() + ';' + asset.base64.replace(/\s/g, ''));
        countAssetFingerprints.set(asset, { mime: asset.mime, base64: asset.base64, fingerprint });
      }
    } else if (typeof input.audioSource === 'string') {
      if (input.audioSource === lastCountAudioSource) fingerprint = lastCountSourceFingerprint;
      else {
        const match = input.audioSource.match(/^data:(audio\/[^;,]+);base64,([\s\S]+)$/i);
        fingerprint = match ? syllableFingerprint(match[1].toLowerCase() + ';' + match[2].replace(/\s/g, '')) : null;
        lastCountAudioSource = input.audioSource;
        lastCountSourceFingerprint = fingerprint;
      }
    }
    const provenance = asset?.provenance;
    const voice = String(fingerprint ? (provenance?.resolvedVoice || provenance?.voice || '') : (input.voice || provenance?.resolvedVoice || provenance?.voice || '')).trim();
    const context = { version: 1, language: syllableCountLanguageKey(input.language), fingerprint, voice };
    return Object.freeze({ ...context, signature: countAudioSignature(context) });
  };
  const validCountAudioContext = context => !!context && context.version === 1 &&
    typeof context.language === 'string' && context.language === syllableCountLanguageKey(context.language) &&
    (context.fingerprint === null || typeof context.fingerprint === 'string' && /^\d+:[a-f0-9]+-[a-f0-9]+$/.test(context.fingerprint)) &&
    typeof context.voice === 'string' && context.voice.length <= 512 && context.signature === countAudioSignature(context);
  const countSignature = data => data.version === 1
    ? JSON.stringify([data.targetWord, data.language, data.revision, data.count])
    : JSON.stringify([data.targetWord, data.language, data.revision, data.count, data.source, data.recordingSignature || null, data.audioContext?.signature || null]);
  const makeReviewedSyllableCount = (input, source = 'teacher_review', recordingSignature = null) => {
    const targetWord = normalize(input?.targetWord), language = syllableCountLanguageKey(input?.language);
    if (!targetWord || targetWord.length > 80 || input?.reviewed !== true || !validSyllableCount(input.count) ||
      !Number.isSafeInteger(input.revision) || input.revision < 1 ||
      input.audioContext != null && (!validCountAudioContext(input.audioContext) || input.audioContext.language !== language)) return null;
    const result = { version: 2, targetWord, language, supported: true, count: input.count, counts: [input.count],
      answer: input.count, status: 'reviewed', source, syllables: [], stressPatterns: [], revision: input.revision,
      audioContext: input.audioContext ? { ...input.audioContext } : null };
    if (source === 'teacher_review' && result.audioContext?.fingerprint === null) result.deliveryMode = 'teacher_spoken';
    if (recordingSignature) result.recordingSignature = recordingSignature;
    return { ...result, review: { confirmed: true, signature: countSignature(result) } };
  };
  const createReviewedSyllableCount = input => makeReviewedSyllableCount(input);
  const countEvidenceSignature = data => JSON.stringify([data.targetWord, data.language, data.counts, data.stressPatterns, data.source]);
  const resolveSyllableCount = (word, input = {}) => {
    const targetWord = normalize(word), language = syllableCountLanguageKey(input.language);
    const base = { version: 1, targetWord, language, supported: false, count: null, counts: [],
      status: 'needs_review', source: 'unverified', syllables: [], stressPatterns: [] };
    if (!targetWord) return { ...base, reason: 'missing_word' };
    // Keep the original approval inside unresolved boards. Otherwise saving a
    // stale result would discard the evidence and allow a dictionary fallback.
    const prepared = input.prepared?.reviewedEvidence || input.prepared;
    const reviewCandidate = prepared?.status === 'reviewed' && ['teacher_review', 'teacher_recording'].includes(prepared.source) &&
      prepared.targetWord === targetWord && prepared.language === language;
    const validReview = [1, 2].includes(prepared?.version) && reviewCandidate &&
      prepared.targetWord === targetWord && prepared.language === language && prepared.review?.confirmed === true &&
      Number.isSafeInteger(prepared.revision) && prepared.revision > 0 && validSyllableCount(prepared.count) &&
      (prepared.version === 1 || prepared.audioContext == null || validCountAudioContext(prepared.audioContext) && prepared.audioContext.language === language) &&
      prepared.review.signature === countSignature(prepared);
    const needsCountReview = (reason, extra = {}) => ({ ...base, counts: validSyllableCount(prepared?.count) ? [prepared.count] : [],
      reason, reviewedEvidence: prepared, ...extra });
    if (reviewCandidate && !validReview) return needsCountReview('count_review_invalid');
    if (validReview && prepared.source === 'teacher_review' && input.audioContext === undefined && input.prepared?.reviewedEvidence &&
      ['count_audio_changed', 'count_audio_review_required'].includes(input.prepared.reason)) return needsCountReview(input.prepared.reason);
    if (validReview && prepared.source === 'teacher_review' && input.audioContext !== undefined) {
      if (!validCountAudioContext(input.audioContext) || input.audioContext.language !== language || !prepared.audioContext) return needsCountReview('count_audio_review_required');
      // A teacher's spoken delivery does not use the selected synthetic voice.
      // Any actual clip still changes the evidence and requires fresh review.
      const teacherSpoken = prepared.source === 'teacher_review' && prepared.audioContext.fingerprint === null && input.audioContext.fingerprint === null;
      if (!teacherSpoken && prepared.audioContext.signature !== input.audioContext.signature) return needsCountReview('count_audio_changed');
    }
    const recorded = resolveSyllableTask(targetWord, input.recordedTask, input.language);
    if (validReview && prepared.source === 'teacher_review') {
      if (input.prepared?.reason === 'count_recording_conflict' && !recorded.supported) return needsCountReview('count_recording_conflict', {
        counts: input.prepared.counts, reviewedCount: prepared.count, recordedCount: input.prepared.recordedCount });
      if (recorded.supported && prepared.count !== recorded.syllables.length) return needsCountReview('count_recording_conflict', {
        counts: [...new Set([prepared.count, recorded.syllables.length])].sort((a, b) => a - b),
        reviewedCount: prepared.count, recordedCount: recorded.syllables.length });
      return { ...makeReviewedSyllableCount({ ...prepared, reviewed: true }) };
    }
    if (recorded.contentStatus === 'teacher_recorded' && recorded.supported) {
      // Listening to separate syllables does not establish the pronunciation
      // of the whole word used for counting. Keep their count as a suggestion
      // until the teacher explicitly reviews that clip or spoken delivery.
      return { ...base, source: 'teacher_recording', reason: 'count_recording_review_required',
        counts: [recorded.syllables.length], recordedCount: recorded.syllables.length, syllables: [...recorded.syllables] };
    }
    // Older packs automatically signed counts derived from separate recordings,
    // even when the whole-word clip had never been heard. Those signatures are
    // not count approvals, including in counting-only packs that omit the clips.
    if (validReview && prepared.source === 'teacher_recording') {
      return needsCountReview('count_recording_review_required', { source: 'teacher_recording', recordedCount: prepared.count });
    }
    if (prepared?.targetWord === targetWord && prepared.language === language && prepared.source === 'teacher_recording' &&
      prepared.status === 'needs_review' && prepared.reason === 'count_recording_review_required' && validSyllableCount(prepared.recordedCount)) {
      return { ...base, source: 'teacher_recording', reason: 'count_recording_review_required',
        counts: [prepared.recordedCount], recordedCount: prepared.recordedCount };
    }
    if (!isSyllableLanguageSupported(input.language)) return { ...base, reason: 'unsupported_language' };
    if (recorded.supported) {
      const result = { ...base, supported: true, count: recorded.syllables.length, counts: [recorded.syllables.length],
        status: 'curated', source: 'compound_bank', syllables: [...recorded.syllables] };
      return { ...result, evidenceSignature: countEvidenceSignature(result) };
    }
    const data = pronunciationData();
    const stressPatterns = [...new Set((data?.lookup?.(targetWord) || []).filter(value =>
      typeof value === 'string' && /^[012]{1,12}$/.test(value)))];
    if (stressPatterns.length) {
      const counts = [...new Set(stressPatterns.map(value => value.length))].sort((a, b) => a - b);
      const supported = counts.length === 1;
      const result = { ...base, supported, count: supported ? counts[0] : null, counts, stressPatterns,
        status: supported ? 'dictionary' : 'needs_review', source: 'cmudict', dialect: 'en-US',
        reason: supported ? undefined : 'pronunciation_variant' };
      return { ...result, evidenceSignature: countEvidenceSignature(result) };
    }
    // A saved dictionary-backed board works offline without shipping the entire
    // dictionary. Legacy AI/spelling estimates lack this evidence and need review.
    if (prepared?.version === 1 && prepared.targetWord === targetWord && prepared.language === language &&
      prepared.status === 'dictionary' && prepared.source === 'cmudict' && prepared.supported === true &&
      validSyllableCount(prepared.count) && Array.isArray(prepared.counts) && prepared.counts.length === 1 &&
      prepared.counts[0] === prepared.count && Array.isArray(prepared.stressPatterns) && prepared.stressPatterns.length &&
      prepared.stressPatterns.every(value => typeof value === 'string' && /^[012]{1,12}$/.test(value) && value.length === prepared.count) &&
      prepared.evidenceSignature === countEvidenceSignature(prepared)) return { ...base, ...prepared, syllables: [] };
    const suggested = prepared?.count ?? prepared?.answer;
    return { ...base, counts: validSyllableCount(suggested) ? [suggested] : [],
      reason: data ? 'unknown_word' : 'dictionary_unavailable' };
  };
  const isTeacherSpokenSyllableCount = (word, input = {}) => {
    const resolved = resolveSyllableCount(word, input);
    return resolved.supported === true && resolved.source === 'teacher_review' && resolved.audioContext?.fingerprint === null;
  };
  const syllableRecordingTemplate = (word, language) => {
    const targetWord = normalize(word);
    const count = resolveSyllableCount(targetWord, { language });
    const hints = isSyllableLanguageSupported(language) && Object.prototype.hasOwnProperty.call(SYLLABLE_RECORDING_HINTS, targetWord) && SYLLABLE_RECORDING_HINTS[targetWord];
    return { targetWord, reviewRequired: true, syllables: hints ? [...hints] : [],
      count: count.count || hints?.length || null, stressPatterns: count.stressPatterns,
      source: hints ? 'recording_hints' : count.source };
  };
  const syllableAssetSource = asset => {
    if (!asset || !/^audio\/(?:wav|x-wav|wave|mpeg|mp3|ogg|webm|mp4|x-m4a|aac)$/i.test(asset.mime || '') ||
        typeof asset.base64 !== 'string' || asset.base64.length < 16 || asset.base64.length > 512000 ||
        asset.base64.length % 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(asset.base64)) return null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const encoded = asset.base64;
    if (encoded.endsWith('==') && (alphabet.indexOf(encoded[encoded.length - 3]) & 15) || encoded.endsWith('=') && !encoded.endsWith('==') && (alphabet.indexOf(encoded[encoded.length - 2]) & 3)) return null;
    const byteCount = encoded.length / 4 * 3 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
    const byteAt = index => { const offset = Math.floor(index / 3) * 4, shift = index % 3;
      const value = (alphabet.indexOf(encoded[offset]) << 18) | (alphabet.indexOf(encoded[offset + 1]) << 12) | (Math.max(0, alphabet.indexOf(encoded[offset + 2])) << 6) | Math.max(0, alphabet.indexOf(encoded[offset + 3]));
      return value >>> ((2 - shift) * 8) & 255; };
    const header = (start, length) => Array.from({ length }, (_, index) => String.fromCharCode(byteAt(start + index))).join('');
    const mime = asset.mime.toLowerCase();
    const valid = /wav|wave/.test(mime) ? byteCount > 44 && header(0, 4) === 'RIFF' && header(8, 4) === 'WAVE'
      : /mpeg|mp3/.test(mime) ? byteCount > 10 && (header(0, 3) === 'ID3' && byteAt(3) >= 2 && byteAt(3) <= 4 || byteAt(0) === 255 && (byteAt(1) & 224) === 224 && (byteAt(1) & 6) !== 0)
      : mime === 'audio/aac' ? byteCount > 7 && byteAt(0) === 255 && (byteAt(1) & 246) === 240
      : mime === 'audio/ogg' ? byteCount > 27 && header(0, 4) === 'OggS' && byteAt(4) === 0
      : mime === 'audio/webm' ? byteCount > 8 && byteAt(0) === 26 && byteAt(1) === 69 && byteAt(2) === 223 && byteAt(3) === 163
      : byteCount > 12 && header(4, 4) === 'ftyp';
    if (!valid) return null;
    return 'data:' + mime + ';base64,' + asset.base64;
  };
  // This checksum binds teacher review to these exact clips and their order;
  // it is an edit/staleness guard, not a claim of independent linguistic review.
  const syllableReviewSignature = task => {
    const evidence = [task.targetWord, task.language, task.revision, task.syllables,
      (task.audioUnits || []).map(unit => [unit.key, unit.text, unit.asset?.mime, unit.asset?.base64, unit.asset?.durationSeconds])];
    if (task.version === 3) evidence.unshift(3);
    const value = JSON.stringify(evidence);
    let a = 2166136261, b = 5381;
    for (let i = 0; i < value.length; i++) { a = Math.imul(a ^ value.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ value.charCodeAt(i); }
    return (a >>> 0).toString(16) + '-' + (b >>> 0).toString(16);
  };
  const reviewedSyllableReady = task => {
    if (!task || ![2, 3].includes(task.version) || task.supported !== true || task.contentStatus !== 'teacher_recorded' ||
        !task.targetWord || task.targetWord !== normalize(task.targetWord) || task.targetWord.length > 80 ||
        typeof task.language !== 'string' || !task.language || task.language !== (task.version === 2 ? syllableLanguageKey(task.language) : packAudioLanguageKey(task.language)) ||
        !Number.isSafeInteger(task.revision) || task.revision < 1 || !Array.isArray(task.syllables) ||
        task.syllables.length < 2 || task.syllables.length > 8 || !Array.isArray(task.audioUnits) ||
        task.audioUnits.length !== task.syllables.length || task.review?.confirmed !== true) return false;
    if (!task.syllables.every((part, index) => {
      const unit = task.audioUnits[index];
      return typeof part === 'string' && part === part.trim() && part.length > 0 && part.length <= 40 &&
        unit?.key === 'syllable:' + task.targetWord + ':' + task.revision + ':' + index && unit.text === part &&
        unit.asset?.source === 'teacher_recording' && unit.asset?.decoded === true &&
        Number.isFinite(unit.asset.durationSeconds) && unit.asset.durationSeconds >= 0.08 && unit.asset.durationSeconds <= 8 &&
        !!syllableAssetSource(unit.asset);
    })) return false;
    return task.review.signature === syllableReviewSignature(task);
  };
  const createReviewedSyllableTask = input => {
    if (input?.reviewed !== true || !Array.isArray(input.syllables) || !Array.isArray(input.assets)) return null;
    const task = { version: 3, supported: true, contentStatus: 'teacher_recorded',
      targetWord: normalize(input.targetWord), language: packAudioLanguageKey(input.language || 'en'),
      revision: input.revision, syllables: input.syllables.map(part => String(part).trim()) };
    task.audioUnits = task.syllables.map((text, index) => ({ key: 'syllable:' + task.targetWord + ':' + task.revision + ':' + index,
      text, asset: input.assets[index] && { ...input.assets[index] } }));
    task.review = { confirmed: true, signature: syllableReviewSignature(task) };
    return reviewedSyllableReady(task) ? task : null;
  };
  const recoverSyllableRecordingDraft = (word, task) => {
    if (!reviewedSyllableReady(task) || task.targetWord !== normalize(word)) return null;
    return { version: task.version, targetWord: task.targetWord, language: task.language, revision: task.revision,
      supported: false, contentStatus: 'syllable_recording_draft', reviewRequired: true,
      syllables: [...task.syllables], audioUnits: task.audioUnits.map(unit => ({ ...unit, asset: { ...unit.asset } })) };
  };
  const resolveSyllableTask = (word, prepared, language) => {
    const targetWord = normalize(word);
    const needsRecording = () => ({ version: 1, supported: false, contentStatus: 'syllable_audio_required', targetWord,
      syllables: [], audioUnits: [], reason: 'Use a syllable bank word or add and review recordings for each syllable in Word Sounds Studio.' });
    if (prepared?.contentStatus === 'teacher_recorded') {
      if (reviewedSyllableReady(prepared) && prepared.targetWord === targetWord && prepared.version === 2 && prepared.language === 'en') {
        return { ...needsRecording(), reason: 'recording_locale_review_required', recoverable: true };
      }
      if (reviewedSyllableReady(prepared) && prepared.targetWord === targetWord && packAudioLanguageKey(prepared.language) === packAudioLanguageKey(language || 'en')) {
        return { ...prepared, syllables: [...prepared.syllables], audioUnits: prepared.audioUnits.map(unit => ({ ...unit, asset: { ...unit.asset } })) };
      }
      return { ...needsRecording(), ...(reviewedSyllableReady(prepared) && prepared.targetWord === targetWord ? { reason: 'recording_locale_review_required', recoverable: true } : {}) };
    }
    const parts = isSyllableLanguageSupported(language) && Object.prototype.hasOwnProperty.call(SYLLABLE_COMPOUNDS, targetWord) && SYLLABLE_COMPOUNDS[targetWord];
    if (!parts) return needsRecording();
    return { version: 1, supported: true, contentStatus: 'curated_compound', targetWord,
      syllables: [...parts], audioUnits: parts.map(text => ({ key: text, text })) };
  };
  const syllableReady = task => {
    if (task?.contentStatus === 'teacher_recorded') return reviewedSyllableReady(task) && !(task.version === 2 && task.language === 'en');
    if (!task || task.supported !== true || task.version !== 1 || task.contentStatus !== 'curated_compound') return false;
    const expected = resolveSyllableTask(task.targetWord, null, 'en');
    return expected.supported && Array.isArray(task.syllables) && Array.isArray(task.audioUnits) &&
      task.syllables.length === expected.syllables.length && task.audioUnits.length === expected.audioUnits.length &&
      expected.syllables.every((part, i) => task.syllables[i] === part && task.audioUnits[i]?.key === part && task.audioUnits[i]?.text === part);
  };
  const validSyllableBoard = board => syllableReady(board) && Array.isArray(board.options) &&
    board.options.length >= 2 && board.options.length <= 6 &&
    board.options.every(value => typeof value === 'string' && value && value === normalize(value)) &&
    new Set(board.options).size === board.options.length && board.options.includes(board.targetWord);
  const CURATED_MANIPULATIONS = {
    cat: { type: "deletion", instruction: "Say 'cat'. Now say it again, but leave out the /k/ sound.", targetPhoneme: "k", answer: "at", distractors: ["it", "on", "up", "an", "in"] },
    hat: { type: "substitution", instruction: "Say 'hat'. Now change the /t/ sound to /m/.", targetPhoneme: "t", answer: "ham", distractors: ["had", "hen", "jam", "ram", "map"] },
    dog: { type: "substitution", instruction: "Say 'dog'. Now change the /g/ sound to /t/.", targetPhoneme: "g", answer: "dot", distractors: ["dock", "dab", "dig", "den", "dim"] },
    stop: { type: "deletion", instruction: "Say 'stop'. Now say it again, but leave out the /s/ sound.", targetPhoneme: "s", answer: "top", distractors: ["hop", "mop", "pop", "cop", "shop"] },
    clap: { type: "substitution", instruction: "Say 'clap'. Now change the /a/ sound to /i/.", targetPhoneme: "a", answer: "clip", distractors: ["club", "clay", "clam", "crab", "grip"] },
    train: { type: "deletion", instruction: "Say 'train'. Now say it again, but leave out the /t/ sound.", targetPhoneme: "t", answer: "rain", distractors: ["main", "gain", "pain", "chain", "brain"] },
    plane: { type: "deletion", instruction: "Say 'plane'. Now say it again, but leave out the /p/ sound.", targetPhoneme: "p", answer: "lane", distractors: ["cane", "bane", "mane", "vane", "crane"] },
    smile: { type: "deletion", instruction: "Say 'smile'. Now say it again, but leave out the /s/ sound.", targetPhoneme: "s", answer: "mile", distractors: ["file", "pile", "tile", "mild", "wild"] },
    black: { type: "deletion", instruction: "Say 'black'. Now say it again, but leave out the /b/ sound.", targetPhoneme: "b", answer: "lack", distractors: ["back", "hack", "pack", "rack", "sack"] },
    flat: { type: "substitution", instruction: "Say 'flat'. Now change the /t/ sound to /g/.", targetPhoneme: "t", answer: "flag", distractors: ["flap", "flask", "flame", "flop", "flip"] },
  };

  // Curated examples are local content, not automatic phoneme validation.
  const resolveManipulationTask = (word, supplied, language) => {
    const target = normalize(word);
    const english = !language || /^en(?:[-_]|$)/i.test(String(language));
    const curated = english && Object.prototype.hasOwnProperty.call(CURATED_MANIPULATIONS, target) && CURATED_MANIPULATIONS[target];
    const matching = !supplied || (curated &&
      ['type', 'instruction', 'targetPhoneme', 'answer'].every(key => supplied[key] === curated[key]) &&
      Array.isArray(supplied.distractors) && supplied.distractors.length >= 2 &&
      supplied.distractors.every(value => curated.distractors.includes(value)) &&
      new Set(supplied.distractors).size === supplied.distractors.length);
    if (curated && matching) return {...curated, distractors: [...curated.distractors], contentStatus: 'curated', targetWord: target};
    return {type: 'review', contentStatus: 'teacher_review_required', targetWord: target,
      instruction: 'Sound Swap is unavailable for this word until a teacher verifies a one-sound change. Choose another activity.',
      answer: '', distractors: []};
  };
  const manipulationReady = task => !!task && task.contentStatus === 'curated' &&
    resolveManipulationTask(task.targetWord, task, 'en').contentStatus === 'curated';
  // Portable clip provenance is recorded at resolution time, never inferred
  // from the voice currently selected in Studio.
  const packAudioKey = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  // Saved lesson buckets share one precedence rule with playback: the last
  // supplied clip wins. Normalize keys without changing the clip or provenance.
  const packAudioAssets = (words, fallbackAssets = {}) => {
    const assets = Object.create(null);
    const add = bucket => {
      if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return;
      Object.entries(bucket).forEach(([value, asset]) => {
        const key = packAudioKey(value);
        if (key && asset) assets[key] = asset;
      });
    };
    add(fallbackAssets);
    (Array.isArray(words) ? words : []).forEach(item => add(item && item._ttsAssets));
    return assets;
  };
  const portablePackAsset = asset => {
    const mime = typeof asset?.mime === 'string' ? asset.mime.trim().toLowerCase() : '';
    const data = typeof asset?.base64 === 'string' ? asset.base64.replace(/\s+/g, '') : '';
    if (!/^audio\/(?:mpeg|mp3|wav|x-wav|wave|ogg|webm|mp4|x-m4a|aac|flac)$/.test(mime) || !data || data.length > 512 * 1024 || data.length % 4 !== 0 || !/^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?$/i.test(data)) return false;
    let bytes;
    try {
      if (typeof atob === 'function') { bytes = atob(data); if (typeof btoa === 'function' && btoa(bytes) !== data) return false; }
      else if (typeof Buffer !== 'undefined') { const buffer = Buffer.from(data, 'base64'); if (buffer.toString('base64') !== data) return false; bytes = buffer.toString('binary'); }
      else return false;
    } catch (_) { return false; }
    const at = index => bytes.charCodeAt(index);
    if (/wav|wave/.test(mime)) return bytes.length > 44 && bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WAVE';
    if (/mpeg|mp3/.test(mime)) return bytes.length > 10 && ((bytes.slice(0, 3) === 'ID3' && at(3) >= 2 && at(3) <= 4) || (at(0) === 255 && (at(1) & 224) === 224 && (at(1) & 6) !== 0));
    if (mime === 'audio/aac') return bytes.length > 7 && at(0) === 255 && (at(1) & 246) === 240;
    if (/ogg/.test(mime)) return bytes.length > 27 && bytes.slice(0, 4) === 'OggS' && at(4) === 0;
    if (/webm/.test(mime)) return bytes.length > 8 && at(0) === 26 && at(1) === 69 && at(2) === 223 && at(3) === 163;
    if (/flac/.test(mime)) return bytes.length > 8 && bytes.slice(0, 4) === 'fLaC';
    return bytes.length > 12 && bytes.slice(4, 8) === 'ftyp';
  };

  const packAudioProvenance = (profile, source) => {
    const value = { version: 1, source: source || 'unknown' };
    ['provider', 'engine', 'resolvedVoice', 'voice', 'language', 'model'].forEach(key => {
      if (profile && typeof profile[key] === 'string' && profile[key]) value[key] = profile[key];
    });
    return value;
  };
  // Share the app's friendly-language aliases, but keep explicit locales and
  // pronunciation dialects distinct. Missing metadata never implies English.
  const PACK_LANGUAGE_ALIASES = {"english":"en-US","spanish":"es-ES","spanish (latin america)":"es-419","spanish (castilian)":"es-ES","french":"fr-FR","french (canadian)":"fr-CA","german":"de-DE","portuguese":"pt-BR","portuguese (brazil)":"pt-BR","portuguese (angola)":"pt-AO","portuguese (portugal)":"pt-PT","mandarin":"zh-CN","chinese":"zh-CN","chinese (mandarin)":"zh-CN","chinese (simplified)":"zh-CN","chinese (traditional)":"zh-TW","arabic":"ar-SA","vietnamese":"vi-VN","russian":"ru-RU","japanese":"ja-JP","italian":"it-IT","korean":"ko-KR","hindi":"hi-IN","dutch":"nl-NL","polish":"pl-PL","indonesian":"id-ID","turkish":"tr-TR","hebrew":"he-IL","swedish":"sv-SE","danish":"da-DK","norwegian":"no-NO","finnish":"fi-FI","greek":"el-GR","thai":"th-TH","czech":"cs-CZ","hungarian":"hu-HU","romanian":"ro-RO","ukrainian":"uk-UA","cantonese":"zh-HK","tagalog":"fil-PH","filipino":"fil-PH","bengali":"bn-IN","urdu":"ur-PK","malay":"ms-MY","swahili":"sw-KE","bulgarian":"bg-BG","croatian":"hr-HR","serbian":"sr-RS","slovak":"sk-SK","persian":"fa-IR","farsi":"fa-IR","tamil":"ta-IN","amharic":"am-ET","afrikaans":"af-ZA","kurdish":"ku-TR","somali":"so-SO","haitian creole":"ht-HT","haitian":"ht-HT","khmer":"km-KH","cambodian":"km-KH","lao":"lo-LA","burmese":"my-MM","myanmar":"my-MM","nepali":"ne-NP","marathi":"mr-IN","gujarati":"gu-IN","punjabi":"pa-IN","telugu":"te-IN","kannada":"kn-IN","malayalam":"ml-IN","sinhala":"si-LK","yoruba":"yo-NG","igbo":"ig-NG","hausa":"ha-NG","kinyarwanda":"rw-RW","kirundi":"rn-BI","lingala":"ln-CD","tigrinya":"ti-ET","oromo":"om-ET","mongolian":"mn-MN","hmong":"hmn","esperanto":"eo","latin":"la","pashto":"ps-AF","pushto":"ps-AF","dari":"prs-AF","georgian":"ka-GE","armenian":"hy-AM","albanian":"sq-AL","macedonian":"mk-MK","acholi":"ach-UG","karen":"kar-MM","chin (hakha)":"cnh-MM","chin (falam)":"cfm-MM","maay maay":"ymm-SO","marshallese":"mh-MH"};
  const PACK_LANGUAGE_DEFAULTS = Object.create(null);
  Object.values(PACK_LANGUAGE_ALIASES).forEach(value => { const key = value.split('-')[0]; if (!PACK_LANGUAGE_DEFAULTS[key]) PACK_LANGUAGE_DEFAULTS[key] = value.toLowerCase(); });
  const packAudioLanguageKey = value => {
    if (typeof value !== 'string') return '';
    const raw = value.trim().replace(/_/g, '-').replace(/\s+/g, ' ').toLowerCase();
    if (!raw || raw.length > 256 || /[\u0000-\u001f\u007f]/.test(raw)) return '';
    const parts = raw.split('\u241f');
    if (parts.length > 3) return '';
    let base = parts[0].trim(), locale = (parts[1] || '').trim(), dialect = (parts[2] || '').trim();
    const parenthetical = base.match(/^(.+?)\s*\(([^()]*)\)\s*$/);
    if (parenthetical) { base = parenthetical[1].trim(); dialect = dialect || parenthetical[2].trim(); }
    const tag = input => {
      if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(input)) return '';
      try { if (typeof Intl !== 'undefined' && Intl.getCanonicalLocales) input = Intl.getCanonicalLocales(input)[0].toLowerCase(); } catch (_) { return ''; }
      return PACK_LANGUAGE_DEFAULTS[input] || input;
    };
    const alias = input => Object.prototype.hasOwnProperty.call(PACK_LANGUAGE_ALIASES, input) ? tag(PACK_LANGUAGE_ALIASES[input].toLowerCase()) : '';
    // Stored keys use "canonical locale ␟ dialect"; input profiles can use
    // "language name ␟ locale ␟ dialect". Preserve stored keys when a reviewed
    // recording/count is serialized and validated again, including dialect
    // names that happen to resemble a language tag (for example "uk").
    const namedKey = base.startsWith('name:') ? (base.slice(5).trim() ? base : '') : null;
    if (namedKey === '') return '';
    if (parts.length === 2 && (namedKey || tag(base) === base)) { dialect = locale; locale = ''; }
    const dialectLocale = dialect ? alias(base + ' (' + dialect + ')') : '';
    const baseKey = namedKey || alias(base) || tag(base) || (base ? 'name:' + base : '');
    if (!baseKey) return '';
    if (locale && !tag(locale)) return '';
    const key = locale ? tag(locale) : dialectLocale || baseKey;
    return dialect && dialectLocale !== key ? key + '\u241f' + dialect : key;
  };
  const packAudioProfileStatus = (asset, selectedVoice, language) => {
    const present = portablePackAsset(asset), p = asset && asset.provenance || {};
    const actualVoice = p.resolvedVoice || '';
    const known = !!p.provider && !!actualVoice;
    const actualLanguage = typeof p.language === 'string' ? p.language.trim() : '';
    const actualLanguageKey = packAudioLanguageKey(actualLanguage), selectedLanguageKey = packAudioLanguageKey(language);
    const voiceMismatch = present && !!actualVoice && !!selectedVoice && actualVoice !== selectedVoice;
    const languageMismatch = present && !!actualLanguageKey && !!selectedLanguageKey && actualLanguageKey !== selectedLanguageKey;
    const unknownVoice = present && !known, unknownLanguage = present && !actualLanguageKey;
    const voiceLabel = known ? [p.provider, actualVoice, p.source === 'recorded_bank' ? 'recording bank' : p.source === 'synthesized' ? 'generated speech' : p.source].filter(Boolean).join(' · ') : 'Saved audio · voice/source unknown';
    const languageLabel = actualLanguageKey ? 'Language: ' + actualLanguage.split('\u241f').filter(Boolean).join(' · ') : 'language unknown';
    return { present, provenance: p, actualVoice, actualLanguage, voiceMismatch, languageMismatch, unknownVoice, unknownLanguage,
      mismatch: voiceMismatch || languageMismatch, unknown: unknownVoice || unknownLanguage,
      compatible: present && !!selectedVoice && !!selectedLanguageKey && !voiceMismatch && !languageMismatch && !unknownVoice && !unknownLanguage,
      label: !present ? 'Missing embedded clip' : [voiceLabel, languageLabel, voiceMismatch ? 'different voice' : '', languageMismatch ? 'different language' : ''].filter(Boolean).join(' · ') };
  };
  const packAudioInventory = (words, selectedVoice, language, canonicalEntries = [], activities) => {
    const assets = packAudioAssets(words), required = new Map(), recordings = [], fragmentKeys = new Set();
    const list = value => Array.isArray(value) ? value : [];
    const add = value => { const key = packAudioKey(value); if (key && !/^syllable:/.test(key) && !required.has(key)) required.set(key, String(value).trim()); };
    const spokenKeys = new Set(list(words).filter(item => {
      if (!item) return false;
      const selected = list(activities).length ? activities : list(item._preparedActivities).length ? item._preparedActivities : Object.keys(item.activityItems || {});
      const word = item.targetWord || item.word || item.term, key = packAudioKey(word);
      return selected.length > 0 && selected.every(id => id === 'syllable_counting') && isTeacherSpokenSyllableCount(word, {
        language: language || item.activityItems?.syllable_counting?.language,
        prepared: item.activityItems?.syllable_counting, recordedTask: item.activityItems?.syllable_blending,
        audioContext: createSyllableCountAudioContext({ asset: assets[key], audioSource: typeof assets[key] === 'string' ? assets[key] : undefined,
          language: language || item.activityItems?.syllable_counting?.language, voice: selectedVoice }),
      });
    }).map(item => packAudioKey(item.targetWord || item.word || item.term)));
    list(words).forEach(item => {
      if (!item) return;
      const syllableBoard = item.activityItems && item.activityItems.syllable_blending;
      const legacyParts = new Set([...list(item.syllables), ...list(syllableBoard && syllableBoard.syllables), ...list(syllableBoard && syllableBoard.audioUnits).map(unit => unit && unit.text)].map(packAudioKey));
      legacyParts.forEach(key => fragmentKeys.add(key));
      list(item._ttsRequiredKeys).filter(value => !legacyParts.has(packAudioKey(value)) && !spokenKeys.has(packAudioKey(value))).forEach(add);
      if (!spokenKeys.has(packAudioKey(item.targetWord || item.word || item.term))) add(item.targetWord || item.word || item.term);
      add('as in');
      const boards = item.activityItems || {};
      Object.entries(boards).forEach(([id, board]) => {
        if (!board) return;
        if (id !== 'isolation' && id !== 'syllable_counting') {
          list(board.options).forEach(add);
          list(board.distractors).forEach(add);
        }
        if (id === 'syllable_blending') {
          list(board.audioUnits).forEach((unit, index) => {
            if (!unit) return;
            if (board.contentStatus === 'teacher_recorded') recordings.push({ key: unit.key, text: (item.targetWord || item.word || item.term) + ' · syllable ' + (index + 1), asset: unit.asset, present: portablePackAsset(unit.asset), label: syllableReady(board) && (!language || resolveSyllableTask(item.targetWord || item.word || item.term, board, language).supported) ? 'Teacher-reviewed recording' : 'Syllable recording · needs review', mismatch: false, unknown: false, regeneratable: false });
            else if (!unit.asset && syllableReady(board)) add(unit.text);
          });
          add('Listen to the syllables and blend them together');
        }
        if (id === 'decoding') list(board.choices).forEach(add);
        if (id === 'blending') add('Which word did you hear?');
        if (id === 'rhyming') add('Which word rhymes with');
        if (id === 'sound_sort') { add('Find words that start with the sound'); add('Find words that end with the sound'); }
        if (id === 'word_families' && board.rime) add(wordFamilyInstruction(board.rime));
        if (id === 'syllable_counting') add('How many syllables do you hear? Clap for each one');
        if (id === 'read_sentence') { add(board.sentence); add('Read the sentence. Which word finishes it?'); }
        if (id === 'read_passage') {
          add(board.story); String(board.story || '').split(/(?<=[.!?])\s+/).forEach(add);
          add('Read the story. Which word finishes it?');
        }
        if (id === 'sentence_match') { add(board.sentence); add('Read the sentence. Match the pictures to it.'); list(board.sequence).forEach(add); list(board.extras).forEach(add); }
        if (id === 'isolation') {
          const ordinals = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
          list(item.phonemes).forEach((_, index) => {
            add('What is the ' + (ordinals[index] || ((index + 1) + 'th')) + ' sound in ' + (item.targetWord || item.word || item.term) + '?');
            add('What is the ' + (index + 1) + (index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th') + ' sound?');
          });
        }
        if (id === 'manipulation' && board.task) String(board.task.instruction || '').split(/(\/[^\s/]{1,4}\/)/g).map(s => s.trim()).filter(s => s && /[a-z0-9]/i.test(s) && !/^\/[^/]+\/$/.test(s)).forEach(add);
      });
    });
    list(canonicalEntries).forEach(entry => { if (entry && entry.category === 'speech' && (!fragmentKeys.has(packAudioKey(entry.key)) || required.has(packAudioKey(entry.key)))) add(entry.label || entry.key); });
    const speechKeys = new Set(required.keys());
    Object.keys(assets).forEach(add);
    return [...required].map(([key, text]) => {
      const asset = assets[key];
      return { key, text, asset, ...packAudioProfileStatus(asset, selectedVoice, language), regeneratable: !fragmentKeys.has(key) || speechKeys.has(key) };
    }).concat(recordings);
  };
  // Automatic count previews must use the selected pronunciation. An explicit
  // teacher approval is bound to the exact clip, so keep that evidence even
  // when the selected synthetic voice has since changed.
  const selectSyllableCountAudio = (input = {}) => {
    const language = input.language || 'en', voice = input.voice || 'af_heart';
    const asAsset = value => {
      if (value && typeof value === 'object') return value;
      const match = typeof value === 'string' && value.match(/^data:(audio\/[^;,]+);base64,([\s\S]+)$/i);
      return match ? { mime: match[1], base64: match[2] } : null;
    };
    const saved = asAsset(input.savedAsset);
    const savedProfile = packAudioProfileStatus(saved, voice, language);
    if (savedProfile.present) {
      const audioContext = createSyllableCountAudioContext({ asset: saved, language, voice });
      const approvals = Array.isArray(input.prepared) ? input.prepared : [input.prepared];
      const reviewed = approvals.some(board => {
        const approval = board?.reviewedEvidence || board;
        if (!['teacher_review', 'teacher_recording'].includes(approval?.source) || !approval.audioContext?.fingerprint ||
            approval.audioContext.signature !== audioContext.signature) return false;
        const resolved = resolveSyllableCount(input.word, { language, prepared: board, recordedTask: input.recordedTask, audioContext });
        return resolved.supported === true && resolved.source === approval.source &&
          resolved.review?.signature === approval.review?.signature;
      });
      // Existing lesson review can explicitly keep an identified saved clip.
      // Callers opting in must display its actual profile; this never makes
      // an incompatible bank clip eligible for automatic preview.
      if (reviewed || savedProfile.compatible || input.allowSavedProfileMismatch === true) return { asset: saved, audioSource: 'data:' + saved.mime + ';base64,' + saved.base64, source: 'saved', reviewed, profile: savedProfile };
    }
    const bank = asAsset(input.bankAsset);
    if (bank) {
      // The shipped word bank is Kokoro af_heart in US English. Missing
      // metadata must not turn its clips into the currently selected voice.
      const p = bank.provenance || {};
      const asset = { ...bank, provenance: packAudioProvenance({ ...p, provider: p.provider || 'kokoro',
        resolvedVoice: p.resolvedVoice || 'af_heart', language: p.language || 'en' }, p.source && p.source !== 'unknown' ? p.source : 'recorded_bank') };
      const profile = packAudioProfileStatus(asset, voice, language);
      if (profile.compatible) return { asset, audioSource: 'data:' + asset.mime + ';base64,' + asset.base64, source: 'bank', reviewed: false, profile };
    }
    return { asset: null, audioSource: null, source: null, reviewed: false, profile: savedProfile.present ? savedProfile : null };
  };
  // A reviewed recording carries its own audio. Old generated syllable labels
  // must not remain mandatory speech clips in the lesson-wide manifest. Keep
  // labels which another word, response choice or activity still consumes.
  const normalizeRecordedSyllableDependencies = (words, language, previousWords = []) => {
    if (!Array.isArray(words)) return words;
    const list = value => Array.isArray(value) ? value : [];
    const targetOf = item => item && (item.targetWord || item.word || item.term || item.singleWord || item.displayWord);
    const candidates = new Set(), protectedKeys = new Set(), previousByWord = new Map();
    list(previousWords).forEach(item => {
      const key = packAudioKey(targetOf(item));
      if (!key) return;
      if (!previousByWord.has(key)) previousByWord.set(key, []);
      previousByWord.get(key).push(item);
    });
    const addParts = item => {
      const board = item && item.activityItems && item.activityItems.syllable_blending;
      [...list(item && item.syllables), ...list(board && board.syllables),
        ...list(board && board.audioUnits).flatMap(unit => unit ? [unit.text, unit.key] : [])]
        .forEach(value => { const key = packAudioKey(value); if (key) candidates.add(key); });
    };
    words.forEach(item => {
      const target = targetOf(item), key = packAudioKey(target);
      if (key) protectedKeys.add(key);
      const board = item && item.activityItems && item.activityItems.syllable_blending;
      if (!board || board.contentStatus !== 'teacher_recorded' || packAudioKey(board.targetWord) !== key ||
          !validSyllableBoard(board) || !resolveSyllableTask(target, board, language || board.language).supported) return;
      addParts(item);
      list(previousByWord.get(key)).forEach(previous => {
        const oldBoard = previous.activityItems && previous.activityItems.syllable_blending;
        if (!oldBoard || !oldBoard.targetWord || packAudioKey(oldBoard.targetWord) === key) addParts(previous);
      });
    });
    if (!candidates.size) return words;
    // Ignore the manifest and stored spare clips while deriving actual current
    // speech consumers. This inventory also covers computed prompt strings.
    packAudioInventory(words.map(item => item && ({ ...item, _ttsRequiredKeys: [], _ttsAssets: {} })), undefined, language)
      .forEach(row => { if (row.regeneratable) protectedKeys.add(row.key); });
    // Be conservative about additional authored activity fields. In particular,
    // syllable counting and a second item's curated syllables still need speech.
    const seen = new Set();
    const protect = value => {
      if (typeof value === 'string') { protectedKeys.add(packAudioKey(value)); return; }
      if (!value || typeof value !== 'object' || seen.has(value)) return;
      seen.add(value);
      Object.entries(value).forEach(([key, child]) => {
        if (key !== 'asset' && key !== 'provenance' && key !== 'review' && key !== '_ttsAssets' && key !== '_ttsRequiredKeys') protect(child);
      });
    };
    // Older lessons still supply these instructional fields directly on the
    // word. Runtime fallbacks consume them even without an activityItems board.
    words.forEach(item => {
      if (!item) return;
      ['manipulationTask', 'rhymeWord', 'rhymeWords', 'rhymes', 'rhymeDistractors',
        'blendingDistractors', 'orthographyDistractors', 'syllableBlendingOptions']
        .forEach(field => protect(item[field]));
      String(item.manipulationTask?.instruction || '').split(/(\/[^\s/]{1,4}\/)/g)
        .map(part => part.trim()).filter(part => part && /[a-z0-9]/i.test(part) && !/^\/[^/]+\/$/.test(part))
        .forEach(protect);
    });
    words.forEach(item => Object.entries(item && item.activityItems || {}).forEach(([activity, board]) => {
      if (activity !== 'syllable_blending') protect(board);
      else if (board) {
        const recorded = board.contentStatus === 'teacher_recorded' && packAudioKey(board.targetWord) === packAudioKey(targetOf(item)) &&
          validSyllableBoard(board) && resolveSyllableTask(targetOf(item), board, language || board.language).supported;
        if (!recorded) protect(board);
        else Object.entries(board).forEach(([key, value]) => { if (key !== 'syllables' && key !== 'audioUnits' && key !== 'review') protect(value); });
      }
    }));
    let changed = false;
    const normalized = words.map(item => {
      if (!item || !Array.isArray(item._ttsRequiredKeys)) return item;
      const keys = item._ttsRequiredKeys.filter(value => !candidates.has(packAudioKey(value)) || protectedKeys.has(packAudioKey(value)));
      if (keys.length === item._ttsRequiredKeys.length) return item;
      changed = true;
      return { ...item, _ttsRequiredKeys: keys };
    });
    return changed ? normalized : words;
  };

  const planPackRepair = (words, language, activities = []) => {
    const issues = [], issueIndexes = [], upgraded = [];
    const next = (words || []).map((item, index) => {
      if (!item || typeof item !== 'object') return item;
      const target = item.targetWord || item.word || item.term;
      const old = item.activityItems && item.activityItems.syllable_blending || ((item._preparedActivities || activities).includes('syllable_blending') ? {} : null);
      if (!old || (validSyllableBoard(old) && packAudioKey(old.targetWord) === packAudioKey(target) && resolveSyllableTask(target, old, language).supported)) return item;
      // A teacher recording is never reconstructed or synthesized by repair.
      if (old.contentStatus === 'teacher_recorded') { issues.push(String(target) + ': review the recorded syllables'); issueIndexes.push(index); return item; }
      const task = resolveSyllableTask(target, null, language);
      const authoredOptions = Array.isArray(old.options) && old.options.length ? old.options : item.syllableBlendingOptions;
      const board = Object.assign({}, old, task, { options: authoredOptions, answer: target });
      if (!task.supported || !validSyllableBoard(board, target)) { issues.push(String(target) + ': review syllable parts and answer choices'); issueIndexes.push(index); return item; }
      upgraded.push(String(target));
      return Object.assign({}, item, { activityItems: Object.assign({}, item.activityItems, { syllable_blending: board }) });
    });
    return { words: next, issues, issueIndexes, upgraded, missing: packAudioInventory(next, undefined, language, [], activities).filter(row => row.regeneratable && !row.present) };
  };
  const replacePackAssets = (words, replacements) => {
    if (!Array.isArray(words) || !words.length) return words;
    const assets = packAudioAssets(words);
    const replacedKeys = new Set();
    Object.entries(replacements || {}).forEach(([key, asset]) => { if (portablePackAsset(asset)) { assets[packAudioKey(key)] = asset; replacedKeys.add(packAudioKey(key)); } });
    const next = words.map((item, index) => {
      const copy = Object.assign({}, item);
      if (index) { delete copy._ttsAssets; delete copy._ttsRequiredKeys; }
      else copy._ttsAssets = assets;
      copy.ttsReady = portablePackAsset(assets[packAudioKey(item.targetWord || item.word || item.term)]);
      copy._ttsFailed = !copy.ttsReady && !isTeacherSpokenSyllableCount(item.targetWord || item.word || item.term, {
        language: item.activityItems?.syllable_counting?.language, prepared: item.activityItems?.syllable_counting,
        recordedTask: item.activityItems?.syllable_blending,
        audioContext: createSyllableCountAudioContext({ asset: assets[packAudioKey(item.targetWord || item.word || item.term)], language: item.activityItems?.syllable_counting?.language }),
      });
      const word = item.targetWord || item.word || item.term, key = packAudioKey(word);
      const countBoard = item.activityItems?.syllable_counting;
      const approval = countBoard?.reviewedEvidence || countBoard;
      if (replacedKeys.has(key) && approval?.status === 'reviewed') {
        const audioContext = createSyllableCountAudioContext({ asset: assets[key], language: approval.language });
        copy.activityItems = { ...item.activityItems, syllable_counting: resolveSyllableCount(word, {
          language: approval.language, prepared: countBoard, recordedTask: item.activityItems?.syllable_blending, audioContext }) };
      }
      return copy;
    });
    const inventory = packAudioInventory(next);
    next[0]._ttsRequiredKeys = inventory.filter(row => row.regeneratable).map(row => row.key);
    next[0]._studentPackVersion = 2;
    next[0]._ttsCoverage = Object.assign({}, next[0]._ttsCoverage, { clips: Object.keys(assets).length, requiredClips: inventory.length, words: next.length, wordsWithAudio: next.filter(item => item.ttsReady).length });
    return next;
  };
  return {loadSyllablePronunciations,resolveSyllableCount,isTeacherSpokenSyllableCount,createReviewedSyllableCount,createSyllableCountAudioContext,selectSyllableCountAudio,recoverSyllableRecordingDraft,syllableCountWords,syllableRecordingTemplate,normalizeRecordedSyllableDependencies,packAudioLanguageKey,packAudioKey,packAudioAssets,portablePackAsset,packAudioProvenance,packAudioProfileStatus,packAudioInventory,planPackRepair,replacePackAssets,createReviewedSyllableTask,reviewedSyllableReady,syllableAssetSource,resolveSyllableTask,syllableReady,validSyllableBoard,syllableWords,isSyllableLanguageSupported,reviewedRhymeEdit,rhymePairStatus,createRhymeSession,buildSessionRhymeBoard,buildRhymeBoard,resolveManipulationTask,manipulationReady,VERSION,phonemeToken,phonemeLabel,soundKey,edgeSound,validSoundBoard,buildSoundSort,validWordFamilyBoard,wordFamilyInstruction,difficultyDecision,textEvidence,phonemeLabels,responseEvidence,profileCheck,knownWords:Object.keys(EDGES)};
}
const WS_CORE = createWordSoundsCore();
// END GENERATED WORD SOUNDS CORE
  if (typeof window !== 'undefined' && window.AlloWordSoundsDI) return;

  var VERSION = '1.1.0';

  // ──────────────────────────────────────────────────────────────────────
  // Phoneme inventory
  //
  // The pack's English phoneme tokens follow the notation the generation
  // prompt pins: macron long vowels, plain short vowels, r-controlled vowels
  // and consonant digraphs as single tokens. These letters are built from
  // code points rather than typed, because hand-typing non-Latin-1 characters
  // into this repo has silently produced combining-mark variants before and
  // every pack gate is blind to it.
  //   U+0101 a-macron, U+0113 e-macron, U+012B i-macron, U+014D o-macron,
  //   U+016B u-macron, U+0259 schwa.
  // ──────────────────────────────────────────────────────────────────────
  var LONG_VOWELS = [0x101, 0x113, 0x12B, 0x14D, 0x16B].map(function (c) {
    return String.fromCharCode(c);
  });
  var SCHWA = String.fromCharCode(0x259);

  var SHORT_VOWELS = ['a', 'e', 'i', 'o', 'u'];
  var R_CONTROLLED = ['ar', 'er', 'ir', 'or', 'ur', 'air', 'ear', 'ure'];
  var LONG_SOUND_KEYS = ['ay', 'ee', 'ie', 'oa', 'oo'];
  // Vowel-team spellings. A Gemini-generated pack normalizes these to macrons,
  // but the spelling-based estimator fallback emits them raw, so both forms
  // have to classify as vowels or an estimated pack reports nonsense shapes.
  var VOWEL_TEAMS = [
    'oo', 'aw', 'au', 'oi', 'oy', 'ou', 'ow', 'ew', 'ue', 'oa',
    'ea', 'ee', 'ai', 'ay', 'ie', 'oe', 'ei', 'ey', 'igh'
  ];
  var CONSONANT_DIGRAPHS = [
    'sh', 'ch', 'th', 'wh', 'ng', 'ck', 'ph', 'gh',
    'qu', 'wr', 'kn', 'gn', 'mb', 'tch', 'dge', 'dh', 'zh'
  ];

  function norm(token) {
    var s = token == null ? '' : String(token);
    if (s.normalize) s = s.normalize('NFC');
    return s.trim().toLowerCase();
  }

  // Keep the supplied notation for printed speech. Only analysis uses the
  // canonical sound key; grapheme spelling remains a separate field.
  function phonemeToken(entry) {
    if (typeof entry === 'string') return norm(entry);
    if (!entry || typeof entry !== 'object') return '';
    var fields = ['ipa', 'phoneme', 'sound', 'grapheme'];
    for (var i = 0; i < fields.length; i++) {
      if (typeof entry[fields[i]] === 'string' && norm(entry[fields[i]])) return norm(entry[fields[i]]);
    }
    return '';
  }
  function phonemeGrapheme(entry) {
    if (entry && typeof entry === 'object') return norm(entry.grapheme || entry.g || '');
    return '';
  }

  // Share notation-aware identity with learner boards. The printed IPA token
  // and its grapheme spelling stay separate from that canonical comparison.
  function canonicalPhoneme(entry) {
    return WS_CORE.soundKey(entry);
  }

  /**
   * classifyPhoneme(token) -> { token, kind: 'vowel'|'consonant', sub, label }
   * `sub` is the teaching category, which is what the script talks about.
   */
  function classifyPhoneme(token) {
    var t = phonemeToken(token), key = canonicalPhoneme(token);
    var result = function (kind, sub, label) { return {token: t, soundKey: key, kind: kind, sub: sub, label: label}; };
    if (!t) return result('consonant', 'unknown', 'unknown');
    if (LONG_VOWELS.indexOf(t) >= 0 || LONG_SOUND_KEYS.indexOf(key) >= 0) return result('vowel', 'long', 'long vowel');
    if (SHORT_VOWELS.indexOf(key) >= 0 || key === 'oo_short') return result('vowel', 'short', 'short vowel');
    if (R_CONTROLLED.indexOf(key) >= 0) return result('vowel', 'r_controlled', 'r-controlled vowel');
    if (VOWEL_TEAMS.indexOf(t) >= 0 || VOWEL_TEAMS.indexOf(key) >= 0) return result('vowel', 'team', 'vowel team');
    if (t === SCHWA || key === 'schwa') return result('vowel', 'schwa', 'schwa');
    if (CONSONANT_DIGRAPHS.indexOf(t) >= 0 || CONSONANT_DIGRAPHS.indexOf(key) >= 0) return result('consonant', 'digraph', 'consonant digraph');
    if (/^[a-z]$/.test(key)) return result('consonant', 'single', 'single consonant');
    return result('consonant', 'other', 'consonant');
  }

  function isVowel(token) { return classifyPhoneme(token).kind === 'vowel'; }

  // ──────────────────────────────────────────────────────────────────────
  // Grapheme alignment
  //
  // Prefer, in order: the pack's own graphemes (a real alignment someone or
  // something already committed to), AlloPhonics' digraph-aware aligner when
  // the loader happens to be present, then a local copy of the same greedy
  // algorithm so this module still works standalone in a test.
  // ──────────────────────────────────────────────────────────────────────
  var _TRIGRAPHS = ['igh', 'tch', 'dge'];
  var _DIGRAPHS = [
    'sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck', 'qu', 'wr', 'kn', 'gn', 'gh', 'mb',
    'ai', 'ay', 'ea', 'ee', 'oa', 'ow', 'oo', 'ou', 'oi', 'oy',
    'ar', 'er', 'ir', 'or', 'ur', 'aw', 'au', 'ew'
  ];
  function localAlignGraphemes(word, count) {
    var w = String(word || '').toLowerCase().replace(/[^\p{L}\p{M}']/gu, '');
    if (!w || !count || count < 1) return null;
    var greedy = [];
    for (var i = 0; i < w.length;) {
      if (i <= w.length - 3 && _TRIGRAPHS.indexOf(w.slice(i, i + 3)) >= 0) { greedy.push(w.slice(i, i + 3)); i += 3; }
      else if (i <= w.length - 2 && _DIGRAPHS.indexOf(w.slice(i, i + 2)) >= 0) { greedy.push(w.slice(i, i + 2)); i += 2; }
      else { greedy.push(w[i]); i += 1; }
    }
    if (greedy.length === count) return greedy;
    if (greedy.length > count) {
      var merged = greedy.slice();
      while (merged.length > count) { var last = merged.pop(); merged[merged.length - 1] += last; }
      return merged.length === count ? merged : null;
    }
    var chunks = greedy.slice();
    while (chunks.length < count) {
      var idx = -1, len = 1;
      for (var j = 0; j < chunks.length; j++) { if (chunks[j].length > len) { len = chunks[j].length; idx = j; } }
      if (idx < 0) break;
      var c = chunks[idx];
      chunks.splice(idx, 1, c.slice(0, 1), c.slice(1));
    }
    return chunks.length === count ? chunks : null;
  }
  function alignGraphemes(word, count) {
    try {
      if (typeof window !== 'undefined' && window.AlloPhonics
        && typeof window.AlloPhonics.alignGraphemes === 'function') {
        var viaPhonics = window.AlloPhonics.alignGraphemes(word, count);
        if (viaPhonics && viaPhonics.length === count) return viaPhonics;
      }
    } catch (_) { /* fall through to the local copy */ }
    return localAlignGraphemes(word, count);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Per-word analysis
  // ──────────────────────────────────────────────────────────────────────

  function wordText(item) {
    if (!item) return '';
    return String(item.targetWord || item.word || item.term || item.displayWord || '').trim();
  }

  /**
   * Syllable type for a single-syllable word. Multisyllabic words are reported
   * as such rather than guessed at: a wrong syllable-type label in a printed
   * script is worse than an honest "multisyllabic (2)".
   */
  function syllableTypeFor(word, tokens, graphemes, classes) {
    var spelled = String(word || '').toLowerCase().replace(/[^a-z']/g, '');
    var vowelIdx = -1;
    for (var i = 0; i < tokens.length; i++) { if (classes[i].kind === 'vowel') { vowelIdx = i; break; } }
    if (vowelIdx < 0) return 'no vowel sound';
    var v = classes[vowelIdx];
    if (v.sub === 'r_controlled') return 'r-controlled';
    if (/[a-z]*[aeiou][^aeiouy]e$/.test(spelled) && v.sub === 'long') return 'silent-e';
    var vGrapheme = (graphemes && graphemes[vowelIdx]) || '';
    if ((v.sub === 'long' || v.sub === 'team') && vGrapheme.length >= 2) return 'vowel team';
    if (v.sub === 'long' && vowelIdx === tokens.length - 1) return 'open';
    if (v.sub === 'short' && vowelIdx < tokens.length - 1) return 'closed';
    if (v.sub === 'long') return 'long vowel';
    return 'other';
  }

  function consonantRun(tokens, fromStart) {
    var run = [];
    var order = fromStart ? tokens : tokens.slice().reverse();
    for (var i = 0; i < order.length; i++) {
      var c = classifyPhoneme(order[i]);
      if (c.kind !== 'consonant') break;
      // A digraph is one sound, not a blend. Only single consonants stack into
      // a blend, which is the distinction the model/lead wording depends on.
      if (c.sub !== 'single') { run.push(order[i]); break; }
      run.push(order[i]);
    }
    if (!fromStart) run.reverse();
    return run;
  }

  function checkedSyllables(item, syllables, language, pool, voice, packAssets) {
    if (!item || !item.activityItems) return {count: syllables.length || null, parts: syllables};
    var assets = packAssets || WS_CORE.packAudioAssets(pool || [item]);
    var asset = assets[WS_CORE.packAudioKey(wordText(item))];
    var resolved = WS_CORE.resolveSyllableCount(wordText(item), {
      language: language || 'en', prepared: item.activityItems.syllable_counting,
      recordedTask: item.activityItems.syllable_blending,
      audioContext: WS_CORE.createSyllableCountAudioContext({language: language || 'en', voice: voice,
        asset: asset, audioSource: typeof asset === 'string' ? asset : undefined})
    });
    return {
      count: resolved.supported ? resolved.count : null,
      // A verified count does not approve an arbitrary spelling split.
      parts: resolved.supported && resolved.syllables.length === resolved.count ? resolved.syllables : []
    };
  }

  function analyzeWord(item, language, pool, voice, packAssets) {
    var word = wordText(item);
    var rawPhonemes = (Array.isArray(item && item.phonemes) ? item.phonemes : []).filter(function (entry) { return !!phonemeToken(entry); });
    var tokens = rawPhonemes.map(phonemeToken);

    var graphemes = null;
    var packGraphemes = Array.isArray(item && item.graphemes) ? item.graphemes.map(norm) : [];
    var inlineGraphemes = rawPhonemes.map(phonemeGrapheme);
    if (packGraphemes.length === tokens.length && packGraphemes.every(Boolean)) {
      graphemes = packGraphemes;
    } else if (inlineGraphemes.length === tokens.length && inlineGraphemes.every(Boolean)) {
      graphemes = inlineGraphemes;
    } else {
      graphemes = alignGraphemes(word, tokens.length);
    }
    var graphemesAligned = !!(graphemes && graphemes.length === tokens.length);
    if (!graphemesAligned) graphemes = null;

    var classes = rawPhonemes.map(classifyPhoneme);
    var shape = classes.map(function (c) { return c.kind === 'vowel' ? 'V' : 'C'; }).join('');
    var syllables = Array.isArray(item && item.syllables) ? item.syllables.filter(Boolean) : [];
    var checked = checkedSyllables(item, syllables, language, pool, voice, packAssets);
    var syllableCount = checked.count;

    var initialBlend = consonantRun(tokens, true);
    var finalBlend = consonantRun(tokens, false);

    return {
      word: word,
      phonemes: tokens,
      soundKeys: classes.map(function (c) { return c.soundKey; }),
      phonemeCount: tokens.length,
      graphemes: graphemes,
      graphemesAligned: graphemesAligned,
      classes: classes,
      shape: shape,
      syllables: syllables,
      countSyllables: checked.parts,
      syllableCount: syllableCount,
      syllableType: syllableCount == null ? 'syllable count needs review' : syllableCount > 1
        ? ('multisyllabic (' + syllableCount + ')')
        : syllableTypeFor(word, tokens, graphemes, classes),
      initialBlend: initialBlend.length >= 2 && initialBlend.every(function (t) {
        return classifyPhoneme(t).sub === 'single';
      }) ? initialBlend : [],
      finalBlend: finalBlend.length >= 2 && finalBlend.every(function (t) {
        return classifyPhoneme(t).sub === 'single';
      }) ? finalBlend : [],
      firstSound: tokens[0] || '',
      lastSound: tokens.length ? tokens[tokens.length - 1] : '',
      sentence: (item && typeof item.sentence === 'string') ? item.sentence.trim() : '',
      rhymeWord: (item && item.rhymeWord) ? String(item.rhymeWord).trim() : '',
      familyEnding: (item && item.familyEnding) ? String(item.familyEnding).trim() : '',
      definition: (item && item.definition) ? String(item.definition).trim() : '',
      manipulationTask: (item && item.manipulationTask) || null,
      // Keep the prepared task contract for teacher speech; word-level legacy
      // fields may describe a different answer or position.
      activityItems: item && item.activityItems && typeof item.activityItems === 'object'
        ? item.activityItems : null,
      language: language || 'en',
      soundPool: (pool || [item]).map(function (entry) {
        return {word: wordText(entry), phonemes: (Array.isArray(entry && entry.phonemes) ? entry.phonemes : [])
          .filter(function (p) { return !!phonemeToken(p); }).map(canonicalPhoneme)};
      }),
      phonemeSource: (item && item._phonemeSource) || 'unknown',
      estimated: !!(item && item._fallbackUsed)
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Set-level analysis
  // ──────────────────────────────────────────────────────────────────────

  function tally(map, key, word) {
    if (!map[key]) map[key] = { key: key, words: [] };
    if (map[key].words.indexOf(word) < 0) map[key].words.push(word);
  }
  function rank(map) {
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) {
        if (b.words.length !== a.words.length) return b.words.length - a.words.length;
        return a.key < b.key ? -1 : 1;
      });
  }

  function supportsLanguage(lang) {
    var l = String(lang == null ? 'en' : lang).toLowerCase();
    return l === '' || l.indexOf('en') === 0;
  }

  /**
   * analyzeWordSet(words, opts) — the whole deterministic picture of a pack.
   *
   * "Focus" is defined by recurrence inside this set, not by any curriculum
   * scope-and-sequence this repo does not have. A correspondence a teacher put
   * into a third of the words is the thing they are teaching; one that appears
   * once is incidental. That inference is stated in the printed script so a
   * teacher can overrule it rather than being quietly told what their objective is.
   */
  function analyzeWordSet(words, opts) {
    opts = opts || {};
    var packAssets = WS_CORE.packAudioAssets(Array.isArray(words) ? words : []);
    var list = (Array.isArray(words) ? words : []).map(function (item) { return analyzeWord(item, opts.language, words, opts.voice, packAssets); })
      .filter(function (w) { return w.word && w.phonemeCount > 0; });

    var gpcMap = {}, phonemeMap = {}, shapeMap = {}, syllTypeMap = {};
    var gpcDetails = {}, phonemeDetails = {};
    var blendMap = {}, positionMap = {};
    var unaligned = [];

    list.forEach(function (w) {
      tally(shapeMap, w.shape, w.word);
      tally(syllTypeMap, w.syllableType, w.word);
      if (!w.graphemesAligned) unaligned.push(w.word);
      w.phonemes.forEach(function (p, i) {
        var classification = w.classes[i];
        // Preserve the printed token while distinguishing IPA j from app j
        // (and length-stripped IPA i/u from the app's short vowels).
        var identity = JSON.stringify([p, classification.soundKey]);
        tally(phonemeMap, identity, w.word);
        phonemeDetails[identity] = classification;
        var pos = i === 0 ? 'initial' : (i === w.phonemeCount - 1 ? 'final' : 'medial');
        tally(positionMap, identity + '@' + pos, w.word);
        if (w.graphemes) {
          var gpcIdentity = JSON.stringify([w.graphemes[i], p, classification.soundKey]);
          tally(gpcMap, gpcIdentity, w.word);
          gpcDetails[gpcIdentity] = {grapheme: w.graphemes[i], classification: classification};
        }
      });
      if (w.initialBlend.length) tally(blendMap, w.initialBlend.join('') + ' (initial)', w.word);
      if (w.finalBlend.length) tally(blendMap, w.finalBlend.join('') + ' (final)', w.word);
    });

    var n = list.length;
    // Two words is the floor for "recurring"; a third of the set is the floor
    // for "focus". Both are deliberately low, because a Word Sounds pack is
    // usually built around one pattern and is often only six to ten words.
    var focusFloor = Math.max(2, Math.ceil(n * 0.34));
    // A phonics lesson's pattern is a vowel or a multi-letter grapheme, never a
    // lone common consonant. Without this test, /t/ spelled t recurring in three
    // of six words outranks the r-controlled vowel the pack was built around,
    // and the printed objective names the wrong thing to teach.
    function focusEligible(grapheme, c) {
      if (c.kind === 'vowel') return true;
      if (String(grapheme || '').length > 1) return true;
      return c.sub === 'digraph';
    }
    var gpcs = rank(gpcMap).map(function (g) {
      var detail = gpcDetails[g.key], classification = detail.classification;
      var eligible = focusEligible(detail.grapheme, classification);
      return {
        grapheme: detail.grapheme,
        phoneme: classification.token,
        soundKey: classification.soundKey,
        wordCount: g.words.length,
        words: g.words,
        tier: (eligible && g.words.length >= focusFloor)
          ? 'focus'
          : (g.words.length >= 2 ? 'recurring' : 'incidental'),
        focusEligible: eligible,
        category: classification.label
      };
    });

    var shapes = rank(shapeMap);
    var syllableTypes = rank(syllTypeMap);
    var counts = {};
    list.forEach(function (w) { counts[w.phonemeCount] = (counts[w.phonemeCount] || 0) + 1; });

    return {
      version: VERSION,
      language: opts.language || 'en',
      grade: opts.grade || '',
      wordCount: n,
      words: list,
      gpcs: gpcs,
      focusGpcs: gpcs.filter(function (g) { return g.tier === 'focus'; }),
      focusFloor: focusFloor,
      phonemes: rank(phonemeMap).map(function (p) {
        var classification = phonemeDetails[p.key];
        return {
          phoneme: classification.token, soundKey: classification.soundKey, wordCount: p.words.length, words: p.words,
          category: classification.label,
          positions: ['initial', 'medial', 'final'].filter(function (pos) {
            return !!positionMap[p.key + '@' + pos];
          })
        };
      }),
      blends: rank(blendMap).map(function (b) {
        return { blend: b.key, wordCount: b.words.length, words: b.words };
      }),
      shapes: shapes.map(function (s) { return { shape: s.key, wordCount: s.words.length, words: s.words }; }),
      dominantShape: shapes.length ? shapes[0].key : '',
      syllableTypes: syllableTypes.map(function (s) {
        return { type: s.key, wordCount: s.words.length, words: s.words };
      }),
      dominantSyllableType: syllableTypes.length ? syllableTypes[0].type : '',
      phonemeCountDistribution: counts,
      // Data-quality flags the printed script surfaces, because a script built
      // on spelling-estimated sounds should say so on the page rather than read
      // as authoritative.
      estimatedWords: list.filter(function (w) { return w.estimated; }).map(function (w) { return w.word; }),
      unalignedWords: unaligned
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Activity → skill map
  //
  // `strand` drives which model/lead wording the script opens with. `teaches`
  // is what goes on the page next to the activity name so the teacher can see
  // the instructional purpose rather than the app's label.
  // ──────────────────────────────────────────────────────────────────────
  var ACTIVITY_SKILLS = {
    isolation: {
      label: 'Sound Isolation', strand: 'phonemic_awareness',
      teaches: 'Identify the first, last, or middle sound in a spoken word.',
      prompt: 'What is the first sound in ___?',
      model: 'My turn. The first sound in ___ is /_/.',
      watchFor: 'A child who says the letter name instead of the sound.'
    },
    blending: {
      label: 'Blending', strand: 'phonemic_awareness',
      teaches: 'Push separate sounds together into a whole word.',
      prompt: 'Listen to the sounds. What word?',
      model: 'My turn. /_/ /_/ /_/. The word is ___.',
      watchFor: 'A child who repeats the sounds back without joining them.'
    },
    segmentation: {
      label: 'Segmentation', strand: 'phonemic_awareness',
      teaches: 'Break a whole word into its separate sounds.',
      prompt: 'Say the sounds in ___.',
      model: 'My turn. ___. /_/ /_/ /_/.',
      watchFor: 'A child who breaks by syllable or by letter instead of by sound.'
    },
    counting: {
      label: 'Sound Counting', strand: 'phonemic_awareness',
      teaches: 'Count the sounds in a spoken word.',
      prompt: 'How many sounds do you hear in ___?',
      model: 'My turn. ___. /_/ /_/ /_/. Three sounds.',
      watchFor: 'A child who counts letters. Digraphs are where this shows up.'
    },
    manipulation: {
      label: 'Sound Swap', strand: 'phonemic_awareness',
      teaches: 'Delete or substitute one sound and say the new word.',
      prompt: 'Say ___. Now say it again without /_/.',
      model: 'My turn. ___ without /_/ is ___.',
      watchFor: 'A child who changes more than the one sound you named.'
    },
    rhyming: {
      label: 'Rhyming', strand: 'phonemic_awareness',
      teaches: 'Hear that two words end the same way.',
      prompt: 'Which word rhymes with ___?',
      model: 'My turn. ___ and ___ rhyme. They both end with ___.',
      watchFor: 'A child matching the beginning sound instead of the ending.'
    },
    sound_sort: {
      label: 'Sound Sort', strand: 'phonemic_awareness',
      teaches: 'Group words by a shared sound.',
      prompt: 'Does ___ have the /_/ sound?',
      model: 'My turn. ___ has /_/. It goes here.',
      watchFor: 'Sorting by spelling rather than by sound.'
    },
    syllable_counting: {
      label: 'Syllable Counting', strand: 'phonemic_awareness',
      teaches: 'Count the beats in a spoken word.',
      prompt: 'How many parts do you hear in ___?',
      model: 'My turn. ___. Clap it with me.',
      watchFor: 'Counting sounds instead of beats.'
    },
    syllable_blending: {
      label: 'Syllable Blending', strand: 'phonemic_awareness',
      teaches: 'Join spoken syllables into a word.',
      prompt: 'Put the parts together. What word?',
      model: 'My turn. ___ plus ___ is ___.',
      watchFor: 'Losing the second syllable when the word is long.'
    },
    mapping: {
      label: 'Sound Mapping', strand: 'phonics',
      teaches: 'Match each sound to the letters that spell it.',
      prompt: 'Put one letter box under each sound.',
      model: 'My turn. /_/ goes in this box. These letters spell it.',
      watchFor: 'One box per letter instead of one box per sound.'
    },
    orthography: {
      label: 'Spelling Choice', strand: 'phonics',
      teaches: 'Choose the correct spelling of a heard word.',
      prompt: 'Which one spells ___?',
      model: 'My turn. ___ is spelled ___. I hear /_/ so I write ___.',
      watchFor: 'Choosing a plausible but incorrect vowel spelling.'
    },
    word_families: {
      label: 'Word Families', strand: 'phonics',
      teaches: 'Read a set of words that share a rime.',
      prompt: 'Change the first sound. What word now?',
      model: 'My turn. ___ ends with ___. Change /_/ to /_/ and it says ___.',
      watchFor: 'Reading the rime letter by letter each time.'
    },
    missing_letter: {
      label: 'Missing Letter', strand: 'phonics',
      teaches: 'Retrieve the grapheme for a heard sound.',
      prompt: 'Which letter makes the /_/ sound here?',
      model: 'My turn. I hear /_/. That is spelled ___.',
      watchFor: 'Guessing from word shape rather than from the sound.'
    },
    letter_tracing: {
      label: 'Letter Tracing', strand: 'phonics',
      teaches: 'Form the letter while saying its sound.',
      prompt: 'Trace it and say the sound.',
      model: 'My turn. I say /_/ every time I trace it.',
      watchFor: 'Tracing silently. The sound has to ride along with the motion.'
    },
    word_scramble: {
      label: 'Word Scramble', strand: 'phonics',
      teaches: 'Sequence graphemes into the correct order.',
      prompt: 'Put the letters in order to spell ___.',
      model: 'My turn. ___. The first sound is /_/ so ___ goes first.',
      watchFor: 'Rearranging by look instead of by sound order.'
    },
    spelling_bee: {
      label: 'Spelling', strand: 'encoding',
      teaches: 'Write a word from dictation.',
      prompt: 'Spell ___.',
      model: 'My turn. ___. I say the sounds, then I write each one.',
      watchFor: 'Writing before segmenting. Say the sounds first, every time.'
    },
    decoding: {
      label: 'Decoding', strand: 'fluency',
      teaches: 'Read a written word by sounding it out.',
      prompt: 'Sound it out. What word?',
      model: 'My turn. /_/ /_/ /_/. ___.',
      watchFor: 'Guessing from the first letter and the picture.'
    },
    read_sentence: {
      label: 'Read the Sentence', strand: 'fluency',
      teaches: 'Read the target word inside connected text.',
      prompt: 'Read the sentence. Which word finishes it?',
      model: 'My turn. I read the whole sentence, then I try each word.',
      watchFor: 'Choosing a word that looks right but does not make sense.'
    },
    read_passage: {
      label: 'Read the Story', strand: 'fluency',
      teaches: 'Read several connected sentences accurately.',
      prompt: 'Read it to me.',
      model: 'My turn. I read it once smoothly so you know how it should sound.',
      watchFor: 'Accuracy first. Speed comes after the words are secure.'
    },
    sentence_match: {
      label: 'Sentence Match', strand: 'fluency',
      teaches: 'Show understanding of what was read.',
      prompt: 'Which picture shows the sentence?',
      model: 'My turn. The sentence says ___, so I look for ___.',
      watchFor: 'Matching one word rather than the whole sentence.'
    }
  };

  var STRAND_ORDER = ['phonemic_awareness', 'phonics', 'encoding', 'fluency'];
  var STRAND_LABEL = {
    phonemic_awareness: 'Phonemic awareness',
    phonics: 'Phonics',
    encoding: 'Encoding',
    fluency: 'Fluency and connected text'
  };
  var STRAND_OBJECTIVE_VERB = {
    phonemic_awareness: 'hear and work with the separate sounds in spoken words',
    phonics: 'match sounds to the letters that spell them',
    encoding: 'write words from the sounds they hear',
    fluency: 'read the words accurately in connected text'
  };

  function activityInfo(id) {
    return ACTIVITY_SKILLS[id] || {
      label: String(id || '').replace(/_/g, ' '),
      strand: 'phonics',
      teaches: '',
      prompt: '',
      model: '',
      watchFor: ''
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Script assembly
  // ──────────────────────────────────────────────────────────────────────

  function slash(p) { return '/' + p + '/'; }
  function soundsOf(w) { return w.phonemes.map(slash).join(' '); }
  function cap(s) {
    var t = String(s || '');
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  }
  var NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  function numberWord(n) {
    return (n >= 0 && n < NUMBER_WORDS.length) ? NUMBER_WORDS[n] : String(n);
  }
  function middleSound(w) {
    if (!w.phonemeCount) return '';
    return w.phonemes[Math.floor((w.phonemeCount - 1) / 2)];
  }
  function rimeOf(w) {
    if (w.familyEnding) return w.familyEnding;
    if (w.graphemes && w.graphemes.length > 1) {
      for (var i = 0; i < w.phonemes.length; i++) {
        if (isVowel(w.phonemes[i])) return w.graphemes.slice(i).join('');
      }
      return w.graphemes.slice(1).join('');
    }
    var spelled = String(w.word || '').toLowerCase();
    var m = spelled.match(/[aeiouy].*$/);
    return m ? m[0] : spelled;
  }
  function mappingLine(w) {
    var graphemes = w.activityItems && w.activityItems.mapping
      ? w.activityItems.mapping.graphemes : w.graphemes;
    if (!graphemes) return cap(w.word) + '. ' + soundsOf(w) + '.';
    return w.phonemes.map(function (p, i) {
      return slash(p) + ' is spelled ' + graphemes[i];
    }).join('. ') + '.';
  }

  function ordinal(index) {
    var names = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
    if (index < names.length) return names[index];
    var n = index + 1, last = n % 100;
    return n + (last >= 11 && last <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th');
  }
  function cleanLetters(w) { return norm(w.word).replace(/[^a-z]/g, ''); }
  function usableOptions(values) {
    return Array.isArray(values) && values.length > 0
      && values.every(function (v) { return typeof v === 'string' && norm(v); });
  }
  function hasOption(values, value) {
    return usableOptions(values) && values.some(function (v) { return norm(v) === norm(value); });
  }
  // A prepared pack may deliberately omit an unavailable task. Never turn
  // that rejection back into an invented legacy first-sound question.
  function preparedTaskReady(id, w) {
    if (!w.activityItems) return id !== 'rhyming' || WS_CORE.rhymePairStatus({word:w.word,
      answer:w.rhymeWord, phonemes:w.soundKeys, pool:w.soundPool}).supported;
    var board = w.activityItems[id];
    if (!board || board.supported === false || board.unavailable
      || /review_required|audio_required|needs_review/.test(board.contentStatus || '')) return false;
    switch (id) {
      case 'isolation':
        return Number.isInteger(board.position) && board.position >= 0 && board.position < w.phonemeCount
          && typeof board.correctSound === 'string' && !!norm(board.correctSound) && hasOption(board.options, board.correctSound)
          && WS_CORE.soundKey(board.correctSound) === w.soundKeys[board.position];
      case 'sound_sort':
        return WS_CORE.validSoundBoard(board, w.word, w.soundPool);
      case 'missing_letter': {
        var letters = cleanLetters(w);
        return Number.isInteger(board.hiddenIndex) && board.hiddenIndex >= 0 && board.hiddenIndex < letters.length
          && norm(board.correctLetter) === letters[board.hiddenIndex] && hasOption(board.options, board.correctLetter);
      }
      case 'syllable_counting': return w.syllableCount != null;
      case 'syllable_blending':
        return WS_CORE.validSyllableBoard(board) && WS_CORE.resolveSyllableTask(w.word, board, w.language).supported;
      case 'rhyming': return !!norm(board.answer) && hasOption(board.options, board.answer)
        && WS_CORE.rhymePairStatus({word:w.word, answer:board.answer, phonemes:w.soundKeys,
          pool:w.soundPool, prepared:board}).supported;
      case 'word_families': return WS_CORE.validWordFamilyBoard(board, w.word);
      case 'manipulation': return !!(board.task && WS_CORE.manipulationReady(WS_CORE.resolveManipulationTask(w.word, board.task, w.language))
        && hasOption(board.options, board.task.answer));
      case 'counting': return board.answer === w.phonemeCount;
      case 'segmentation': return board.slotCount === w.phonemeCount && Array.isArray(board.chips);
      case 'mapping': return usableOptions(board.graphemes) && board.graphemes.length === w.phonemeCount
        && norm(board.graphemes.join('')) === cleanLetters(w);
      case 'blending':
      case 'orthography': return norm(board.answer) === norm(w.word) && hasOption(board.options, board.answer);
      case 'spelling_bee': return norm(board.answer) === norm(w.word);
      case 'word_scramble': return norm(board.answer) === norm(w.word) && usableOptions(board.letters)
        && board.letters.map(norm).sort().join('') === cleanLetters(w).split('').sort().join('');
      case 'decoding': return hasOption(board.choices, w.word);
      case 'letter_tracing': return typeof board.letter === 'string' && /^[a-z]$/i.test(board.letter);
      case 'read_sentence': return typeof board.sentence === 'string' && !!board.sentence.trim() && hasOption(board.options, w.word);
      case 'read_passage': return typeof board.story === 'string' && !!board.story.trim()
        && Array.isArray(board.parts) && board.parts.some(function (part) { return part && !part.text; }) && hasOption(board.options, w.word);
      case 'sentence_match': return typeof board.sentence === 'string' && !!board.sentence.trim() && usableOptions(board.sequence);
      default: return true;
    }
  }

  function reviewSay(id, w) {
    return {
      model: activityInfo(id).label + ' is unavailable' + (w ? ' for ' + w.word : '') + ' until the prepared task is reviewed.',
      prompt: 'Review the task and choose an available word before teaching this activity.'
    };
  }

  /**
   * activitySay(id, word) -> { model, prompt }
   *
   * The point of a DI script is that the teacher reads a real sentence, not a
   * template with blanks in it. Every line below is built from this word's own
   * pack data, so the page a teacher holds says "Corn. /k/ /or/ /n/. Three
   * sounds." rather than "___. /_/ /_/ /_/. Three sounds." When there is no
   * word to draw on, the generic wording in ACTIVITY_SKILLS is the fallback.
   */
  function activitySayRaw(id, w) {
    var info = activityInfo(id);
    if (!w || !w.word) {
      return reviewSay(id, null);
    }
    if (!preparedTaskReady(id, w)) return reviewSay(id, w);
    var board = w.activityItems && w.activityItems[id];
    var W = String(w.word || '');
    var sounds = soundsOf(w);
    var first = slash(w.firstSound);
    var g0 = (w.graphemes && w.graphemes[0]) || String(w.word).charAt(0);
    var spokenParts = id === 'syllable_counting' ? w.countSyllables
      : board && id === 'syllable_blending' ? board.syllables : w.syllables;
    var syl = (spokenParts && spokenParts.length > 1) ? spokenParts : null;

    switch (id) {
      case 'isolation': {
        var position = board ? board.position : 0;
        var sound = slash(board ? board.correctSound : w.firstSound);
        return {
          model: 'My turn. ' + W + '. The ' + ordinal(position) + ' sound is ' + sound + '.',
          prompt: 'Your turn. What is the ' + ordinal(position) + ' sound in ' + W + '?'
        };
      }
      case 'blending':
        return {
          model: 'My turn. ' + sounds + '. The word is ' + W + '.',
          prompt: 'Your turn. ' + sounds + '. What word?'
        };
      case 'segmentation':
        return {
          model: 'My turn. ' + W + '. ' + sounds + '.',
          prompt: 'Your turn. Say the sounds in ' + W + '.'
        };
      case 'counting':
        return {
          model: 'My turn. ' + W + '. ' + sounds + '. ' + numberWord(w.phonemeCount) + ' sounds.',
          prompt: 'Your turn. How many sounds do you hear in ' + W + '?'
        };
      case 'manipulation': {
        var task = board ? board.task : w.manipulationTask;
        if (task && task.answer) {
          return {
            model: 'My turn. ' + (task.instruction || ('Say ' + W + '.'))
              + ' The answer is ' + task.answer + '.',
            prompt: 'Your turn. ' + (task.instruction || ('Say ' + W + ' without ' + first + '.'))
          };
        }
        return {
          model: 'My turn. ' + W + ' without ' + first + '. Listen to what is left.',
          prompt: 'Your turn. Say ' + W + '. Now say it again without ' + first + '.'
        };
      }
      case 'rhyming':
        if (board) return {
          model: 'My turn. ' + W + ' and ' + board.answer + ' rhyme.',
          prompt: 'Your turn. Which word rhymes with ' + W + '?'
        };
        return {
          model: 'My turn. ' + W + ' and ' + (board ? board.answer : w.rhymeWord || '') + ' rhyme. They both end with '
            + rimeOf(w) + '.',
          prompt: 'Your turn. Which word rhymes with ' + W + '?'
        };
      case 'sound_sort': {
        var edge = board && board.mode === 'last' ? 'end' : 'beginning';
        var edgeSound = slash(board ? board.targetChar : w.firstSound);
        return {
          model: 'My turn. ' + W + ' has ' + edgeSound + ' at the ' + edge + '. It goes here.',
          prompt: 'Your turn. Which words have ' + edgeSound + ' at the ' + edge + '?'
        };
      }
      case 'syllable_counting':
        return {
          model: 'My turn. ' + W + '. ' + (syl ? syl.join(' - ') : W) + '. '
            + numberWord(w.syllableCount) + ' part' + (w.syllableCount === 1 ? '' : 's') + '.',
          prompt: 'Your turn. Clap it with me. How many parts in ' + W + '?'
        };
      case 'syllable_blending':
        return {
          model: 'My turn. ' + (syl ? syl.join(' - ') : W) + '. ' + W + '.',
          prompt: 'Your turn. Put the parts together. What word?'
        };
      case 'mapping':
        return {
          model: 'My turn. ' + W + '. ' + mappingLine(w) + ' One box for each sound.',
          prompt: 'Your turn. Put one letter box under each sound in ' + W + '.'
        };
      case 'orthography':
        return {
          model: 'My turn. ' + W + '. I hear ' + sounds + ', so I write ' + w.word + '.',
          prompt: 'Your turn. Which one spells ' + W + '?'
        };
      case 'word_families':
        if (board) return {
          model: 'My turn. ' + W + ' belongs to the -' + String(board.rime).replace(/^-/, '')
            + ' family. Other words in this family are ' + board.options.join(', ') + '.',
          prompt: 'Your turn. Which words belong to the -' + String(board.rime).replace(/^-/, '') + ' family?'
        };
        return {
          model: 'My turn. ' + W + ' ends with ' + rimeOf(w) + '. Change ' + first
            + ' and it says ' + (w.rhymeWord || '') + '.',
          prompt: 'Your turn. Change the first sound in ' + W + '. What word now?'
        };
      case 'missing_letter':
        if (board) {
          var letters = cleanLetters(w), missing = board.hiddenIndex;
          var gap = letters.slice(0, missing) + '_' + letters.slice(missing + 1);
          return {
            model: 'My turn. In ' + W + ', the ' + ordinal(missing) + ' letter is ' + board.correctLetter + '. I put ' + board.correctLetter + ' in the gap.',
            prompt: 'Your turn. Which letter is missing in ' + gap + '?'
          };
        }
        return {
          model: 'My turn. In ' + W + ' I hear ' + first + ' first. That sound is spelled ' + g0 + '.',
          prompt: 'Your turn. Which letter makes the ' + first + ' sound in ' + W + '?'
        };
      case 'letter_tracing':
        if (board && norm(board.letter) !== norm(g0)) return {
          model: 'My turn. I trace the letter ' + board.letter + '.',
          prompt: 'Your turn. Trace ' + board.letter + '.'
        };
        return {
          model: 'My turn. I say ' + first + ' every time I trace ' + g0 + '.',
          prompt: 'Your turn. Trace ' + g0 + ' and say ' + first + '.'
        };
      case 'word_scramble':
        return {
          model: 'My turn. ' + W + '. I put the letters in order: ' + cleanLetters(w).split('').join(', ') + '.',
          prompt: 'Your turn. Put the letters in order to spell ' + W + '.'
        };
      case 'spelling_bee':
        return {
          model: 'My turn. ' + W + '. ' + sounds + '. Now I write one sound at a time.',
          prompt: 'Your turn. Say the sounds, then spell ' + W + '.'
        };
      case 'decoding':
        return {
          model: 'My turn. ' + sounds + '. ' + W + '.',
          prompt: 'Your turn. Sound it out. What word?'
        };
      case 'read_sentence':
        var sentence = board ? board.sentence : w.sentence;
        return {
          model: sentence
            ? 'My turn. I read the whole sentence first. "' + sentence + '"'
            : 'My turn. I read the whole sentence first, then I try each word.',
          prompt: 'Your turn. Read the sentence. Which word finishes it?'
        };
      case 'read_passage':
        if (board) return {
          model: 'My turn. I read the story. "' + board.story + '" The word ' + W + ' fills the gaps.',
          prompt: 'Your turn. Read the story. Which word fills the gaps?'
        };
        return {
          model: 'My turn. I read it once smoothly so you know how it should sound.',
          prompt: 'Your turn. Read it to me. Accuracy first, speed later.'
        };
      case 'sentence_match':
        if (board) return {
          model: 'My turn. The sentence says "' + board.sentence + '", so I place the pictures in this order: ' + board.sequence.join(', ') + '.',
          prompt: 'Your turn. Read the sentence and put its pictures in order.'
        };
        return {
          model: w.sentence
            ? 'My turn. The sentence says "' + w.sentence + '", so I look for the one showing ' + w.word + '.'
            : 'My turn. I read the whole sentence, then I look for the one that matches all of it.',
          prompt: 'Your turn. Which one shows the sentence?'
        };
      default:
        return {
          model: info.model ? 'My turn. ' + W + '.' : '',
          prompt: info.prompt || ('Your turn. ' + W + '.')
        };
    }
  }

  // Capitalize the first letter of the line and of each sentence after it.
  // Only a letter is touched, so "/or/ is spelled or." keeps its slashes.
  function sentenceCase(line) {
    var s = String(line || '').trim();
    if (!s) return '';
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return s.replace(/([.!?]\s+)([a-z])/g, function (_m, punct, ch) {
      return punct + ch.toUpperCase();
    });
  }

  /**
   * Some activities need a particular field to say anything sensible: rhyming
   * needs a rhyme word, Sound Swap needs a manipulation task, Read the Sentence
   * needs a sentence. Scripting from whichever word happened to sort first
   * printed "Storm and  rhyme. They both end with orm." on the teacher's page.
   * Pick the first assigned word that can actually carry the line.
   */
  var SCRIPT_WORD_REQUIREMENT = {
    rhyming: function (w) { return !!w.rhymeWord; },
    word_families: function (w) { return !!(w.rhymeWord && (w.familyEnding || w.graphemes)); },
    manipulation: function (w) { return !!(w.manipulationTask && w.manipulationTask.answer); },
    read_sentence: function (w) { return !!w.sentence; },
    sentence_match: function (w) { return !!w.sentence; },
    syllable_counting: function (w) { return w.syllableCount != null; },
    syllable_blending: function (w) { return w.syllableCount > 1 && w.syllables.length > 1; },
    mapping: function (w) { return !!w.graphemes; },
    missing_letter: function (w) { return !!w.graphemes; },
    word_scramble: function (w) { return !!cleanLetters(w); },
    letter_tracing: function (w) { return !!w.graphemes; }
  };
  function pickScriptWord(id, assigned, fallbackPool) {
    var need = SCRIPT_WORD_REQUIREMENT[id];
    var list = (assigned && assigned.length) ? assigned : [];
    var usable = function (w) {
      return preparedTaskReady(id, w) && (w.activityItems || !need || need(w));
    };
    var hit = list.filter(usable)[0];
    if (hit) return hit;
    // Nothing in this activity's own words works. A word from elsewhere in the
    // set still models the skill correctly, which beats a sentence with a hole
    // in it. If nothing in the whole set qualifies, fall back to the generic
    // wording by returning null.
    return (fallbackPool || []).filter(usable)[0] || null;
  }

  function taskSummary(id, w) {
    var board = w.activityItems && w.activityItems[id];
    if (w.activityItems && !preparedTaskReady(id, w)) return 'task needs review';
    if (id === 'syllable_counting' && w.syllableCount != null) return w.syllableCount + ' syllable' + (w.syllableCount === 1 ? '' : 's');
    if (!board) return '';
    if (id === 'isolation') return ordinal(board.position) + ' sound ' + slash(board.correctSound);
    if (id === 'sound_sort') return (board.mode === 'last' ? 'ending' : 'beginning') + ' sound ' + slash(board.targetChar);
    if (id === 'missing_letter') return ordinal(board.hiddenIndex) + ' letter ' + board.correctLetter;
    if (id === 'word_families') return '-' + String(board.rime).replace(/^-/, '') + ' family';
    if (id === 'rhyming') return 'rhymes with ' + board.answer;
    if (id === 'manipulation') return board.task.instruction + ' Answer: ' + board.task.answer;
    if (id === 'read_sentence' || id === 'sentence_match') return '"' + board.sentence + '"';
    return '';
  }

  function activitySay(id, w) {
    var raw = activitySayRaw(id, w);
    return { model: sentenceCase(raw.model), prompt: sentenceCase(raw.prompt) };
  }

  function describeFocus(analysis) {
    var focus = analysis.focusGpcs.slice(0, 3);
    if (focus.length) {
      return focus.map(function (g) {
        return 'the ' + slash(g.phoneme) + ' sound spelled ' + g.grapheme;
      }).join(', ');
    }
    var top = analysis.gpcs.filter(function (g) { return g.focusEligible; }).slice(0, 2);
    if (top.length) {
      return top.map(function (g) {
        return 'the ' + slash(g.phoneme) + ' sound spelled ' + g.grapheme;
      }).join(' and ');
    }
    return 'the sounds in this word set';
  }

  /**
   * Round-robin word allocation. Each activity gets its planned count drawn in
   * order and wrapping, so a plan asking for more items than there are words
   * repeats them evenly instead of exhausting the list on the first activity.
   */
  function allocate(words, activities) {
    var out = {};
    var cursor = 0;
    activities.forEach(function (a) {
      var take = [];
      var wanted = Math.max(0, Number(a.count) || 0);
      for (var i = 0; i < wanted && words.length; i++) {
        take.push(words[cursor % words.length]);
        cursor++;
      }
      out[a.id] = take;
    });
    return out;
  }

  function correctionSection(mastery) {
    return {
      id: 'correction',
      title: 'Correction procedure',
      minutes: 0,
      intent: 'Use this the moment an error happens, not at the end.',
      steps: [
        { step: 'Model', teacherSays: 'Listen. This one is ___.', note: 'Give the answer immediately. Do not let the child keep guessing.' },
        { step: 'Lead', teacherSays: 'Say it with me. ___.', note: 'Say it together until it is smooth. Two or three times is normal.' },
        { step: 'Test', teacherSays: 'Your turn. ___?', note: 'The child answers alone. If it is still wrong, model again.' },
        { step: 'Delayed test', teacherSays: 'Come back to it after two or three other items.', note: 'An item is only fixed when it is right after a gap.' }
      ],
      notes: [
        'Do not say "no" or "wrong". Give the answer, practise it together, then hand it back.',
        'Keep the pace brisk. Long pauses after an error are what turn a small miss into a large one.',
        'Mastery for this lesson is ' + mastery + ' consecutive correct on an item before moving on.'
      ]
    };
  }

  /**
   * buildLessonScript(analysis, plan, opts) -> script
   *
   * `plan` is the lesson-plan config the setup screen already produces:
   *   { activities: [{id, count}], order: [...], masteryThreshold, estimatedMinutes }
   * When it is absent (Quick Practice), the script still builds. It just covers
   * the whole word set with the default activity emphasis rather than a plan.
   */
  function buildLessonScript(analysis, plan, opts) {
    opts = opts || {};
    // opts.translate(key, params) is the host's ts(): '' on a miss.
    var say = typeof opts.translate === 'function' ? opts.translate : null;
    var mastery = Math.max(1, Number(plan && plan.masteryThreshold) || 3);
    var activities = (plan && Array.isArray(plan.activities) && plan.activities.length)
      ? plan.activities.filter(function (a) { return a && a.id; })
      : [];
    var planned = activities.length > 0;

    var words = analysis.words;
    var allocation = allocate(words, activities);

    // Strand emphasis decides the model/lead wording. With no plan, a word set
    // is treated as phonemic-awareness first, which is the Word Sounds default.
    var strandCounts = {};
    activities.forEach(function (a) {
      var s = activityInfo(a.id).strand;
      strandCounts[s] = (strandCounts[s] || 0) + (Number(a.count) || 1);
    });
    var primaryStrand = STRAND_ORDER.filter(function (s) { return strandCounts[s]; })[0] || 'phonemic_awareness';

    var focusText = describeFocus(analysis);

    // Model and lead on words that actually carry the pattern. Taking the first
    // two words in list order would happily open the lesson on the one word that
    // is nothing like the rest of the set.
    var focusSoundKeys = analysis.focusGpcs.map(function (g) { return g.soundKey; });
    var teachingOrder = words.slice().sort(function (a, b) {
      var score = function (w) {
        return w.soundKeys.filter(function (key) { return focusSoundKeys.indexOf(key) >= 0; }).length;
      };
      var d = score(b) - score(a);
      if (d) return d;
      // Shorter words first among equals: fewer sounds is the easier model.
      return a.phonemeCount - b.phonemeCount;
    });
    var modelWords = teachingOrder.slice(0, 2);
    var leadWords = teachingOrder.slice(2, 5).length ? teachingOrder.slice(2, 5) : teachingOrder.slice(0, 3);

    var objective = 'Given ' + analysis.wordCount + ' words built on ' + focusText
      + ', students will ' + STRAND_OBJECTIVE_VERB[primaryStrand]
      + ', with ' + mastery + ' consecutive correct responses per item.';

    var sections = [];

    // 1. Sound warm-up
    // Focus sounds lead the warm-up. Pure frequency ordering buries the sound
    // the lesson is about under whichever consonant happens to recur most.
    var warmupPhonemes = analysis.phonemes.slice().sort(function (a, b) {
      var aF = focusSoundKeys.indexOf(a.soundKey) >= 0 ? 1 : 0;
      var bF = focusSoundKeys.indexOf(b.soundKey) >= 0 ? 1 : 0;
      if (aF !== bF) return bF - aF;
      return b.wordCount - a.wordCount;
    }).slice(0, 6);
    sections.push({
      id: 'warmup',
      title: 'Sound warm-up',
      minutes: 2,
      intent: 'Get the sounds in this lesson fluent before any word is read.',
      teacherDoes: [
        'Show or say each sound below. Keep it fast. Aim for about one sound per second.',
        'Any sound the group is slow on is the one to model again before you start.'
      ],
      teacherSays: [
        'We are warming up our sounds. When I point, you say the sound.',
        'My turn first. ' + (warmupPhonemes[0] ? slash(warmupPhonemes[0].phoneme) : slash('_')) + '.',
        'Your turn.'
      ],
      items: warmupPhonemes.map(function (p) {
        return {
          primary: slash(p.phoneme),
          secondary: p.category + ', in ' + p.wordCount + ' word' + (p.wordCount === 1 ? '' : 's')
            + ' (' + p.positions.join(', ') + ')'
        };
      })
    });

    // 2. Model
    sections.push({
      id: 'model',
      title: 'Model. "My turn"',
      minutes: 3,
      intent: 'The child watches. They do not respond yet.',
      teacherDoes: [
        'Do every step yourself, out loud, at normal speed.',
        'Two examples are enough. A third is usually one too many.'
      ],
      teacherSays: modelWords.length ? modelWords.reduce(function (acc, w) {
        if (primaryStrand === 'phonemic_awareness') {
          acc.push('Watch me. I am going to say the sounds in this word, then say the word.');
          acc.push(soundsOf(w) + '. ' + cap(w.word) + '.');
        } else if (primaryStrand === 'encoding') {
          acc.push('Watch me. I say the word, then the sounds, then I write each sound.');
          acc.push(cap(w.word) + '. ' + soundsOf(w) + '.');
        } else {
          acc.push('Watch me read this word. I say each sound, then I put them together.');
          acc.push(soundsOf(w) + '. ' + cap(w.word) + '.');
        }
        return acc;
      }, []) : ['Watch me.'],
      items: modelWords.map(function (w) {
        return { primary: w.word, secondary: soundsOf(w) + '  ·  ' + w.shape + '  ·  ' + w.syllableType };
      })
    });

    // 3. Lead
    sections.push({
      id: 'lead',
      title: 'Lead. "Together"',
      minutes: 4,
      intent: 'You and the child do it at the same time. Your voice fades as theirs holds.',
      teacherDoes: [
        'Say it with them. Drop your volume on the second and third repetition.',
        'Stay on this step until the group is together. Moving on early is what produces the errors you then have to correct.'
      ],
      teacherSays: ['Say it with me. Ready.'].concat(leadWords.map(function (w) {
        return soundsOf(w) + '. ' + cap(w.word) + '.';
      })).concat(['Again, a little faster.']),
      items: leadWords.map(function (w) {
        return { primary: w.word, secondary: soundsOf(w) + '  ·  ' + w.shape };
      })
    });

    // 4. Test blocks, one per planned activity, in the teacher's order
    var testSections = activities.map(function (a, idx) {
      var info = activityInfo(a.id);
      var assigned = allocation[a.id] || [];
      return {
        id: 'test_' + a.id,
        title: 'Your turn ' + (idx + 1) + '. ' + info.label,
        minutes: Math.max(1, Math.ceil((Number(a.count) || 0) * 0.5)),
        strand: STRAND_LABEL[info.strand],
        intent: info.teaches,
        teacherDoes: [
          'The child works in the app. You watch and score, you do not prompt unless there is an error.',
          info.watchFor ? 'Watch for: ' + info.watchFor : ''
        ].filter(Boolean),
        // Scripted from the first word this activity actually gets, so the
        // teacher reads a sentence rather than filling in blanks at the table.
        teacherSays: (function () {
          var say = activitySay(a.id, pickScriptWord(a.id, assigned, words));
          return [say.model, say.prompt].filter(Boolean);
        })(),
        items: assigned.map(function (w) {
          return {
            primary: w.word,
            secondary: soundsOf(w) + '  ·  ' + w.phonemeCount + ' sounds'
              + (taskSummary(a.id, w) ? '  ·  ' + taskSummary(a.id, w) : '')
              + (!w.activityItems && a.id === 'read_sentence' && w.sentence ? '  ·  "' + w.sentence + '"' : '')
              + (!w.activityItems && a.id === 'rhyming' && w.rhymeWord ? '  ·  rhymes with ' + w.rhymeWord : '')
              + (!w.activityItems && a.id === 'word_families' && w.familyEnding ? '  ·  ' + w.familyEnding : '')
          };
        }),
        mastery: mastery
      };
    });
    sections = sections.concat(testSections);

    // 5. Correction procedure
    sections.push(correctionSection(mastery));

    // 6. Close
    sections.push({
      id: 'close',
      title: 'Check and close',
      minutes: 2,
      intent: 'Decide what happens tomorrow before the child leaves the table.',
      teacherDoes: [
        'Re-test two items the child missed earlier. Those are the ones that tell you whether the lesson held.',
        'Any correspondence still wrong after correction goes into the next warm-up.',
        'A child at ' + mastery + ' consecutive correct across the set is ready for the next pattern. Below that, reteach this one.'
      ],
      teacherSays: [
        'Let me hear these two again.',
        'Tell me one word you can read now that you could not read before.'
      ],
      items: []
    });

    var totalMinutes = sections.reduce(function (sum, s) { return sum + (s.minutes || 0); }, 0);

    return {
      version: VERSION,
      generatedFrom: {
        wordCount: analysis.wordCount,
        planned: planned,
        activityCount: activities.length,
        grade: analysis.grade,
        language: analysis.language
      },
      title: (say && say('word_sounds.di_script_full_title')) || 'Direct Instruction lesson script',
      subtitle: (analysis.grade ? analysis.grade + '  ·  ' : '')
        + (planned
          ? (say && say('word_sounds.di_subtitle_planned', { words: analysis.wordCount, activities: activities.length })) || (analysis.wordCount + ' words  ·  ' + activities.length + ' activities')
          : (say && say('word_sounds.di_subtitle_quick', { words: analysis.wordCount })) || (analysis.wordCount + ' words  ·  Quick Practice')),
      objective: objective,
      focusText: focusText,
      primaryStrand: STRAND_LABEL[primaryStrand],
      mastery: mastery,
      estimatedMinutes: totalMinutes,
      materials: [
        'The word list in this script, on the table or on the board.',
        'The device running Word Sounds, with this pack loaded.',
        planned ? 'The lesson plan you built, in this order.' : 'Quick Practice mode.',
        'Somewhere to mark which items were missed. The correction procedure depends on you remembering them.'
      ],
      sections: sections,
      wordList: analysis.words.map(function (w) {
        return {
          word: w.word,
          sounds: soundsOf(w),
          count: w.phonemeCount,
          shape: w.shape,
          syllableType: w.syllableType,
          graphemes: w.graphemes ? w.graphemes.join(' | ') : '',
          estimated: w.estimated
        };
      }),
      // Everything the teacher should know about how trustworthy this is.
      caveats: [].concat(
        analysis.estimatedWords.length
          ? [(say && say('word_sounds.di_caveat_estimated', { words: analysis.estimatedWords.join(', ') })) || ('Sounds for ' + analysis.estimatedWords.join(', ') + ' were estimated from spelling, not looked up. Check them before you read them aloud.')]
          : [],
        analysis.unalignedWords.length
          ? [(say && say('word_sounds.di_caveat_unaligned', { words: analysis.unalignedWords.join(', ') })) || ('Letters could not be matched to sounds for ' + analysis.unalignedWords.join(', ') + '. The sound-mapping steps for those words need your own alignment.')]
          : [],
        analysis.focusGpcs.length
          ? []
          : [(say && say('word_sounds.di_caveat_no_pattern')) || 'No single pattern repeats across this word set, so the objective below is written broadly. A tighter word list produces a tighter lesson.'],
        [(say && say('word_sounds.di_caveat_generated')) || 'This script is generated from the word list. It is a starting point for your planning, not a curriculum, and it has not been reviewed by anyone but you.']
      )
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Plain-text rendering, for copy-to-clipboard and for tests.
  // ──────────────────────────────────────────────────────────────────────
  function scriptToText(script, opts) {
    if (!script) return '';
    var say = opts && typeof opts.translate === 'function' ? opts.translate : null;
    var out = [];
    out.push(script.title);
    out.push(script.subtitle);
    out.push('');
    out.push(((say && say('word_sounds.di_heading_objective')) || 'Objective').toUpperCase());
    out.push(script.objective);
    out.push('');
    out.push((say && say('word_sounds.di_timing', { minutes: script.estimatedMinutes, mastery: script.mastery })) || ('About ' + script.estimatedMinutes + ' minutes. Mastery: ' + script.mastery + ' consecutive correct.'));
    out.push('');
    out.push(((say && say('word_sounds.di_heading_materials')) || 'Materials').toUpperCase());
    script.materials.forEach(function (m) { out.push('  - ' + m); });
    out.push('');
    script.sections.forEach(function (s) {
      out.push('----------------------------------------');
      out.push(s.title.toUpperCase() + (s.minutes ? '  (' + s.minutes + ' min)' : ''));
      if (s.intent) out.push(s.intent);
      if (s.strand) out.push('Strand: ' + s.strand);
      out.push('');
      (s.teacherSays || []).forEach(function (line) { out.push('  SAY: ' + line); });
      (s.teacherDoes || []).forEach(function (line) { out.push('  DO:  ' + line); });
      (s.steps || []).forEach(function (st) {
        out.push('  ' + st.step + ': "' + st.teacherSays + '"');
        out.push('        ' + st.note);
      });
      if (s.items && s.items.length) {
        out.push('');
        s.items.forEach(function (it) {
          out.push('    ' + it.primary + (it.secondary ? '   ' + it.secondary : ''));
        });
      }
      (s.notes || []).forEach(function (line) { out.push('  * ' + line); });
      out.push('');
    });
    out.push('----------------------------------------');
    out.push(((say && say('word_sounds.di_heading_word_list')) || 'Word list').toUpperCase());
    script.wordList.forEach(function (w) {
      out.push('  ' + w.word + '   ' + w.sounds + '   ' + w.count + ' sounds   ' + w.shape + '   ' + w.syllableType
        + (w.estimated ? '   [estimated]' : ''));
    });
    out.push('');
    out.push(((say && say('word_sounds.di_heading_caveats')) || 'Before you teach this').toUpperCase());
    script.caveats.forEach(function (c) { out.push('  - ' + c); });
    return out.join('\n');
  }

  /**
   * presenterLines(id, item, opts) -> { model, prompt } | null
   *
   * One word's "My turn" and "Your turn" lines for the projected class
   * presenter, from the same rules as the printed script. Null when the
   * language is not English or the word cannot carry the line.
   */
  function presenterLines(id, item, opts) {
    opts = opts || {};
    if (!item || !supportsLanguage(opts.language)) return null;
    var pool = Array.isArray(opts.words) && opts.words.length ? opts.words : [item];
    var w = analyzeWord(item, opts.language, pool, opts.voice, WS_CORE.packAudioAssets(pool));
    if (!w.word || !w.phonemeCount || !preparedTaskReady(id, w)) return null;
    var need = SCRIPT_WORD_REQUIREMENT[id];
    if (!w.activityItems && need && !need(w)) return null;
    return activitySay(id, w);
  }

  var api = {
    VERSION: VERSION,
    supportsLanguage: supportsLanguage,
    analyzeWordSet: analyzeWordSet,
    buildLessonScript: buildLessonScript,
    scriptToText: scriptToText,
    presenterLines: presenterLines,
    ACTIVITY_SKILLS: ACTIVITY_SKILLS,
    // Exposed for tests and for a future on-screen prompt renderer.
    _analyzeWord: analyzeWord,
    _classifyPhoneme: classifyPhoneme,
    _alignGraphemes: alignGraphemes
  };

  if (typeof window !== 'undefined') window.AlloWordSoundsDI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
