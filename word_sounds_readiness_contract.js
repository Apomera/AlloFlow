(function (root, factory) {
  if (root && root.window) root = root.window;
  var existing = root && root.AlloModules && root.AlloModules.WordSoundsReadiness;
  var api = existing && existing.VERSION === 9 && typeof existing.portable === 'function' ? existing : factory(root || {});
  if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.WordSoundsReadiness = api; }
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (host) {
  'use strict';
// BEGIN GENERATED WORD SOUNDS CORE
// Canonical Word Sounds logic. Embedded by dev-tools/sync_word_sounds_core.cjs.
// Edge sounds use the application's English phoneme-bank convention (including
// r-controlled vowel units). null denotes an unresolved pronunciation variant.
function createWordSoundsCore(options = {}) {
  const VERSION = 1;
  // BEGIN SHARED PREPARED SENTENCE PARTS
  // The setup board stores trimmed fragments. Locate their edges in the
  // authored sentence and replace only the answer, never its separators.
  function preparedSentenceParts(sentence, before, target, after) {
    if (![sentence, before, target, after].every(value => typeof value === 'string') || !target.trim()) return null;
    const source = sentence.trim(), left = before.trim(), right = after.trim();
    const fold = value => value.normalize('NFD').toLowerCase().replace(/\s+/gu, ' ');
    let leftEnd = left.length, rightStart = source.length - right.length;
    if (!source.startsWith(left) || !source.endsWith(right)) {
      // Legacy fragments can differ in case, whitespace or Unicode form.
      // Map the two comparison offsets back to actual source boundaries.
      const leftUnits = fold(left).length, rightUnits = fold(source).length - fold(right).length;
      leftEnd = leftUnits === 0 ? 0 : -1;
      rightStart = rightUnits === 0 ? 0 : -1;
      let units = 0;
      for (const part of source.matchAll(/\s+|\S/gu)) {
        units += fold(part[0]).length;
        const end = part.index + part[0].length;
        if (units === leftUnits) leftEnd = end;
        if (units === rightUnits) rightStart = end;
      }
      if (leftEnd < 0 || rightStart < 0 || fold(source.slice(0, leftEnd)) !== fold(left) || fold(source.slice(rightStart)) !== fold(right)) return null;
    }
    if (rightStart < leftEnd) return null;
    const gap = source.slice(leftEnd, rightStart), answer = gap.trim();
    if (fold(answer) !== fold(target.trim())) return null;
    const start = sentence.indexOf(source) + leftEnd + gap.indexOf(answer);
    return { before: sentence.slice(0, start), answer, after: sentence.slice(start + answer.length) };
  }
  // END SHARED PREPARED SENTENCE PARTS
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
  const buildRhymeBoard = ({word, answer, phonemes, answerPhonemes, pool=[], distractors=[], prepared, isEnglish=true, count=4, exposure, difficulty}) => {
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
    // Optional difficulty. Omitted (or 'hard'): the near contrasts above, as
    // before. 'easy': clearly different words only (another vowel and another
    // final sound than the target and its rhyme). 'medium': one near foil at most.
    const level = difficulty === 'easy' || difficulty === 'medium' ? difficulty : null;
    let selected;
    if (!level) {
      selected = challengePool.sort((a,b) => score(a) + repetitionCost(a) - score(b) - repetitionCost(b)).slice(0, count);
    } else {
      const spelledVowel = w => isEnglish ? (w.match(/[aeiouy]+/) || [''])[0] : '';
      const vowelKeys = w => [labels(w).find(s => vowels.has(s)), spelledVowel(w)].filter(Boolean);
      const endKeys = w => { const end = finalSound(w); return [end ? soundKey(end) : null, w.slice(-1)].filter(Boolean); };
      const refVowels = new Set([...vowelKeys(target), ...vowelKeys(correct)]);
      const refEnds = new Set([...endKeys(target), ...endKeys(correct)]);
      const near = w => vowelKeys(w).some(key => refVowels.has(key)) || endKeys(w).some(key => refEnds.has(key));
      const onset = edgeSound(target, 'first', phonemes);
      const lengthCost = w => Math.abs((labels(w).length || w.length) - (targetSounds.length || target.length));
      const plain = w => lengthCost(w) * 3 + (onset && edgeSound(w, 'first', (data.get(w) || {}).phonemes) === onset ? 1 : 0) + repetitionCost(w);
      const order = shuffled(candidates, seed);
      const far = order.filter(w => !near(w)).sort((a,b) => plain(a) - plain(b));
      const close = order.filter(near).sort((a,b) => score(a) + repetitionCost(a) - score(b) - repetitionCost(b));
      if (level === 'easy') {
        selected = far.slice(0, count);
        // Too few clearly different words: fill only as far as a two-foil board.
        if (selected.length < Math.min(count, 2)) selected = [...selected, ...close.slice(0, Math.min(count, 2) - selected.length)];
      } else {
        selected = [...close.slice(0, far.length >= count - 1 ? 1 : count - far.length), ...far].slice(0, count);
      }
    }
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
      (args.pool || []).filter(value => value && typeof value === 'object').map(value => [value.targetWord || value.word || value.term, value.phonemes]),
      ...(args.difficulty === 'easy' || args.difficulty === 'medium' ? [args.difficulty, args.count] : [])]);
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
    // support.hysteresis (optional): after a step back, moving up again takes
    // two qualifying windows in a row (three after a second step back), and the
    // result carries support:'more' when the lowest band is still under 40%.
    // Without it the decision and its fields are exactly as before.
    const steady=support.hysteresis===true;
    let band=0, block=[], reason='starting', changes=0, backs=0, held=0;
    const bands=['easy','medium','hard'];
    const need=()=>steady && backs>0 ? (backs>1?3:2) : 1;
    for(const h of rows){
      if(h.difficulty && h.difficulty!==bands[band]) continue;
      block.push(h); block=block.slice(-10);
      const distinct=new Set(block.map(r=>normalize(r.word)).filter(Boolean)).size;
      const n=block.length, accuracy=block.reduce((s,r)=>s+(r.correct?((r.attempts||1)>1?0.5:1):0),0)/n;
      const min=band===0?6:8, words=band===0?4:6;
      const qualifies=band<2 && n>=min && distinct>=words && accuracy>=0.85;
      if(qualifies && held+1>=need()){band++;changes++;block=[];held=0;reason='advance';}
      else if(qualifies){held++;block=[];reason='holding';}
      else if(band>0 && n>=6 && distinct>=4 && accuracy<0.45){band--;changes++;backs++;held=0;block=[];reason='step_back';}
      else{
        // The qualifying windows must be consecutive.
        if(held>0 && n>=min && accuracy<0.85)held=0;
        if(reason==='starting')reason='practice';
      }
    }
    const result={difficulty:bands[band],reason,items:block.length,distinctWords:new Set(block.map(r=>normalize(r.word)).filter(Boolean)).size,changes};
    if(!steady)return result;
    const tailAccuracy=block.length?block.reduce((s,r)=>s+(r.correct?((r.attempts||1)>1?0.5:1):0),0)/block.length:1;
    return {...result,support:band===0 && block.length>=6 && tailAccuracy<0.4?'more':'none',windowsHeld:held,windowsNeeded:need()};
  };
  // How many choices a sound-only board shows. 'hard' (or anything else) keeps
  // the board as built; support 'more' is the difficultyDecision signal.
  const choiceLimit = (difficulty, full, support) => {
    const size = Math.max(0, Number(full) || 0);
    if (support === 'more' && difficulty === 'easy') return Math.min(size, 2);
    return difficulty === 'easy' ? Math.min(size, 3) : difficulty === 'medium' ? Math.min(size, 4) : size;
  };
  // 0 = clearly different, higher = easier to confuse.
  const SOUND_NEIGHBOURS = new Set('b d|b p|b v|d t|d g|g k|f v|f th|s z|s sh|s th|m n|n ng|sh ch|j ch|k t|p t|w r|l r|c k|ck k|e i|a e|o u|a u|ee i|a o|oo u'.split('|'));
  const soundCloseness = (a, b) => {
    const x = soundKey(a), y = soundKey(b);
    if (!x || !y) return 0;
    if (x === y) return 3;
    if (SOUND_NEIGHBOURS.has(x + ' ' + y) || SOUND_NEIGHBOURS.has(y + ' ' + x)) return 2;
    return RHYME_VOWELS.has(x) && RHYME_VOWELS.has(y) ? 1 : 0;
  };
  const wordCloseness = (a, b) => {
    const x = normalize(a), y = normalize(b);
    if (!x || !y) return 0;
    const rime = w => (w.match(/[aeiouy][a-z]*$/) || [''])[0], vowel = w => (w.match(/[aeiouy]+/) || [''])[0];
    return (x[0] === y[0] ? 2 : 0) + (rime(x) && rime(x) === rime(y) ? 2 : 0) + (x.slice(-1) === y.slice(-1) ? 1 : 0) + (vowel(x) && vowel(x) === vowel(y) ? 1 : 0);
  };
  // Show fewer choices from a board without rebuilding it: the answer always
  // stays, a second spelling of the answer never does, and the kept choices
  // keep their order. No count (or a count the board already fits): unchanged.
  const trimChoices = ({options, answer, count, difficulty, same, closeness} = {}) => {
    const list = Array.isArray(options) ? [...options] : [];
    const equal = typeof same === 'function' ? same : (a, b) => normalize(a) === normalize(b);
    const at = list.findIndex(option => equal(option, answer));
    if (at < 0 || !Number.isFinite(count) || count < 2) return list;
    const foils = list.map((option, index) => ({option, index})).filter(row => row.index !== at && !equal(row.option, answer));
    if (foils.length === list.length - 1 && list.length <= count) return list;
    const score = row => typeof closeness === 'function' ? Number(closeness(row.option, answer)) || 0 : 0;
    const farFirst = [...foils].sort((a, b) => score(a) - score(b) || a.index - b.index);
    let kept = farFirst.slice(0, count - 1);
    if (difficulty === 'medium' && typeof closeness === 'function' && farFirst.length > count - 1) {
      const nearest = farFirst[farFirst.length - 1];
      if (score(nearest) > 0) kept = [...farFirst.slice(0, count - 2), nearest];
    } else if (difficulty !== 'easy' && difficulty !== 'medium') kept = foils.slice(0, count - 1);
    const keep = new Set([at, ...kept.map(row => row.index)]);
    return list.filter((_, index) => keep.has(index));
  };
  // Number buttons for "how many sounds": easy = the count with two either side
  // (kept inside 1-6 when the count is), medium = 1-8, otherwise null (the full row).
  const countingChoices = (count, difficulty) => {
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 10) return null;
    if (difficulty === 'easy') {
      const top = Math.max(6, n);
      let low = Math.max(1, n - 2), high = Math.min(top, n + 2);
      while (high - low < 2) { if (low > 1) low--; else high++; }
      return Array.from({length: high - low + 1}, (_, i) => low + i);
    }
    if (difficulty === 'medium' && n <= 8) return [1, 2, 3, 4, 5, 6, 7, 8];
    return null;
  };
  // Which sound positions isolation may ask for: easy = first, medium = first
  // or last, otherwise any.
  const isolationPositions = (difficulty, length) => {
    const n = Math.max(1, Math.floor(Number(length)) || 1);
    if (difficulty === 'easy') return [0];
    if (difficulty === 'medium') return n > 1 ? [0, n - 1] : [0];
    return Array.from({length: n}, (_, i) => i);
  };
  const textEvidence = ({activity,imageAvailable,answerRevealed=false}) => {
    const connected=['read_sentence','read_passage'].includes(activity);
    if(!connected)return {};
    const wordMatching=!imageAvailable || answerRevealed;
    return {taskKind:wordMatching?'word_matching':'picture_supported_cloze',cluesShown:wordMatching?['printed_answer']:['picture'],fallbackReason:!imageAvailable?'missing_target_image':answerRevealed?'answer_revealed':null,independentReading:false,answerExposed:wordMatching};
  };
  // Grading for a typed or chosen sound: each alternate spelling maps to ONE
  // canonical form. Self-contained on purpose: the take-home player embeds
  // this exact function, so the app and a downloaded file grade alike.
  function soundAnswerMatches(answer, expected) {
    var EQUIV = { oy: 'oi', au: 'aw', ew: 'oo', oe: 'oa', ai: 'ay', ea: 'ee', ir: 'er', ur: 'er', igh: 'ie', ou: 'ow', ck: 'k', ph: 'f', wr: 'r', kn: 'n' };
    var a = String(answer == null ? '' : answer).toLowerCase().trim();
    var e = String(expected == null ? '' : expected).toLowerCase().trim();
    if (!e) return false;
    return a === e || (EQUIV[a] || a) === (EQUIV[e] || e);
  }
  // Which phoneme-bank recordings can voice a sound label, in the order the
  // player tries them. Mirrors handleAudio's specialMap + phonemeMatches;
  // tests/word_sounds_take_home.test.js pins both tables to the player's.
  const PHONEME_BANK_SPECIAL = {au:'aw','ā':'ay','ē':'ee','ī':'ie','ō':'oa','ū':'oo','ă':'a','ĕ':'e','ĭ':'i','ŏ':'o','ŭ':'u',ae:'ay',ai:'ay',a_e:'ay',ei:'ay',ea:'ee',ey:'ee',e_e:'ee',i_e:'ie',igh:'ie',y:'ee',o_e:'oa',ow:'ow',ew:'oo',u_e:'oo',ue:'oo',ui:'oo','long u':'oo','short u':'u','ə':'schwa',schwa:'schwa'};
  const PHONEME_BANK_MATCHES = {'ā':'ay','ē':'ee','ī':'ie','ō':'oa','ū':'oo','ă':'a','ĕ':'e','ĭ':'i','ŏ':'o','ŭ':'u',kn:'n',wr:'r',gn:'n',mb:'m',gh:'g',qu:'k',igh:'ie',tch:'ch',dge:'j',ai:'ay',a_e:'ay',ae:'ay',ei:'ay',ea:'ee',ey:'ee',e_e:'ee',i_e:'ie',y:'ee',o_e:'oa',ue:'oo',ew:'oo',u_e:'oo',ui:'oo',oi:'oy',au:'aw',ou:'ow',ir:'er',ur:'er',c:'k',q:'k',x:'s',ph:'f',ck:'k',ce:'s',ci:'s',cy:'s',ge:'j',gi:'j',gy:'j','ə':'schwa','ɔɪ':'oy','aʊ':'ow','əʊ':'oa','eɪ':'ay','aɪ':'ie','iː':'ee','uː':'oo','ɑː':'ar','ɔː':'or','ɜː':'er','æ':'a','ɛ':'e','ɪ':'i','ɒ':'o','ʌ':'u','ʊ':'oo','θ':'th','ð':'th','ʃ':'sh','ʒ':'sh','ŋ':'ng','tʃ':'ch','dʒ':'j','ɪə':'ear','eə':'air','ʊə':'oo'};
  const phonemeBankCandidates = text => {
    const lower = String(text == null ? '' : text).toLowerCase();
    let key = lower.trim();
    const out = [];
    if (key.startsWith('short ') && key.length === 7) key = key.replace('short ', '');
    else if (key.endsWith('_short')) { out.push(key); key = key.replace('_short', ''); }
    else if (key.endsWith(' short')) key = key.replace(' short', '');
    const special = PHONEME_BANK_SPECIAL[key] || key;
    out.push(special, lower);
    const match = PHONEME_BANK_MATCHES[lower] || PHONEME_BANK_MATCHES[special];
    if (match) out.push(match);
    return [...new Set(out.filter(Boolean))];
  };
  // A lesson activity's item count is a minimum; this is where it must stop even
  // if the mastery streak never comes. Never below the streak itself, or a
  // one-item plan could not show one.
  const lessonItemCeiling = (count, masteryThreshold) => Math.max((Number(count) || 5) * 2, Number(masteryThreshold) || 3);
  // Adaptive length inside a planned lesson. One rule for when an activity
  // ends; the activity ORDER is never touched here.
  //   below the minimum count        -> continue
  //   at the ceiling                 -> advance (hard stop, always)
  //   mastery rule met (masteryMet)  -> advance
  //   otherwise                      -> continue until one of the two above
  // With adaptive on (difficulty "auto"), a learner who is at or past the
  // minimum with at least PLAN_EXTENSION.minGraded graded items and under
  // PLAN_EXTENSION.lowAccuracy first-try accuracy in THIS activity starts an
  // extension: the extra items are marked, missed words come first and extra
  // support applies. The extension ends on a recovery run (recoveryRun
  // first-try correct in a row, or the plan's streak if that is shorter) or at
  // the ceiling, and an activity is never extended twice.
  const PLAN_EXTENSION = { minGraded: 4, lowAccuracy: 0.5, recoveryRun: 2 };
  const planExtensionDecision = (input = {}) => {
    const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };
    const threshold = Math.max(1, num(input.masteryThreshold, 3) || 3);
    const minCount = Math.max(1, num(input.minCount, 5) || 5);
    const ceiling = Math.max(minCount, num(input.ceiling, 0) || lessonItemCeiling(minCount, threshold));
    const answered = num(input.answered, 0);
    const graded = Math.min(answered, num(input.graded, answered));
    const firstTry = Math.min(graded, num(input.firstTryCorrect, 0));
    const streak = num(input.streak, 0);
    const extended = input.extended === true;
    const masteryMet = typeof input.masteryMet === 'boolean' ? input.masteryMet : answered >= minCount && streak >= threshold;
    const recoveryRun = Math.min(PLAN_EXTENSION.recoveryRun, threshold);
    const out = (action, reason, extra) => ({ action, reason, extending: false, startsExtension: false, minCount, ceiling, recoveryRun, ...extra });
    if (answered >= ceiling) return out('advance', extended ? 'ceiling_no_recovery' : 'ceiling');
    if (answered < minCount) return out('continue', 'below_minimum');
    if (masteryMet) return out('advance', 'mastery');
    if (extended) return streak >= recoveryRun ? out('advance', 'recovered') : out('continue', 'extending', { extending: true });
    const struggling = input.adaptive === true && input.alreadyExtended !== true &&
      graded >= PLAN_EXTENSION.minGraded && firstTry / graded < PLAN_EXTENSION.lowAccuracy && streak < recoveryRun;
    return struggling ? out('continue', 'extend', { extending: true, startsExtension: true }) : out('continue', 'awaiting_streak');
  };
  // Progress keys are SOUNDS, the same label the learner sees, for both legacy
  // strings and prepared pronunciation objects: c as /k/ and c as /s/ stay apart,
  // and c, k and ck as /k/ stay together. One response counts once per label.
  const phonemeLabels = (phonemes, isEnglish = true) => [...new Set((Array.isArray(phonemes) ? phonemes : []).map(value => {
    const label = phonemeLabel(value, isEnglish);
    return typeof label === 'string' && !/^\[object /i.test(label.trim()) ? label : '';
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
  // Machine-vetted; accepted by the owner 2026-11-10 (see compounds_review.md).
  // Two-part compounds added to the 64 above. Each part is a common one-syllable
  // word that sounds the same alone as in the compound (CMUdict: whole = part 1 +
  // part 2) and has its own clip in word_audio_kokoro_bank.json, like every part
  // of the 64. syllableWords() stays the 64: the audio-bank build and tests use it.
  const SYLLABLE_COMPOUNDS_VETTED = {
    moonlight: ['moon', 'light'], daylight: ['day', 'light'], starlight: ['star', 'light'],
    spotlight: ['spot', 'light'], headlight: ['head', 'light'], lighthouse: ['light', 'house'],
    greenhouse: ['green', 'house'], henhouse: ['hen', 'house'], doorway: ['door', 'way'],
    hallway: ['hall', 'way'], driveway: ['drive', 'way'], walkway: ['walk', 'way'],
    doorstep: ['door', 'step'], footstep: ['foot', 'step'], daytime: ['day', 'time'],
    nighttime: ['night', 'time'], goodnight: ['good', 'night'], hillside: ['hill', 'side'],
    hilltop: ['hill', 'top'], treetop: ['tree', 'top'], laptop: ['lap', 'top'],
    downhill: ['down', 'hill'], sundown: ['sun', 'down'], sunbeam: ['sun', 'beam'],
    sunburn: ['sun', 'burn'], bedside: ['bed', 'side'], seaside: ['sea', 'side'],
    sidewalk: ['side', 'walk'], rainfall: ['rain', 'fall'], snowfall: ['snow', 'fall'],
    seesaw: ['see', 'saw'], horseback: ['horse', 'back'], drawbridge: ['draw', 'bridge'],
    playmate: ['play', 'mate'], bookcase: ['book', 'case'], shellfish: ['shell', 'fish'],
    catfish: ['cat', 'fish'], cheesecake: ['cheese', 'cake'], homemade: ['home', 'made'],
    shortcut: ['short', 'cut'],
  };
  const compoundParts = word => Object.prototype.hasOwnProperty.call(SYLLABLE_COMPOUNDS, word) ? SYLLABLE_COMPOUNDS[word]
    : Object.prototype.hasOwnProperty.call(SYLLABLE_COMPOUNDS_VETTED, word) ? SYLLABLE_COMPOUNDS_VETTED[word] : null;
  // The ready-made "Compound words" list: the 64 first, then the vetted additions.
  const compoundWords = () => [...syllableWords(), ...Object.keys(SYLLABLE_COMPOUNDS_VETTED)];
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
  // The hint words as a ready-made list for Syllable Claps, mixed so the first ten cover 2, 3 and 4+ syllables.
  const longerSyllableWords = () => {
    const bySize = new Map();
    Object.keys(SYLLABLE_RECORDING_HINTS).forEach(word => { const size = Math.min(4, SYLLABLE_RECORDING_HINTS[word].length); bySize.set(size, [...(bySize.get(size) || []), word]); });
    const rows = [...bySize.keys()].sort((a, b) => a - b).map(size => bySize.get(size)), out = [];
    for (let i = 0; rows.some(row => i < row.length); i++) rows.forEach(row => { if (i < row.length) out.push(row[i]); });
    return out;
  };
  // Ready-made word lists for the setup picker. The preset objects (name -> words) come from allo_data.
  // A list id is stable: 'family:<preset name>', 'sight:<preset name>', 'compound', 'longer'.
  const READY_LIST_FIRST = 10;
  const SIGHT_LIST_LABELS = {
    'Pre-K (Dolch)': ['word_sounds.list_dolch_prek', 'Dolch Pre-K'], 'Kindergarten (Dolch)': ['word_sounds.list_dolch_k', 'Dolch Kindergarten'],
    '1st Grade (Dolch)': ['word_sounds.list_dolch_1', 'Dolch 1st Grade'], '2nd Grade (Dolch)': ['word_sounds.list_dolch_2', 'Dolch 2nd Grade'],
    '3rd Grade (Dolch)': ['word_sounds.list_dolch_3', 'Dolch 3rd Grade'],
    // These two presets hold 50 words each (Fry 1-50 and 51-100), whatever their preset names say.
    'Fry First 100': ['word_sounds.list_fry_1_50', 'Fry words 1 to 50'], 'Fry Second 100': ['word_sounds.list_fry_51_100', 'Fry words 51 to 100'],
  };
  const readyMadeListGroups = (input = {}) => {
    const words = list => { const seen = new Set(); return (Array.isArray(list) ? list : []).map(word => String(word || '').trim()).filter(word => { const key = word.toLocaleLowerCase(); return word && !seen.has(key) && !!seen.add(key); }); };
    const families = input.families || {}, sight = input.sightWords || {};
    const groups = { rhyme: [], digraph: [], blend: [], sight: [], syllable: [] };
    Object.keys(families).forEach(name => {
      const pattern = (name.match(/\(([^)]+)\)\s*$/) || [])[1] || '', lead = name.replace(/\s*\([^)]*\)\s*$/, '');
      const kind = /^digraph\b/i.test(name) ? 'digraph' : /^blend\b/i.test(name) ? 'blend' : 'rhyme';
      const label = !pattern ? name : kind === 'rhyme' ? pattern + ' (' + lead.toLowerCase() + ')' : pattern;
      groups[kind].push({ id: 'family:' + name, label, words: words(families[name]), filterBySyllables: true });
    });
    Object.keys(sight).forEach(name => {
      const known = Object.prototype.hasOwnProperty.call(SIGHT_LIST_LABELS, name) ? SIGHT_LIST_LABELS[name] : null;
      groups.sight.push({ id: 'sight:' + name, label: known ? known[1] : name, ...(known ? { labelKey: known[0] } : {}), words: words(sight[name]), filterBySyllables: false });
    });
    if (isSyllableLanguageSupported(input.language)) {
      groups.syllable.push({ id: 'compound', labelKey: 'word_sounds.list_compound', label: 'Compound words (for {activity})', activity: 'syllable_blending', words: compoundWords(), filterBySyllables: true });
      groups.syllable.push({ id: 'longer', labelKey: 'word_sounds.list_longer', label: 'Longer words (for {activity})', activity: 'syllable_counting', words: longerSyllableWords(), filterBySyllables: true });
    }
    return [
      { id: 'rhyme', labelKey: 'word_sounds.list_group_rhyme', label: 'Rhyming families', lists: groups.rhyme },
      { id: 'digraph', labelKey: 'word_sounds.list_group_digraph', label: 'Digraphs', lists: groups.digraph },
      { id: 'blend', labelKey: 'word_sounds.list_group_blend', label: 'Blends', lists: groups.blend },
      { id: 'sight', labelKey: 'word_sounds.list_group_sight', label: 'Sight words', lists: groups.sight },
      { id: 'syllable', labelKey: 'word_sounds.list_group_syllable', label: 'Compound and longer words', lists: groups.syllable },
    ].filter(group => group.lists.length);
  };
  // A setup draft saved before the picker: the two bank flags, one family and one sight list.
  const readyListIdsFromDraft = draft => {
    if (Array.isArray(draft?.readyLists)) return [...new Set(draft.readyLists.filter(id => typeof id === 'string' && id))];
    const ids = [];
    if (draft?.includeSyllableWords || draft?.includeSyllableCountWords) ids.push('compound');
    if (draft?.includeSyllableCountWords) ids.push('longer');
    if (draft?.includeFamily && draft.selectedFamily) ids.push('family:' + draft.selectedFamily);
    if (draft?.includeSightWords && draft.selectedSightWordList) ids.push('sight:' + draft.selectedSightWordList);
    return ids;
  };
  // Which preview words start ticked. sources: [{ words, first }] where first = how many of that source's words
  // start ticked (left out = all of them). cap limits the total (a new assessment). Returns preview spellings.
  const foldWord = word => String(word || '').trim().toLocaleLowerCase();
  // One entry per (source, word) that the source ticks by itself: 'sourceId\u0000word'.
  const defaultTickOffers = sources => {
    const offers = [];
    (sources || []).forEach((source, index) => {
      const seen = new Set(), id = source?.id == null ? String(index) : String(source.id);
      (source?.words || []).forEach(word => { const key = foldWord(word); if (!key || seen.has(key)) return; if (source.first == null || seen.size < source.first) offers.push(id + '\u0000' + key); seen.add(key); });
    });
    return offers;
  };
  const defaultTickedWords = (previewWords, sources, cap) => {
    const want = new Set(defaultTickOffers(sources).map(offer => offer.slice(offer.indexOf('\u0000') + 1))), out = [];
    (previewWords || []).forEach(word => { if (want.has(foldWord(word)) && (cap == null || out.length < cap)) out.push(word); });
    return out;
  };
  // After a source change the teacher's own ticks stay. Words a source newly offers join (up to cap, when there
  // is one); words no longer in the preview leave. A word the teacher unticked stays out unless a source newly offers it.
  const mergeTickedWords = (selected, previewWords, previousOffers, nextOffers, cap) => {
    const spelling = new Map(); (previewWords || []).forEach(word => { if (!spelling.has(foldWord(word))) spelling.set(foldWord(word), word); });
    const before = new Set(previousOffers || []), next = new Set();
    [...(selected || [])].forEach(word => { if (spelling.has(foldWord(word))) next.add(spelling.get(foldWord(word))); });
    (nextOffers || []).forEach(offer => {
      const key = offer.slice(offer.indexOf('\u0000') + 1);
      if (!before.has(offer) && spelling.has(key) && (cap == null || next.size < cap)) next.add(spelling.get(key));
    });
    return next;
  };
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
      syllables: [], audioUnits: [], reason: 'Use a syllable bank word or add and review recordings for each syllable in Word Sounds.' });
    if (prepared?.contentStatus === 'teacher_recorded') {
      if (reviewedSyllableReady(prepared) && prepared.targetWord === targetWord && prepared.version === 2 && prepared.language === 'en') {
        return { ...needsRecording(), reason: 'recording_locale_review_required', recoverable: true };
      }
      if (reviewedSyllableReady(prepared) && prepared.targetWord === targetWord && packAudioLanguageKey(prepared.language) === packAudioLanguageKey(language || 'en')) {
        return { ...prepared, syllables: [...prepared.syllables], audioUnits: prepared.audioUnits.map(unit => ({ ...unit, asset: { ...unit.asset } })) };
      }
      return { ...needsRecording(), ...(reviewedSyllableReady(prepared) && prepared.targetWord === targetWord ? { reason: 'recording_locale_review_required', recoverable: true } : {}) };
    }
    const parts = isSyllableLanguageSupported(language) && compoundParts(targetWord);
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
      // No saved clip is not a failure. _ttsFailed means a live attempt on this
      // device failed, and only the player sets it; a saved clip clears it.
      if (copy.ttsReady) copy._ttsFailed = false;
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
  // BEGIN SYLLABLE ACTIVITY WORDS
  // Syllable Blending and Syllable Claps never block a lesson. Each uses the lesson
  // words it can play. With too few, built-in words are added for that activity
  // only: such an item carries _wsOnlyFor (a list of activity ids) and belongs to
  // no other activity, printout or word count.
  const SYLLABLE_ACTIVITY_IDS = ['syllable_blending', 'syllable_counting'];
  const SYLLABLE_PLAN_DEFAULT_COUNT = 5;
  const packItemWord = item => String(item && (item.targetWord || item.word || item.term) || '');
  const itemOnlyFor = item => {
    const only = item && typeof item === 'object' && Array.isArray(item._wsOnlyFor) ? item._wsOnlyFor.filter(id => typeof id === 'string' && id) : [];
    return only.length ? only : null;
  };
  const isTopUpItem = item => !!itemOnlyFor(item);
  const lessonOwnItems = words => (Array.isArray(words) ? words : []).filter(item => !isTopUpItem(item));
  const topUpItems = (words, activity) => (Array.isArray(words) ? words : []).filter(item => {
    const only = itemOnlyFor(item);
    return !!only && (!activity || only.includes(activity));
  });
  // A prepared item's own board decides whether a syllable activity can play it.
  const syllableItemPlayable = (item, activity, language) => {
    const word = packItemWord(item), boards = item && item.activityItems || {};
    if (activity === 'syllable_blending') {
      const board = boards.syllable_blending;
      return !!board && packAudioKey(board.targetWord) === packAudioKey(word) && validSyllableBoard(board) &&
        resolveSyllableTask(word, board, language || board.language).supported;
    }
    if (activity === 'syllable_counting') {
      const board = boards.syllable_counting;
      return !!board && resolveSyllableCount(word, { language: language || board.language, prepared: board, recordedTask: boards.syllable_blending }).supported;
    }
    return true;
  };
  const packItemPlaysIn = (item, activity, language) => {
    if (!item || typeof item !== 'object') return true;
    const only = itemOnlyFor(item);
    if (only && !only.includes(activity)) return false;
    return !SYLLABLE_ACTIVITY_IDS.includes(activity) || syllableItemPlayable(item, activity, language);
  };
  // The items one activity uses. A syllable activity with nothing playable (a lesson
  // saved before this rule) keeps the lesson's own words, as it did then.
  const wordsForActivity = (words, activity, language) => {
    const list = (Array.isArray(words) ? words : []).filter(item => item && typeof item === 'object');
    const used = list.filter(item => packItemPlaysIn(item, activity, language));
    return used.length || !SYLLABLE_ACTIVITY_IDS.includes(activity) ? used : lessonOwnItems(list);
  };
  const syllableActivityHasWords = (words, activity, language) =>
    (Array.isArray(words) ? words : []).some(item => item && typeof item === 'object' && packItemPlaysIn(item, activity, language));
  const planWordKey = word => normalize(word);
  const topUpSeed = (words, activity) => {
    const text = String(activity) + '|' + [...new Set(words.map(planWordKey))].sort().join('|');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return hash >>> 0;
  };
  const seededOrder = (values, seed) => {
    let state = (seed >>> 0) || 1;
    return values.map((value, index) => { state = (Math.imul(state, 1103515245) + 12345) >>> 0; return [state >>> 8, index, value]; })
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(row => row[2]);
  };
  // One-syllable built-in words for Syllable Claps: the parts of the compounds.
  const compoundPartWords = () => [...new Set(compoundWords().flatMap(word => compoundParts(word)))];
  // What one syllable activity will run with: the lesson words it can use, the ones it
  // cannot, and the built-in words added to reach the item count. The same lesson word
  // list always gives the same added words. One-syllable words are fine for Syllable
  // Claps (clap once); Syllable Blending needs two or more recorded parts.
  const syllableActivityPlan = (input = {}) => {
    const activity = input.activity, language = input.language;
    const seen = new Set();
    const words = (Array.isArray(input.words) ? input.words : []).map(word => String(word || '').trim())
      .filter(word => { const key = planWordKey(word); return key && !seen.has(key) && !!seen.add(key); });
    const needed = Math.max(1, Math.min(20, Math.floor(Number(input.count)) || SYLLABLE_PLAN_DEFAULT_COUNT));
    const blending = activity === 'syllable_blending';
    const isEligible = typeof input.isEligible === 'function' ? input.isEligible
      : blending ? word => resolveSyllableTask(word, null, language).supported
      : word => resolveSyllableCount(word, { language }).supported;
    const countOf = typeof input.countOf === 'function' ? input.countOf : word => resolveSyllableCount(word, { language }).count;
    const eligible = [], unused = [];
    words.forEach(word => { let ok = false; try { ok = !!isEligible(word); } catch (_) { ok = false; } (ok ? eligible : unused).push(word); });
    const builtIn = SYLLABLE_ACTIVITY_IDS.includes(activity) && isSyllableLanguageSupported(language);
    const shortfall = Math.max(0, needed - eligible.length);
    const topUp = [];
    if (shortfall && builtIn && input.topUp !== false) {
      const seed = topUpSeed(words, activity);
      // A built-in word joins Syllable Claps only when its count is settled (the dictionary may not have loaded).
      const canTopUp = typeof input.canTopUp === 'function' ? input.canTopUp : blending ? () => true : word => resolveSyllableCount(word, { language }).supported;
      const free = list => list.filter(word => { if (seen.has(word)) return false; try { return !!canTopUp(word); } catch (_) { return false; } });
      if (blending) {
        // A compound built on a lesson word comes first (cat: catfish); the rest follow in seeded order,
        // compounds that repeat a part already in the activity last.
        const pool = free(compoundWords());
        const related = pool.filter(word => compoundParts(word).some(part => seen.has(part)));
        const ordered = [...related, ...seededOrder(pool.filter(word => !related.includes(word)), seed)];
        const usedParts = new Set(eligible.flatMap(word => compoundParts(planWordKey(word)) || []));
        const fresh = [], repeats = [];
        ordered.forEach(word => {
          const parts = compoundParts(word);
          if (parts.some(part => usedParts.has(part))) repeats.push(word);
          else { fresh.push(word); parts.forEach(part => usedParts.add(part)); }
        });
        topUp.push(...[...fresh, ...repeats].slice(0, shortfall));
      } else {
        // Mix one, two and three-or-more claps: add from whichever the activity has least of.
        const longer = longerSyllableWords();
        const buckets = {
          1: seededOrder(free(compoundPartWords()), seed + 1),
          2: seededOrder(free([...longer.filter(word => SYLLABLE_RECORDING_HINTS[word].length === 2), ...compoundWords()]), seed + 2),
          3: seededOrder(free(longer.filter(word => SYLLABLE_RECORDING_HINTS[word].length >= 3)), seed + 3),
        };
        const tally = { 1: 0, 2: 0, 3: 0 };
        eligible.forEach(word => { let count = 0; try { count = Number(countOf(word)) || 0; } catch (_) { count = 0; } if (count >= 1) tally[Math.min(3, count)] += 1; });
        while (topUp.length < shortfall) {
          const open = [2, 3, 1].filter(size => buckets[size].length);
          if (!open.length) break;
          const size = open.reduce((best, next) => tally[next] < tally[best] ? next : best, open[0]);
          topUp.push(buckets[size].shift());
          tally[size] += 1;
        }
      }
    }
    return { activity, needed, eligible, unused, topUp, shortfall, builtIn, topUpOff: input.topUp === false,
      skipped: eligible.length + topUp.length === 0 };
  };
  // END SYLLABLE ACTIVITY WORDS
  // BEGIN ACTIVITY NAMES AND SKILL STRANDS
  // One name per activity (the player's), one grouping (six strands, teaching order),
  // a Big 5 tag and a one-line skill. English here is the fallback; translate() is
  // the caller's (key, fallback) lookup.
  const SKILL_STRANDS = [
    { key: 'syllables_rhyme', name: 'Syllables and rhyme', big5: ['phonological_awareness'] },
    { key: 'hearing_sounds', name: 'Hearing sounds', big5: ['phonemic_awareness'] },
    { key: 'letters_sounds', name: 'Letters and sounds', big5: ['phonics'] },
    { key: 'spelling', name: 'Spelling', big5: ['phonics'] },
    { key: 'reading_words', name: 'Reading words', big5: ['phonics'] },
    { key: 'reading_sentences', name: 'Reading sentences', big5: ['comprehension'] },
  ];
  const BIG5_NAMES = { phonological_awareness: 'phonological awareness', phonemic_awareness: 'phonemic awareness', phonics: 'phonics', fluency: 'fluency', vocabulary: 'vocabulary', comprehension: 'comprehension' };
  const ACTIVITY_SKILLS = {
    rhyming: { name: 'Rhyme Time', strand: 'syllables_rhyme', big5: ['phonological_awareness'], skill: 'Hearing which words rhyme' },
    syllable_counting: { name: 'Syllable Claps', strand: 'syllables_rhyme', big5: ['phonological_awareness'], skill: 'Counting the syllables in a spoken word' },
    syllable_blending: { name: 'Syllable Blending', strand: 'syllables_rhyme', big5: ['phonological_awareness'], skill: 'Blending syllables into a word' },
    word_families: { name: 'Word Families', strand: 'syllables_rhyme', big5: ['phonological_awareness'], skill: 'Hearing which words share the same ending' },
    isolation: { name: 'Find Sounds', strand: 'hearing_sounds', big5: ['phonemic_awareness'], skill: 'Finding the first, middle or last sound in a word' },
    sound_sort: { name: 'Sound Sort', strand: 'hearing_sounds', big5: ['phonemic_awareness'], skill: 'Sorting words by their first or last sound' },
    blending: { name: 'Blend Sounds', strand: 'hearing_sounds', big5: ['phonemic_awareness'], skill: 'Blending separate sounds into a word' },
    segmentation: { name: 'Break it Down', strand: 'hearing_sounds', big5: ['phonemic_awareness'], skill: 'Breaking a word into its separate sounds' },
    counting: { name: 'Sound Counting', strand: 'hearing_sounds', big5: ['phonemic_awareness'], skill: 'Counting the sounds in a spoken word' },
    manipulation: { name: 'Sound Swap', strand: 'hearing_sounds', big5: ['phonemic_awareness'], skill: 'Taking away or changing one sound to make a new word' },
    mapping: { name: 'Sound Mapping', strand: 'letters_sounds', big5: ['phonics'], skill: 'Matching each sound in a word to the letters that spell it' },
    letter_tracing: { name: 'Letter Trace', strand: 'letters_sounds', big5: ['phonics'], skill: 'Forming the first letter of a word' },
    missing_letter: { name: 'Missing Letter', strand: 'spelling', big5: ['phonics'], skill: 'Choosing the missing letter in a word' },
    orthography: { name: 'Sight & Spell', strand: 'spelling', big5: ['phonics'], skill: 'Spelling a word you hear with letter tiles' },
    word_scramble: { name: 'Word Scramble', strand: 'spelling', big5: ['phonics'], skill: 'Putting mixed-up letters in order to spell a word' },
    spelling_bee: { name: 'Spelling Bee', strand: 'spelling', big5: ['phonics'], skill: 'Spelling a word you hear' },
    decoding: { name: 'Read & Match', strand: 'reading_words', big5: ['phonics'], skill: 'Reading a word and matching it to its picture' },
    read_sentence: { name: 'Finish the Sentence', strand: 'reading_sentences', big5: ['comprehension'], skill: 'Reading a sentence and choosing the word that finishes it' },
    sentence_match: { name: 'Picture the Sentence', strand: 'reading_sentences', big5: ['comprehension'], skill: 'Reading a sentence and showing what it says with pictures' },
    read_passage: { name: 'Read the Story', strand: 'reading_sentences', big5: ['comprehension'], skill: 'Reading a short story and choosing the word that finishes it' },
  };
  const skillLookup = (translate, key, fallback) => {
    let found = '';
    try { found = typeof translate === 'function' ? translate(key, fallback) : ''; } catch (_) { found = ''; }
    return typeof found === 'string' && found && found !== key ? found : fallback;
  };
  const activityIds = () => Object.keys(ACTIVITY_SKILLS);
  const activityEnglishName = (id) => {
    const row = ACTIVITY_SKILLS[id];
    if (row) return row.name;
    const plain = String(id || '').replace(/_/g, ' ').trim();
    return plain ? plain.charAt(0).toUpperCase() + plain.slice(1) : '';
  };
  const activityLabel = (id, translate) => ACTIVITY_SKILLS[id] ? skillLookup(translate, 'word_sounds.activity_' + id, ACTIVITY_SKILLS[id].name) : activityEnglishName(id);
  const activitySkillLabel = (id, translate) => ACTIVITY_SKILLS[id] ? skillLookup(translate, 'word_sounds.skill_' + id, ACTIVITY_SKILLS[id].skill) : '';
  const activityStrand = (id) => ACTIVITY_SKILLS[id] ? ACTIVITY_SKILLS[id].strand : '';
  const activityBig5 = (id) => ACTIVITY_SKILLS[id] ? ACTIVITY_SKILLS[id].big5.slice() : [];
  const strandOrder = () => SKILL_STRANDS.map(row => row.key);
  const strandRow = (key) => SKILL_STRANDS.find(row => row.key === key) || null;
  const strandLabel = (key, translate) => strandRow(key) ? skillLookup(translate, 'word_sounds.strand_' + key, strandRow(key).name) : '';
  const big5Label = (key, translate) => BIG5_NAMES[key] ? skillLookup(translate, 'word_sounds.big5_' + key, BIG5_NAMES[key]) : '';
  const strandBig5 = (key) => strandRow(key) ? strandRow(key).big5.slice() : [];
  const strandBig5Label = (key, translate) => strandBig5(key).map(tag => big5Label(tag, translate)).join(', ');
  // Ids keep their given order inside each strand; unknown ids come last under ''.
  const groupActivitiesByStrand = (ids) => {
    const list = (Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string');
    const groups = SKILL_STRANDS.map(row => ({ strand: row.key, ids: list.filter(id => activityStrand(id) === row.key) }));
    const rest = list.filter(id => !activityStrand(id));
    if (rest.length) groups.push({ strand: '', ids: rest });
    return groups.filter(group => group.ids.length);
  };
  // END ACTIVITY NAMES AND SKILL STRANDS
  // BEGIN LESSON STARTING POINTS
  // A lesson always has a plan. A starting point is plain data that fills it: activities in
  // running order with a weight each (the share of the lesson's items), and the streak that
  // ends an activity early. Lesson length turns the weights into item counts.
  const LESSON_STARTING_POINTS = [
    { id: 'hearing_sounds', name: 'Hearing sounds', mastery: 2, activities: [['rhyming', 3], ['syllable_counting', 3], ['syllable_blending', 3], ['isolation', 3]] },
    { id: 'first_sounds_letters', name: 'First sounds and letters', mastery: 3, activities: [['isolation', 4], ['sound_sort', 3], ['blending', 3], ['letter_tracing', 3]] },
    { id: 'cvc', name: 'CVC blending and spelling', mastery: 3, activities: [['blending', 4], ['segmentation', 4], ['mapping', 4], ['spelling_bee', 3], ['decoding', 4]] },
    { id: 'digraphs_blends', name: 'Digraphs and blends', mastery: 3, activities: [['isolation', 3], ['sound_sort', 4], ['blending', 4], ['mapping', 4], ['missing_letter', 3], ['spelling_bee', 3]] },
    { id: 'syllables', name: 'Syllables', mastery: 3, activities: [['syllable_counting', 5], ['syllable_blending', 5], ['spelling_bee', 3]] },
    { id: 'reading', name: 'Reading words and sentences', mastery: 3, activities: [['decoding', 4], ['read_sentence', 4], ['sentence_match', 3], ['read_passage', 2]] },
  ];
  // Half a minute an item (the app's own figure): 10, 20 and 30 items.
  const LESSON_LENGTHS = { short: { items: 10, minutes: 5 }, regular: { items: 20, minutes: 10 }, long: { items: 30, minutes: 15 } };
  const LESSON_LENGTH_DEFAULT = 'regular';
  const LESSON_COUNT_MAX = 20;
  const startingPointRow = id => LESSON_STARTING_POINTS.find(row => row.id === id) || null;
  const startingPoints = () => LESSON_STARTING_POINTS.map(row => ({ id: row.id, name: row.name, mastery: row.mastery, activities: row.activities.map(([activity, weight]) => ({ id: activity, weight })) }));
  const startingPointLabel = (id, translate) => startingPointRow(id) ? skillLookup(translate, 'word_sounds.starting_point_' + id, startingPointRow(id).name) : '';
  const planEntries = entries => (Array.isArray(entries) ? entries : []).filter(entry => entry && typeof entry.id === 'string')
    .map(entry => ({ id: entry.id, count: Math.max(1, Math.round(Number(entry.count != null ? entry.count : entry.weight)) || 1) }));
  const lessonPlanItems = entries => planEntries(entries).reduce((sum, entry) => sum + entry.count, 0);
  const lessonPlanMinutes = entries => Math.ceil(lessonPlanItems(entries) * 0.5);
  // Shares the length's items between the activities in proportion to their current counts:
  // every activity keeps at least one item and none passes 20. Largest remainders first, so the
  // total is exact whenever the plan can hold it.
  const scaleLessonCounts = (entries, length) => {
    const rows = planEntries(entries), target = LESSON_LENGTHS[length] ? LESSON_LENGTHS[length].items : 0;
    if (!rows.length || !target) return rows;
    const weight = rows.reduce((sum, row) => sum + row.count, 0);
    const exact = rows.map(row => row.count / weight * target);
    const counts = exact.map(value => Math.min(LESSON_COUNT_MAX, Math.max(1, Math.floor(value))));
    let left = target - counts.reduce((sum, count) => sum + count, 0);
    const byRemainder = exact.map((value, index) => ({ index, part: value - Math.floor(value) })).sort((a, b) => b.part - a.part || a.index - b.index);
    for (let turn = 0; left > 0 && turn < rows.length * LESSON_COUNT_MAX; turn++) {
      const at = byRemainder[turn % rows.length].index;
      if (counts[at] < LESSON_COUNT_MAX) { counts[at]++; left--; }
      else if (counts.every(count => count >= LESSON_COUNT_MAX)) break;
    }
    return rows.map((row, index) => ({ id: row.id, count: counts[index] }));
  };
  const lessonLengthOf = entries => {
    const items = lessonPlanItems(entries);
    return Object.keys(LESSON_LENGTHS).find(key => LESSON_LENGTHS[key].items === items) || 'custom';
  };
  // The plan a starting point gives: its activities in order, minus any that cannot run here.
  const startingPointPlan = (id, options = {}) => {
    const row = startingPointRow(id);
    if (!row) return null;
    const unavailable = Array.isArray(options.unavailable) ? options.unavailable : [];
    const kept = row.activities.filter(([activity]) => !unavailable.includes(activity));
    const length = LESSON_LENGTHS[options.length] ? options.length : LESSON_LENGTH_DEFAULT;
    const activities = scaleLessonCounts(kept.map(([activity, weight]) => ({ id: activity, count: weight })), length);
    return { id: row.id, length, masteryThreshold: row.mastery, activities, order: activities.map(activity => activity.id),
      dropped: row.activities.map(([activity]) => activity).filter(activity => unavailable.includes(activity)) };
  };
  // A saved plan with exactly a starting point's activities, in its order, is that starting point.
  const matchStartingPoint = activityIdList => {
    const ids = (Array.isArray(activityIdList) ? activityIdList : []).join(',');
    const row = ids ? LESSON_STARTING_POINTS.find(candidate => candidate.activities.map(([activity]) => activity).join(',') === ids) : null;
    return row ? row.id : '';
  };
  // The player's language gate, as data, so setup offers only what the player will run.
  const NON_LETTER_TILE_LANGUAGES = ['ar', 'he', 'fa', 'prs', 'ur', 'ps', 'sd', 'ug', 'dv', 'hi', 'bn', 'mr', 'ne', 'gu', 'pa', 'ta', 'te', 'kn', 'ml', 'si', 'as', 'or',
    'th', 'lo', 'km', 'my', 'bo', 'dz', 'zh', 'cmn', 'yue', 'ja', 'ko', 'am', 'ti'];
  const RTL_LANGUAGES = ['ar', 'he', 'fa', 'prs', 'ur', 'ps', 'sd', 'ug', 'dv', 'ku'];
  const ENGLISH_ONLY_ACTIVITIES = ['sound_sort', 'word_families', 'letter_tracing', 'read_sentence', 'read_passage', 'sentence_match'];
  const LETTER_TILE_ACTIVITIES = ['orthography', 'spelling_bee', 'word_scramble', 'missing_letter'];
  const activityRunsInLanguage = (id, language) => {
    if (!language || String(language).toLowerCase().indexOf('en') === 0) return true;
    const primary = String(language).toLowerCase().split(/[-_]/)[0];
    if (ENGLISH_ONLY_ACTIVITIES.includes(id)) return false;
    if (LETTER_TILE_ACTIVITIES.includes(id)) return !NON_LETTER_TILE_LANGUAGES.includes(primary);
    if (id === 'mapping') return !NON_LETTER_TILE_LANGUAGES.includes(primary) && !RTL_LANGUAGES.includes(primary);
    return true;
  };
  // What an activity cannot run without. Pictures: the word's picture is the answer.
  // Sentences: the item is a written sentence or story.
  const ACTIVITY_NEEDS = { pictures: ['decoding', 'sentence_match'], sentences: ['read_sentence', 'read_passage', 'sentence_match'] };
  // '' when the activity can run; otherwise the first thing in its way.
  const activityBlockedBy = (id, env = {}) => !activityRunsInLanguage(id, env.language) ? 'language'
    : env.pictures === false && ACTIVITY_NEEDS.pictures.includes(id) ? 'pictures'
      : env.sentences === false && ACTIVITY_NEEDS.sentences.includes(id) ? 'sentences' : '';
  // A starting point that would lose more than half of its activities is not offered.
  const startingPointStatus = (id, env = {}) => {
    const row = startingPointRow(id);
    if (!row) return { id, dropped: [], disabled: true, reason: '' };
    const dropped = row.activities.map(([activity]) => ({ id: activity, reason: activityBlockedBy(activity, env) })).filter(entry => entry.reason);
    const disabled = dropped.length * 2 > row.activities.length;
    return { id, dropped, disabled, reason: dropped.some(entry => entry.reason === 'language') ? 'language' : dropped.length ? dropped[0].reason : '' };
  };
  const SPELLED_DIGRAPH = /(?:sh|ch|th|wh|ph|ck|ng|qu)/;
  const SPELLED_BLEND = /^(?:[bcfgps]l|[bcdfgpt]r|s[cklmnptw]|tw|s[cp]r|str|spl)|(?:[lmn][dkpt]|s[kpt]|ft|ct|pt|nch)$/;
  const roughSyllables = word => {
    const text = String(word).toLowerCase(), groups = text.replace(/e$/, '').match(/[aeiouy]+/g);
    return Math.max(1, (groups ? groups.length : 1) + (/[^aeiouy]le$/.test(text) ? 1 : 0));
  };
  // The starting point offered before the teacher chooses one. In order:
  //  1. no words                                              -> Hearing sounds
  //  2. not English (the spelling rules below are English)    -> Hearing sounds
  //  3. at least 8 in 10 words are on a sight-word list       -> Reading words and sentences
  //  4. at least 6 in 10 words have two or more syllables     -> Syllables
  //  5. at least half the words have a digraph or a blend     -> Digraphs and blends
  //  6. at least 6 in 10 are one syllable, up to 4 letters    -> CVC blending and spelling
  //  7. anything else                                         -> Hearing sounds
  // A starting point that is not offered here (isOffered) is passed over.
  const suggestStartingPoint = (words, options = {}) => {
    const list = [...new Set((Array.isArray(words) ? words : []).map(word => foldWord(word)).filter(word => /\p{L}/u.test(word)))];
    const offered = id => typeof options.isOffered !== 'function' || !!options.isOffered(id);
    const fallback = rule => ({ id: 'hearing_sounds', rule });
    if (!list.length) return fallback('no_words');
    if (!isSyllableLanguageSupported(options.language)) return fallback('language');
    const share = test => list.filter(test).length / list.length;
    const sight = new Set((Array.isArray(options.sightWords) ? options.sightWords : []).map(word => foldWord(word)));
    const countOf = word => { const known = typeof options.countOf === 'function' ? Number(options.countOf(word)) : 0; return validSyllableCount(known) ? known : roughSyllables(word); };
    if (sight.size && share(word => sight.has(word)) >= 0.8 && offered('reading')) return { id: 'reading', rule: 'sight_words' };
    if (share(word => countOf(word) >= 2) >= 0.6 && offered('syllables')) return { id: 'syllables', rule: 'long_words' };
    if (share(word => SPELLED_DIGRAPH.test(word) || SPELLED_BLEND.test(word)) >= 0.5 && offered('digraphs_blends')) return { id: 'digraphs_blends', rule: 'digraphs_blends' };
    if (share(word => countOf(word) === 1 && word.length <= 4) >= 0.6 && offered('cvc')) return { id: 'cvc', rule: 'short_words' };
    return fallback('other');
  };
  // END LESSON STARTING POINTS
  // BEGIN WORD SOUNDS SOUND DICTIONARY
  // Sounds, spellings and answer choices for a word without an AI call.
  // Dictionary phones (CMUdict, General American) become the app's sound
  // labels under Orton-Gillingham conventions. Where programmes differ, the
  // choice is a named setting in OG_CONVENTIONS. dev-tools/
  // build_word_sounds_phonemes.cjs runs arpabetEntry over the vendored
  // dictionary; the app reads the result through dictionarySounds.
  const OG_CONVENTIONS = Object.freeze({
    dialect: 'General American (CMUdict)',
    // Glued sounds: separate sounds for audio, recorded as one unit for boxing.
    welded: Object.freeze(['ang', 'ing', 'ong', 'ung', 'ank', 'ink', 'onk', 'unk']),
    weldedExtended: Object.freeze(['all', 'am', 'an']),
    useWeldedExtended: false,
    // Welded units stay separate chips on Sound Mapping (true = one chip, Wilson/Fundations style; not built).
    groupWelded: false,
    // qu is always two sounds, /k/ + /w/. 'unit': one "qu" chip spans both
    // sound boxes on Sound Mapping. 'split': q and u are separate chips.
    qu: 'unit',
    // The suffix -ed after t or d (wanted, needed).
    edSyllable: Object.freeze(['e', 'd']),
    // "ure" has no recording: these two sounds play and the unit is recorded.
    ure: Object.freeze(['oo_short', 'r']),
    // Long u after a consonant: /y/ + /oo/ where it is said (cute), /oo/ where not (rule).
    longU: Object.freeze(['y', 'oo']),
    // Taught forms that differ from the dictionary's first entry.
    functionWords: Object.freeze({ the: Object.freeze(['dh', 'schwa']), a: Object.freeze(['schwa']), was: Object.freeze(['w', 'u', 'z']) }),
  });
  const ownKey = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const ARPABET_CONSONANTS = { B: 'b', CH: 'ch', D: 'd', DH: 'dh', F: 'f', G: 'g', HH: 'h', JH: 'j', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ng', P: 'p', R: 'r', S: 's', SH: 'sh', T: 't', TH: 'th', V: 'v', W: 'w', Y: 'y', Z: 'z', ZH: 'zh' };
  // AH with stress is short u; unstressed AH is schwa. AO is decided by spelling below.
  const ARPABET_VOWELS = { AA: 'o', AE: 'a', AH: 'u', AO: 'aw', AW: 'ow', AY: 'ie', EH: 'e', ER: 'er', EY: 'ay', IH: 'i', IY: 'ee', OW: 'oa', OY: 'oy', UH: 'oo_short', UW: 'oo' };
  // A vowel and the r after it are one r-controlled unit.
  const ARPABET_R_VOWELS = { AA: ['AAR', 'ar'], AO: ['AOR', 'or'], OW: ['AOR', 'or'], EH: ['EHR', 'air'], IH: ['IHR', 'ear'], IY: ['IHR', 'ear'] };
  const OG_KEY_LABELS = { ...ARPABET_CONSONANTS, ...ARPABET_VOWELS, AH0: 'schwa', AAR: 'ar', AOR: 'or', EHR: 'air', IHR: 'ear', ED: OG_CONVENTIONS.edSyllable[0] };
  // Spellings each sound may take. A silent letter belongs to the spelling of
  // the sound beside it (kn, wr, gn, mb), so it is listed with that sound.
  const OG_SPELLING_TEXT = {
    B: 'b bb pb', CH: 'ch tch t ti c ci', D: 'd dd ed', DH: 'th', F: 'f ff ph gh lf ft', G: 'g gu gg gh gue', HH: 'h wh',
    JH: 'j g ge dge dg d gg di dj', K: 'k c ck cc ch q que qu cq cu', L: 'l ll', M: 'm mm mb mn lm', N: 'n nn kn gn pn mn nd',
    NG: 'ng n ngue', P: 'p pp', R: 'r rr wr rh', S: 's ss c ce se sc st ps sw', SH: 'sh ti ci ch s ss si ce sci ssi', T: 't tt ed bt pt th',
    TH: 'th', V: 'v ve f vv lv', W: 'w wh u', Y: 'y i', Z: 'z zz s se ze x ss', ZH: 's si g ge z ti',
    AA: 'o a ah al ho oh aw au augh ough ow', AE: 'a au ai', AH: 'u o ou oo oe a', AH0: 'a e i o u ou ai y ea oi ah ei au', AO: 'o a aw au ough augh oa al ou awe',
    AW: 'ow ou ough hou', AY: 'i y igh ie ye uy eye ei eigh ai is ig ais', EH: 'e ea ai a ie ay ue u eo ei', ED: 'e',
    ER: 'er ir ur or ear ar our re ure r yr urr irr ere arr', EY: 'a ai ay ea ey ei eigh aigh et e ee au', IH: 'i y e ee u ui a o ie ia',
    IY: 'e ee ea y ie ey i eo ei ay', OW: 'o oa ow oe ough ou ew eau oh ol au oo', OY: 'oi oy uoy', UH: 'oo u ou oul o',
    UW: 'oo u ue ew ou o oe ui ough wo eu',
    AAR: 'ar ear arr are er', AOR: 'or ore oor our oar ar orr aur arr', EHR: 'air are ear ere eir ayer ayor aire', IHR: 'ear eer ere ier eir',
  };
  // One spelling for two sounds.
  const OG_TWO_SOUND_TEXT = {
    'K+S': 'x', 'G+Z': 'x', 'K+SH': 'x', 'K+W': 'qu', 'Y+UW': 'u ew ue eu iew eau', 'Y+UH': 'u', 'Y+AH0': 'u', 'Y+ER': 'ure ur',
    'AH0+L': 'le l', 'AH0+M': 'm', 'W+AH': 'o', 'T+S': 'zz z',
  };
  // Of those, the spellings whose one chip may span two sound boxes on Sound
  // Mapping. Other two-sound spellings (the o of "one", ew, ure) stay out.
  const OG_SPANNING_SPELLINGS = { 'k+s': ['x'], 'g+z': ['x'], 'k+w': ['qu'], 'y+oo': ['u'], 'schwa+l': ['le'] };
  // Sound Mapping has one box per sound. Chip i covers chipSpans[i] boxes
  // (1, or 2 for a spanning chip). No spans = one box per chip. null = no fit.
  const mappingChipSpans = (graphemes, soundCount, spans) => {
    const chips = Array.isArray(graphemes) ? graphemes : [];
    if (!chips.length || !(soundCount > 0)) return null;
    if (spans == null) return chips.length === soundCount ? chips.map(() => 1) : null;
    if (!Array.isArray(spans) || spans.length !== chips.length || !spans.every(n => n === 1 || n === 2)) return null;
    return spans.reduce((sum, n) => sum + n, 0) === soundCount ? [...spans] : null;
  };
  const OG_SILENT_SPELLINGS = { kn: 'k', wr: 'w', gn: 'g', mb: 'b', bt: 'b', mn: 'n', lf: 'l', lm: 'l', ps: 'p', pn: 'p', rh: 'h', sw: 'w', pb: 'p', nd: 'd' };
  const OG_LONG_VOWELS = new Set(['ay', 'ee', 'ie', 'oa', 'oo']);
  const OG_R_CONTROLLED = new Set(['ar', 'or', 'er', 'air', 'ear']);
  // Spelling decides three things the dictionary's dialect leaves open:
  // short o or aw (dog, saw, ball, want), er/ir/ur, and e before r (hero).
  const relabelBySpelling = (unit, grapheme, word = '', at = 0) => {
    const g = String(grapheme || '');
    if (unit.key === 'AO' || unit.key === 'AA') {
      if (g === 'a') return /^ll?/.test(word.slice(at + 1)) && !/^ll?[aeiouy]/.test(word.slice(at + 1)) ? 'aw' : 'o';
      return /^(?:aw|au|augh|ough|awe|oa|al)$/.test(g) ? 'aw' : 'o';
    }
    if (unit.key === 'ER') return /^ir/.test(g) ? 'ir' : /^ur/.test(g) ? 'ur' : 'er';
    if (unit.key === 'IH' && unit.beforeR) return /^(?:e|ea|ee|ie)$/.test(g) ? 'ee' : 'i';
    return unit.label;
  };
  let ogTableCache = null;
  const ogTables = () => {
    if (ogTableCache) return ogTableCache;
    const byKey = {}, byLabel = {}, pairByKey = {}, pairByLabel = {};
    const addLabel = (table, label, grapheme) => { (table[label] = table[label] || new Set()).add(grapheme); };
    Object.entries(OG_SPELLING_TEXT).forEach(([key, text]) => {
      byKey[key] = new Set(text.split(' '));
      byKey[key].forEach(grapheme => {
        addLabel(byLabel, soundKey(relabelBySpelling({ key, label: OG_KEY_LABELS[key] }, grapheme)), grapheme);
        if (grapheme === 'a' && (key === 'AO' || key === 'AA')) addLabel(byLabel, 'aw', grapheme);
        if (key === 'IH') addLabel(byLabel, soundKey(relabelBySpelling({ key, label: 'i', beforeR: true }, grapheme)), grapheme);
      });
    });
    Object.entries(OG_TWO_SOUND_TEXT).forEach(([key, text]) => {
      const parts = key.split('+'), list = text.split(' ');
      pairByKey[key] = list;
      const label = parts.map(part => soundKey(OG_KEY_LABELS[part])).join('+');
      pairByLabel[label] = [...new Set([...(pairByLabel[label] || []), ...list])];
    });
    ogTableCache = { byKey, byLabel, pairByKey, pairByLabel };
    return ogTableCache;
  };
  const OG_VOWEL_LABELS = new Set([...RHYME_VOWELS, 'ir', 'ur']);
  // Letters to sounds by dynamic programming: every sound takes one allowed
  // spelling; a silent e joins the consonant before it; a listed spelling may
  // take two sounds. null = no legal alignment (the word goes to the teacher).
  const spellingRanks = new WeakMap();
  const spellingRank = (set, text) => {
    let ranks = spellingRanks.get(set);
    if (!ranks) { ranks = new Map(); let i = 0; set.forEach(g => ranks.set(g, i++)); spellingRanks.set(set, ranks); }
    return ranks.get(text) || 0;
  };
  const alignSpelling = (word, count, single, pair, isConsonant) => {
    const n = word.length, INF = 1e9;
    if (!n || !count || !/^[a-z]+$/.test(word)) return null;
    const best = Array.from({ length: n + 1 }, () => new Array(count + 1).fill(INF));
    const back = Array.from({ length: n + 1 }, () => new Array(count + 1).fill(null));
    best[0][0] = 0;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= count; j++) {
      const cost = best[i][j];
      if (cost >= INF) continue;
      if (j < count) for (let size = 1; size <= 4 && i + size <= n; size++) {
        const text = word.slice(i, i + size);
        const one = single(j);
        // ed is one spelling only as the ending of a word, and "seed" is s-ee-d.
        // Spellings are listed most common first: of two fits, the commoner wins (shop is sh-o-p).
        // A vowel team counts as common, so receive keeps its ei.
        const rank = one && one.has(text) ? spellingRank(one, text) : 0;
        const step = (text === 'ed' ? cost + 0.05 : cost) + (size > 1 && !isConsonant(j) ? Math.min(rank, 3) : rank) * 0.0002;
        if (one && one.has(text) && (text !== 'ed' || i + size === n) && step < best[i + size][j + 1]) { best[i + size][j + 1] = step; back[i + size][j + 1] = [i, j, text, 1]; }
        const two = j + 1 < count ? pair(j) : null;
        if (two && two.includes(text) && cost + 0.5 < best[i + size][j + 2]) { best[i + size][j + 2] = cost + 0.5; back[i + size][j + 2] = [i, j, text, 2]; }
      }
      if (i < n && j > 0 && word[i] === 'e' && isConsonant(j - 1) && back[i][j] && back[i][j][3] !== 0 && cost + 0.1 < best[i + 1][j]) {
        best[i + 1][j] = cost + 0.1; back[i + 1][j] = [i, j, 'e', 0];
      }
    }
    if (best[n][count] >= INF) return null;
    const steps = [];
    for (let i = n, j = count; i > 0 || j > 0;) {
      const step = back[i][j];
      if (!step) return null;
      steps.unshift(step); i = step[0]; j = step[1];
    }
    const chunks = [];
    steps.forEach(step => {
      if (step[3] === 0) { const last = chunks[chunks.length - 1]; last.text += 'e'; last.silentE = true; }
      else chunks.push({ text: step[2], start: step[1], size: step[3], at: step[0] });
    });
    return chunks;
  };
  const arpabetUnits = (word, phones, mergeBeforeVowel) => {
    const base = phone => String(phone || '').replace(/\d$/, '');
    const isVowel = phone => !!phone && ownKey(ARPABET_VOWELS, base(phone));
    const units = [];
    for (let i = 0; i < phones.length; i++) {
      const key = base(phones[i]), next = phones[i + 1], after = phones[i + 2];
      // wh: one sound /w/ in General American (the dictionary lists /hw/ as an alternative).
      if (key === 'HH' && next === 'W' && word.includes('wh')) continue;
      if (ownKey(ARPABET_VOWELS, key)) {
        const merged = ARPABET_R_VOWELS[key];
        if (next === 'R' && merged) {
          const allowed = !isVowel(after) || (mergeBeforeVowel && (key === 'AO' || key === 'OW' || (key === 'EH' ? /air/ : key === 'AA' ? /ar/ : /e[ae]r/).test(word)));
          if (allowed) { units.push({ key: merged[0], label: merged[1] }); i++; continue; }
        }
        if (key === 'AH' && /0$/.test(phones[i])) units.push({ key: 'AH0', label: 'schwa' });
        else if (key === 'IH' && next === 'R' && isVowel(after)) units.push({ key, label: 'i', beforeR: true });
        else units.push({ key, label: ARPABET_VOWELS[key], unstressed: /0$/.test(phones[i]) });
      } else if (ownKey(ARPABET_CONSONANTS, key)) units.push({ key, label: ARPABET_CONSONANTS[key] });
      else return null;
    }
    // -ed after t or d is its own syllable: the taught /ed/.
    const last = units.length - 1;
    if (/[td]ed$/.test(word) && last >= 2 && units[last].key === 'D' && /^[TD]$/.test(units[last - 2].key) &&
      (units[last - 1].key === 'AH0' || (units[last - 1].key === 'IH' && units[last - 1].unstressed))) {
      units[last - 1] = { key: 'ED', label: OG_CONVENTIONS.edSyllable[0] };
    }
    return units;
  };
  const alignArpabetUnits = (word, units) => {
    const tables = ogTables();
    return alignSpelling(word, units.length, j => tables.byKey[units[j].key],
      j => tables.pairByKey[units[j].key + '+' + units[j + 1].key], j => ownKey(ARPABET_CONSONANTS, units[j].key));
  };
  // One dictionary pronunciation (ARPAbet phones with stress digits) -> sound labels.
  const arpabetToSounds = (word, phones) => {
    const w = normalize(word), list = Array.isArray(phones) ? phones : String(phones || '').trim().split(/\s+/);
    let fallback = null;
    for (const merge of [true, false]) {
      const units = arpabetUnits(w, list, merge);
      if (!units || !units.length) return null;
      const chunks = alignArpabetUnits(w, units);
      if (chunks) {
        const sounds = units.map(unit => unit.label);
        chunks.forEach(chunk => { if (chunk.size === 1) sounds[chunk.start] = relabelBySpelling(units[chunk.start], chunk.text, w, chunk.at); });
        return sounds;
      }
      fallback = units;
    }
    // No alignment: decide the spelling-led labels from the whole word.
    return fallback.map(unit => unit.key === 'AO' || unit.key === 'AA' ? (/aw|au|al|ough|augh/.test(w) ? 'aw' : 'o') : unit.label);
  };
  // All of a word's dictionary pronunciations -> the taught form first, then
  // the other forms that sound different. Citation forms outrank reduced ones.
  const arpabetEntry = (word, pronunciations) => {
    const w = normalize(word);
    const reduced = phones => !phones.some(phone => /1$/.test(phone));
    const ordered = [...pronunciations.filter(phones => !reduced(phones)), ...pronunciations.filter(reduced)];
    const forms = [];
    if (ownKey(OG_CONVENTIONS.functionWords, w)) forms.push([...OG_CONVENTIONS.functionWords[w]]);
    ordered.forEach(phones => { const sounds = arpabetToSounds(w, phones); if (sounds) forms.push(sounds); });
    const seen = new Set();
    return forms.filter(sounds => { const key = sounds.join(' '); if (seen.has(key)) return false; seen.add(key); return true; });
  };
  const phonemeDictionary = () => options.phonemes || root.AlloModules?.WordSoundsPhonemes;
  const loadPhonemeDictionary = async () => {
    const ready = () => !!phonemeDictionary()?.lookup, file = 'word_sounds_phonemes_en.js';
    if (ready()) return true;
    if (typeof document === 'undefined') return false;
    if (!root.__alloWordSoundsPhonemeLoad) {
      root.__alloWordSoundsPhonemeLoad = new Promise(resolve => {
        let settled = false;
        const finish = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(ready()); } };
        const timer = setTimeout(finish, 10000);
        if (typeof root.__alloLoadPlugin === 'function') {
          Promise.resolve().then(() => root.__alloLoadPlugin(file)).then(loaded => {
            if (!loaded && !ready()) {
              for (const script of document.querySelectorAll?.('script[src]') || []) {
                try {
                  if (new URL(script.src, document.baseURI).pathname.endsWith('/' + file) && script.dataset?.alloLoaded !== '1') script.remove();
                } catch (_) {}
              }
            }
            finish();
          }, finish);
        } else {
          try {
            const url = new URL(file, scriptUrl || document.baseURI);
            const version = new URL(scriptUrl || document.baseURI).searchParams.get('v');
            if (version) url.searchParams.set('v', version);
            const script = document.createElement('script');
            script.src = url.href; script.async = true;
            script.onload = finish;
            script.onerror = () => { script.remove(); finish(); };
            document.head.appendChild(script);
          } catch (_) { finish(); }
        }
      }).then(loaded => { if (!loaded) root.__alloWordSoundsPhonemeLoad = null; return loaded; });
    }
    return root.__alloWordSoundsPhonemeLoad;
  };
  // null = not in the dictionary (or the dictionary is not loaded).
  const dictionarySounds = word => {
    const data = phonemeDictionary(), w = normalize(word);
    if (!data || typeof data.lookup !== 'function' || !w) return null;
    const found = data.lookup(w);
    if (!Array.isArray(found) || !found.length) return null;
    return { sounds: [...found[0]], alternates: found.slice(1).map(sounds => [...sounds]), source: 'dictionary' };
  };
  // Sounds -> the letters that spell each one, for any source of sounds.
  const alignGraphemes = (word, sounds) => {
    const w = normalize(word), keys = (Array.isArray(sounds) ? sounds : []).map(soundKey), tables = ogTables();
    if (!keys.length || keys.some(key => !key)) return null;
    return alignSpelling(w, keys.length, j => tables.byLabel[keys[j]], j => tables.pairByLabel[keys[j] + '+' + keys[j + 1]],
      j => !OG_VOWEL_LABELS.has(keys[j]));
  };
  // What Sound Mapping and the teacher need to know about a word's sounds.
  // mapping.status: 'ready' (graphemes + chipSpans: one box per sound, a chip
  // may span two), 'two_sound_spelling' (the o of "one", ew: left out of Sound
  // Mapping) or 'no_alignment' (teacher review).
  const soundAnalysis = (word, sounds) => {
    const w = normalize(word), list = (Array.isArray(sounds) ? sounds : []).map(sound => phonemeLabel(sound)).filter(Boolean);
    const keys = list.map(soundKey), aligned = alignGraphemes(w, list);
    // qu as a unit: the q (/k/) and u (/w/) chunks become one chip over both sounds.
    const chunks = aligned && OG_CONVENTIONS.qu === 'unit' ? aligned.reduce((out, chunk) => {
      const last = out[out.length - 1];
      if (last && last.text === 'q' && last.size === 1 && !last.silentE && chunk.text === 'u' && chunk.size === 1 && keys[chunk.start] === 'w' && keys[last.start] === 'k') {
        out[out.length - 1] = { text: 'qu', start: last.start, size: 2, at: last.at };
      } else out.push(chunk);
      return out;
    }, []) : aligned;
    const flags = { schwa: keys.includes('schwa'), welded: [], units: [], twoSound: [], silentLetters: [], vowelPatterns: [], digraphs: [], rControlled: [], ed: null, finalLe: false };
    // The three sounds of -ed: /t/ (jumped), /d/ (played), /ed/ (wanted).
    if (/ed$/.test(w) && keys.length > 2) {
      const end = keys[keys.length - 1], before = keys[keys.length - 2], lastChunk = chunks && chunks[chunks.length - 1];
      const vowels = keys.filter(key => OG_VOWEL_LABELS.has(key)).length;
      if (/[td]ed$/.test(w) && vowels > 1 && end === 'd' && ['e', 'i', 'schwa'].includes(before)) flags.ed = 'ed';
      else if (lastChunk && lastChunk.text === 'ed' && lastChunk.size === 1 && (end === 't' || end === 'd')) flags.ed = end;
    }
    if (!chunks) return { word: w, sounds: list, chunks: null, graphemes: [], mapping: { status: 'no_alignment' }, flags };
    chunks.forEach((chunk, index) => {
      const first = keys[chunk.start], next = chunks[index + 1];
      if (chunk.size === 2) {
        flags.twoSound.push({ grapheme: chunk.text, sounds: keys.slice(chunk.start, chunk.start + 2), start: chunk.start });
        if (chunk.text === 'le') flags.finalLe = true;
        if (chunk.text === 'qu' && keys[chunk.start] === 'k' && keys[chunk.start + 1] === 'w') flags.units.push({ unit: 'qu', start: chunk.start, length: 2 });
        return;
      }
      const letters = chunk.silentE ? chunk.text.slice(0, -1) : chunk.text;
      if (ownKey(OG_SILENT_SPELLINGS, letters)) flags.silentLetters.push({ grapheme: letters, silent: OG_SILENT_SPELLINGS[letters], start: chunk.start });
      if (/^(?:sh|ch|th|wh|ck|ng|ph)$/.test(letters)) flags.digraphs.push({ grapheme: letters, start: chunk.start });
      if (OG_R_CONTROLLED.has(first)) flags.rControlled.push({ grapheme: letters, sound: list[chunk.start], start: chunk.start });
      if (OG_LONG_VOWELS.has(first)) {
        // Open syllable: the vowel ends the word, or one consonant and then a vowel follow (pa-per).
        const after = chunks[index + 2], vowelNext = item => !!item && OG_VOWEL_LABELS.has(keys[item.start + item.size - 1]) || !!item && item.size === 2 && item.text !== 'qu';
        const open = !next || (!vowelNext(next) && !!after && vowelNext(after));
        flags.vowelPatterns.push({ start: chunk.start, grapheme: letters, pattern: letters.length > 1 ? 'vowel_team'
          : next && next.silentE && next.size === 1 && next.start === chunk.start + 1 ? 'silent_e' : letters === 'y' ? 'y_as_vowel' : open ? 'open_syllable' : 'single_letter' });
      }
      // Recorded units: the sounds stay separate; the unit says which belong together.
      if (letters === 'q' && next && next.text === 'u' && keys[next.start] === 'w') flags.units.push({ unit: 'qu', start: chunk.start, length: 2 });
      if (first === 'oo_short' && keys[chunk.start + 1] === 'r' && /ure$|ure[sd]$/.test(w) && next && next.start === chunk.start + 1) flags.units.push({ unit: 'ure', start: chunk.start, length: 2 });
      const vowel = letters.length === 1 && 'aiou'.includes(letters) && ['a', 'i', 'o', 'u', 'aw'].includes(first) ? letters : '';
      if (vowel && next && next.size === 1) {
        const after = chunks[index + 2];
        const tail = keys[next.start] === 'ng' ? (next.text === 'ng' ? 'ng' : next.text === 'n' && after && after.size === 1 && keys[after.start] === 'k' ? 'nk' : '') : '';
        const unit = tail ? vowel + tail : '';
        if (unit && OG_CONVENTIONS.welded.includes(unit)) flags.welded.push({ unit, start: chunk.start, length: tail === 'nk' ? 3 : 2 });
        else if (OG_CONVENTIONS.useWeldedExtended && vowel === 'a') {
          const text = vowel + (next.silentE ? next.text.slice(0, -1) : next.text);
          if (OG_CONVENTIONS.weldedExtended.includes(text)) flags.welded.push({ unit: text, start: chunk.start, length: 2 });
        }
      }
    });
    const ready = flags.twoSound.every(item => ownKey(OG_SPANNING_SPELLINGS, item.sounds.join('+')) && OG_SPANNING_SPELLINGS[item.sounds.join('+')].includes(item.grapheme));
    return { word: w, sounds: list, chunks, graphemes: ready ? chunks.map(chunk => chunk.text) : [], chipSpans: ready ? chunks.map(chunk => chunk.size) : [],
      mapping: { status: ready ? 'ready' : 'two_sound_spelling' }, flags };
  };
  // Where a word's sounds came from, and whether a teacher should glance at them.
  const SOUND_SOURCES = Object.freeze(['teacher', 'dictionary', 'espeak', 'ai', 'estimate']);
  const soundsNeedGlance = ({ source, sounds, alternates } = {}) => {
    const reasons = [];
    if (source === 'teacher') return reasons;
    if (source !== 'dictionary') reasons.push(source === 'estimate' ? 'estimate' : 'not_dictionary');
    if (Array.isArray(alternates) && alternates.length) reasons.push('alternate');
    if ((Array.isArray(sounds) ? sounds : []).some(sound => soundKey(sound) === 'schwa')) reasons.push('schwa');
    return reasons;
  };
  const oneVowelRime = sounds => {
    const keys = (Array.isArray(sounds) ? sounds : []).map(soundKey), at = keys.findIndex(key => RHYME_VOWELS.has(key));
    return at >= 0 && keys.filter(key => RHYME_VOWELS.has(key)).length === 1 ? keys.slice(at).join('|') : null;
  };
  const spelledRime = word => (normalize(word).match(/[aeiou][a-z]*$/) || [''])[0];
  const wordHash = word => [...normalize(word)].reduce((hash, c) => Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  // Plausible wrong spellings by rule, never a real word. isRealWord decides.
  // One spelling is taken from each rule in turn, so the choices differ in kind.
  const misspellings = (word, { sounds = [], isRealWord, count = 3 } = {}) => {
    const w = normalize(word), keys = (Array.isArray(sounds) ? sounds : []).map(soundKey), last = keys[keys.length - 1];
    if (!/^[a-z]{2,}$/.test(w)) return [];
    const swap = (pattern, replacement) => pattern.test(w) ? [w.replace(pattern, replacement)] : [];
    // One short vowel between consonants (cat, ship, frog): the only words whose vowel letter may be swapped.
    const shortVowel = /^[^aeiouy]*[aeiou][^aeiouy]+$/.test(w) && !/gh|[aeiou][rwy]/.test(w) &&
      (!keys.length || keys.filter(key => RHYME_VOWELS.has(key)).every(key => 'aeiou'.includes(key)));
    const nearVowels = { a: ['e', 'u'], e: ['i', 'a'], i: ['e', 'a'], o: ['u', 'a'], u: ['o', 'a'] };
    const longer = w.length > 4 && /[aeiouy][a-z]*[^aeiou]ed$/.test(w);
    // The word written sound by sound with each sound's plainest spelling (said -> sed, was -> woz).
    const plain = { ay: 'ai', ee: 'ee', ie: 'ie', oa: 'oa', oo: 'oo', oo_short: 'oo', schwa: 'u', dh: 'th', zh: 'sh', er: 'er' };
    const bySound = keys.length && keys.every(Boolean)
      ? keys.map((key, index) => index === keys.length - 1 && key === 'ay' ? 'ay' : index === keys.length - 1 && key === 'ie' ? 'y' : plain[key] || key).join('') : '';
    const rules = [
      // c, k and ck for /k/.
      [...swap(/ck/, 'k'), ...swap(/c(?![eiyhk])/, 'k'), ...swap(/k(?=[aoulr])/, 'c'), ...swap(/ck/, 'c')],
      // A silent letter left out.
      [...swap(/^kn/, 'n'), ...swap(/^wr/, 'r'), ...swap(/^gn/, 'n'), ...swap(/mb$/, 'm'), ...swap(/^wh/, 'w'), ...swap(/ight/, 'ite'), ...swap(/igh$/, 'y'),
        ...swap(/([aeiou][^aeiouwy])e$/, '$1')],
      // One vowel spelling for another with the same sound.
      [...swap(/ai/, 'ay'), ...swap(/ay$/, 'ai'), ...swap(/ee/, 'ea'), ...swap(/ea/, 'ee'), ...swap(/oa/, 'ow'), ...swap(/ow$/, 'oa'), ...swap(/ou/, 'ow'),
        ...swap(/ow(?=[nl])/, 'ou'), ...swap(/oi/, 'oy'), ...swap(/oy$/, 'oi'), ...swap(/ew$/, 'oo'), ...swap(/ue$/, 'oo'),
        ...swap(/a([^aeiouwy])e$/, 'ai$1'), ...swap(/o([^aeiouwy])e$/, 'oa$1'), ...swap(/i([^aeiouwy])e$/, 'y$1e'), ...swap(/u([^aeiouwy])e$/, 'oo$1')],
      // A doubled consonant made single, or a single one doubled.
      [...swap(/([bdfglmnprstz])\1/, '$1'), ...(shortVowel ? swap(/([aeiou])([bdfglmnptz])$/, '$1$2$2') : [])],
      // Spelled the way it sounds.
      [...swap(/ph/, 'f'), ...swap(/c(?=[eiy])/, 's'), ...swap(/g(?=e$)/, 'j'), ...swap(/x/, 'ks'), ...swap(/qu/, 'kw'), ...swap(/tch/, 'ch'), ...swap(/dge$/, 'j'),
        ...(last === 'z' ? [...swap(/([aeiou])s$/, '$1z'), ...swap(/se$/, 'ze')] : []), ...swap(/ir/, 'er'), ...swap(/ur/, 'er'), ...swap(/er$/, 'ur'),
        ...swap(/([^aeiou])le$/, '$1el'), ...(longer && last === 't' ? swap(/ed$/, 't') : longer && last === 'd' ? swap(/([^td])ed$/, '$1d') : []),
        ...swap(/tion$/, 'shun'), ...swap(/([^aeiou])y$/, '$1ee'), ...(bySound ? [bySound] : [])],
      // A vowel team written with a silent e, or with its letters the wrong way round.
      [...swap(/([^aeiou])ai([^aeiou])$/, '$1a$2e'), ...swap(/([^aeiou])oa([^aeiou])$/, '$1o$2e'), ...swap(/([^aeiou])ee([^aeiou])$/, '$1e$2e'),
        ...swap(/ai/, 'ia'), ...swap(/ea/, 'ae'), ...swap(/oa/, 'ao'), ...swap(/ie/, 'ei'), ...swap(/ou/, 'uo'), ...swap(/ay$/, 'ya'), ...swap(/([^aeiou])ee$/, '$1e')],
      // Letters in the wrong order around r or l.
      [...swap(/([aeiou])([rl])(?!\2)(?=[^aeiou])/, '$2$1'), ...(w.length >= 4 ? swap(/([aeiou])([rl])$/, '$2$1') : [])],
      // One consonant of a blend left out.
      [...swap(/^([bcdfgpst])[lrtpkmnw](?=[aeiou])/, '$1'), ...swap(/([aeiou])[lmns]([dkpt])$/, '$1$2')],
      // A near vowel, a near final sound, or an added e.
      shortVowel ? [...(nearVowels[(w.match(/[aeiou]/) || [''])[0]] || []).map(vowel => w.replace(/[aeiou]/, vowel)), ...swap(/m$/, 'n'), ...swap(/n$/, 'm'), w + 'e'] : [],
      // Another spelling of a long or r-controlled vowel (go -> gow, my -> mie, look -> luk, saw -> sau).
      [...(last === 'oa' ? [...swap(/o$/, 'ow'), ...swap(/o$/, 'oe')] : []), ...(last === 'ee' ? [...swap(/([^e])e$/, '$1ee'), ...swap(/([^e])e$/, '$1ea')] : []),
        ...(last === 'ie' ? [...swap(/y$/, 'ie'), ...swap(/y$/, 'igh')] : []), ...(keys.includes('oo') ? [...swap(/oo/, 'ue'), ...swap(/oo/, 'ew'), ...swap(/([^o])o$/, '$1oo')] : []),
        ...(keys.includes('oo_short') ? swap(/oo/, 'u') : []), ...swap(/aw/, 'au'), ...swap(/or$/, 'oar'), ...swap(/ar$/, 'arr'), ...swap(/ere$/, 'eer'), ...swap(/ee/, 'ie')],
      // Last resort: two letters the wrong way round, or a letter written twice.
      [...(w.length > 2 ? [w.slice(0, -2) + w[w.length - 1] + w[w.length - 2]] : []), w[1] + w[0] + w.slice(2), ...swap(/([aeiou])(?![aeiou])/, '$1$1')],
    ];
    const real = typeof isRealWord === 'function' ? isRealWord : () => false;
    const ok = new Set(), queues = rules.map(list => [...new Set(list)].filter(value => value !== w && /^[a-z]{2,}$/.test(value)));
    // The last rule only fills what the others leave empty.
    for (const group of [queues.slice(0, -1), queues.slice(-1)]) {
      while (ok.size < count && group.some(queue => queue.length)) {
        for (const queue of group) {
          const value = queue.shift();
          if (value && !ok.has(value) && !real(value)) ok.add(value);
          if (ok.size >= count) break;
        }
      }
    }
    return [...ok];
  };
  // Answer choices for a word, from the words the app already vouches for.
  // pool: the only words that may become a choice. soundsOf(word) -> sound
  // labels or null. Nothing here calls a model; the same input gives the same output.
  const derivedAnswerSets = ({ word, sounds, pool = [], sessionWords = [], soundsOf, isRealWord } = {}) => {
    const target = normalize(word), targetKeys = (Array.isArray(sounds) ? sounds : []).map(soundKey);
    const lookup = typeof soundsOf === 'function' ? soundsOf : () => null;
    const cache = new Map();
    const known = value => { if (!cache.has(value)) { const found = lookup(value); cache.set(value, Array.isArray(found) && found.length ? found : null); } return cache.get(value); };
    const session = unique(sessionWords).filter(value => value !== target);
    const safe = unique([...session, ...pool]).filter(value => value !== target && /^[a-z]+$/.test(value));
    const same = value => { const other = known(value); return !!other && other.map(soundKey).join(' ') === targetKeys.join(' '); };
    const seed = wordHash(target), targetRime = oneVowelRime(sounds), targetSpelledRime = spelledRime(target);
    const reviewed = reviewedRhymeKeys.get(target) || null;
    const rhymes = safe.filter(value => !same(value) && (
      (targetRime && oneVowelRime(known(value)) === targetRime) || (reviewed && reviewedRhymeKeys.get(value) === reviewed)));
    const supported = rhymes.filter(value => rhymePairStatus({ word: target, answer: value, phonemes: sounds, answerPhonemes: known(value) || undefined }).supported);
    // A rhyme the class is also learning first, then one that looks alike, then any.
    const tiers = [supported.filter(value => session.includes(value)), supported.filter(value => spelledRime(value) === targetSpelledRime), supported];
    const tier = tiers.find(values => values.length) || [];
    const rhymeWord = tier.length ? tier[seed % tier.length] : '';
    const rhymeKeys = rhymeWord ? (known(rhymeWord) || []).map(soundKey) : [];
    const rhymeRime = rhymeWord ? oneVowelRime(known(rhymeWord)) : null;
    const length = value => (known(value) || []).length || value.length;
    const near = value => Math.abs(length(value) - (targetKeys.length || target.length));
    const notRhyme = value => {
      const rime = oneVowelRime(known(value));
      return !!rime && rime !== targetRime && rime !== rhymeRime && value !== rhymeWord && !same(value) &&
        spelledRime(value) !== targetSpelledRime && (!rhymeWord || spelledRime(value) !== spelledRime(rhymeWord)) &&
        (!rhymeKeys.length || (known(value) || []).map(soundKey).join(' ') !== rhymeKeys.join(' '));
    };
    const ordered = shuffled(safe, seed);
    const rhymeDistractors = rhymeWord ? ordered.filter(notRhyme).sort((a, b) => near(a) * 3 - wordCloseness(a, target) - near(b) * 3 + wordCloseness(b, target)).slice(0, 5) : [];
    // Blending: words one sound away first, then words that look and sound close.
    const soundDistance = value => {
      const other = (known(value) || []).map(soundKey);
      if (!other.length || !targetKeys.length) return 9;
      if (other.length !== targetKeys.length) return 2 + Math.abs(other.length - targetKeys.length);
      const differing = other.filter((key, index) => key !== targetKeys[index]).length;
      return differing === 0 ? 9 : differing;
    };
    const blendingDistractors = ordered.filter(value => known(value) && !same(value))
      .sort((a, b) => soundDistance(a) * 4 - wordCloseness(a, target) - soundDistance(b) * 4 + wordCloseness(b, target)).slice(0, 5);
    // Word family: the same spelled ending AND the same sounds for it.
    const familyMembers = targetSpelledRime.length >= 2 && target.length > targetSpelledRime.length ? safe.filter(value =>
      value.endsWith(targetSpelledRime) && value.length > targetSpelledRime.length &&
      (!targetRime || !known(value) || oneVowelRime(known(value)) === targetRime)).slice(0, 8) : [];
    const evidence = [rhymeWord, ...rhymeDistractors].filter(Boolean).filter(value => known(value)).map(value => ({ word: value, phonemes: [...known(value)] }));
    const real = value => value === target || safe.includes(value) || !!known(value) || (typeof isRealWord === 'function' && !!isRealWord(value));
    return { rhymeWord, rhymePhonemes: rhymeWord ? known(rhymeWord) : null, rhymeDistractors, blendingDistractors,
      familyEnding: familyMembers.length ? '-' + targetSpelledRime : '', familyMembers, evidence,
      orthographyDistractors: misspellings(target, { sounds, isRealWord: real }) };
  };
  // END WORD SOUNDS SOUND DICTIONARY
  return {OG_CONVENTIONS,SOUND_SOURCES,arpabetToSounds,arpabetEntry,loadPhonemeDictionary,dictionarySounds,alignGraphemes,soundAnalysis,mappingChipSpans,soundsNeedGlance,misspellings,derivedAnswerSets,LESSON_STARTING_POINTS,LESSON_LENGTHS,LESSON_LENGTH_DEFAULT,startingPoints,startingPointLabel,startingPointPlan,startingPointStatus,matchStartingPoint,suggestStartingPoint,scaleLessonCounts,lessonLengthOf,lessonPlanItems,lessonPlanMinutes,activityRunsInLanguage,activityBlockedBy,ACTIVITY_NEEDS,SYLLABLE_ACTIVITY_IDS,SYLLABLE_PLAN_DEFAULT_COUNT,isTopUpItem,lessonOwnItems,topUpItems,packItemPlaysIn,wordsForActivity,syllableActivityHasWords,syllableActivityPlan,compoundPartWords,ACTIVITY_SKILLS,SKILL_STRANDS,BIG5_NAMES,activityIds,activityEnglishName,activityLabel,activitySkillLabel,activityStrand,activityBig5,strandOrder,strandLabel,strandBig5,big5Label,strandBig5Label,groupActivitiesByStrand,soundAnswerMatches,phonemeBankCandidates,PHONEME_BANK_SPECIAL,PHONEME_BANK_MATCHES,lessonItemCeiling,PLAN_EXTENSION,planExtensionDecision,preparedSentenceParts,loadSyllablePronunciations,resolveSyllableCount,isTeacherSpokenSyllableCount,createReviewedSyllableCount,createSyllableCountAudioContext,selectSyllableCountAudio,recoverSyllableRecordingDraft,syllableCountWords,syllableRecordingTemplate,normalizeRecordedSyllableDependencies,packAudioLanguageKey,packAudioKey,packAudioAssets,portablePackAsset,packAudioProvenance,packAudioProfileStatus,packAudioInventory,planPackRepair,replacePackAssets,createReviewedSyllableTask,reviewedSyllableReady,syllableAssetSource,resolveSyllableTask,syllableReady,validSyllableBoard,syllableWords,isSyllableLanguageSupported,SYLLABLE_COMPOUNDS_VETTED,compoundWords,longerSyllableWords,READY_LIST_FIRST,readyMadeListGroups,readyListIdsFromDraft,defaultTickOffers,defaultTickedWords,mergeTickedWords,reviewedRhymeEdit,rhymePairStatus,createRhymeSession,buildSessionRhymeBoard,buildRhymeBoard,resolveManipulationTask,manipulationReady,VERSION,phonemeToken,phonemeLabel,soundKey,edgeSound,validSoundBoard,buildSoundSort,validWordFamilyBoard,wordFamilyInstruction,difficultyDecision,choiceLimit,soundCloseness,wordCloseness,trimChoices,countingChoices,isolationPositions,textEvidence,phonemeLabels,responseEvidence,profileCheck,knownWords:Object.keys(EDGES)};
}
const WS_CORE = createWordSoundsCore();
// END GENERATED WORD SOUNDS CORE
  var VERSION = 9, MAX_TARGETS = 1024, MAX_WORDS = 200, MAX_CLIP_CHARS = 512 * 1024;
  var INST = { decoding: 'decoding', orthography: 'inst_spelling_bee', spelling_bee: 'inst_spelling_bee', word_scramble: 'inst_word_scramble', missing_letter: 'inst_missing_letter', counting: 'inst_counting', blending: 'inst_blending', segmentation: 'inst_segmentation', mapping: 'mapping', syllable_blending: 'inst_syllable_blending', syllable_counting: 'inst_syllable_counting' };
  var FEEDBACK = ['fb_try_again_listen', 'fb_almost', 'fb_amazing', 'fb_on_fire', 'fb_excellent', 'fb_wow', 'fb_you_got_it', 'fb_great_job', 'fb_nice', 'fb_keep_going', 'fb_way_to_go', 'fb_perfect', 'fb_correct'];
  var BANKS = { phoneme: '__ALLO_PHONEME_AUDIO_BANK', instruction: '__ALLO_INSTRUCTION_AUDIO', feedback: '__ALLO_INSTRUCTION_AUDIO', isolation: '__ALLO_ISOLATION_AUDIO', 'letter-name': '__ALLO_LETTER_NAME_AUDIO_BANK' };
  var receipts = new Map(), activeRuns = new Map(), serial = 0;
  var keyOf = function (value) { return typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : ''; };
  var wordOf = function (item) { return keyOf(item && (item.targetWord || item.word || item.term || item.singleWord || item.displayWord)); };
  var safeKey = function (key) { return key && key.length <= 240 && !/[\u0000-\u001f\u007f]/.test(key); };
  var wordsOf = function (resource) { return resource && Array.isArray(resource.wsPreloadedWords) && resource.wsPreloadedWords.length ? resource.wsPreloadedWords : (resource && Array.isArray(resource.data) ? resource.data : []); };
  function descriptor(asset) {
    var mime, base64;
    if (typeof asset === 'string') {
      var match = asset.match(/^data:(audio\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
      if (!match) return { status: /^https:\/\/[^\s]+$/i.test(asset) ? 'online-fetch' : (/^blob:/i.test(asset) ? 'device-only' : 'invalid') };
      mime = match[1]; base64 = match[2];
    } else if (asset && typeof asset === 'object' && !Array.isArray(asset)) { mime = asset.mime; base64 = asset.base64; }
    else return { status: 'missing' };
    mime = keyOf(mime); base64 = typeof base64 === 'string' ? base64.replace(/\s/g, '') : '';
    if (!/^audio\/(?:mpeg|mp3|wav|x-wav|wave|ogg|webm|mp4|x-m4a|aac|flac)$/.test(mime)) return { status: 'unsupported', mime: mime };
    if (!base64 || base64.length > MAX_CLIP_CHARS || base64.length % 4 !== 0 || !/^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?$/i.test(base64)) return { status: 'invalid', mime: mime };
    var bytes;
    try {
      if (typeof atob === 'function') { bytes = atob(base64); if (typeof btoa === 'function' && btoa(bytes) !== base64) return { status: 'invalid', mime: mime }; }
      else if (typeof Buffer !== 'undefined') { var buffer = Buffer.from(base64, 'base64'); if (buffer.toString('base64') !== base64) return { status: 'invalid', mime: mime }; bytes = buffer.toString('binary'); }
      else return { status: 'unverified', mime: mime };
    } catch (_) { return { status: 'invalid', mime: mime }; }
    var at = function (i) { return bytes.charCodeAt(i); };
    var wav = bytes.length > 44 && bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WAVE';
    var mp3 = bytes.length > 10 && (bytes.slice(0, 3) === 'ID3' && at(3) >= 2 && at(3) <= 4 || at(0) === 255 && (at(1) & 224) === 224 && (at(1) & 6) !== 0);
    var aac = bytes.length > 7 && at(0) === 255 && (at(1) & 246) === 240;
    var ogg = bytes.length > 27 && bytes.slice(0, 4) === 'OggS' && at(4) === 0;
    var webm = bytes.length > 8 && at(0) === 26 && at(1) === 69 && at(2) === 223 && at(3) === 163;
    var mp4 = bytes.length > 12 && bytes.slice(4, 8) === 'ftyp';
    var flac = bytes.length > 8 && bytes.slice(0, 4) === 'fLaC';
    var valid = /wav|wave/.test(mime) ? wav : (/mpeg|mp3/.test(mime) ? mp3 : (mime === 'audio/aac' ? aac : (/ogg/.test(mime) ? ogg : (/webm/.test(mime) ? webm : (/flac/.test(mime) ? flac : mp4)))));
    if (!valid) return { status: 'invalid', mime: mime };
    return { status: 'embedded-portable', mime: mime, base64: base64, src: 'data:' + mime + ';base64,' + base64 };
  }
// Keep only portable speech provenance; imported lesson data cannot add fields
// to the delivery envelope through clip metadata.
function sanitizeWordSoundsAudioProvenance(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out = { version: 1 };
  ['provider', 'engine', 'resolvedVoice', 'voice', 'language', 'model'].forEach(key => {
    if (Object.prototype.hasOwnProperty.call(value, key) && typeof value[key] === 'string' && value[key].length && value[key].length <= 120) out[key] = value[key];
  });
  if (['synthesized', 'recorded_bank', 'unknown', 'teacher_recording'].includes(value.source)) out.source = value.source;
  return Object.keys(out).length > 1 ? out : null;
}


  // Restore only reviewed instructional syllables. Arbitrary microphone audio,
  // learner recordings and removed parent objects never cross this boundary.
  function restoreReviewedSyllables(source, target, suppliedBudget) {
    if (!source || !target || source.type !== 'word-sounds' || target.type !== 'word-sounds') return target;
    var budget = suppliedBudget || { chars: 6 * 1024 * 1024, items: 512 };
    budget.chars = Number.isFinite(budget.chars) ? Math.max(0, Math.min(6 * 1024 * 1024, budget.chars)) : 0;
    budget.items = Number.isFinite(budget.items) ? Math.max(0, Math.min(512, budget.items)) : 0;
    if (!suppliedBudget) ['wsPreloadedWords', 'data'].forEach(function (layout) {
      (Array.isArray(target[layout]) ? target[layout] : []).forEach(function (word) {
        Object.values(word && word._ttsAssets || {}).forEach(function (asset) {
          if (asset && typeof asset.base64 === 'string') { budget.chars -= asset.base64.length; budget.items--; }
        });
      });
    });
    var config = source.sessionConfig || {};
    var targetConfig = target.sessionConfig || {};
    ['wsPreloadedWords', 'data'].forEach(function (layout) {
      if (!Array.isArray(target[layout])) return;
      target[layout] = target[layout].map(function (word, index) {
        var targetBoard = word && word.activityItems && word.activityItems.syllable_blending;
        if (!targetBoard || targetBoard.contentStatus !== 'teacher_recorded') return word;
        var stripped = Object.assign({}, targetBoard, { audioUnits: (Array.isArray(targetBoard.audioUnits) ? targetBoard.audioUnits : []).slice(0, 4).map(function (unit) {
          return { key: unit && unit.key, text: unit && unit.text };
        }) });
        var output = Object.assign({}, word, { activityItems: Object.assign({}, word.activityItems, { syllable_blending: stripped }) });
        var sourceWord = Array.isArray(source[layout]) && source[layout][index];
        var sourceBoard = sourceWord && sourceWord.activityItems && sourceWord.activityItems.syllable_blending;
        if (index >= MAX_WORDS || !sourceWord || wordOf(sourceWord) !== wordOf(word) || !WS_CORE.reviewedSyllableReady(sourceBoard)) return output;
        var language = config.wordSoundsLanguage || source.wordSoundsLanguage || source.language || sourceBoard.language;
        var targetLanguage = targetConfig.wordSoundsLanguage || target.wordSoundsLanguage || target.language || targetBoard.language;
        if (!WS_CORE.resolveSyllableTask(wordOf(word), sourceBoard, language).supported || !WS_CORE.resolveSyllableTask(wordOf(word), sourceBoard, targetLanguage).supported) return output;
        var restoredUnits = sourceBoard.audioUnits.map(function (unit) {
          return { key: unit.key, text: unit.text, asset: { mime: unit.asset.mime, base64: unit.asset.base64,
            durationSeconds: unit.asset.durationSeconds, decoded: true, source: 'teacher_recording' } };
        });
        // Preserve the sanitized target's metadata and options. Any changed
        // word, order, label, language or review signature invalidates restoration.
        var candidate = Object.assign({}, stripped, { audioUnits: restoredUnits });
        if (!WS_CORE.reviewedSyllableReady(candidate)) return output;
        var chars = restoredUnits.reduce(function (sum, unit) { return sum + unit.asset.base64.length; }, 0);
        if (chars > budget.chars || restoredUnits.length > budget.items) return output;
        budget.chars -= chars; budget.items -= restoredUnits.length;
        output.activityItems.syllable_blending = candidate;
        return output;
      });
    });
    return target;
  }
  function portable(resource) {
    if (!resource || resource.type !== 'word-sounds' || !Array.isArray(resource.data) && !Array.isArray(resource.wsPreloadedWords)) return resource;
    var normalized = Object.assign({}, resource);
    ['wsPreloadedWords', 'data'].forEach(function (layout) {
      if (Array.isArray(resource[layout])) normalized[layout] = resource[layout].map(function (word) { return word && typeof word === 'object' && !Array.isArray(word) ? Object.assign({}, word) : word; });
    });
    {
        let remainingAudioChars = 6 * 1024 * 1024;
        let remainingAudioItems = 512;
        // The same clip under the same key in both layouts is charged once.
        const chargedAudio = new Map();
        const omittedAudioKeys = new Set();
        const safeTtsKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240);
        const recordOmittedTtsKey = (key, omittedKeys) => {
            if (!key || (!omittedAudioKeys.has(key) && omittedAudioKeys.size >= 512)) return;
            omittedAudioKeys.add(key);
            omittedKeys.add(key);
        };
        const safePortableTtsAssets = (value, omittedKeys) => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
            const safeAssets = Object.create(null);
            for (const [rawKey, rawAsset] of Object.entries(value)) {
                const key = safeTtsKey(rawKey);
                if (!key) continue;
                const dataAudio = typeof rawAsset === 'string' ? rawAsset.match(/^data:([^;]+);base64,([\s\S]*)$/i) : null;
                const asset = dataAudio ? { mime: dataAudio[1], base64: dataAudio[2] } : rawAsset;
                const mime = asset && typeof asset === 'object' && !Array.isArray(asset) ? String(asset.mime || '').trim().toLowerCase() : '';
                const base64 = asset && typeof asset.base64 === 'string' ? asset.base64.replace(/\s+/g, '') : '';
                const charged = chargedAudio.get(key) === base64;
                if (!/^audio\/[a-z0-9.+-]{1,48}$/i.test(mime)
                    || !base64 || base64.length > 512 * 1024 || !charged && (base64.length > remainingAudioChars || remainingAudioItems <= 0)
                    || !/^[a-z0-9+/]+={0,2}$/i.test(base64) || base64.length % 4 === 1
                    || (base64.includes('=') && base64.length % 4 !== 0)) {
                    recordOmittedTtsKey(key, omittedKeys);
                    continue;
                }
                if (Object.prototype.hasOwnProperty.call(safeAssets, key)) {
                    recordOmittedTtsKey(key, omittedKeys);
                    continue;
                }
                const provenance = sanitizeWordSoundsAudioProvenance(asset.provenance);
                safeAssets[key] = { mime, base64, ...(provenance ? { provenance } : {}) };
                if (!charged) {
                    chargedAudio.set(key, base64);
                    remainingAudioChars -= base64.length;
                    remainingAudioItems -= 1;
                }
            }
            return Object.keys(safeAssets).length > 0 ? safeAssets : null;
        };
        const safeRequiredTtsKeys = (value) => {
            if (!Array.isArray(value)) return null;
            const keys = Array.from(new Set(value
                .map(safeTtsKey)
                .filter(Boolean)))
                .slice(0, 1024);
            return keys.length > 0 ? keys : null;
        };
        ['wsPreloadedWords', 'data'].forEach(layout => {
          if (!Array.isArray(resource[layout]) || !Array.isArray(normalized[layout])) return;
          resource[layout].forEach((sourceWord, wordIndex) => {
            const packedWord = normalized[layout][wordIndex];
            if (!sourceWord || !packedWord || typeof packedWord !== 'object' || Array.isArray(sourceWord) || Array.isArray(packedWord)) return;
            const omittedKeys = new Set();
            const safeAssets = safePortableTtsAssets(sourceWord._ttsAssets, omittedKeys);
            if (safeAssets) packedWord._ttsAssets = safeAssets;
            else delete packedWord._ttsAssets;
            const targetWord = sourceWord.targetWord || sourceWord.word || sourceWord.term || sourceWord.singleWord || sourceWord.displayWord;
            const requiredKeys = safeRequiredTtsKeys([targetWord, ...(Array.isArray(sourceWord._ttsRequiredKeys) ? sourceWord._ttsRequiredKeys : [])]);
            if (requiredKeys) packedWord._ttsRequiredKeys = requiredKeys;
            else delete packedWord._ttsRequiredKeys;
            const priorOmittedKeys = safeRequiredTtsKeys(sourceWord._ttsOmittedKeys) || [];
            priorOmittedKeys.forEach(key => recordOmittedTtsKey(key, omittedKeys));
            const unresolvedOmittedKeys = Array.from(omittedKeys).filter(key => !safeAssets || !Object.prototype.hasOwnProperty.call(safeAssets, key));
            if (unresolvedOmittedKeys.length) packedWord._ttsOmittedKeys = unresolvedOmittedKeys;
            else delete packedWord._ttsOmittedKeys;
          });
        });
    }
    return restoreReviewedSyllables(resource, normalized);
  }
  function requirements(resource) {
    var entries = new Map(), overflow = false, unknownActivities = [], contentIssues = [], teacherLedWords = [];
    var intentionalSpokenTargets = new Set();
    var add = function (label, category) {
      var key = keyOf(label), id = category + ':' + key;
      if (!key || entries.has(id) || category === 'speech' && intentionalSpokenTargets.has(key)) return;
      if (!safeKey(key) || entries.size >= MAX_TARGETS) { overflow = true; return; }
      entries.set(id, { id: id, key: key, category: category, label: key });
    };
    var sound = function (value) {
      var label = typeof value === 'string' ? value : englishPhonemes
        ? WS_CORE.soundKey(value) || WS_CORE.phonemeLabel(value)
        : value && typeof value.ipa === 'string' ? value.ipa : '';
      if (!label && !englishPhonemes) contentIssues.push('A lesson sound needs its pronunciation and a checked recording for the lesson language.');
      add(typeof label === 'string' ? label.replace(/^\/+|\/+$/g, '') : '', 'phoneme');
    };
    var config = resource && resource.sessionConfig || {};
    var language = config.wordSoundsLanguage || config.language || resource.wordSoundsLanguage || resource.language || 'en';
    var englishPhonemes = /^en(?:glish)?(?:[-_\s(]|$)/i.test(String(language).trim());
    var words = WS_CORE.normalizeRecordedSyllableDependencies(wordsOf(resource), config.wordSoundsLanguage || (resource && (resource.wordSoundsLanguage || resource.language)));
    var sequence = resource && resource.lessonPlanSequence || config.activitySequence;
    var activities = Array.isArray(sequence) && sequence.length ? sequence : (config.initialActivity ? [config.initialActivity] : []);
    if (!activities.length) activities = Array.from(new Set(words.flatMap(function (item) { return item && Array.isArray(item._preparedActivities) ? item._preparedActivities : []; })));
    if (!activities.length) activities = ['counting'];
    activities = Array.from(new Set(activities));
    var known = Object.keys(INST).concat(['isolation', 'rhyming', 'manipulation', 'letter_tracing', 'sound_sort', 'word_families', 'decoding', 'read_sentence', 'read_passage', 'sentence_match']);
    activities.forEach(function (activity) { if (known.indexOf(activity) === -1) unknownActivities.push(String(activity)); });
    var fixedForm = config.fixedForm === true || !!(resource && resource.isProbeMode);
    var countIssues = [], countReady = 0, blendIssues = [], blendReady = 0;
    var otherActivityWord = function (item, activity) { return WS_CORE.isTopUpItem(item) && item._wsOnlyFor.indexOf(activity) === -1; };
    if (activities.indexOf('syllable_counting') !== -1) {
      // Delivery and playback merge every per-word bucket in order. Resolve
      // approvals against that same winning clip, including shadowing assets.
      var countAssets = Object.create(null);
      words.slice(0, MAX_WORDS).forEach(function (item) {
        var map = item && item._ttsAssets;
        if (!map || typeof map !== 'object' || Array.isArray(map)) return;
        Object.keys(map).slice(0, MAX_TARGETS + 1).forEach(function (raw) {
          var key = keyOf(raw); if (safeKey(key)) countAssets[key] = map[raw];
        });
      });
      words.slice(0, MAX_WORDS).forEach(function (item) {
        var word = wordOf(item); if (!word || otherActivityWord(item, 'syllable_counting')) return;
        var boards = item.activityItems || {}, prepared = boards.syllable_counting;
        var language = config.wordSoundsLanguage || resource.wordSoundsLanguage || resource.language || prepared && prepared.language || boards.syllable_blending && boards.syllable_blending.language;
        var asset = countAssets[word];
        var input = { language: language, prepared: prepared, recordedTask: boards.syllable_blending,
          audioContext: WS_CORE.createSyllableCountAudioContext({ asset: asset, audioSource: typeof asset === 'string' ? asset : undefined,
            language: language, voice: config.selectedVoice || resource.selectedVoice || resource.voice || item._ttsVoice }) };
        var resolved = WS_CORE.resolveSyllableCount(word, input);
        if (!resolved.supported) {
          var reasons = { count_audio_changed: 'the whole-word audio changed after approval', count_audio_review_required: 'the count needs approval for this whole-word audio',
            count_recording_review_required: 'the syllable recording has not been confirmed against the whole-word pronunciation',
            count_recording_conflict: 'the approved count conflicts with the reviewed syllable recordings', count_review_invalid: 'the saved count approval is no longer valid',
            pronunciation_variant: 'different pronunciations have different counts', dictionary_unavailable: 'pronunciation data is unavailable and no checked count is saved',
            unknown_word: 'no checked pronunciation count is available', unsupported_language: 'this language needs a reviewed count' };
          countIssues.push('Syllable count for ' + word + ' needs review: ' + (reasons[resolved.reason] || 'the saved count evidence is incomplete or outdated') + '.');
        } else countReady += 1;
        if (resolved.supported && WS_CORE.isTeacherSpokenSyllableCount(word, input)) {
          if (teacherLedWords.indexOf(word) === -1) teacherLedWords.push(word);
          if (activities.length === 1) intentionalSpokenTargets.add(word);
        }
      });
      // A word with an unsettled count is left out of the activity; it is a problem only when no word is left.
      if (fixedForm || !countReady) countIssues.forEach(function (issue) { contentIssues.push(issue); });
    }
    words.slice(0, MAX_WORDS).forEach(function (item) {
      if (!item || typeof item !== 'object' || !wordOf(item)) { overflow = true; return; }
      add(wordOf(item), 'speech');
      (Array.isArray(item._ttsRequiredKeys) ? item._ttsRequiredKeys : []).slice(0, MAX_TARGETS + 1).forEach(function (key) { add(key, 'speech'); });
      if (item._ttsRequiredKeys && item._ttsRequiredKeys.length > MAX_TARGETS) overflow = true;
      var boards = item.activityItems || {};
      activities.forEach(function (activity) {
        if (otherActivityWord(item, activity)) return;
        var board = boards[activity] || {};
        var fieldMap = { blending: ['options'], rhyming: ['options'], manipulation: ['options'], syllable_blending: ['options'], syllable_counting: ['syllables'], orthography: ['options'], sound_sort: ['options', 'distractors'], word_families: ['options', 'distractors'], decoding: ['choices'], read_sentence: ['options'], read_passage: ['options'], sentence_match: ['sequence', 'extras'] };
        (fieldMap[activity] || []).forEach(function (field) { (Array.isArray(board[field]) ? board[field] : []).forEach(function (value) { add(value, 'speech'); }); });
        if (activity === 'rhyming') {
          var rhymeLanguage = config.wordSoundsLanguage || config.language || resource.wordSoundsLanguage || resource.language || 'en';
          var rhyme = WS_CORE.rhymePairStatus({ word: wordOf(item), answer: board.answer || item.rhymeWord,
            phonemes: item.phonemes, pool: words, prepared: board, isEnglish: /^en/i.test(String(rhymeLanguage)) });
          if (!rhyme.supported) contentIssues.push('Rhyme Time for ' + wordOf(item) + ' needs a checked matching rhyme.');
        }
        if (activity === 'mapping') {
          var mappingSounds = Array.isArray(item.phonemes) ? item.phonemes : [];
          // One box per sound; a chip may span two boxes (chipSpans).
          var mappingGraphemes = [[board.graphemes, board.chipSpans], [item.graphemes, item.chipSpans],
            [mappingSounds.map(function (p) { return p && typeof p === 'object' ? p.grapheme : ''; }), null], [wordOf(item).split(''), null]]
            .find(function (pair) { var values = pair[0]; return Array.isArray(values) && values.length > 0 &&
              values.every(function (value) { return typeof value === 'string' && value.trim(); }) && keyOf(values.join('')) === wordOf(item) &&
              !!WS_CORE.mappingChipSpans(values, mappingSounds.length, pair[1]); });
          if (board.supported === false || board.unavailable || /review_required|needs_review/.test(board.contentStatus || '') || !mappingGraphemes) {
            contentIssues.push('Sound Mapping for ' + wordOf(item) + ' needs a checked match between letters and sounds.');
          }
        }
        if (activity === 'syllable_blending') {
          if (keyOf(board.targetWord) !== wordOf(item) || !WS_CORE.validSyllableBoard(board) || !WS_CORE.resolveSyllableTask(wordOf(item), board, config.wordSoundsLanguage || resource.wordSoundsLanguage || resource.language || board.language).supported) {
            blendIssues.push('Syllable blending for ' + wordOf(item) + ' needs checked syllable audio and answer choices; use the syllable bank or add reviewed word-specific recordings.');
          } else { blendReady += 1; if (board.contentStatus !== 'teacher_recorded') board.audioUnits.forEach(function (unit) { add(unit.key, 'speech'); }); }
        }
        if (['blending', 'segmentation', 'isolation', 'counting', 'mapping'].indexOf(activity) !== -1) (Array.isArray(item.phonemes) ? item.phonemes : []).forEach(sound);
        if (activity === 'isolation') {
          (Array.isArray(board.options) ? board.options : []).forEach(sound);
          var ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
          var position = board.position;
          if (typeof position === 'number') add(ordinals[position] || '', 'isolation');
          else if (position) add(({ first: '1st', middle: 'middle', last: 'last' })[position] || position, 'isolation');
          else add('unknown-position', 'isolation');
        }
        if (activity === 'segmentation') (Array.isArray(board.chips) ? board.chips : []).forEach(function (chip) { sound(chip && chip.phoneme); });
        if (activity === 'mapping') (Array.isArray(board.chipOrder) ? board.chipOrder : []).forEach(function (chip) { sound(chip && chip.text); });
        if (activity === 'missing_letter') (Array.isArray(board.options) ? board.options : []).forEach(sound);
        if (INST[activity]) add(INST[activity], 'instruction');
        if (activity === 'blending') add('which_word_did_you_hear', 'instruction');
        if (activity === 'rhyming') add('inst_rhyming', 'instruction');
        if (activity === 'read_sentence' || activity === 'sentence_match') {
          add(board.sentence, 'speech');
          add(activity === 'read_sentence' ? 'Read the sentence. Which word finishes it?' : 'Read the sentence. Match the pictures to it.', 'speech');
        }
        if (activity === 'read_passage') {
          add(board.story, 'speech');
          String(board.story || '').split(/(?<=[.!?])\s+/).forEach(function (line) { add(line, 'speech'); });
          add('Read the story. Which word finishes it?', 'speech');
        }
        if (activity === 'manipulation') {
          String(board.task && board.task.instruction || item.manipulationTask && item.manipulationTask.instruction || '').split(/(\/[^\s/]{1,4}\/)/g).forEach(function (part) { if (/^\/[^/]+\/$/.test(part.trim())) sound(part.trim()); else if (/[a-z0-9]/i.test(part)) add(part, 'speech'); });
        }
        if (activity === 'letter_tracing') { ['trace_letter', 'for', 'now_try_lowercase'].forEach(function (key) { add(key, 'instruction'); }); add(wordOf(item).slice(0, 1), 'letter-name'); }
        if (activity === 'sound_sort') { add(board.mode === 'last' ? 'sound_match_end' : 'sound_match_start', 'instruction'); add('as_in', 'instruction'); sound(board.targetChar); if (!board.targetChar) overflow = true; }
        if (activity === 'word_families') { if (board.rime) add('Find all words in the ' + board.rime + ' family', 'speech'); else overflow = true; }
      });
    });
    if (words.length > MAX_WORDS) overflow = true;
    if (fixedForm || !blendReady) blendIssues.forEach(function (issue) { contentIssues.push(issue); });
    if (words.length && !(resource && resource.isProbeMode)) FEEDBACK.forEach(function (key) { add(key, 'feedback'); });
    return { entries: Array.from(entries.values()), activities: activities, overflow: overflow, unknownActivities: unknownActivities, contentIssues: contentIssues, teacherLedWords: teacherLedWords, wordCount: words.length };
  }
  function build(resource, options) {
    var route = options.route || 'student-pack', bounded = route === 'student-pack' || route === 'mailbox';
    var deliveredResource = bounded ? portable(resource) : resource;
    var needed = requirements(deliveredResource), assets = Object.create(null), rawAssets = Object.create(null), totalChars = 0, itemCount = 0;
    var config = deliveredResource.sessionConfig || {};
    var language = config.wordSoundsLanguage || config.language || deliveredResource.wordSoundsLanguage || deliveredResource.language || 'en';
    var englishPhonemes = /^en(?:glish)?(?:[-_\s(]|$)/i.test(String(language).trim());
    var selectedWords = wordsOf(deliveredResource).slice(0, MAX_WORDS);
    var deliveredWords = selectedWords;
    var omittedLabels = Array.from(new Set(deliveredWords.flatMap(function (word) { return word && Array.isArray(word._ttsOmittedKeys) ? word._ttsOmittedKeys : []; }).map(keyOf).filter(safeKey))).slice(0, 512);
    deliveredWords.forEach(function (word) {
      var map = word && word._ttsAssets;
      if (!map || typeof map !== 'object' || Array.isArray(map)) return;
      Object.keys(map).slice(0, MAX_TARGETS + 1).forEach(function (raw) {
        var key = keyOf(raw); if (!safeKey(key)) return;
        rawAssets[key] = map[raw];
        var value = descriptor(map[raw]);
        if (value.status === 'embedded-portable' && bounded) {
          if (totalChars + value.base64.length > 6 * 1024 * 1024 || itemCount >= 512) value = { status: 'route-omitted', mime: value.mime };
          else { totalChars += value.base64.length; itemCount += 1; }
        }
        assets[key] = value;
      });
    });
    var clips = needed.entries.map(function (target) {
      var asset, source;
      if (target.category === 'speech') { asset = assets[target.key] || { status: omittedLabels.indexOf(target.key) !== -1 ? 'route-omitted' : 'missing' }; source = 'resource'; }
      else if (target.category === 'phoneme' && !englishPhonemes) {
        var profile = WS_CORE.packAudioProfileStatus(rawAssets[target.key], config.selectedVoice || deliveredResource.selectedVoice, language);
        asset = !profile.present || profile.unknownLanguage || profile.languageMismatch ? { status: 'missing' } : assets[target.key] || { status: 'missing' };
        source = 'resource';
      }
      else {
        var bank = options.banks && options.banks[target.category] || host[BANKS[target.category]];
        var raw = bank && Object.prototype.hasOwnProperty.call(bank, target.key) ? bank[target.key] : null;
        if (!raw && target.category === 'letter-name') raw = host.__ALLO_INSTRUCTION_AUDIO && host.__ALLO_INSTRUCTION_AUDIO['letter_' + target.key];
        asset = raw ? descriptor(raw) : { status: 'online-fetch' };
        source = 'app-audio-bank';
        if (asset.status === 'embedded-portable') asset = Object.assign({}, asset, { status: 'device-only' });
      }
      if (asset.status === 'missing' && !(target.category === 'phoneme' && !englishPhonemes) && options.deviceCache && (options.deviceCache instanceof Map ? options.deviceCache.has(target.key) : Object.prototype.hasOwnProperty.call(options.deviceCache, target.key) && options.deviceCache[target.key])) asset = { status: 'device-only' };
      return Object.assign({}, target, asset, { source: source });
    });
    var binding;
    try {
      var content = wordsOf(deliveredResource).slice(0, MAX_WORDS).map(function (word) { return word && [wordOf(word), word.phonemes, word.activityItems, word.manipulationTask, word._ttsRequiredKeys, word._ttsAssets, word._ttsOmittedKeys, word._preparedActivities, word._packRevision, word._ttsVoice, word._ttsRevision, word._ttsManifest]; });
      binding = JSON.stringify([VERSION, route, resource.id, resource.revision, resource.updatedAt, resource.data, resource.wsPreloadedWords, resource.audioManifest, resource._ttsManifest, resource._ttsVoice, resource._ttsRevision, resource._packRevision, resource.audioRevision, resource.voice, resource.selectedVoice, host.__alloSelectedVoice, resource.sessionConfig, needed.activities, content, clips.map(function (clip) { return [clip.id, clip.source, clip.status, clip.mime, clip.src]; })]);
    } catch (_) { binding = null; }
    return { needed: needed, clips: clips, binding: binding, route: route, omittedLabels: omittedLabels };
  }
  function identity(resource, options) { return resource && resource.type === 'word-sounds' ? build(resource, options || {}).binding : null; }
  function inspect(resource, options) {
    if (!resource || resource.type !== 'word-sounds') return null;
    options = options || {};
    var built = build(resource, options), receipt = built.binding && receipts.get(built.binding), validation = receipt && receipt.validation || {};
    var clips = built.clips.map(function (clip) {
      var result = validation[clip.id];
      return Object.assign({}, clip, { status: result && result !== 'ready' ? result : clip.status, checked: result === 'ready' && clip.status === 'embedded-portable', locallyChecked: result === 'ready' });
    });
    var count = function (status) { return clips.filter(function (clip) { return clip.status === status; }).length; };
    var failures = clips.filter(function (clip) { return ['missing', 'invalid', 'unsupported', 'damaged', 'route-omitted', 'blocked'].indexOf(clip.status) !== -1; });
    var incomplete = clips.filter(function (clip) { return !clip.checked; });
    var omittedLabels = built.omittedLabels;
    var contentComplete = !!built.binding && !built.needed.overflow && !built.needed.unknownActivities.length && !built.needed.contentIssues.length && built.needed.wordCount > 0 && clips.length > 0;
    var requiresTeacher = built.needed.teacherLedWords.length > 0;
    var materialsComplete = contentComplete && incomplete.length === 0;
    var teacherLedReady = requiresTeacher && contentComplete && clips.every(function (clip) { return clip.locallyChecked; });
    var complete = materialsComplete && !requiresTeacher;
    return { version: VERSION, route: built.route, total: clips.length, ready: clips.filter(function (clip) { return clip.checked; }).length, embedded: count('embedded-portable'), online: count('online-fetch'), deviceOnly: count('device-only'), missing: failures.length, unverified: incomplete.length, complete: complete, offlinePortable: complete, independentReady: complete, materialsComplete: materialsComplete, teacherLedWords: built.needed.teacherLedWords, requiresTeacher: requiresTeacher, teacherLedReady: teacherLedReady, overflow: built.needed.overflow, unknownActivities: built.needed.unknownActivities, contentIssues: built.needed.contentIssues, status: complete ? 'ready' : (teacherLedReady ? 'teacher-led' : (failures.length || built.needed.overflow || built.needed.unknownActivities.length || built.needed.contentIssues.length || !built.needed.wordCount ? 'attention' : 'needs-check')), clips: clips, missingLabels: failures.map(function (clip) { return clip.category + ': ' + clip.label; }).concat(built.needed.contentIssues), omittedLabels: omittedLabels, dependencies: clips.filter(function (clip) { return clip.source === 'app-audio-bank' || ['online-fetch', 'device-only'].indexOf(clip.status) !== -1; }).map(function (clip) { return clip.category + ': ' + clip.label; }), checkedAt: receipt && receipt.checkedAt || null };
  }
  function check(resource, options) {
    options = options || {};
    if (!resource || resource.type !== 'word-sounds') return Promise.resolve(null);
    var built = build(resource, options), binding = built.binding, run = ++serial, validation = Object.create(null);
    if (!binding) return Promise.resolve(inspect(resource, options));
    receipts.delete(binding); activeRuns.set(binding, run);
    var targets = built.clips.filter(function (clip) { return clip.src && ['embedded-portable', 'device-only'].indexOf(clip.status) !== -1; });
    var deadline = Date.now() + Math.min(30000, Math.max(1, Number(options.totalTimeoutMs) || 30000)), next = 0, checked = 0;
    var cancelled = function () { return options.signal && options.signal.aborted || activeRuns.get(binding) !== run; };
    function probe(clip) {
      return new Promise(function (resolve) {
        if (cancelled()) { resolve('cancelled'); return; }
        var remaining = deadline - Date.now(); if (remaining <= 0) { resolve('unverified'); return; }
        var audio;
        try { audio = options.audioFactory ? options.audioFactory() : new host.Audio(); } catch (_) { resolve('unsupported'); return; }
        try {
          if (!audio || typeof audio.canPlayType !== 'function' || audio.canPlayType(clip.mime) === '') {
            if (audio && audio.removeAttribute) audio.removeAttribute('src');
            if (audio && audio.load) audio.load();
            resolve('unsupported'); return;
          }
        } catch (_) { resolve('unsupported'); return; }
        var settled = false, timer;
        var finish = function (status) {
          if (settled) return; settled = true; clearTimeout(timer);
          audio.onloadeddata = null; audio.oncanplay = null; audio.onerror = null;
          if (options.signal) options.signal.removeEventListener('abort', cancel);
          try { if (audio.pause) audio.pause(); if (audio.removeAttribute) audio.removeAttribute('src'); if (audio.load) audio.load(); } catch (_) {}
          resolve(status);
        };
        var cancel = function () { finish('cancelled'); };
        if (options.signal) options.signal.addEventListener('abort', cancel, { once: true });
        timer = setTimeout(function () { finish('unverified'); }, Math.min(4000, Math.max(1, Number(options.clipTimeoutMs) || 4000), remaining));
        var decoded = function () { if (audio.readyState >= 2 && Number.isFinite(audio.duration) && audio.duration > 0) finish('ready'); };
        audio.onloadeddata = decoded; audio.oncanplay = decoded; audio.onerror = function () { finish('damaged'); };
        try { audio.preload = 'auto'; audio.src = clip.src; if (audio.load) audio.load(); } catch (_) { finish('damaged'); }
        if (cancelled()) cancel();
      });
    }
    var workers = Array.from({ length: Math.min(4, targets.length) }, async function () {
      while (next < targets.length && !cancelled()) {
        var clip = targets[next++]; validation[clip.id] = await probe(clip); checked += 1;
        if (!cancelled() && typeof options.onProgress === 'function') { try { options.onProgress({ checked: checked, total: targets.length }); } catch (_) {} }
      }
    });
    return Promise.all(workers).then(function () {
      var stale = identity(resource, options) !== binding;
      if (!cancelled() && !stale) {
        receipts.set(binding, { validation: validation, checkedAt: Date.now() });
        while (receipts.size > 2) receipts.delete(receipts.keys().next().value);
      }
      var aborted = cancelled(); if (activeRuns.get(binding) === run) activeRuns.delete(binding);
      var report = inspect(resource, options); return Object.assign({}, report, { cancelled: !!aborted, stale: stale });
    });
  }
  return { VERSION: VERSION, descriptor: descriptor, portable: portable, restoreReviewedSyllables: restoreReviewedSyllables, requirements: requirements, identity: identity, inspect: inspect, check: check };
});
