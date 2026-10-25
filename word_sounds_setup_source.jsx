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
      instruction: 'Sound Swap has a checked sound change for only a small set of words, and this word is not one of them. Choose another activity.',
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
    // Word family and sight word presets — exposed by AlloFlowANTI.txt on window
    // Use Proxy so reads happen at USE time (the module loads BEFORE AlloFlowANTI.txt populates window)
    const WORD_FAMILY_PRESETS = new Proxy({}, {
      get: (_, prop) => (window.WORD_FAMILY_PRESETS || {})[prop],
      ownKeys: () => Object.keys(window.WORD_FAMILY_PRESETS || {}),
      getOwnPropertyDescriptor: (_, prop) => {
        const src = window.WORD_FAMILY_PRESETS || {};
        if (prop in src) return { enumerable: true, configurable: true, value: src[prop] };
      },
      has: (_, prop) => prop in (window.WORD_FAMILY_PRESETS || {})
    });
    const SIGHT_WORD_PRESETS = new Proxy({}, {
      get: (_, prop) => (window.SIGHT_WORD_PRESETS || {})[prop],
      ownKeys: () => Object.keys(window.SIGHT_WORD_PRESETS || {}),
      getOwnPropertyDescriptor: (_, prop) => {
        const src = window.SIGHT_WORD_PRESETS || {};
        if (prop in src) return { enumerable: true, configurable: true, value: src[prop] };
      },
      has: (_, prop) => prop in (window.SIGHT_WORD_PRESETS || {})
    });

    // ── Phoneme Voice Pack (extension to Word Sounds Studio) ──
    // The phoneme audio bank (window.__ALLO_PHONEME_AUDIO_BANK) is a swappable
    // table of data-URI clips keyed by phoneme. The AI only SELECTS/SEQUENCES
    // keys (callGemini returns a phoneme array, the player looks up the bank), so
    // writing a teacher's own recordings into the bank personalizes every
    // activity with ZERO change to the AI layer. This editor records/edits those
    // clips, applies them live (Proxy set-trap), persists them, and lets a teacher
    // export/import a portable JSON pack to reuse or share.
    const PHONEME_PACK_STORAGE_KEY = 'allo_phoneme_voice_pack_v1'; // legacy single pack (migrated into the library)
    const PHONEME_PACK_LIB_KEY = 'allo_phoneme_voice_packs_v1';    // library: { activeId, packs: [{ id, name, kind, consent, clips, history, studentName, studentId }] }
    const PHONEME_PACK_GROUPS = {
        'Consonants': ['b','c','d','f','g','h','j','k','l','m','n','p','r','s','t','v','w','y','z'],
        'Digraphs': ['sh','zh','ch','th','dh','wh','ph','ck','ng','q'],
        'Short Vowels': ['a','e','i','o','u','oo_short'],
        'Long Vowels': ['ee','oo','ue','aw','oa'],
        'Diphthongs': ['ay','ie','ow','oy'],
        'R-Controlled': ['ar','er','ir','or','ur','air','ear'],
    };
    const PHONEME_PACK_ALIASES = { ai: 'ay', ea: 'ee' };
    const PHONEME_PACK_EXAMPLES = { b:'ball', c:'cat', d:'dog', f:'fish', g:'goat', h:'hat', j:'jam', k:'kite', l:'leg', m:'man', n:'net', p:'pig', r:'red', s:'sun', t:'top', v:'van', w:'win', y:'yes', z:'zip', sh:'ship', zh:'measure', ch:'chip', th:'thumb', dh:'this', wh:'whale', ph:'phone', ck:'duck', ng:'ring', q:'queen', a:'apple', e:'egg', i:'igloo', o:'octopus', u:'up', oo_short:'book', ee:'tree', oo:'moon', ue:'blue', aw:'paw', oa:'boat', ay:'play', ie:'pie', ow:'cow', oy:'boy', ar:'car', er:'her', ir:'bird', or:'fork', ur:'fur', air:'chair', ear:'ear' };
    // Kid-friendly articulatory cues — turns each recording into a mini phonics
    // lesson: how the mouth makes the sound, whether it is voiced ("buzzy") or
    // unvoiced ("quiet"), and whether it is a continuant ("stretch it") or a stop
    // ("quick"). This both teaches articulation AND helps produce a clean clip
    // (clipped stop vs an added schwa, e.g. /p/ not "puh").
    const PHONEME_PACK_CUES = {
        b: 'Lips together, pop WITH voice, buzzy. Quick.',
        c: 'Back of tongue up, quiet pop /k/. Quick.',
        d: 'Tongue taps behind top teeth, with voice. Quick.',
        f: 'Top teeth on bottom lip, push quiet air. Stretch it: fffff.',
        g: 'Back of tongue up, with voice. Quick.',
        h: 'Open mouth, just breathe out. Quiet.',
        j: 'Like /d/ + /zh/ together (jam). Quick.',
        k: 'Back of tongue up, quiet pop. Quick.',
        l: 'Tongue tip up behind teeth, voice on. Stretch it: llll.',
        m: 'Lips together, hum. Stretch it: mmmm.',
        n: 'Tongue behind top teeth, hum. Stretch it: nnnn.',
        p: 'Lips together, quiet pop, no voice. Quick.',
        r: 'Tongue pulled back, lips a little round. Stretch it.',
        s: 'Smile, tongue near teeth, hiss, no voice. Stretch it: sssss.',
        t: 'Tongue taps behind top teeth, no voice. Quick.',
        v: 'Top teeth on bottom lip + voice (buzz). Stretch it.',
        w: 'Round your lips, then glide. Voice on.',
        y: 'Tongue high, then glide (yes). Voice on.',
        z: 'Like /s/ but buzzing. Stretch it: zzzz.',
        sh: 'Lips rounded, push quiet air, "shhh". Stretch it.',
        zh: 'Like /sh/ but WITH voice (treasure).',
        ch: 'Like /t/ + /sh/ together (chip). Quick.',
        th: 'Tongue tip between teeth, push air.',
        dh: 'Tongue tip between teeth WITH voice; feel the throat buzz.',
        wh: 'Round lips, blow (whale).',
        ph: 'Same as /f/: teeth on lip, push air.',
        ck: 'Same as /k/: back of tongue, quiet pop. Quick.',
        ng: 'Back of tongue up, hum through your nose (ring).',
        q: 'Usually /kw/: quiet /k/, then round lips (queen).',
        a: 'Open mouth, short /a/ (apple).',
        e: 'Mouth a little open, short /e/ (egg).',
        i: 'Small smile, short /i/ (igloo).',
        o: 'Round mouth, short /o/ (octopus).',
        u: 'Relaxed mouth, short /u/ (up).',
        oo_short: 'Short /oo/ (book), lips a little round.',
        ee: 'Big smile, long /ee/ (tree/leaf). Stretch it.',
        oo: 'Round lips, long /oo/ (moon). Stretch it.',
        ue: 'Long /u/ (blue), round lips.',
        aw: 'Open round mouth /aw/ (paw).',
        oa: 'Long /o/ (boat), say the letter O.',
        ay: 'Long /a/ (play/rain), say the letter A.',
        ie: 'Long /i/ (pie), say the letter I.',
        ow: 'Round, then open (cow).',
        oy: 'Round, then smile (boy).',
        ar: 'Open /ar/ (car).',
        er: 'Tongue back, /er/ (her).',
        ir: 'Same as /er/ (bird).',
        or: 'Round /or/ (fork).',
        ur: 'Same as /er/ (fur).',
        air: 'Open /air/ (chair).',
        ear: 'Long /ear/ (ear).',
    };
    // Decodable words for the "hear a word in your own voice" payoff: each maps
    // to a sequence of phoneme KEYS (same keys as the bank), so a word unlocks
    // once the student has recorded every sound in it, then plays blended from
    // their own clips. Ordered easy (CVC) -> digraphs -> long vowels.
    const PHONEME_PACK_WORDS = [
        { word: 'cat', keys: ['c','a','t'] },
        { word: 'dog', keys: ['d','o','g'] },
        { word: 'sun', keys: ['s','u','n'] },
        { word: 'pig', keys: ['p','i','g'] },
        { word: 'hat', keys: ['h','a','t'] },
        { word: 'map', keys: ['m','a','p'] },
        { word: 'bed', keys: ['b','e','d'] },
        { word: 'cup', keys: ['c','u','p'] },
        { word: 'net', keys: ['n','e','t'] },
        { word: 'jam', keys: ['j','a','m'] },
        { word: 'van', keys: ['v','a','n'] },
        { word: 'zip', keys: ['z','i','p'] },
        { word: 'fish', keys: ['f','i','sh'] },
        { word: 'ship', keys: ['sh','i','p'] },
        { word: 'chip', keys: ['ch','i','p'] },
        { word: 'duck', keys: ['d','u','ck'] },
        { word: 'ring', keys: ['r','i','ng'] },
        { word: 'moon', keys: ['m','oo','n'] },
        { word: 'rain', keys: ['r','ay','n'] },
        { word: 'boat', keys: ['b','oa','t'] },
    ];
    // Show the example word with its target grapheme bolded (sound <-> symbol):
    // /sh/ -> "ship", /a/ -> "cat". Falls back to plain text if the grapheme is
    // not a literal substring of the example.
    function phonemePackLabel(key) {
        return key === 'oo_short' ? 'oo' : (key === 'dh' ? 'ð' : key);
    }
    function phonemePackGrapheme(key) {
        return key === 'oo_short' ? 'oo' : (key === 'dh' ? 'th' : key);
    }
    function renderExampleWithGrapheme(key, word) {
        if (!word) return null;
        const g = phonemePackGrapheme(key);
        const idx = word.toLowerCase().indexOf(g.toLowerCase());
        if (idx < 0) return <span>like {word}</span>;
        return <span>like {word.slice(0, idx)}<b className="text-violet-700">{word.slice(idx, idx + g.length)}</b>{word.slice(idx + g.length)}</span>;
    }
    function loadPhonemeVoicePack() {
        try {
            const raw = localStorage.getItem(PHONEME_PACK_STORAGE_KEY);
            if (!raw) return { name: 'My Voice Pack', clips: {}, kind: 'teacher-model', consent: false, history: {} };
            const p = JSON.parse(raw);
            return { name: (p && p.name) || 'My Voice Pack', clips: (p && p.clips && typeof p.clips === 'object') ? p.clips : {}, kind: (p && p.kind === 'student-voice') ? 'student-voice' : 'teacher-model', consent: !!(p && p.consent), history: (p && p.history && typeof p.history === 'object') ? p.history : {} };
        } catch (e) { return { name: 'My Voice Pack', clips: {}, kind: 'teacher-model', consent: false, history: {} }; }
    }
    function applyPhonemeVoicePackToBank(clips) {
        try {
            if (!window.__ALLO_PHONEME_AUDIO_BANK) return 0;
            clips = clips || {};
            // Authoritative: for every canonical phoneme key, set the custom clip OR
            // revert to the default. Reverting (vs only writing customs) is what makes
            // a CLEARED sound stop playing. Guard: only revert when a default actually
            // exists, so we never wipe the bank before audio_bank.json has loaded.
            const allKeys = Object.keys(PHONEME_PACK_GROUPS).reduce((a, g) => a.concat(PHONEME_PACK_GROUPS[g]), []);
            let n = 0;
            allKeys.forEach((k) => {
                if (clips[k]) { window.__ALLO_PHONEME_AUDIO_BANK[k] = clips[k]; n++; }
                else { try { const d = (typeof window.getAudio === 'function') ? window.getAudio('phonemes', k) : null; if (d) window.__ALLO_PHONEME_AUDIO_BANK[k] = d; } catch (e) {} }
            });
            return n;
        } catch (e) { return 0; }
    }
    // Instruction + reinforcer SLOTS for the Voice Pack. Each slot is ONE friendly
    // thing to record; recording it overrides a whole group of underlying
    // __ALLO_INSTRUCTION_AUDIO keys at once — so a personalized cheer plays
    // consistently even though the reinforcer playback otherwise randomizes across
    // a pool of fb_* clips. Same swappable-bank pattern as the phoneme pack.
    const PHONEME_PACK_CHEERS = [
        { id: 'cheer_correct', label: 'Correct! cheer', hint: 'Plays on most right answers (e.g. "Great job!")', keys: ['fb_great_job', 'fb_nice', 'fb_keep_going', 'fb_way_to_go', 'fb_perfect', 'fb_correct', 'fb_you_got_it'] },
        { id: 'cheer_streak', label: 'Hot-streak cheer', hint: 'For 5+ right in a row', keys: ['fb_on_fire', 'fb_excellent', 'fb_wow'] },
        { id: 'cheer_levelup', label: 'Level-up cheer', hint: 'When they reach a new level', keys: ['fb_amazing'] },
        { id: 'cheer_tryagain', label: 'Try-again (gentle)', hint: 'Encouragement after a miss', keys: ['fb_try_again_listen', 'fb_almost'] },
    ];
    const PHONEME_PACK_INSTRS = [
        { id: 'how_many_sounds', label: 'How many sounds? (Counting)', keys: ['how_many_sounds'] },
        { id: 'listen_to_sounds', label: 'Listen & blend (Blending)', keys: ['listen_to_sounds'] },
        { id: 'break_the_word', label: 'Break it down (Segmentation)', keys: ['break_the_word'] },
        { id: 'which_word_rhymes', label: 'Which word rhymes? (Rhyme Time)', keys: ['which_word_rhymes'] },
        { id: 'trace_the_letter', label: 'Trace the letter', keys: ['trace_the_letter'] },
        { id: 'match_sounds_to_letters', label: 'Match sounds to letters (Mapping)', keys: ['match_sounds_to_letters'] },
        { id: 'spell_the_word', label: 'Spell the word', keys: ['spell_the_word'] },
        { id: 'sort_the_sounds', label: 'Sort the sounds (Sound Sort)', keys: ['sort_the_sounds'] },
        { id: 'find_word_family', label: 'Find the word family', keys: ['find_word_family'] },
        { id: 'unscramble_the_word', label: 'Unscramble the word', keys: ['unscramble_the_word'] },
        { id: 'find_missing_letter', label: 'Find the missing letter', keys: ['find_missing_letter'] },
    ];
    const INSTR_SLOT_KEYS = (function () { const m = {}; PHONEME_PACK_CHEERS.concat(PHONEME_PACK_INSTRS).forEach((s) => { m[s.id] = s.keys; }); return m; })();
    function applyInstrToBank(instr) {
        try {
            if (!window.__ALLO_INSTRUCTION_AUDIO) return 0;
            instr = instr || {};
            // Authoritative (same as the phoneme bank): a cleared cheer/instruction
            // slot reverts its keys to the default, only when a default exists.
            let n = 0;
            Object.keys(INSTR_SLOT_KEYS).forEach((slot) => {
                const clip = instr[slot];
                INSTR_SLOT_KEYS[slot].forEach((k) => {
                    if (clip) { window.__ALLO_INSTRUCTION_AUDIO[k] = clip; n++; }
                    else { try { const d = (typeof window.getAudio === 'function') ? window.getAudio('instructions', k) : null; window.__ALLO_INSTRUCTION_AUDIO[k] = (d || null); } catch (e) {} }
                });
            });
            return n;
        } catch (e) { return 0; }
    }
    function instrReferenceClip(slot) {
        // The DEFAULT recording for a slot, from the raw instruction bank (original
        // even after an override), so the user can hear it before recording.
        try { const keys = INSTR_SLOT_KEYS[slot] || [slot]; return (typeof window.getAudio === 'function') ? window.getAudio('instructions', keys[0]) : null; } catch (e) { return null; }
    }
    // ── Voice Pack LIBRARY (Phase 1): manage several named packs on one device.
    // Each pack carries an optional studentName/studentId slot so a later phase
    // can bind packs to the class roster without a data-model change.
    function genPhonemePackId() {
        try { return 'pk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); } catch (e) { return 'pk_' + Math.floor((typeof performance !== 'undefined' && performance.now ? performance.now() : 0)); }
    }
    function normalizePhonemePack(p) {
        p = p || {};
        const clips = Object.assign({}, (p.clips && typeof p.clips === 'object') ? p.clips : {});
        Object.keys(PHONEME_PACK_ALIASES).forEach((alias) => {
            const canonical = PHONEME_PACK_ALIASES[alias];
            if (!clips[canonical] && clips[alias]) clips[canonical] = clips[alias];
            delete clips[alias];
        });
        return {
            id: p.id || genPhonemePackId(),
            name: p.name || 'Voice Pack',
            kind: p.kind === 'student-voice' ? 'student-voice' : 'teacher-model',
            consent: p.consent === true,
            clips,
            instr: (p.instr && typeof p.instr === 'object') ? p.instr : {}, // instruction + reinforcer overrides, keyed by slot id
            history: (function () {
                const out = {};
                if (p.history && typeof p.history === 'object') {
                    Object.keys(p.history).forEach((k) => { if (Array.isArray(p.history[k])) out[k] = p.history[k]; });
                    Object.keys(PHONEME_PACK_ALIASES).forEach((alias) => {
                        const canonical = PHONEME_PACK_ALIASES[alias];
                        if (out[alias]) out[canonical] = (out[canonical] || []).concat(out[alias]).sort((a, b) => (a?.ts || 0) - (b?.ts || 0));
                        delete out[alias];
                    });
                }
                return out;
            })(),
            studentName: typeof p.studentName === 'string' ? p.studentName : '',
            studentId: p.studentId || null,
        };
    }
    function loadVoicePackLibrary() {
        try {
            const raw = localStorage.getItem(PHONEME_PACK_LIB_KEY);
            if (raw) {
                const lib = JSON.parse(raw);
                if (lib && Array.isArray(lib.packs) && lib.packs.length) {
                    const packs = lib.packs.filter((p) => p && p.id).map(normalizePhonemePack);
                    if (packs.length) {
                        const activeId = packs.find((p) => p.id === lib.activeId) ? lib.activeId : packs[0].id;
                        return { activeId, packs };
                    }
                }
            }
            // migrate a legacy single pack, if it has any content
            const legacy = loadPhonemeVoicePack();
            if (legacy && (Object.keys(legacy.clips || {}).length || Object.keys(legacy.history || {}).length)) {
                const p = normalizePhonemePack(Object.assign({ id: 'pk_legacy' }, legacy));
                return { activeId: p.id, packs: [p] };
            }
        } catch (e) {}
        const p = normalizePhonemePack({ name: 'My Voice Pack' });
        return { activeId: p.id, packs: [p] };
    }
    function getActiveVoicePackClips() {
        const lib = loadVoicePackLibrary();
        const a = lib.packs.find((p) => p.id === lib.activeId) || lib.packs[0];
        return (a && a.clips) || {};
    }
    function phonemeReferenceClip(key) {
        // The DEFAULT pre-recorded clip for a phoneme, read from the raw audio
        // bank via window.getAudio — this reads _AUDIO_BANK directly, so it is the
        // ORIGINAL model voice even after a custom pack overrides the live bank.
        try { return (typeof window.getAudio === 'function') ? window.getAudio('phonemes', key) : null; } catch (e) { return null; }
    }
    function parsePhonemePackJsonLoose(s) {
        try { if (!s) return null; const m = String(s).match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; } catch (e) { return null; }
    }
    // Encode trimmed/normalized mono PCM as a small 16-bit WAV data URI. Browsers
    // can't re-encode to opus in-page, but WAV plays fine via new Audio() and a
    // trimmed phoneme is short, so size stays modest.
    function encodePhonemeWav(data, start, outLen, sampleRate, gain) {
        const dataSize = outLen * 2;
        const ab = new ArrayBuffer(44 + dataSize);
        const view = new DataView(ab);
        const ws = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
        ws(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); ws(8, 'WAVE'); ws(12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
        ws(36, 'data'); view.setUint32(40, dataSize, true);
        let off = 44;
        for (let i = 0; i < outLen; i++) {
            let s = data[start + i] * gain;
            if (s > 1) s = 1; else if (s < -1) s = -1;
            view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            off += 2;
        }
        let bin = ''; const bytes = new Uint8Array(ab); const CH = 0x8000;
        for (let i = 0; i < bytes.length; i += CH) { bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH)); }
        return 'data:audio/wav;base64,' + btoa(bin);
    }
    // Trim leading/trailing silence + normalize loudness so hand-recorded phonemes
    // blend smoothly (no dead air or wildly different volumes). Fully on-device;
    // returns the ORIGINAL clip unchanged if WebAudio/decoding is unavailable.
    async function cleanPhonemeClip(dataUri) {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC || !dataUri || typeof fetch !== 'function') return dataUri;
            const arr = await (await fetch(dataUri)).arrayBuffer();
            const ctx = new AC();
            let buf;
            try { buf = await ctx.decodeAudioData(arr.slice(0)); } catch (e) { if (ctx.close) ctx.close(); return dataUri; }
            const len = buf.length, chs = buf.numberOfChannels;
            if (!len) { if (ctx.close) ctx.close(); return dataUri; }
            const data = new Float32Array(len);
            for (let c = 0; c < chs; c++) { const cd = buf.getChannelData(c); for (let i = 0; i < len; i++) data[i] += cd[i] / chs; }
            let peak = 0; for (let i = 0; i < len; i++) { const a = data[i] < 0 ? -data[i] : data[i]; if (a > peak) peak = a; }
            if (peak <= 0.0001) { if (ctx.close) ctx.close(); return dataUri; }
            const thresh = Math.max(0.015, peak * 0.08);
            let start = 0; while (start < len && (data[start] < 0 ? -data[start] : data[start]) < thresh) start++;
            let end = len - 1; while (end > start && (data[end] < 0 ? -data[end] : data[end]) < thresh) end--;
            if (end <= start) { if (ctx.close) ctx.close(); return dataUri; }
            const pad = Math.floor(buf.sampleRate * 0.02);
            start = Math.max(0, start - pad); end = Math.min(len - 1, end + pad);
            const outLen = end - start + 1;
            const gain = Math.min(0.97 / peak, 6); // cap boost so near-silent clips don't amplify noise
            const wav = encodePhonemeWav(data, start, outLen, buf.sampleRate, gain);
            if (ctx.close) ctx.close();
            return (wav && wav.length > 64) ? wav : dataUri;
        } catch (e) { return dataUri; }
    }
    const PhonemeVoicePackEditor = ({ onClose, t }) => {
        // Resolve an i18n key to its (possibly translated) string, falling back to
        // the English `fb`, then interpolate {token} placeholders locally — the host
        // `t(key, fallback)` only knows key+fallback, so params are filled in here
        // (same {brace} convention the rest of Word Sounds uses).
        const T = (k, fb, params) => {
            let s = (typeof t === 'function' ? t(k, fb) : fb);
            if (s == null) s = fb;
            if (params) { s = String(s); Object.keys(params).forEach((p) => { s = s.split('{' + p + '}').join(params[p]); }); }
            return s;
        };
        const [lib, setLib] = React.useState(() => loadVoicePackLibrary());
        // `pack` = the active library entry; `setPack` mutates just that entry so
        // every existing setPack((prev) => ...) call keeps working unchanged.
        const pack = lib.packs.find((p) => p.id === lib.activeId) || lib.packs[0] || { name: 'My Voice Pack', clips: {}, kind: 'teacher-model', consent: false, history: {}, studentName: '', studentId: null };
        const setPack = (updater) => setLib((prev) => {
            const id = prev.activeId;
            return Object.assign({}, prev, { packs: prev.packs.map((p) => p.id === id ? (typeof updater === 'function' ? updater(p) : Object.assign({}, p, updater)) : p) });
        });
        // Write to a SPECIFIC pack by id (not necessarily the active one). Used by
        // the async recorder so a clip lands in the pack that was active when
        // recording started, even if the user switches packs mid-record.
        const setPackById = (id, updater) => setLib((prev) => Object.assign({}, prev, { packs: prev.packs.map((p) => p.id === id ? (typeof updater === 'function' ? updater(p) : Object.assign({}, p, updater)) : p) }));
        const [recordingKey, setRecordingKey] = React.useState(null);
        const [status, setStatus] = React.useState('');
        const [confirmStudentExport, setConfirmStudentExport] = React.useState(false);
        const [aiCheckOn, setAiCheckOn] = React.useState(false);
        const [cleanOn, setCleanOn] = React.useState(true); // auto trim-silence + normalize on record
        const [checks, setChecks] = React.useState({}); // { key: { state:'checking'|'done'|'error', match, clipped, note } }
        const [selfChecks, setSelfChecks] = React.useState({}); // { key: 'good' | 'retry' } — the student's OWN judgment (metacognition; on-device only)
        const [view, setView] = React.useState('record'); // 'record' | 'progress'
        const [category, setCategory] = React.useState('sounds'); // 'sounds' | 'cheers' | 'instructions'
        const recorderRef = React.useRef(null);
        const fileInputRef = React.useRef(null);
        const audioElRef = React.useRef(null); // the one preview clip currently playing
        const modalRootRef = React.useRef(null); // dialog root, for the focus trap
        const previouslyFocusedRef = React.useRef(null); // element to restore focus to on close
        const [showDeletePackConfirm, setShowDeletePackConfirm] = React.useState(false);
        const deletePackDialogRef = React.useRef(null);
        const deletePackCancelRef = React.useRef(null);
        const handleDeletePackDialogKeyDown = (event) => {
            if (!event || !deletePackDialogRef.current) return;
            event.stopPropagation();
            if (event.key === 'Escape') { event.preventDefault(); setShowDeletePackConfirm(false); return; }
            if (event.key !== 'Tab') return;
            const focusable = Array.from(deletePackDialogRef.current.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter(el => !el.hidden);
            if (!focusable.length) { event.preventDefault(); deletePackDialogRef.current.focus(); return; }
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        React.useEffect(() => {
            if (!showDeletePackConfirm) return undefined;
            const previouslyFocused = document.activeElement;
            const timer = setTimeout(() => deletePackCancelRef.current?.focus(), 0);
            return () => { clearTimeout(timer); if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus(); };
        }, [showDeletePackConfirm]);
        // Focus management (WCAG 2.4.3 / 2.1.2): move focus into the dialog on open,
        // trap Tab inside it, close on Escape, and restore focus to the trigger on close.
        React.useEffect(() => {
            const root = modalRootRef.current;
            if (!root || typeof document === 'undefined') return undefined;
            previouslyFocusedRef.current = document.activeElement;
            const FOCUSABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
            const getFocusable = () => Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
            const focusTimer = setTimeout(() => { const f = getFocusable(); (f[0] || root).focus(); }, 0);
            const onKeyDown = (e) => {
                if (e.key === 'Escape') { e.preventDefault(); if (typeof onClose === 'function') onClose(); return; }
                if (e.key !== 'Tab') return;
                const f = getFocusable();
                if (f.length === 0) { e.preventDefault(); root.focus(); return; }
                const first = f[0];
                const last = f[f.length - 1];
                const active = document.activeElement;
                if (e.shiftKey) {
                    if (active === first || !root.contains(active)) { e.preventDefault(); last.focus(); }
                } else {
                    if (active === last || !root.contains(active)) { e.preventDefault(); first.focus(); }
                }
            };
            root.addEventListener('keydown', onKeyDown);
            return () => {
                clearTimeout(focusTimer);
                root.removeEventListener('keydown', onKeyDown);
                const prev = previouslyFocusedRef.current;
                if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
                    try { prev.focus(); } catch (e) { /* trigger gone — nothing to restore to */ }
                }
            };
        }, []);
        // Play a single clip, stopping whatever was playing first (no overlap/stacking).
        const playPreview = (src) => {
            try { if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null; } } catch (e) {}
            if (!src) return null;
            try { const a = new Audio(src); audioElRef.current = a; a.play().catch(() => {}); return a; } catch (e) { return null; }
        };
        const clips = pack.clips || {};
        const kind = pack.kind === 'student-voice' ? 'student-voice' : 'teacher-model';
        const isStudent = kind === 'student-voice';
        const consentOk = !isStudent || pack.consent === true;
        const aiAvailable = typeof window !== 'undefined' && typeof window.callGeminiAudio === 'function';
        const allKeys = Object.keys(PHONEME_PACK_GROUPS).reduce((acc, g) => acc.concat(PHONEME_PACK_GROUPS[g]), []);
        const recordedCount = allKeys.filter((k) => clips[k]).length;
        const setKind = (k) => setPack((prev) => Object.assign({}, prev, { kind: k }));
        const giveConsent = () => setPack((prev) => Object.assign({}, prev, { consent: true }));
        const setStudentName = (name) => setPack((prev) => Object.assign({}, prev, { studentName: name }));
        const selectPack = (id) => {
            setLib((prev) => Object.assign({}, prev, { activeId: id }));
            // Apply the selected pack to the live bank now, so switching a pack
            // immediately changes the voice (instead of only on Save).
            const target = lib.packs.find((p) => p.id === id);
            if (target) { applyPhonemeVoicePackToBank(target.clips); applyInstrToBank(target.instr); }
            setChecks({}); setSelfChecks({}); setView('record'); setAiCheckOn(false);
            setStatus(target ? T('word_sounds.voice_pack_msg_switched', 'Switched to "{name}". This voice is active now.', { name: (target.name || 'pack') }) : '');
        };
        const newPack = () => { const id = genPhonemePackId(); setLib((prev) => Object.assign({}, prev, { activeId: id, packs: prev.packs.concat([normalizePhonemePack({ id, name: 'New Pack' })]) })); setChecks({}); setSelfChecks({}); setStatus(T('word_sounds.voice_pack_msg_new', 'New pack created. Name it, pick Teacher or Student, then record.')); setView('record'); };
        const performDeletePack = () => {
            setShowDeletePackConfirm(false);
            if (lib.packs.length <= 1) { setStatus(T('word_sounds.voice_pack_msg_keep_one', 'Keep at least one pack. Clear individual sounds with 🗑️ instead.')); return; }
            setLib((prev) => {
                const rest = prev.packs.filter((p) => p.id !== prev.activeId);
                const packs = rest.length ? rest : [normalizePhonemePack({ id: genPhonemePackId(), name: 'My Voice Pack' })];
                return { activeId: packs[0].id, packs };
            });
            setChecks({}); setSelfChecks({}); setStatus('');
        };
        const deletePack = () => {
            if (lib.packs.length <= 1) { setStatus(T('word_sounds.voice_pack_msg_keep_one', 'Keep at least one pack. Clear individual sounds instead.')); return; }
            setShowDeletePackConfirm(true);
        };
        // Longitudinal practice log: one lightweight dated entry per recording
        // (metadata only — no extra audio), capped to the last 20 attempts/sound.
        // The AI verdict and the student's self-rating attach to the latest entry
        // as they arrive, so the Progress tab can show a sound improve over time.
        const logAttempt = (key, packId) => {
            const writer = packId ? ((u) => setPackById(packId, u)) : setPack;
            writer((prev) => {
                const hist = Object.assign({}, prev.history || {});
                const arr = (hist[key] || []).slice(-19);
                arr.push({ ts: Date.now(), ai: null, self: null });
                hist[key] = arr;
                return Object.assign({}, prev, { history: hist });
            });
        };
        const updateLatestAttempt = (key, patch, packId) => {
            const writer = packId ? ((u) => setPackById(packId, u)) : setPack;
            writer((prev) => {
                const arr = (prev.history && prev.history[key]) || [];
                if (!arr.length) return prev;
                const hist = Object.assign({}, prev.history);
                const na = arr.slice();
                na[na.length - 1] = Object.assign({}, na[na.length - 1], patch);
                hist[key] = na;
                return Object.assign({}, prev, { history: hist });
            });
        };
        const runAiCheck = (key, dataUri, packId) => {
            if (!aiAvailable || !dataUri) return;
            setChecks((prev) => Object.assign({}, prev, { [key]: { state: 'checking' } }));
            const ex = PHONEME_PACK_EXAMPLES[key];
            const cue = PHONEME_PACK_CUES[key];
            const prompt = 'You are a kind phonics articulation coach for a young child. The TARGET is the English phoneme /' + phonemePackLabel(key) + '/' + (ex ? ' as in "' + ex + '"' : '') + '.' + (cue ? ' A clean version: ' + cue : '') + ' Listen to the short recording and judge ONLY the sound it contains, against your knowledge of how that phoneme should sound. IGNORE the speaker\'s voice, age and accent — many correct voices are fine. Reply with strict JSON and nothing else: {"match": true or false, "clipped": true or false, "note": "one short, specific, encouraging fix the child can do, 12 words max"}. "clipped" is true when the sound is clean with no extra vowel (e.g. /p/ not "puh").';
            Promise.resolve().then(() => window.callGeminiAudio(prompt, dataUri, {})).then((resp) => {
                const parsed = parsePhonemePackJsonLoose(resp);
                if (parsed) { setChecks((prev) => Object.assign({}, prev, { [key]: { state: 'done', match: parsed.match, clipped: parsed.clipped, note: parsed.note || '' } })); updateLatestAttempt(key, { ai: { match: parsed.match, clipped: parsed.clipped } }, packId); }
                else setChecks((prev) => Object.assign({}, prev, { [key]: { state: 'done', match: null, note: 'Could not analyze the clip.' } }));
            }).catch(() => setChecks((prev) => Object.assign({}, prev, { [key]: { state: 'error', note: 'AI check failed.' } })));
        };
        const stopRecording = () => { try { if (recorderRef.current) recorderRef.current.stop(); } catch (e) {} };
        const startRecording = (key, opts) => {
            opts = opts || {};
            const isInstr = !!opts.instr; // recording a cheer / instruction (writes pack.instr), not a phoneme
            if (!consentOk) { setStatus(T('word_sounds.voice_pack_msg_consent_first', 'Confirm consent below before recording a student voice.')); return; }
            if (recordingKey) { stopRecording(); return; }
            const targetId = lib.activeId; // the pack this clip belongs to, even if the user switches mid-record
            const voice = window.AlloFlowVoice;
            if (!voice || typeof voice.recordAudioBlob !== 'function') { setStatus(T('word_sounds.voice_pack_msg_need_mic', '🎙️ Recording needs the in-app microphone. Open in Canvas.')); return; }
            const ctrl = voice.recordAudioBlob({ maxDurationMs: isInstr ? 8000 : 4000, preferredMimeType: 'audio/webm;codecs=opus', onError: () => { setStatus(T('word_sounds.voice_pack_msg_mic_blocked', 'Microphone access was blocked.')); setRecordingKey(null); recorderRef.current = null; } });
            if (!ctrl || !ctrl.supported) { try { if (ctrl && ctrl.result && typeof ctrl.result.catch === 'function') ctrl.result.catch(() => {}); } catch (e) {} setStatus(T('word_sounds.voice_pack_msg_unsupported', 'Recording is not supported in this browser.')); return; }
            recorderRef.current = ctrl;
            setRecordingKey(key);
            setStatus(T('word_sounds.voice_pack_msg_recording', '● Recording {what}. Tap again to stop.', { what: (opts.label || ('/' + phonemePackLabel(key) + '/' + (PHONEME_PACK_EXAMPLES[key] ? ' (like ' + PHONEME_PACK_EXAMPLES[key] + ')' : ''))) }));
            ctrl.result.then(async (rec) => {
                if (rec && rec.base64) {
                    let finalClip = rec.base64;
                    if (cleanOn) { setStatus(T('word_sounds.voice_pack_msg_cleaning', '✂️ Cleaning up…')); try { finalClip = await cleanPhonemeClip(rec.base64); } catch (e) { finalClip = rec.base64; } }
                    const clip = finalClip;
                    if (isInstr) {
                        setPackById(targetId, (prev) => Object.assign({}, prev, { instr: Object.assign({}, prev.instr, { [key]: clip }) }));
                        setStatus(T('word_sounds.voice_pack_msg_recorded', '✓ Recorded {what}. Tap 🔊 to hear it, then Save & Use.', { what: (opts.label || key) }));
                    } else {
                        setPackById(targetId, (prev) => Object.assign({}, prev, { clips: Object.assign({}, prev.clips, { [key]: clip }) }));
                        setStatus(T('word_sounds.voice_pack_msg_recorded_sound', '✓ Recorded /{key}/. Tap 🔊 to hear it, then Save & Use.', { key: key }));
                        logAttempt(key, targetId);
                        if (aiCheckOn) runAiCheck(key, clip, targetId);
                    }
                }
                if (recorderRef.current === ctrl) recorderRef.current = null;
                setRecordingKey(null);
            }).catch(() => { if (recorderRef.current === ctrl) recorderRef.current = null; setRecordingKey(null); });
        };
        const instr = pack.instr || {};
        const playInstrClip = (slot) => { const d = instr[slot]; if (!d) return; playPreview(d); };
        const clearInstrClip = (slot) => setPack((prev) => { const c = Object.assign({}, prev.instr); delete c[slot]; return Object.assign({}, prev, { instr: c }); });
        const playInstrReference = (slot) => { const ref = instrReferenceClip(slot); if (!ref) { setStatus(T('word_sounds.voice_pack_msg_no_default_preview', 'No default recording to preview for this one.')); return; } playPreview(ref); };
        const playClip = (key) => { const d = clips[key]; if (!d) return; playPreview(d); };
        const playReference = (key) => {
            const ref = phonemeReferenceClip(key);
            if (!ref) { setStatus(T('word_sounds.voice_pack_msg_no_model', 'No model recording for /{key}/ in the default voice. Record what you think it sounds like, or check a reference chart.', { key: phonemePackLabel(key) })); return; }
            playPreview(ref);
        };
        const playCompare = (key) => {
            // Articulatory self-monitoring: play the MODEL, then the student's clip
            // back-to-back, so they can hear the difference and judge their own.
            const ref = phonemeReferenceClip(key);
            const mine = clips[key];
            if (!ref || !mine) return;
            const lbl = phonemePackLabel(key);
            setStatus(T('word_sounds.voice_pack_msg_listen_compare', '🔁 Listen: the model first, then your /{lbl}/.', { lbl: lbl }));
            const playMine = () => { playPreview(mine); };
            const a = playPreview(ref);
            if (a) { a.onended = playMine; a.onerror = playMine; } else { playMine(); }
        };
        const rateSelf = (key, val) => { const newVal = (selfChecks[key] === val) ? null : val; setSelfChecks((prev) => Object.assign({}, prev, { [key]: newVal })); updateLatestAttempt(key, { self: newVal }); };
        const wordReady = (w) => w.keys.every((k) => clips[k]);
        const playWord = (w) => {
            // The payoff: blend a real word from the student's OWN recorded clips.
            // Teaches that words are made of sounds, in the most motivating way.
            const seq = w.keys.map((k) => clips[k]);
            if (seq.some((c) => !c)) { setStatus(T('word_sounds.voice_pack_msg_record_all', 'Record every sound in "{word}" first.', { word: w.word })); return; }
            setStatus(T('word_sounds.voice_pack_msg_blending', '🔊 Blending "{word}" in your voice...', { word: w.word }));
            let i = 0;
            const next = () => {
                if (i >= seq.length) { setStatus(T('word_sounds.voice_pack_msg_built', '🎉 You built "{word}" with your own sounds!', { word: w.word })); return; }
                const clip = seq[i]; i++;
                const a = playPreview(clip);
                if (a) { a.onended = () => setTimeout(next, 240); a.onerror = () => setTimeout(next, 240); }
                else setTimeout(next, 240);
            };
            next();
        };
        const clearClip = (key) => { setPack((prev) => { const c = Object.assign({}, prev.clips); delete c[key]; return Object.assign({}, prev, { clips: c }); }); setChecks((prev) => { const c = Object.assign({}, prev); delete c[key]; return c; }); setSelfChecks((prev) => { const c = Object.assign({}, prev); delete c[key]; return c; }); };
        const persist = () => {
            try {
                localStorage.setItem(PHONEME_PACK_LIB_KEY, JSON.stringify(lib));
                // The library now owns any migrated legacy pack; drop the old single-pack key.
                try { localStorage.removeItem(PHONEME_PACK_STORAGE_KEY); } catch (e) {}
                return true;
            } catch (e) { return false; }
        };
        // Durability: autosave the whole library shortly after any change, so a
        // recording/rename/delete survives a reload even if the user never taps Save.
        // Debounced so typing a pack name doesn't re-serialize the clips on every key.
        React.useEffect(() => {
            const id = setTimeout(() => { try { persist(); } catch (e) {} }, 500);
            return () => clearTimeout(id);
        }, [lib]);
        const savePack = () => {
            const applied = applyPhonemeVoicePackToBank(pack.clips);
            // Always re-apply: a slot the user CLEARED must revert to the default
            // (or null → TTS), not stay overridden from a previous Save.
            const appliedInstr = applyInstrToBank(pack.instr || {}) > 0;
            const ok = persist();
            const extra = appliedInstr ? T('word_sounds.voice_pack_msg_save_extra', ' + your cheers/instructions') : '';
            setStatus(ok
                ? T('word_sounds.voice_pack_msg_saved', '✅ Saved and active now ({count} sounds{extra}). Word Sounds will use this voice.', { count: applied, extra: extra })
                : T('word_sounds.voice_pack_msg_saved_session', 'Active for this session ({count} sounds), but the pack was too large for browser storage. Use Export to keep it as a file.', { count: applied }));
        };
        const exportPack = () => {
            try {
                const data = { version: 1, type: 'alloPhonemePack', kind: kind, name: pack.name || 'My Voice Pack', studentName: pack.studentName || '', studentId: pack.studentId || null, exportDate: new Date().toISOString(), phonemes: pack.clips, instr: pack.instr || {}, history: pack.history || {} };
                const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                // Letters in any script survive (a Cyrillic or Arabic name used
                // to become "phoneme_pack__.json"); revoking in the same tick can
                // cancel the download in some browsers.
                const safe = String(pack.name || '').normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'voice';
                a.href = url; a.download = 'phoneme_pack_' + (isStudent ? 'CONFIDENTIAL_' : '') + safe + '.json';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                setStatus(isStudent
                    ? T('word_sounds.voice_pack_msg_exported_student', '⬇️ Exported "{name}" (confidential student voice).', { name: (pack.name || 'My Voice Pack') })
                    : T('word_sounds.voice_pack_msg_exported', '⬇️ Exported "{name}".', { name: (pack.name || 'My Voice Pack') }));
            } catch (e) { setStatus(T('word_sounds.voice_pack_msg_export_fail', 'Export failed.')); }
        };
        const importPack = (ev) => {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const incoming = (data && (data.phonemes || data.clips)) || null;
                    if (!incoming || typeof incoming !== 'object') { setStatus(T('word_sounds.voice_pack_msg_not_pack', 'That file is not a phoneme pack.')); return; }
                    // Keep only string clip values (audio data URIs) — guard against a
                    // tampered/corrupt file injecting objects or non-string junk.
                    const sanitizeClips = (o) => { const out = {}; if (o && typeof o === 'object') Object.keys(o).forEach((k) => { if (typeof o[k] === 'string' && o[k]) out[k] = o[k]; }); return out; };
                    const safeClips = sanitizeClips(incoming);
                    const safeInstr = sanitizeClips(data && data.instr);
                    const id = genPhonemePackId();
                    setLib((prev) => Object.assign({}, prev, { activeId: id, packs: prev.packs.concat([normalizePhonemePack({ id, name: (data && data.name) || 'Imported Pack', kind: (data && data.kind === 'student-voice') ? 'student-voice' : 'teacher-model', consent: false, clips: safeClips, instr: safeInstr, history: (data && data.history && typeof data.history === 'object') ? data.history : {}, studentName: (data && typeof data.studentName === 'string') ? data.studentName : '', studentId: (data && data.studentId) || null })]) }));
                    setChecks({}); setSelfChecks({});
                    setStatus(T('word_sounds.voice_pack_msg_imported', '📥 Imported as a new pack ({count} sounds). Tap Save & Use to apply.', { count: Object.keys(safeClips).length }));
                } catch (err) { setStatus(T('word_sounds.voice_pack_msg_read_fail', 'Could not read that file.')); }
            };
            reader.readAsText(file);
            ev.target.value = '';
        };
        const checkBadge = (key) => {
            const c = checks[key];
            if (!c) return null;
            if (c.state === 'checking') return <span className="text-[10px] text-slate-400 italic">checking…</span>;
            const good = c.match === true && c.clipped !== false;
            return <span className={`text-[10px] font-semibold ${good ? 'text-emerald-600' : 'text-amber-600'}`} title={c.note || ''}>{good ? T('word_sounds.voice_pack_sounds_right', '✓ sounds right') : ('⚠ ' + (c.note || T('word_sounds.voice_pack_try_again', 'try again')))}</span>;
        };
        return (
            <div ref={modalRootRef} tabIndex={-1} className="fixed inset-0 z-[400] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={T('word_sounds.voice_pack_dialog_label', 'Phoneme Voice Pack editor')}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-violet-700 to-purple-700 text-white">
                        <div>
                            <h2 className="text-lg font-black flex items-center gap-2">🎙️ {T('word_sounds.voice_pack_title', 'Voice Pack: record your own sounds')}</h2>
                            <p className="text-xs text-white/80">{recordedCount} / {allKeys.length} {T('word_sounds.voice_pack_recorded', 'sounds recorded')}</p>
                        </div>
                        <button type="button" onClick={onClose} aria-label={T('word_sounds.voice_pack_close', 'Close')} className="p-2 rounded-full hover:bg-white/20 transition-colors text-xl leading-none">✕</button>
                    </div>
                    <div className="px-5 py-2 border-b border-slate-200 flex items-center gap-2 flex-wrap text-xs bg-slate-50">
                        <span className="font-bold text-slate-500 uppercase tracking-wider">{T('word_sounds.voice_pack_pack_label', 'Pack')}</span>
                        <select value={lib.activeId} onChange={(e) => selectPack(e.target.value)} aria-label={T('word_sounds.voice_pack_active_pack', 'Active pack')} className="border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold bg-white max-w-[180px]">
                            {lib.packs.map((p) => <option key={p.id} value={p.id}>{(p.kind === 'student-voice' ? '🧒 ' : '🎓 ') + (p.name || 'Untitled') + (p.studentName ? ': ' + p.studentName : '')}</option>)}
                        </select>
                        <button type="button" onClick={newPack} className="px-2 py-1 rounded-lg bg-white border border-slate-300 font-bold text-slate-600 hover:bg-slate-100">➕ {T('word_sounds.voice_pack_new', 'New')}</button>
                        <button type="button" onClick={deletePack} disabled={lib.packs.length <= 1} className={`px-2 py-1 rounded-lg border font-bold ${lib.packs.length <= 1 ? 'text-slate-300 border-slate-200 cursor-not-allowed' : 'text-rose-800 border-rose-200 hover:bg-rose-50'}`}>🗑️ {T('word_sounds.voice_pack_delete', 'Delete')}</button>
                        {isStudent ? <input type="text" value={pack.studentName || ''} onChange={(e) => setStudentName(e.target.value)} placeholder={T('word_sounds.voice_pack_student_name', 'Student name (optional)')} aria-label={T('word_sounds.voice_pack_student_name_label', 'Student name')} className="border border-slate-300 rounded-lg px-2 py-1 text-xs ml-auto min-w-[120px]" /> : null}
                    </div>
                    <div className="px-5 py-2.5 border-b border-slate-200 flex items-center gap-3 flex-wrap text-xs">
                        <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden" role="group" aria-label={T('word_sounds.voice_pack_type_label', 'Pack type')}>
                            <button type="button" onClick={() => setKind('teacher-model')} className={`px-3 py-1.5 font-bold transition-colors ${!isStudent ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>🎓 {T('word_sounds.voice_pack_kind_teacher', 'Teacher model')}</button>
                            <button type="button" onClick={() => setKind('student-voice')} className={`px-3 py-1.5 font-bold transition-colors ${isStudent ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>🧒 {T('word_sounds.voice_pack_kind_student', 'Student voice')}</button>
                        </div>
                        <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer" title={T('word_sounds.voice_pack_clean_title', 'Trim silence and even out the volume after each recording, for cleaner blending')}>
                            <input type="checkbox" checked={cleanOn} onChange={(e) => setCleanOn(e.target.checked)} /> ✂️ {T('word_sounds.voice_pack_clean', 'Auto-trim & level')}
                        </label>
                        <label className={`inline-flex items-center gap-1.5 font-semibold cursor-pointer ${aiAvailable ? 'text-slate-700' : 'text-slate-300 cursor-not-allowed'}`} title={aiAvailable ? T('word_sounds.voice_pack_aicheck_title', 'Coach: judges each clip against the target sound (sends it to Gemini)') : T('word_sounds.voice_pack_aicheck_needs_canvas', 'AI coach needs Canvas')}>
                            <input type="checkbox" checked={aiCheckOn} disabled={!aiAvailable} onChange={(e) => setAiCheckOn(e.target.checked)} /> 🎯 {T('word_sounds.voice_pack_aicheck', 'AI coach')}
                        </label>
                        {aiCheckOn ? <span className="text-[10px] text-amber-600">{T('word_sounds.voice_pack_aicheck_note', 'Each clip is sent to Gemini for analysis.')}</span> : null}
                    </div>
                    <div className="px-5 py-3 bg-violet-50 border-b border-violet-100 text-xs text-slate-700">
                        {isStudent
                            ? T('word_sounds.voice_pack_intro_student', 'The student records each sound in their own voice (great for ownership and articulation practice). Tap 👂 to hear the model first, then 🎙️ to record. Student voice is a confidential record: it stays on this device, and Export creates a CONFIDENTIAL file you control.')
                            : T('word_sounds.voice_pack_intro', 'Record each sound in your own voice: tap 👂 to hear the model, then 🎙️ and say the sound clipped ("/p/", not "puh"). The app plays your voice during blending, isolation and the anchor card. Empty sounds keep the default voice.')}
                    </div>
                    {isStudent && !consentOk ? (
                        <div className="mx-5 mt-3 p-3 rounded-xl border-2 border-amber-300 bg-amber-50 text-xs text-amber-900">
                            <div className="font-bold mb-1">⚠️ {T('word_sounds.voice_pack_consent_title', 'Recording a student voice')}</div>
                            <p className="mb-2">{T('word_sounds.voice_pack_consent_body', "A student's voice recording is a confidential, biometric-adjacent record. It stays on this device, is never uploaded by this tool (the AI check, if you turn it on, is the only thing that sends a clip out), and you can delete it any time. Confirm you have permission to record this student.")}</p>
                            <button type="button" onClick={giveConsent} className="px-3 py-1.5 rounded-lg bg-amber-700 text-white font-bold hover:bg-amber-800 transition-colors">{T('word_sounds.voice_pack_consent_ok', 'I have permission, start recording')}</button>
                        </div>
                    ) : null}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="flex gap-1">
                            <button type="button" onClick={() => setView('record')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${view === 'record' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>🎙️ {T('word_sounds.voice_pack_tab_record', 'Record')}</button>
                            <button type="button" onClick={() => setView('progress')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${view === 'progress' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>📈 {T('word_sounds.voice_pack_tab_progress', 'Progress')}</button>
                        </div>
                        {view === 'progress' ? (() => {
                            const histKeys = allKeys.filter((k) => pack.history && pack.history[k] && pack.history[k].length);
                            if (!histKeys.length) return <div className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-50 border border-slate-200">{T('word_sounds.voice_pack_progress_empty', 'Record sounds (with the 😀 / 🤔 self-rating, or the 🎯 AI coach on) to build a practice log here. Every recording is logged so you can see a sound improve over time.')}</div>;
                            const isGood = (e) => (e.ai && e.ai.match === true && e.ai.clipped !== false) || e.self === 'good';
                            const isBad = (e) => (e.ai && (e.ai.match === false || e.ai.clipped === false)) || e.self === 'retry';
                            const totalAttempts = histKeys.reduce((s, k) => s + pack.history[k].length, 0);
                            const improving = histKeys.filter((k) => { const a = pack.history[k]; return a.length >= 2 && !isGood(a[0]) && isGood(a[a.length - 1]); }).length;
                            return (
                                <div className="space-y-3">
                                    <div className="text-[10px] text-slate-500 leading-snug">{T('word_sounds.voice_pack_progress_legend', 'A practice log, not a test: each dot is one recording, oldest to newest. Green = sounded right (the student or the AI coach), amber = keep practicing, grey = not yet judged.')}</div>
                                    <div className="text-[11px] font-semibold text-slate-600">{histKeys.length} {T('word_sounds.voice_pack_progress_sounds', 'sounds practiced')} · {totalAttempts} {T('word_sounds.voice_pack_progress_recordings', 'recordings')}{improving > 0 ? (' · ' + improving + ' ' + T('word_sounds.voice_pack_progress_improving', 'improving')) : ''}</div>
                                    {histKeys.map((k) => {
                                        const arr = pack.history[k];
                                        const lbl = phonemePackLabel(k);
                                        const last = arr[arr.length - 1];
                                        return (
                                            <div key={k} className="flex items-center gap-2">
                                                <div className="w-10 font-black text-slate-800 text-sm shrink-0">/{lbl}/</div>
                                                <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                                                    {arr.map((e, i) => { const cls = isGood(e) ? 'bg-emerald-500' : (isBad(e) ? 'bg-amber-400' : 'bg-slate-300'); return <span key={i} title={new Date(e.ts).toLocaleDateString() + (e.ai ? (e.ai.match ? ' · AI: matches' : ' · AI: keep practicing') : '') + (e.self === 'good' ? ' · me: ok' : (e.self === 'retry' ? ' · me: try again' : ''))} className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`}></span>; })}
                                                </div>
                                                <div className="text-[10px] text-slate-400 shrink-0">{arr.length}× · {new Date(last.ts).toLocaleDateString()}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })() : (
                        <div className="space-y-4">
                        <div className="flex gap-1 flex-wrap">
                            <button type="button" onClick={() => setCategory('sounds')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${category === 'sounds' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>🔤 {T('word_sounds.voice_pack_cat_sounds', 'Sounds')}</button>
                            <button type="button" onClick={() => setCategory('cheers')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${category === 'cheers' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>🎉 {T('word_sounds.voice_pack_cat_cheers', 'Cheers')}</button>
                            <button type="button" onClick={() => setCategory('instructions')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${category === 'instructions' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>💬 {T('word_sounds.voice_pack_cat_instr', 'Instructions')}</button>
                        </div>
                        {category === 'sounds' ? (
                        <div className="space-y-4">
                        {(() => {
                            const readyWords = PHONEME_PACK_WORDS.filter(wordReady);
                            return (
                                <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3">
                                    <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">🔊 {T('word_sounds.voice_pack_words_title', 'Hear a word in your voice')}</div>
                                    <div className="text-[10px] text-slate-600 mb-2">{readyWords.length > 0 ? T('word_sounds.voice_pack_words_ready', 'Tap a word to hear it built from YOUR sounds.') : T('word_sounds.voice_pack_words_hint', 'Record the sounds in a word, then tap it to hear the whole word in your own voice.')} {readyWords.length > 0 ? ('(' + readyWords.length + '/' + PHONEME_PACK_WORDS.length + ')') : ''}</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PHONEME_PACK_WORDS.map((w) => {
                                            const ready = wordReady(w);
                                            const missing = w.keys.filter((k) => !clips[k]).map((k) => '/' + phonemePackLabel(k) + '/').join(' ');
                                            return (
                                                <button key={w.word} type="button" onClick={() => ready && playWord(w)} disabled={!ready} aria-label={ready ? T('word_sounds.voice_pack_word_hear', 'Hear {word} in your voice', { word: w.word }) : T('word_sounds.voice_pack_word_need', '{word}: still need {missing}', { word: w.word, missing: missing })} title={ready ? T('word_sounds.voice_pack_word_hear_title', 'Hear "{word}" in your voice', { word: w.word }) : T('word_sounds.voice_pack_word_record', 'Record: {missing}', { missing: missing })} className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${ready ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-white text-slate-400 border border-slate-200 cursor-not-allowed'}`}>{ready ? '🔊 ' : '🔒 '}{w.word}</button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                        {Object.keys(PHONEME_PACK_GROUPS).map((group) => (
                            <div key={group}>
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{group}</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {PHONEME_PACK_GROUPS[group].map((key) => {
                                        const has = !!clips[key];
                                        const rec = recordingKey === key;
                                        const label = phonemePackLabel(key);
                                        const hasRef = !!phonemeReferenceClip(key);
                                        return (
                                            <div key={key} className={`flex items-center gap-1.5 rounded-xl border-2 px-2 py-1.5 ${has ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-slate-800 leading-tight">/{label}/ {has && <span className="text-emerald-600">✓</span>}</div>
                                                    <div className="text-[10px] text-slate-500">{renderExampleWithGrapheme(key, PHONEME_PACK_EXAMPLES[key])}</div>
                                                    {PHONEME_PACK_CUES[key] ? <div className="text-[10px] text-violet-500 leading-snug">{PHONEME_PACK_CUES[key]}</div> : null}
                                                    {has ? (
                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            {hasRef ? <button type="button" onClick={() => playCompare(key)} className="text-[10px] font-bold text-amber-700 hover:underline">🔁 {T('word_sounds.voice_pack_compare', 'compare')}</button> : null}
                                                            <span className="text-[10px] text-slate-600">{T('word_sounds.voice_pack_me', 'me:')}</span>
                                                            <button type="button" onClick={() => rateSelf(key, 'good')} aria-label={T('word_sounds.voice_pack_self_good', 'I think {label} sounds right', { label: label })} className={`text-sm leading-none transition-opacity ${selfChecks[key] === 'good' ? '' : 'opacity-30'} hover:opacity-100`}>😀</button>
                                                            <button type="button" onClick={() => rateSelf(key, 'retry')} aria-label={T('word_sounds.voice_pack_self_retry', 'I want to try {label} again', { label: label })} className={`text-sm leading-none transition-opacity ${selfChecks[key] === 'retry' ? '' : 'opacity-30'} hover:opacity-100`}>🤔</button>
                                                            {checkBadge(key)}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <button type="button" onClick={() => playReference(key)} disabled={!hasRef} aria-label={T('word_sounds.voice_pack_hear_model', 'Hear the model sound {label}', { label: label })} title={T('word_sounds.voice_pack_hear_model_title', 'Hear the model (default) sound')} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${hasRef ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}>👂</button>
                                                <button type="button" onClick={() => startRecording(key)} disabled={!consentOk} aria-label={rec ? T('word_sounds.voice_pack_stop_recording', 'Stop recording {label}', { label: label }) : T('word_sounds.voice_pack_record', 'Record {label}', { label: label })} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors ${rec ? 'bg-red-600 text-white animate-pulse motion-reduce:animate-none' : (consentOk ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed')}`}>{rec ? '⏹' : '🎙️'}</button>
                                                <button type="button" onClick={() => playClip(key)} disabled={!has} aria-label={T('word_sounds.voice_pack_play_recording', 'Play your recording of {label}', { label: label })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${has ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}>🔊</button>
                                                <button type="button" onClick={() => clearClip(key)} disabled={!has} aria-label={T('word_sounds.voice_pack_clear', 'Clear {label}', { label: label })} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${has ? 'text-rose-500 hover:bg-rose-50' : 'text-slate-200 cursor-not-allowed'}`}>🗑️</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="text-[10px] text-slate-500 leading-snug">{category === 'cheers' ? T('word_sounds.voice_pack_cheers_intro', "Record praise in your (or a parent's) voice. The app plays it when the student gets things right, as a personalized reinforcer. Tap 👂 to hear the default first.") : T('word_sounds.voice_pack_instr_intro', 'Record the task directions in your own voice, clear and unhurried. Empty ones keep the default narration. Tap 👂 to hear the default first.')}</div>
                                {(category === 'cheers' ? PHONEME_PACK_CHEERS : PHONEME_PACK_INSTRS).map((slot) => {
                                    const hasI = !!instr[slot.id];
                                    const recI = recordingKey === slot.id;
                                    const hasRefI = !!instrReferenceClip(slot.id);
                                    return (
                                        <div key={slot.id} className={`flex items-center gap-1.5 rounded-xl border-2 px-2 py-1.5 ${hasI ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-800 text-sm leading-tight">{slot.label} {hasI && <span className="text-emerald-600">✓</span>}</div>
                                                {slot.hint ? <div className="text-[10px] text-slate-500 leading-snug">{slot.hint}</div> : null}
                                            </div>
                                            <button type="button" onClick={() => playInstrReference(slot.id)} disabled={!hasRefI} aria-label={T('word_sounds.voice_pack_hear_default_for', 'Hear the default for {label}', { label: slot.label })} title={T('word_sounds.voice_pack_hear_default', 'Hear the default')} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${hasRefI ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}>👂</button>
                                            <button type="button" onClick={() => startRecording(slot.id, { instr: true, label: slot.label })} disabled={!consentOk} aria-label={recI ? T('word_sounds.voice_pack_stop_recording', 'Stop recording {label}', { label: slot.label }) : T('word_sounds.voice_pack_record', 'Record {label}', { label: slot.label })} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors ${recI ? 'bg-red-600 text-white animate-pulse motion-reduce:animate-none' : (consentOk ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed')}`}>{recI ? '⏹' : '🎙️'}</button>
                                            <button type="button" onClick={() => playInstrClip(slot.id)} disabled={!hasI} aria-label={T('word_sounds.voice_pack_play_recording', 'Play your recording of {label}', { label: slot.label })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${hasI ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}>🔊</button>
                                            <button type="button" onClick={() => clearInstrClip(slot.id)} disabled={!hasI} aria-label={T('word_sounds.voice_pack_clear', 'Clear {label}', { label: slot.label })} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${hasI ? 'text-rose-500 hover:bg-rose-50' : 'text-slate-200 cursor-not-allowed'}`}>🗑️</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        </div>
                        )}
                    </div>
                    {status ? <div className="px-5 py-2 text-xs font-semibold text-violet-700 bg-violet-50 border-t border-violet-100" role="status" aria-live="polite">{status}</div> : null}
                    {/* A student-voice file is a child's recordings and practice log:
                        confirm in the page (confirm() is ignored inside Canvas). */}
                    {confirmStudentExport && isStudent ? (
                        <div role="alert" data-voice-pack-student-export-confirm="true" className="flex items-center gap-2 px-5 py-3 border-t border-amber-200 bg-amber-50 flex-wrap">
                            <span className="flex-1 min-w-[200px] text-sm font-semibold text-amber-900">{T('word_sounds.voice_pack_student_export_warning', "This file holds a child's voice recordings and practice history. Save it only to a school-approved location.")}</span>
                            <button type="button" autoFocus onClick={() => { setConfirmStudentExport(false); exportPack(); }} className="px-3 py-1.5 rounded-lg bg-amber-700 text-white font-bold text-sm hover:bg-amber-800 transition-colors">{T('word_sounds.voice_pack_student_export_confirm', 'Export file')}</button>
                            <button type="button" onClick={() => setConfirmStudentExport(false)} className="px-3 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-300 font-bold text-sm hover:bg-slate-50 transition-colors">{T('common.cancel', 'Cancel')}</button>
                        </div>
                    ) : null}
                    <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-200 flex-wrap">
                        <input type="text" value={pack.name} onChange={(e) => setPack((prev) => Object.assign({}, prev, { name: e.target.value }))} aria-label={T('word_sounds.voice_pack_name_label', 'Pack name')} className="flex-1 min-w-[120px] border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold" placeholder={T('word_sounds.voice_pack_name_label', 'Pack name')} />
                        <button type="button" onClick={savePack} className="px-4 py-1.5 rounded-lg bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-colors">{T('word_sounds.voice_pack_save', 'Save & Use')}</button>
                        <button type="button" onClick={isStudent ? () => setConfirmStudentExport(true) : exportPack} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-sm hover:bg-emerald-100 transition-colors">⬇️ {T('word_sounds.voice_pack_export', 'Export')}</button>
                        <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} className="px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm hover:bg-slate-100 transition-colors">📥 {T('word_sounds.voice_pack_import', 'Import')}</button>
                        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importPack} className="hidden" aria-hidden="true" />
                    </div>
                </div>
                {showDeletePackConfirm && (
                    <div role="presentation" className="fixed inset-0 z-[420] bg-black/70 flex items-center justify-center p-4">
                        <div ref={deletePackDialogRef} role="alertdialog" aria-modal="true" aria-labelledby="voice-pack-delete-title" aria-describedby="voice-pack-delete-message" tabIndex={-1} onKeyDownCapture={handleDeletePackDialogKeyDown} className="w-full max-w-sm rounded-2xl border-2 border-rose-300 bg-white p-6 shadow-2xl">
                            <h3 id="voice-pack-delete-title" className="text-lg font-black text-slate-900">Delete voice pack?</h3>
                            <p id="voice-pack-delete-message" className="mt-2 text-sm text-slate-700">Delete "{pack.name || 'Untitled'}"? Its recordings and progress log will be permanently removed.</p>
                            <div className="mt-5 flex justify-end gap-2">
                                <button ref={deletePackCancelRef} type="button" onClick={() => setShowDeletePackConfirm(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Keep pack</button>
                                <button type="button" onClick={performDeletePack} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">Delete pack</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Decodable filler words. Shared by the board compiler and the rhyme
    // derivation below so the two cannot drift apart. English only by
    // construction — every consumer gates on packIsEnglish.
    const PACK_COMMON_WORDS = ['cat','dog','sun','map','bed','pig','cup','hat','fish','star','tree','frog','duck','book','run','red','sit','fan','hop','moon','pen','top','ring','rock','look','mug'];
    // Spelling endings only narrow candidates for pronunciation checking.
    const packRimeOfWord = (w, isEnglish) => {
        const v = String(w || '').trim().toLowerCase();
        if (!v) return '';
        if (isEnglish) return (v.match(/[aeiou][a-z]*$/) || [''])[0];
        return v.slice(-2);
    };
    // A rhyme answer the pack can carry to a student device. The player can
    // already derive one at runtime, but a device with AI switched off is
    // better served by a pack that is complete before it leaves the teacher.
    // Drawn from the session's own words first (a rhyme the child is also
    // learning is worth more than a stranger), then the filler pool.
    const derivePackRhyme = (word, batchWords, isEnglish, phonemes = []) => {
        const w = String(word || '').trim().toLowerCase();
        if (!w) return '';
        const pool = [
            ...(Array.isArray(batchWords) ? batchWords : []),
            ...(isEnglish ? PACK_COMMON_WORDS : []),
        ];
        const seen = new Set([w]);
        for (const candidate of pool) {
            const c = String(typeof candidate === 'string' ? candidate : candidate?.targetWord || candidate?.word || candidate?.term || '').trim().toLowerCase();
            if (!c || seen.has(c)) continue;
            seen.add(c);
            if (WS_CORE.rhymePairStatus({word:w, answer:c, phonemes, pool, isEnglish}).supported) return c;
        }
        return '';
    };

    // ── Decodability screen for AI-generated words ──────────────────────────
    // A generated rhyme family arrived with "hon" in it. Structurally it is a
    // flawless CVC — lowercase, one vowel, three letters — so no shape rule
    // can catch it. It is a poor K-2 item because it is an informal clipping
    // of "honey", and only a word list knows that.
    //
    // So this does two different jobs and keeps them apart. It REJECTS things
    // that cannot be phonics items at all, which is safe to do silently. It
    // FLAGS words that are merely unrecognised, because the curated lists here
    // are a few hundred words and a real vocabulary is tens of thousands:
    // dropping everything unfamiliar would gut legitimate content and quietly
    // narrow what a teacher can teach. Flagged words are surfaced for the
    // teacher to judge, which is the right place for that decision.
    let _k2Known = null;
    const k2KnownWords = () => {
        if (_k2Known) return _k2Known;
        const set = new Set(PACK_COMMON_WORDS);
        const add = (w) => {
            const v = String(w || '').trim().toLowerCase();
            if (v) set.add(v);
        };
        try {
            const data = (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AlloData) || {};
            (data.SOUND_MATCH_POOL || []).forEach(add);
            Object.values(data.RIME_FAMILIES || {}).forEach((list) => (list || []).forEach(add));
            Object.values(data.SIGHT_WORD_PRESETS || {}).forEach((list) => (list || []).forEach(add));
            Object.values(data.WORD_FAMILY_PRESETS || {}).forEach((list) => {
                if (Array.isArray(list)) list.forEach(add);
                else if (list && Array.isArray(list.words)) list.words.forEach(add);
            });
        } catch (e) { /* the screen degrades to structure-only */ }
        _k2Known = set;
        return set;
    };
    // Hard rejects: not a candidate phonics word under any reading.
    const isUnusableAsPhonicsWord = (w) => {
        const v = String(w || '').trim();
        if (!v) return true;
        if (!/^[a-zA-Z]+$/.test(v)) return true;          // digits, punctuation, spaces
        if (v.length < 2 || v.length > 10) return true;   // "a" is a sight word, not a family member
        if (!/[aeiouy]/i.test(v)) return true;            // no vowel = not a word
        return false;
    };
    // Soft flag: real-looking, but not in any list this app can vouch for.
    const isUnverifiedK2Word = (w, sessionWords) => {
        const v = String(w || '').trim().toLowerCase();
        if (!v) return false;
        if (k2KnownWords().has(v)) return false;
        // A word the teacher put in this session is vouched for by the teacher.
        if (sessionWords && sessionWords.has(v)) return false;
        return true;
    };

    // ── Decodable sentence assembly (Finish the Sentence) ───────────────────
    // Connected text, built only from words the pack can vouch for. The AI
    // sentence is used when every word of it is the target, a word in this
    // session, or on the K-2 lists the decodability screen trusts — otherwise
    // the item falls back to a sight-word frame, so a pack still reads
    // correctly on a device with AI switched off.
    const READ_SENTENCE_FRAMES = [
        { before: 'I can see the', after: '.' },
        { before: 'Look at the', after: '!' },
        { before: 'Here is the', after: '.' },
        { before: 'We like the', after: '.' },
    ];
    const joinPackSentence = (before, word, after) => {
        const a = String(after || '');
        return `${before} ${word}${/^[.,!?]/.test(a) ? '' : ' '}${a}`.trim();
    };
    const packSentenceWords = (sentence) => String(sentence || '')
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
    const packSentenceIsUsable = (sentence, word, sessionWords) => {
        const s = String(sentence || '').trim();
        const w = String(word || '').trim().toLowerCase();
        if (!s || !w) return false;
        // Contractions and anything non-alphabetic hide words the K-2 check
        // below cannot see; a sentence we cannot fully check is not usable.
        if (/[^a-zA-Z\s.,!?]/.test(s)) return false;
        const words = packSentenceWords(s);
        if (words.length < 3 || words.length > 8) return false;
        // Exactly one occurrence of the target: a second one would leave the
        // answer sitting in plain view once the blank is cut.
        if (words.filter((v) => v === w).length !== 1) return false;
        return words.every((v) => v === w || v === 'a' || v === 'i'
            || !isUnverifiedK2Word(v, sessionWords));
    };
    // Cut the sentence around its single occurrence of the target word.
    const splitPackSentence = (sentence, word) => {
        const s = String(sentence || '').trim();
        const w = String(word || '').trim();
        if (!s || !w) return null;
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const m = s.match(new RegExp(`(^|[^a-zA-Z])(${escaped})(?=[^a-zA-Z]|$)`, 'i'));
        if (!m || typeof m.index !== 'number') return null;
        const start = m.index + m[1].length;
        return { before: s.slice(0, start).trim(), after: s.slice(start + w.length).trim() };
    };

    // Two-word frames for Picture the Sentence: a sentence naming TWO pack
    // words in a fixed order, so placing their pictures in that order proves
    // the sentence was read left-to-right, not word-spotted. Glue is sight
    // words only, so the frames are decodable by construction.
    const SENTENCE_MATCH_FRAMES = [
        { before: 'The', mid: 'can see the', after: '.' },
        { before: 'I see the', mid: 'and the', after: '.' },
        { before: 'Look at the', mid: 'and the', after: '!' },
        { before: 'The', mid: 'is with the', after: '.' },
    ];
    const joinPackPairSentence = (frame, a, b) =>
        `${frame.before} ${a} ${frame.mid} ${b}${frame.after}`;

    // A micro-story is three sentences about ONE word — the referent carries
    // across sentences, which is what makes it connected text rather than
    // three unrelated lines. Each sentence passes the same decodability gate
    // as a single sentence; a sentence may omit the target (that is normal
    // prose) but at least two of the three must contain it, or the "story"
    // is not actually about the word the child is practicing.
    const packStoryIsUsable = (story, word, sessionWords) => {
        if (!Array.isArray(story) || story.length !== 3) return false;
        const w = String(word || '').trim().toLowerCase();
        if (!w) return false;
        let withTarget = 0;
        for (const raw of story) {
            const s = String(raw || '').trim();
            if (!s) return false;
            const words = packSentenceWords(s);
            const count = words.filter((v) => v === w).length;
            if (count > 1) return false;
            if (count === 1) {
                if (!packSentenceIsUsable(s, w, sessionWords)) return false;
                withTarget++;
            } else {
                // Target-less sentence: same vocabulary and shape rules, just
                // without the exactly-once requirement.
                if (/[^a-zA-Z\s.,!?]/.test(s)) return false;
                if (words.length < 3 || words.length > 8) return false;
                if (!words.every((v) => v === 'a' || v === 'i' || !isUnverifiedK2Word(v, sessionWords))) return false;
            }
        }
        return withTarget >= 2;
    };

    // ── eSpeak G2P: the middle rung of the phoneme fallback ladder ──────────
    // When Gemini returns no phonemes for a word, the pack used to drop
    // straight to estimatePackPhonemes — a spelling heuristic, which is where
    // "letter-split sounds (generation failed)" on the readiness panel comes
    // from. eSpeak NG is a real grapheme-to-phoneme engine and belongs between
    // the two, so that warning is only ever raised for words a G2P engine
    // could not do either, rather than for every word Gemini hiccuped on.
    //
    // Load once per session, and only when something actually needs it: the
    // wasm is ~18.5MB per language. `_espeakPackLoad` caches the attempt,
    // INCLUDING a failed one, so a pack of 40 words cannot serialise 40
    // six-second timeouts on a school network.
    let _espeakPackLoad = null;
    const ensureEspeakLoaded = () => {
        if (_espeakPackLoad) return _espeakPackLoad;
        _espeakPackLoad = (async () => {
            try {
                if (typeof window === 'undefined') return false;
                if (window.AlloPhonics && typeof window.AlloPhonics.toPhonemes === 'function') return true;
                if (typeof window.__alloLoadPlugin !== 'function') return false;
                await Promise.race([
                    window.__alloLoadPlugin('phonics_g2p_loader.js'),
                    new Promise((resolve) => setTimeout(resolve, 6000)),
                ]);
                return !!(window.AlloPhonics && typeof window.AlloPhonics.toPhonemes === 'function');
            } catch (e) {
                return false;
            }
        })();
        return _espeakPackLoad;
    };
    // Preserve pronunciation objects: spelling y in rainy represents IPA /i/,
    // and reducing it to bare y would change it to the app's consonant token.
    const espeakPackPhonemes = async (word, language) => {
        const w = String(word || '').trim();
        if (!w) return null;
        try {
            if (!(await ensureEspeakLoaded())) return null;
            const espeak = await Promise.race([
                window.AlloPhonics.toPhonemes(w, { lang: language }),
                new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
            ]);
            // toPhonemes returns null when the language has no eSpeak voice.
            // Running the English voice on, say, Somali would return
            // confidently wrong sounds, which is worse than falling through.
            if (!espeak || !Array.isArray(espeak.ipa) || !espeak.ipa.length) return null;
            if (typeof window.AlloPhonics.buildPhonemes !== 'function') return null;
            const built = window.AlloPhonics.buildPhonemes(w, espeak, null);
            const phonemes = (built && built.phonemes) || [];
            if (phonemes.length !== espeak.ipa.length ||
                espeak.ipa.some(p => typeof p !== 'string' || !p.trim()) ||
                phonemes.some((p, i) => WS_CORE.phonemeToken(p) !== espeak.ipa[i].trim())) return null;
            const graphemes = phonemes.map(p => typeof p === 'string' ? p : p?.grapheme || '');
            const aligned = graphemes.every(g => typeof g === 'string' && g.trim()) &&
                graphemes.join('').normalize('NFC').toLowerCase() === w.normalize('NFC').toLowerCase();
            // Sound-only tasks do not require a one-to-one spelling alignment.
            // Keep the verified sequence and leave mapping unavailable rather
            // than replacing four sounds in box with the three written letters.
            return phonemes.map((p, i) => ({ ipa: espeak.ipa[i].trim(), grapheme: aligned ? graphemes[i] : '' }));
        } catch (e) {
            return null;
        }
    };

    const preparePackRhyme = async (word, phonemes, batchWords, suppliedAnswer, isEnglish, language) => {
        const target = String(word || '').trim().toLowerCase();
        const supplied = String(suppliedAnswer || '').trim().toLowerCase();
        const pool = [...(Array.isArray(batchWords) ? batchWords : []), ...(isEnglish ? PACK_COMMON_WORDS : [])];
        const spellingRime = packRimeOfWord(target, isEnglish);
        const candidates = [...new Set([supplied, derivePackRhyme(target, pool, isEnglish, phonemes),
            ...pool.map(value => String(typeof value === 'string' ? value : value?.word || value?.targetWord || '').trim().toLowerCase())
                .filter(value => spellingRime.length >= 2 && packRimeOfWord(value, isEnglish) === spellingRime)])];
        for (const answer of candidates) {
            if (!answer || answer === target) continue;
            let status = WS_CORE.rhymePairStatus({word:target, answer, phonemes, pool, isEnglish});
            let answerPhonemes = null;
            if (status.rhymes == null) {
                answerPhonemes = await espeakPackPhonemes(answer, language);
                status = WS_CORE.rhymePairStatus({word:target, answer, phonemes, answerPhonemes, pool, isEnglish});
            }
            if (status.supported) return {answer, source:answer === supplied ? 'gemini' : 'derived',
                ...(answerPhonemes ? {pronunciation:{word:answer, phonemes:answerPhonemes}} : {})};
        }
        return {answer:'', source:undefined, rejectedAnswer:supplied || undefined};
    };

// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY
// Deliberately separate from student recordings and lesson/cloud persistence.
function createWordSoundsReviewedLibrary(core, indexedDb) {
  const databaseName = 'allo-word-sounds-reviewed-recordings-v1';
  const maxEntries = 128, maxBytes = 64 * 1024 * 1024;
  const fail = (code, message, messageKey) => Object.assign(new Error(message), { code, messageKey });
  const cancelled = () => fail('cancelled', 'Library operation cancelled.');
  const identity = (word, language) => {
    if (typeof word !== 'string' || typeof language !== 'string') throw fail('invalid', 'Choose a word and recording language before using the local library.', 'word_sounds.syllable_library_choose_word');
    const targetWord = word.trim().toLowerCase().normalize('NFC');
    const languageKey = core.packAudioLanguageKey(language);
    if (!targetWord || targetWord.length > 80 || !languageKey || languageKey.length > 120) throw fail('invalid', 'Choose a word and recording language before using the local library.', 'word_sounds.syllable_library_choose_word');
    return { key: JSON.stringify([targetWord, languageKey]), targetWord, languageKey };
  };
  const cleanTask = (task, word, language) => {
    const match = identity(word, language);
    if (!core.reviewedSyllableReady(task) || task.targetWord !== match.targetWord) throw fail('invalid', 'This recording needs a fresh review for the selected word and language.', 'word_sounds.syllable_library_review_word');
    if (task.version !== 3 || core.packAudioLanguageKey(task.language) !== match.languageKey) throw fail('invalid', 'This recording needs a fresh review for the selected word and recording language.', 'word_sounds.syllable_library_review_word_recording_language');
    // Only instructional clips and their reviewed sequence enter the library.
    // Answer choices, originals retained for Undo, and unrelated fields stay out.
    const clean = core.createReviewedSyllableTask({ targetWord: task.targetWord, language: task.language, revision: task.revision,
      syllables: task.syllables.slice(), reviewed: true, assets: task.audioUnits.map(unit => ({
        mime: unit.asset.mime, base64: unit.asset.base64, durationSeconds: unit.asset.durationSeconds,
        decoded: true, source: 'teacher_recording'
      })) });
    if (!clean || clean.review.signature !== task.review.signature) throw fail('invalid', 'This recording needs a fresh review before saving.', 'word_sounds.syllable_library_review_before_saving');
    if (core.resolveSyllableTask(word, clean, language).supported) return clean;
    // Equivalent language aliases can use different schema spellings. Only
    // after validating the original signature and proving language equivalence
    // reconstruct the identical clips/order for the current schema spelling.
    const adapted = core.createReviewedSyllableTask({ targetWord: clean.targetWord, language, revision: clean.revision,
      syllables: clean.syllables, assets: clean.audioUnits.map(unit => unit.asset), reviewed: true });
    if (!adapted || !core.resolveSyllableTask(word, adapted, language).supported) throw fail('invalid', 'This recording needs a fresh review for the selected language.', 'word_sounds.syllable_library_review_language');
    return adapted;
  };
  const setFileLimit = 5 * 1024 * 1024;
  const checkSetText = text => {
    if (typeof text !== 'string' || !text.length || text.length > setFileLimit || new Blob([text]).size > setFileLimit) throw fail('invalid', 'Choose a recording set smaller than 5 MB.', 'word_sounds.syllable_library_set_too_large');
  };
  const exportSet = (task, word, language) => {
    const match = identity(word, language);
    const text = JSON.stringify({ format: 'alloflow.word-sounds-recordings', version: 1,
      word: match.targetWord, language: match.languageKey, task: cleanTask(task, word, language) });
    checkSetText(text);
    return text;
  };
  const parseSet = (text, word, language) => {
    checkSetText(text);
    let data;
    try { data = JSON.parse(text); } catch (_) { throw fail('invalid', 'This is not a valid recording set. Choose a Word Sounds recording set downloaded from a lesson.', 'word_sounds.syllable_library_set_invalid'); }
    if (!data || data.format !== 'alloflow.word-sounds-recordings' || data.version !== 1) throw fail('invalid', 'This recording set format is not supported. Choose a Word Sounds recording set downloaded from a lesson.', 'word_sounds.syllable_library_set_format');
    const match = identity(word, language);
    if (data.word !== match.targetWord) throw fail('invalid', 'This recording set is for a different word. Open the matching word to import it.', 'word_sounds.syllable_library_set_other_word');
    if (data.language !== match.languageKey) throw fail('invalid', 'This recording set uses a different recording language. Select its matching language before importing.', 'word_sounds.syllable_library_set_other_language');
    // A valid envelope is only a draft candidate. The editor must decode every
    // clip and require a new full preview and teacher review before saving.
    if (data.task?.version !== 3) {
      const draft = core.recoverSyllableRecordingDraft(word, data.task);
      if (draft) return draft;
    }
    return cleanTask(data.task, word, language);
  };
  const message = (error, tr = (key, fallback) => fallback) => {
    if (typeof error?.code === 'string') return error.messageKey ? tr(error.messageKey, error.message) : error.message;
    if (error?.name === 'QuotaExceededError') return tr('word_sounds.syllable_library_storage_full', 'Device storage is full. The lesson still keeps its recordings; free space and try the local library again.');
    return tr('word_sounds.syllable_library_unavailable', 'The local recording library is unavailable. The lesson can still keep its recordings. Try again in this browser.');
  };
  const transact = (mode, signal, run) => new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(cancelled()); return; }
    if (!indexedDb?.open) { reject(fail('unavailable', 'This browser cannot open the local library. The lesson can still keep its recordings.', 'word_sounds.syllable_library_no_browser')); return; }
    let request, database, transaction, settled = false, result;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      try { database?.close(); } catch (_) {}
      error ? reject(error) : resolve(value);
    };
    const abort = () => { try { transaction?.abort(); } catch (_) {} finish(cancelled()); };
    const timer = setTimeout(() => {
      try { transaction?.abort(); } catch (_) {}
      finish(fail('timeout', 'The local library did not respond. Close other Word Sounds tabs and try again.', 'word_sounds.syllable_library_timeout'));
    }, 10000);
    signal?.addEventListener('abort', abort, { once: true });
    try { request = indexedDb.open(databaseName, 1); }
    catch (error) { finish(error); return; }
    request.onupgradeneeded = () => {
      if (settled || signal?.aborted) { try { request.transaction.abort(); } catch (_) {} return; }
      const db = request.result;
      if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('catalog')) db.createObjectStore('catalog', { keyPath: 'key' });
    };
    request.onblocked = () => finish(fail('blocked', 'Another tab is holding the local library open. Close it and try again.', 'word_sounds.syllable_library_blocked'));
    request.onerror = () => finish(request.error);
    request.onsuccess = () => {
      database = request.result;
      if (settled || signal?.aborted) { database.close(); if (!settled) finish(cancelled()); return; }
      database.onversionchange = () => {
        try { transaction?.abort(); } catch (_) {}
        finish(fail('version', 'The local library changed in another tab. Check for the saved recording again.', 'word_sounds.syllable_library_version'));
        database.close();
      };
      try {
        transaction = database.transaction(['recordings', 'catalog'], mode);
        transaction.oncomplete = () => finish(null, result);
        transaction.onabort = () => finish(transaction.error || fail('aborted', 'The local library did not finish saving. The previous recording was kept.', 'word_sounds.syllable_library_aborted'));
        transaction.onerror = () => {}; // onabort supplies the final transaction outcome.
        const rejectTransaction = error => { try { transaction.abort(); } catch (_) {} finish(error); };
        run(transaction.objectStore('recordings'), transaction.objectStore('catalog'), value => { result = value; }, rejectTransaction);
      } catch (error) { try { transaction?.abort(); } catch (_) {} finish(error); }
    };
  });
  const load = (word, language, { signal } = {}) => {
    const match = identity(word, language);
    return transact('readonly', signal, (recordings, catalog, setResult, reject) => {
      const request = recordings.get(match.key);
      request.onsuccess = () => {
        const stored = request.result;
        if (!stored) { setResult({ task: null, token: null, corrupt: false }); return; }
        const token = typeof stored.token === 'string' ? stored.token : null;
        try {
          if (stored.version !== 1 || stored.key !== match.key || stored.languageKey !== match.languageKey || stored.targetWord !== match.targetWord || !token) throw fail('invalid', 'Saved recording needs review.');
          if (stored.task?.version !== 3) {
            const draft = core.recoverSyllableRecordingDraft(word, stored.task);
            if (draft) { setResult({ task: null, draft, token, corrupt: false, needsReview: true }); return; }
          }
          setResult({ task: cleanTask(stored.task, word, language), token, corrupt: false });
        } catch (_) { setResult({ task: null, token, corrupt: true }); }
      };
    });
  };
  const save = (word, language, task, { expectedToken = null, signal } = {}) => {
    const match = identity(word, language), clean = cleanTask(task, word, language);
    const bytes = JSON.stringify(clean).length * 2;
    return transact('readwrite', signal, (recordings, catalog, setResult, reject) => {
      const lookup = recordings.get(match.key), list = catalog.getAll();
      let existing, entries, loaded = 0;
      const prepare = () => {
        if (++loaded !== 2) return;
        try {
          const actualToken = typeof existing?.token === 'string' ? existing.token : null;
          if (actualToken !== expectedToken) throw fail('conflict', 'This word was changed in the local library in another tab. Find the saved recording again before replacing it.', 'word_sounds.syllable_library_conflict_replace');
          if (!Array.isArray(entries) || entries.some(entry => !entry || typeof entry.key !== 'string' || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0)) throw fail('invalid', 'The local library needs attention. Remove an affected saved recording and try again.', 'word_sounds.syllable_library_needs_attention');
          const others = entries.filter(entry => entry.key !== match.key);
          if (others.length >= maxEntries || others.reduce((sum, entry) => sum + entry.bytes, 0) + bytes > maxBytes) throw fail('full', 'The local library is full. Remove a saved word before adding another. The lesson still keeps its recordings.', 'word_sounds.syllable_library_full');
          const token = String(Date.now()) + ':' + Math.random().toString(36).slice(2) + ':' + clean.review.signature;
          recordings.put({ version: 1, ...match, token, task: clean });
          catalog.put({ key: match.key, bytes });
          setResult({ task: clean, token, corrupt: false });
        } catch (error) { reject(error); }
      };
      lookup.onsuccess = () => { existing = lookup.result; prepare(); };
      list.onsuccess = () => { entries = list.result; prepare(); };
    });
  };
  const remove = (word, language, { expectedToken = null, signal } = {}) => {
    const match = identity(word, language);
    return transact('readwrite', signal, (recordings, catalog, setResult, reject) => {
      const request = recordings.get(match.key);
      request.onsuccess = () => {
        const token = typeof request.result?.token === 'string' ? request.result.token : null;
        if (token !== expectedToken) { reject(fail('conflict', 'This word changed in another tab. Find the saved recording again before removing it.', 'word_sounds.syllable_library_conflict_remove')); return; }
        recordings.delete(match.key); catalog.delete(match.key); setResult({ task: null, token: null, corrupt: false });
      };
    });
  };
  return { identity, cleanTask, exportSet, parseSet, setFileLimit, load, save, remove, message, limits: { entries: maxEntries, bytes: maxBytes } };
}
// END WORD SOUNDS REVIEWED RECORDING LIBRARY

// BEGIN WORD SOUNDS SYLLABLE RECORDING EDITOR
let wordSoundsSyllableEditorPlayback = null;
function wordSoundsSyllableDraftBoardIdentity(board, language) {
  return [board?.revision || null, board?.review?.signature || null, board?.syllables || null,
    board?.audioUnits?.map(unit => [unit.text, WS_CORE.createSyllableCountAudioContext({ asset: unit.asset, language }).signature]) || null];
}
function wordSoundsSyllableRecordingDraftKey(word, language, board) {
  return JSON.stringify([WS_CORE.packAudioKey(word), WS_CORE.packAudioLanguageKey(language), wordSoundsSyllableDraftBoardIdentity(board, language)]);
}
function wordSoundsSyllableCountDraftKey(word, language, resolution, audioContext, recordedTask) {
  const context = audioContext || WS_CORE.createSyllableCountAudioContext({ language });
  return JSON.stringify([WS_CORE.packAudioKey(word), WS_CORE.packAudioLanguageKey(language), context.signature,
    resolution?.reviewedEvidence?.review?.signature || resolution?.review?.signature || null, wordSoundsSyllableDraftBoardIdentity(recordedTask, language)]);
}
function wordSoundsSyllableDraftStatus({ kind, word, language, draft, board, resolution, audioContext, recordedTask }) {
  if (!draft || draft.version !== 1) return { valid: false, dirty: false };
  if (kind === 'count') {
    const valid = draft.key === wordSoundsSyllableCountDraftKey(word, language, resolution, audioContext, recordedTask) && typeof draft.count === 'string' && draft.count.length <= 16;
    const baseline = resolution?.supported ? String(resolution.count) : '';
    const same = draft.count === baseline || baseline !== '' && draft.count?.trim() !== '' && Number(draft.count) === Number(baseline);
    return { valid, dirty: valid && !same };
  }
  if (kind !== 'recording') return { valid: false, dirty: false };
  const valid = draft.key === wordSoundsSyllableRecordingDraftKey(word, language, board) && Array.isArray(draft.units) && draft.units.length >= 2 && draft.units.length <= 8 && draft.units.every(unit => unit && typeof unit.label === 'string');
  if (!valid) return { valid: false, dirty: false };
  const resolved = WS_CORE.resolveSyllableTask(word, board, language);
  const baselineTask = resolved.supported && resolved.contentStatus === 'teacher_recorded' ? resolved : WS_CORE.recoverSyllableRecordingDraft(word, board);
  const template = WS_CORE.syllableRecordingTemplate(word, language);
  const baseline = baselineTask ? baselineTask.audioUnits.map(unit => ({ label: unit.text, asset: unit.asset }))
    : Array.from({ length: Math.max(2, Math.min(8, template.count || 2)) }, (_, index) => ({ label: template.syllables[index] || '', asset: null }));
  const assetIdentity = asset => asset ? [String(asset.mime || '').toLowerCase(), asset.base64 || '', asset.durationSeconds ?? null, asset.decoded === true, asset.source || null] : null;
  const same = draft.units.length === baseline.length && draft.units.every((unit, index) => unit.label.trim() === baseline[index].label.trim() &&
    JSON.stringify(assetIdentity(unit.asset)) === JSON.stringify(assetIdentity(baseline[index].asset)));
  return { valid: true, dirty: !same };
}
function wordSoundsSyllableHiddenDraftWords(stores, visibleWords, language) {
  const visible = new Set(visibleWords.map(WS_CORE.packAudioKey)), locale = WS_CORE.packAudioLanguageKey(language);
  return [...new Set(stores.flatMap(store => [...store.values()].flatMap(draft => {
    if (draft?.dirty !== true) return [];
    try { const [word, savedLocale] = JSON.parse(draft.key); return typeof word === 'string' && (savedLocale !== locale || !visible.has(word)) ? [word] : []; }
    catch (_) { return []; }
  })))];
}
function useWordSoundsSyllableExitGuard(getDirtyWords, translate) {
  const [pending, setPending] = React.useState(null);
  const latest = React.useRef(getDirtyWords); latest.current = getDirtyWords;
  const actionRef = React.useRef(null), focusRef = React.useRef(null), restoreRef = React.useRef(false), noticeRef = React.useRef(null);
  const titleId = React.useId(), descriptionId = React.useId();
  const keepEditing = React.useCallback(() => {
    actionRef.current = null; restoreRef.current = true; setPending(null);
  }, []);
  const requestExit = React.useCallback(action => {
    if (actionRef.current) { keepEditing(); return; }
    const words = [...new Set(latest.current?.() || [])];
    if (!words.length) { action(); return; }
    focusRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    actionRef.current = action; setPending(words);
  }, [keepEditing]);
  React.useLayoutEffect(() => {
    if (pending) noticeRef.current?.querySelector('button')?.focus();
    else if (restoreRef.current) { restoreRef.current = false; if (focusRef.current?.isConnected) focusRef.current.focus(); }
  }, [pending]);
  const tr = (key, fallback, params = {}) => {
    let value;
    for (const candidate of [key, key.replace(/^word_sounds\./, '')]) {
      try { const result = translate?.(candidate, fallback, params); if (typeof result === 'string' && result && result !== candidate) { value = result; break; } } catch (_) {}
    }
    return (value || fallback).replace(/\{\{?([a-zA-Z0-9_]+)\}?\}/g, (token, name) => Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : token);
  };
  const h = React.createElement;
  const notice = pending ? h('div', { className: 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4' },
    h('div', { ref: noticeRef, role: 'alertdialog', 'aria-modal': true, 'aria-labelledby': titleId, 'aria-describedby': descriptionId,
      'data-syllable-exit-notice': true, className: 'w-full max-w-lg rounded-2xl border border-amber-400 bg-white p-5 text-slate-900 shadow-xl',
      onKeyDownCapture: event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); keepEditing(); }
        else if (event.key === 'Tab') {
          const buttons = [...noticeRef.current.querySelectorAll('button')], first = buttons[0], last = buttons[buttons.length - 1];
          event.stopPropagation();
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      } },
      h('h2', { id: titleId, className: 'font-bold text-lg' }, tr('word_sounds.syllable_exit_title', 'Discard unfinished syllable edits?')),
      h('p', { id: descriptionId, className: 'my-3' }, tr('word_sounds.syllable_exit_help', 'Unfinished edits for {words} will be lost when you leave. Saved counts and recordings will be kept.', { words: pending.join(', ') })),
      h('button', { type: 'button', onClick: keepEditing, className: 'min-h-11 rounded-lg border border-violet-500 px-4 py-2 mr-2' }, tr('word_sounds.syllable_keep_editing', 'Keep editing')),
      h('button', { type: 'button', className: 'min-h-11 rounded-lg border border-amber-500 px-4 py-2', onClick: () => {
        const action = actionRef.current; actionRef.current = null; restoreRef.current = false; setPending(null); action?.();
      } }, tr('word_sounds.syllable_discard_edits', 'Discard edits')))) : null;
  return { requestExit, notice };
}
function WordSoundsSyllableDraftNotice({ words, onReview, onUseSaved, translate }) {
  const tr = (key, fallback, params = {}) => {
    let value;
    for (const candidate of [key, key.replace(/^word_sounds\./, '')]) {
      try { const result = translate?.(candidate, fallback, params); if (typeof result === 'string' && result && result !== candidate) { value = result; break; } } catch (_) {}
    }
    return (value || fallback).replace(/\{\{?([a-zA-Z0-9_]+)\}?\}/g, (token, name) => Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : token);
  };
  const h = React.createElement;
  return h('div', { role: 'alert', tabIndex: -1, 'data-syllable-unsaved-notice': true, className: 'my-3 rounded-xl border border-amber-400 bg-amber-50 p-4 text-amber-950' },
    h('p', { className: 'font-bold' }, tr('word_sounds.syllable_unsaved_title', 'Unsaved syllable edits')),
    h('p', { className: 'my-2 text-sm' }, tr('word_sounds.syllable_unsaved_start', 'You have unfinished syllable edits for {words}. Review and save them, or start with the saved counts and recordings. Unsaved edits will not be used.', { words: [...new Set(words)].join(', ') })),
    h('button', { type: 'button', onClick: onReview, className: 'min-h-11 rounded-lg border border-amber-500 bg-white px-3 py-2 mr-2 focus-visible:ring-2' }, tr('word_sounds.syllable_review_edits', 'Review edits')),
    h('button', { type: 'button', onClick: onUseSaved, className: 'min-h-11 rounded-lg border border-amber-500 bg-white px-3 py-2 focus-visible:ring-2' }, tr('word_sounds.syllable_use_saved', 'Use saved version')));
}
// Conservative, optional edits: retain quiet speech plus a 200 ms margin and never boost more than 6 dB.
function processWordSoundsSyllablePcm(channels, sampleRate, options = {}) {
  if (!Array.isArray(channels) || !channels.length || channels.length > 2 || !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw Object.assign(new Error('Cleanup supports mono or stereo recordings with a standard sample rate.'), { messageKey: 'word_sounds.syllable_rec_err_channels' });
  const length = channels[0]?.length;
  if (!Number.isInteger(length) || length < sampleRate * 0.08 || length > sampleRate * 8 || channels.some(channel => !channel || channel.length !== length)) throw Object.assign(new Error('Record one syllable per clip, between 0.08 and 8 seconds.'), { messageKey: 'word_sounds.syllable_rec_err_duration' });
  let first = length, last = -1, peak = 0;
  for (const channel of channels) for (let index = 0; index < length; index++) {
    const value = Math.abs(channel[index]);
    if (!Number.isFinite(value)) throw Object.assign(new Error('This recording contains invalid audio samples.'), { messageKey: 'word_sounds.syllable_rec_err_samples' });
    peak = Math.max(peak, value);
    // Use the same very quiet floor as the recording validator, not a speech/noise classifier.
    if (value > 0.0001) { first = Math.min(first, index); last = Math.max(last, index); }
  }
  if (last < first) throw Object.assign(new Error('This recording is silent. Record the syllable again.'), { messageKey: 'word_sounds.syllable_rec_err_silent' });
  let start = 0, end = length;
  if (options.trimSilence) {
    const margin = Math.ceil(sampleRate * 0.2);
    start = Math.max(0, first - margin);
    end = Math.min(length, last + margin + 1);
    // Tiny edits offer no useful benefit and make comparisons harder.
    if (length - (end - start) < sampleRate * 0.1) { start = 0; end = length; }
  }
  const gain = options.levelVolume ? Math.min(2, 0.8 / peak) : 1;
  const output = channels.map(channel => {
    const result = new Float32Array(end - start);
    for (let index = 0; index < result.length; index++) result[index] = channel[start + index] * gain;
    return result;
  });
  return { channels: output, sampleRate, startFrame: start, endFrame: end, removedSeconds: (length - (end - start)) / sampleRate, gain, durationSeconds: (end - start) / sampleRate };
}
function encodeWordSoundsSyllableWav(channels, sampleRate) {
  if (!Array.isArray(channels) || !channels.length || channels.length > 2 || !Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw Object.assign(new Error('This recording format cannot be cleaned up.'), { messageKey: 'word_sounds.syllable_rec_err_format' });
  const frames = channels[0]?.length;
  if (!Number.isInteger(frames) || frames < sampleRate * 0.08 || frames > sampleRate * 8 || channels.some(channel => channel?.length !== frames)) throw Object.assign(new Error('This recording has an invalid duration.'), { messageKey: 'word_sounds.syllable_rec_err_invalid_duration' });
  const size = 44 + frames * channels.length * 2;
  if (size > 384000) throw Object.assign(new Error('The cleaned WAV would exceed 384 KB. Keep the original or record a shorter clip.'), { messageKey: 'word_sounds.syllable_rec_err_wav_size' });
  const bytes = new ArrayBuffer(size), view = new DataView(bytes);
  const text = (offset, value) => { for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index)); };
  text(0, 'RIFF'); view.setUint32(4, size - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * channels.length * 2, true);
  view.setUint16(32, channels.length * 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, size - 44, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) for (const channel of channels) {
    if (!Number.isFinite(channel[frame])) throw Object.assign(new Error('This recording contains invalid audio samples.'), { messageKey: 'word_sounds.syllable_rec_err_samples' });
    const value = Math.max(-1, Math.min(1, channel[frame]));
    view.setInt16(offset, Math.round(value < 0 ? value * 32768 : value * 32767), true); offset += 2;
  }
  return bytes;
}
async function decodeWordSoundsSyllableBytes(bytes, AudioContextClass) {
  if (!AudioContextClass) throw Object.assign(new Error('This browser cannot check recordings. Try a current browser.'), { messageKey: 'word_sounds.syllable_rec_err_browser' });
  const offline = AudioContextClass === window.OfflineAudioContext || AudioContextClass === window.webkitOfflineAudioContext;
  const context = offline ? new AudioContextClass(1, 1, 44100) : new AudioContextClass();
  try { return await context.decodeAudioData(bytes.slice(0)); }
  catch (_) { throw Object.assign(new Error('This recording could not be decoded. Export it as WAV or MP3 and try again.'), { messageKey: 'word_sounds.syllable_rec_err_decode' }); }
  finally { try { await context.close?.(); } catch (_) {} }
}
async function cleanWordSoundsSyllableRecording(asset, options, AudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext || window.AudioContext || window.webkitAudioContext) {
  if (!WS_CORE.syllableAssetSource(asset)) throw Object.assign(new Error('Choose a checked syllable recording first.'), { messageKey: 'word_sounds.syllable_rec_err_choose_checked' });
  const binary = atob(asset.base64), bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  const decoded = await decodeWordSoundsSyllableBytes(bytes.buffer, AudioContextClass);
  const pcm = processWordSoundsSyllablePcm(Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index)), decoded.sampleRate, options);
  const wav = encodeWordSoundsSyllableWav(pcm.channels, pcm.sampleRate);
  // Reuse the normal decoder/validator so a cleanup must meet the same delivery rules as an upload.
  const cleaned = await readWordSoundsSyllableRecording(new Blob([wav], { type: 'audio/wav' }), AudioContextClass);
  return { asset: cleaned, removedSeconds: pcm.removedSeconds, gain: pcm.gain };
}

async function readWordSoundsSyllableRecording(file, AudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext || window.AudioContext || window.webkitAudioContext) {
  if (!file || file.size < 16 || file.size > 384000) throw Object.assign(new Error('Choose an audio file smaller than 384 KB. Short MP3 or WebM recordings work well.'), { messageKey: 'word_sounds.syllable_rec_err_file_size' });
  if (!AudioContextClass) throw Object.assign(new Error('This browser cannot check recordings. Try a current browser.'), { messageKey: 'word_sounds.syllable_rec_err_browser' });
  const mime = String(file.type || '').split(';')[0].toLowerCase();
  if (!/^audio\/(?:wav|x-wav|wave|mpeg|mp3|ogg|webm|mp4|x-m4a|aac)$/.test(mime)) throw Object.assign(new Error('Choose a WAV, MP3, OGG, WebM, M4A, or AAC audio file.'), { messageKey: 'word_sounds.syllable_rec_err_file_type' });
  const bytes = await file.arrayBuffer();
  const decoded = await decodeWordSoundsSyllableBytes(bytes, AudioContextClass);
  if (!Number.isFinite(decoded.duration) || decoded.duration < 0.08 || decoded.duration > 8) throw Object.assign(new Error('Record one syllable per clip, between 0.08 and 8 seconds.'), { messageKey: 'word_sounds.syllable_rec_err_duration' });
  let audible = false;
  for (let channel = 0; channel < decoded.numberOfChannels && !audible; channel++) {
    const samples = decoded.getChannelData(channel);
    for (let index = 0; index < samples.length; index++) if (Math.abs(samples[index]) > 0.0001) { audible = true; break; }
  }
  if (!audible) throw Object.assign(new Error('This recording is silent. Record the syllable again.'), { messageKey: 'word_sounds.syllable_rec_err_silent' });
  let binary = '';
  const view = new Uint8Array(bytes);
  for (let offset = 0; offset < view.length; offset += 0x8000) binary += String.fromCharCode(...view.subarray(offset, offset + 0x8000));
  return { mime, base64: btoa(binary), durationSeconds: decoded.duration, decoded: true, source: 'teacher_recording' };
}
function WordSoundsSyllableRecordingEditor({ word, language, board, onSave, onBeforePreview, id, translate, draft, onDraftChange }) {
  const h = React.createElement;
  const tr = (key, fallback, params = {}) => {
    let value;
    for (const candidate of [key, key.replace(/^word_sounds\./, '')]) {
      try { const result = translate?.(candidate, fallback, params); if (typeof result === 'string' && result && result !== candidate) { value = result; break; } } catch (_) {}
    }
    return (value || fallback).replace(/\{\{?([a-zA-Z0-9_]+)\}?\}/g, (token, name) => Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : token);
  };
  const resolved = WS_CORE.resolveSyllableTask(word, board, language);
  const savedTask = resolved.supported && resolved.contentStatus === 'teacher_recorded' ? resolved : null;
  const recoveredDraft = !savedTask && WS_CORE.recoverSyllableRecordingDraft(word, board);
  const template = WS_CORE.syllableRecordingTemplate(word, language);
  const draftKey = React.useMemo(() => wordSoundsSyllableRecordingDraftKey(word, language, board), [word, language, board]);
  const copyUnit = unit => ({ label: String(unit?.label || '').slice(0, 40), asset: unit?.asset || null, originalAsset: unit?.originalAsset || null, cleanupSummary: typeof unit?.cleanupSummary === 'string' ? unit.cleanupSummary : null });
  const restored = draft?.version === 1 && draft.key === draftKey && Array.isArray(draft.units) && draft.units.length >= 2 && draft.units.length <= 8 && draft.units.every(unit => unit && typeof unit === 'object') ? draft : null;
  const initial = () => restored ? restored.units.map(copyUnit) : (savedTask || recoveredDraft) ? (savedTask || recoveredDraft).audioUnits.map(unit => ({ label: unit.text, asset: unit.asset })) : Array.from({ length: Math.max(2, Math.min(8, template.count || 2)) }, (_, index) => ({ label: template.syllables[index] || '', asset: null }));
  const readinessId = React.useId();
  const [units, setUnitsState] = React.useState(initial);
  const unitsRef = React.useRef(units);
  const draftCallback = React.useRef(onDraftChange); draftCallback.current = onDraftChange;
  // Only omitted slots live here, at most eight in this editor session. Restored
  // slots are consumed, so editing and hiding them again keeps the latest clip.
  const restoreOmitted = () => Array.isArray(restored?.omittedUnits) ? restored.omittedUnits.slice(0, 8).map(unit => unit ? copyUnit(unit) : null) : [];
  const omittedUnits = React.useRef(restoreOmitted());
  // Publish only edits, never incoming draft echoes or mount/reset effects.
  const setUnits = (next, publish = true) => {
    const value = typeof next === 'function' ? next(unitsRef.current) : next;
    unitsRef.current = value; setUnitsState(value);
    if (publish) {
      const nextDraft = { version: 1, key: draftKey, units: value.map(copyUnit), omittedUnits: omittedUnits.current.slice(0, 8).map(unit => unit ? copyUnit(unit) : null) };
      nextDraft.dirty = wordSoundsSyllableDraftStatus({ kind: 'recording', word, language, board, draft: nextDraft }).dirty;
      draftCallback.current?.(nextDraft, draftKey);
    }
  };
  const syllableLabels = React.useRef([]);
  const movedLabel = React.useRef(null);
  const [heard, setHeard] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [recording, setRecording] = React.useState(null);
  const [operation, setOperation] = React.useState(null);
  const [status, setStatus] = React.useState('');
  const [trimSilence, setTrimSilence] = React.useState(true);
  const [levelVolume, setLevelVolume] = React.useState(true);
  const library = React.useMemo(() => { let storage; try { storage = window.indexedDB; } catch (_) {} return createWordSoundsReviewedLibrary(WS_CORE, storage); }, []);
  const [libraryResult, setLibraryResult] = React.useState(null);
  const [libraryBusy, setLibraryBusy] = React.useState(false);
  const [libraryStatus, setLibraryStatus] = React.useState('');
  const [rememberRecording, setRememberRecording] = React.useState(false);
  const libraryAbort = React.useRef(null);
  const libraryContext = React.useRef('');
  libraryContext.current = draftKey;
  const live = React.useRef(true);
  const epoch = React.useRef(0);
  const audio = React.useRef(null);
  const recorder = React.useRef(null);
  const buttonClass = 'px-3 py-2 rounded-lg border border-violet-300 text-violet-900 bg-white disabled:opacity-50';
  const errorText = (error, key, fallback) => error?.messageKey ? tr(error.messageKey, error.message) : error?.message || (key ? tr(key, fallback) : '');
  const stop = () => {
    epoch.current++;
    if (live.current) setOperation(null);
    if (libraryAbort.current) { libraryAbort.current.abort(); libraryAbort.current = null; if (live.current) { setLibraryBusy(false); setLibraryStatus(tr('word_sounds.syllable_library_action_cancelled', 'Local library action cancelled. Find the saved recording again to check its current state.')); } }
    if (wordSoundsSyllableEditorPlayback?.owner === audio) wordSoundsSyllableEditorPlayback = null;
    if (audio.current) { audio.current.pause(); audio.current = null; }
    if (recorder.current) {
      const active = recorder.current; recorder.current = null;
      clearTimeout(active.timer);
      try { if (active.recorder.state !== 'inactive') active.recorder.stop(); } catch (_) {}
      active.stream.getTracks().forEach(track => track.stop());
    }
  };
  const ownPlayback = () => {
    wordSoundsSyllableEditorPlayback?.stop();
    stop();
    wordSoundsSyllableEditorPlayback = { owner: audio, stop: () => { stop(); if (live.current) { setBusy(false); setRecording(null); setHeard(false); setConfirmed(false); setStatus(tr('word_sounds.syllable_rec_preview_stopped_again', 'Preview stopped. Preview the full sequence again before saving.')); } } };
    if (onBeforePreview) onBeforePreview();
  };
  React.useEffect(() => { live.current = true; return () => { live.current = false; stop(); }; }, []);
  React.useEffect(() => {
    stop(); omittedUnits.current = restoreOmitted(); movedLabel.current = null;
    unitsRef.current = initial(); setUnitsState(unitsRef.current); setHeard(false); setConfirmed(false); setBusy(false); setRecording(null); setStatus('');
  }, [draftKey]);
  React.useEffect(() => {
    if (movedLabel.current !== null) { syllableLabels.current[movedLabel.current]?.focus(); movedLabel.current = null; }
  }, [units]);
  React.useEffect(() => { setLibraryResult(null); setLibraryStatus(''); setRememberRecording(false); }, [word, language]);
  const cancelOperation = () => {
    const wasRecording = operation === 'microphone' || operation === 'recording';
    stop(); setBusy(false); setRecording(null); setHeard(false); setConfirmed(false);
    setStatus(operation === 'preview' ? tr('word_sounds.syllable_rec_preview_stopped_again', 'Preview stopped. Preview the full sequence again before saving.') : wasRecording ? tr('word_sounds.syllable_rec_recording_cancelled', 'Recording cancelled. Any previous checked clip is kept. You can record again or upload a file.') : tr('word_sounds.syllable_rec_check_cancelled', 'Audio check or cleanup cancelled. Any previous checked clip is kept.'));
  };
  const change = (next, publish = true) => { stop(); setUnits(next, publish); setHeard(false); setConfirmed(false); setStatus(''); };
  const changeCount = count => {
    if (busy || libraryBusy || ![2, 3, 4, 5, 6, 7, 8].includes(count) || count === units.length) return;
    const next = Array.from({ length: count }, (_, index) => units[index] || omittedUnits.current[index] || { label: '', asset: null });
    for (let index = count; index < units.length; index++) omittedUnits.current[index] = units[index];
    for (let index = 0; index < count; index++) delete omittedUnits.current[index];
    change(next);
    setStatus(tr('word_sounds.syllable_rec_count_changed', 'Syllable count changed. Preview the full sequence again before saving.'));
  };
  const moveUnit = (index, direction) => {
    const destination = index + direction;
    if (busy || libraryBusy || destination < 0 || destination >= units.length) return;
    const next = units.slice();
    [next[index], next[destination]] = [next[destination], next[index]];
    movedLabel.current = destination;
    change(next);
    setStatus(tr('word_sounds.syllable_rec_moved', 'Syllable {from} moved to position {to}. Preview the full sequence again before saving.', { from: index + 1, to: destination + 1 }));
  };
  const commit = task => {
    // Current hosts apply the task through synchronous React setters. Preserve
    // the draft and recovery slots if that callback rejects the update by throwing.
    try { if (onSave(task) === false) return false; } catch (_) { return false; }
    draftCallback.current?.(null, draftKey);
    omittedUnits.current = [];
    return true;
  };
  const saveFailed = () => setStatus(tr('word_sounds.syllable_rec_apply_failed', 'The recordings could not be applied to this lesson. Your draft is kept. Try Save reviewed syllables again.'));
  const libraryOperation = async (operation, success) => {
    libraryAbort.current?.abort();
    const controller = new AbortController(), context = libraryContext.current;
    libraryAbort.current = controller; setLibraryBusy(true);
    const current = () => live.current && libraryAbort.current === controller && libraryContext.current === context && !controller.signal.aborted;
    try { const result = await operation(controller.signal); if (current()) { libraryAbort.current = null; setLibraryBusy(false); success(result); } }
    catch (error) { if (current() && error?.code !== 'cancelled') setLibraryStatus(library.message(error, tr)); }
    finally { if (libraryAbort.current === controller) { libraryAbort.current = null; if (live.current) setLibraryBusy(false); } }
  };
  const findLibrary = () => {
    setLibraryStatus(tr('word_sounds.syllable_library_looking', 'Looking for reviewed recordings on this device…'));
    return libraryOperation(signal => library.load(word, language, { signal }), result => {
      setLibraryResult(result);
      setLibraryStatus(result.task ? tr('word_sounds.syllable_library_found', 'Reviewed recordings found for this word and recording language.') : result.draft ? tr('word_sounds.syllable_library_found_older', 'Older recordings found. Load the clips, listen, and confirm them for this recording language.') : result.corrupt ? tr('word_sounds.syllable_library_found_invalid', 'The saved recording is invalid or stale. Review the current clips before replacing it.') : tr('word_sounds.syllable_library_none', 'No reviewed recordings saved for this word and recording language.'));
    });
  };
  const useLibrary = () => {
    try {
      if (libraryResult?.draft) {
        movedLabel.current = null;
        change(libraryResult.draft.audioUnits.map(unit => ({ label: unit.text, asset: unit.asset })));
        setLibraryStatus(tr('word_sounds.syllable_library_older_loaded', 'Older clips loaded as a draft. Preview the full sequence and confirm this recording language before saving.'));
        return;
      }
      const task = library.cleanTask(libraryResult?.task, word, language);
      if (!commit(task)) { setLibraryStatus(tr('word_sounds.syllable_library_apply_failed', 'The saved recordings could not be applied to this lesson. Your current draft is kept; try again.')); return; }
      movedLabel.current = null;
      change(task.audioUnits.map(unit => ({ label: unit.text, asset: unit.asset })), false);
      setLibraryStatus(tr('word_sounds.syllable_library_applied', 'Saved recordings applied to this lesson. Its answer choices are kept.'));
    } catch (error) { setLibraryStatus(library.message(error, tr)); }
  };
  const removeLibrary = () => {
    setLibraryStatus(tr('word_sounds.syllable_library_removing', 'Removing this word from the local library…'));
    return libraryOperation(signal => library.remove(word, language, { signal, expectedToken: libraryResult?.token || null }), result => {
      setLibraryResult(result); setLibraryStatus(tr('word_sounds.syllable_library_removed', 'Removed from the local library. Recordings already saved in lessons are kept.'));
    });
  };
  const downloadSet = () => {
    let url, link;
    try {
      const text = library.exportSet(board, word, language);
      url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      link = document.createElement('a'); link.href = url;
      // Language in the name, and letters in any script kept: "мама" and
      // "مرحبا" both used to download as "syllables--.json".
      const match = library.identity(word, language);
      const part = value => String(value || '').replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      link.download = ['syllables', part(match.languageKey), part(match.targetWord)].filter(Boolean).join('-') + '.json';
      link.hidden = true; document.body.appendChild(link); link.click();
      setLibraryStatus(tr('word_sounds.syllable_library_download_ready', 'Download prepared from the recordings saved in this lesson. Import the file for the same word and recording language on another device.'));
    } catch (error) { setLibraryStatus(errorText(error, 'word_sounds.syllable_library_download_failed', 'The recording set could not be downloaded. Save reviewed syllables first and try again.')); }
    finally { link?.remove(); if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  };
  const importSet = async file => {
    if (!file) return;
    stop(); const token = epoch.current, context = libraryContext.current;
    const current = () => live.current && epoch.current === token && libraryContext.current === context;
    setBusy(true); setHeard(false); setConfirmed(false); setOperation('checking'); setStatus(tr('word_sounds.syllable_library_checking_set', 'Checking recording set…'));
    try {
      if (!Number.isFinite(file.size) || file.size < 1 || file.size > library.setFileLimit) throw new Error(tr('word_sounds.syllable_library_set_too_large', 'Choose a recording set smaller than 5 MB.'));
      const text = await file.text();
      if (!current()) return;
      const task = library.parseSet(text, word, language), next = [];
      for (let index = 0; index < task.audioUnits.length; index++) {
        if (!current()) return;
        setStatus(tr('word_sounds.syllable_library_checking_n', 'Checking syllable {n} of {total}…', { n: index + 1, total: task.audioUnits.length }));
        const unit = task.audioUnits[index], binary = atob(unit.asset.base64), bytes = new Uint8Array(binary.length);
        for (let offset = 0; offset < binary.length; offset++) bytes[offset] = binary.charCodeAt(offset);
        const asset = await readWordSoundsSyllableRecording(new Blob([bytes], { type: unit.asset.mime }));
        if (!current()) return;
        next.push({ label: unit.text, asset });
      }
      // Replace the draft atomically; a failed or cancelled clip keeps all
      // previous recordings. File metadata cannot grant teacher approval.
      omittedUnits.current = []; movedLabel.current = null;
      setUnits(next);
      setStatus(tr('word_sounds.syllable_library_imported', 'Recording set imported for review. Preview the full sequence, then confirm it before saving to this lesson.'));
    } catch (error) { if (current()) setStatus(tr('word_sounds.syllable_library_import_failed', '{reason} Your previous recordings are kept.', { reason: errorText(error, 'word_sounds.syllable_library_import_unreadable', 'This recording set could not be read.') })); }
    finally { if (current()) { setBusy(false); setOperation(null); } }
  };
  const install = async (index, file, token) => {
    const context = libraryContext.current;
    try {
      const asset = await readWordSoundsSyllableRecording(file);
      if (!live.current || epoch.current !== token || libraryContext.current !== context) return;
      setUnits(previous => previous.map((unit, i) => i === index ? { ...unit, asset, originalAsset: null, cleanupSummary: null } : unit));
      setHeard(false); setConfirmed(false); setStatus(tr('word_sounds.syllable_rec_clip_checked', 'Clip checked. Preview the full sequence before saving.'));
    } catch (error) { if (live.current && epoch.current === token && libraryContext.current === context) setStatus(errorText(error)); }
    finally { if (live.current && epoch.current === token && libraryContext.current === context) { setBusy(false); setRecording(null); setOperation(null); } }
  };
  const upload = (index, file) => {
    if (!file) return;
    stop(); const token = epoch.current; setBusy(true); setHeard(false); setConfirmed(false); setStatus(tr('word_sounds.syllable_rec_checking', 'Checking recording…')); setOperation('checking');
    install(index, file, token);
  };
  const record = async index => {
    ownPlayback(); const token = epoch.current; setBusy(true); setHeard(false); setConfirmed(false); setStatus(tr('word_sounds.syllable_rec_allow_mic', 'Allow the microphone, then say one syllable.')); setOperation('microphone');
    const context = libraryContext.current;
    const current = () => live.current && epoch.current === token && libraryContext.current === context;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!current()) { stream.getTracks().forEach(track => track.stop()); return; }
      const capture = new MediaRecorder(stream); const chunks = [];
      capture.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      capture.onerror = () => {
        if (!current()) { stream.getTracks().forEach(track => track.stop()); return; }
        // MediaRecorder can emit stop with partial chunks after an error. Cancel
        // this epoch before stopping it so failed audio can never replace a clip.
        stop(); setBusy(false); setRecording(null); setHeard(false); setConfirmed(false);
        setStatus(tr('word_sounds.syllable_rec_mic_failed', 'Microphone recording failed. Any previous checked clip is kept. Record again or upload a recording.'));
      };
      capture.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (!current()) return;
        clearTimeout(recorder.current?.timer); recorder.current = null;
        setRecording(null); setStatus(tr('word_sounds.syllable_rec_checking', 'Checking recording…')); setOperation('checking');
        install(index, new Blob(chunks, { type: capture.mimeType || chunks[0]?.type || 'audio/webm' }), token);
      };
      capture.start(); setRecording(index); setOperation('recording'); setStatus(tr('word_sounds.syllable_rec_recording_now', 'Recording one syllable. Press Stop when finished.'));
      recorder.current = { recorder: capture, stream, timer: setTimeout(() => { if (capture.state !== 'inactive') capture.stop(); }, 7800) };
    } catch (_) { stream?.getTracks().forEach(track => track.stop()); if (current()) { setBusy(false); setRecording(null); setOperation(null); setStatus(tr('word_sounds.syllable_rec_mic_unavailable', 'Microphone unavailable. Upload a recording instead.')); } }
  };
  const cleanup = async index => {
    stop(); const token = epoch.current; setBusy(true); setHeard(false); setConfirmed(false); setStatus(tr('word_sounds.syllable_rec_cleaning', 'Cleaning up recording…')); setOperation('cleanup');
    const context = libraryContext.current;
    const current = () => live.current && epoch.current === token && libraryContext.current === context;
    const originalAsset = units[index].originalAsset || units[index].asset;
    try {
      const result = await cleanWordSoundsSyllableRecording(originalAsset, { trimSilence, levelVolume });
      if (!current()) return;
      const cleanupSummary = tr('word_sounds.syllable_rec_cleanup_summary', '{seconds} s outer silence removed; volume ×{gain}.', { seconds: result.removedSeconds.toFixed(2), gain: result.gain.toFixed(2) });
      setUnits(previous => previous.map((unit, i) => i === index ? { ...unit, asset: result.asset, originalAsset, cleanupSummary } : unit));
      setStatus(tr('word_sounds.syllable_rec_cleanup_done', '{summary} Compare with the original, then preview the full sequence before saving.', { summary: cleanupSummary }));
    } catch (error) { if (current()) setStatus(errorText(error, 'word_sounds.syllable_rec_cleanup_failed', 'Cleanup failed. The original recording is still available.')); }
    finally { if (current()) { setBusy(false); setOperation(null); } }
  };
  const preview = async (indices, original = false) => {
    ownPlayback(); const token = epoch.current; setBusy(true); setStatus(tr('word_sounds.syllable_rec_playing', 'Playing recordings…')); setOperation('preview');
    const context = libraryContext.current;
    const current = () => live.current && epoch.current === token && libraryContext.current === context;
    try {
      for (const index of indices) {
        if (!current()) return;
        const source = WS_CORE.syllableAssetSource(original ? units[index].originalAsset : units[index].asset);
        if (!source) throw new Error(tr('word_sounds.syllable_rec_add_every_clip', 'Add a recording for every syllable first.'));
        await new Promise((resolve, reject) => {
          const clip = new Audio(source); audio.current = clip;
          const timer = setTimeout(() => { clip.pause(); reject(new Error(tr('word_sounds.syllable_rec_play_timeout', 'This recording did not finish playing. Try another file.'))); }, 12000);
          const finish = error => { clearTimeout(timer); clip.onended = null; clip.onerror = null; clip.onpause = null; error ? reject(error) : resolve(); };
          clip.onended = () => finish(); clip.onerror = () => finish(new Error(tr('word_sounds.syllable_rec_play_error', 'This recording could not play. Try another file.')));
          clip.onpause = () => { if (!clip.ended) finish(new Error(tr('word_sounds.syllable_rec_preview_stopped', 'Preview stopped.'))); };
          Promise.resolve(clip.play()).catch(error => finish(error));
        });
        if (indices.length > 1 && index !== indices[indices.length - 1]) await new Promise(resolve => setTimeout(resolve, 350));
      }
      if (!current()) return;
      if (!original && indices.length === units.length) setHeard(true);
      setStatus(tr('word_sounds.syllable_rec_preview_complete', 'Preview complete. Check that each clip is one spoken syllable and the sequence blends into “{word}”.', { word }));
    } catch (error) { if (current()) { setHeard(false); setConfirmed(false); setStatus(errorText(error, 'word_sounds.syllable_rec_preview_failed', 'Preview failed.')); } }
    finally { if (current()) { audio.current = null; setBusy(false); setOperation(null); } }
  };
  const missingLabels = [], missingClips = [];
  units.forEach((unit, index) => {
    if (!unit.label.trim()) missingLabels.push(index + 1);
    if (!WS_CORE.syllableAssetSource(unit.asset)) missingClips.push(index + 1);
  });
  const complete = !missingLabels.length && !missingClips.length;
  const matchesSaved = !!savedTask && units.length === savedTask.audioUnits.length && units.every((unit, index) => {
    const saved = savedTask.audioUnits[index], asset = unit.asset;
    return unit.label.trim() === saved.text && asset?.mime?.toLowerCase() === saved.asset.mime.toLowerCase() &&
      asset?.base64 === saved.asset.base64 && asset?.durationSeconds === saved.asset.durationSeconds &&
      asset?.decoded === true && asset?.source === 'teacher_recording';
  });
  const draftState = matchesSaved ? tr('word_sounds.syllable_rec_summary_saved', 'Syllable recordings for “{word}” — saved in lesson', { word })
    : savedTask ? tr('word_sounds.syllable_rec_summary_unsaved', 'Syllable recordings for “{word}” — unsaved changes', { word })
    : tr('word_sounds.syllable_rec_summary_not_saved', 'Syllable recordings for “{word}” — not saved', { word });
  const nextStep = busy ? (operation === 'microphone' ? tr('word_sounds.syllable_rec_next_mic', 'Allow microphone access or cancel the request.') : operation === 'recording' ? tr('word_sounds.syllable_rec_next_recording', 'Finish the recording or cancel it.') : operation === 'preview' ? tr('word_sounds.syllable_rec_next_preview', 'Listen to the sequence, or stop the preview.') : operation === 'cleanup' ? tr('word_sounds.syllable_rec_next_cleanup', 'Wait for cleanup to finish, or cancel it.') : tr('word_sounds.syllable_rec_next_check', 'Wait for the audio check to finish, or cancel it.'))
    : libraryBusy ? tr('word_sounds.syllable_rec_next_library', 'Wait for the local library action to finish.')
    : !complete ? [missingLabels.length === 1 ? tr('word_sounds.syllable_rec_next_label_one', 'Add labels for syllable {list}.', { list: missingLabels[0] })
      : missingLabels.length ? tr('word_sounds.syllable_rec_next_labels', 'Add labels for syllables {list}.', { list: missingLabels.join(', ') }) : '',
      missingClips.length === 1 ? tr('word_sounds.syllable_rec_next_clip_one', 'Add recordings for syllable {list}.', { list: missingClips[0] })
      : missingClips.length ? tr('word_sounds.syllable_rec_next_clips', 'Add recordings for syllables {list}.', { list: missingClips.join(', ') }) : ''].filter(Boolean).join(' ')
    : !heard ? (matchesSaved ? tr('word_sounds.syllable_rec_next_saved_set', 'The lesson already has this reviewed set. Preview and confirm to save it again or copy it to your local library.') : tr('word_sounds.syllable_rec_next_preview_first', 'Preview the full sequence before saving.'))
    : !confirmed ? tr('word_sounds.syllable_rec_next_confirm', 'Confirm that you listened and checked the spoken syllables before saving.')
    : tr('word_sounds.syllable_rec_next_ready', 'Ready to save reviewed syllables.');
  const save = () => {
    const task = WS_CORE.createReviewedSyllableTask({ targetWord: word, language, syllables: units.map(unit => unit.label), assets: units.map(unit => unit.asset), revision: Math.max(Date.now(), (board?.revision || 0) + 1), reviewed: heard && confirmed });
    if (!task) { setStatus(tr('word_sounds.syllable_rec_save_incomplete', 'Add labels and recordings, preview the sequence, and confirm your review.')); return; }
    if (!rememberRecording) { if (commit(task)) setStatus(tr('word_sounds.syllable_rec_saved', 'Reviewed syllable recordings saved with this lesson.')); else saveFailed(); return; }
    if (!libraryResult) { if (commit(task)) setLibraryStatus(tr('word_sounds.syllable_library_saved_lesson_only', 'Lesson recordings saved. Find the saved recording first, then select Save reviewed syllables again to update the local library.')); else saveFailed(); return; }
    setLibraryStatus(tr('word_sounds.syllable_library_saving', 'Saving reviewed recordings to this device…'));
    // Persist first: onSave updates the board and cancels work for the old editor revision.
    // A failed library transaction still allows the reviewed lesson save.
    const context = libraryContext.current;
    libraryOperation(async signal => {
      try { return { stored: await library.save(word, language, task, { signal, expectedToken: libraryResult.token }), error: null }; }
      catch (error) { if (error?.code === 'cancelled' || signal.aborted) throw error; return { stored: null, error }; }
    }, result => {
      if (libraryContext.current !== context) return;
      if (result.stored) setLibraryResult(result.stored);
      if (!commit(task)) {
        setLibraryStatus(result.stored ? tr('word_sounds.syllable_library_saved_not_applied', 'The recordings were saved in the local library, but could not be applied to this lesson.') : library.message(result.error, tr));
        saveFailed(); return;
      }
      setLibraryStatus(result.stored ? tr('word_sounds.syllable_library_saved_both', 'Reviewed recordings saved with this lesson and in the local library.') : tr('word_sounds.syllable_library_saved_lesson_reason', 'Lesson recordings saved. {reason}', { reason: library.message(result.error, tr) }));
    });
  };
  return h('details', { id, 'data-syllable-recording-word': WS_CORE.packAudioKey(word), className: 'rounded-xl border border-violet-200 bg-violet-50 p-3', onToggle: event => {
    if (event.target !== event.currentTarget || event.currentTarget.open) return;
    stop(); setBusy(false); setRecording(null); setHeard(false); setConfirmed(false);
  } },
    h('summary', { className: 'font-bold text-violet-900 cursor-pointer' }, draftState),
    recoveredDraft ? h('p', { role: 'status', className: 'text-sm my-2 text-amber-900' }, tr('word_sounds.syllable_rec_draft_kept', 'Your saved clips are kept as a draft. Listen to the full sequence and confirm it for {language} before using these recordings.', { language })) : null,
    h('p', { className: 'text-sm my-2' }, tr('word_sounds.syllable_rec_intro', 'Add 2 to 8 spoken syllables in order. Record or upload each syllable as it sounds in this word, including its natural vowel and stress. Starter labels are written hints to review, not pronunciation instructions; they are never sent to a speech generator.')),
    template.stressPatterns.length ? h('p', { className: 'text-sm my-2' }, tr('word_sounds.syllable_rec_stress_guide', 'Dictionary stress guide (US English): {patterns}. Check this against the pronunciation you are teaching.', { patterns: template.stressPatterns.map(pattern => [...pattern].map(stress => stress === '1' ? tr('word_sounds.syllable_rec_stress_strong', 'strong') : stress === '2' ? tr('word_sounds.syllable_rec_stress_secondary', 'secondary') : tr('word_sounds.syllable_rec_stress_unstressed', 'unstressed')).join(' / ')).reduce((first, second) => tr('word_sounds.syllable_rec_stress_either', '{first} or {second}', { first, second })) })) : null,
    h('p', { className: 'text-sm my-2' }, tr('word_sounds.syllable_rec_review_choices', 'Also review the answer choices before using the lesson. Choose familiar distractors with a similar syllable count.')),
    h('details', { className: 'my-3 rounded-lg border border-violet-200 bg-white p-3', onToggle: event => { if (event.currentTarget.open && libraryResult === null && !libraryBusy) findLibrary(); } },
      h('summary', { className: 'font-semibold cursor-pointer' }, tr('word_sounds.syllable_library_heading', 'Reuse reviewed recordings')),
      h('p', { className: 'text-sm my-2' }, tr('word_sounds.syllable_library_intro', 'Your local library stays in this browser on this device. It stores only reviewed instructional syllables for the same word and recording language. It is not synced between devices; recordings used in a lesson travel with that lesson.')),
      h('button', { type: 'button', className: buttonClass, disabled: busy || libraryBusy, onClick: findLibrary }, tr('word_sounds.syllable_library_find', 'Find saved recording')),
      libraryResult?.task || libraryResult?.draft ? h('button', { type: 'button', className: buttonClass, disabled: busy || libraryBusy, onClick: useLibrary }, libraryResult?.draft ? tr('word_sounds.syllable_library_load_older', 'Load older clips for review') : tr('word_sounds.syllable_library_use_saved', 'Use saved recordings in this lesson')) : null,
      libraryResult?.task || libraryResult?.draft || libraryResult?.corrupt ? h('button', { type: 'button', className: buttonClass, disabled: busy || libraryBusy, onClick: removeLibrary }, tr('word_sounds.syllable_library_remove', 'Remove this word from local library')) : null,
      h('label', { className: 'block my-3' }, h('input', { type: 'checkbox', checked: rememberRecording, disabled: busy || libraryBusy, onChange: event => { setRememberRecording(event.target.checked); if (event.target.checked && libraryResult === null) findLibrary(); } }), ' ', tr('word_sounds.syllable_library_remember', 'Also save or replace this word in my local library when I save reviewed syllables.')),
      h('p', { className: 'text-sm my-2' }, tr('word_sounds.syllable_library_move_help', 'Move one word between devices: download the recordings already saved in this lesson, or import a set for “{word}” ({language}). Imported clips need a fresh listen and review before saving.', { word, language })),
      h('button', { type: 'button', className: buttonClass, disabled: busy || libraryBusy || !savedTask, onClick: downloadSet }, tr('word_sounds.syllable_library_download', 'Download saved recording set')),
      h('label', { className: 'block my-2' }, tr('word_sounds.syllable_library_import', 'Import recording set'), h('input', { type: 'file', accept: '.json,application/json', disabled: busy || libraryBusy, className: 'block text-xs max-w-full', onChange: event => { importSet(event.target.files?.[0]); event.target.value = ''; } })),
      h('p', { role: 'status', className: 'text-sm mt-2', 'aria-live': 'polite' }, libraryStatus)),
    h('label', { className: 'block my-2' }, tr('word_sounds.syllable_rec_count_label', 'Number of syllables'), ' ', h('select', { value: units.length, disabled: busy || libraryBusy, onChange: event => changeCount(Number(event.target.value)), className: 'border rounded p-1' }, [2, 3, 4, 5, 6, 7, 8].map(count => h('option', { key: count, value: count }, count)))),
    omittedUnits.current.some(unit => unit && (unit.asset || unit.label.trim())) ? h('p', { className: 'text-sm my-2' }, tr('word_sounds.syllable_rec_extras_kept', 'Extra syllables are kept while you edit. Increase the count to restore them. Only the displayed syllables will be saved; saving or replacing this set clears the extras.')) : null,
    h('fieldset', { className: 'my-3 flex flex-wrap gap-3 text-sm', disabled: busy },
      h('legend', { className: 'font-semibold' }, tr('word_sounds.syllable_rec_cleanup_legend', 'Optional recording cleanup')),
      h('label', null, h('input', { type: 'checkbox', checked: trimSilence, onChange: event => setTrimSilence(event.target.checked) }), ' ', tr('word_sounds.syllable_rec_trim', 'Trim outer silence')),
      h('label', null, h('input', { type: 'checkbox', checked: levelVolume, onChange: event => setLevelVolume(event.target.checked) }), ' ', tr('word_sounds.syllable_rec_level', 'Level volume')),
      h('p', { className: 'w-full' }, tr('word_sounds.syllable_rec_cleanup_help', 'Cleanup keeps a short margin around speech and limits volume boosts. It does not remove background noise. Listen for quiet consonants; you can undo cleanup before saving.'))),
    ...units.map((unit, index) => h('div', { key: index, className: 'flex flex-wrap items-center gap-2 py-2 border-t border-violet-200' },
      h('label', null, tr('word_sounds.syllable_rec_label_n', 'Syllable {n} label', { n: index + 1 }), ' ', h('input', { ref: node => { syllableLabels.current[index] = node; }, value: unit.label, maxLength: 40, disabled: busy, placeholder: tr('word_sounds.written_hint_placeholder', 'Written hint'), className: 'border rounded p-2 w-32', onChange: event => change(units.map((value, i) => i === index ? { ...value, label: event.target.value } : value)) })),
      h('label', { className: buttonClass }, tr('word_sounds.syllable_rec_upload_n', 'Upload syllable {n}', { n: index + 1 }), h('input', { type: 'file', accept: 'audio/*', disabled: busy, className: 'block text-xs max-w-52', onChange: event => { upload(index, event.target.files?.[0]); event.target.value = ''; } })),
      typeof MediaRecorder !== 'undefined' && navigator.mediaDevices?.getUserMedia ? h('button', { type: 'button', className: buttonClass, disabled: busy, onClick: () => record(index) }, tr('word_sounds.syllable_rec_record_n', 'Record syllable {n}', { n: index + 1 })) : null,
      h('button', { type: 'button', className: buttonClass, disabled: busy || !unit.asset, onClick: () => preview([index]) }, tr('word_sounds.syllable_rec_hear_n', 'Hear syllable {n}', { n: index + 1 })),
      h('button', { type: 'button', className: buttonClass, disabled: busy || !unit.asset || (!trimSilence && !levelVolume), onClick: () => cleanup(index) }, tr('word_sounds.syllable_rec_clean_n', 'Clean up syllable {n}', { n: index + 1 })),
      unit.originalAsset ? h('button', { type: 'button', className: buttonClass, disabled: busy, onClick: () => preview([index], true) }, tr('word_sounds.syllable_rec_hear_original_n', 'Hear original syllable {n}', { n: index + 1 })) : null,
      unit.originalAsset ? h('button', { type: 'button', className: buttonClass, disabled: busy, onClick: () => change(units.map((value, i) => i === index ? { ...value, asset: value.originalAsset, originalAsset: null, cleanupSummary: null } : value)) }, tr('word_sounds.syllable_rec_undo_cleanup_n', 'Undo cleanup syllable {n}', { n: index + 1 })) : null,
      h('button', { type: 'button', className: buttonClass, 'aria-label': tr('word_sounds.syllable_rec_move_earlier_n', 'Move syllable {n} earlier', { n: index + 1 }), disabled: busy || libraryBusy || index === 0, onClick: () => moveUnit(index, -1) }, tr('word_sounds.syllable_rec_move_earlier', 'Move earlier')),
      h('button', { type: 'button', className: buttonClass, 'aria-label': tr('word_sounds.syllable_rec_move_later_n', 'Move syllable {n} later', { n: index + 1 }), disabled: busy || libraryBusy || index === units.length - 1, onClick: () => moveUnit(index, 1) }, tr('word_sounds.syllable_rec_move_later', 'Move later')),
      unit.asset ? h('span', { className: 'text-xs' }, unit.cleanupSummary || tr('word_sounds.syllable_rec_added', 'Recording added')) : null)),
    busy ? h('button', { type: 'button', className: buttonClass, onClick: cancelOperation }, operation === 'preview' ? tr('word_sounds.syllable_rec_stop_preview', 'Stop preview') : operation === 'microphone' ? tr('word_sounds.syllable_rec_cancel_mic', 'Cancel microphone request') : operation === 'recording' ? tr('word_sounds.syllable_rec_cancel_recording', 'Cancel recording') : operation === 'cleanup' ? tr('word_sounds.syllable_rec_cancel_cleanup', 'Cancel cleanup') : tr('word_sounds.syllable_rec_cancel_check', 'Cancel audio check')) : null,
    recording !== null ? h('button', { type: 'button', className: buttonClass, onClick: () => { if (recorder.current?.recorder.state === 'recording') recorder.current.recorder.stop(); } }, tr('word_sounds.syllable_rec_stop_recording', 'Stop recording')) : null,
    h('p', { id: readinessId, className: 'text-sm my-2' }, nextStep),
    h('button', { type: 'button', className: buttonClass, 'aria-describedby': readinessId, disabled: busy || !complete, onClick: () => preview(units.map((_, index) => index)) }, tr('word_sounds.syllable_rec_preview_all', 'Preview syllables in order')),
    h('label', { className: 'block my-3' }, h('input', { type: 'checkbox', checked: confirmed, disabled: busy || !heard, onChange: event => setConfirmed(event.target.checked) }), ' ', tr('word_sounds.syllable_rec_confirm', 'I listened to the sequence and checked that it uses the correct spoken syllables for this word.')),
    h('button', { type: 'button', className: buttonClass, 'aria-describedby': readinessId, disabled: busy || libraryBusy || !complete || !heard || !confirmed, onClick: save }, tr('word_sounds.syllable_rec_save', 'Save reviewed syllables')),
    h('p', { role: 'status', className: 'text-sm mt-2', 'aria-live': 'polite' }, status));
}
// END WORD SOUNDS SYLLABLE RECORDING EDITOR

    // Count approvals store pronunciation identity only; audio remains in the
    // lesson's existing shared audio map, never in this small local library.
    function createWordSoundsCountReviewLibrary(core, storage) {
        const key = 'allo.wordSounds.countReviews.v1';
        let cachedValue, cachedEntries = [];
        const read = () => {
            try {
                const serialized = storage?.getItem(key) || '[]';
                if (serialized !== cachedValue) {
                    const value = JSON.parse(serialized);
                    cachedEntries = Array.isArray(value) ? value.slice(-250) : [];
                    cachedValue = serialized;
                }
                return cachedEntries;
            }
            catch (_) { return []; }
        };
        const identity = task => JSON.stringify([task?.targetWord, task?.language, task?.audioContext?.signature]);
        return {
            find(word, language, audioContext) {
                return [...read()].reverse().find(task => task && task.targetWord === core.packAudioKey(word) && task.language === audioContext?.language && task.source === 'teacher_review' && task.audioContext?.signature === audioContext?.signature &&
                    core.resolveSyllableCount(word, { language, audioContext, prepared: task }).status === 'reviewed') || null;
            },
            save(task) {
                if (!storage || !task || task.source !== 'teacher_review' || !task.audioContext?.fingerprint ||
                    !core.resolveSyllableCount(task.targetWord, { language: task.language, audioContext: task.audioContext, prepared: task }).supported) return false;
                // Explicit fields prevent later schema additions from copying
                // clips or unrelated lesson/student information into storage.
                const metadata = { version: task.version, targetWord: task.targetWord, language: task.language, supported: true,
                    count: task.count, counts: [task.count], answer: task.count, status: task.status, source: task.source,
                    syllables: [], stressPatterns: [], revision: task.revision, review: { ...task.review }, audioContext: { ...task.audioContext } };
                try { storage.setItem(key, JSON.stringify([...read().filter(value => identity(value) !== identity(metadata)), metadata].slice(-250))); return true; }
                catch (_) { return false; }
            },
        };
    }

    function WordSoundsSyllableCountReview({ word, language, resolution, audioContext, audioProfile, recordedTask, onSave, previewWord, translate, onNext, allowRemember = false, onRepairRecording, onUseWithoutRecording, draft, onDraftChange }) {
        const tr = (key, fallback, params) => translate(key, fallback, params);
        const currentAudioContext = audioContext || WS_CORE.createSyllableCountAudioContext({ language });
        const draftKey = wordSoundsSyllableCountDraftKey(word, language, resolution, currentAudioContext, recordedTask);
        const restored = draft?.version === 1 && draft.key === draftKey && typeof draft.count === 'string' && draft.count.length <= 16 ? draft : null;
        const initialCount = () => restored ? restored.count : resolution.supported ? String(resolution.count) : '';
        const [count, setCount] = React.useState(initialCount);
        const countDraft = React.useRef({ key: draftKey, edited: !!restored });
        const draftCallback = React.useRef(onDraftChange); draftCallback.current = onDraftChange;
        const liveContext = React.useRef(draftKey); liveContext.current = draftKey;
        const [confirmed, setConfirmed] = React.useState(false);
        const [heard, setHeard] = React.useState(null);
        const [spokenReview, setSpokenReview] = React.useState(false);
        const [remember, setRemember] = React.useState(false);
        const [busy, setBusy] = React.useState(false);
        const [notice, setNotice] = React.useState('');
        const audioRef = React.useRef(null);
        const previewEpoch = React.useRef(0);
        const previewController = React.useRef(null);
        const fieldId = React.useId();
        const stopPreview = () => {
            previewEpoch.current += 1;
            previewController.current?.abort(); previewController.current = null;
            if (audioRef.current) audioRef.current.pause();
            if (wordSoundsSyllableEditorPlayback?.owner === audioRef) wordSoundsSyllableEditorPlayback = null;
            setBusy(false);
        };
        React.useEffect(() => {
            stopPreview(); setHeard(null); setSpokenReview(false); setNotice('');
            setConfirmed(false); setRemember(false);
        }, [draftKey]);
        React.useEffect(() => {
            if (countDraft.current.key !== draftKey) {
                countDraft.current = { key: draftKey, edited: !!restored };
                setCount(initialCount());
            } else if (!countDraft.current.edited) {
                setCount(resolution.supported ? String(resolution.count) : '');
                setConfirmed(false);
            }
        }, [draftKey, resolution.supported, resolution.count, resolution.status]);
        React.useEffect(() => () => {
            previewEpoch.current += 1;
            previewController.current?.abort();
            if (audioRef.current) audioRef.current.pause();
            if (wordSoundsSyllableEditorPlayback?.owner === audioRef) wordSoundsSyllableEditorPlayback = null;
        }, [word, language]);
        const hearWord = async () => {
            wordSoundsSyllableEditorPlayback?.stop();
            const epoch = ++previewEpoch.current;
            const contextKey = draftKey;
            const current = () => epoch === previewEpoch.current && liveContext.current === contextKey;
            if (audioRef.current) audioRef.current.pause();
            const controller = new AbortController(); previewController.current = controller;
            wordSoundsSyllableEditorPlayback = { owner: audioRef, stop: stopPreview };
            setBusy(true); setHeard(null); setSpokenReview(false); setConfirmed(false); setNotice('');
            const failure = () => {
                if (!current()) return;
                setBusy(false); setHeard(null); setConfirmed(false);
                setNotice(tr('word_sounds.count_audio_retry', 'The word could not be played. Retry listening, or use the teacher-spoken option when there is no saved clip.'));
            };
            try {
                const preview = await previewWord(word, { signal: controller.signal });
                if (!current()) return;
                const source = typeof preview === 'string' ? preview : preview?.source;
                if (!source) throw new Error('Audio unavailable');
                const context = preview?.audioContext || WS_CORE.createSyllableCountAudioContext({ audioSource: source, language });
                const clip = new Audio(source);
                audioRef.current = clip;
                clip.onended = () => {
                    if (!current()) return;
                    setBusy(false); setHeard({ audioContext: context, asset: preview?.asset || null, audioProfile: preview?.audioProfile, source, draftKey: contextKey });
                    setNotice(tr('word_sounds.count_listened', 'Word played. Enter the count you heard, then confirm.'));
                };
                clip.onerror = failure;
                await clip.play();
            } catch (_) { failure(); }
        };
        const validCount = Number.isInteger(Number(count)) && Number(count) >= 1 && Number(count) <= 12;
        const recordingNeedsCountReview = resolution.reason === 'count_recording_review_required';
        const recordingCountDiffers = validCount && Number(count) !== resolution.recordedCount;
        const canSeparateRecording = resolution.reason === 'count_recording_conflict' || recordingNeedsCountReview && recordingCountDiffers;
        const countDirty = wordSoundsSyllableDraftStatus({ kind: 'count', word, language, resolution, audioContext: currentAudioContext, recordedTask, draft: { version: 1, key: draftKey, count } }).dirty;
        const canConfirm = !busy && (heard?.draftKey === draftKey || spokenReview && !currentAudioContext.fingerprint);
        const save = (advance, withoutRecording = false) => {
            if (withoutRecording && (!onUseWithoutRecording || recordedTask?.contentStatus !== 'teacher_recorded')) return;
            const reviewedContext = heard?.audioContext || currentAudioContext;
            const task = WS_CORE.createReviewedSyllableCount({ targetWord: word, language, count: Number(count), revision: Date.now(), reviewed: confirmed && canConfirm, audioContext: reviewedContext });
            if (!task) return;
            const checked = WS_CORE.resolveSyllableCount(word, { language, prepared: task, recordedTask: withoutRecording ? undefined : recordedTask, audioContext: reviewedContext });
            if (!checked.supported || !withoutRecording && resolution.reason === 'count_recording_conflict' && Number(count) !== resolution.recordedCount) {
                setNotice(tr('word_sounds.count_save_conflict', 'The count still conflicts with the recorded syllables. Check the recordings or enter their correct spoken count before saving.'));
                return;
            }
            try {
                const outcome = (withoutRecording ? onUseWithoutRecording : onSave)(task, { remember: !withoutRecording && remember && !!reviewedContext.fingerprint, asset: heard?.asset || null, source: heard?.source || null });
                if (outcome === false) throw new Error('Save rejected');
                countDraft.current.edited = false;
                draftCallback.current?.(null, draftKey);
                setNotice(spokenReview ? tr('word_sounds.count_spoken_saved', 'Teacher-spoken count saved. A new audio clip will need a fresh review.') : tr('word_sounds.count_review_saved', 'Reviewed count saved for this word and pronunciation.'));
                if (advance && onNext) onNext();
            } catch (_) { setNotice(tr('word_sounds.count_save_failed', 'The count could not be saved. Your choices are still here; try saving again.')); }
        };
        return <fieldset className="border border-violet-200 rounded-xl p-3">
            <legend tabIndex={-1} className="px-1 font-bold">{word}</legend>
            {(heard?.audioProfile || audioProfile)?.present && <p className="text-sm mb-2" data-syllable-audio-profile>{tr('word_sounds.count_audio_profile', 'Whole-word audio: {profile}. Check the pronunciation you hear.', { profile: (heard?.audioProfile || audioProfile).label })}</p>}
            {countDirty && <p role="status" className="text-sm font-semibold text-amber-800 mb-2">{tr('word_sounds.count_unsaved', 'Unsaved count change')}</p>}
            <p className="text-sm mb-2">{resolution.supported
                ? tr(resolution.count === 1 ? 'word_sounds.count_ready_one' : 'word_sounds.count_ready', resolution.count === 1 ? '{count} syllable · {source}' : '{count} syllables · {source}', { count: resolution.count, source: resolution.status === 'reviewed' ? tr('word_sounds.count_source_reviewed', 'Teacher reviewed') : resolution.status === 'curated' ? tr('word_sounds.count_source_curated', 'Reviewed word bank') : tr('word_sounds.count_source_dictionary', 'Pronunciation dictionary (US English)') })
                : resolution.reason === 'count_recording_conflict' ? tr('word_sounds.count_recording_conflict', 'The reviewed count ({reviewed}) differs from the recorded syllables ({recorded}). Check both before continuing.', { reviewed: resolution.reviewedCount, recorded: resolution.recordedCount })
                : recordingNeedsCountReview ? tr('word_sounds.count_recording_review_required', 'The syllable recording suggests {count} syllables. Check the whole-word pronunciation and confirm its count before starting.', { count: resolution.recordedCount })
                : resolution.reason === 'count_audio_changed' || resolution.reason === 'count_audio_review_required' ? tr('word_sounds.count_changed_audio', 'Listen and confirm again: the saved count has not been checked against this audio or voice.')
                : resolution.counts.length > 1 ? tr('word_sounds.count_variants', 'Pronunciations use {counts} syllables. Choose the count that matches the voice and pronunciation used in this lesson.', { counts: resolution.counts.join(' / ') })
                : tr('word_sounds.count_needs_review', 'Check the spoken word and confirm its syllable count before using it for counting.')}</p>
            {resolution.source === 'cmudict' && /^en-/i.test(WS_CORE.packAudioLanguageKey(language)) && WS_CORE.packAudioLanguageKey(language) !== 'en-us' && <p className="text-sm mb-2">{tr('word_sounds.count_dictionary_locale_note', 'The dictionary uses US English. Check this word against the pronunciation you are teaching.')}</p>}
            {(resolution.reason === 'count_recording_conflict' || recordingNeedsCountReview) && onRepairRecording && <button type="button" onClick={() => { stopPreview(); setHeard(null); setConfirmed(false); setSpokenReview(false); onRepairRecording(); }} className="min-h-11 border border-violet-300 rounded-lg px-3 py-2 my-2">{tr('word_sounds.count_repair_recording', 'Inspect or repair the syllable recording')}</button>}
            {previewWord && <button data-syllable-count-listen type="button" onClick={busy ? stopPreview : hearWord} className="min-h-11 border border-violet-300 rounded-lg px-3 py-2 mr-2 focus-visible:ring-2 focus-visible:ring-violet-600">{busy ? tr('word_sounds.count_stop_preview', 'Stop word preview') : tr('word_sounds.count_hear_word', 'Listen to whole word')}</button>}
            {!currentAudioContext.fingerprint && !heard && <label className="flex items-start gap-2 my-3 text-sm"><input type="checkbox" checked={spokenReview} disabled={busy} onChange={event => { setSpokenReview(event.target.checked); setConfirmed(false); }} />{tr('word_sounds.count_spoken_option', 'Use my spoken pronunciation for now (no saved audio). I will say the whole word in this lesson. A generated clip will require review again.')}</label>}
            <label htmlFor={fieldId} className="block mt-3 text-sm font-semibold">{tr('word_sounds.count_answer', 'Syllable count')}</label>
            <input id={fieldId} type="number" min="1" max="12" step="1" value={count} onChange={event => {
                const value = event.target.value.slice(0, 16);
                countDraft.current = { key: draftKey, edited: true }; setCount(value); setConfirmed(false); setNotice('');
                const nextDraft = { version: 1, key: draftKey, count: value };
                nextDraft.dirty = wordSoundsSyllableDraftStatus({ kind: 'count', word, language, resolution, audioContext: currentAudioContext, recordedTask, draft: nextDraft }).dirty;
                draftCallback.current?.(nextDraft, draftKey);
            }} className="min-h-11 w-20 mt-1 border border-slate-400 rounded-lg p-2" />
            <label className="flex items-start gap-2 my-3 text-sm"><input type="checkbox" checked={confirmed} disabled={!canConfirm} onChange={event => setConfirmed(event.target.checked)} />{tr('word_sounds.count_confirmation', 'I checked this spoken pronunciation and confirm this syllable count.')}</label>
            {allowRemember && heard?.audioContext?.fingerprint && <label className="flex items-start gap-2 my-3 text-sm"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />{tr('word_sounds.count_remember', 'Remember this approval on this device for the same word, language and audio. No recording is copied to this count library.')}</label>}
            <button type="button" onClick={() => save(false)} disabled={!confirmed || !validCount || !canConfirm} className="min-h-11 border border-violet-300 rounded-lg px-3 py-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-violet-600">{tr('word_sounds.count_save', 'Save reviewed count')}</button>
            {onNext && <button type="button" onClick={() => save(true)} disabled={!confirmed || !validCount || !canConfirm} className="min-h-11 border border-violet-300 rounded-lg px-3 py-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-violet-600">{tr('word_sounds.count_save_next', 'Confirm and next')}</button>}
            {canSeparateRecording && recordedTask?.contentStatus === 'teacher_recorded' && onUseWithoutRecording && <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <p className="text-sm mb-2">{tr('word_sounds.count_without_recording_help', 'If this pronunciation has a different count, use your confirmed count without the old syllable recording in this lesson. The original recording is kept; you can undo this change. Blending needs a new reviewed recording.')}</p>
                <button type="button" onClick={() => save(false, true)} disabled={!confirmed || !validCount || !canConfirm} className="min-h-11 border border-amber-400 rounded-lg px-3 py-2 disabled:opacity-50">{tr('word_sounds.count_without_recording', 'Use this count without the old syllable recording')}</button>
            </div>}
            <p role="status" aria-live="polite" className="text-sm mt-2">{notice}</p>
        </fieldset>;
    }

    function WordSoundsSyllableCountQueue({ words, resolveWord, contextFor, profileFor, recordedFor, onSave, previewWord, translate, onSaveRecording, onUseWithoutRecording, countDraftStore, recordingDraftStore, isOpen = true, reviewRequest }) {
        const tr = (key, fallback, params) => translate(key, fallback, params);
        const localDrafts = React.useRef({ counts: new Map(), recordings: new Map() });
        const countDrafts = countDraftStore || localDrafts.current.counts;
        const recordingDrafts = recordingDraftStore || localDrafts.current.recordings;
        const sessionKey = word => JSON.stringify([WS_CORE.packAudioKey(word), WS_CORE.packAudioLanguageKey(contextFor(word).language)]);
        const keepDraft = (store, word, draft, key) => {
            const id = sessionKey(word);
            if (draft) store.set(id, draft);
            else if (store.get(id)?.key === key) store.delete(id);
        };
        const [attentionOnly, setAttentionOnly] = React.useState(true);
        const [activeWord, setActiveWord] = React.useState(words[0] || '');
        const queueRef = React.useRef(null);
        const pendingFocus = React.useRef(null);
        const requestedFocus = React.useRef(null);
        const [repairWord, setRepairWord] = React.useState(null);
        const repairRef = React.useRef(null);
        const entries = words.map(word => ({ word, resolution: resolveWord(word) }));
        const attention = entries.filter(entry => !entry.resolution.supported);
        const visible = attentionOnly ? attention : entries;
        const index = Math.max(0, visible.findIndex(entry => entry.word === activeWord));
        const current = visible[index];
        React.useLayoutEffect(() => {
            if (!reviewRequest || !words.includes(reviewRequest.word)) return;
            setAttentionOnly(false); setActiveWord(reviewRequest.word);
            setRepairWord(reviewRequest.kind === 'recording' ? reviewRequest.word : null);
            requestedFocus.current = reviewRequest.word;
            pendingFocus.current = '@draft:' + reviewRequest.word;
        }, [reviewRequest]);
        React.useEffect(() => { if (!isOpen || repairWord && repairWord !== current?.word) setRepairWord(null); }, [isOpen, current?.word, repairWord]);
        React.useLayoutEffect(() => {
            if (!repairWord) return;
            const details = repairRef.current?.querySelector('details');
            if (details) { details.open = true; details.querySelector('summary')?.focus(); }
        }, [repairWord]);
        React.useLayoutEffect(() => {
            if (requestedFocus.current && (requestedFocus.current !== current?.word || reviewRequest?.kind === 'recording' && repairWord !== current?.word)) return;
            requestedFocus.current = null;
            const fromWord = pendingFocus.current;
            pendingFocus.current = null;
            if (fromWord === null || fromWord === current?.word) return;
            const target = current
                ? (repairWord === current.word ? repairRef.current?.querySelector('summary') : null) || queueRef.current?.querySelector('[data-syllable-count-listen]') || queueRef.current?.querySelector('legend')
                : queueRef.current?.querySelector('[data-syllable-count-complete]');
            target?.focus();
        });
        const next = () => {
            setRepairWord(null);
            pendingFocus.current = current?.word || null;
            const remaining = visible.filter(entry => entry.word !== current?.word);
            setActiveWord((visible[index + 1] || remaining[0] || visible[0])?.word || '');
        };
        if (!isOpen) return null;
        return <div ref={queueRef}>
            <label className="flex items-center gap-2 my-3 text-sm font-semibold"><input type="checkbox" checked={attentionOnly} onChange={event => { setRepairWord(null); setAttentionOnly(event.target.checked); }} />{tr('word_sounds.count_attention_filter', 'Needs attention only ({count})', { count: attention.length })}</label>
            {current ? <>
                <div className="flex items-center gap-3 my-2">
                    <button type="button" disabled={index === 0} onClick={() => { setRepairWord(null); pendingFocus.current = current.word; setActiveWord(visible[index - 1].word); }} className="min-h-11 border rounded-lg px-3 disabled:opacity-50">{tr('word_sounds.count_previous', 'Previous word')}</button>
                    <p role="status" className="text-sm">{tr('word_sounds.count_queue_position', '{position} of {total}', { position: index + 1, total: visible.length })}</p>
                    <button type="button" disabled={index >= visible.length - 1} onClick={next} className="min-h-11 border rounded-lg px-3 disabled:opacity-50">{tr('word_sounds.count_next', 'Next word')}</button>
                </div>
                <WordSoundsSyllableCountReview key={current.word} word={current.word} language={contextFor(current.word).language}
                    resolution={current.resolution} audioContext={contextFor(current.word)} audioProfile={profileFor?.(current.word)} recordedTask={recordedFor?.(current.word)} translate={translate} previewWord={previewWord}
                    draft={countDrafts.get(sessionKey(current.word))} onDraftChange={(draft, key) => keepDraft(countDrafts, current.word, draft, key)}
                    onRepairRecording={onSaveRecording ? () => setRepairWord(current.word) : undefined}
                    onUseWithoutRecording={onUseWithoutRecording ? (task, options) => {
                        const result = onUseWithoutRecording(current.word, task, options);
                        if (result !== false) { pendingFocus.current = current.word; setRepairWord(null); }
                        return result;
                    } : undefined}
                    allowRemember={true} onSave={(task, options) => {
                        const result = onSave(current.word, task, options);
                        if (result !== false && attentionOnly) pendingFocus.current = current.word;
                        return result;
                    }} onNext={next} />
            </> : <p data-syllable-count-complete tabIndex={-1} role="status" className="text-sm my-3">{tr('word_sounds.count_queue_clear', 'No selected words need count review. Clear the filter to inspect any word.')}</p>}
            {repairWord && repairWord === current?.word && <div ref={repairRef} className="my-3">
                <WordSoundsSyllableRecordingEditor key={repairWord} word={repairWord} language={contextFor(repairWord).language} board={recordedFor?.(repairWord)} translate={translate}
                    draft={recordingDrafts.get(sessionKey(repairWord))} onDraftChange={(draft, key) => keepDraft(recordingDrafts, repairWord, draft, key)}
                    onSave={task => {
                        const result = onSaveRecording(repairWord, task);
                        if (result !== false) { pendingFocus.current = '@repair:' + repairWord; setRepairWord(null); }
                        return result;
                    }} />
                <button type="button" className="min-h-11 border rounded-lg px-3 py-2 mt-2" onClick={() => { pendingFocus.current = '@repair:' + repairWord; setRepairWord(null); }}>{tr('word_sounds.count_close_recording', 'Close recording editor')}</button>
            </div>}
        </div>;
    }

    function buildWordPracticeSelection(selectedWords, glossaryTerms, preloadedWords) {
        const records = new Map(), ttsAssets = {};
        const wordKey = value => String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
        [...(Array.isArray(glossaryTerms) ? glossaryTerms : []), ...(Array.isArray(preloadedWords) ? preloadedWords : [])].forEach(item => {
            const record = typeof item === 'string' ? { word: item } : item;
            if (!record) return;
            const key = wordKey(record.targetWord || record.word || record.term);
            if (key) records.set(key, { ...(records.get(key) || {}), ...record });
            if (record._ttsAssets && typeof record._ttsAssets === 'object') Object.assign(ttsAssets, record._ttsAssets);
        });
        return {
            words: selectedWords.map(word => ({ ...(records.get(wordKey(word)) || {}), word })),
            ttsAssets,
        };
    }

    function chooseWordSoundsPreviewWords(words, limit, bankWords, resolveWord, range) {
        const initial = words.slice(0, Math.max(0, limit));
        if (!bankWords) return new Set(initial);
        const bank = new Set(bankWords), selected = new Set(initial.filter(word => !bank.has(word)));
        const slots = initial.length - selected.size, buckets = new Map();
        words.filter(word => bank.has(word)).forEach(word => {
            const result = resolveWord(word);
            if (!result.supported || result.count < range.min || result.count > range.max) return;
            if (!buckets.has(result.count)) buckets.set(result.count, []);
            buckets.get(result.count).push(word);
        });
        const counts = [...buckets.keys()].sort((a, b) => a - b);
        let picked = 0;
        while (picked < slots && counts.some(count => buckets.get(count).length)) {
            for (const count of counts) {
                const word = buckets.get(count).shift();
                if (word) { selected.add(word); picked++; }
                if (picked === slots) break;
            }
        }
        for (const word of words) {
            if (picked >= slots) break;
            if (bank.has(word) && !selected.has(word)) { selected.add(word); picked++; }
        }
        return selected;
    }

    // The host owns this session so approved work survives leaving setup.
    // Unfinished editor drafts remain governed by the explicit discard choice.
    function useWordSoundsSetupReviewState(session, field, initial = () => ({})) {
        const read = () => Object.prototype.hasOwnProperty.call(session, field) ? session[field] : initial();
        const [snapshot, setSnapshot] = React.useState(() => ({ session, value: read() }));
        const current = React.useRef(snapshot);
        if (current.current.session !== session) current.current = { session, value: read() };
        const value = current.current.value;
        const setValue = next => {
            const value = typeof next === 'function' ? next(current.current.value) : next;
            session[field] = value;
            current.current = { session, value };
            setSnapshot(current.current);
        };
        return [value, setValue];
    }

    function parseWordSoundsAnalysis(result, selectedWord) {
        const key = value => typeof value === 'string' ? value.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ') : '';
        const data = JSON.parse(String(result).replace(/```(?:json)?/gi, '').trim());
        if (!data || Array.isArray(data) || typeof data !== 'object' || !key(selectedWord) || key(data.word) !== key(selectedWord)) {
            throw new Error('The generated analysis does not match the selected word.');
        }
        // Verify identity before using the selected spelling. Never relabel
        // another word's phonemes, image prompt or activity answers.
        return { ...data, word: selectedWord.trim() };
    }

    function useWordSoundsAiTopic({ enabled, topic, language, gradeLevel, syllableRange, callGemini, warnLog, authoringSession }) {
        const [result, setResult] = React.useState(() => authoringSession?.aiResult || { contextKey: null, terms: [] });
        const [busy, setBusy] = React.useState(false);
        const [failed, setFailed] = React.useState(false);
        const emptyTerms = React.useRef([]);
        const languageKey = String(language || 'en').toLowerCase().replace(/_/g, '-');
        const contextKey = JSON.stringify([enabled, topic.trim(), languageKey, gradeLevel, syllableRange.min, syllableRange.max]);
        const context = React.useRef(contextKey); context.current = contextKey;
        const mounted = React.useRef(false);
        const pending = React.useRef(null);
        const cancel = React.useCallback(() => {
            const operation = pending.current;
            pending.current = null;
            operation?.controller.abort();
            setBusy(false); setFailed(false);
        }, []);
        React.useEffect(() => {
            mounted.current = true;
            return () => {
                mounted.current = false;
                const operation = pending.current; pending.current = null;
                operation?.controller.abort();
            };
        }, []);
        React.useEffect(cancel, [contextKey, cancel]);
        const generate = async () => {
            if (!enabled || !topic.trim() || !mounted.current || pending.current) return;
            const operation = { controller: new AbortController(), contextKey };
            pending.current = operation;
            const current = () => mounted.current && pending.current === operation &&
                !operation.controller.signal.aborted && context.current === operation.contextKey;
            setBusy(true); setFailed(false);
            try {
                const constraint = ` All words must have between ${syllableRange.min} and ${syllableRange.max} syllables.`;
                const english = languageKey === 'en' || languageKey.startsWith('en-');
                const prompt = english
                    ? `Generate a list of 15 phonics-rich words related to the topic: "${topic}". Target Grade Level: ${gradeLevel}.${constraint} Return ONLY a comma-separated list of words.`
                    : `Generate a list of 15 common, early-reader-friendly words in the language with code "${language}" related to the topic: "${topic}". Target Grade Level: ${gradeLevel}.${constraint} Use that language's normal spelling/script. Return ONLY a comma-separated list of words, nothing else.`;
                const response = await callGemini(prompt, false, false, null, null, operation.controller.signal);
                if (!current()) return;
                if (typeof response !== 'string') throw new Error('No word list was returned.');
                const words = (english ? response.replace(/[^a-zA-Z,\s-]/g, '') : response.replace(/[^\p{L}\p{M}'’,\s-]/gu, ''))
                    .split(',').map(word => word.trim()).filter(Boolean);
                if (!words.length) throw new Error('No words were returned.');
                const nextResult = { contextKey: operation.contextKey, terms: words };
                if (authoringSession) authoringSession.aiResult = nextResult;
                setResult(nextResult);
            } catch (error) {
                if (current()) { warnLog('AI Gen Failed', error); setFailed(true); }
            } finally {
                if (current()) { pending.current = null; setBusy(false); }
            }
        };
        return { terms: result.contextKey === contextKey ? result.terms : emptyTerms.current, busy, failed, generate, cancel };
    }

    function wordSoundsSetupPreparationSelection(preloadedWords, selectedWords, fixedForm, itemIds = []) {
        if (!fixedForm) return { wordsToProcess: selectedWords, sourceOccurrences: null, sourceOccurrenceIds: null };
        const key = word => String(word || '').trim().toLowerCase();
        const selected = new Set(selectedWords.map(key)), present = new Set();
        const sourceOccurrenceIds = [];
        const sourceOccurrences = preloadedWords.filter((item, index) => {
            const word = key(item.targetWord || item.word || item.term);
            if (!selected.has(word)) return false;
            present.add(word);
            sourceOccurrenceIds.push(itemIds[index] ?? item.itemId ?? item.probeItemId ?? item.id ?? null);
            return true;
        });
        const wordsToProcess = sourceOccurrences.map(item => item.targetWord || item.word || item.term);
        // Newly selected vocabulary has no authored occurrence yet. Existing
        // targets keep every occurrence, in form order, ahead of new words.
        selectedWords.filter(word => !present.has(key(word))).forEach(word => {
            wordsToProcess.push(word); sourceOccurrences.push(null); sourceOccurrenceIds.push(null);
        });
        return { wordsToProcess, sourceOccurrences, sourceOccurrenceIds };
    }

    const WordSoundsGenerator = React.memo(({ glossaryTerms, onStartGame, onClose, callGemini, callImagen, callTTS, gradeLevel, t: tProp, currentUiLanguage, preloadedWords = [], preparedSessionConfig = {}, syllableReviewSession, onShowReview , onMinimize, onExpand, isTeacherMode = true, isProbeMode, probeActivity, probeGradeLevel, probeForm, selectedVoice, setSelectedVoice, isCanvasEnv, ttsSpeed, onRequestKokoroOffer, wordSoundsLanguage, probeStudentNames = [], universalImageStyle = ''}) => {
        const localReviewSession = React.useRef({});
        const reviewSession = syllableReviewSession || localReviewSession.current;
        // Keep the complete setup with the host's authoring session, alongside
        // approved syllable work. Review navigation unmounts this component.
        // The host gives a replaced/new resource a fresh session.
        const setupDraft = reviewSession.setupDraft || (reviewSession.setupDraft = {});
        const useSetupState = (field, initial) => useWordSoundsSetupReviewState(setupDraft, field, initial);
        // A voice selected while preparation is running applies to missing
        // clips and the next retry, including the Kokoro offer.
        const generationVoiceRef = React.useRef(selectedVoice);
        generationVoiceRef.current = selectedVoice;
        // t-with-fallback: the host's t(key, params) returns UNDEFINED on a
        // missing key and treats a string second argument as params — so every
        // `tf('word_sounds.x', 'English text')` call below rendered an EMPTY
        // label whenever the key wasn't registered (the blank 🎙️ Voice Pack
        // button and the blank AAC checkboxes). tf makes the written-in
        // English fallback actually work.
        const tf = (key, fallback, params) => {
            let v;
            try { v = typeof t === 'function' ? t(key, params) : undefined; } catch (e) { v = undefined; }
            if (v == null || typeof v !== 'string' || v === key) {
                v = fallback == null ? '' : String(fallback);
                if (params) Object.keys(params).forEach((p) => { v = v.split('{' + p + '}').join(params[p]); });
            }
            return v;
        };
        const t = tProp || ((key, params) => getWordSoundsString((k) => k, key, params || {}));
        const [imageVisibilityMode, setImageVisibilityMode] = useSetupState('imageVisibilityMode', () => 'smart');
        React.useEffect(() => {
            if (isProbeMode) setImageVisibilityMode('off');
        }, [isProbeMode]);
        const SMART_IMAGE_VISIBILITY = {
            'counting':       'afterCompletion',
            'isolation':      'progressive',
            'blending':       'afterCompletion',
            'segmentation':   'alwaysOn',
            'rhyming':        'alwaysOn',
            'letter_tracing': 'alwaysOn',
            'mapping':        'alwaysOn',
            'orthography':    'afterCompletion',
            'sound_sort':     'progressive',
            'word_families':  'progressive',
            'spelling_bee':   'afterCompletion',
            'word_scramble':  'afterCompletion',
            'missing_letter': 'afterCompletion'
        };
        const [includeGlossary, setIncludeGlossary] = useSetupState('includeGlossary', () => true);
        const [includeFamily, setIncludeFamily] = useSetupState('includeFamily', () => false);
        const [includeCustom, setIncludeCustom] = useSetupState('includeCustom', () => false);
        const [includeAI, setIncludeAI] = useSetupState('includeAI', () => false);
        const [wordCount, setWordCount] = useSetupState('wordCount', () => 10);
        const [selectedFamily, setSelectedFamily] = useSetupState('selectedFamily', () => '');
    const [includeSightWords, setIncludeSightWords] = useSetupState('includeSightWords', () => false);
    const [selectedSightWordList, setSelectedSightWordList] = useSetupState('selectedSightWordList', () => '');
        const [wordSoundsSessionGoal, setWordSoundsSessionGoal] = useSetupState('wordSoundsSessionGoal', () => 30);
        const [orthoSessionGoal, setOrthoSessionGoal] = useSetupState('orthoSessionGoal', () => 0);
    const includeOrthographic = orthoSessionGoal > 0;
        const [customText, setCustomText] = useSetupState('customText', () => '');
        // Practice vs Assessment (probe). Reflects the host's isProbeMode when the
        // teacher arrived from an assessment launch; otherwise defaults to practice
        // and the teacher can flip it here. A probe is a single timed skill, so it
        // is mutually exclusive with the multi-activity lesson plan below.
        const [sessionType, setSessionType] = useSetupState('sessionType', () => isProbeMode || preparedSessionConfig.fixedForm ? 'assessment' : 'practice');
        const [probeActivitySel, setProbeActivitySel] = useSetupState('probeActivitySel', () =>
            probeActivity && probeActivity !== 'orf' ? probeActivity : 'segmentation'
        );
        const probeActivityLabel = tf(`word_sounds.act_${probeActivitySel}`, ({
            segmentation: 'Segmentation', isolation: 'Sound Isolation', blending: 'Blending', rhyming: 'Rhyming', counting: 'Sound Counting',
            syllable_counting: 'Syllable Counting', syllable_blending: 'Syllable Blending',
        })[probeActivitySel] || String(probeActivitySel).replace(/_/g, ' '));
        // Who this probe is FOR. The host banks a completed probe under
        // `probeTargetStudent`, which until now was only ever set by the
        // Assessment Center's Active Student selector and never cleared — so a
        // probe launched from this screen either banked nowhere (no student
        // selected) or, worse, banked under whichever child the teacher had
        // last picked over there. Naming the child here is what makes the host
        // set the target explicitly, in both directions.
        //
        // probeHistory is keyed by a plain name string, so a typo silently
        // opens a second bucket for the same child. The datalist below offers
        // the names that already have probe data, which is what makes picking
        // an existing child a click instead of a re-typing exercise.
        const [probeStudent, setProbeStudent] = useSetupState('probeStudent', () => '');
        const probeStudentTrimmed = String(probeStudent || '').trim();
        const [includeLessonPlan, setIncludeLessonPlan] = useSetupState('includeLessonPlan', () => false);
        const [prepareScope, setPrepareScope] = useSetupState('prepareScope', () => 'all');
        React.useEffect(() => { if (!includeLessonPlan) setPrepareScope('all'); }, [includeLessonPlan]);
        const [taughtPatternsText, setTaughtPatternsText] = useSetupState('taughtPatternsText', () => (preloadedWords[0]?._instructionalProfile?.taughtPatterns || []).join(', '));
        const [knownWordsText, setKnownWordsText] = useSetupState('knownWordsText', () => (preloadedWords[0]?._instructionalProfile?.knownWords || []).join(', '));
        const instructionalProfile = React.useMemo(() => ({
            taughtPatterns: taughtPatternsText.toLowerCase().split(/[\s,]+/).filter(Boolean),
            knownWords: knownWordsText.toLowerCase().split(/[\s,]+/).filter(Boolean),
        }), [taughtPatternsText, knownWordsText]);
        const [lessonPlan, setLessonPlan] = useSetupState('lessonPlan', () => ({
            isolation: { enabled: false, count: 5 },
            blending: { enabled: false, count: 5 },
            segmentation: { enabled: false, count: 5 },
            orthography: { enabled: false, count: 5 },
            rhyming: { enabled: false, count: 5 },
            letter_tracing: { enabled: false, count: 5 },
            counting: { enabled: false, count: 5 },
            mapping: { enabled: false, count: 5 },
            sound_sort: { enabled: false, count: 5 },
            word_families: { enabled: false, count: 5 },
            word_scramble: { enabled: false, count: 5 },
            manipulation: { enabled: false, count: 5 },
            syllable_counting: { enabled: false, count: 5 },
            syllable_blending: { enabled: false, count: 5 },
            spelling_bee: { enabled: false, count: 5 },
            missing_letter: { enabled: false, count: 5 },
            decoding: { enabled: false, count: 5 },
            read_sentence: { enabled: false, count: 5 },
            read_passage: { enabled: false, count: 5 },
            sentence_match: { enabled: false, count: 5 },
        }));
        const [lessonPlanOrder, setLessonPlanOrder] = useSetupState('lessonPlanOrder', () => [
            'isolation', 'blending', 'segmentation', 'orthography', 'rhyming',
            'letter_tracing', 'counting', 'mapping', 'sound_sort', 'word_families', 'word_scramble', 'manipulation',
            'syllable_counting', 'syllable_blending', 'spelling_bee', 'missing_letter', 'decoding', 'read_sentence', 'read_passage', 'sentence_match'
        ]);
        const [draggedActivity, setDraggedActivity] = React.useState(null);
        const [lessonPlanReorderStatus, setLessonPlanReorderStatus] = React.useState('');
        const moveLessonPlanActivity = (activityId, activityLabel, direction) => {
            const fromIndex = lessonPlanOrder.indexOf(activityId);
            const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
            if (fromIndex < 0 || toIndex < 0 || toIndex >= lessonPlanOrder.length) return;
            const next = [...lessonPlanOrder];
            [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
            setLessonPlanOrder(next);
            setLessonPlanReorderStatus(`${activityLabel} moved to position ${toIndex + 1} of ${next.length}.`);
        };
        const [imageTheme, setImageTheme] = useSetupState('imageTheme', () => '');
        const [imageThemeMode, setImageThemeMode] = useSetupState('imageThemeMode', () => 'inherit');
        const effectiveImageTheme = imageThemeMode === 'override' && imageTheme.trim()
            ? imageTheme.trim()
            : String(universalImageStyle || '').trim();
        const [includeAacImages, setIncludeAacImages] = useSetupState('includeAacImages', () => false);
        const [aacDefaultOn, setAacDefaultOn] = useSetupState('aacDefaultOn', () => false);
        const [syllableRange, setSyllableRange] = useSetupState('syllableRange', () => ({ min: 1, max: 4 }));
        const [includeSyllableWords, setIncludeSyllableWords] = useSetupState('includeSyllableWords', () => false);
        const [includeSyllableCountWords, setIncludeSyllableCountWords] = useSetupState('includeSyllableCountWords', () => false);
        const [aiTopic, setAiTopic] = useSetupState('aiTopic', () => '');
        const aiSuggestions = useWordSoundsAiTopic({ enabled: includeAI, topic: aiTopic, language: wordSoundsLanguage, gradeLevel, syllableRange, callGemini, warnLog, authoringSession: setupDraft });
        const { terms: aiTerms, busy: isAiGenerating, generate: handleAiGenerate } = aiSuggestions;
        const [isProcessing, setIsProcessing] = React.useState(false);
        const [isMinimized, setIsMinimized] = React.useState(false);
    React.useEffect(() => {
        if (typeof loadProbeBanks === 'function') {
            loadProbeBanks();
        }
    }, []);
        const [showVoicePack, setShowVoicePack] = React.useState(false);
        // Re-apply any saved teacher Voice Pack to the live phoneme bank on mount,
        // so the custom voice is active in the game (the bank otherwise resets to
        // its defaults on each page load). No-op when no pack is saved.
        // Also re-apply whenever the audio bank is (re)loaded: that event nulls the
        // bank caches and rebuilds from DEFAULTS, which would otherwise silently wipe
        // a custom voice that was applied before the bank finished loading.
        React.useEffect(() => {
            const reapply = () => {
                try {
                    const _lib = loadVoicePackLibrary();
                    const _active = _lib.packs.find((p) => p.id === _lib.activeId) || _lib.packs[0];
                    if (_active) {
                        if (_active.clips && Object.keys(_active.clips).length) applyPhonemeVoicePackToBank(_active.clips);
                        if (_active.instr && Object.keys(_active.instr).length) applyInstrToBank(_active.instr);
                    }
                } catch (e) {}
            };
            reapply();
            try { window.addEventListener('audio_bank_loaded', reapply); } catch (e) {}
            return () => { try { window.removeEventListener('audio_bank_loaded', reapply); } catch (e) {} };
        }, []);
        const [generatedCount, setGeneratedCount] = React.useState(0);
        const [prewarmCount, setPrewarmCount] = React.useState(0);
        const [prewarmTotal, setPrewarmTotal] = React.useState(0);
        const [selectedWords, setSelectedWords] = useWordSoundsSetupReviewState(reviewSession, 'selection', () => new Set());
        const selectionControl = React.useRef({ manual: !!reviewSession.selection?.size, inputsKey: null });
        const [wordPracticeStatus, setWordPracticeStatus] = React.useState({ busy: false, notice: '' });
        const wordPracticeControllerRef = React.useRef(null);
        React.useEffect(() => {
            setWordPracticeStatus({ busy: false, notice: '' });
            return () => {
                if (wordPracticeControllerRef.current) wordPracticeControllerRef.current.abort();
                wordPracticeControllerRef.current = null;
            };
        }, [isTeacherMode, isProbeMode, sessionType]);
        const openWordPractice = async () => {
            if (!isTeacherMode || isProbeMode || sessionType === 'assessment' || wordPracticeControllerRef.current) return;
            const controller = new AbortController();
            wordPracticeControllerRef.current = controller;
            setWordPracticeStatus({ busy: true, notice: '' });
            try {
                if (typeof window.__alloOpenWordPractice !== 'function') throw new Error('Presentation tools unavailable');
                const selection = buildWordPracticeSelection(previewList.filter((_, index) => selectedIndices.has(index)), glossaryTerms, preloadedWords);
                await window.__alloOpenWordPractice({
                    ...selection, title: tf('word_sounds.practice_title', 'Word Fluency Pop-Up'),
                    language: wordSoundsLanguage || 'English', source: 'word-sounds',
                    callTTS, selectedVoice, ttsSpeed, t, currentUiLanguage, signal: controller.signal,
                });
                if (!controller.signal.aborted) setWordPracticeStatus({ busy: false, notice: '' });
            } catch (_) {
                if (!controller.signal.aborted) setWordPracticeStatus({ busy: false, notice: tf('word_sounds.practice_open_failed', 'Presentation tools could not open. Please try again.') });
            } finally {
                if (wordPracticeControllerRef.current === controller) wordPracticeControllerRef.current = null;
            }
        };
        const startRunRef = React.useRef(false);
        const generationEpochRef = React.useRef(0);
        // BEGIN WORD SOUNDS GENERATION OWNERSHIP
        const generationControllerRef = React.useRef(null);
        const generationMountedRef = React.useRef(true);
        const cancelGeneration = React.useCallback(() => {
            generationEpochRef.current += 1;
            const controller = generationControllerRef.current;
            generationControllerRef.current = null;
            startRunRef.current = false;
            if (controller) controller.abort();
        }, []);
        React.useEffect(() => {
            generationMountedRef.current = true;
            return () => {
                generationMountedRef.current = false;
                cancelGeneration();
            };
        }, [cancelGeneration]);
        // END WORD SOUNDS GENERATION OWNERSHIP
        const setupDialogRef = React.useRef(null);
        const setupPreviouslyFocusedRef = React.useRef(null);
        const generatorCloseRef = React.useRef(onClose);
        const generatorDirtyWordsRef = React.useRef(() => []);
        const syllableExitGuard = useWordSoundsSyllableExitGuard(() => generatorDirtyWordsRef.current(), tf);
        React.useEffect(() => {
            generatorCloseRef.current = onClose;
        }, [onClose]);
        const handleGeneratorClose = React.useCallback(() => {
            syllableExitGuard.requestExit(() => {
                if (wordPracticeControllerRef.current) wordPracticeControllerRef.current.abort();
                cancelGeneration();
                aiSuggestions.cancel();
                setIsProcessing(false);
                if (typeof generatorCloseRef.current === 'function') generatorCloseRef.current();
            });
        }, [cancelGeneration, syllableExitGuard.requestExit, aiSuggestions.cancel]);
        React.useEffect(() => {
            if (isMinimized || typeof document === 'undefined') return undefined;
            const root = setupDialogRef.current;
            if (!root) return undefined;
            setupPreviouslyFocusedRef.current = document.activeElement;
            const focusableSelector = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
            const getFocusable = () => Array.from(root.querySelectorAll(focusableSelector))
                .filter((element) => element.getClientRects().length > 0);
            const focusTimer = setTimeout(() => {
                const focusable = getFocusable();
                (focusable[0] || root).focus();
            }, 0);
            const handleDialogKeyDown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    handleGeneratorClose();
                    return;
                }
                if (event.key !== 'Tab') return;
                const focusable = getFocusable();
                if (!focusable.length) {
                    event.preventDefault();
                    root.focus();
                    return;
                }
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                const active = document.activeElement;
                if (event.shiftKey && (active === first || !root.contains(active))) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && (active === last || !root.contains(active))) {
                    event.preventDefault();
                    first.focus();
                }
            };
            root.addEventListener('keydown', handleDialogKeyDown);
            return () => {
                clearTimeout(focusTimer);
                root.removeEventListener('keydown', handleDialogKeyDown);
                const previous = setupPreviouslyFocusedRef.current;
                if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
                    try { previous.focus(); } catch (_) {}
                }
            };
        }, [handleGeneratorClose, isMinimized]);
        const [kokoroRecDismissed, setKokoroRecDismissed] = React.useState(() => {
            try { return sessionStorage.getItem('allo.kokoroRecDismissed') === '1'; }
            catch (_) { return false; }
        });
        const hasAutoNavigated = React.useRef(preloadedWords.length > 0);
        React.useEffect(() => {
            if (preloadedWords.length > 0 && !isProcessing && onShowReview && !hasAutoNavigated.current) {
                debugLog("📋 Words preloaded! Auto-navigating to Review Panel...");
                hasAutoNavigated.current = true;
                const timer = setTimeout(() => {
                    onShowReview();
                }, 300);
                return () => clearTimeout(timer);
            }
        }, [preloadedWords.length, isProcessing, onShowReview]);
        const [reviewedSyllableTasks, setReviewedSyllableTasks] = useWordSoundsSetupReviewState(reviewSession, 'recordings');
        const [reviewedSyllableCounts, setReviewedSyllableCounts] = useWordSoundsSetupReviewState(reviewSession, 'counts');
        const [reviewedCountAudio, setReviewedCountAudio] = useWordSoundsSetupReviewState(reviewSession, 'audio');
        const [detachedSyllableRecordings, setDetachedSyllableRecordings] = useWordSoundsSetupReviewState(reviewSession, 'detached');
        const syllableSessionDrafts = React.useRef({ counts: new Map(), recordings: new Map() });
        const [countReviewOpen, setCountReviewOpen] = React.useState(true);
        const [recordingReviewOpen, setRecordingReviewOpen] = React.useState(false);
        const recordingDraftKey = (word, language = wordSoundsLanguage) => JSON.stringify([WS_CORE.packAudioKey(word), WS_CORE.packAudioLanguageKey(language)]);
        const [pendingSyllableEdits, setPendingSyllableEdits] = React.useState(null);
        const [syllableReviewRequest, setSyllableReviewRequest] = React.useState(null);
        const recordingReviewRegion = React.useRef(null);
        const pendingRecordingFocus = React.useRef(null);
        const unsavedSyllableNotice = React.useRef(null);
        React.useLayoutEffect(() => {
            if (pendingSyllableEdits) unsavedSyllableNotice.current?.querySelector('[data-syllable-unsaved-notice]')?.focus();
        }, [pendingSyllableEdits]);
        React.useLayoutEffect(() => {
            const word = pendingRecordingFocus.current;
            if (!word || !recordingReviewOpen) return;
            const details = [...(recordingReviewRegion.current?.querySelectorAll('[data-syllable-recording-word]') || [])].find(node => node.dataset.syllableRecordingWord === WS_CORE.packAudioKey(word));
            if (details) { details.open = true; details.querySelector('summary')?.focus(); pendingRecordingFocus.current = null; }
        });
        const keepRecordingDraft = (word, draft, key) => {
            const store = syllableSessionDrafts.current.recordings, id = recordingDraftKey(word);
            if (draft) store.set(id, draft);
            else if (store.get(id)?.key === key) store.delete(id);
        };
        const countReviewRegion = React.useRef(null);
        const pendingUndoFocus = React.useRef(false);
        React.useLayoutEffect(() => {
            if (!pendingUndoFocus.current) return;
            pendingUndoFocus.current = false;
            (countReviewRegion.current?.querySelector('[data-syllable-count-listen]') || countReviewRegion.current?.querySelector('summary'))?.focus();
        });
        const [countLibraryRevision, setCountLibraryRevision] = React.useState(0);
        const [countLibraryNotice, setCountLibraryNotice] = React.useState('');
        const countBankAssetCache = React.useRef(new Map());
        const countReviewLibrary = React.useMemo(() => {
            let storage; try { storage = window.localStorage; } catch (_) {}
            return createWordSoundsCountReviewLibrary(WS_CORE, storage);
        }, []);
        const [syllableDictionaryState, setSyllableDictionaryState] = React.useState('loading');
        const syllableDictionaryRequest = React.useRef(0);
        const retrySyllableDictionary = React.useCallback(async () => {
            const request = ++syllableDictionaryRequest.current;
            setSyllableDictionaryState('loading');
            try {
                const ready = await WS_CORE.loadSyllablePronunciations();
                if (request === syllableDictionaryRequest.current) setSyllableDictionaryState(ready ? 'ready' : 'unavailable');
            } catch (_) { if (request === syllableDictionaryRequest.current) setSyllableDictionaryState('unavailable'); }
        }, []);
        React.useEffect(() => {
            retrySyllableDictionary();
            return () => { syllableDictionaryRequest.current += 1; };
        }, [retrySyllableDictionary]);
        const syllableCountReviewKey = word => String(wordSoundsLanguage || 'en').toLowerCase() + ':' + WS_CORE.packAudioKey(word);
        const savedCountAudioAssets = React.useMemo(() => WS_CORE.packAudioAssets(preloadedWords), [preloadedWords]);
        const preparedSyllableFor = (word) => detachedSyllableRecordings[syllableCountReviewKey(word)] ? null : reviewedSyllableTasks[recordingDraftKey(word)] ||
            preloadedWords.find(item => String(item.targetWord || item.word || item.term || '').trim().toLowerCase() === String(word).trim().toLowerCase())?.activityItems?.syllable_blending;
        const syllableCountAudioFor = React.useCallback((word, options = {}) => {
            const key = WS_CORE.packAudioKey(word), committed = reviewedCountAudio[syllableCountReviewKey(word)];
            const saved = savedCountAudioAssets[key];
            const item = preloadedWords.find(value => WS_CORE.packAudioKey(value.targetWord || value.word || value.term || value) === key);
            const spokenReview = [reviewedSyllableCounts[syllableCountReviewKey(word)], item?.activityItems?.syllable_counting].some(prepared =>
                prepared && WS_CORE.isTeacherSpokenSyllableCount(word, { language: wordSoundsLanguage, prepared, recordedTask: preparedSyllableFor(word),
                    audioContext: WS_CORE.createSyllableCountAudioContext({ language: wordSoundsLanguage, voice: selectedVoice }) }));
            if (!committed && !saved && spokenReview && !options.explicitListen) return null;
            const bank = WS_CORE.isSyllableLanguageSupported(wordSoundsLanguage) ? window._CACHE_WORD_AUDIO_BANK?.[key] : null;
            const cached = countBankAssetCache.current.get(key);
            if (cached && cached.source === bank && cached.saved === (committed || saved) && cached.voice === selectedVoice && cached.language === wordSoundsLanguage) return cached.asset;
            const selected = WS_CORE.selectSyllableCountAudio({ word, savedAsset: committed || saved, bankAsset: bank,
                language: wordSoundsLanguage, voice: selectedVoice, allowSavedProfileMismatch: true,
                prepared: [reviewedSyllableCounts[syllableCountReviewKey(word)], item?.activityItems?.syllable_counting], recordedTask: preparedSyllableFor(word) });
            countBankAssetCache.current.set(key, { source: bank, saved: committed || saved, voice: selectedVoice, language: wordSoundsLanguage, asset: selected.asset });
            return selected.asset;
        }, [reviewedCountAudio, reviewedSyllableCounts, reviewedSyllableTasks, detachedSyllableRecordings, savedCountAudioAssets, preloadedWords, wordSoundsLanguage, selectedVoice]);
        const syllableCountContextFor = React.useCallback(word => WS_CORE.createSyllableCountAudioContext({
            asset: syllableCountAudioFor(word), voice: selectedVoice, language: wordSoundsLanguage,
        }), [syllableCountAudioFor, selectedVoice, wordSoundsLanguage]);
        const preparedCountFor = React.useCallback(word => {
            const context = syllableCountContextFor(word);
            const item = preloadedWords.find(value => WS_CORE.packAudioKey(value.targetWord || value.word || value.term || value) === WS_CORE.packAudioKey(word));
            const candidates = [reviewedSyllableCounts[syllableCountReviewKey(word)], item?.activityItems?.syllable_counting,
                countReviewLibrary.find(word, wordSoundsLanguage, context)].filter(Boolean);
            return candidates.find(value => (value.reviewedEvidence || value).audioContext?.signature === context.signature) || candidates[0];
        }, [reviewedSyllableCounts, preloadedWords, syllableCountContextFor, wordSoundsLanguage, countReviewLibrary, countLibraryRevision]);
        const syllableCountFor = React.useCallback((word) => {
            const item = preloadedWords.find(value => WS_CORE.packAudioKey(value.targetWord || value.word || value.term || value) === WS_CORE.packAudioKey(word));
            return WS_CORE.resolveSyllableCount(word, { language: wordSoundsLanguage,
                prepared: preparedCountFor(word), audioContext: syllableCountContextFor(word),
                recordedTask: preparedSyllableFor(word), syllables: item?.syllables });
        }, [reviewedSyllableTasks, detachedSyllableRecordings, preparedCountFor, syllableCountContextFor, preloadedWords, wordSoundsLanguage, syllableDictionaryState]);
        const withinSyllableRange = React.useCallback(word => {
            const result = syllableCountFor(word);
            // Unknown words remain selectable for review; a spelling guess must
            // not silently remove them from the teacher's requested vocabulary.
            return !result.counts.length || result.counts.some(count => count >= syllableRange.min && count <= syllableRange.max);
        }, [syllableCountFor, syllableRange]);
        const previewSyllableCountWord = async (word, options = {}) => {
            let asset = syllableCountAudioFor(word, { explicitListen: true });
            const active = () => !options.signal?.aborted;
            if (!asset && WS_CORE.isSyllableLanguageSupported(wordSoundsLanguage) && typeof window.loadWordAudioBank === 'function') {
                let timeout;
                try { await Promise.race([window.loadWordAudioBank({ retry: true }), new Promise(resolve => { timeout = setTimeout(resolve, 6000); })]); }
                finally { clearTimeout(timeout); }
                if (!active()) return null;
                asset = syllableCountAudioFor(word, { explicitListen: true });
            }
            // Listening is the explicit request to prepare a missing whole-word
            // clip. Keep that same clip when this count is approved.
            if (!asset && typeof callTTS === 'function' && active()) {
                let profile = null;
                const voice = generationVoiceRef.current || undefined;
                const source = await callTTS(word, voice, Number(ttsSpeed) || 1, { signal: options.signal, force: true,
                    language: wordSoundsLanguage || 'English', allowProviderFallback: !/^(af_|am_|bf_|bm_)/i.test(String(voice || '')),
                    onResolvedProfile: value => { profile = value; } });
                if (!active()) return null;
                asset = await packTtsSource(source, options.signal);
                if (asset) asset.provenance = WS_CORE.packAudioProvenance(profile, profile ? 'synthesized' : 'unknown');
                if (asset && WS_CORE.packAudioProfileStatus(asset, voice, wordSoundsLanguage).mismatch) return null;
            }
            if (!asset || !active()) return null;
            return { source: 'data:' + asset.mime + ';base64,' + asset.base64, asset,
                audioProfile: WS_CORE.packAudioProfileStatus(asset, selectedVoice, wordSoundsLanguage),
                audioContext: WS_CORE.createSyllableCountAudioContext({ asset, voice: selectedVoice, language: wordSoundsLanguage }) };
        };
        const saveSyllableCount = (word, task, options = {}) => {
            selectionControl.current.manual = true;
            const key = syllableCountReviewKey(word);
            if (options.asset) setReviewedCountAudio(previous => ({ ...previous, [key]: options.asset }));
            setReviewedSyllableCounts(previous => ({ ...previous, [key]: task }));
            if (options.remember) {
                const stored = countReviewLibrary.save(task);
                setCountLibraryNotice(stored ? tf('word_sounds.count_library_saved', 'Approval remembered on this device for the same pronunciation.') : tf('word_sounds.count_library_unavailable', 'The lesson approval is saved, but device storage is unavailable.'));
                if (stored) setCountLibraryRevision(value => value + 1);
            } else setCountLibraryNotice('');
        };
        const saveReviewedSyllableRecording = (word, task) => {
            selectionControl.current.manual = true;
            setReviewedSyllableTasks(previous => ({ ...previous, [recordingDraftKey(task.targetWord, task.language)]: task }));
            setDetachedSyllableRecordings(previous => { const next = { ...previous }; delete next[syllableCountReviewKey(word)]; return next; });
        };
        const useCountWithoutRecording = (word, task, options = {}) => {
            const key = syllableCountReviewKey(word);
            setDetachedSyllableRecordings(previous => ({ ...previous, [key]: previous[key] || {
                word, count: reviewedSyllableCounts[key], audio: reviewedCountAudio[key],
                replacementSignature: task.review?.signature, replacementAudio: options.asset || reviewedCountAudio[key],
            } }));
            saveSyllableCount(word, task, { ...options, remember: false });
        };
        const undoCountRecordingExclusion = key => {
            const previous = detachedSyllableRecordings[key];
            if (!previous) return;
            selectionControl.current.manual = true;
            pendingUndoFocus.current = true;
            const reviewUnchanged = reviewedSyllableCounts[key]?.review?.signature === previous.replacementSignature;
            setReviewedSyllableCounts(current => {
                if (!reviewUnchanged || current[key]?.review?.signature !== previous.replacementSignature) return current;
                const next = { ...current }; if (previous.count) next[key] = previous.count; else delete next[key]; return next;
            });
            setReviewedCountAudio(current => {
                if (!reviewUnchanged || current[key] !== previous.replacementAudio) return current;
                const next = { ...current }; if (previous.audio) next[key] = previous.audio; else delete next[key]; return next;
            });
            setDetachedSyllableRecordings(current => { const next = { ...current }; delete next[key]; return next; });
        };
        const selectionInputsKey = JSON.stringify([wordCount, includeSyllableWords, includeSyllableCountWords, includeGlossary, includeFamily, includeCustom, includeSightWords, includeAI,
            selectedFamily, selectedSightWordList, customText, aiTerms, syllableRange, wordSoundsLanguage,
            (glossaryTerms || []).map(value => value.term || value.word || value), preloadedWords.map(value => value.targetWord || value.word || value.term || value)]);
        if (selectionControl.current.manual && selectionControl.current.inputsKey === null) selectionControl.current.inputsKey = selectionInputsKey;
        const previewList = React.useMemo(() => {
            let list = includeSyllableWords && WS_CORE.isSyllableLanguageSupported(wordSoundsLanguage) ? WS_CORE.syllableWords().filter(withinSyllableRange) : [];
            if (includeSyllableCountWords && WS_CORE.isSyllableLanguageSupported(wordSoundsLanguage)) list.push(...WS_CORE.syllableCountWords().filter(withinSyllableRange));
            // Include already-generated words so they appear in the Lesson Preview grid
            if (preloadedWords && preloadedWords.length > 0) {
                const preloadedWordStrings = preloadedWords.map(w => w.targetWord || w.word || w.term || (typeof w === 'string' ? w : ''));
                list = [...list, ...preloadedWordStrings.filter(w => w)];
            }
            if (includeGlossary && Array.isArray(glossaryTerms)) {
                const glossaryWords = glossaryTerms.map(t => t.term || t.word || t);
                list = [...list, ...glossaryWords];
            }
            if (includeFamily && selectedFamily && WORD_FAMILY_PRESETS[selectedFamily]) {
                const familyWords = WORD_FAMILY_PRESETS[selectedFamily].filter(withinSyllableRange);
                list = [...list, ...familyWords];
            }
            if (includeCustom && customText) {
                const customWords = customText.split(/[\s,]+/).map(w => w.trim()).filter(w => w.length > 0);
                list = [...list, ...customWords];
            }
            if (includeSightWords && selectedSightWordList && SIGHT_WORD_PRESETS[selectedSightWordList]) {
                const sightWords = SIGHT_WORD_PRESETS[selectedSightWordList];
                list = [...list, ...sightWords];
            }
            if (includeAI && aiTerms.length > 0) {
                list = [...list, ...aiTerms];
            }
            const uniqueWords = [];
            const seenWords = new Set();
            list.forEach((value) => {
                const word = String(value || '').trim();
                const key = word.toLocaleLowerCase();
                if (!word || seenWords.has(key)) return;
                seenWords.add(key);
                uniqueWords.push(word);
            });
            // A newly loaded count or a teacher correction must not silently
            // remove a word the teacher already chose. An explicit source or
            // range change still applies the new selection settings.
            if (selectionControl.current.manual && selectionControl.current.inputsKey === selectionInputsKey) {
                selectedWords.forEach(word => { if (!uniqueWords.includes(word)) uniqueWords.push(word); });
            }
            return uniqueWords;
        }, [includeGlossary, includeFamily, includeCustom, includeAI, includeSightWords, selectedSightWordList, glossaryTerms, selectedFamily, customText, aiTerms, preloadedWords, includeSyllableWords, includeSyllableCountWords, wordSoundsLanguage, withinSyllableRange, selectedWords, selectionInputsKey]);
        const selectedIndices = React.useMemo(() => new Set(previewList.map((word, index) => selectedWords.has(word) ? index : -1).filter(index => index >= 0)), [previewList, selectedWords]);
        // Sound Swap has checked one-sound changes for a short list of words only;
        // it is offered when at least one selected word is on that list (2026-10-25).
        const soundSwapAvailable = previewList.some((word, i) => selectedIndices.has(i)
            && WS_CORE.manipulationReady(WS_CORE.resolveManipulationTask(word, null, wordSoundsLanguage)));
        const lessonPlanActivityOn = id => !!lessonPlan[id]?.enabled && (id !== 'manipulation' || soundSwapAvailable);
        const syllableBlendingSelected = sessionType === 'assessment' ? probeActivitySel === 'syllable_blending'
            : includeLessonPlan && !!lessonPlan.syllable_blending?.enabled;
        const syllableCountingSelected = sessionType === 'assessment' ? probeActivitySel === 'syllable_counting'
            : includeLessonPlan && !!lessonPlan.syllable_counting?.enabled;
        const unsupportedSyllableWords = syllableBlendingSelected
            ? previewList.filter((word, i) => selectedIndices.has(i) && !WS_CORE.resolveSyllableTask(word, preparedSyllableFor(word), wordSoundsLanguage).supported) : [];
        const unreviewedSyllableCountWords = syllableCountingSelected
            ? previewList.filter((word, i) => selectedIndices.has(i) && !syllableCountFor(word).supported) : [];
        const previewPreparedActivities = sessionType === 'assessment' ? [probeActivitySel]
            : prepareScope === 'lesson' && includeLessonPlan ? lessonPlanOrder.filter(lessonPlanActivityOn) : null;
        const teacherSpokenCountWords = previewPreparedActivities?.length === 1 && previewPreparedActivities[0] === 'syllable_counting'
            ? previewList.filter((word, i) => selectedIndices.has(i) && WS_CORE.isTeacherSpokenSyllableCount(word, {
                language: wordSoundsLanguage, prepared: preparedCountFor(word), recordedTask: preparedSyllableFor(word), audioContext: syllableCountContextFor(word),
            })) : [];
        const findUnsavedSyllableEdits = (allWords = false) => previewList.filter((_, index) => allWords || selectedIndices.has(index)).flatMap(word => {
            const key = recordingDraftKey(word), edits = [];
            if ((allWords || syllableCountingSelected) && wordSoundsSyllableDraftStatus({ kind: 'count', word, language: wordSoundsLanguage,
                draft: syllableSessionDrafts.current.counts.get(key), resolution: syllableCountFor(word), audioContext: syllableCountContextFor(word), recordedTask: preparedSyllableFor(word) }).dirty) edits.push({ word, kind: 'count' });
            if ((allWords || syllableBlendingSelected || syllableCountingSelected) && wordSoundsSyllableDraftStatus({ kind: 'recording', word, language: wordSoundsLanguage,
                draft: syllableSessionDrafts.current.recordings.get(key), board: preparedSyllableFor(word) }).dirty) edits.push({ word, kind: 'recording' });
            return edits;
        });
        generatorDirtyWordsRef.current = () => [...findUnsavedSyllableEdits(true).map(edit => edit.word),
            ...wordSoundsSyllableHiddenDraftWords([syllableSessionDrafts.current.counts, syllableSessionDrafts.current.recordings], previewList, wordSoundsLanguage)];
        const reviewUnsavedSyllableEdits = () => {
            const first = findUnsavedSyllableEdits()[0];
            setPendingSyllableEdits(null);
            if (!first) return;
            if (syllableCountingSelected) { setCountReviewOpen(true); setSyllableReviewRequest({ ...first }); }
            else { pendingRecordingFocus.current = first.word; setRecordingReviewOpen(true); }
        };
        React.useEffect(() => { setPendingSyllableEdits(null); }, [selectionInputsKey, selectedWords, syllableCountingSelected, syllableBlendingSelected, selectedVoice]);
        const previewWordsKey = JSON.stringify(previewList);
        const balanceCountBank = includeSyllableCountWords && syllableCountingSelected;
        const countBalanceKey = balanceCountBank ? JSON.stringify(previewList.map(word => {
            const result = syllableCountFor(word); return [word, result.supported ? result.count : null];
        })) : '';
        React.useEffect(() => {
            if (selectionControl.current.inputsKey !== selectionInputsKey) {
                selectionControl.current = { manual: false, inputsKey: selectionInputsKey };
            }
            if (selectionControl.current.manual) return;
            // Returning to an authored assessment keeps its whole vocabulary,
            // even when it exceeds the practice auto-selection limit.
            const next = chooseWordSoundsPreviewWords(previewList, typeof sessionType !== 'undefined' && sessionType === 'assessment' ? previewList.length : wordCount, balanceCountBank ? WS_CORE.syllableCountWords() : null, syllableCountFor, syllableRange);
            setSelectedWords(previous => previous.size === next.size && [...previous].every(word => next.has(word)) ? previous : next);
        }, [previewWordsKey, selectionInputsKey, balanceCountBank, countBalanceKey, typeof sessionType === 'undefined' ? null : sessionType]);
        const toggleSelection = (index) => {
            selectionControl.current.manual = true;
            const next = new Set(selectedWords), word = previewList[index];
            if (next.has(word)) next.delete(word);
            else next.add(word);
            setSelectedWords(next);
        };
        const toggleAll = () => {
             selectionControl.current.manual = true;
             if (selectedIndices.size === previewList.length && previewList.length > 0) {
                 setSelectedWords(new Set());
             } else {
                 setSelectedWords(new Set(previewList));
             }
        };
        const normalizePackKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const shuffleForPack = (values) => {
            const out = [...(values || [])];
            for (let i = out.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [out[i], out[j]] = [out[j], out[i]];
            }
            return out;
        };
        const flatPackPhoneme = (p) => WS_CORE.phonemeLabel(p, packIsEnglish);
        // Cluster-aware phoneme estimate (mirror of the player module's
        // estimatePhonemesBasic): digraphs, trigraphs, r-controlled vowels and
        // soft c/g stay ONE unit. This replaces the old raw letter-split
        // fallback ('car' -> [c,a,r]) that made downstream sound cues and
        // corrective feedback speak the LETTER (/a/) instead of the PHONEME
        // (/ar/) whenever AI phoneme data was missing.
        const estimatePackPhonemes = (word) => {
            const w = normalizePackKey(word).replace(/[^a-z]/g, '');
            if (!w) return [];
            const trigraphs = ['igh', 'tch', 'dge'];
            const digraphs = ['sh','ch','th','wh','ph','ng','ck','qu','wr','kn','gn','mb','ar','er','ir','or','ur','ai','ay','au','aw','ea','ee','ei','ey','ew','ie','oa','oe','oi','oo','ou','ow','oy','ue'];
            const result = [];
            let i = 0;
            while (i < w.length) {
                if (i < w.length - 2 && trigraphs.includes(w.slice(i, i + 3))) {
                    result.push(w.slice(i, i + 3));
                    i += 3;
                } else if (i < w.length - 1 && digraphs.includes(w.slice(i, i + 2))) {
                    result.push(w.slice(i, i + 2));
                    i += 2;
                } else if (w[i] === 'c' && i < w.length - 1 && 'eiy'.includes(w[i + 1])) {
                    result.push('s');
                    i++;
                } else if (w[i] === 'g' && i < w.length - 1 && 'eiy'.includes(w[i + 1])) {
                    result.push('j');
                    i++;
                } else {
                    result.push(w[i]);
                    i++;
                }
            }
            return result;
        };
        // Content language of this pack: the boards compiled below ride the
        // pack VERBATIM to student devices (pack boards outrank the module's
        // runtime rebuilds), so every English filler pool here must be gated —
        // a Spanish pack must never carry English words or English letter
        // distractors onto its boards.
        const packIsEnglish = !wordSoundsLanguage || String(wordSoundsLanguage).toLowerCase().startsWith('en');
        const makePackManipulationFallback = (word) => WS_CORE.resolveManipulationTask(word, null, wordSoundsLanguage);
        const packTtsSource = async (src, signal) => {
            const checkAborted = () => {
                if (!signal?.aborted) return;
                const error = new Error('Generation canceled');
                error.name = 'AbortError';
                throw error;
            };
            checkAborted();
            if (!src || typeof src !== 'string') return null;
            if (/^data:audio\//i.test(src)) {
                const match = src.match(/^data:([^;,]+);base64,(.+)$/i);
                return match ? { mime: match[1], base64: match[2] } : null;
            }
            const response = await fetch(src, { signal });
            checkAborted();
            if (!response.ok) throw new Error(`TTS asset fetch failed (${response.status})`);
            const blob = await response.blob();
            checkAborted();
            const bytes = new Uint8Array(await blob.arrayBuffer());
            checkAborted();
            let binary = '';
            for (let offset = 0; offset < bytes.length; offset += 0x8000) {
                binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
            }
            return { mime: blob.type || 'audio/mpeg', base64: btoa(binary) };
        };
        const teacherSpokenCountOnly = (item, assets, voice) => {
            const boards = item.activityItems || {};
            const activities = item._preparedActivities || Object.keys(boards);
            if (activities.length !== 1 || activities[0] !== 'syllable_counting') return false;
            const word = normalizePackKey(item.targetWord || item.word || item.term);
            return WS_CORE.isTeacherSpokenSyllableCount(word, { language: wordSoundsLanguage, prepared: boards.syllable_counting,
                audioContext: WS_CORE.createSyllableCountAudioContext({ asset: assets[word], voice, language: wordSoundsLanguage }) });
        };
        const finalizeSyllableCountAudio = (items, assets, voice) => {
            items.forEach(item => {
                const board = item.activityItems?.syllable_counting;
                if (!board) return;
                const word = normalizePackKey(item.targetWord || item.word || item.term);
                const audioContext = WS_CORE.createSyllableCountAudioContext({ asset: assets[word], voice, language: wordSoundsLanguage });
                const resolved = WS_CORE.resolveSyllableCount(word, { language: wordSoundsLanguage, prepared: board,
                    recordedTask: item.activityItems?.syllable_blending, audioContext });
                item.activityItems.syllable_counting = { ...resolved, answer: resolved.supported ? resolved.count : null };
            });
            return items;
        };
        const compileActivityItems = (items) => {
            const rhymeSession = WS_CORE.createRhymeSession();
            // English filler words join the pool ONLY for English packs — for
            // any other language the pool is the pack's own words, so every
            // board stays same-language.
            const commonWords = packIsEnglish ? PACK_COMMON_WORDS : [];
            const itemWords = items.map((item) => normalizePackKey(item.targetWord || item.word || item.term)).filter(Boolean);
            const wordPool = [...new Set([...itemWords, ...commonWords])];
            // Session vocabulary for the sentence gate: a word the teacher put
            // in this pack is vouched for by the teacher.
            const rsSessionWords = new Set(itemWords);
            // Same-language distractor inventories for non-English packs:
            // phoneme units and letters drawn from the pack's own words.
            const allPackPhonemes = [...new Set(items.flatMap((it) => (it.phonemes || []).map(flatPackPhoneme)).filter(Boolean))];
            const allPackLetters = [...new Set(itemWords.join('').split(''))];
            // Script-agnostic rime for non-English rhyme/family comparisons —
            // the [aeiou] regex below matches nothing on non-Latin scripts.
            const packRimeOf = (w) => {
                const v = normalizePackKey(w);
                if (packIsEnglish) return (v.match(/[aeiou][a-z]*$/) || [''])[0];
                return v.slice(-2);
            };
            // First/last SOUND via the cluster-aware estimator so r-controlled
            // vowels and vowel teams cue as one phoneme ('art' → /ar/), with
            // the silent-letter collapses the audio bank expects.
            // Shared edge-sound data supplies both preparation and playback.
            const firstSound = (raw) => WS_CORE.edgeSound(raw, 'first', items.find(it => normalizePackKey(it.word || it.targetWord || it.term) === normalizePackKey(raw))?.phonemes);
            const lastSound = (raw) => WS_CORE.edgeSound(raw, 'last', items.find(it => normalizePackKey(it.word || it.targetWord || it.term) === normalizePackKey(raw))?.phonemes);
            items.forEach((item, itemIndex) => {
                const word = normalizePackKey(item.targetWord || item.word || item.term);
                const phonemes = (item.phonemes || []).map(flatPackPhoneme).filter(Boolean);
                const seed = word.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
                const position = phonemes.length ? seed % phonemes.length : 0;
                const correctSound = phonemes[position] || item.firstSound || estimatePackPhonemes(word)[0] || 'a';
                // English grapheme pools pad English packs; non-English packs
                // pad from the pack's own phoneme inventory.
                const isolationPool = packIsEnglish
                    ? [...phonemes, 'b','d','f','g','k','l','m','n','p','r','s','t','a','e','i','o','u','sh','ch','th']
                    : [...phonemes, ...allPackPhonemes];
                const isolationOptions = shuffleForPack([...new Set([correctSound, ...isolationPool.filter((value) => value && value !== correctSound)])].slice(0, 6));
                const chipDistractorPool = packIsEnglish
                    ? ['s','t','m','p','k','n','r','l','b','g','f','h','d','sh','ch','th','a','e','i','o','u']
                    : allPackPhonemes;
                const chipDistractors = shuffleForPack(chipDistractorPool.filter((value) => !phonemes.includes(value))).slice(0, 5);
                const chips = shuffleForPack([
                    ...phonemes.map((value, index) => ({ id: `correct-${index}`, phoneme: value, type: 'correct', isDistractor: false })),
                    ...chipDistractors.map((value, index) => ({ id: `distractor-${index}`, phoneme: value, type: 'distractor', isDistractor: true })),
                ]);
                const otherWords = wordPool.filter((value) => value !== word);
                // Common K-2 homophone sets: an aloud-played target must never
                // share a board with a word that sounds identical to it.
                const HOMOPHONE_SETS = [['sun','son'],['ate','eight'],['sea','see'],['eye','i'],['know','no'],['knight','night'],['right','write'],['meet','meat'],['whale','wail'],['bee','be'],['two','to','too'],['four','for'],['one','won'],['hear','here'],['blue','blew'],['red','read'],['pear','pair'],['flower','flour'],['dear','deer'],['bear','bare'],['tail','tale'],['sail','sale'],['mail','male'],['plane','plain'],['road','rode'],['hole','whole'],['week','weak'],['hair','hare']];
                const soundsLike = (a, b) => {
                    const la = normalizePackKey(a), lb = normalizePackKey(b);
                    if (!la || !lb) return false;
                    if (la === lb) return true;
                    return HOMOPHONE_SETS.some((set) => set.includes(la) && set.includes(lb));
                };
                // Answer-preserving board builder: the answer ALWAYS survives —
                // slicing a shuffled [answer, ...pool] list could cut it off and
                // ship an unwinnable board.
                const boardWithAnswer = (answer, pool, distractorCount) => shuffleForPack([
                    answer,
                    ...[...new Set(pool)].filter((value) => value && !soundsLike(value, answer)).slice(0, distractorCount),
                ]);
                const blending = boardWithAnswer(word, [...(item.blendingDistractors || []), ...otherWords], 5);
                const rhymeBoard = WS_CORE.buildSessionRhymeBoard({
                    session: rhymeSession, occurrenceId: itemIndex,
                    word, answer: item.rhymeWord || (item.rhymes || [])[0] || '',
                    phonemes: item.phonemes,
                    answerPhonemes: item.rhymePronunciation && normalizePackKey(item.rhymePronunciation.word) === normalizePackKey(item.rhymeWord || (item.rhymes || [])[0])
                        ? item.rhymePronunciation.phonemes : undefined,
                    pool: [...items, ...commonWords],
                    distractors: item.rhymeDistractors || [],
                    prepared: item.activityItems?.rhyming,
                    isEnglish: packIsEnglish,
                });
                const task = WS_CORE.resolveManipulationTask(word, item.manipulationTask, wordSoundsLanguage);
                if (!item.manipulationTask) item.manipulationTask = task;
                const manipulationFill = packIsEnglish ? ['sit','map','bed','pin','mud','fan'] : otherWords;
                const manipulation = WS_CORE.manipulationReady(task)
                    ? boardWithAnswer(task.answer, [...(task.distractors || []), ...manipulationFill], 5) : [];
                const itemSyllable = item.activityItems?.syllable_blending;
                const detachedRecording = typeof detachedSyllableRecordings === 'object' && detachedSyllableRecordings[String(wordSoundsLanguage || 'en').toLowerCase() + ':' + WS_CORE.packAudioKey(word)];
                const storedSyllable = detachedRecording ? null : typeof preparedSyllableFor === 'function' ? preparedSyllableFor(word) || itemSyllable
                    : (typeof reviewedSyllableTasks === 'object' && reviewedSyllableTasks[JSON.stringify([WS_CORE.packAudioKey(word), WS_CORE.packAudioLanguageKey(wordSoundsLanguage)])]) || itemSyllable;
                const syllableTask = WS_CORE.resolveSyllableTask(word, storedSyllable, wordSoundsLanguage);
                const reviewKey = String(wordSoundsLanguage || 'en').toLowerCase() + ':' + WS_CORE.packAudioKey(word);
                const countAudio = typeof syllableCountAudioFor === 'function' ? syllableCountAudioFor(word) : item._ttsAssets?.[word];
                if (countAudio) item._ttsAssets = { ...(item._ttsAssets || {}), [word]: countAudio };
                const countContext = WS_CORE.createSyllableCountAudioContext({ asset: countAudio,
                    voice: typeof selectedVoice === 'string' ? selectedVoice : '', language: wordSoundsLanguage });
                const countingTask = WS_CORE.resolveSyllableCount(word, { language: wordSoundsLanguage,
                    prepared: typeof preparedCountFor === 'function' ? preparedCountFor(word) : (typeof reviewedSyllableCounts === 'object' && reviewedSyllableCounts[reviewKey]) || item.activityItems?.syllable_counting,
                    audioContext: countContext,
                    recordedTask: storedSyllable, syllables: item.syllables });
                // Curated or reviewed spoken units are authoritative for hints.
                // Dictionary counts do not imply orthographic syllable splits.
                const syllables = syllableTask.supported ? [...syllableTask.syllables] : [...countingTask.syllables];
                item.syllables = syllables;
                const recordingChoices = [...(item.syllableBlendingOptions || []), ...wordPool].filter(value => value !== word);
                const countDistance = value => {
                    const resolved = WS_CORE.resolveSyllableCount(value, { language: wordSoundsLanguage });
                    return resolved.supported ? Math.abs(resolved.count - syllableTask.syllables.length) : Infinity;
                };
                recordingChoices.sort((a, b) => countDistance(a) - countDistance(b));
                // Recordings and choices have separate lifetimes: a fresh reviewed
                // task may omit options, while the existing matching board keeps
                // the teacher's choices. Never reuse another word/language's board.
                const choiceBoard = [storedSyllable, itemSyllable].find(board =>
                    WS_CORE.validSyllableBoard(board) && WS_CORE.packAudioKey(board.targetWord) === word &&
                    WS_CORE.resolveSyllableTask(word, board, wordSoundsLanguage).supported);
                const syllableOptions = syllableTask.supported
                    ? choiceBoard ? [...choiceBoard.options]
                    : boardWithAnswer(word, syllableTask.contentStatus === 'teacher_recorded' ? recordingChoices : shuffleForPack(WS_CORE.syllableWords().filter(value => value !== word)), 3) : [];
                const graphemes = [item.graphemes,
                    (item.phonemes || []).map(p => p && typeof p === 'object' ? p.grapheme : ''), word.split('')]
                    .find(values => Array.isArray(values) && values.length === phonemes.length && values.length > 0 &&
                        values.every(value => typeof value === 'string' && value.trim()) &&
                        normalizePackKey(values.join('')).normalize('NFC') === word.normalize('NFC')) || [];
                item.graphemes = graphemes;
                const letters = word.split('');
                for (let i = letters.length - 1; i > 0; i--) {
                    const j = (seed + i) % (i + 1);
                    [letters[i], letters[j]] = [letters[j], letters[i]];
                }
                if (letters.length > 1 && letters.join('') === word) [letters[0], letters[1]] = [letters[1], letters[0]];
                const hiddenIndex = word.length > 1 ? seed % word.length : 0;
                const correctLetter = word[hiddenIndex] || '';
                // Missing-letter distractors come from the pack's own script
                // for non-English (a–z would offer Latin letters against a
                // Spanish ñ or a non-Latin word).
                const letterDistractorPool = packIsEnglish
                    ? 'abcdefghijklmnopqrstuvwxyz'.split('')
                    : shuffleForPack(allPackLetters);
                const letterOptions = shuffleForPack([...new Set([correctLetter, ...letterDistractorPool.filter((value) => value !== correctLetter)])].slice(0, 4));
                const mode = item.soundSortMatches?.position || (seed % 2 === 0 ? 'first' : 'last');
                const soundBoard = packIsEnglish ? WS_CORE.buildSoundSort({ word, phonemes: item.phonemes, mode,
                    pool: [...items, ...WS_CORE.knownWords], matches: item.soundSortMatches?.words || [],
                    teacherEdited: !!item.soundSortMatches?.teacherEdited, targetSound: item.soundSortMatches?.phoneme,
                    distractors: item.soundSortMatches?.distractors || [] }) : null;
                const familySpec = item.rimeFamilyMembers;
                const teacherFamily = familySpec?.teacherEdited === true;
                const suppliedRime = normalizePackKey(familySpec?.rime || item.familyEnding || '').replace(/^-/, '');
                const rime = suppliedRime && (teacherFamily || word.endsWith(suppliedRime)) ? suppliedRime
                    : (packIsEnglish ? (word.match(/[aeiou][a-z]*$/) || [''])[0] : packRimeOf(word));
                const familyWords = values => [...new Set((Array.isArray(values) ? values : []).filter(v => typeof v === 'string').map(normalizePackKey).filter(v => v && v !== word))];
                const familySource = familyWords(familySpec?.words || item.familyMembers).filter(value => teacherFamily || (rime && value.endsWith(rime) && value.length > rime.length));
                const familyOptions = teacherFamily ? familySource.slice(0, 8)
                    : shuffleForPack(familySource.length ? familySource : wordPool.filter(value => value !== word && rime && value.endsWith(rime) && value.length > rime.length)).slice(0, word.length <= 3 ? 3 : 5);
                const familyDistractors = teacherFamily ? familyWords(familySpec.distractors).slice(0, 8)
                    : shuffleForPack(wordPool.filter(value => value !== word && !value.endsWith(rime))).slice(0, word.length <= 3 ? 2 : 4);
                const familyCandidate = { rime, options: familyOptions, distractors: familyDistractors, ...(teacherFamily ? { teacherEdited: true } : {}) };
                const familyBoard = WS_CORE.validWordFamilyBoard(familyCandidate, word) ? familyCandidate : null;
                const decodingChoices = boardWithAnswer(word, [...itemWords, ...commonWords].filter((value) => value !== word), 3);
                // Finish the Sentence: connected decodable text. The AI
                // sentence is taken only when it survives the decodability
                // gate; the sight-word frame otherwise. Distractors prefer
                // same-family look-alikes (cat/bat/hat) — with the picture
                // anchoring meaning, telling those apart in print IS the
                // decoding being practiced. English only: the frames and the
                // sight-word corpus behind the gate are English.
                let readSentence = null;
                if (packIsEnglish) {
                    const rsText = packSentenceIsUsable(item.sentence, word, rsSessionWords)
                        ? String(item.sentence).trim()
                        : '';
                    const rsSplit = splitPackSentence(rsText, word);
                    if (rsSplit) {
                        const rsUsed = new Set(packSentenceWords(rsText));
                        const rsOptions = boardWithAnswer(word, [
                            ...(item.sentenceDistractors || []),
                            ...familySource,
                            ...(item.blendingDistractors || []),
                            ...otherWords,
                        ].map(normalizePackKey).filter((v) => v && v !== word && !rsUsed.has(v) && !isUnusableAsPhonicsWord(v)), 3);
                        readSentence = { sentence: rsText, before: rsSplit.before, after: rsSplit.after, options: rsOptions };
                    }
                }
                // Read the Story: a three-sentence micro-passage about this
                // word, every occurrence of the word blanked — one choice
                // fills them all. AI story when it survives the gate; three
                // rotated sight-word frames otherwise, so the referent still
                // repeats across sentences.
                let readPassage = null;
                if (packIsEnglish) {
                    const rpSentences = packStoryIsUsable(item.story, word, rsSessionWords)
                        ? item.story.map((s) => String(s).trim())
                        : [];
                    const rpParts = rpSentences.map((s) => {
                        const split = splitPackSentence(s, word);
                        return split ? { before: split.before, after: split.after } : { text: s };
                    });
                    // A story where no sentence could be split has no blank to
                    // fill and cannot be scored — skip the board entirely.
                    if (rpParts.some((p) => !p.text)) {
                        const rpStoryText = rpSentences.join(' ');
                        const rpUsed = new Set(rpSentences.flatMap((s) => packSentenceWords(s)));
                        const rpOptions = boardWithAnswer(word, [
                            ...(item.sentenceDistractors || []),
                            ...familySource,
                            ...(item.blendingDistractors || []),
                            ...otherWords,
                        ].map(normalizePackKey).filter((v) => v && v !== word && !rpUsed.has(v) && !isUnusableAsPhonicsWord(v)), 3);
                        readPassage = { story: rpStoryText, parts: rpParts, options: rpOptions };
                    }
                }
                // Picture the Sentence: answer with PICTURES. One board
                // shape, two tiers — sequence of 2 means place both pictures
                // in sentence order (forces left-to-right reading); sequence
                // of 1 is the classic sentence→picture match. Tiles are pack
                // words only, so they reuse the exact images Read & Match
                // already packs — no new generation. A distractor picture
                // whose word appears in the sentence would be a second right
                // answer, so extras are filtered against the sentence text.
                let sentenceMatch = null;
                if (packIsEnglish) {
                    const smOthers = itemWords.filter((v) => v !== word);
                    if (smOthers.length >= 1) {
                        const smText = packSentenceIsUsable(item.sentence, word, rsSessionWords)
                            ? String(item.sentence).trim() : '';
                        if (smText) {
                            const smUsed = new Set(packSentenceWords(smText));
                            sentenceMatch = {
                                sentence: smText,
                                sequence: [word],
                                extras: shuffleForPack(smOthers.filter((v) => !smUsed.has(v))).slice(0, 2),
                            };
                        }
                        // A one-tile board is unwinnable-proof but also
                        // unmeasurable — never ship fewer than two pictures.
                        if (sentenceMatch && sentenceMatch.sequence.length + sentenceMatch.extras.length < 2) sentenceMatch = null;
                    }
                }
                item.activityItems = {
                    counting: { options: [1,2,3,4,5,6,7,8,9,10,'11+'], answer: item.phonemeCount || phonemes.length },
                    isolation: { position, correctSound, options: isolationOptions },
                    segmentation: { chips, slotCount: item.phonemeCount || phonemes.length },
                    blending: { options: blending, answer: word },
                    rhyming: rhymeBoard,
                    manipulation: { task, options: manipulation },
                    syllable_blending: { ...syllableTask, options: syllableOptions, answer: word },
                    syllable_counting: { ...countingTask, answer: countingTask.supported ? countingTask.count : null },
                    orthography: { options: shuffleForPack([...new Set([word, ...(item.orthographyDistractors || [])])]), answer: word },
                    mapping: graphemes.length
                        ? { graphemes, chipOrder: shuffleForPack(graphemes.map((value, index) => ({ id: index, text: String(value) }))) }
                        : { supported: false, contentStatus: 'teacher_review_required', graphemes: [], chipOrder: [] },
                    spelling_bee: { answer: word },
                    word_scramble: { letters, answer: word },
                    missing_letter: { hiddenIndex, correctLetter, options: letterOptions },
                    ...(soundBoard ? { sound_sort: soundBoard } : {}),
                    letter_tracing: { letter: word[0] || '' },
                    ...(familyBoard ? { word_families: familyBoard } : {}),
                    decoding: { choices: decodingChoices },
                    ...(readSentence ? { read_sentence: readSentence } : {}),
                    ...(readPassage ? { read_passage: readPassage } : {}),
                    ...(sentenceMatch ? { sentence_match: sentenceMatch } : {}),
                };
            });
            items.forEach(item => {
                const text = [item.word || item.targetWord, item.activityItems?.read_sentence?.sentence, item.activityItems?.read_passage?.story].filter(Boolean).join(' ');
                item._instructionalProfile = instructionalProfile;
                item._instructionalCoverage = WS_CORE.profileCheck(text, instructionalProfile);
            });
            return items;
        };

        const applySetupSyllableReviews = () => {
            const changed = item => {
                const word = item.targetWord || item.word || item.term;
                return reviewedSyllableCounts[syllableCountReviewKey(word)] || reviewedSyllableTasks[recordingDraftKey(word)] || detachedSyllableRecordings[syllableCountReviewKey(word)];
            };
            if (!preloadedWords.some(changed)) return preloadedWords;
            const compiled = compileActivityItems(preloadedWords.map(item => ({ ...item })));
            const replacements = {};
            const next = preloadedWords.map((item, index) => {
                if (!changed(item)) return item;
                const word = item.targetWord || item.word || item.term;
                const activityItems = { ...item.activityItems, syllable_counting: compiled[index].activityItems.syllable_counting };
                if (reviewedSyllableTasks[recordingDraftKey(word)] || detachedSyllableRecordings[syllableCountReviewKey(word)]) {
                    if (detachedSyllableRecordings[syllableCountReviewKey(word)]) delete activityItems.syllable_blending;
                    else activityItems.syllable_blending = compiled[index].activityItems.syllable_blending;
                }
                const asset = reviewedCountAudio[syllableCountReviewKey(word)];
                if (asset) replacements[WS_CORE.packAudioKey(word)] = asset;
                return { ...item, activityItems, syllables: compiled[index].syllables, _packEdited: true };
            });
            const withAudio = Object.keys(replacements).length ? WS_CORE.replacePackAssets(next, replacements) : next;
            return WS_CORE.normalizeRecordedSyllableDependencies(withAudio, wordSoundsLanguage, preloadedWords);
        };
        const handleShowReview = () => syllableExitGuard.requestExit(() => {
            // Hand off only the approved syllable changes; all other review
            // fields and answer choices keep their existing values.
            if (!onShowReview) return;
            const reviewedWords = applySetupSyllableReviews();
            onShowReview(reviewedWords);
            // Only entries handed to the lesson are consumed. Newly added words
            // and other languages remain available when returning to setup.
            // Removing transferred overrides also protects later lesson edits.
            const countKeys = new Set(reviewedWords.map(item => syllableCountReviewKey(item.targetWord || item.word || item.term)));
            const recordingKeys = new Set(reviewedWords.map(item => recordingDraftKey(item.targetWord || item.word || item.term)));
            const withoutKeys = (values, keys) => Object.fromEntries(Object.entries(values).filter(([key]) => !keys.has(key)));
            setReviewedSyllableCounts(previous => withoutKeys(previous, countKeys));
            setReviewedCountAudio(previous => withoutKeys(previous, countKeys));
            setDetachedSyllableRecordings(previous => withoutKeys(previous, countKeys));
            setReviewedSyllableTasks(previous => withoutKeys(previous, recordingKeys));
        });
        const handleStart = async (options = {}) => {
             if (!generationMountedRef.current) return;
             const selectedVocabulary = previewList.filter((_, i) => selectedIndices.has(i));
             const { wordsToProcess, sourceOccurrences, sourceOccurrenceIds } = wordSoundsSetupPreparationSelection(
                 sessionType === 'assessment' ? applySetupSyllableReviews() : preloadedWords,
                 selectedVocabulary, sessionType === 'assessment', preparedSessionConfig.itemIds);
             const preparedActivities = sessionType === 'assessment' ? [probeActivitySel]
                 : prepareScope === 'lesson' && includeLessonPlan ? lessonPlanOrder.filter(lessonPlanActivityOn) : null;
             if (preparedActivities && !preparedActivities.length) { setLessonPlanReorderStatus(tf('word_sounds.choose_lesson_activity', 'Choose at least one lesson activity before preparing.')); return; }
             if (!generationMountedRef.current || wordsToProcess.length === 0 || unsupportedSyllableWords.length || unreviewedSyllableCountWords.length || startRunRef.current) return;
             const unsavedEdits = findUnsavedSyllableEdits();
             if (unsavedEdits.length && options.useSavedSyllables !== true) { setPendingSyllableEdits(unsavedEdits); return; }
             setPendingSyllableEdits(null);
             const generationEpoch = ++generationEpochRef.current;
             const controller = new AbortController();
             generationControllerRef.current = controller;
             const signal = controller.signal;
             const isGenerationActive = () => generationMountedRef.current && !signal.aborted &&
                 generationControllerRef.current === controller && generationEpochRef.current === generationEpoch;
             const generationAbortError = () => {
                 const error = new Error('Generation canceled');
                 error.name = 'AbortError';
                 return error;
             };
             // Some host adapters cannot stop their underlying work. Release this
             // run immediately on cancel and ignore their eventual result.
             const awaitGeneration = (promise) => new Promise((resolve, reject) => {
                 const onAbort = () => reject(generationAbortError());
                 signal.addEventListener('abort', onAbort, { once: true });
                 Promise.resolve(promise).then(value => {
                     signal.removeEventListener('abort', onAbort);
                     if (isGenerationActive()) resolve(value); else reject(generationAbortError());
                 }, error => {
                     signal.removeEventListener('abort', onAbort);
                     reject(error);
                 });
                 if (!isGenerationActive()) onAbort();
             });
             const waitWhileActive = (milliseconds) => new Promise((resolve, reject) => {
                 const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, milliseconds);
                 const onAbort = () => { clearTimeout(timer); reject(generationAbortError()); };
                 signal.addEventListener('abort', onAbort, { once: true });
                 if (!isGenerationActive()) onAbort();
             });
             // Limit outstanding provider requests, including work queued inside
             // the provider. Cancelled runs never dispatch the remaining clips.
             const runGenerationTasks = async (list, task) => {
                 const results = new Array(list.length);
                 let next = 0;
                 const worker = async () => {
                     while (isGenerationActive() && next < list.length) {
                         const index = next++;
                         try { results[index] = { status: 'fulfilled', value: await task(list[index]) }; }
                         catch (reason) { results[index] = { status: 'rejected', reason }; }
                     }
                 };
                 await Promise.all(Array.from({ length: Math.min(3, list.length) }, worker));
                 return results;
             };
             startRunRef.current = true;
             try {
             setIsProcessing(true);
             setGeneratedCount(0);
             setPrewarmCount(0);
             setPrewarmTotal(0);
             // Rate-limit handling for the TTS prewarm, reset per preload run.
             //
             // This used to be a one-way switch: the first 429 anywhere set it
             // and every remaining word packed NOTHING. A pack was found in the
             // wild with six clips for five words — word one's options, then
             // silence — because the limiter tripped early and the run gave up
             // on everything after it. The limit is a ~60 second cooldown, not
             // a permanent failure, so wait it out and carry on. Two cooldowns
             // is the cap: past that the quota is genuinely gone and stalling a
             // teacher for minutes helps nobody.
             const ttsGate = { aborted: false, cooldowns: 0, rateLimited: false };
             const TTS_COOLDOWN_MS = 15000;
             const TTS_MAX_COOLDOWNS = 2;
             if (typeof window !== 'undefined') window.__kokoroOfferedThisPreload = false;
             const processed = [];

             // Build a lookup map for already-processed preloaded words
             const preloadedMap = {};
             if (preloadedWords && preloadedWords.length > 0) {
                 preloadedWords.forEach(pw => {
                     const key = (pw.targetWord || pw.word || pw.term || '').toLowerCase().trim();
                     if (key) preloadedMap[key] = pw;
                 });
             }

             for (let i = 0; i < wordsToProcess.length; i++) {
                 if (!isGenerationActive()) return;
                 const rawWord = wordsToProcess[i];

                 // ── Skip AI if this word was already generated ──
                 const existing = (typeof sourceOccurrences !== 'undefined' && sourceOccurrences?.[i]) || preloadedMap[rawWord.toLowerCase().trim()];
                 if (existing && existing.phonemes && existing.phonemes.length > 0) {
                     processed.push(JSON.parse(JSON.stringify(existing)));
                     setGeneratedCount(prev => prev + 1);
                     continue;
                 }

                 try {
                     // Non-English packs get a language-directed prompt: same
                     // JSON shape, but phonemes/rhymes/distractors/family
                     // members must be words OF the content language — the
                     // English-phonics notation rules below don't apply to it.
                     const _procPrompt_nonEnglish = `
                         Analyze the word "${rawWord}" — a word in the language with BCP-47 code "${wordSoundsLanguage}" — for phonemic awareness activities. Target Audience: ${gradeLevel || 'Early Readers (K-2)'}.
                         PHONEME NOTATION: break the word into the individual SOUNDS a child of that language hears, in order. Write each sound as a short lowercase token in the word's own script or simple IPA. Multi-letter units that make ONE sound (digraphs, long vowels, etc.) must be ONE phoneme.
                         GRAPHEMES: split the word's actual spelling into chunks aligned one-to-one with the phonemes.
                         LANGUAGE RULE (critical): every word you return — rhymeWord, rhymeDistractors, blendingDistractors, syllableBlendingOptions, familyMembers, and every manipulationTask word — must be a real, common word IN THAT LANGUAGE, suitable for early readers. NEVER return English words. Orthography distractors are plausible misspellings in that language's own script.
                         The manipulationTask instruction sentence stays in English (a teacher reads it aloud) but quotes the actual words.
                         Return ONLY JSON:
                         {
                             "word": "${rawWord}",
                             "phonemes": ["…"],
                             "graphemes": ["…"],
                             "phonemeCount": 3,
                             "syllables": ["…"],
                             "syllableBlendingOptions": ["…", "…", "…", "…"],
                             "rhymeWord": "…",
                             "rhymeDistractors": ["…", "…", "…", "…", "…"],
                             "blendingDistractors": ["…", "…", "…", "…", "…"],
                             "orthographyDistractors": ["…", "…", "…"],
                             "wordFamily": "…",
                             "familyEnding": "…",
                             "familyMembers": ["…", "…", "…"],
                             "firstSound": "…",
                             "lastSound": "…",
                             "definition": "Simple definition matching grade level, in English",
                             "imagePrompt": "Icon of the thing '${rawWord}' names, white background",
                             "manipulationTask": {
                                 "type": "deletion",
                                 "instruction": "Say '${rawWord}'. Now say it again, but leave out the first sound.",
                                 "targetPhoneme": "…",
                                 "answer": "…",
                                 "distractors": ["…", "…", "…"]
                             }
                         }
                      `;
                     const _procPrompt_english = `
                         Analyze the word "${rawWord}" for phonemic awareness activities. Target Audience: ${gradeLevel || 'Early Readers (K-2)'}.
                         PHONEME NOTATION (use EXACTLY these symbols):
                         • LONG VOWELS: Use macron symbols: ā (long a), ē (long e), ī (long i), ō (long o), ū (long u)
                         • SHORT VOWELS: Use plain letters: a, e, i, o, u
                         • DIGRAPHS: sh, ch, th, wh, ng, ck (count as ONE sound)
                         • R-CONTROLLED VOWELS: ar, er, ir, or, ur (count as ONE sound — do NOT split into separate phonemes)
                         CRITICAL RULES:
                         • R-CONTROLLED vowels are ALWAYS one sound: "or" in "corn" = 1 phoneme, NOT "o"+"r"
                         • Silent letters are skipped: "knight" → ["n", "ī", "t"]
                         • Vowel teams are one sound: "rain" → ["r", "ā", "n"]
                         EXAMPLES:
                         • "cat" → ["k", "a", "t"] (3 phonemes, short a)
                         • "cake" → ["k", "ā", "k"] (3 phonemes, long a)
                         • "ship" → ["sh", "i", "p"] (3 phonemes, sh is ONE sound)
                         • "corn" → ["k", "or", "n"] (3 phonemes, or is ONE sound)
                         • "orbit" → ["or", "b", "i", "t"] (4 phonemes, or is ONE sound)
                         • "bird" → ["b", "ir", "d"] (3 phonemes, ir is ONE sound)
                         • "star" → ["s", "t", "ar"] (3 phonemes — do NOT add extra r)
                         • "turn" → ["t", "ur", "n"] (3 phonemes, ur is ONE sound)
                         • "fern" → ["f", "er", "n"] (3 phonemes, er is ONE sound)
                         • "rain" → ["r", "ā", "n"] (3 phonemes, ai = long a)
                         ORTHOGRAPHY DISTRACTORS: Also return 3 plausible misspellings of the target word — letter substitutions or omissions a K-2 student might reasonably make (e.g. for "corn": ["korn", "cron", "cor"]). These are used for a spelling-choice activity so they should look visually similar to the correct word.
                         MANIPULATION TASK (Sound Swap activity): Return a phoneme deletion OR substitution task. Pick whichever yields a common English answer word. Include a child-friendly instruction line, the target phoneme in plain text (no slashes), the resulting answer word, and 3 distractor words that are also real common English words similar in length to the answer but NOT correct.
                         DECODABLE SENTENCE (Finish the Sentence activity): Return a short, sensible, concrete sentence of 3 to 7 words that uses "${rawWord}" exactly once and otherwise uses ONLY very common K-2 sight words (the, a, I, can, see, is, in, on, my, we, like, look, here, has, and). No contractions, no proper nouns, no commas. Also return "sentenceDistractors": 3 real words that LOOK similar to "${rawWord}" (same word family, or one letter different) but do NOT make sense in that sentence.
                         DECODABLE STORY (Read the Story activity): Return "story": an array of EXACTLY 3 short connected sentences (3 to 7 words each) that form a tiny story about "${rawWord}". At least 2 of the 3 sentences use "${rawWord}" (never twice in one sentence). Same vocabulary rule: only "${rawWord}" plus very common K-2 sight words. No contractions, no proper nouns, no commas.
                         Return ONLY JSON:
                         {
                             "word": "${rawWord}",
                             "phonemes": ["k", "or", "n"],
                             "graphemes": ["c", "or", "n"],
                             "phonemeCount": 3,
                             "syllables": ["corn"],
                             "syllableBlendingOptions": ["corn", "rabbit", "window", "pencil"],
                             "rhymeWord": "horn",
                             "rhymeDistractors": ["cord", "core", "car", "cone", "card"],
                             "blendingDistractors": ["cord", "core", "born", "worn", "torn"],
                             "orthographyDistractors": ["korn", "cron", "cor"],
                             "sentence": "I can see the corn.",
                             "sentenceDistractors": ["core", "cord", "torn"],
                             "story": ["Look at the corn.", "The corn is hot.", "We like the corn."],
                             "wordFamily": "-orn",
                             "familyEnding": "-orn",
                             "familyMembers": ["horn", "born", "worn", "torn", "morn"],
                             "firstSound": "k",
                             "lastSound": "n",
                             "definition": "Simple definition matching grade level",
                             "imagePrompt": "Icon of ${rawWord}, white background",
                             "manipulationTask": {
                                 "type": "deletion",
                                 "instruction": "Say '${rawWord}'. Now say it again, but leave out the /k/ sound.",
                                 "targetPhoneme": "k",
                                 "answer": "orn",
                                 "distractors": ["horn", "born", "torn"]
                             }
                         }
                      `;
                     const prompt = packIsEnglish ? _procPrompt_english : _procPrompt_nonEnglish;
                     const result = await awaitGeneration(callGemini(prompt + "\nRHYME CHOICES: Create a distinct distractor set for this target word; do not reuse the example distractors. Use familiar words of similar syllable count and difficulty, with a mix of similar beginning sounds and different vowel/end sounds. Every distractor must be a genuine non-rhyme of both the target and rhymeWord, including alternate spellings. Preserve one correct rhyme only.", true, false, null, null, signal));
                     if (!isGenerationActive()) return;
                     const data = parseWordSoundsAnalysis(result, rawWord);
                     let imageUrl = null;
                     if (callImagen) {
                        try {
                            const themePrefix = effectiveImageTheme ? `${effectiveImageTheme} style, ` : '';
                            const finalPrompt = data.imagePrompt
                                ? `${themePrefix}${data.imagePrompt}`
                                : `${themePrefix}Icon of ${rawWord}, white background`;
                            imageUrl = await awaitGeneration(callImagen(finalPrompt, undefined, undefined, { signal }));
                            if (!isGenerationActive()) return;
                        } catch(e) { if (!isGenerationActive()) return; warnLog('Caught error:', e?.message || e); }
                     }
                     // Cluster-aware estimate, and FLAG it: the old silent raw
                     // letter-split here shipped 'car' as [c,a,r] with no
                     // teacher-visible warning.
                     const _phonemesMissing = !(data.phonemes && data.phonemes.length > 0);
                     // Gemini, then eSpeak, then the spelling heuristic. Only
                     // the last rung is a guess, so only the last rung earns
                     // the "estimated sounds" flag the teacher sees.
                     let _espeakPhonemes = null;
                     if (_phonemesMissing) {
                         _espeakPhonemes = await awaitGeneration(espeakPackPhonemes(data.word, wordSoundsLanguage));
                         if (!isGenerationActive()) return;
                     }
                     const validatedPhonemes = !_phonemesMissing
                         ? data.phonemes
                         : (_espeakPhonemes || estimatePackPhonemes(data.word));
                     const _phonemeSource = !_phonemesMissing
                         ? 'gemini'
                         : (_espeakPhonemes ? 'espeak' : 'estimated');
                     const preparedRhyme = await awaitGeneration(preparePackRhyme(data.word, validatedPhonemes,
                         wordsToProcess, data.rhymeWord || (data.rhymes && data.rhymes[0]), packIsEnglish, wordSoundsLanguage));
                     if (!isGenerationActive()) return;
                     // Validate manipulationTask — Gemini sometimes skips it or
                     // returns partial data; null-it-out so the activity's
                     // on-demand fallback kicks in rather than shipping a
                     // broken task to the student.
                     let manipTask = null;
                     if (data.manipulationTask
                         && data.manipulationTask.answer
                         && Array.isArray(data.manipulationTask.distractors)
                         && data.manipulationTask.distractors.length >= 2
                         && data.manipulationTask.instruction) {
                         manipTask = {
                             type: data.manipulationTask.type || 'deletion',
                             instruction: data.manipulationTask.instruction,
                             targetPhoneme: data.manipulationTask.targetPhoneme || '',
                             answer: data.manipulationTask.answer,
                             distractors: data.manipulationTask.distractors.slice(0, 3),
                         };
                     }
                     processed.push({
                         id: Date.now() + i,
                         term: data.word,
                         word: data.word,
                         targetWord: data.word,
                         displayWord: data.word,
                         phonemes: validatedPhonemes,
                          phonemeCount: validatedPhonemes.length,
                         syllables: data.syllables,
                         syllableBlendingOptions: data.syllableBlendingOptions || [],
                         graphemes: data.graphemes || [],
                         rhymes: preparedRhyme.answer ? [preparedRhyme.answer] : [],
                         rhymeWord: preparedRhyme.answer,
                         rhymePronunciation: preparedRhyme.pronunciation,
                         _rhymeSource: preparedRhyme.source,
                         _rhymeRejectedAnswer: preparedRhyme.rejectedAnswer,
                         rhymeDistractors: (data.rhymeDistractors || []).filter((w) => !isUnusableAsPhonicsWord(w)),
                         blendingDistractors: (data.blendingDistractors || []).filter((w) => !isUnusableAsPhonicsWord(w)),
                         orthographyDistractors: data.orthographyDistractors || [],
                         // Raw AI sentence; compileActivityItems applies the
                         // decodability gate before anything trusts it.
                         sentence: typeof data.sentence === 'string' ? data.sentence.trim() : '',
                         sentenceDistractors: (data.sentenceDistractors || []).filter((w) => !isUnusableAsPhonicsWord(w)),
                         story: Array.isArray(data.story) ? data.story : [],
                         familyEnding: data.familyEnding || '',
                         familyMembers: (data.familyMembers || []).filter((w) => !isUnusableAsPhonicsWord(w)),
                         firstSound: WS_CORE.phonemeLabel(validatedPhonemes[0] || data.firstSound, packIsEnglish),
                         lastSound: WS_CORE.phonemeLabel(validatedPhonemes[validatedPhonemes.length - 1] || data.lastSound, packIsEnglish),
                         definition: data.definition,
                         image: imageUrl,
                         manipulationTask: manipTask,
                         // Only a spelling guess is "estimated". An eSpeak
                         // result is a real G2P answer and must not raise the
                         // teacher-facing warning, but its provenance is still
                         // recorded so the review panel can say where the
                         // sounds came from.
                         _fallbackUsed: (_phonemeSource === 'estimated') || undefined,
                         _phonemeSource
                     });
                 } catch (e) {
                     if (!isGenerationActive()) return;
                     warnLog("Word processing failed for:", rawWord, e.message);
                     // The word threw, so there is no Gemini answer at all —
                     // but a G2P engine does not need one. Try eSpeak before
                     // giving the child sounds derived from spelling.
                     const _espeakRescue = await awaitGeneration(espeakPackPhonemes(rawWord, wordSoundsLanguage));
                     if (!isGenerationActive()) return;
                     const fallbackPhonemes = _espeakRescue || estimatePackPhonemes(rawWord);
                     processed.push({
                         term: rawWord,
                         word: rawWord,
                         targetWord: rawWord,
                         phonemes: fallbackPhonemes,
                         phonemeCount: fallbackPhonemes.length,
                         firstSound: WS_CORE.phonemeLabel(fallbackPhonemes[0] || rawWord[0], packIsEnglish),
                         lastSound: WS_CORE.phonemeLabel(fallbackPhonemes[fallbackPhonemes.length - 1] || rawWord[rawWord.length - 1], packIsEnglish),
                         image: null,
                         _fallbackUsed: !_espeakRescue,
                         _phonemeSource: _espeakRescue ? 'espeak' : 'estimated'
                     });
                 }
                     setGeneratedCount(prev => prev + 1);
             }
             // Flag generated words this app cannot vouch for. Done here, after
             // every word is processed, so the session's own vocabulary counts
             // as vouched for: a teacher who typed a word has already made the
             // judgement this screen is asking for.
             {
                 const sessionWords = new Set(
                     processed
                         .map((it) => String(it.targetWord || it.word || it.term || '').trim().toLowerCase())
                         .filter(Boolean)
                 );
                 processed.forEach((item) => {
                     // Grouped by the boards that show them, so the review panel
                     // lists only the words the selected activities actually use.
                     const sources = {
                         rhyme: [item.rhymeWord, ...(item.rhymes || []), ...(item.rhymeDistractors || [])],
                         family: item.familyMembers || [],
                         blending: item.blendingDistractors || [],
                         sentence: item.sentenceDistractors || [],
                     };
                     const bySource = {};
                     Object.entries(sources).forEach(([source, words]) => {
                         const flagged = [...new Set(words.filter(Boolean)
                             .map((w) => String(w).trim().toLowerCase())
                             .filter((w) => isUnverifiedK2Word(w, sessionWords)))];
                         if (flagged.length) bySource[source] = flagged;
                     });
                     const unverified = [...new Set(Object.values(bySource).flat())];
                     if (unverified.length) item._unverifiedWords = unverified;
                     if (unverified.length) item._unverifiedBySource = bySource;
                 });
             }
             // A fixed form is authored as occurrences, not just vocabulary.
             // Compile missing boards, keeping each existing question exactly
             // as reviewed (including distinct positions for repeated words).
             const authoredAssessmentBoards = sessionType === 'assessment'
                 ? processed.map(item => item.activityItems?.[probeActivitySel]) : [];
             compileActivityItems(processed);
             authoredAssessmentBoards.forEach((board, index) => {
                 if (board) processed[index].activityItems[probeActivitySel] = board;
             });
             if (preparedActivities) processed.forEach(item => {
                 item.activityItems = Object.fromEntries(Object.entries(item.activityItems || {}).filter(([id]) => preparedActivities.includes(id)));
                 item._preparedActivities = preparedActivities;
                 item._instructionalCoverage = WS_CORE.profileCheck([item.word || item.targetWord, item.activityItems?.read_sentence?.sentence, item.activityItems?.read_passage?.story].filter(Boolean).join(" "), instructionalProfile);
             });

             // Build every picture required by the saved Read & Match boards on
             // the teacher device, then store one shared image manifest.
             const decodingAssets = {};
             const aacAssets = {};
             // Shared manifests can live on an unselected first item. Seed
             // from the complete pack, retaining its normal last-bucket wins
             // precedence even when that newer bucket is on a deselected row.
             preloadedWords.forEach((item) => {
                 const key = normalizePackKey(item.targetWord || item.word || item.term);
                 if (key && item.image) decodingAssets[key] = item.image;
                 Object.entries(item._decodingAssets || {}).forEach(([word, image]) => { decodingAssets[normalizePackKey(word)] = image; });
                 Object.entries(item._aacAssets || {}).forEach(([word, image]) => { aacAssets[normalizePackKey(word)] = image; });
             });
             processed.forEach(item => {
                 const key = normalizePackKey(item.targetWord || item.word || item.term);
                 if (key && item.image && !decodingAssets[key]) decodingAssets[key] = item.image;
                 delete item._decodingAssets; delete item._aacAssets;
             });
             const decodingWords = [...new Set(processed.flatMap((item) => [
                 item.targetWord || item.word || item.term,
                 ...(item.activityItems?.decoding?.choices || []),
                 ...(item.activityItems?.sentence_match?.sequence || []),
                 ...(item.activityItems?.sentence_match?.extras || []),
             ]).map(normalizePackKey).filter(Boolean))];
             if (typeof callImagen === 'function') {
                 // Picture the Sentence tiles ride the same manifest — its
                 // sequence/extras are pack words, so most already have
                 // images; this backfills any that do not.
                 for (const word of decodingWords) {
                     if (!isGenerationActive()) return;
                     if (decodingAssets[word]) continue;
                     try {
                         const themePrefix = effectiveImageTheme ? `${effectiveImageTheme} style, ` : '';
                         const image = await awaitGeneration(callImagen(`${themePrefix}Simple flat vector icon of "${word}", minimal educational illustration, white background, no text or labels`, undefined, undefined, { signal }));
                         if (!isGenerationActive()) return;
                         if (image) decodingAssets[word] = image;
                     } catch (e) {
                         if (!isGenerationActive()) return;
                         warnLog('Decoding image preload failed for:', word, e?.message || e);
                     }
                 }
             }

             // AAC overlay imagery (opt-in): pre-generate a picture for every
             // word that can appear as an answer choice so the AAC symbol
             // overlay works on student devices, where Imagen is unavailable.
             {
                 // Isolation shows Jolly-Phonics KEY-WORD pictures for each
                 // sound option — same table the player module uses.
                 const AAC_PHONEME_KEYWORDS = {
                     a: 'apple', b: 'ball', c: 'cat', d: 'dog', e: 'egg',
                     f: 'fish', g: 'goat', h: 'hat', i: 'igloo', j: 'jet',
                     k: 'kite', l: 'lion', m: 'moon', n: 'nest', o: 'octopus',
                     p: 'pig', q: 'queen', r: 'ring', s: 'sun', t: 'tree',
                     u: 'umbrella', v: 'van', w: 'web', x: 'fox', y: 'yarn',
                     z: 'zebra',
                     sh: 'ship', ch: 'chair', th: 'thumb', wh: 'whale',
                     ng: 'ring', ck: 'duck', ph: 'phone', oo: 'moon', ee: 'bee',
                     ai: 'rain', ay: 'play', oa: 'boat', ow: 'owl', ou: 'cloud',
                 };
                 const aacWords = [...new Set(processed.flatMap((item) => {
                     const boards = item.activityItems || {};
                     return [
                         ...(boards.blending?.options || []),
                         ...(boards.rhyming?.options || []),
                         ...(boards.manipulation?.options || []),
                         ...(boards.syllable_blending?.options || []),
                         ...((boards.isolation?.options || []).map((sound) => AAC_PHONEME_KEYWORDS[String(sound || '').replace(/\//g, '').toLowerCase()])),
                     ];
                 }).map((value) => normalizePackKey(value)).filter(Boolean))];
                 if (includeAacImages && typeof callImagen === 'function') {
                  setPrewarmTotal((prev) => prev + aacWords.length);
                  for (const word of aacWords) {
                     if (!isGenerationActive()) return;
                     try {
                         if (aacAssets[word] || decodingAssets[word]) continue;
                         const themePrefix = effectiveImageTheme ? `${effectiveImageTheme} style, ` : '';
                         const image = await awaitGeneration(callImagen(`${themePrefix}Simple flat vector icon of "${word}", minimal educational illustration, white background, no text or labels`, undefined, undefined, { signal }));
                         if (!isGenerationActive()) return;
                         if (image) aacAssets[word] = image;
                     } catch (e) {
                         if (!isGenerationActive()) return;
                         warnLog('AAC image preload failed for:', word, e?.message || e);
                     } finally {
                         if (isGenerationActive()) setPrewarmCount((prev) => prev + 1);
                     }
                  }
                 }
                 // Keep only supports used by this subset, including old AAC
                 // pictures when no image provider is available to regenerate.
                 const aacKeys = new Set(aacWords), decodingKeys = new Set([...decodingWords, ...aacWords]);
                 Object.keys(aacAssets).forEach(key => { if (!aacKeys.has(key)) delete aacAssets[key]; });
                 Object.keys(decodingAssets).forEach(key => { if (!decodingKeys.has(key)) delete decodingAssets[key]; });
             }

             // Convert teacher-generated blob URLs into portable JSON audio
             // assets. The student player reconstructs data URLs from this map
             // and never calls TTS.
             const packedTtsAssets = WS_CORE.packAudioAssets(preloadedWords);
             // Persist the exact clip contract alongside the pack. Readiness
             // used to count only target words, which could report "ready"
             // while a choice, sentence, story, or spoken prompt was absent.
             const requiredTtsKeys = new Set();
             processed.forEach((item) => {
                 // A newly approved whole-word clip must also beat a legacy
                 // aggregate bucket later in the list.
                 const word = item.targetWord || item.word || item.term;
                 const approved = reviewedCountAudio[syllableCountReviewKey(word)];
                 if (approved) packedTtsAssets[WS_CORE.packAudioKey(word)] = approved;
                 delete item._ttsAssets;
                 delete item._ttsRequiredKeys;
                 delete item._aacDefaultOn;
             });
             // ── Bank-first packing (2026-08-23) ──
             // The recorded word bank (word_audio_kokoro_bank.json, Kokoro
             // af_heart — see dev-tools/kokoro_audio_manifest.json) covers most
             // single-word clips, so Gemini TTS is reserved for sentences,
             // phrases and words the bank lacks. Three consequences on purpose:
             //   * pack builds stop burning Gemini quota on words the bank
             //     already holds (this loop has a 429 gate because builds
             //     genuinely hit rate limits);
             //   * a KEYLESS teacher (callTTS unavailable) still gets real
             //     word audio in the pack instead of nothing;
             //   * word audio in packs matches what the player speaks live,
             //     since handleAudio prefers the same bank at runtime.
             // English packs only — the bank is English by construction — and
             // the load is bounded so a failed fetch can never hang a build.
             let packRecordedWordBank = null;
             if (packIsEnglish && typeof window !== 'undefined' && typeof window.loadWordAudioBank === 'function') {
                 let bankTimeout;
                 try {
                     await awaitGeneration(Promise.race([
                         window.loadWordAudioBank(),
                         new Promise((resolve) => { bankTimeout = setTimeout(resolve, 6000); }),
                     ]));
                     if (!isGenerationActive()) return;
                     const bank = window._CACHE_WORD_AUDIO_BANK;
                     if (bank && Object.keys(bank).length > 0) packRecordedWordBank = bank;
                 } catch (_) { if (!isGenerationActive()) return; packRecordedWordBank = null; }
                 finally { clearTimeout(bankTimeout); }
             }
             const recordedBankAssetFor = (text) => {
                 if (!packRecordedWordBank) return null;
                 const key = normalizePackKey(text);
                 // Single words only: sentences, prompts and phoneme prompts
                 // always go to TTS so their voice stays consistent.
                 if (!key || key.includes(' ')) return null;
                 const src = packRecordedWordBank[key];
                 if (typeof src !== 'string') return null;
                 const match = src.match(/^data:([^;,]+);base64,(.+)$/i);
                 return match ? { mime: match[1], base64: match[2], provenance: WS_CORE.packAudioProvenance({ provider: 'kokoro', engine: 'kokoro', resolvedVoice: 'af_heart', language: 'en' }, 'recorded_bank') } : null;
             };
             let packedFromRecordedBank = 0;
             const addInstructionParts = (tasks, sentence) => {
                 String(sentence || '').split(/(\/[^\s/]{1,4}\/)/g)
                     .map((part) => part.trim())
                     .filter((part) => part && /[a-z0-9]/i.test(part) && !/^\/[^/]+\/$/.test(part))
                     .forEach((part) => tasks.add(part));
             };

             const speedForTts = (typeof ttsSpeed === 'number') ? ttsSpeed : undefined;
             for (const item of processed) {
                 if (!isGenerationActive()) return;
                 const word = item.targetWord || item.word || item.term;
                 const boards = item.activityItems || {};
                 const teacherSpoken = teacherSpokenCountOnly(item, packedTtsAssets, generationVoiceRef.current || '');
                 const tasks = new Set(teacherSpoken ? [] : [word]);
                 [
                     ...(boards.blending?.options || []),
                     ...(boards.rhyming?.options || []),
                     ...(boards.manipulation?.options || []),
                     ...(boards.syllable_blending?.contentStatus === 'teacher_recorded' ? [] : boards.syllable_blending?.audioUnits || []).map(unit => unit.text),
                     ...(boards.syllable_blending?.options || []),
                     ...(boards.orthography?.options || []),
                     ...(boards.sound_sort?.options || []),
                     ...(boards.sound_sort?.distractors || []),
                     ...(boards.word_families?.options || []),
                     ...(boards.word_families?.distractors || []),
                     ...(boards.decoding?.choices || []),
                     ...(boards.read_sentence?.options || []),
                     ...(boards.read_passage?.options || []),
                 ].forEach((value) => value && tasks.add(String(value)));
                 if (WS_CORE.manipulationReady(boards.manipulation?.task)) addInstructionParts(tasks, boards.manipulation.task.instruction);
                 if (boards.read_sentence?.sentence) {
                     // The completed sentence is read back after a correct
                     // answer — connected text needs its own clip. The
                     // instruction string must match the player's
                     // word_sounds.read_sentence_prompt EXACTLY or the packed
                     // clip will never be looked up.
                     tasks.add(boards.read_sentence.sentence);
                     tasks.add('Read the sentence. Which word finishes it?');
                 }
                 if (boards.read_passage?.story) {
                     // Same contract as the sentence clip: the instruction
                     // string must byte-match word_sounds.read_passage_prompt.
                     tasks.add(boards.read_passage.story);
                     // Per-sentence clips too: the player reads the completed
                     // story back line by line with a follow-along highlight,
                     // and each line needs its own clip to stay in sync.
                     String(boards.read_passage.story)
                         .split(/(?<=[.!?])\s+/)
                         .map((s) => s.trim())
                         .filter(Boolean)
                         .forEach((s) => tasks.add(s));
                     tasks.add('Read the story. Which word finishes it?');
                 }
                 if (boards.sentence_match?.sentence) {
                     // Byte-match contract with word_sounds.sentence_match_prompt.
                     tasks.add(boards.sentence_match.sentence);
                     tasks.add('Read the sentence. Match the pictures to it.');
                     [...(boards.sentence_match.sequence || []), ...(boards.sentence_match.extras || [])]
                         .forEach((value) => value && tasks.add(String(value)));
                 }
                 if (boards.blending) tasks.add('Which word did you hear?');
                 if (boards.rhyming) tasks.add('Which word rhymes with');
                 if (boards.sound_sort) tasks.add('Find words that start with the sound');
                 if (boards.sound_sort) tasks.add('Find words that end with the sound');
                 tasks.add('as in');
                 if (WS_CORE.syllableReady(boards.syllable_blending)) tasks.add('Listen to the syllables and blend them together');
                 if (boards.syllable_counting) tasks.add('How many syllables do you hear? Clap for each one');
                 if (boards.word_families?.rime) tasks.add(WS_CORE.wordFamilyInstruction(boards.word_families.rime));
                 const ordinalNames = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
                 (boards.isolation ? (item.phonemes || []) : []).forEach((_, index) => {
                     const ordinal = ordinalNames[index] || `${index + 1}th`;
                     tasks.add(`What is the ${ordinal} sound in ${word}?`);
                     tasks.add(`What is the ${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} sound?`);
                 });
                 const taskList = [...tasks].filter(Boolean);
                 taskList.forEach((text) => {
                     const key = normalizePackKey(text);
                     if (key) requiredTtsKeys.add(key);
                 });
                 setPrewarmTotal((prev) => prev + taskList.length);
                 const runTasks = async (list) => runGenerationTasks(list, async (text) => {
                     if (!isGenerationActive()) throw new Error('Generation canceled');
                     const key = normalizePackKey(text);
                     if (packedTtsAssets[key]) {
                         setPrewarmCount((prev) => prev + 1);
                         return packedTtsAssets[key];
                     }
                     // Recorded bank beats synthesis — and still supplies words
                     // when the TTS gate has aborted or no backend exists.
                     const recorded = recordedBankAssetFor(text);
                     if (recorded) {
                         packedTtsAssets[key] = recorded;
                         packedFromRecordedBank += 1;
                         setPrewarmCount((prev) => prev + 1);
                         return recorded;
                     }
                     try {
                         if (ttsGate.aborted || typeof callTTS !== 'function') throw new Error('TTS unavailable');
                         const voiceForTts = generationVoiceRef.current || undefined;
                          let resolvedProfile = null;
                          const src = await awaitGeneration(callTTS(text, voiceForTts, speedForTts, {
                              signal,
                              language: wordSoundsLanguage || 'English',
                              allowProviderFallback: !/^(af_|am_|bf_|bm_)/i.test(String(voiceForTts || '')),
                              onResolvedProfile: profile => { if (isGenerationActive()) resolvedProfile = profile; },
                          }));
                         if (!isGenerationActive()) throw generationAbortError();
                         const asset = await awaitGeneration(packTtsSource(src, signal));
                         if (!isGenerationActive()) throw generationAbortError();
                         if (!asset) throw new Error('TTS returned no portable audio');
                          asset.provenance = WS_CORE.packAudioProvenance(resolvedProfile, resolvedProfile ? 'synthesized' : 'unknown');
                         packedTtsAssets[key] = asset;
                         return asset;
                     } finally {
                         if (isGenerationActive()) setPrewarmCount((prev) => prev + 1);
                     }
                 });
                 const was429 = (results) => results.some((r) => r.status === 'rejected' && /429|Rate Limit/i.test(r.reason?.message || ''));
                 let results = await runTasks(taskList);
                 if (!isGenerationActive()) return;
                 if (was429(results)) {
                     ttsGate.rateLimited = true;
                     if (typeof window !== 'undefined' && !window.__kokoroOfferDeclined && onRequestKokoroOffer && !window.__kokoroOfferedThisPreload) {
                         window.__kokoroOfferedThisPreload = true;
                         try { onRequestKokoroOffer('word_sounds'); } catch (_) {}
                     }
                     if (ttsGate.cooldowns < TTS_MAX_COOLDOWNS) {
                         // Wait out the cooldown and retry only what is still
                         // missing, so the words after this one still get audio.
                         ttsGate.cooldowns += 1;
                         await waitWhileActive(TTS_COOLDOWN_MS * ttsGate.cooldowns);
                         if (!isGenerationActive()) return;
                         const stillMissing = taskList.filter((text) => !packedTtsAssets[normalizePackKey(text)]);
                         setPrewarmTotal((prev) => prev + stillMissing.length);
                         results = await runTasks(stillMissing);
                         if (!isGenerationActive()) return;
                         if (was429(results) && ttsGate.cooldowns >= TTS_MAX_COOLDOWNS) ttsGate.aborted = true;
                     } else {
                         ttsGate.aborted = true;
                     }
                 }
                 item.ttsReady = !!packedTtsAssets[normalizePackKey(word)];
                 item._ttsFailed = !item.ttsReady && !teacherSpoken;
             }
             // Drop media that belongs only to deselected words/activities,
             // after collecting every dependency of the rebuilt boards.
             Object.keys(packedTtsAssets).forEach(key => { if (!requiredTtsKeys.has(key)) delete packedTtsAssets[key]; });
             finalizeSyllableCountAudio(processed, packedTtsAssets, generationVoiceRef.current || '');
             if (processed[0]) {
                 processed[0]._studentPackVersion = 2;
                 // What the packing run actually managed, recorded at the point
                 // of truth. A pack that lost its audio to a rate limit looks
                 // identical to a complete one from the outside, and the only
                 // place that difference is knowable is here.
                 processed[0]._ttsCoverage = {
                     clips: Object.keys(packedTtsAssets).length,
                     requiredClips: requiredTtsKeys.size,
                     wordsWithAudio: processed.filter((it) => it.ttsReady).length,
                     words: processed.length,
                     rateLimited: ttsGate.rateLimited,
                     gaveUp: ttsGate.aborted,
                     // Provenance: clips served from the recorded word bank
                     // instead of synthesis (developer-side Kokoro label; see
                     // dev-tools/kokoro_audio_manifest.json).
                     fromRecordedBank: packedFromRecordedBank,
                 };
                 processed[0]._ttsRequiredKeys = [...requiredTtsKeys];
                 processed[0]._ttsAssets = packedTtsAssets;
                 processed[0]._decodingAssets = decodingAssets;
                 if (Object.keys(aacAssets).length) processed[0]._aacAssets = aacAssets;
                 if (aacDefaultOn) processed[0]._aacDefaultOn = true;
             }
             // A probe is a single timed skill — never a multi-activity lesson plan.
             const isAssessment = sessionType === 'assessment';
             const useLessonPlan = includeLessonPlan && !isAssessment;
             let sequence = [];
             const enabledActivities = [];
             if (useLessonPlan) {
                 lessonPlanOrder.forEach(actId => {
                     const cfg = lessonPlan[actId];
                     if (cfg && lessonPlanActivityOn(actId)) {
                         enabledActivities.push({ id: actId, count: cfg.count, enabled: true });
                         for (let k = 0; k < cfg.count; k++) sequence.push(actId);
                     }
                 });
             }
             const lessonPlanConfig = useLessonPlan ? {
                 masteryMode: 'consecutive',
                 masteryThreshold: 3,
                 activities: enabledActivities,
                 order: lessonPlanOrder.filter(lessonPlanActivityOn),
                 totalItems: sequence.length,
                 estimatedMinutes: Math.ceil(sequence.length * 0.5)
             } : null;
             // `student` is deliberately sent even when blank: the host reads it
             // as "no student", which is what clears a target left over from an
             // Assessment Center run instead of misfiling this child's probe
             // under that one.
             const probeOptions = isAssessment
                 ? {
                     isProbe: true,
                     activity: probeActivitySel,
                     student: probeStudentTrimmed || null,
                     grade: probeGradeLevel || gradeLevel || 'K',
                     form: probeForm || 'A',
                 }
                 : { isProbe: false };
             const sessionTtsSpeed = typeof ttsSpeed === 'number' && Number.isFinite(ttsSpeed) && ttsSpeed >= 0.5 && ttsSpeed <= 1.5 ? ttsSpeed : 1;
             const sessionConfig = {
                 schema: 'alloflow-word-sounds-session/v1',
                 ...(preparedActivities ? { preparedActivities } : {}),
                 instructionalProfile,
                 version: 1,
                 sessionGoal: isAssessment
                     ? processed.length
                     : Math.max(1, Number(wordSoundsSessionGoal) || 30),
                 orthoSessionGoal: isAssessment || useLessonPlan
                     ? 0
                     : Math.max(0, Number(orthoSessionGoal) || 0),
                 imageVisibilityMode: isAssessment ? 'off' : imageVisibilityMode,
                 language: wordSoundsLanguage || 'en',
                 wordSoundsTtsSpeed: sessionTtsSpeed,
                 ttsSpeed: sessionTtsSpeed,
                 fixedForm: isAssessment,
                 ...(isAssessment ? { itemIds: processed.map((item, index) => String(sourceOccurrenceIds?.[index] ?? item.itemId ?? item.probeItemId ?? item.id ?? `${probeActivitySel}:${index + 1}`)) } : {}),
                 probeItemCount: isAssessment ? processed.length : null,
                 studentLocked: isAssessment,
                 learnerId: probeStudentTrimmed || null,
                 probeGrade: isAssessment ? (probeGradeLevel || gradeLevel || 'K') : null,
                 probeForm: isAssessment ? (probeForm || 'A') : null
             };
             const configSummary = isAssessment
                 ? `📊 Assessment · ${String(probeActivitySel).replace(/_/g, ' ')} probe (timed, no hints)` +
                   (probeStudentTrimmed ? ` · ${probeStudentTrimmed}` : '')
                 : (lessonPlanConfig
                     ? `Mastery: ${lessonPlanConfig.masteryThreshold} consecutive • ` +
                       enabledActivities.map(a => `${a.id.replace('_', ' ')} (${a.count})`).join(' → ') +
                       ` • Est. ${lessonPlanConfig.estimatedMinutes} min`
                     : 'Quick Practice Mode');
             // The optional fifth and sixth arguments preserve compatibility with
             // older hosts while carrying assessment identity and visible setup
             // choices to current hosts.
             if (!isGenerationActive()) return;
             onStartGame(processed, sequence, lessonPlanConfig, configSummary, probeOptions, sessionConfig);
             } catch (error) {
                 if (isGenerationActive()) throw error;
             } finally {
                 if (isGenerationActive()) {
                     setIsProcessing(false);
                     startRunRef.current = false;
                     generationControllerRef.current = null;
                 }
             }
        };

        if (isMinimized) {
            return (
                <div className="fixed bottom-4 right-4 z-[100] bg-white rounded-2xl shadow-2xl border-2 border-violet-500 p-4 animate-in motion-reduce:animate-none slide-in-from-bottom-10 fade-in w-80">
                     <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-2">
                             <Loader2 className={`text-violet-600 ${isProcessing ? 'animate-spin motion-reduce:animate-none' : ''}`} size={20} />
                             <span className="font-bold text-slate-700 text-sm">
                                 {isProcessing ? tf('status.analyzing', 'Generating...') : tf('word_sounds.title', 'Word Sounds Studio')}
                             </span>
                         </div>
                         <div className="flex items-center gap-1">
                             <button type="button" aria-label={tf('word_sounds.expand_setup', 'Expand Word Sounds setup')} data-help-key="ws_gen_expand" onClick={() => { setIsMinimized(false); if (onExpand) onExpand(); }} className="p-2 hover:bg-slate-100 rounded text-slate-600">
                                 <Maximize2 size={18} />
                             </button>
                             <button type="button" aria-label={tf('word_sounds.close_setup', 'Close Word Sounds setup')} onClick={handleGeneratorClose} className="p-2 hover:bg-slate-100 rounded text-slate-600">
                                 <X size={18} />
                             </button>
                         </div>
                     </div>
                     {syllableExitGuard.notice}
                     {isProcessing && (
                         <div className="space-y-2" role="status" aria-live="polite" aria-busy="true">
                             <div className="flex justify-between text-xs font-bold text-violet-600">
                                 <span>{tf('status.analyzing', 'Processing...')}</span>
                                 <span>{generatedCount} / {selectedIndices.size}</span>
                             </div>
                             <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-label="Preparing Word Sounds activity" aria-valuemin={0} aria-valuemax={selectedIndices.size} aria-valuenow={generatedCount}>
                                 <div
                                     className="h-full bg-violet-600 transition-all duration-300"
                                     style={{ width: `${selectedIndices.size ? (generatedCount / selectedIndices.size) * 100 : 0}%` }}
                                 />
                             </div>
                             {prewarmTotal > 0 && (
                                 <div className="flex justify-between text-[11px] font-medium text-teal-600">
                                     <span>🔊 Preloading voices</span>
                                     <span>{prewarmCount} / {prewarmTotal}</span>
                                 </div>
                             )}
                         </div>
                     )}
                     {!isProcessing && (
                          <div className="text-center">
                              <button type="button"
                                  aria-label={tf('word_sounds.expand_setup', 'Expand Word Sounds setup')}
                                  data-help-key="ws_gen_expand" onClick={() => { setIsMinimized(false); if (onExpand) onExpand(); }}
                                  className="text-xs bg-violet-100 text-violet-700 font-bold px-3 py-1.5 rounded-full hover:bg-violet-200"
                              >
                                  Tap to Expand
                              </button>
                          </div>
                     )}
                </div>
            );
        }
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4 animate-in motion-reduce:animate-none fade-in">
                <div ref={setupDialogRef} role="dialog" aria-modal="true" aria-label={tf('word_sounds.setup_dialog_label', 'Word Sounds setup')} tabIndex={-1} className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[96vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-400 focus:outline-none">
                    <div className="bg-gradient-to-r from-violet-700 to-indigo-700 p-4 sm:p-6 flex flex-wrap justify-between items-center gap-3 text-white shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                                <Sparkles size={32} className="text-yellow-300 animate-pulse motion-reduce:animate-none" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black tracking-tight">{isProbeMode ? `📊 ${tf('word_sounds.probe_title', '{skill} Probe', { skill: probeActivityLabel })}` : tf('word_sounds.title', 'Word Sounds Studio')}</h2>
                                <p className="text-indigo-100 font-medium opacity-90">{tf('word_sounds.subtitle', 'Design your phonics lesson')} • {gradeLevel || 'K-2'}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" data-help-key="ws_gen_minimize" onClick={() => { setIsMinimized(true); if (onMinimize) onMinimize(); }} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors" title={t('common.minimize')}>
                                <Minimize size={24} />
                            </button>
                            <button type="button" aria-label={tf('word_sounds.close_setup', 'Close Word Sounds setup')} data-help-key="ws_gen_close" onClick={handleGeneratorClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors" title={t('common.close')}>
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                    {syllableExitGuard.notice}
                    {preloadedWords && preloadedWords.length > 0 && (
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-100 rounded-full p-1.5">
                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                </div>
                                <div>
                                    <span className="font-bold text-emerald-800">{tf('word_sounds.words_prepared_count', '{count} words prepared', { count: preloadedWords.length })}</span>
                                    <span className="text-emerald-600 text-sm ml-2">
                                        {preloadedWords.slice(0, 5).map(w => w.targetWord || w.word || w).join(', ')}
                                        {preloadedWords.length > 5 && `, +${preloadedWords.length - 5} more`}
                                    </span>
                                </div>
                            </div>
                            <button type="button"
                                data-help-key="ws_gen_review_btn" onClick={handleShowReview}
                                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Eye size={14} />
                                Review Words
                            </button>
                        </div>
                    )}
                    {(() => {
                        // Pre-preload Kokoro recommendation. Shows only on Canvas when the user
                        // is on a cloud voice, Kokoro isn't already loaded, and they haven't
                        // dismissed the tip this session. Switching now (before hitting Generate)
                        // is the moment that actually changes the outcome — by the time prewarm
                        // starts synthesizing dozens of clips per word, Gemini's 60s cooldown can trip.
                        const isKokoroVoice = typeof selectedVoice === 'string' && /^[abil][fm]_/i.test(selectedVoice);
                        const kokoroReady = typeof window !== 'undefined' && window._kokoroTTS && window._kokoroTTS.ready;
                        const isEnglish = !wordSoundsLanguage || String(wordSoundsLanguage).toLowerCase().startsWith('en');
                        const shouldShow = isCanvasEnv && isEnglish && !isKokoroVoice && !kokoroReady
                            && !kokoroRecDismissed && !isProcessing;
                        if (!shouldShow) return null;
                        return (
                            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 px-6 py-3">
                                <div className="flex items-start gap-3">
                                    <div className="bg-amber-100 rounded-full p-2 shrink-0">
                                        <span className="text-xl">🎤</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-amber-900 text-sm mb-1">{t('word_sounds.kokoro_recommended') || 'Recommended for Word Sounds: Kokoro local voice'}</p>
                                        <p className="text-amber-800 text-xs leading-relaxed mb-2">
                                            Preloading can synthesize dozens of audio clips per word—including prompts, choices, phonemes, syllables, and feedback. On Gemini this can hit the 60-second rate-limit cooldown mid-preload. Kokoro is a free on-device voice—one-time ~40 MB download, then every Word Sounds session is instant and rate-limit-free.
                                        </p>
                                        <div className="flex gap-2">
                                            <button type="button"
                                                onClick={() => {
                                                    if (typeof window === 'undefined' || !window.__loadKokoroTTS) return;
                                                    window.__kokoroTTSDownloading = true;
                                                    window.__loadKokoroTTS().then(ok => {
                                                        window.__kokoroTTSDownloading = false;
                                                        if (ok && typeof setSelectedVoice === 'function') {
                                                            setSelectedVoice('af_heart');
                                                        }
                                                    }).catch(() => { window.__kokoroTTSDownloading = false; });
                                                }}
                                                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs transition-colors shadow-sm"
                                            >
                                                Use Kokoro Voice
                                            </button>
                                            <button type="button"
                                                onClick={() => {
                                                    try { sessionStorage.setItem('allo.kokoroRecDismissed', '1'); } catch (_) {}
                                                    setKokoroRecDismissed(true);
                                                }}
                                                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-400 rounded-lg font-bold text-xs transition-colors"
                                            >
                                                Keep Gemini
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                    <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
                        <div className="w-full lg:w-1/3 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 sm:p-6 flex flex-col gap-6 lg:overflow-y-auto">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest px-1">{tf('word_sounds.session_type', 'Session Type')}</label>
                                <div className="bg-white p-2 rounded-xl border border-slate-400 shadow-sm grid grid-cols-2 gap-2">
                                    <button type="button" data-help-key="ws_gen_mode_practice"
                                        onClick={() => setSessionType('practice')}
                                        aria-pressed={sessionType === 'practice'}
                                        className={`px-3 py-2 rounded-lg font-bold text-sm transition-colors ${sessionType === 'practice' ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                        🎮 {tf('word_sounds.mode_practice', 'Practice')}
                                    </button>
                                    <button type="button" data-help-key="ws_gen_mode_assessment"
                                        onClick={() => { setSessionType('assessment'); setIncludeLessonPlan(false); }}
                                        aria-pressed={sessionType === 'assessment'}
                                        className={`px-3 py-2 rounded-lg font-bold text-sm transition-colors ${sessionType === 'assessment' ? 'bg-amber-700 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                        📊 {tf('word_sounds.mode_assessment', 'Assessment')}
                                    </button>
                                </div>
                                {sessionType === 'assessment' && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                                        <p className="text-[11px] font-semibold text-amber-800 leading-snug">
                                            {tf('word_sounds.assessment_note', 'Timed, no hints — a single-skill probe for progress monitoring, not practice. Lesson plans are turned off in this mode.')}
                                        </p>
                                        <label className="block text-xs font-bold text-amber-900">{tf('word_sounds.probe_skill', 'Probe skill')}</label>
                                        <select aria-label={tf('word_sounds.probe_skill', 'Probe skill')}
                                            value={probeActivitySel} onChange={(e) => setProbeActivitySel(e.target.value)}
                                            className="w-full px-2 py-1.5 rounded-lg border border-amber-300 bg-white text-sm font-semibold text-slate-700">
                                            <option value="segmentation">{tf('word_sounds.act_segmentation', 'Segmentation')}</option>
                                            <option value="isolation">{tf('word_sounds.act_isolation', 'Sound Isolation')}</option>
                                            <option value="blending">{tf('word_sounds.act_blending', 'Blending')}</option>
                                            <option value="rhyming">{tf('word_sounds.act_rhyming', 'Rhyming')}</option>
                                            <option value="counting">{tf('word_sounds.act_counting', 'Sound Counting')}</option>
                                            <option value="syllable_counting">{tf('word_sounds.act_syllable_counting', 'Syllable Counting')}</option>
                                            <option value="syllable_blending">{tf('word_sounds.act_syllable_blending', 'Syllable Blending')}</option>
                                        </select>
                                        <label className="block text-xs font-bold text-amber-900" htmlFor="ws-probe-student">
                                            {tf('word_sounds.probe_student', 'Student (for records)')}
                                        </label>
                                        <input id="ws-probe-student" type="text"
                                            list={probeStudentNames.length > 0 ? 'ws-probe-student-names' : undefined}
                                            value={probeStudent}
                                            disabled={isProcessing}
                                            onChange={(e) => { if (!startRunRef.current) setProbeStudent(e.target.value); }}
                                            placeholder={tf('word_sounds.probe_student_placeholder', 'Name or nickname')}
                                            autoComplete="off"
                                            className="w-full px-2 py-1.5 rounded-lg border border-amber-300 bg-white text-sm font-semibold text-slate-700" />
                                        {probeStudentNames.length > 0 && (
                                            <datalist id="ws-probe-student-names">
                                                {probeStudentNames.map((n) => <option key={n} value={n} />)}
                                            </datalist>
                                        )}
                                        {/* Say plainly where the result goes. A probe that banks
                                            nowhere still looks identical while the child takes it,
                                            so the only honest place to tell the teacher is here,
                                            before they start. */}
                                        <p className="text-[11px] font-semibold text-amber-800 leading-snug" role="note">
                                            {probeStudentTrimmed
                                                ? tf('word_sounds.probe_student_saved', 'Saved to the progress-monitoring record for {name}.', { name: probeStudentTrimmed })
                                                : tf('word_sounds.probe_student_unsaved', 'No student named. This run is scored on screen only, and is NOT saved to any record.')}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest px-1">{tf('word_sounds.settings', 'Settings')}</label>
                                <div className="bg-white p-4 rounded-xl border border-slate-400 shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{tf('word_sounds.count', 'Word Count')}</span>
                                        <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded-md text-xs font-bold">{wordCount}</span>
                                    </div>
                                    <input aria-label={t('common.word_count_slider')}
                                        type="range" min="5" max="40" step="1"
                                        data-help-key="ws_gen_count_slider" value={wordCount} onChange={(e) => setWordCount(parseInt(e.target.value))}
                                        className="w-full accent-violet-600 cursor-pointer"
                                    />
                                    <p className="text-xs text-slate-600 mt-2">{t('word_sounds.auto_select_hint', `Auto-selects ${wordCount} words`)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-400 shadow-sm mt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{tf('word_sounds.phono_activity_length', 'Sound Activities per Session')}</span>
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">{wordSoundsSessionGoal || 30}</span>
                                    </div>
                                    <input aria-label={t('common.session_goal_slider')}
                                        type="range" min="5" max="200" step="5"
                                        data-help-key="ws_gen_session_slider" value={wordSoundsSessionGoal || 30}
                                        onChange={(e) => setWordSoundsSessionGoal && setWordSoundsSessionGoal(parseInt(e.target.value))}
                                        className="w-full accent-emerald-500 cursor-pointer"
                                    />
                                    <p className="text-xs text-slate-600 mt-2">{tf('word_sounds.phono_activity_length_hint', 'Phonological activities complete after this many correct answers')}</p>
                                </div>
                                <div className="mt-3">
                                    <div className={`bg-white p-4 rounded-xl border ${includeLessonPlan ? 'opacity-50 cursor-not-allowed border-slate-200' : orthoSessionGoal > 0 ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'} shadow-sm`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-slate-700">{tf('word_sounds.ortho_activity_length', '🔤 Spelling Activities per Session')}</span>
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${orthoSessionGoal > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{orthoSessionGoal || 'Off'}</span>
                                        </div>
                                        <input aria-label={t('common.spelling_session_goal_slider')}
                                            type="range" min="0" max="100" step="5"
                                            data-help-key="ws_gen_ortho_slider" value={orthoSessionGoal || 0}
                                            onChange={(e) => !includeLessonPlan && setOrthoSessionGoal(parseInt(e.target.value))}
                                            className={`w-full ${includeLessonPlan ? 'opacity-50' : ''} accent-indigo-500 cursor-pointer`}
                                            disabled={includeLessonPlan}
                                        />
                                        <p className="text-xs text-slate-600 mt-2">
                                            {includeLessonPlan
                                                ? '⚠️ Controlled by Lesson Plan mode'
                                                : orthoSessionGoal > 0
                                                    ? t('word_sounds.ortho_activity_hint_on', `Spelling activities begin after sound activities complete (${orthoSessionGoal} items)`)
                                                    : tf('word_sounds.ortho_activity_hint_off', 'Slide right to add spelling practice after phonics activities')
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-400 shadow-sm mt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{tf('word_sounds.image_theme', 'Image Style')}</span>
                                        <Palette size={18} className="text-pink-500" />
                                    </div>
                                    <select
                                        aria-label="Image style source"
                                        value={imageThemeMode}
                                        onChange={(e) => {
                                            const nextMode = e.target.value;
                                            setImageThemeMode(nextMode);
                                            if (nextMode === 'override' && !imageTheme.trim()) setImageTheme('Simple flat vector art');
                                        }}
                                        className="w-full p-2 rounded-lg border border-slate-400 text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                    >
                                        <option value="inherit">Use Universal style</option>
                                        <option value="override">Override for this resource</option>
                                    </select>
                                    {imageThemeMode === 'inherit' && (
                                        <p className="text-xs text-slate-600 mt-2">
                                            {String(universalImageStyle || '').trim()
                                                ? `Using Universal style: ${String(universalImageStyle).trim()}`
                                                : 'No Universal style is set; the app default will be used.'}
                                        </p>
                                    )}
                                    {imageThemeMode === 'override' && (
                                        <input aria-label={t('common.image_theme_input')}
                                            type="text"
                                            data-help-key="ws_gen_theme_input" value={imageTheme}
                                            onChange={(e) => setImageTheme(e.target.value)}
                                            placeholder={tf('word_sounds.theme_placeholder', 'e.g. cartoon, pixel art, realistic...')}
                                            className="w-full mt-2 p-2 rounded-lg border border-slate-400 text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                        />
                                    )}
                                    <p className="text-xs text-slate-600 mt-2">Style changes apply to new Word Sounds images, not Glossary images.</p>
                                    <label className="flex items-start gap-2 mt-3 cursor-pointer">
                                        <input type="checkbox" checked={includeAacImages}
                                            onChange={(e) => setIncludeAacImages(e.target.checked)}
                                            className="mt-0.5 accent-teal-600" />
                                        <span className="text-xs text-slate-600">
                                            <span className="font-bold text-slate-700">{tf('word_sounds.aac_prep_label', 'Prepare AAC symbol images')}</span><br/>
                                            {tf('word_sounds.aac_prep_hint', 'Pre-generates a picture for every answer choice so the AAC symbol overlay works on student devices without AI. Slower to prepare.')}
                                        </span>
                                    </label>
                                    <label className="flex items-start gap-2 mt-2 cursor-pointer">
                                        <input type="checkbox" checked={aacDefaultOn}
                                            onChange={(e) => { setAacDefaultOn(e.target.checked); if (e.target.checked) setIncludeAacImages(true); }}
                                            className="mt-0.5 accent-teal-600" />
                                        <span className="text-xs text-slate-600">
                                            <span className="font-bold text-slate-700">{tf('word_sounds.aac_default_label', 'Start with symbol overlay ON')}</span><br/>
                                            {tf('word_sounds.aac_default_hint', 'For AAC users: activities open with picture-supported answer choices already showing (also enables image preparation).')}
                                        </span>
                                    </label>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-400 shadow-sm mt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{t('word_sounds.image_display_mode')}</span>
                                        <ImageIcon size={18} className="text-violet-500" />
                                    </div>
                                    <select aria-label={t('common.image_display_mode')}
                                        value={imageVisibilityMode}
                                        onChange={(e) => setImageVisibilityMode(e.target.value)}
                                        className="w-full p-2 rounded-lg border border-slate-400 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
                                        title={t('common.control_when_word_images_appear_during_activities')}
                                    >
                                        <option value="smart">🧠 Smart (Recommended) - Activity-specific</option>
                                        <option value="alwaysOn">🖼️ Always On - Image visible immediately</option>
                                        <option value="progressive">📈 Progressive - After 1st response</option>
                                        <option value="afterCompletion">✅ After Completion - After correct or 2nd attempt</option>
                                    </select>
                                    <p className="text-xs text-slate-600 mt-2">When should word images be revealed during activities (Smart = optimized per activity)</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-400 shadow-sm mt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{t('word_sounds.syllable_range')}</span>
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">{syllableRange.min} - {syllableRange.max}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-600 block mb-1">Min</label>
                                            <input aria-label={t('common.min')}
                                                type="number" min="1" max="12"
                                                data-help-key="ws_gen_syllable_min" value={syllableRange.min}
                                                onChange={(e) => {
                                                    const val = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
                                                    aiSuggestions.cancel();
                                                    setSyllableRange(prev => ({ ...prev, min: Math.min(val, prev.max) }));
                                                }}
                                                className="w-full p-2 border rounded-lg text-center font-bold"
                                            />
                                        </div>
                                        <span className="text-slate-600 mt-4">-</span>
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-600 block mb-1">Max</label>
                                            <input aria-label={t('common.max')}
                                                type="number" min="1" max="12"
                                                data-help-key="ws_gen_syllable_max" value={syllableRange.max}
                                                onChange={(e) => {
                                                    const val = Math.max(1, Math.min(12, parseInt(e.target.value) || 4));
                                                    aiSuggestions.cancel();
                                                    setSyllableRange(prev => ({ ...prev, max: Math.max(val, prev.min) }));
                                                }}
                                                className="w-full p-2 border rounded-lg text-center font-bold"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-2">{t('word_sounds.syllable_range_hint') || 'Limit word complexity (Min/Max Syllables)'}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest px-1">{tf('word_sounds.voice_pack_section', 'Voice')}</label>
                                <button type="button" onClick={() => setShowVoicePack(true)} data-help-key="ws_gen_voice_pack" className="w-full p-3 rounded-xl border-2 border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors flex items-center gap-3 text-left">
                                    <span className="text-xl">🎙️</span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-bold text-violet-700 text-sm">{tf('word_sounds.voice_pack_cta', 'Record your own sounds')}</span>
                                        <span className="block text-[11px] text-slate-500">{tf('word_sounds.voice_pack_cta_hint', 'Use your voice for the phoneme bank (Orton-Gillingham)')}</span>
                                    </span>
                                </button>
                            </div>
                            {showVoicePack ? <PhonemeVoicePackEditor onClose={() => setShowVoicePack(false)} t={t} /> : null}
                            <div className="space-y-3" role="group" aria-labelledby="word-sounds-active-sources-label">
                                <div id="word-sounds-active-sources-label" className="text-xs font-bold text-slate-600 uppercase tracking-widest px-1">{tf('word_sounds.sources', 'Active Sources')}</div>
                                {WS_CORE.isSyllableLanguageSupported(wordSoundsLanguage) && <label className="block p-3 rounded-xl border-2 border-sky-200 bg-sky-50 cursor-pointer">
                                    <span className="flex items-center gap-2 font-bold text-sky-800"><input type="checkbox" checked={includeSyllableWords} onChange={e => setIncludeSyllableWords(e.target.checked)} />{tf('word_sounds.blending_bank', 'Syllable blending word bank')}</span>
                                    <span className="block text-xs text-slate-700 mt-1">{tf('word_sounds.blending_bank_help', '{count} compound words, such as sun + set and rain + coat. Each part has a reliable whole-word pronunciation.', { count: WS_CORE.syllableWords().length })}</span>
                                </label>}
                                {WS_CORE.isSyllableLanguageSupported(wordSoundsLanguage) && <label className="block p-3 rounded-xl border-2 border-sky-200 bg-sky-50 cursor-pointer">
                                    <span className="flex items-center gap-2 font-bold text-sky-800"><input type="checkbox" checked={includeSyllableCountWords} onChange={e => setIncludeSyllableCountWords(e.target.checked)} />{tf('word_sounds.counting_bank', 'Syllable counting word bank')}</span>
                                    <span className="block text-xs text-slate-700 mt-1">{tf('word_sounds.counting_bank_help', '{count} familiar words for counting, including noncompound and longer words. Blending uses separate word-specific recordings.', { count: WS_CORE.syllableCountWords().length })}</span>
                                </label>}
                                <label className={`block min-h-11 p-3 rounded-xl border-2 transition-all cursor-pointer focus-within:ring-2 focus-within:ring-violet-600 focus-within:ring-offset-2 ${includeGlossary ? 'bg-violet-50 border-violet-500' : 'bg-white border-slate-200'}`} data-help-key="ws_gen_src_glossary"><input type="checkbox" checked={includeGlossary} onChange={(e) => setIncludeGlossary(e.target.checked)} className="sr-only" />
                                    <span className="flex items-center gap-3">
                                        <span aria-hidden="true" className={`w-5 h-5 rounded border flex items-center justify-center ${includeGlossary ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`}>
                                            {includeGlossary && <Check size={14} className="text-white" aria-hidden="true" />}
                                        </span>
                                        <BookOpen size={18} className="text-violet-600" />
                                        <span className="font-bold text-slate-700">{tf('word_sounds.source_glossary', 'Glossary')} ({glossaryTerms?.length || 0})</span>
                                    </span>
                                </label>
                                <div className={`p-3 rounded-xl border-2 transition-all ${includeFamily ? 'bg-pink-50 border-pink-500' : 'bg-white border-slate-200'}`}>
                                    <label className="min-h-11 flex items-center gap-3 cursor-pointer rounded-lg focus-within:ring-2 focus-within:ring-pink-600 focus-within:ring-offset-2" data-help-key="ws_gen_src_family"><input type="checkbox" checked={includeFamily} onChange={(e) => setIncludeFamily(e.target.checked)} className="sr-only" />
                                        <span aria-hidden="true" className={`w-5 h-5 rounded border flex items-center justify-center ${includeFamily ? 'bg-pink-600 border-pink-600' : 'border-slate-300'}`}>
                                            {includeFamily && <Check size={14} className="text-white" aria-hidden="true" />}
                                        </span>
                                        <Layers size={18} className="text-pink-600" />
                                        <span className="font-bold text-slate-700">{tf('word_sounds.source_family', 'Word Family')}</span>
                                    </label>
                                    {includeFamily && (
                                        <><select aria-label={t('common.selection')} data-help-key="ws_gen_family_select"
                                            value={selectedFamily}
                                            onChange={(e) => setSelectedFamily(e.target.value)}
                                            className="mt-3 w-full p-2 rounded-lg border border-pink-200 bg-white text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                        >
                                            <option value="">{tf('word_sounds.select_family', 'Select family...')}</option>
                                            {Object.keys(WORD_FAMILY_PRESETS).map(k => <option key={k} value={k}>{k} ({WORD_FAMILY_PRESETS[k].length})</option>)}
                                        </select>
                                        {selectedFamily && WORD_FAMILY_PRESETS[selectedFamily] && WORD_FAMILY_PRESETS[selectedFamily].filter(withinSyllableRange).length === 0 && (
                                            <p className="text-red-700 text-xs mt-2 font-bold bg-red-50 p-2 rounded border border-red-100">
                                                ⚠️ No words match range ({syllableRange.min}-{syllableRange.max}). Adjust Syllables or range.
                                            </p>
                                        )}
                                    </>)}
                                </div>
                                <div className={`p-3 rounded-xl border-2 transition-all ${includeCustom ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'}`}>
                                    <label className="min-h-11 flex items-center gap-3 cursor-pointer rounded-lg focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2" data-help-key="ws_gen_src_custom"><input type="checkbox" checked={includeCustom} onChange={(e) => setIncludeCustom(e.target.checked)} className="sr-only" />
                                        <span aria-hidden="true" className={`w-5 h-5 rounded border flex items-center justify-center ${includeCustom ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                                            {includeCustom && <Check size={14} className="text-white" aria-hidden="true" />}
                                        </span>
                                        <Edit2 size={18} className="text-emerald-600" />
                                        <span className="font-bold text-slate-700">{tf('word_sounds.source_custom', 'Custom Manual')}</span>
                                    </label>
                                    {includeCustom && (<>
                                        <div className="mt-3 flex gap-2">
                                            <input aria-label={t('common.quick_add_word')}
                                                id="word-sounds-quick-add" data-help-key="ws_gen_quick_add_input"
                                                type="text"
                                                placeholder={tf('word_sounds.add_word', 'Add a word...')}
                                                className="flex-1 p-2 rounded-lg border border-emerald-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const input = e.target;
                                                        const word = input.value.trim();
                                                        if (word) {
                                                            setCustomText(prev => prev ? `${prev} ${word}` : word);
                                                            input.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                            <button data-help-key="ws_gen_quick_add_btn"
                                                type="button"
                                                onClick={() => {
                                                    const input = document.getElementById('word-sounds-quick-add');
                                                    const word = input?.value.trim();
                                                    if (word) {
                                                        setCustomText(prev => prev ? `${prev} ${word}` : word);
                                                        input.value = '';
                                                    }
                                                }}
                                                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-lg transition-colors"
                                            >
                                                + Add
                                            </button>
                                        </div>
                                        <textarea
                                            aria-label={tf('word_sounds.type_words', 'Type words here')}
                                            value={customText} onChange={(e) => setCustomText(e.target.value)}
                                            placeholder={tf('word_sounds.type_words', 'Type words here (space or comma separated)...')}
                                            className="mt-2 w-full h-20 p-2 rounded-lg border border-emerald-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none resize-none"
                                        />
                                    </>)}
                                </div>
                                <div className={`p-3 rounded-xl border-2 transition-all ${includeSightWords ? 'bg-amber-50 border-amber-500' : 'bg-white border-slate-200'}`}>
                                    <label className="min-h-11 flex items-center gap-3 cursor-pointer rounded-lg focus-within:ring-2 focus-within:ring-amber-600 focus-within:ring-offset-2"><input type="checkbox" checked={includeSightWords} onChange={(e) => setIncludeSightWords(e.target.checked)} className="sr-only" />
                                        <span aria-hidden="true" className={`w-5 h-5 rounded border flex items-center justify-center ${includeSightWords ? 'bg-amber-600 border-amber-600' : 'border-slate-300'}`}>
                                            {includeSightWords && <Check size={14} className="text-white" aria-hidden="true" />}
                                        </span>
                                        <BookOpen size={18} className="text-amber-600" />
                                        <span className="font-bold text-slate-700">{tf('word_sounds.source_sight_words', '📚 Sight Words')}</span>
                                    </label>
                                    {includeSightWords && (
                                        <select aria-label={t('common.selection')}
                                            value={selectedSightWordList}
                                            onChange={(e) => setSelectedSightWordList(e.target.value)}
                                            className="mt-3 w-full p-2 rounded-lg border border-amber-200 bg-white text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                        >
                                            <option value="">{t('word_sounds.sight_word_list_placeholder') || 'Select a sight word list...'}</option>
                                            {Object.keys(SIGHT_WORD_PRESETS).map(k => (
                                                <option key={k} value={k}>{k} ({SIGHT_WORD_PRESETS[k].length} words)</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className={`p-3 rounded-xl border-2 transition-all ${includeAI ? 'bg-violet-50 border-violet-500' : 'bg-white border-slate-200'}`}>
                                    <label className="min-h-11 flex items-center gap-3 cursor-pointer rounded-lg focus-within:ring-2 focus-within:ring-violet-600 focus-within:ring-offset-2"><input type="checkbox" checked={includeAI} onChange={(e) => { aiSuggestions.cancel(); setIncludeAI(e.target.checked); }} className="sr-only" />
                                        <span aria-hidden="true" className={`w-5 h-5 rounded border flex items-center justify-center ${includeAI ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`}>
                                            {includeAI && <Check size={14} className="text-white" aria-hidden="true" />}
                                        </span>
                                        <Sparkles size={18} className="text-violet-600" />
                                        <span className="font-bold text-slate-700">{tf('word_sounds.source_ai', 'AI Topic Gen')}</span>
                                    </label>
                                    {includeAI && (
                                        <div className="mt-3 flex gap-2">
                                            <input aria-label={t('common.e_g_space_ocean')}
                                                value={aiTopic} onChange={(e) => { aiSuggestions.cancel(); setAiTopic(e.target.value); }}
                                                placeholder={t('word_sounds.ai_topic_placeholder') || 'e.g. Space, Ocean...'}
                                                className="flex-1 p-2 rounded-lg border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                            />
                                            <button type="button"
                                                onClick={handleAiGenerate} disabled={isAiGenerating}
                                                className="bg-violet-600 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-50"
                                            >
                                                {isAiGenerating ? '...' : 'Go'}
                                            </button>
                                            {isAiGenerating && <button type="button" onClick={aiSuggestions.cancel} className="min-h-11 px-3 py-1 border border-violet-400 rounded-lg text-sm">
                                                {tf('word_sounds.ai_cancel', 'Cancel generation')}
                                            </button>}
                                        </div>
                                    )}
                                    {includeAI && aiSuggestions.failed && <p role="status" className="mt-2 text-sm text-amber-800">{tf('word_sounds.ai_failed', 'Could not generate words. Your previous list was kept. Try again.')}</p>}
                                </div>
                            </div>
                            <div className="space-y-3 pt-4 mt-4 border-t border-slate-200">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest px-1">📋 Lesson Plan (Advanced)</label><div className={`p-4 rounded-xl border-2 transition-all ${sessionType === 'assessment' ? 'opacity-50 pointer-events-none' : ''} ${includeLessonPlan ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-200'}`}>
                                    <label className="min-h-11 flex items-center justify-between cursor-pointer mb-3 rounded-lg focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2">
                                        <input type="checkbox" checked={includeLessonPlan} disabled={sessionType === 'assessment'} onChange={(e) => setIncludeLessonPlan(e.target.checked)} className="sr-only" />
                                        <span className="flex items-center gap-2">
                                            <span aria-hidden="true" className={`w-5 h-5 rounded border flex items-center justify-center ${includeLessonPlan ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                {includeLessonPlan && <Check size={14} className="text-white" aria-hidden="true" />}
                                            </span>
                                            <span className="font-bold text-slate-700">{t('word_sounds.enable_lesson_plan')}</span>
                                        </span>
                                    </label>
                                    {includeLessonPlan && (
                                        <div className="space-y-3 pl-2 mt-3 animate-in motion-reduce:animate-none fade-in slide-in-from-top-1" role="list" aria-label="Lesson plan activity order">
                                            <p className="text-xs text-slate-600">Drag activities or use the Move up and Move down buttons to reorder.</p>
                                            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{lessonPlanReorderStatus}</div>
                                            {!soundSwapAvailable && <p className="text-xs text-slate-600" data-ws-sound-swap-hidden="true">{tf('word_sounds.sound_swap_hidden_note', 'Sound Swap is hidden: none of the selected words has a checked one-sound change.')}</p>}
                                            {lessonPlanOrder.map((actId, activityIndex) => {
                                                if (actId === 'manipulation' && !soundSwapAvailable) return null;
                                                const activityDefs = {
                                                    isolation: { id: 'isolation', label: 'Find Sounds', icon: ScanSearch },
                                                    blending: { id: 'blending', label: 'Blending', icon: GripHorizontal },
                                                    segmentation: { id: 'segmentation', label: 'Break It Down', icon: Scissors },
                                                    orthography: { id: 'orthography', label: 'Sight & Spell', icon: Type },
                                                    rhyming: { id: 'rhyming', label: 'Rhyme Time', icon: Music },
                                                    letter_tracing: { id: 'letter_tracing', label: 'Letter Tracing', icon: PenTool },
                                                    counting: { id: 'counting', label: 'Sound Counting', icon: Calculator },
                                                    mapping: { id: 'mapping', label: 'Sound Mapping', icon: GitCompare },
                                                    sound_sort: { id: 'sound_sort', label: 'Sound Sort', icon: Users },
                                                    word_families: { id: 'word_families', label: 'Word Families', icon: Users },
                                                    word_scramble: { id: 'word_scramble', label: 'Word Scramble', icon: Shuffle },
                                                    manipulation: { id: 'manipulation', label: 'Sound Swap', icon: Shuffle },
                                                    syllable_counting: { id: 'syllable_counting', label: 'Syllable Counting', icon: Calculator },
                                                    syllable_blending: { id: 'syllable_blending', label: 'Syllable Blending', icon: GripHorizontal },
                                                    spelling_bee: { id: 'spelling_bee', label: 'Spelling Bee', icon: Type },
                                                    missing_letter: { id: 'missing_letter', label: 'Missing Letter', icon: Type },
                                                    decoding: { id: 'decoding', label: 'Read & Match', icon: BookOpen },
                                                    read_sentence: { id: 'read_sentence', label: 'Finish the Sentence', icon: BookOpen },
                                                    read_passage: { id: 'read_passage', label: 'Read the Story', icon: BookOpen },
                                                    sentence_match: { id: 'sentence_match', label: 'Picture the Sentence', icon: BookOpen },
                                                };
                                                const activity = activityDefs[actId];
                                                return (
                                                <div
                                                    key={activity.id}
                                                    role="listitem"
                                                    draggable
                                                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', activity.id); setDraggedActivity(activity.id); }}
                                                    data-keyboard-alternative="Use the Move up and Move down buttons"
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        const fromId = e.dataTransfer.getData('text/plain');
                                                        const toId = activity.id;
                                                        if (fromId !== toId) {
                                                            setLessonPlanOrder(prev => {
                                                                const newOrder = [...prev];
                                                                const fromIdx = newOrder.indexOf(fromId);
                                                                const toIdx = newOrder.indexOf(toId);
                                                                newOrder.splice(fromIdx, 1);
                                                                newOrder.splice(toIdx, 0, fromId);
                                                                return newOrder;
                                                            });
                                                        }
                                                        setDraggedActivity(null);
                                                    }}
                                                    onDragEnd={() => setDraggedActivity(null)}
                                                    className={`bg-white p-3 rounded-lg border transition-all cursor-move ${draggedActivity === activity.id ? 'border-indigo-500 shadow-lg scale-[1.02]' : 'border-indigo-100 hover:border-indigo-300'}`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <GripVertical size={14} className="text-slate-600 cursor-grab active:cursor-grabbing" aria-hidden="true" />
                                                            <input aria-labelledby={`ws-activity-label-${activity.id}`}
                                                                type="checkbox"
                                                                checked={lessonPlan[activity.id]?.enabled}
                                                                onChange={(e) => setLessonPlan(prev => ({
                                                                    ...prev,
                                                                    [activity.id]: { ...prev[activity.id], enabled: e.target.checked }
                                                                }))}
                                                                className="accent-indigo-600 w-4 h-4"
                                                            />
                                                            <span id={`ws-activity-label-${activity.id}`} className="text-sm font-semibold text-slate-700">{activity.label}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1" role="group" aria-label={`Reorder ${activity.label}`}>
                                                            {lessonPlan[activity.id].enabled && (
                                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                                    {lessonPlan[activity.id].count}x
                                                                </span>
                                                            )}
                                                            <button type="button" onClick={() => moveLessonPlanActivity(activity.id, activity.label, 'up')} disabled={activityIndex === 0} className="min-h-11 min-w-11 rounded-lg border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2" aria-label={`Move ${activity.label} up`}><span aria-hidden="true">↑</span></button>
                                                            <button type="button" onClick={() => moveLessonPlanActivity(activity.id, activity.label, 'down')} disabled={activityIndex === lessonPlanOrder.length - 1} className="min-h-11 min-w-11 rounded-lg border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2" aria-label={`Move ${activity.label} down`}><span aria-hidden="true">↓</span></button>
                                                        </div>
                                                    </div>
                                                    {lessonPlan[activity.id].enabled && (
                                                        <input aria-label={tf('word_sounds.activity_item_count', '{activity}: item count', { activity: activity.label })}
                                                            type="range" min="1" max="20" step="1"
                                                            value={lessonPlan[activity.id].count}
                                                            onChange={(e) => setLessonPlan(prev => ({
                                                                ...prev,
                                                                [activity.id]: { ...prev[activity.id], count: parseInt(e.target.value) }
                                                            }))}
                                                            className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    )}
                                                </div>
                                            ); })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 bg-white p-4 sm:p-6 lg:p-8 lg:overflow-y-auto flex flex-col">
                             <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-700">{tf('word_sounds.preview_title', 'Lesson Preview')}</h3>
                                    <div className="flex items-center gap-4">
                                        <p className="text-slate-600 font-medium">{selectedIndices.size} {tf('word_sounds.of_total', 'of')} {previewList.length} {tf('word_sounds.words_selected', 'words selected')}</p>
                                        {previewList.length > 0 && (
                                            <button type="button"
                                                aria-label={t('common.toggle_all')}
                                                onClick={toggleAll}
                                                className="text-xs font-bold uppercase tracking-wider text-violet-600 hover:text-violet-700 hover:underline"
                                            >
                                                {selectedIndices.size === previewList.length ? tf('word_sounds.deselect_all', 'Deselect All') : tf('word_sounds.select_all', 'Select All')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button type="button"
                                    onClick={handleStart}
                                    disabled={selectedIndices.size === 0 || unsupportedSyllableWords.length > 0 || unreviewedSyllableCountWords.length > 0 || isProcessing}
                                    className={`px-8 py-4 rounded-2xl font-black text-xl shadow-xl transition-all flex items-center gap-3 ${
                                        selectedIndices.size > 0 && unsupportedSyllableWords.length === 0 && unreviewedSyllableCountWords.length === 0 && !isProcessing
                                            ? 'bg-gradient-to-r from-violet-700 to-indigo-700 text-white hover:scale-105 active:scale-95 hover:shadow-2xl hover:brightness-110'
                                            : isProcessing
                                                ? 'bg-violet-600 text-white cursor-wait'
                                                : 'bg-slate-100 text-slate-600 cursor-not-allowed'
                                    }`}
                                >
                                    {isProcessing ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <PlayCircle fill="currentColor" className="text-white/20" size={28} />}
                                    {isProcessing ? tf('status.generating', 'Generating...') : teacherSpokenCountWords.length ? tf('word_sounds.start_teacher_led', 'Start teacher-led activity') : tf('word_sounds.start', 'Start Activity')}
                                </button>
                             </div>
                             {isTeacherMode && !isProbeMode && sessionType !== 'assessment' && <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50 p-4">
                                 <button type="button" onClick={openWordPractice} disabled={wordPracticeStatus.busy} aria-busy={wordPracticeStatus.busy} aria-describedby="word-sounds-setup-presentation-help" className="min-h-11 rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-800 hover:bg-violet-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">{wordPracticeStatus.busy ? tf('word_sounds.practice_opening', 'Opening presentation tools…') : tf('word_sounds.practice_present_export', 'Present & Export')}</button>
                                 <p id="word-sounds-setup-presentation-help" className="mt-2 text-sm text-slate-600">{tf('word_sounds.practice_setup_help', 'Use selected words now, or paste a list. Project word practice or download HTML and PowerPoint. Audio is optional.')}</p>
                                 <p role="status" aria-live="polite" className="mt-1 text-sm text-amber-900">{wordPracticeStatus.notice}</p>
                             </div>}
                             {isProcessing && (
                                 <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl p-6 border border-violet-200 animate-in motion-reduce:animate-none fade-in slide-in-from-top-2" role="status" aria-live="polite" aria-busy="true">
                                     <div className="flex items-center justify-between mb-3">
                                         <div className="flex items-center gap-3">
                                             <Loader2 className="animate-spin motion-reduce:animate-none text-violet-600" size={24} />
                                             <span className="font-bold text-violet-800 text-lg">{tf('status.analyzing', 'Creating audio & analyzing words...')}</span>
                                         </div>
                                         <span className="text-violet-600 font-black text-xl">{generatedCount} / {selectedIndices.size}</span>
                                     </div>
                                     <div className="w-full h-4 bg-violet-200/50 rounded-full overflow-hidden" role="progressbar" aria-label="Preparing Word Sounds activity" aria-valuemin={0} aria-valuemax={selectedIndices.size} aria-valuenow={generatedCount}>
                                         <div
                                             className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                                             style={{ width: `${(generatedCount / selectedIndices.size) * 100}%` }}
                                         ></div>
                                     </div>
                                     <p className="text-violet-500 text-sm mt-2 text-center">
                                         {generatedCount < selectedIndices.size
                                             ? `Building Audio: "${previewList[Array.from(selectedIndices)[generatedCount]] || '...'}"`
                                             : 'Finishing up...'}
                                     </p>
                                     {prewarmTotal > 0 && (
                                         <div className="mt-3 pt-3 border-t border-violet-200/60">
                                             <div className="flex items-center justify-between mb-1.5">
                                                 <div className="flex items-center gap-2">
                                                     <Volume2 size={14} className="text-teal-600" />
                                                     <span className="text-teal-700 font-bold text-xs uppercase tracking-wider">{t('word_sounds.preloading_voices') || 'Preloading voices for instant playback'}</span>
                                                 </div>
                                                 <span className="text-teal-600 font-bold text-sm">{prewarmCount} / {prewarmTotal}</span>
                                             </div>
                                             <div className="w-full h-2 bg-teal-100 rounded-full overflow-hidden">
                                                 <div
                                                     className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300"
                                                     style={{ width: `${prewarmTotal ? (prewarmCount / prewarmTotal) * 100 : 0}%` }}
                                                 />
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             )}

                            {pendingSyllableEdits?.length > 0 && <div ref={unsavedSyllableNotice} className="mb-3">
                                <WordSoundsSyllableDraftNotice words={pendingSyllableEdits.map(edit => edit.word)} translate={tf}
                                    onReview={reviewUnsavedSyllableEdits} onUseSaved={() => handleStart({ useSavedSyllables: true })} />
                            </div>}
                            {unsupportedSyllableWords.length > 0 && <p role="alert" className="mb-3 p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900">Add and review syllable recordings below, use a word from the syllable bank, or deselect: {unsupportedSyllableWords.join(', ')}.</p>}
                            {unreviewedSyllableCountWords.length > 0 && <p role="alert" className="mb-3 p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900">{tf('word_sounds.count_review_blocked', 'Review the syllable count below or deselect: {words}.', { words: unreviewedSyllableCountWords.join(', ') })}</p>}
                            {teacherSpokenCountWords.length > 0 && <p role="status" className="mb-3 p-3 rounded-xl border border-violet-300 bg-violet-50 text-violet-900">{tf('word_sounds.count_teacher_led_notice', 'Teacher-led activity: say these words aloud for the learner: {words}. Their approved counts will be kept without generating whole-word audio. This activity needs a teacher present.', { words: teacherSpokenCountWords.join(', ') })}</p>}
                            {syllableCountingSelected && <details ref={countReviewRegion} open={countReviewOpen} onToggle={event => { if (event.target === event.currentTarget) setCountReviewOpen(event.currentTarget.open); }} className="bg-white border border-violet-300 rounded-xl p-4 mb-3">
                                <summary className="cursor-pointer font-bold text-violet-900">{tf('word_sounds.count_review_title', 'Review syllable counts')}</summary>
                                <p className="text-sm my-2">{tf('word_sounds.count_review_help', 'Listen, confirm the count, then move to the next word. Approvals follow this pronunciation; changing the clip requires another review. Your word selection stays the same.')}</p>
                                {syllableDictionaryState === 'loading' && <p role="status" className="text-sm my-2">{tf('word_sounds.count_dictionary_loading', 'Loading pronunciation dictionary… You can also confirm counts yourself.')}</p>}
                                {syllableDictionaryState === 'unavailable' && <div className="my-2"><p role="status" className="text-sm">{tf('word_sounds.count_dictionary_unavailable', 'The extended pronunciation dictionary is unavailable. Compound bank words still work; review other counts yourself.')}</p>
                                    <button type="button" onClick={retrySyllableDictionary} className="min-h-11 border border-violet-300 rounded-lg px-3 py-2 mt-2">{tf('word_sounds.count_dictionary_retry', 'Retry pronunciation dictionary')}</button></div>}
                                <WordSoundsSyllableCountQueue words={previewList.filter((word, index) => selectedIndices.has(index))}
                                    isOpen={countReviewOpen} reviewRequest={syllableReviewRequest} countDraftStore={syllableSessionDrafts.current.counts} recordingDraftStore={syllableSessionDrafts.current.recordings}
                                    resolveWord={syllableCountFor} contextFor={syllableCountContextFor} profileFor={word => WS_CORE.packAudioProfileStatus(syllableCountAudioFor(word), selectedVoice, wordSoundsLanguage)} recordedFor={preparedSyllableFor}
                                    translate={tf} previewWord={previewSyllableCountWord} onSave={saveSyllableCount}
                                    onSaveRecording={saveReviewedSyllableRecording} onUseWithoutRecording={useCountWithoutRecording} />
                                {Object.entries(detachedSyllableRecordings).map(([key, saved]) => <p key={key} role="status" className="text-sm my-2">
                                    {tf('word_sounds.count_recording_excluded', 'The old syllable recording for {word} is excluded from this lesson. Its original saved clips are kept.', { word: saved.word })}
                                    <button type="button" className="min-h-11 border rounded-lg px-3 py-2 ml-2" onClick={() => undoCountRecordingExclusion(key)}>{tf('word_sounds.count_recording_undo', 'Undo for {word}', { word: saved.word })}</button>
                                </p>)}
                                <p role="status" aria-live="polite" className="text-sm mt-2">{countLibraryNotice}</p>
                            </details>}
                            {syllableBlendingSelected && <details ref={recordingReviewRegion} open={recordingReviewOpen} onToggle={event => { if (event.target === event.currentTarget) setRecordingReviewOpen(event.currentTarget.open); }} className="bg-white border border-violet-300 rounded-xl p-4 mb-3">
                                <summary className="cursor-pointer font-bold text-violet-900">{tf('word_sounds.syllable_recordings_heading', 'Word-specific syllable recordings')}</summary>
                                <p className="text-sm my-2">{tf('word_sounds.syllable_recording_help', 'Extend blending to words with two to eight syllables using your reviewed recordings. Recordings travel with the saved lesson.')}</p>
                                <div className="space-y-2">{recordingReviewOpen && previewList.filter((word, index) => selectedIndices.has(index)).map(word => <WordSoundsSyllableRecordingEditor
                                    translate={tf}
                                    key={word} word={word} language={wordSoundsLanguage} board={preparedSyllableFor(word)}
                                    draft={syllableSessionDrafts.current.recordings.get(recordingDraftKey(word))} onDraftChange={(draft, key) => keepRecordingDraft(word, draft, key)}
                                    onSave={task => saveReviewedSyllableRecording(word, task)} />)}</div>
                            </details>}
                             <details className="bg-white border border-slate-300 rounded-xl p-4 mb-3">
                                <summary className="cursor-pointer font-bold text-slate-700">{tf('word_sounds.preparation_options', 'Preparation and taught spellings')}</summary>
                                <label className="block mt-3 text-sm font-semibold" htmlFor="ws-prepare-scope">{tf('word_sounds.prepare_scope', 'Activities to prepare')}</label>
                                <select id="ws-prepare-scope" value={prepareScope} onChange={e => setPrepareScope(e.target.value)} className="w-full min-h-11 border border-slate-400 rounded-lg p-2">
                                    <option value="all">{tf('word_sounds.prepare_all', 'All activities (allows switching)')}</option>
                                    <option value="lesson" disabled={!includeLessonPlan}>{tf('word_sounds.prepare_lesson', 'Selected lesson only (less audio to prepare)')}</option>
                                </select>
                                <p className="text-sm text-slate-600 mt-2">{tf('word_sounds.taught_spellings_help', 'Optional spelling coverage check. Enter taught letters and adjacent letter groups, separated by commas; list known whole words separately. Review sound values and irregular spellings with the learner.')}</p>
                                <label className="block mt-3 text-sm font-semibold" htmlFor="ws-taught-patterns">{tf('word_sounds.taught_patterns', 'Taught letters and letter groups')}</label>
                                <input id="ws-taught-patterns" value={taughtPatternsText} onChange={e => setTaughtPatternsText(e.target.value)} placeholder={tf('word_sounds.taught_spellings_placeholder', 's, a, t, p, i, n, sh, ck')} className="w-full min-h-11 border border-slate-400 rounded-lg p-2" />
                                <label className="block mt-3 text-sm font-semibold" htmlFor="ws-known-words">{tf('word_sounds.known_words', 'Known whole words')}</label>
                                <input id="ws-known-words" value={knownWordsText} onChange={e => setKnownWordsText(e.target.value)} className="w-full min-h-11 border border-slate-400 rounded-lg p-2" />
                                {instructionalProfile.taughtPatterns.length > 0 && <p role="status" className="mt-2 text-sm text-amber-900">{tf('word_sounds.pattern_review_words', 'Words to review against taught spellings: {words}', { words: previewList.filter(w => WS_CORE.profileCheck(w, instructionalProfile).status === 'review').join(', ') || tf('word_sounds.none', 'None') })}</p>}
                            </details>
                             {previewList.length > 0 ? (
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-20">
                                     {previewList.map((word, i) => {
                                         const isSelected = selectedIndices.has(i);
                                         const countInfo = syllableCountFor(word);
                                         return (
                                             <button
                                                 type="button"
                                                 key={i}
                                                 onClick={() => toggleSelection(i)}
                                                 aria-pressed={isSelected}
                                                 aria-label={String(word) + ': ' + (isSelected ? 'selected' : 'not selected')}
                                                 className={`border-2 rounded-xl px-4 py-3 flex items-center justify-between group cursor-pointer transition-all ${
                                                     isSelected
                                                         ? 'bg-violet-50 border-violet-500 shadow-md'
                                                         : 'bg-slate-50 border-slate-100 hover:border-violet-200'
                                                 }`}
                                             >
                                                 <div className="flex items-center gap-3">
                                                     <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                                         isSelected ? 'bg-violet-600 border-violet-600' : 'border-slate-300 bg-white'
                                                     }`}>
                                                         {isSelected && <Check size={14} className="text-white" />}
                                                     </div>
                                                     <span><span className={`block font-bold text-lg capitalize ${isSelected ? 'text-violet-900' : 'text-slate-600'}`}>{word}</span>
                                                         <span className="block text-xs text-slate-600">{countInfo.supported
                                                             ? tf(countInfo.count === 1 ? 'word_sounds.preview_syllable_count_one' : 'word_sounds.preview_syllable_count', countInfo.count === 1 ? '{count} syllable · {source}' : '{count} syllables · {source}', { count: countInfo.count, source: countInfo.status === 'reviewed' ? tf('word_sounds.count_source_reviewed', 'Teacher reviewed') : countInfo.status === 'curated' ? tf('word_sounds.count_source_curated', 'Reviewed word bank') : tf('word_sounds.count_source_dictionary', 'Pronunciation dictionary (US English)') })
                                                             : tf('word_sounds.preview_syllable_review', 'Syllable count needs review')}</span>
                                                     </span>
                                                 </div>
                                                 <div className="flex gap-1">
                                                     <span className="w-2 h-2 rounded-full bg-indigo-400" title={t('common.phonemes')}></span>
                                                     <span className="w-2 h-2 rounded-full bg-pink-400" title={t('common.image')}></span>
                                                 </div>
                                             </button>
                                         );
                                     })}
                                 </div>
                             ) : (
                                 <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                                     <Layers size={48} className="mb-4 opacity-50" />
                                     <p className="text-xl font-bold">{tf('word_sounds.no_words', 'No words selected')}</p>
                                     <p className="text-sm">{tf('word_sounds.choose_source_hint', 'Choose a source to begin')}</p>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        );
    });
// @section WORD_SOUNDS_REVIEW — the review panel LIVES IN misc_components_source.jsx.
// A ~950-line fossil copy sat here for months and repeatedly swallowed edits meant
// for the live panel (the tri-source phoneme checker was wired only to the fossil).
// It was deleted 2026-08-11; do not re-add a copy — edit misc_components_source.jsx.
