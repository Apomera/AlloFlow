// AlloFlow read-along: makes a PRACTICE file in which a passage is read aloud one sentence at a time, each
// sentence marked while it is read. No AI and no app in the file: it plays recordings that were made ahead
// of time, on the teacher's device, by "Make a read-along" (packets-read-along.html).
// One plain script for a browser page (window.AlloPacketReadAlong) and for node (module.exports). It
// calls nothing on the network and reads no clock: the same passage and recordings give the same bytes.
// A sibling of packet_math_practice_builder.js and packet_vocab_builder.js.
//
// The file itself is made by the take-home loader (AlloWordSoundsTakeHome.buildHtml). Each page of the
// passage goes through the loader's read_along adapter (prepare: an allowlist), which is the code that
// plays it: the same line-by-line reading, with the line marked, that Read the Story uses for its story.
(function (root) {
  'use strict';

  var VERSION = 'alloflow-read-along-builder/0.2.0';
  var LESSON_SCHEMA = 'alloflow-take-home-lesson/v2';
  var PLAYER = 'alloflow-word-sounds-take-home/2';
  var ACTIVITY = 'read_along';
  var MAX_CHARS = 6000;            // the passage a teacher gives
  var MAX_SENTENCES = 120;
  var MAX_SENTENCE_CHARS = 400;    // a longer run of words is cut at a comma or a space
  var PAGE_SENTENCES = 6;          // a page of the file: at most this many sentences
  var PAGE_CHARS = 420;            // or about this many letters, whichever comes first
  var MAX_CLIP_CHARS = 2 * 1024 * 1024;
  var CLIP = /^data:audio\/(?:mpeg|mp3|wav);base64,[A-Za-z0-9+/]+=*$/;
  // Words that end in a full stop without ending a sentence.
  var ABBREVIATIONS = ['mr', 'mrs', 'ms', 'dr', 'st', 'jr', 'sr', 'vs', 'etc', 'e.g', 'i.e', 'no', 'mt', 'prof', 'gen', 'capt', 'sgt', 'lt', 'rev',
    'gov', 'sen', 'rep', 'fig', 'ch', 'sec', 'vol', 'eq', 'ex', 'p', 'pp', 'apt', 'dept'];
  // Months and street/time/country abbreviations that stay joined before a number or continuation token,
  // while still allowing a genuine sentence end (e.g. "We arrived at 3 p.m. Then we ate.").
  var NUM_ABBREVIATIONS = ['jan', 'feb', 'mar', 'apr', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'ave', 'blvd', 'rd', 'ln', 'ct', 'u.s', 'a.m', 'p.m'];

  function text(value) { return value == null ? '' : String(value); }
  // FNV-1a, as in the other builders: a short name for a text, not a secret.
  function fnv(value) {
    var h = 0x811c9dc5, s = text(value);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  // The passage as sentences, in order: [{ text, para, pageBreak }]. para is true for the first sentence of a
  // paragraph after the first (a blank line starts a paragraph). A standalone line of three or more hyphens (---)
  // starts a new page on the next sentence (pageBreak: true) and is not spoken. A line break always ends a sentence,
  // so a teacher who wants their own breaks writes one sentence on each line. Within a line a sentence ends at
  // . ! or ? (with any closing quote or bracket) followed by a space, unless the word is an abbreviation
  // (Mr., Dr., e.g.) or a single letter (an initial). Nothing is rewritten: the words are the teacher's.
  function cleanPageMode(value) {
    return value === 'scroll' || value === 'custom' ? value : 'auto';
  }
  function cleanLang(value) {
    var s = text(value).trim();
    return /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/i.test(s) ? s.toLowerCase() : 'en';
  }
  function isRtlLang(lang) {
    return /^(?:ar|he|iw|fa|ur|ps|yi|sd)(?:-|$)/i.test(cleanLang(lang));
  }
  function splitPassage(value) { return everySentence(value).slice(0, MAX_SENTENCES); }
  // How many sentences the passage has before the limit, so a page can say when some are left out.
  function sentenceCount(value) { return everySentence(value).length; }
  function everySentence(value) {
    var source = text(value).replace(/\r\n?/g, '\n').slice(0, MAX_CHARS);
    var out = [];
    var pendingBreak = false;
    source.split(/\n[ \t]*\n+/).forEach(function (paragraph, pi) {
      var first = true;
      paragraph.split('\n').forEach(function (line) {
        var trimmed = line.replace(/[ \t\u00a0]+/g, ' ').trim();
        if (/^-{3,}$/.test(trimmed)) {
          if (out.length) pendingBreak = true;
          first = true;
          return;
        }
        var hMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
        if (hMatch) {
          var hText = hMatch[2].trim();
          if (hText) {
            var hRow = { text: hText.slice(0, MAX_SENTENCE_CHARS), heading: hMatch[1].length };
            if (pendingBreak && out.length) {
              hRow.pageBreak = true;
              pendingBreak = false;
            } else if (first && pi > 0 && out.length) {
              hRow.para = true;
            }
            first = false;
            out.push(hRow);
          }
          return;
        }
        var words = trimmed.split(' ').filter(Boolean), run = [];
        var push = function () {
          if (!run.length) return;
          cut(run.join(' ')).forEach(function (piece) {
            var row = { text: piece };
            if (pendingBreak && out.length) {
              row.pageBreak = true;
              pendingBreak = false;
            } else if (first && pi > 0 && out.length) {
              row.para = true;
            }
            first = false;
            out.push(row);
          });
          run = [];
        };
        words.forEach(function (word, wi) {
          run.push(word);
          var end = /[.!?]+["'\u201d\u2019)\]]*$/.exec(word);
          if (!end) return;
          // The sentence goes on when the next word starts with a small letter: "Where is it?" he said.
          if (wi + 1 < words.length && /^[a-z]/.test(words[wi + 1])) return;
          var bare = word.slice(0, end.index).replace(/^["'\u201c\u2018(\[]+/, '').toLowerCase();
          var stop = word.charAt(end.index);
          var nextWord = wi + 1 < words.length ? words[wi + 1] : '';
          if (stop === '.' && (ABBREVIATIONS.indexOf(bare) >= 0 || /^[a-z]$/.test(bare) || (run.length === 1 && /^\d{1,3}$/.test(bare) && nextWord) || (NUM_ABBREVIATIONS.indexOf(bare) >= 0 && /^[0-9(\[]/.test(nextWord)))) return;
          push();
        });
        push();
      });
    });
    return out;
  }
  // A run of words too long for one recording: cut after a comma, a semicolon or a colon, else at a space.
  function cut(sentence) {
    var rest = sentence, out = [];
    while (rest.length > MAX_SENTENCE_CHARS) {
      var head = rest.slice(0, MAX_SENTENCE_CHARS), at = Math.max(head.lastIndexOf(', '), head.lastIndexOf('; '), head.lastIndexOf(': '));
      if (at < MAX_SENTENCE_CHARS / 3) at = head.lastIndexOf(' ');
      if (at < 1) at = MAX_SENTENCE_CHARS - 1;
      out.push(rest.slice(0, at + 1).trim());
      rest = rest.slice(at + 1).trim();
    }
    if (rest) out.push(rest);
    return out;
  }

  // The sentences as pages:
  //   - 'auto' (default): at most PAGE_SENTENCES sentences or about PAGE_CHARS letters each, a new paragraph
  //     starts a new page once the page has three sentences, and any explicit pageBreak starts a new page.
  //   - 'scroll': all sentences on one scrollable page.
  //   - 'custom': split only where row.pageBreak is true.
  // -> [[sentence, ...], ...]
  function pagesOf(sentences, options) {
    var list = Array.isArray(sentences) ? sentences : [];
    if (!list.length) return [];
    var mode = cleanPageMode(options && typeof options === 'object' ? options.pageMode : options);
    if (mode === 'scroll') return [list.slice()];
    var pages = [], page = [], chars = 0;
    list.forEach(function (row) {
      var n = row.text.length;
      var full = mode === 'custom'
        ? row.pageBreak === true
        : (row.pageBreak === true || page.length >= PAGE_SENTENCES || (page.length >= 2 && chars + n > PAGE_CHARS) || (row.para && page.length >= 3));
      if (page.length && full) { pages.push(page); page = []; chars = 0; }
      page.push(row);
      chars += n;
    });
    if (page.length) pages.push(page);
    return pages;
  }

  // What a recording is filed under: the sentence as it will be said (spaces tidied).
  function clipKey(sentence) { return text(sentence).replace(/\s+/g, ' ').trim(); }

  // The sentence with a middle dot at each syllable break of the words the lookup knows ("The kite sailed
  // o.ver the trees", with a raised dot), or '' when no word in it is split. lookup(word in small letters) ->
  // ['o', 'ver'], or null for a word it does not vouch for. The letters are never changed: a word whose parts do
  // not spell it exactly is left whole, and so is a word beside an apostrophe, a digit or a letter with an accent.
  var DOT = String.fromCharCode(183), APOSTROPHE = String.fromCharCode(8217), OPEN_QUOTE = String.fromCharCode(8216);
  function wordChar(ch) { if (!ch) return false; try { return /[\p{L}\p{M}\p{N}]/u.test(ch); } catch (_) { return /[A-Za-z0-9]/.test(ch) || ch.charCodeAt(0) > 127; } }
  // Deterministic on-device Spanish syllabification (zero AI, mirrors syllable_prep_core.js).
  var _ES_VOWELS = 'aeiou\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc';
  var _ES_STRONG = 'aeo\u00e1\u00e9\u00f3';
  var _ES_ACCENTED_WEAK = '\u00ed\u00fa';
  var _ES_ONSETS = /^(pr|pl|br|bl|tr|dr|cr|cl|gr|gl|fr|fl|ch|ll|rr)$/;
  var _ES_EXCEPTIONS = {
    subrayar: 'sub|ra|yar', subrayado: 'sub|ra|ya|do', subrogar: 'sub|ro|gar',
    transatlantico: 'trans|at|lan|ti|co', 'transatl\u00e1ntico': 'trans|at|l\u00e1n|ti|co'
  };
  function syllabifySpanish(raw) {
    if (typeof raw !== 'string' || raw.length < 4) return null;
    var word = raw.normalize ? raw.normalize('NFC').toLowerCase() : raw.toLowerCase();
    if (!/^[a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1]+$/.test(word)) return null;
    if (/[kw]|ph|th|sh|ck|tion$|ing$/.test(word) || !/[aeiou\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc]/.test(word)) return null;
    if (Object.prototype.hasOwnProperty.call(_ES_EXCEPTIONS, word)) return _ES_EXCEPTIONS[word].split('|');
    var nuclei = [], i = 0;
    while (i < word.length) {
      var silentU = word[i] === 'u' && (word[i - 1] === 'q' || (word[i - 1] === 'g' && /[e\u00e9i\u00ed]/.test(word[i + 1] || '')));
      if (_ES_VOWELS.indexOf(word[i]) >= 0 && !silentU) {
        var j = i + 1, last = word[i];
        while (j < word.length && _ES_VOWELS.indexOf(word[j]) >= 0) {
          var next = word[j];
          var hiatus = (_ES_STRONG.indexOf(last) >= 0 && _ES_STRONG.indexOf(next) >= 0)
            || _ES_ACCENTED_WEAK.indexOf(last) >= 0 || _ES_ACCENTED_WEAK.indexOf(next) >= 0 || last === next;
          if (hiatus) break;
          last = next; j++;
        }
        nuclei.push([i, j]);
        i = j;
      } else i++;
    }
    if (nuclei.length < 2) return null;
    var parts = [], start = 0;
    for (var k = 0; k < nuclei.length - 1; k++) {
      var cluster = word.slice(nuclei[k][1], nuclei[k + 1][0]), cut;
      if (cluster.length < 2) cut = nuclei[k][1];
      else if (_ES_ONSETS.test(cluster.slice(-2))) cut = nuclei[k + 1][0] - 2;
      else cut = nuclei[k + 1][0] - 1;
      parts.push(word.slice(start, cut));
      start = cut;
    }
    parts.push(word.slice(start));
    return parts.length >= 2 ? parts : null;
  }

  function syllableText(sentence, lookup, opts) {
    var plain = clipKey(sentence), split = 0;
    if (typeof lookup !== 'function' || !plain || plain.indexOf(DOT) >= 0) return '';
    var allowUnicode = !!(opts && opts.spanish);
    var re = allowUnicode ? /[A-Za-z\u00C0-\u024F]{3,}/g : /[A-Za-z]{3,}/g;
    var out = plain.replace(re, function (word, at) {
      var prev = plain.charAt(at - 1), next = plain.charAt(at + word.length);
      if (wordChar(prev) || wordChar(next)) return word;
      if (prev === "'" || prev === APOSTROPHE) {
        if (wordChar(plain.charAt(at - 2))) return word;
        if (!/^[^A-Za-z0-9\s]*['\u2019]|['\u2019](?:$|[^A-Za-z0-9])/.test(plain.slice(at + word.length))) return word;
      }
      if (next === "'" || next === APOSTROPHE) {
        if (wordChar(plain.charAt(at + word.length + 1))) return word;
        if (prev !== "'" && prev !== OPEN_QUOTE && !/(?:^|[\s(["\u201c])['\u2018]/.test(plain.slice(0, at))) return word;
      }
      var low = word.toLowerCase();
      var parts = null;
      try { parts = lookup(low); } catch (_) { parts = null; }
      if (!Array.isArray(parts) || parts.length < 2 || parts.some(function (part) { return typeof part !== 'string' || !part; }) || parts.join('') !== low) return word;
      var pieces = [], from = 0;
      parts.forEach(function (part) { pieces.push(word.slice(from, from + part.length)); from += part.length; });
      split++;
      return pieces.join(DOT);
    });
    return split ? out : '';
  }

  // Deterministic, zero-AI English Parts of Speech tagger for content words:
  //   n = noun, v = verb, j = adjective, a = adverb
  // Uses closed-class function word exclusion + compact curated lexicon + suffix and left-context rules.
  // Returns compact "index:tag,..." matching /[A-Za-z]+(?:['\u2019][A-Za-z]+)*/g word indices, or ''.
  var _posSet = function (list) { var m = Object.create(null); list.split(' ').forEach(function (w) { if (w) m[w] = true; }); return m; };
  var POS_DET = _posSet('a an the this that these those my your his her its our their some any every each no both few many several all another such what which whose');
  var POS_FUNC = _posSet('i me you he him she it we us they them myself yourself himself herself itself ourselves themselves who whom whose that which what whoever whatever in on at by for with about against between into through during before after above below to from up down out off over under again further then once of as until while because although though since unless whereas whether if or nor but and so yet than per via upon onto within without among around across behind beside beyond near toward towards throughout despite except plus like unlike am is are was were be been being have has had do does did will would shall should can could may might must let ought not no yes oh ah hey hello hi well please thanks');
  var POS_AUX = _posSet('am is are was were be been being have has had do does did will would shall should can could may might must');
  var POS_SUBJ = _posSet('i you he she it we they who');
  var POS_DEG = _posSet('very so too quite rather really almost nearly pretty fairly extremely super quite just');
  var POS_VERBS = _posSet('say says said go goes went gone make makes made know knows knew known take takes took taken see sees saw seen come comes came think thinks thought look looks looked want wants wanted give gives gave given use uses used find finds found tell tells told ask asks asked work works worked seem seems seemed feel feels felt try tries tried leave leaves left call calls called keep keeps kept begin begins began begun help helps helped talk talks talked turn turns turned start starts started show shows showed shown hear hears heard play plays played run runs ran move moves moved live lives lived believe believes believed hold holds held bring brings brought happen happens happened write writes wrote written provide provides provided sit sits sat stand stands stood lose loses lost pay pays paid meet meets met include includes included continue continues continued set sets learn learns learned change changes changed lead leads led understand understands understood watch watches watched follow follows followed stop stops stopped create creates created speak speaks spoke spoken read reads allow allows allowed add adds added spend spends spent grow grows grew grown open opens opened walk walks walked win wins won offer offers offered remember remembers remembered love loves loved consider considers considered appear appears appeared buy buys bought wait waits waited serve serves served die dies died send sends sent expect expects expected build builds built stay stays stayed fall falls fell fallen cut cuts reach reaches reached kill kills killed remain remains remained suggest suggests suggested raise raises raised pass passes passed sell sells sold require requires required report reports reported decide decides decided pull pulls pulled hid hide hides hidden sailed sail sails climbed climb climbs jumped jump jumps flew fly flies flown swam swim swims swum ate eat eats eaten drank drink drinks drunk slept sleep sleeps cried cry cries smiled smile smiles laughed laugh laughs whispered whisper whispers shouted shout shouts carried carry carries caught catch catches threw throw throws thrown broke break breaks broken drew draw draws drawn sang sing sings sung rode ride rides ridden drove drive drives driven woke wake wakes woken wore wear wears worn shone shine shines');
  var POS_ADJS = _posSet('good new first last long great little own other old right big high different small large next early young important few public bad same able red blue green yellow orange purple pink brown black white gray grey dark bright light cold cool warm hot wet dry soft hard fast slow loud quiet tall short wide narrow deep shallow heavy full empty clean dirty neat messy sweet sour bitter salty fresh ripe raw sharp dull smooth rough round flat square thick thin strong weak brave kind nice fine glad happy sad mad angry scared afraid tired sleepy hungry thirsty sick healthy safe wild tame gentle calm proud shy funny silly smart clever wise true false real sure clear plain simple easy hard difficult busy free ready open closed late early soon rich poor young old tiny huge giant enormous vast broad steep rocky sandy muddy icy snowy rainy windy sunny cloudy foggy stormy misty golden silver wooden bright shiny glowing cozy lonely friendly lovely lively deadly daily weekly monthly yearly');
  var POS_ADVS = _posSet('always never often sometimes usually seldom rarely already still yet soon now today tomorrow yesterday tonight early late fast hard well better best badly worse worst far near here there everywhere nowhere somewhere anywhere away back forth forward backward ahead behind inside outside upstairs downstairs abroad apart aside together alone almost nearly quite rather very too really truly just only even also instead otherwise however therefore meanwhile moreover furthermore nevertheless suddenly quickly slowly carefully quietly loudly gently softly brightly clearly easily simply happily sadly gladly bravely kindly deeply closely widely heavily lightly');
  var POS_NOUNS = _posSet('time year people way day man men woman women child children world life hand part place case week company system program question work government number night point home water room mother area money story fact month lot right study book eye job word business issue side kind head house service friend father power hour game line end member law car city community name president team minute idea kid body information back parent face others level office door health person art war history party result change morning reason research girl guy moment air teacher force education fox den grass sun moon star stars sky cloud clouds rain snow wind storm fog thunder lightning witch witches tree trees kite hill hills river lake ocean sea pond forest woods field garden flower flowers leaf leaves rock rocks stone stones road path trail bridge street town village school class student students desk chair table bed window wall floor roof kitchen room hall stairs ladder dog cat bird fish horse cow pig sheep goat duck frog bear wolf deer rabbit mouse mice owl bee ant bug spider snake turtle whale shark lion tiger elephant monkey apple pear peach plum berry bread cake milk cheese egg eggs meat soup tea coffee juice cup bowl plate spoon fork knife hat coat shoe shoes shirt dress pants bag box basket key clock watch bell ring coin map letter note page book story poem song music voice sound noise dream wish hope fear joy love peace truth friend family sister brother aunt uncle cousin baby boy girl king queen prince princess hero giant dragon monster ghost wizard magic wand sword shield crown castle tower cave island ship boat train bus bike car plane truck wheel wing tail paw claw horn feather fur skin bone heart mind soul spirit earth fire ice dust ash smoke shadow light color shape size weight speed distance season spring summer autumn fall winter');
  var POS_NOT_ADV_LY = _posSet('friendly lovely lively lonely deadly silly ugly curly chilly hilly oily holy jolly belly jelly bully rally tally alley valley trolley family lily fly reply supply apply rely multiply');
  function normDictPos(raw) {
    if (!raw) return [];
    var arr = Array.isArray(raw) ? raw : (typeof raw === 'string' ? [raw] : (raw.pos ? [raw.pos] : []));
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var s = String(arr[i] || '').toLowerCase();
      var code = s === 'n' || s === 'noun' ? 'n' : s === 'v' || s === 'verb' ? 'v' : s === 'j' || s === 'adj' || s === 'adjective' ? 'j' : s === 'a' || s === 'r' || s === 'adv' || s === 'adverb' ? 'a' : '';
      if (code && out.indexOf(code) < 0) out.push(code);
    }
    return out;
  }
  function classifyWord(raw, prevLower, nextLower, isFirst, posLookup) {
    var w = raw.toLowerCase();
    if (!w || w.length < 2) return '';
    if (w.indexOf("'") >= 0 || w.indexOf('\u2019') >= 0) {
      if (/(?:'|\u2019)s$/.test(w)) {
        var base = w.slice(0, -2);
        return (base && !POS_FUNC[base] && !POS_DET[base]) ? 'n' : '';
      }
      return '';
    }
    if (POS_DET[w] || POS_FUNC[w]) return '';
    if (POS_ADVS[w]) {
      if (POS_ADJS[w] && (POS_DET[prevLower] || POS_AUX[prevLower])) return 'j';
      return 'a';
    }
    var dictTags = null;
    if (typeof posLookup === 'function') {
      try { dictTags = normDictPos(posLookup(w)); } catch (_) { dictTags = null; }
      if (dictTags && !dictTags.length) dictTags = null;
    }
    var hasDict = function (c) { return !!(dictTags && dictTags.indexOf(c) >= 0); };
    var afterDet = !!POS_DET[prevLower];
    var afterAuxOrTo = prevLower === 'to' || !!POS_AUX[prevLower];
    var afterSubj = !!POS_SUBJ[prevLower];
    var afterDeg = !!POS_DEG[prevLower];
    var nextIsNounish = !!(nextLower && (POS_NOUNS[nextLower] || (/(?:tion|sion|ment|ness|ity|ship|hood|ance|ence|age)$/.test(nextLower))));
    if (afterDeg) {
      if (/ly$/.test(w) && w.length > 4 && !POS_NOT_ADV_LY[w]) return 'a';
      if (POS_ADJS[w] || hasDict('j') || /(?:ful|less|ous|ive|able|ible|al|ic|ish|ary|ory|y)$/.test(w)) return 'j';
      if (hasDict('a')) return 'a';
    }
    if (afterDet) {
      if ((POS_ADJS[w] || hasDict('j')) && nextLower && !POS_FUNC[nextLower] && !POS_VERBS[nextLower]) return 'j';
      if (POS_NOUNS[w] || hasDict('n')) return 'n';
      if (/(?:ful|less|ous|ive|able|ible|ic|ish)$/.test(w) && nextLower && !POS_FUNC[nextLower]) return 'j';
      return 'n';
    }
    if (afterAuxOrTo || afterSubj) {
      if (POS_VERBS[w] || hasDict('v')) return 'v';
      if ((POS_ADJS[w] || hasDict('j')) && POS_AUX[prevLower] && !afterSubj) return 'j';
      if (w.length > 4 && /(?:ing|ed|ize|ise|ify|ate)$/.test(w)) return 'v';
      if (prevLower === 'to' && !POS_NOUNS[w] && !POS_ADJS[w] && !hasDict('n') && !hasDict('j')) return 'v';
    }
    if (/ly$/.test(w) && w.length > 4 && !POS_NOT_ADV_LY[w] && !POS_NOUNS[w]) return 'a';
    if (POS_VERBS[w] && !POS_NOUNS[w]) return 'v';
    if (POS_ADJS[w] && (!POS_NOUNS[w] || nextIsNounish)) return 'j';
    if (POS_NOUNS[w]) return 'n';
    if (dictTags) {
      if (dictTags.length === 1) return dictTags[0];
      if (nextIsNounish && hasDict('j')) return 'j';
      if (hasDict('n') && !hasDict('v')) return 'n';
      return dictTags[0];
    }
    if (w.length > 4 && /(?:tion|sion|ment|ness|ity|ship|hood|ance|ence|ism|ist)$/.test(w)) return 'n';
    if (w.length > 4 && /(?:ful|less|ous|ive|able|ible|ical|ic|ish)$/.test(w)) return 'j';
    if (w.length > 4 && /(?:ing|ed)$/.test(w)) return afterDet ? 'j' : 'v';
    if (!isFirst && /^[A-Z][a-z]{1,}$/.test(raw)) return 'n';
    if (POS_VERBS[w]) return 'v';
    if (POS_ADJS[w]) return 'j';
    return '';
  }
  function posText(sentence, posLookup) {
    var plain = clipKey(sentence);
    if (!plain) return '';
    var tokens = [];
    var re = /[A-Za-z]+(?:['\u2019][A-Za-z]+)*/g, m;
    while ((m = re.exec(plain))) tokens.push(m[0]);
    if (!tokens.length) return '';
    var tags = [];
    for (var i = 0; i < tokens.length; i++) {
      var prev = i > 0 ? tokens[i - 1].toLowerCase() : '';
      var next = i + 1 < tokens.length ? tokens[i + 1].toLowerCase() : '';
      var tag = classifyWord(tokens[i], prev, next, i === 0, posLookup);
      if (tag) tags.push(i + ':' + tag);
    }
    return tags.join(',');
  }

  // Deterministic, zero-AI audio-energy valley snapper (same RMS envelope math as word_timing_module.js).
  // Returns monotonic per-word end positions normalized to 1..1000 matching sentence.split(/\s+/).filter(Boolean).
  var MAX_TIMING_SAMPLES = 48000 * 120;
  function computeWordTimings(sentence, samples, sampleRate) {
    var plain = clipKey(sentence);
    if (!plain || !samples || !samples.length || samples.length > MAX_TIMING_SAMPLES || !(sampleRate > 0) || !isFinite(sampleRate)) return null;
    var words = plain.split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    if (words.length === 1) return [1000];
    var totalMs = (samples.length / sampleRate) * 1000;
    if (!(totalMs > 50)) return null;
    var frame = Math.max(1, Math.round(sampleRate * 0.02));
    var hop = Math.max(1, Math.round(sampleRate * 0.01));
    var rawFrames = [];
    for (var st = 0; st + frame <= samples.length; st += hop) {
      var sum = 0;
      for (var k = st; k < st + frame; k++) sum += samples[k] * samples[k];
      rawFrames.push(Math.sqrt(sum / frame));
    }
    if (!rawFrames.length) return null;
    var frames = rawFrames.map(function (v, idx) {
      var a = idx > 0 ? rawFrames[idx - 1] : v;
      var b = idx + 1 < rawFrames.length ? rawFrames[idx + 1] : v;
      return (a + v + b) / 3;
    });
    var hopMs = (hop / sampleRate) * 1000;
    var sorted = frames.slice().sort(function (a, b) { return a - b; });
    var p95 = sorted[Math.min(sorted.length - 1, Math.round(0.95 * (sorted.length - 1)))] || 0;
    var floor = 0.1 * p95, first = -1, last = -1;
    for (var f = 0; f < frames.length; f++) {
      if (frames[f] > floor) { if (first < 0) first = f; last = f; }
    }
    if (first < 0) { first = 0; last = frames.length - 1; }
    var startMs = first * hopMs, endMs = Math.min(totalMs, (last + 1) * hopMs);
    var speechMs = Math.max(40, endMs - startMs);
    var weights = words.map(function (w) {
      var tail = w.replace(/["'\u201d\u2019)\]]*$/, '').slice(-1);
      var bonus = /[.!?]/.test(tail) ? 5 : (/[,;:]/.test(tail) ? 3 : 0);
      return Math.max(2, w.length) + bonus;
    });
    var totalW = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    var snap = function (ms) {
      var c = Math.round(ms / hopMs), r = Math.max(1, Math.round(140 / hopMs));
      var best = c, bestV = Infinity;
      for (var j = Math.max(0, c - r); j <= Math.min(frames.length - 1, c + r); j++) {
        if (frames[j] < bestV) { bestV = frames[j]; best = j; }
      }
      return best * hopMs;
    };
    var out = [], cum = 0, prevMs = startMs;
    for (var wi = 0; wi < words.length; wi++) {
      cum += weights[wi];
      var est = startMs + (cum / totalW) * speechMs;
      var snapped = wi === words.length - 1 ? endMs : snap(est);
      var minNext = Math.min(endMs, prevMs + 40);
      var boundary = Math.max(minNext, Math.min(endMs, snapped));
      prevMs = boundary;
      var frac = wi === words.length - 1 ? 1000 : Math.max(1, Math.min(999, Math.round((boundary / totalMs) * 1000)));
      if (wi > 0 && frac <= out[wi - 1]) frac = Math.min(wi === words.length - 1 ? 1000 : 999, out[wi - 1] + 1);
      out.push(frac);
    }
    out[out.length - 1] = 1000;
    return out;
  }

  var IMAGE_URI = /^data:image\/(svg\+xml|png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
  var MAX_IMAGE_CHARS = 280 * 1024;
  function decodeBase64Utf8(b64) {
    if (typeof atob === 'function') {
      var bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (typeof TextDecoder === 'function') return new TextDecoder('utf-8').decode(bytes);
      return decodeURIComponent(escape(bin));
    }
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
    return '';
  }
  function svgRefusal(svg) {
    var s = typeof svg === 'string' ? svg : '';
    if (!/^\s*<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) return 'not an SVG drawing';
    if (s.length > 300000) return 'the drawing is too large';
    if (s.indexOf('\\') >= 0) return 'an escape character';
    if (/<!(?:doctype|entity)/i.test(s)) return 'a document type or entity declaration';
    if (/<\?(?!xml\s)/i.test(s)) return 'a processing instruction';
    var plain = s.replace(/&#x([0-9a-f]+);?/gi, function (_, hex) { return String.fromCharCode(parseInt(hex, 16) & 0xFFFF); })
      .replace(/&#(\d+);?/g, function (_, dec) { return String.fromCharCode(Number(dec) & 0xFFFF); })
      .replace(/&(colon|newline|tab);/gi, function (_, name) { return name.toLowerCase() === 'colon' ? ':' : ''; });
    var packed = plain.replace(/[\x00-\x20]+/g, '');
    var bare = function (value) { return String(value || '').replace(/[\x00-\x20]+/g, ''); };
    if (/<\s*(?:[\w-]+:)?script\b/i.test(plain)) return 'a script';
    if (/<\s*(?:[\w-]+:)?foreignObject\b/i.test(plain)) return 'a foreignObject';
    if (/<\s*(?:[\w-]+:)?(?:iframe|embed|object|audio|video|animate\w*|set|handler|listener)\b/i.test(plain)) return 'an element that is not a drawing';
    if (/[\s"'\/]on[a-z]+\s*=/i.test(plain)) return 'an event handler';
    if (/(?:java|vb|live)script:/i.test(packed)) return 'a script address';
    if (/xml:base\s*=/i.test(plain)) return 'a base address';
    var m, href = /(?:[\s"'\/])(?:[\w-]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    while ((m = href.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return 'a link to something outside the drawing';
    }
    if (/[\s"'\/]src\s*=/i.test(plain)) return 'a link to something outside the drawing';
    var style = /<\s*(?:[\w-]+:)?style\b[^>]*>/gi;
    while ((m = style.exec(plain))) {
      if (/\/\s*>$/.test(m[0])) continue;
      var end = plain.slice(style.lastIndex).search(/<\s*\/\s*(?:[\w-]+:)?style\s*>/i);
      var css = end < 0 ? plain.slice(style.lastIndex) : plain.slice(style.lastIndex, style.lastIndex + end);
      if (end < 0 || /@import|@font-face|@namespace|url\s*\(|expression\s*\(/i.test(css)) return 'a style block that loads something';
    }
    var url = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))/gi;
    while ((m = url.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return 'a link to something outside the drawing';
    }
    return '';
  }
  function validImageUri(uri) {
    if (typeof uri !== 'string' || uri.length > MAX_IMAGE_CHARS) return false;
    var m = IMAGE_URI.exec(uri);
    if (!m || m[2].length % 4 !== 0) return false;
    if (m[1].toLowerCase() === 'svg+xml') {
      try {
        var decoded = decodeBase64Utf8(m[2]);
        if (!decoded || svgRefusal(decoded)) return false;
      } catch (_) { return false; }
    }
    return true;
  }
  // Builds a compact per-page glossary from an offline dictionary lookup(word) -> { word, pos, def, example } | null
  // and optional offline picture lookup(word) -> { uri, label, set, credit } | null.
  function glossaryFor(rows, lookup, picLookup, addImage) {
    var hasDict = typeof lookup === 'function';
    var hasPic = typeof picLookup === 'function' && typeof addImage === 'function';
    if ((!hasDict && !hasPic) || !Array.isArray(rows)) return null;
    var out = {}, count = 0;
    var hasOwn = Object.prototype.hasOwnProperty;
    var addPhraseEntry = function (phrase) {
      if (count >= 120 || !phrase || phrase.length > 40 || hasOwn.call(out, phrase) || !hasPic) return false;
      var pic = null;
      try { pic = picLookup(phrase, null, { phraseOnly: true }); } catch (_) { pic = null; }
      var imgId = (pic && validImageUri(pic.uri)) ? addImage(phrase, pic.uri, pic.set, pic.credit) : '';
      if (!imgId) return false;
      var label = text((pic && pic.label) || phrase).replace(/\s+/g, ' ').trim().slice(0, 60) || phrase;
      out[phrase] = {
        w: phrase,
        d: 'Picture of ' + label,
        img: imgId,
        alt: label,
      };
      count++;
      return true;
    };
    rows.forEach(function (row) {
      var plain = clipKey(row && row.text);
      if (!plain) return;
      if (hasPic) {
        var toks = plain.match(/[A-Za-z]+/g) || [];
        var low = toks.map(function (t) { return t.toLowerCase(); });
        for (var pi = 0; pi < low.length && count < 120; pi++) {
          if (pi + 2 < low.length && low[pi].length >= 2 && low[pi + 2].length >= 2) {
            if (addPhraseEntry(low[pi] + ' ' + low[pi + 1] + ' ' + low[pi + 2])) continue;
          }
          if (pi + 1 < low.length && low[pi].length >= 2 && low[pi + 1].length >= 2) {
            addPhraseEntry(low[pi] + ' ' + low[pi + 1]);
          }
        }
      }
      var re = /[A-Za-z]{3,}/g, m;
      while ((m = re.exec(plain))) {
        if (count >= 120) break;
        var k = m[0].toLowerCase();
        if (hasOwn.call(out, k) || hasOwn.call(POS_DET, k) || hasOwn.call(POS_FUNC, k)) continue;
        var found = null;
        if (hasDict) { try { found = lookup(k); } catch (_) { found = null; } }
        var hasDef = !!(found && typeof found === 'object' && typeof found.def === 'string' && found.def.trim());
        var pic = null;
        if (hasPic) { try { pic = picLookup(k, hasDef ? found : null); } catch (_) { pic = null; } }
        var imgId = (pic && validImageUri(pic.uri)) ? addImage(k, pic.uri, pic.set, pic.credit) : '';
        if (!hasDef && !imgId) continue;
        var entry = {
          w: text((hasDef && found.word) || k).replace(/\s+/g, ' ').trim().slice(0, 40) || k,
          d: hasDef ? text(found.def).replace(/\s+/g, ' ').trim().slice(0, 240) : ('Picture of ' + text((pic && pic.label) || k).replace(/\s+/g, ' ').trim().slice(0, 40)),
        };
        if (hasDef) {
          var p = text(found.pos).replace(/\s+/g, ' ').trim().slice(0, 24);
          var ex = text(found.example).replace(/\s+/g, ' ').trim().slice(0, 200);
          if (p) entry.p = p;
          if (ex) entry.e = ex;
        }
        if (imgId) {
          entry.img = imgId;
          var alt = text((pic && pic.label) || entry.w).replace(/\s+/g, ' ').trim().slice(0, 60);
          if (alt) entry.alt = alt;
        }
        out[k] = entry;
        count++;
      }
    });
    return count ? out : null;
  }

  // lessonFromReadAlong({ loader, title, text | sentences, clips, clipSources, voice, lang, syllables, syllableSource, pageMode, partsOfSpeech, dictionary, dictionarySource, studentMic })
  //   text: the passage (splitPassage is applied), or sentences: a list already split by splitPassage.
  //   clips: { "the sentence": "data:audio/mpeg;base64,..." | { uri, source: 'teacher' | 'computer' } } (key is clipKey).
  //   0 clips (silent / syllable-only) and partial clips are both supported.
  //   lang: BCP-47 language tag (default 'en'). English-only helpers (syllables, POS, dictionary) run only when lang is English.
  //   syllables: lookup(word) -> parts or null (see syllableText). With it the file has a Syllables button.
  //   syllableSource: where the breaks come from, for the file's credits.
  //   pageMode: 'auto' (default), 'scroll' (all on one page), or 'custom' (split only at pageBreak).
  //   partsOfSpeech: true (uses built-in deterministic posText) or function(sentence) -> "i:tag,...".
  //   dictionary: lookup(word) -> { word, pos, def, example } | null for offline Word meanings.
  //   studentMic: true to enable opt-in local-only student voice recording inside the saved file (default false).
  function lessonFromReadAlong(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || !loader.CHECK_ADAPTERS || !loader.CHECK_ADAPTERS[ACTIVITY]) throw new Error('lessonFromReadAlong needs loader (AlloWordSoundsTakeHome, with the read-along activity)');
    var adapter = loader.CHECK_ADAPTERS[ACTIVITY];
    var sentences = Array.isArray(o.sentences) ? o.sentences.map(function (row) {
      var out = { text: clipKey(row && row.text).slice(0, MAX_SENTENCE_CHARS).trim() };
      if (row && row.para === true) out.para = true;
      if (row && row.pageBreak === true) out.pageBreak = true;
      if (row && (row.heading === 1 || row.heading === 2 || row.heading === 3)) out.heading = row.heading;
      return out;
    }).filter(function (row) { return row.text; }).slice(0, MAX_SENTENCES)
      : splitPassage(o.text);
    if (!sentences.length) throw new Error('There is no passage yet.');
    var lang = cleanLang(o.lang || 'en');
    var isEn = /^en(?:-|$)/i.test(lang);
    var pageMode = cleanPageMode(o.pageMode);
    var posLookup = isEn && typeof o.posLookup === 'function' ? o.posLookup : null;
    var posFn = !isEn ? null : (typeof o.partsOfSpeech === 'function' ? o.partsOfSpeech : (o.partsOfSpeech === true ? function (s) { return posText(s, posLookup); } : null));
    var dictFn = isEn && typeof o.dictionary === 'function' ? o.dictionary : null;
    var picFn = isEn && typeof o.pictures === 'function' ? o.pictures : null;
    var studentMic = o.studentMic === true;
    var deviceVoice = o.deviceVoice === true;
    var simpleBar = o.simpleBar === true;
    var clips = o.clips && typeof o.clips === 'object' ? o.clips : {};
    var timingsIn = o.timings && typeof o.timings === 'object' ? o.timings : {};
    var sourcesIn = o.clipSources && typeof o.clipSources === 'object' ? o.clipSources : {};
    var isEs = /^es(?:-|$)/i.test(lang);
    var audio = {}, images = {}, picIdOf = Object.create(null), picNext = 0, picSets = Object.create(null), picCredits = [], idOf = Object.create(null), teacherClips = [], recorded = 0, teacherRecorded = 0, computerRecorded = 0, next = 0, lookup = isEn && typeof o.syllables === 'function' ? o.syllables : (isEs && o.syllables !== false ? syllabifySpanish : null), sylOpts = isEs ? { spanish: true } : null, split = 0, example = '', posCount = 0, dictSeen = Object.create(null), timedCount = 0;
    var addImage = function (wordKey, uri, setName, creditNote) {
      if (picIdOf[wordKey]) return picIdOf[wordKey];
      if (picNext >= 40) return '';
      var pid = 'p' + (++picNext);
      picIdOf[wordKey] = pid;
      images[pid] = uri;
      if (setName) picSets[String(setName).toLowerCase()] = true;
      var cleanCredit = text(creditNote).replace(/https?:\/\//gi, '').replace(/\s+/g, ' ').trim().slice(0, 220);
      if (cleanCredit && picCredits.indexOf(cleanCredit) < 0 && picCredits.length < 20) picCredits.push(cleanCredit);
      return pid;
    };
    var clipFor = function (sentence) {
      var key = clipKey(sentence), raw = Object.prototype.hasOwnProperty.call(clips, key) ? clips[key] : null;
      var uri = typeof raw === 'string' ? raw : (raw && typeof raw === 'object' && typeof raw.uri === 'string' ? raw.uri : '');
      if (!uri) return { id: '', source: '' };
      if (uri.length > MAX_CLIP_CHARS || !CLIP.test(uri)) throw new Error('A recording must be an audio file.');
      var src = (raw && typeof raw === 'object' && raw.source === 'teacher') || (Object.prototype.hasOwnProperty.call(sourcesIn, key) && sourcesIn[key] === 'teacher') ? 'teacher' : 'computer';
      if (!idOf[key]) { idOf[key] = 's' + (++next); audio[idOf[key]] = uri; }
      if (src === 'teacher' && teacherClips.indexOf(idOf[key]) < 0) teacherClips.push(idOf[key]);
      return { id: idOf[key], source: src };
    };
    var title = text(o.title).replace(/\s+/g, ' ').trim().slice(0, 120) || 'Read along';
    var pages = pagesOf(sentences, { pageMode: pageMode });
    var items = pages.map(function (page, i) {
      var raw = { lines: page.map(function (row) {
        var got = clipFor(row.text);
        if (got.id) {
          recorded++;
          if (got.source === 'teacher') teacherRecorded++; else computerRecorded++;
        }
        var line = { text: row.text, audio: got.id }, syl = lookup ? syllableText(row.text, lookup, sylOpts) : '';
        if (syl) { line.syl = syl; split++; if (!example) example = (/[A-Za-z\u00C0-\u024F]+(?:\u00b7[A-Za-z\u00C0-\u024F]+)+/.exec(syl) || [''])[0]; }
        if (posFn) {
          var tagged = '';
          try { tagged = String(posFn(row.text) || ''); } catch (_) { tagged = ''; }
          if (tagged) { line.pos = tagged; posCount++; }
        }
        var tKey = clipKey(row.text);
        if (got.id && Object.prototype.hasOwnProperty.call(timingsIn, tKey) && Array.isArray(timingsIn[tKey]) && timingsIn[tKey].length) {
          line.timings = timingsIn[tKey];
          timedCount++;
        }
        if (row.para) line.para = true;
        if (row.heading === 1 || row.heading === 2 || row.heading === 3) line.heading = row.heading;
        return line;
      }), page: i + 1, pages: pages.length, lang: lang };
      if (pageMode !== 'auto') raw.pageMode = pageMode;
      if (simpleBar) raw.simpleBar = true;
      if (dictFn || picFn) {
        var gloss = glossaryFor(page, dictFn, picFn, addImage);
        if (gloss) {
          raw.glossary = gloss;
          Object.keys(gloss).forEach(function (k) { dictSeen[k] = true; });
        }
      }
      var made = adapter.prepare(raw);
      if (!made || !made.item) {
        throw new Error('Page ' + (i + 1) + ' cannot be used: ' + (made && made.missing ? made.missing.join(', ') : 'no reason given'));
      }
      var n = (i < 9 ? '0' : '') + (i + 1);
      return Object.assign({ id: ACTIVITY + '-' + n }, made.item);
    });
    var lesson = { schema: LESSON_SCHEMA, player: PLAYER, lessonId: 'read-along-' + fnv(sentences.map(function (row) { return row.text; }).join('\n')), revision: '', language: lang, title: title, showLetters: false,
      mode: 'practice', activityTitles: {}, blocks: [{ activity: ACTIVITY, items: items }], feedback: { correct: [], retry: null }, audio: audio, images: images, submit: null };
    if (studentMic) lesson.studentMic = true;
    if (deviceVoice) lesson.deviceVoice = true;
    lesson.activityTitles[ACTIVITY] = adapter.title;
    lesson.revision = 'r' + fnv(JSON.stringify([lesson.title, lesson.blocks, Object.keys(audio).map(function (id) { return audio[id].length; }), Object.keys(images).map(function (id) { return images[id].length; }), studentMic ? 1 : 0, deviceVoice ? 1 : 0, simpleBar ? 1 : 0, lang]));
    var dictCount = Object.keys(dictSeen).length;
    var picCount = Object.keys(images).length;
    return { lesson: lesson, sentences: sentences.length, pages: pages.length, pageMode: pageMode, lang: lang, recorded: recorded, missing: sentences.length - recorded,
      teacherRecorded: teacherRecorded, computerRecorded: computerRecorded, teacherClips: teacherClips, voice: text(o.voice).slice(0, 60),
      syllables: split ? { sentences: split, example: example, source: (text(o.syllableSource) || (isEs ? 'Spanish orthographic syllable rules (on-device)' : '')).replace(/\s+/g, ' ').trim().slice(0, 300) } : null,
      partsOfSpeech: posCount ? { sentences: posCount, dictionaryBacked: !!posLookup } : null,
      dictionary: dictCount ? { words: dictCount, source: text(o.dictionarySource).replace(/\s+/g, ' ').trim().slice(0, 300) } : null,
      pictures: picCount ? { count: picCount, sets: Object.keys(picSets), credits: picCredits } : null,
      timingsCount: timedCount,
      studentMic: studentMic,
      deviceVoice: deviceVoice,
      simpleBar: simpleBar };
  }

  // Nothing in a read-along is graded: the file's answer matcher is never a match.
  var NO_ANSWERS = { soundAnswerMatches: function () { return false; } };

  // The file. buildReadAlongPacket({ made (from lessonFromReadAlong), loader, learner }) -> { html, manifest, sha256, lesson }
  function buildReadAlongPacket(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || typeof loader.buildHtml !== 'function' || !loader.CHECK_ADAPTERS || typeof loader.sha256 !== 'function') throw new Error('buildReadAlongPacket needs loader (AlloWordSoundsTakeHome)');
    var made = o.made, given = made && made.lesson;
    if (!given || given.mode !== 'practice' || !Array.isArray(given.blocks) || given.blocks.length !== 1 || given.blocks[0].activity !== ACTIVITY) throw new Error('buildReadAlongPacket needs what lessonFromReadAlong made');
    var lesson = JSON.parse(JSON.stringify(given));
    var lang = cleanLang(made.lang || lesson.language || 'en');
    var voice = made.voice || 'af_heart';
    var recTotal = Number(made.recorded) || 0;
    var teacherRec = Number(made.teacherRecorded) || 0;
    var computerRec = made.computerRecorded != null ? Number(made.computerRecorded) : Math.max(0, recTotal - teacherRec);
    var studentMic = made.studentMic === true || lesson.studentMic === true;
    var deviceVoice = made.deviceVoice === true || lesson.deviceVoice === true;
    var intro = recTotal > 0 ? loader.CHECK_ADAPTERS[ACTIVITY].labels.read_along_intro : (deviceVoice ? 'Read the passage on screen, tap a word to hear it with this device voice, or use Reading tools.' : 'Read the passage on screen. Use Reading tools to change text size, colors, spacing or syllables.');
    var micPrefix = studentMic
      ? 'It uses the microphone only when you press Record my voice (your recording stays in this tab only and is never saved or sent). It never uses the camera, has no cookies and runs no AI.'
      : 'It never uses the microphone or the camera. It has no cookies and runs no AI.';
    var aboutNever, speechNote, speechMade, humanReviewed = false, credits = [];
    if (recTotal === 0) {
      aboutNever = micPrefix + (deviceVoice ? ' This file has no recordings and uses only the local voice of this device (never a cloud voice) when asked.' : ' This file has no recordings and makes no speech.');
      speechNote = deviceVoice ? 'Uses only the local speech voice already on this device (never an internet voice) when the learner taps a word or presses Read with device voice.' : 'This file has no recordings. It does not use the voice of the device and makes no speech.';
      speechMade = deviceVoice ? 'local voice on the learner device only' : 'none (text and reading tools only)';
    } else if (teacherRec > 0 && computerRec === 0) {
      aboutNever = micPrefix + (deviceVoice ? ' The reading voice is a set of recordings made by the teacher, with an optional local-only device voice for tapping single words.' : ' The reading voice is a set of recordings made by the teacher; this file makes no speech itself.');
      speechNote = deviceVoice ? 'The file plays recordings made by the teacher and uses only a local voice on this device (never an internet voice) when the learner taps a single word.' : 'The file plays recordings made by the teacher. It does not use the voice of the device and makes no speech.';
      speechMade = 'recorded by the teacher on their device';
      humanReviewed = true;
      credits.push('Recordings of the sentences: recorded by the teacher on their device.');
    } else if (teacherRec > 0 && computerRec > 0) {
      aboutNever = micPrefix + (deviceVoice ? ' The reading voice is a set of recordings made ahead of time, with an optional local-only device voice for tapping single words.' : ' The reading voice is a set of recordings made ahead of time (by the teacher and with a computer voice); this file makes no speech itself.');
      speechNote = deviceVoice ? 'The file plays recordings and uses only a local voice on this device (never an internet voice) when the learner taps a single word.' : 'The file plays recordings. It does not use the voice of the device and makes no speech.';
      speechMade = 'recorded by the teacher (' + teacherRec + ') and ahead of time with Kokoro-82M text-to-speech (voice ' + voice + ') (' + computerRec + ')';
      credits.push('Recordings of the sentences: ' + teacherRec + ' recorded by the teacher on their device, and ' + computerRec + ' made ahead of time with Kokoro-82M text-to-speech (voice ' + voice + '), a machine voice.');
    } else {
      aboutNever = micPrefix + (deviceVoice ? ' The reading voice is a set of recordings made ahead of time with a computer voice, with an optional local-only device voice for tapping single words.' : ' The reading voice is a set of recordings made ahead of time with a computer voice; this file makes no speech itself.');
      speechNote = deviceVoice ? 'The file plays recordings and uses only a local voice on this device (never an internet voice) when the learner taps a single word.' : 'The file plays recordings. It does not use the voice of the device and makes no speech.';
      speechMade = 'ahead of time, on the device of the person who made this file, with Kokoro-82M text-to-speech (voice ' + voice + '), a machine voice';
      credits.push('Recordings of the sentences: made ahead of time, on the device of the person who made this file, with Kokoro-82M text-to-speech (voice ' + voice + '), a machine voice. No person has listened to each one.');
    }
    if (made.syllables) credits.push('Syllable breaks: worked out when this file was made, from a word list' + (made.syllables.source ? ' (' + made.syllables.source + ')' : '') + '. No AI.');
    if (made.partsOfSpeech) credits.push('Parts of speech: tagged with ' + (made.partsOfSpeech.dictionaryBacked ? 'offline open-dictionary word classes and ' : 'a built-in word list and ') + 'grammar rules when this file was made. No AI.');
    if (made.dictionary) credits.push('Word meanings: looked up when this file was made from open dictionaries' + (made.dictionary.source ? ' (' + made.dictionary.source + ')' : ' (Simple English Wiktionary, English Wiktionary, Open English WordNet; CC BY-SA 4.0)') + '. No AI runs in this file.');
    if (made.pictures && made.pictures.count) {
      var sets = Array.isArray(made.pictures.sets) ? made.pictures.sets : [];
      var partsPic = [];
      if (!sets.length || sets.indexOf('mulberry') >= 0) partsPic.push('Mulberry Symbols 3.6.1 (Steve Lee, CC BY-SA 4.0)');
      if (!sets.length || sets.indexOf('openmoji') >= 0) partsPic.push('OpenMoji 17.0.0 (OpenMoji project, CC BY-SA 4.0)');
      if (sets.indexOf('diagram') >= 0) partsPic.push('AlloFlow Curriculum Diagrams (AGPL-3.0)');
      if (sets.indexOf('teacher') >= 0) partsPic.push('teacher saved pictures');
      credits.push('Word pictures: ' + partsPic.join(', ') + ', bundled when this file was made. No AI.');
      if (Array.isArray(made.pictures.credits)) {
        made.pictures.credits.forEach(function (c) { if (c) credits.push('Picture credit: ' + c); });
      }
    }
    var htmlLabels = { intro: intro, about_never: aboutNever };
    if (lang !== 'en') htmlLabels.lang = lang;
    if (isRtlLang(lang)) htmlLabels.dir = 'rtl';
    var html = loader.buildHtml(lesson, { core: NO_ANSWERS, labels: htmlLabels, attributions: credits });
    var readAlongMeta = { builder: VERSION, sentences: made.sentences, pages: made.pages, recordings: recTotal, withoutRecording: made.missing, sentencesWithSyllables: made.syllables ? made.syllables.sentences : 0 };
    if (made.pageMode && made.pageMode !== 'auto') readAlongMeta.pageMode = made.pageMode;
    if (lang !== 'en') readAlongMeta.lang = lang;
    if (made.partsOfSpeech) readAlongMeta.sentencesWithPos = made.partsOfSpeech.sentences;
    if (made.dictionary) readAlongMeta.dictionaryWords = made.dictionary.words;
    if (made.pictures && made.pictures.count) readAlongMeta.pictureWords = made.pictures.count;
    if (studentMic) readAlongMeta.studentMic = true;
    if (deviceVoice) readAlongMeta.deviceVoice = true;
    if (made.simpleBar) readAlongMeta.simpleBar = true;
    if (teacherRec > 0 && computerRec > 0 && Array.isArray(made.teacherClips) && made.teacherClips.length) readAlongMeta.teacherClips = made.teacherClips.slice();
    html = withManifest(html, {
      readAlong: readAlongMeta,
      speech: { engine: deviceVoice ? 'speechSynthesis' : 'none', note: speechNote,
        recordings: { sentences: recTotal, made: speechMade, humanReviewed: humanReviewed } },
    });
    if (o.learner) html = withCodeName(html, o.learner);
    var block = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
    return { html: html, manifest: block ? JSON.parse(block[1]) : null, sha256: loader.sha256(html).hex, lesson: lesson };
  }

  // Reconstructs passage, title, voice, code name, layout mode, language, optional tools and existing sentence MP3/WAV clips from AlloPacketVerify.readParts().
  function readBack(parts) {
    if (!parts || !parts.ok || !parts.lesson || !Array.isArray(parts.lesson.blocks) || parts.lesson.blocks.length !== 1 || parts.lesson.blocks[0].activity !== ACTIVITY) {
      return { ok: false, why: 'This is not a read-along file.' };
    }
    var lesson = parts.lesson;
    var manifest = parts.manifest && typeof parts.manifest === 'object' ? parts.manifest : {};
    var raMeta = manifest.readAlong && typeof manifest.readAlong === 'object' ? manifest.readAlong : {};
    var items = Array.isArray(lesson.blocks[0].items) ? lesson.blocks[0].items : [];
    var audio = lesson.audio && typeof lesson.audio === 'object' ? lesson.audio : {};
    var speechMade = String((manifest.speech && manifest.speech.recordings && manifest.speech.recordings.made) || '');
    var voiceMatch = /\(voice ([a-z0-9_]+)\)/i.exec(speechMade);
    var voice = voiceMatch ? voiceMatch[1] : '';
    var teacherOnly = /^recorded by the teacher/i.test(speechMade) && !/Kokoro/i.test(speechMade);
    var teacherClipIds = Array.isArray(raMeta.teacherClips) ? raMeta.teacherClips : null;
    var savedMode = raMeta.pageMode === 'scroll' || raMeta.pageMode === 'custom' ? raMeta.pageMode : 'auto';
    var savedLang = cleanLang(raMeta.lang || lesson.language || 'en');
    var sentences = [];
    var clips = {};
    var clipSources = {};
    var hasPos = false;
    var hasGlossary = false;
    items.forEach(function (item, itemIdx) {
      if (item && item.glossary && typeof item.glossary === 'object' && Object.keys(item.glossary).length) hasGlossary = true;
      var lines = item && Array.isArray(item.lines) ? item.lines : [];
      lines.forEach(function (line, lineIdx) {
        var lineText = clipKey(line && line.text);
        if (!lineText) return;
        var row = { text: lineText };
        if (line && line.para === true) row.para = true;
        if (line && (line.heading === 1 || line.heading === 2 || line.heading === 3)) row.heading = line.heading;
        if (line && typeof line.pos === 'string' && line.pos) hasPos = true;
        if (savedMode === 'custom' && itemIdx > 0 && lineIdx === 0) row.pageBreak = true;
        sentences.push(row);
        var cid = line && typeof line.audio === 'string' ? line.audio : '';
        var uri = cid && Object.prototype.hasOwnProperty.call(audio, cid) ? audio[cid] : '';
        if (typeof uri === 'string' && uri.length <= MAX_CLIP_CHARS && CLIP.test(uri) && lineText !== '__proto__') {
          clips[lineText] = uri;
          clipSources[lineText] = teacherClipIds ? (teacherClipIds.indexOf(cid) >= 0 ? 'teacher' : 'computer') : (teacherOnly ? 'teacher' : 'computer');
        }
      });
    });
    if (!sentences.length) return { ok: false, why: 'This read-along file has no sentences.' };
    if (savedMode === 'auto' && items.length === 1 && sentences.length > PAGE_SENTENCES) savedMode = 'scroll';
    var passage = '';
    for (var i = 0; i < sentences.length; i++) {
      if (i > 0) {
        if (sentences[i].pageBreak) passage += '\n\n---\n\n';
        else if (sentences[i].para || sentences[i].heading || sentences[i - 1].heading) passage += '\n\n';
        else if (/[.!?]["')\]]*$/.test(sentences[i - 1].text)) passage += ' ';
        else passage += '\n';
      }
      var prefix = sentences[i].heading ? (sentences[i].heading === 1 ? '# ' : sentences[i].heading === 2 ? '## ' : '### ') : '';
      passage += prefix + sentences[i].text;
    }
    var title = text(manifest.title || lesson.title).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (title === 'Read along') title = '';
    return {
      ok: true,
      title: title,
      text: passage,
      sentences: sentences,
      pageMode: savedMode,
      lang: savedLang,
      partsOfSpeech: Boolean(raMeta.sentencesWithPos || hasPos),
      dictionary: Boolean(raMeta.dictionaryWords || hasGlossary),
      pictures: Boolean(raMeta.pictureWords || (lesson.images && Object.keys(lesson.images).length)),
      studentMic: Boolean(lesson.studentMic === true || raMeta.studentMic === true),
      deviceVoice: Boolean(lesson.deviceVoice === true || raMeta.deviceVoice === true),
      simpleBar: Boolean(raMeta.simpleBar === true || items.some(function (it) { return it && it.simpleBar === true; })),
      voice: voice,
      learner: codeName(manifest.learner || ''),
      clips: clips,
      clipSources: clipSources,
      recordings: Object.keys(clips).length,
    };
  }

  // The manifest (the data block of the file) with more keys. Only the data block changes: the script and its hash do not.
  function editManifest(html, change) {
    var open = '<script type="application/json" id="packet-manifest">';
    var at = html.indexOf(open);
    if (at < 0) return html;
    var from = at + open.length, to = html.indexOf('</script>', from), manifest;
    if (to < 0) return html;
    try { manifest = JSON.parse(html.slice(from, to), function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; }); } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return html;
    change(manifest);
    var json = JSON.stringify(manifest).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return html.slice(0, from) + json + html.slice(to);
  }
  function withManifest(html, extra) { return editManifest(html, function (manifest) { Object.keys(extra).forEach(function (key) { manifest[key] = extra[key]; }); }); }
  // A student's code name, by the rule of the other builders: letters of any language, digits, spaces, . _ and -, at most 40.
  function codeName(value) {
    var t = typeof value === 'string' ? value : '';
    try { return t.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ._-]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim(); } catch (_) { return t.replace(/[^A-Za-z0-9 ._-]+/g, '').trim().slice(0, 40); }
  }
  function withCodeName(html, name) {
    var clean = codeName(name);
    return clean ? editManifest(html, function (manifest) { manifest.learner = clean; }) : html;
  }

  var api = { VERSION: VERSION, ACTIVITY: ACTIVITY, MAX_CHARS: MAX_CHARS, MAX_SENTENCES: MAX_SENTENCES, MAX_SENTENCE_CHARS: MAX_SENTENCE_CHARS, PAGE_SENTENCES: PAGE_SENTENCES, PAGE_CHARS: PAGE_CHARS, MAX_CLIP_CHARS: MAX_CLIP_CHARS,
    cleanPageMode: cleanPageMode, cleanLang: cleanLang, isRtlLang: isRtlLang, splitPassage: splitPassage, sentenceCount: sentenceCount, syllabifySpanish: syllabifySpanish, syllableText: syllableText, posText: posText, computeWordTimings: computeWordTimings, glossaryFor: glossaryFor, pagesOf: pagesOf, clipKey: clipKey, lessonFromReadAlong: lessonFromReadAlong, buildReadAlongPacket: buildReadAlongPacket, readBack: readBack, codeName: codeName, withCodeName: withCodeName };
  root.AlloPacketReadAlong = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
