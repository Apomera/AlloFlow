// Canonical Word Sounds logic. Embedded by dev-tools/sync_word_sounds_core.cjs.
// Edge sounds use the application's English phoneme-bank convention (including
// r-controlled vowel units). null denotes an unresolved pronunciation variant.
function createWordSoundsCore() {
  const VERSION = 1;
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
  const aliases = {c:'k',ck:'k',q:'k',qu:'k',ph:'f',wh:'w',tch:'ch',dge:'j',ai:'ay',ea:'ee',ir:'er',ur:'er',au:'aw',oe:'oa',oi:'oy','ɡ':'g','ʃ':'sh','ʒ':'zh','θ':'th','ð':'dh','ŋ':'ng','dʒ':'j','ʤ':'j','tʃ':'ch','ʧ':'ch','æ':'a','ɛ':'e','ɪ':'i','ɒ':'o','ɑ':'o','ɑː':'o','ʌ':'u','ə':'schwa','iː':'ee','uː':'oo','ʊ':'oo_short','eɪ':'ay','aɪ':'ie','oʊ':'oa','əʊ':'oa','aʊ':'ow','ɔɪ':'oy','ɹ':'r','ɝ':'er','ɚ':'er'};
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
  return {VERSION,soundKey,edgeSound,validSoundBoard,buildSoundSort,difficultyDecision,textEvidence,phonemeLabels,responseEvidence,profileCheck,knownWords:Object.keys(EDGES)};
}
