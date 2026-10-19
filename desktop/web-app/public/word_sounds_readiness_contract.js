(function (root, factory) {
  if (root && root.window) root = root.window;
  var existing = root && root.AlloModules && root.AlloModules.WordSoundsReadiness;
  var api = existing && existing.VERSION === 7 && typeof existing.portable === 'function' ? existing : factory(root || {});
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
  const soundKey = value => { const v=normalize(value); return aliases[v] || v; };
  const edgeSound = (word, position, phonemes) => {
    const w=normalize(word), last=position==='last';
    if (Object.prototype.hasOwnProperty.call(EDGES,w)) return EDGES[w][last?1:0];
    if (!Array.isArray(phonemes) || !phonemes.length) return null;
    const item=phonemes[last?phonemes.length-1:0];
    const raw=typeof item==='string'?item:(item && (item.ipa || item.phoneme || item.grapheme));
    if (!raw) return null;
    if (item && typeof item==='object' && item.ipa==='j') return 'y';
    const key=soundKey(raw);
    return last && (key==='x'||key==='ks') ? 's' : key;
  };
  const unique = values => [...new Set((values||[]).map(normalize).filter(Boolean))];
  const shuffled = (values, seed) => { const out=[...values]; let s=seed||1; for(let i=out.length-1;i>0;i--){ s=(Math.imul(s,1664525)+1013904223)>>>0; const j=s%(i+1); [out[i],out[j]]=[out[j],out[i]];} return out; };
  // Generated Rhyme Time choices are stable per target, but do not reuse the
  // first few model/filler words for every item. Saved boards remain intact.
  const buildRhymeBoard = ({word, answer, phonemes, pool=[], distractors=[], prepared, isEnglish=true, count=4, exposure}) => {
    if (prepared && Array.isArray(prepared.options) && prepared.options.length > 1 &&
        prepared.answer && prepared.options.includes(prepared.answer)) {
      return {...prepared, options: [...prepared.options]};
    }
    const target = normalize(word), correct = normalize(answer);
    if (!correct) return {answer: answer || '', options: []};
    const data = new Map(pool.filter(p => p && typeof p === 'object')
      .map(p => [normalize(p.targetWord || p.word || p.term), p]));
    if (Array.isArray(phonemes) && phonemes.length) data.set(target, {...data.get(target), phonemes});
    const labels = w => ((data.get(w) || {}).phonemes || []).map(p => {
      const raw = typeof p === 'string' ? p : p && (p.ipa || p.phoneme || p.grapheme);
      return soundKey(String(raw || '').replace(/[ˈˌ]/g, ''));
    }).filter(Boolean);
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
    return {answer, options: shuffled([answer, ...selected], seed ^ 0x9e3779b9)};
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
    const inputKey = JSON.stringify([normalize(args.word), normalize(args.answer), args.phonemes || [], args.distractors || []]);
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
    const assets = Object.create(null);
    const replacedKeys = new Set();
    words.forEach(item => Object.assign(assets, item && item._ttsAssets || {}));
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
  return {loadSyllablePronunciations,resolveSyllableCount,isTeacherSpokenSyllableCount,createReviewedSyllableCount,createSyllableCountAudioContext,selectSyllableCountAudio,recoverSyllableRecordingDraft,syllableCountWords,syllableRecordingTemplate,normalizeRecordedSyllableDependencies,packAudioLanguageKey,packAudioKey,packAudioAssets,portablePackAsset,packAudioProvenance,packAudioProfileStatus,packAudioInventory,planPackRepair,replacePackAssets,createReviewedSyllableTask,reviewedSyllableReady,syllableAssetSource,resolveSyllableTask,syllableReady,validSyllableBoard,syllableWords,isSyllableLanguageSupported,createRhymeSession,buildSessionRhymeBoard,buildRhymeBoard,resolveManipulationTask,manipulationReady,VERSION,soundKey,edgeSound,validSoundBoard,buildSoundSort,validWordFamilyBoard,wordFamilyInstruction,difficultyDecision,textEvidence,phonemeLabels,responseEvidence,profileCheck,knownWords:Object.keys(EDGES)};
}
const WS_CORE = createWordSoundsCore();
// END GENERATED WORD SOUNDS CORE
  var VERSION = 7, MAX_TARGETS = 1024, MAX_WORDS = 200, MAX_CLIP_CHARS = 512 * 1024;
  var INST = { decoding: 'decoding', orthography: 'inst_orthography', spelling_bee: 'inst_spelling_bee', word_scramble: 'inst_word_scramble', missing_letter: 'inst_missing_letter', counting: 'inst_counting', blending: 'inst_blending', segmentation: 'inst_segmentation', mapping: 'mapping', syllable_blending: 'inst_syllable_blending', syllable_counting: 'inst_syllable_counting' };
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
                if (!/^audio\/[a-z0-9.+-]{1,48}$/i.test(mime)
                    || !base64 || base64.length > 512 * 1024 || base64.length > remainingAudioChars || remainingAudioItems <= 0
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
                remainingAudioChars -= base64.length;
                remainingAudioItems -= 1;
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
    var sound = function (value) { add(typeof value === 'string' ? value.replace(/^\/+|\/+$/g, '') : '', 'phoneme'); };
    var config = resource && resource.sessionConfig || {};
    var words = WS_CORE.normalizeRecordedSyllableDependencies(wordsOf(resource), config.wordSoundsLanguage || (resource && (resource.wordSoundsLanguage || resource.language)));
    var sequence = resource && resource.lessonPlanSequence || config.activitySequence;
    var activities = Array.isArray(sequence) && sequence.length ? sequence : (config.initialActivity ? [config.initialActivity] : []);
    if (!activities.length) activities = Array.from(new Set(words.flatMap(function (item) { return item && Array.isArray(item._preparedActivities) ? item._preparedActivities : []; })));
    if (!activities.length) activities = ['counting'];
    activities = Array.from(new Set(activities));
    var known = Object.keys(INST).concat(['isolation', 'rhyming', 'manipulation', 'letter_tracing', 'sound_sort', 'word_families', 'decoding', 'read_sentence', 'read_passage', 'sentence_match']);
    activities.forEach(function (activity) { if (known.indexOf(activity) === -1) unknownActivities.push(String(activity)); });
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
        var word = wordOf(item); if (!word) return;
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
          contentIssues.push('Syllable count for ' + word + ' needs review: ' + (reasons[resolved.reason] || 'the saved count evidence is incomplete or outdated') + '.');
        } else if (WS_CORE.isTeacherSpokenSyllableCount(word, input)) {
          if (teacherLedWords.indexOf(word) === -1) teacherLedWords.push(word);
          if (activities.length === 1) intentionalSpokenTargets.add(word);
        }
      });
    }
    words.slice(0, MAX_WORDS).forEach(function (item) {
      if (!item || typeof item !== 'object' || !wordOf(item)) { overflow = true; return; }
      add(wordOf(item), 'speech');
      (Array.isArray(item._ttsRequiredKeys) ? item._ttsRequiredKeys : []).slice(0, MAX_TARGETS + 1).forEach(function (key) { add(key, 'speech'); });
      if (item._ttsRequiredKeys && item._ttsRequiredKeys.length > MAX_TARGETS) overflow = true;
      var boards = item.activityItems || {};
      activities.forEach(function (activity) {
        var board = boards[activity] || {};
        var fieldMap = { blending: ['options'], rhyming: ['options'], manipulation: ['options'], syllable_blending: ['options'], syllable_counting: ['syllables'], orthography: ['options'], sound_sort: ['options', 'distractors'], word_families: ['options', 'distractors'], decoding: ['choices'], read_sentence: ['options'], read_passage: ['options'], sentence_match: ['sequence', 'extras'] };
        (fieldMap[activity] || []).forEach(function (field) { (Array.isArray(board[field]) ? board[field] : []).forEach(function (value) { add(value, 'speech'); }); });
        if (activity === 'syllable_blending') {
          if (keyOf(board.targetWord) !== wordOf(item) || !WS_CORE.validSyllableBoard(board) || !WS_CORE.resolveSyllableTask(wordOf(item), board, config.wordSoundsLanguage || resource.wordSoundsLanguage || resource.language || board.language).supported) {
            contentIssues.push('Syllable blending for ' + wordOf(item) + ' needs checked syllable audio and answer choices; use the syllable bank or add reviewed word-specific recordings.');
          } else if (board.contentStatus !== 'teacher_recorded') board.audioUnits.forEach(function (unit) { add(unit.key, 'speech'); });
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
    if (words.length && !(resource && resource.isProbeMode)) FEEDBACK.forEach(function (key) { add(key, 'feedback'); });
    return { entries: Array.from(entries.values()), activities: activities, overflow: overflow, unknownActivities: unknownActivities, contentIssues: contentIssues, teacherLedWords: teacherLedWords, wordCount: words.length };
  }
  function build(resource, options) {
    var route = options.route || 'student-pack', bounded = route === 'student-pack' || route === 'mailbox';
    var deliveredResource = bounded ? portable(resource) : resource;
    var needed = requirements(deliveredResource), assets = Object.create(null), totalChars = 0, itemCount = 0;
    var selectedWords = wordsOf(deliveredResource).slice(0, MAX_WORDS);
    var deliveredWords = selectedWords;
    var omittedLabels = Array.from(new Set(deliveredWords.flatMap(function (word) { return word && Array.isArray(word._ttsOmittedKeys) ? word._ttsOmittedKeys : []; }).map(keyOf).filter(safeKey))).slice(0, 512);
    deliveredWords.forEach(function (word) {
      var map = word && word._ttsAssets;
      if (!map || typeof map !== 'object' || Array.isArray(map)) return;
      Object.keys(map).slice(0, MAX_TARGETS + 1).forEach(function (raw) {
        var key = keyOf(raw); if (!safeKey(key)) return;
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
      else {
        var bank = options.banks && options.banks[target.category] || host[BANKS[target.category]];
        var raw = bank && Object.prototype.hasOwnProperty.call(bank, target.key) ? bank[target.key] : null;
        if (!raw && target.category === 'letter-name') raw = host.__ALLO_INSTRUCTION_AUDIO && host.__ALLO_INSTRUCTION_AUDIO['letter_' + target.key];
        asset = raw ? descriptor(raw) : { status: 'online-fetch' };
        source = 'app-audio-bank';
        if (asset.status === 'embedded-portable') asset = Object.assign({}, asset, { status: 'device-only' });
      }
      if (asset.status === 'missing' && options.deviceCache && (options.deviceCache instanceof Map ? options.deviceCache.has(target.key) : Object.prototype.hasOwnProperty.call(options.deviceCache, target.key) && options.deviceCache[target.key])) asset = { status: 'device-only' };
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
